import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { User as SelectUser } from "@shared/schema";
import { verifyRecaptcha, verifyRecaptchaRegister } from "./recaptcha";
import { generateSecret, generateSync, verifySync, generateURI } from "otplib";
import * as QRCode from "qrcode";
import { sendVerificationEmail, sendWelcomeEmail } from "./email-service";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

const registrationAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_REGISTRATIONS_PER_IP = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const mfaPendingLogins = new Map<string, { userId: number; createdAt: number; attempts: number }>();
const MFA_MAX_ATTEMPTS = 5;

const loginFailures = new Map<string, { count: number; firstFailure: number; lockedUntil: number | null }>();
const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const LOGIN_FAILURE_WINDOW_MS = 30 * 60 * 1000;

function isAccountLocked(email: string): { locked: boolean; remainingMs?: number } {
  const key = email.toLowerCase();
  const record = loginFailures.get(key);
  if (!record?.lockedUntil) return { locked: false };
  const now = Date.now();
  if (now >= record.lockedUntil) {
    loginFailures.delete(key);
    return { locked: false };
  }
  return { locked: true, remainingMs: record.lockedUntil - now };
}

function recordLoginFailure(email: string): boolean {
  const key = email.toLowerCase();
  const now = Date.now();
  const record = loginFailures.get(key);
  if (!record || now - record.firstFailure > LOGIN_FAILURE_WINDOW_MS) {
    loginFailures.set(key, { count: 1, firstFailure: now, lockedUntil: null });
    return false;
  }
  record.count++;
  if (record.count >= MAX_LOGIN_FAILURES) {
    record.lockedUntil = now + LOGIN_LOCKOUT_DURATION_MS;
    return true;
  }
  return false;
}

function clearLoginFailures(email: string): void {
  loginFailures.delete(email.toLowerCase());
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const masked = local.length <= 2 ? "*".repeat(local.length) : local[0] + "*".repeat(local.length - 2) + local[local.length - 1];
  return `${masked}@${domain}`;
}

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

