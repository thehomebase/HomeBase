import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
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

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log('Registration request body:', req.body);

      // Validate required fields
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

      const user = await storage.createUser({
        email: req.body.email,
        password: await hashPassword(req.body.password),
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        role: req.body.role || 'client'
      });

      console.log('User created successfully:', { id: user.id, email: user.email });

      req.login(user, (err) => {
        if (err) {
          console.error('Login error after registration:', err);
          return next(err);
        }
        // Only send necessary user data
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
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

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    if (req.user) {
      const { password, ...userWithoutPassword } = req.user;
      res.status(200).json(userWithoutPassword);
    } else {
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
}