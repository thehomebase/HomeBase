import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

const registrationAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_REGISTRATIONS_PER_IP = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function getClientIp(req: import('express').Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function checkRegistrationRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = registrationAttempts.get(ip);
  if (!record) return true;
  if (now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    registrationAttempts.delete(ip);
    return true;
  }
  return record.count < MAX_REGISTRATIONS_PER_IP;
}

function recordRegistrationAttempt(ip: string): void {
  const now = Date.now();
  const record = registrationAttempts.get(ip);
  if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    registrationAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count++;
  }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashVerificationCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID!, // Using REPL_ID as secret in Replit environment
    resave: true, // Changed to true to ensure session is saved
    saveUninitialized: true, // Changed to true to create session for all users
    store: storage.sessionStore,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      path: '/'
    },
    name: 'session' // Custom session cookie name
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    if (sessionSettings.cookie) {
      sessionSettings.cookie.secure = true;
    }
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          console.log('Attempting login with email:', email);
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            console.log('Login failed: Invalid credentials');
            return done(null, false);
          }
          console.log('Login successful for user:', user.id);
          return done(null, user);
        } catch (error) {
          console.error('Error in LocalStrategy:', error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string | number, done) => {
    try {
      console.log('Deserializing user:', id);
      const userId = typeof id === 'string' ? parseInt(id) : id;
      const user = await storage.getUser(userId);
      if (!user) {
        console.log('User not found during deserialization:', id);
        return done(null, false);
      }
      console.log('User deserialized successfully:', user.id);
      done(null, user);
    } catch (error) {
      console.error('Error in deserializeUser:', error);
      done(error, null);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    if (req.user) {
      console.log('Login successful, sending user data');
      const { password, ...userWithoutPassword } = req.user;
      res.status(200).json(userWithoutPassword);
    } else {
      console.log('Login failed, no user in request');
      res.status(401).json({ error: "Authentication failed" });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    console.log('Logout request for user:', userId);

    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return next(err);
      }
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return next(err);
        }
        console.log('Logout successful for user:', userId);
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('Unauthenticated user request to /api/user');
      return res.sendStatus(401);
    }
    console.log('Authenticated user request:', req.user?.id);
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // Moving the register route inside setupAuth function
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log('Registration request body:', req.body);

      const clientIp = getClientIp(req);

      if (!checkRegistrationRateLimit(clientIp)) {
        console.log('Rate limit exceeded for IP:', clientIp);
        return res.status(429).json({ error: "Too many registration attempts. Please try again later." });
      }

      if (!req.body.email || !req.body.password || !req.body.firstName || !req.body.lastName) {
        console.error('Missing required fields');
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['email', 'password', 'firstName', 'lastName'],
          received: Object.keys(req.body)
        });
      }

      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        console.log('Email already exists:', req.body.email);
        return res.status(400).json({ error: "Email already exists" });
      }

      let referralCodeRecord: any = null;
      if (req.body.referralCode) {
        referralCodeRecord = await storage.getReferralCodeByCode(req.body.referralCode);
        if (!referralCodeRecord) {
          return res.status(400).json({ error: "Invalid referral code" });
        }
      }

      const verificationCode = generateVerificationCode();
      const hashedCode = hashVerificationCode(verificationCode);
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const role = ['agent', 'client', 'vendor', 'lender', 'broker'].includes(req.body.role) ? req.body.role : 'client';
      const isAgentOrBroker = role === 'agent' || role === 'broker';

      if (isAgentOrBroker && (!req.body.licenseNumber || !req.body.licenseState || !req.body.brokerageName)) {
        return res.status(400).json({ error: "License number, state, and brokerage name are required for agents and brokers" });
      }

      const user = await storage.createUser({
        email: req.body.email,
        password: await hashPassword(req.body.password),
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        role,
        registrationIp: clientIp
      });

      if (isAgentOrBroker) {
        await storage.updateUser(user.id, {
          licenseNumber: req.body.licenseNumber,
          licenseState: req.body.licenseState,
          brokerageName: req.body.brokerageName,
          verificationStatus: 'licensed',
        });
        user.licenseNumber = req.body.licenseNumber;
        user.licenseState = req.body.licenseState;
        user.brokerageName = req.body.brokerageName;
        user.verificationStatus = 'licensed';
      }

      await storage.updateUser(user.id, {
        emailVerified: false,
        emailVerificationToken: hashedCode,
        emailVerificationExpires: verificationExpires,
      });

      user.emailVerified = false;
      user.emailVerificationToken = hashedCode;
      user.emailVerificationExpires = verificationExpires;

      recordRegistrationAttempt(clientIp);

      console.log('User created successfully:', { id: user.id, email: user.email });
      console.log('Verification code for user', user.email, ':', verificationCode);

      if (referralCodeRecord && user.role !== 'lender') {
        try {
          await storage.createReferralCredit({
            userId: referralCodeRecord.agentUserId,
            type: 'referrer',
            referralCodeId: referralCodeRecord.id,
            referredUserId: user.id,
            status: 'pending',
          });
          await storage.createReferralCredit({
            userId: user.id,
            type: 'referred',
            referralCodeId: referralCodeRecord.id,
            referredUserId: user.id,
            status: 'pending',
          });
        } catch (creditError) {
          console.error('Error creating referral credits:', creditError);
        }
      }

      req.login(user, (err) => {
        if (err) {
          console.error('Login error after registration:', err);
          return next(err);
        }
        const { password, ...userWithoutPassword } = user;
        res.status(201).json({ ...userWithoutPassword, verificationCode });
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error during registration' });
      }
    }
  });

  app.post("/api/verify-email", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { code } = req.body;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Verification code is required" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }

      if (!user.emailVerificationToken || !user.emailVerificationExpires) {
        return res.status(400).json({ error: "No verification code found. Please request a new one." });
      }

      if (new Date() > new Date(user.emailVerificationExpires)) {
        return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
      }

      const hashedInput = hashVerificationCode(code.trim());
      if (hashedInput !== user.emailVerificationToken) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      const updatedUser = await storage.updateUser(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/resend-verification", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }

      const verificationCode = generateVerificationCode();
      const hashedCode = hashVerificationCode(verificationCode);
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await storage.updateUser(user.id, {
        emailVerificationToken: hashedCode,
        emailVerificationExpires: verificationExpires,
      });

      console.log('New verification code for user', user.email, ':', verificationCode);

      res.json({ message: "Verification code sent", verificationCode });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification code" });
    }
  });
}