export async function comparePasswords(supplied: string, stored: string) {
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
    secret: process.env.SESSION_SECRET || process.env.REPL_ID!,
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

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.cookies?.csrf_token) {
      const token = randomBytes(32).toString("hex");
      res.cookie("csrf_token", token, {
        httpOnly: false,
        sameSite: "strict",
        secure: app.get("env") === "production",
        path: "/",
      });
    }
    next();
  });

  const csrfSafeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
  const csrfExemptPaths = ["/api/webhooks/", "/api/zapier/"];

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (csrfSafeMethods.has(req.method)) return next();
    if (csrfExemptPaths.some(p => req.path.startsWith(p))) return next();
    if (!req.isAuthenticated()) return next();

    const cookieToken = req.cookies?.csrf_token;
    const headerToken = req.headers["x-csrf-token"];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({ error: "Invalid CSRF token" });
    }
    next();
  });

  const accountStatusExemptPaths = ["/api/account/reactivate", "/api/logout", "/api/user"];
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) return next();
    const user = req.user as any;
    if (user.accountStatus && user.accountStatus !== "active") {
      if (!accountStatusExemptPaths.some(p => req.path === p)) {
        req.logout(() => {});
        return res.status(403).json({ error: "Your account is not active. Please contact support." });
      }
    }
    next();
  });

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          const lockStatus = isAccountLocked(email);
          if (lockStatus.locked) {
            const mins = Math.ceil((lockStatus.remainingMs || 0) / 60000);
            return done(null, false, { message: `Account temporarily locked. Try again in ${mins} minutes.` });
          }
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            const locked = recordLoginFailure(email);
            if (locked) {
              return done(null, false, { message: "Too many failed attempts. Account locked for 15 minutes." });
            }
            return done(null, false);
          }
          clearLoginFailures(email);
          return done(null, user);
        } catch (error) {
          console.error('Error in LocalStrategy');
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string | number, done) => {
    try {
      const userId = typeof id === 'string' ? parseInt(id) : id;
      const user = await storage.getUser(userId);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error('Error in deserializeUser');
      done(error, null);
    }
  });

  app.post("/api/login", verifyRecaptcha, (req, res, next) => {
    passport.authenticate("local", (err: any, user: SelectUser | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        const message = info?.message || "Invalid email or password";
        const status = message.includes("locked") ? 429 : 401;
        return res.status(status).json({ error: message });
      }

      if (user.accountStatus === "suspended") {
        return res.status(403).json({ error: "Your account has been suspended. Please contact support for assistance." });
      }

      if (user.accountStatus === "inactive") {
        return res.status(403).json({ error: "Your account is deactivated.", accountDeactivated: true, email: user.email });
      }

      if (user.totpEnabled && user.totpSecret) {
        const pendingToken = randomBytes(32).toString("hex");
        mfaPendingLogins.set(pendingToken, { userId: user.id, createdAt: Date.now(), attempts: 0 });
        setTimeout(() => mfaPendingLogins.delete(pendingToken), 5 * 60 * 1000);
        return res.status(200).json({ mfaRequired: true, mfaToken: pendingToken });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        const { password, totpSecret, ...userWithoutSensitive } = user;
        res.status(200).json(userWithoutSensitive);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    const { password, totpSecret, ...userWithoutSensitive } = req.user;
    res.json(userWithoutSensitive);
  });

  app.post("/api/register", verifyRecaptchaRegister, async (req, res, next) => {
    try {
      const clientIp = getClientIp(req);

      if (!checkRegistrationRateLimit(clientIp)) {
        return res.status(429).json({ error: "Too many registration attempts. Please try again later." });
      }

      if (!req.body.email || !req.body.password || !req.body.firstName || !req.body.lastName) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['email', 'password', 'firstName', 'lastName'],
          received: Object.keys(req.body)
        });
      }

      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already exists" });
      }

      let referralCodeRecord: any = null;
      const referralSource = req.body.referralCode || req.cookies?.hb_referral;
      if (referralSource) {
        referralCodeRecord = await storage.getReferralCodeByCode(referralSource);
        if (req.body.referralCode && !referralCodeRecord) {
          return res.status(400).json({ error: "Invalid referral code" });
        }
      }

      const verificationCode = generateVerificationCode();
      const hashedCode = hashVerificationCode(verificationCode);
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const role = ['agent', 'client', 'vendor', 'lender', 'broker'].includes(req.body.role) ? req.body.role : 'client';
      const isAgentOrBroker = role === 'agent' || role === 'broker';

      

      const user = await storage.createUser({
        email: req.body.email,
        password: await hashPassword(req.body.password),
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        role,
        registrationIp: clientIp,
        ...(req.body.phone ? { profilePhone: req.body.phone } : {}),
      });

      const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await storage.updateUser(user.id, { trialEndsAt });
      user.trialEndsAt = trialEndsAt;

      if (isAgentOrBroker && req.body.licenseNumber && req.body.licenseState && req.body.brokerageName) {
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

      console.log('User created successfully:', user.id);

      const emailResult = await sendVerificationEmail(
        req.body.email,
        req.body.firstName,
        verificationCode
      );
      if (!emailResult.success) {
        console.error("Failed to send verification email:", emailResult.error);
      }

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
        if (req.cookies?.hb_referral) {
          res.clearCookie('hb_referral', { path: '/' });
        }
      }

      req.login(user, (err) => {
        if (err) {
          console.error('Login error after registration:', err);
          return next(err);
        }
        const { password, totpSecret, ...userWithoutSensitive } = user;
          res.status(201).json(userWithoutSensitive);
      });
    } catch (error) {
      console.error('Registration error:', error);
      const msg = error instanceof Error && error.message.includes("already exists")
        ? error.message
        : "Error during registration";
      res.status(500).json({ error: msg });
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

      if (user.role === 'client' && !user.clientRecordId) {
        const matchingClient = await db.execute(sql`
          SELECT id FROM clients WHERE LOWER(email) = LOWER(${user.email}) LIMIT 1
        `);
        if (matchingClient.rows.length > 0) {
          await storage.updateUser(user.id, { clientRecordId: (matchingClient.rows[0] as any).id });
          updatedUser.clientRecordId = (matchingClient.rows[0] as any).id;
        }
      }

      sendWelcomeEmail(user.email, user.firstName, user.role).catch((err) =>
        console.error("Failed to send welcome email:", err)
      );

      const { password, totpSecret, emailVerificationToken, emailVerificationExpires, ...safeUser } = updatedUser;
      res.json(safeUser);
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

      console.log('Verification code resent for user', user.id);

      const emailResult = await sendVerificationEmail(
        user.email,
        user.firstName,
        verificationCode
      );
      if (!emailResult.success) {
        console.error("Failed to resend verification email:", emailResult.error);
      }

      res.json({ message: "Verification code sent" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification code" });
    }
  });

  app.post("/api/mfa/setup", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (user.totpEnabled) {
        return res.status(400).json({ error: "MFA is already enabled" });
      }

      const secret = generateSecret();
      await storage.updateUser(user.id, { totpSecret: secret });

      const otpauthUrl = generateURI({ type: "totp", issuer: "HomeBase", label: user.email, secret });
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

      res.json({ secret, qrCode: qrCodeDataUrl });
    } catch (error) {
      console.error("MFA setup error:", error);
      res.status(500).json({ error: "Failed to set up MFA" });
    }
  });

  app.post("/api/mfa/verify-setup", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { code } = req.body;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Verification code is required" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.totpSecret) {
        return res.status(400).json({ error: "MFA setup not initiated" });
      }

      const result = verifySync({ token: code, secret: user.totpSecret });
      if (!result.valid) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      await storage.updateUser(user.id, { totpEnabled: true });
      const { password, totpSecret, ...userWithoutSensitive } = await storage.getUser(user.id) as SelectUser;
      res.json({ success: true, user: { ...userWithoutSensitive, totpEnabled: true } });
    } catch (error) {
      console.error("MFA verify-setup error:", error);
      res.status(500).json({ error: "Failed to verify MFA setup" });
    }
  });

  app.post("/api/mfa/verify", async (req, res, next) => {
    try {
      const { mfaToken, code } = req.body;
      if (!mfaToken || !code) {
        return res.status(400).json({ error: "MFA token and code are required" });
      }

      const pending = mfaPendingLogins.get(mfaToken);
      if (!pending) {
        return res.status(401).json({ error: "MFA session expired. Please log in again." });
      }

      if (Date.now() - pending.createdAt > 5 * 60 * 1000) {
        mfaPendingLogins.delete(mfaToken);
        return res.status(401).json({ error: "MFA session expired. Please log in again." });
      }

      if (pending.attempts >= MFA_MAX_ATTEMPTS) {
        mfaPendingLogins.delete(mfaToken);
        return res.status(429).json({ error: "Too many attempts. Please log in again." });
      }

      const user = await storage.getUser(pending.userId);
      if (!user || !user.totpSecret) {
        mfaPendingLogins.delete(mfaToken);
        return res.status(401).json({ error: "User not found" });
      }

      const result = verifySync({ token: code, secret: user.totpSecret });
      if (!result.valid) {
        pending.attempts++;
        return res.status(400).json({ error: "Invalid verification code" });
      }

      mfaPendingLogins.delete(mfaToken);

      req.login(user, (err) => {
        if (err) return next(err);
        const { password, totpSecret, ...userWithoutSensitive } = user;
        res.status(200).json(userWithoutSensitive);
      });
    } catch (error) {
      console.error("MFA verify error:", error);
      res.status(500).json({ error: "Failed to verify MFA code" });
    }
  });

  app.post("/api/mfa/disable", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ error: "Password is required to disable MFA" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const passwordValid = await comparePasswords(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ error: "Incorrect password" });
      }

      await storage.updateUser(user.id, { totpEnabled: false, totpSecret: null });
      const { password: _, totpSecret, ...userWithoutSensitive } = await storage.getUser(user.id) as SelectUser;
      res.json({ success: true, user: userWithoutSensitive });
    } catch (error) {
      console.error("MFA disable error:", error);
      res.status(500).json({ error: "Failed to disable MFA" });
    }
  });
}