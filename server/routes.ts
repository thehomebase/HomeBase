import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm/sql";
import { eq, desc } from "drizzle-orm";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertTransactionSchema, insertChecklistSchema, insertMessageSchema, insertClientSchema, insertContractorSchema, insertContractorReviewSchema, insertPropertyViewingSchema, insertPropertyFeedbackSchema, insertSavedPropertySchema, insertCommunicationSchema, insertInspectionItemSchema, insertBidRequestSchema, insertBidSchema, insertHomeownerHomeSchema, insertMaintenanceRecordSchema, insertHomeTeamMemberSchema, insertDripCampaignSchema, insertDripStepSchema, insertDripEnrollmentSchema, insertClientSpecialDateSchema, insertLeadZipCodeSchema, insertLeadSchema, insertAgentReviewSchema, insertVendorRatingSchema, listingPhotos, formTemplates, homeExpenses, insertHomeExpenseSchema, homeMaintenanceReminders, insertHomeMaintenanceReminderSchema, homeEquityProfiles, insertHomeEquityProfileSchema, homeWarrantyItems, insertHomeWarrantyItemSchema, homeImprovements, insertHomeImprovementSchema } from "@shared/schema";
import ical from "ical-generator";
import multer from "multer";
import * as XLSX from "xlsx";
import { parseContract } from "./contract-parser";
import { sendSMS, sendSMSFromNumber, isTwilioConfigured, getTwilioPhoneNumber, isOptOutMessage, isOptInMessage, normalizePhoneNumber, validateTwilioWebhook, isBlockedNumber, containsThreateningContent, searchAvailableNumbers, purchasePhoneNumber, releasePhoneNumber } from "./twilio-service";
import { getAuthUrl, handleCallback, getGmailStatus, disconnectGmail, sendGmailEmail, getGmailMessages, getGmailInbox, getGmailMessageDetail, getSignature, batchModifyMessages, trashMessages, getGmailLabels, syncTransactionToGoogleCalendar, syncAllTransactionsToGoogleCalendar, countGmailEmailsForClients, type EmailAttachment } from "./gmail-service";
import { getSignNowAuthUrl, handleSignNowCallback, getSignNowStatus, disconnectSignNow, uploadDocument as snUploadDocument, sendSigningInvite, getDocumentStatus as snGetDocumentStatus, getDocuments as snGetDocuments, downloadDocument as snDownloadDocument, isSignNowConfigured, logSignNowAction } from "./signnow-service";
import { getDocuSignAuthUrl, handleDocuSignCallback, getDocuSignStatus, disconnectDocuSign, createEnvelope, createDraftEnvelope, createSenderView, getEnvelopeStatus, listEnvelopes, downloadEnvelopeDocuments, isDocuSignConfigured, logDocuSignAction, generatePKCE } from "./docusign-service";
import { isDropboxConfigured, generateDropboxState, getDropboxAuthUrl, handleDropboxCallback, getDropboxConnectionStatus, disconnectDropbox, listDropboxFiles, downloadDropboxFile, searchDropboxFiles } from "./dropbox-service";
import { isFirmaConfigured, createSigningRequest as firmaCreateSR, getSigningRequest as firmaGetSR, listSigningRequests as firmaListSR, sendSigningRequest as firmaSendSR, cancelSigningRequest as firmaCancelSR, updateSigningRequest as firmaUpdateSR, generateSigningRequestJWT, getEditorScriptUrl, logFirmaAction, saveFirmaSigningRequest, getUserSigningRequests, getTransactionSigningRequests, updateSigningRequestStatus, verifySigningRequestOwnership, getSigningRequestFields as firmaGetFields, getSigningRequestUsers as firmaGetUsers, addSigningRequestField as firmaAddField, updateSigningRequestField as firmaUpdateField, deleteSigningRequestField as firmaDeleteField, addSigningRequestUser as firmaAddUser, deleteSigningRequestUser as firmaDeleteUser, getSigningRequestRecord, recreateSigningRequestWithRecipients } from "./firma-service";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { notify } from "./notification-helper";
import { lockManager } from "./websocket";
import { getEstimatedHomeValue } from "./zip-home-values";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { notifyAgentOfNewLead, notifyVendorOfNewLead } from "./notification-service";
import { apiKeyAuth as apiKeyAuthMiddleware, generateApiKey, hashApiKey } from "./api-key-auth";
import { fireWebhook } from "./webhook-service";
import { getCached, setCache, getCacheSize, getDbCacheSize, cleanExpiredCache, buildPropertyCacheKey, buildListingsCacheKey, findPropertyInCachedListings } from "./rentcast-cache";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 },
});

const IMAGE_MAGIC_BYTES: { mime: string; bytes: number[] }[] = [
  { mime: "image/png", bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: "image/jpeg", bytes: [0xFF, 0xD8, 0xFF] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46] },
];

function isValidImage(buffer: Buffer, mimetype: string): boolean {
  if (!mimetype.startsWith("image/")) return false;
  if (buffer.length < 12) return false;
  if (IMAGE_MAGIC_BYTES.some(sig => sig.bytes.every((byte, i) => buffer[i] === byte))) return true;
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;
  return false;
}

const EXCEL_MAGIC_BYTES = [
  [0x50, 0x4B, 0x03, 0x04],
  [0xD0, 0xCF, 0x11, 0xE0],
];

function isValidExcel(buffer: Buffer, mimetype: string): boolean {
  const validMimes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
  ];
  if (!validMimes.includes(mimetype) && !mimetype.includes("excel") && !mimetype.includes("csv")) return false;
  if (mimetype.includes("csv")) return true;
  if (buffer.length < 4) return false;
  return EXCEL_MAGIC_BYTES.some(sig =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}

function getClientIp(req: import('express').Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
}

async function verifyTransactionAccess(transactionId: number, userId: number, userRole: string): Promise<{ allowed: boolean; transaction?: any; permissionLevel?: string }> {
  const transaction = await storage.getTransaction(transactionId);
  if (!transaction) return { allowed: false };
  if (transaction.agentId === userId) return { allowed: true, transaction, permissionLevel: "full" };
  if (userRole === "broker") return { allowed: true, transaction, permissionLevel: "full" };
  if (transaction.clientId) {
    const client = await storage.getClient(transaction.clientId);
    if (client?.linkedClientId === userId) {
      return { allowed: true, transaction, permissionLevel: "full" };
    }
  }
  if (transaction.secondaryClientId) {
    const secondaryClient = await storage.getClient(transaction.secondaryClientId);
    if (secondaryClient?.linkedClientId === userId) {
      return { allowed: true, transaction, permissionLevel: "full" };
    }
  }
  try {
    const authResult = await db.execute(sql`
      SELECT au.permission_level FROM authorized_users au
      WHERE au.authorized_user_id = ${userId} AND au.owner_id = ${transaction.agentId} AND au.status = 'active'
      LIMIT 1
    `);
    if (authResult.rows.length > 0) {
      return { allowed: true, transaction, permissionLevel: authResult.rows[0].permission_level as string };
    }
  } catch (e) {}
  return { allowed: false, transaction };
}

function isTransactionLockedByOther(transactionId: number, userId: number): boolean {
  const holder = lockManager.getLockHolder(transactionId);
  return !!holder && holder.userId !== userId;
}

function createRateLimiter(windowMs: number, maxRequests: number) {
  const hits = new Map<string, { count: number; resetTime: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of hits) {
      if (now > val.resetTime) hits.delete(key);
    }
  }, 60_000);

  return (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    const key = getClientIp(req);
    const now = Date.now();
    const record = hits.get(key);

    if (!record || now > record.resetTime) {
      hits.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count++;
    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
    }
    next();
  };
}

const apiLimiter = createRateLimiter(60_000, 120);
const authLimiter = createRateLimiter(15 * 60_000, 15);
const rentcastLimiter = createRateLimiter(60_000, 5);
const sensitiveApiLimiter = createRateLimiter(60_000, 30);
const exportLimiter = createRateLimiter(60_000, 5);

function requireAdmin(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

async function logAdminAction(adminId: number, action: string, targetType: string, targetId?: number, details?: any) {
  try {
    await db.execute(sql`INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details) VALUES (${adminId}, ${action}, ${targetType}, ${targetId || null}, ${JSON.stringify(details || {})})`);
  } catch (e) {
    console.error("Failed to log admin action:", e);
  }
}

// Seller checklist items
const SELLER_CHECKLIST_ITEMS = [
  { id: "assess-value", text: "Assess Home Value", phase: "Pre-Listing Preparation" },
  { id: "home-inspection", text: "Conduct Pre-Listing Inspection", phase: "Pre-Listing Preparation" },
  { id: "repairs", text: "Complete Necessary Repairs", phase: "Pre-Listing Preparation" },
  { id: "declutter", text: "Declutter and Depersonalize", phase: "Pre-Listing Preparation" },
  { id: "staging", text: "Stage the Home", phase: "Pre-Listing Preparation" },
  { id: "curb-appeal", text: "Enhance Curb Appeal", phase: "Pre-Listing Preparation" },
  { id: "select-agent", text: "Select Real Estate Agent", phase: "Listing Phase" },
  { id: "photos", text: "Obtain Professional Photography", phase: "Listing Phase" },
  { id: "listing-desc", text: "Write Compelling Listing", phase: "Listing Phase" },
  { id: "showings", text: "Set Up Showings", phase: "Listing Phase" },
  { id: "review-offers", text: "Review Offers", phase: "Offer and Negotiation" },
  { id: "counter-offers", text: "Handle Counter Offers", phase: "Offer and Negotiation" },
  { id: "accept-offer", text: "Accept Final Offer", phase: "Offer and Negotiation" },
  { id: "appraisal", text: "Complete Home Appraisal", phase: "Post-Acceptance" },
  { id: "buyer-inspection", text: "Facilitate Buyer's Inspection", phase: "Post-Acceptance" },
  { id: "disclosures", text: "Complete Property Disclosures", phase: "Post-Acceptance" },
  { id: "title-search", text: "Complete Title Search", phase: "Post-Acceptance" },
  { id: "utilities", text: "Cancel/Transfer Utilities", phase: "Closing Preparation" },
  { id: "moving", text: "Arrange Moving Plans", phase: "Closing Preparation" },
  { id: "walkthrough", text: "Schedule Final Walkthrough", phase: "Closing Preparation" },
  { id: "review-docs", text: "Review Closing Documents", phase: "Closing" },
  { id: "sign-docs", text: "Sign Closing Documents", phase: "Closing" },
  { id: "keys", text: "Hand Over Keys", phase: "Closing" },
  { id: "address-change", text: "Update Address Information", phase: "Post-Closing" },
  { id: "final-move", text: "Complete Moving Process", phase: "Post-Closing" }
];

// Buyer checklist items
const BUYER_CHECKLIST_ITEMS = [
  { id: "buying-criteria", text: "Determine buying criteria", phase: "Pre-Offer" },
  { id: "hire-agent", text: "Hire a real estate agent", phase: "Pre-Offer" },
  { id: "get-preapproval", text: "Hire a lender & get pre-approved", phase: "Pre-Offer" },
  { id: "review-disclosures", text: "Review property disclosures", phase: "Pre-Offer" },
  { id: "preliminary-inspection", text: "Conduct preliminary inspections", phase: "Pre-Offer" },
  { id: "attend-viewings", text: "Attend open houses or viewings", phase: "Pre-Offer" },
  { id: "submit-offer", text: "Write and submit an offer", phase: "Offer and Negotiation" },
  { id: "negotiate-terms", text: "Negotiate terms if counteroffer received", phase: "Offer and Negotiation" },
  { id: "review-contingencies", text: "Review and agree on contingencies", phase: "Offer and Negotiation" },
  { id: "sign-acceptance", text: "Sign offer acceptance or counteroffer", phase: "Offer and Negotiation" },
  { id: "earnest-money", text: "Include earnest money deposit", phase: "Offer and Negotiation" },
  { id: "home-inspection", text: "Schedule and conduct home inspection", phase: "Due Diligence" },
  { id: "review-inspection", text: "Review inspection report", phase: "Due Diligence" },
  { id: "negotiate-repairs", text: "Negotiate repairs or price adjustments", phase: "Due Diligence" },
  { id: "order-appraisal", text: "Order appraisal", phase: "Due Diligence" },
  { id: "review-appraisal", text: "Review appraisal report", phase: "Due Diligence" },
  { id: "additional-checks", text: "Perform additional due diligence", phase: "Due Diligence" },
  { id: "review-title", text: "Review title report", phase: "Due Diligence" },
  { id: "title-insurance", text: "Obtain title insurance", phase: "Due Diligence" },
  { id: "finalize-mortgage", text: "Finalize mortgage details", phase: "Due Diligence" },
  { id: "lock-rate", text: "Lock in mortgage rate", phase: "Due Diligence" },
  { id: "final-walkthrough", text: "Final walkthrough of property", phase: "Closing Preparation" },
  { id: "confirm-conditions", text: "Confirm all conditions of sale", phase: "Closing Preparation" },
  { id: "secure-insurance", text: "Secure homeowners insurance", phase: "Closing Preparation" },
  { id: "arrange-utilities", text: "Arrange for utilities transfer", phase: "Closing Preparation" },
  { id: "prepare-moving", text: "Prepare for moving", phase: "Closing Preparation" },
  { id: "review-closing-docs", text: "Review closing documents", phase: "Closing Preparation" },
  { id: "secure-funds", text: "Secure funds for closing", phase: "Closing Preparation" },
  { id: "wire-funds", text: "Wire funds or obtain cashier's check", phase: "Closing Preparation" },
  { id: "power-of-attorney", text: "Sign power of attorney if needed", phase: "Closing Preparation" },
  { id: "attend-closing", text: "Attend closing", phase: "Closing" },
  { id: "sign-documents", text: "Sign all closing documents", phase: "Closing" },
  { id: "receive-keys", text: "Receive keys to the property", phase: "Closing" },
  { id: "change-locks", text: "Change locks and security systems", phase: "Post-Closing" },
  { id: "update-address", text: "Update address with relevant parties", phase: "Post-Closing" },
  { id: "file-homestead", text: "File homestead exemption if applicable", phase: "Post-Closing" },
  { id: "begin-maintenance", text: "Begin maintenance and warranty registration", phase: "Post-Closing" }
];


export function registerRoutes(app: Express): Server {
  setupAuth(app);

  const verificationExemptPaths = new Set([
    '/api/user',
    '/api/login',
    '/api/logout',
    '/api/register',
    '/api/verify-email',
    '/api/resend-verification',
    '/api/account/reactivate',
  ]);

  app.use('/api', apiLimiter);
  app.use('/api/login', authLimiter);
  app.use('/api/register', authLimiter);
  app.use('/api/rentcast', rentcastLimiter);
  app.use('/api/signnow', sensitiveApiLimiter);
  app.use('/api/docusign', sensitiveApiLimiter);
  app.use('/api/census', sensitiveApiLimiter);
  app.use('/api/twilio', sensitiveApiLimiter);
  app.use('/api/gmail', sensitiveApiLimiter);

  app.use('/api', (req, res, next) => {
    if (verificationExemptPaths.has(req.path)) return next();
    if (!req.isAuthenticated()) return next();
    const user = req.user as any;
    if (user && user.emailVerified === false) {
      return res.status(403).json({ error: "Email verification required" });
    }
    next();
  });

  app.get("/marketing-videos/:filename", (req, res) => {
    const filename = req.params.filename.replace(/[^a-zA-Z0-9_\-\.]/g, "");
    if (!filename.endsWith(".mp4")) return res.status(400).send("Invalid file");
    const filePath = `${process.cwd()}/attached_assets/generated_videos/${filename}`;
    res.sendFile(filePath);
  });

  const rpName = "Home-Base";
  const getAppBaseUrl = (req: any): string => {
    if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    const host = req.get("host") || "localhost:5000";
    const protocol = host.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}`;
  };

  const getWebAuthnConfig = (req: any) => {
    const host = req.get("host") || "localhost:5000";
    const rpID = host.split(":")[0];
    const protocol = req.protocol || (host.includes("localhost") ? "http" : "https");
    const origin = `${protocol}://${host}`;
    return { rpID, origin };
  };

  app.post("/api/webauthn/register-options", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userCredentials = await storage.getWebAuthnCredentialsByUser(req.user.id);
      const excludeCredentials = userCredentials.map((cred) => ({
        id: cred.id,
        type: "public-key" as const,
        transports: cred.transports
          ? (cred.transports.split(",") as AuthenticatorTransportFuture[])
          : undefined,
      }));

      const { rpID } = getWebAuthnConfig(req);
      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: req.user.email,
        userID: new TextEncoder().encode(String(req.user.id)),
        attestationType: "none",
        excludeCredentials,
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
      });

      (req.session as any).webauthnChallenge = options.challenge;
      (req.session as any).webauthnChallengeExpiry = Date.now() + 120000;
      res.json(options);
    } catch (error) {
      console.error("WebAuthn register options error:", error);
      res.status(500).json({ error: "Failed to generate registration options" });
    }
  });

  app.post("/api/webauthn/register-verify", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const expectedChallenge = (req.session as any).webauthnChallenge;
      const expiry = (req.session as any).webauthnChallengeExpiry;
      if (!expectedChallenge || !expiry || Date.now() > expiry) {
        return res.status(400).json({ error: "No registration challenge found or challenge expired" });
      }

      const { rpID, origin } = getWebAuthnConfig(req);
      const verification = await verifyRegistrationResponse({
        response: req.body,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return res.status(400).json({ error: "Registration verification failed" });
      }

      const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      await storage.createWebAuthnCredential({
        id: credential.id,
        userId: req.user.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64"),
        counter: credential.counter,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: credential.transports
          ? credential.transports.join(",")
          : undefined,
      });

      delete (req.session as any).webauthnChallenge;
      delete (req.session as any).webauthnChallengeExpiry;
      res.json({ verified: true });
    } catch (error) {
      delete (req.session as any).webauthnChallenge;
      delete (req.session as any).webauthnChallengeExpiry;
      console.error("WebAuthn register verify error:", error);
      res.status(500).json({ error: "Registration verification failed" });
    }
  });

  app.post("/api/webauthn/login-options", async (req, res) => {
    try {
      const { rpID } = getWebAuthnConfig(req);

      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: "preferred",
      });

      (req.session as any).webauthnChallenge = options.challenge;
      (req.session as any).webauthnChallengeExpiry = Date.now() + 120000;

      res.json(options);
    } catch (error) {
      console.error("WebAuthn login options error:", error);
      res.status(500).json({ error: "Failed to generate authentication options" });
    }
  });

  app.post("/api/webauthn/login-verify", async (req, res) => {
    try {
      const { response: authResponse } = req.body;
      if (!authResponse?.id) {
        return res.status(400).json({ error: "Invalid authentication response" });
      }

      const expectedChallenge = (req.session as any).webauthnChallenge;
      const expiry = (req.session as any).webauthnChallengeExpiry;
      if (!expectedChallenge || !expiry || Date.now() > expiry) {
        return res.status(400).json({ error: "No authentication challenge found or challenge expired" });
      }

      const credential = await storage.getWebAuthnCredential(authResponse.id);
      if (!credential) {
        return res.status(400).json({ error: "Credential not found" });
      }

      const { rpID, origin } = getWebAuthnConfig(req);
      const verification = await verifyAuthenticationResponse({
        response: authResponse,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: credential.id,
          publicKey: new Uint8Array(Buffer.from(credential.publicKey, "base64")),
          counter: credential.counter,
          transports: credential.transports
            ? (credential.transports.split(",") as AuthenticatorTransportFuture[])
            : undefined,
        },
      });

      delete (req.session as any).webauthnChallenge;
      delete (req.session as any).webauthnChallengeExpiry;

      if (!verification.verified) {
        return res.status(400).json({ error: "Authentication failed" });
      }

      await storage.updateWebAuthnCredentialCounter(
        credential.id,
        verification.authenticationInfo.newCounter
      );

      const user = await storage.getUser(credential.userId);
      if (!user) {
        return res.status(400).json({ error: "User not found" });
      }

      if (user.accountStatus === "suspended") {
        return res.status(403).json({ error: "Your account has been suspended. Please contact support." });
      }
      if (user.accountStatus === "inactive") {
        return res.status(403).json({ error: "Your account is deactivated.", accountDeactivated: true, email: user.email });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("WebAuthn login error:", err);
          return res.status(500).json({ error: "Login failed" });
        }
        const { password, ...userWithoutPassword } = user;
        res.json({ verified: true, user: userWithoutPassword });
      });
    } catch (error) {
      delete (req.session as any).webauthnChallenge;
      delete (req.session as any).webauthnChallengeExpiry;
      console.error("WebAuthn login verify error:", error);
      res.status(500).json({ error: "Authentication verification failed" });
    }
  });

  app.get("/api/webauthn/credentials", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const credentials = await storage.getWebAuthnCredentialsByUser(req.user.id);
      res.json(credentials.map((c) => ({
        id: c.id,
        deviceType: c.deviceType,
        backedUp: c.backedUp,
        createdAt: c.createdAt,
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch credentials" });
    }
  });

  app.delete("/api/webauthn/credentials/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const credential = await storage.getWebAuthnCredential(req.params.id);
      if (!credential) return res.status(404).json({ error: "Credential not found" });
      if (credential.userId !== req.user.id) return res.sendStatus(403);
      await storage.deleteWebAuthnCredential(req.params.id);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete credential" });
    }
  });

  // Clients
  app.get("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const clients = await storage.getClientsByAgent(req.user.id);
      res.json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).send('Error fetching clients');
    }
  });

  app.post("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('Auth check failed, user not authenticated');
      return res.sendStatus(401);
    }

    if (req.user.role !== "agent" && req.user.role !== "broker") {
      console.log('Role check failed, user role:', req.user.role);
      return res.sendStatus(403);
    }

    try {
      const parsed = insertClientSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error('Validation error:', parsed.error);
        return res.status(400).json(parsed.error);
      }

      // Ensure required fields are present and handle empty arrays
      const clientData = {
        ...parsed.data,
        agentId: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Ensure labels is always an array
        labels: Array.isArray(parsed.data.labels) ? parsed.data.labels : []
      };

      console.log('Creating client with data:', clientData);
      const client = await storage.createClient(clientData);

      if (!client) {
        throw new Error('Failed to create client record');
      }

      fireWebhook("client_created", client);
      res.status(201).json(client);
    } catch (error) {
      console.error('Error creating client:', error);
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const clientId = Number(req.params.id);
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ error: 'Client not found' });
      if (client.agentId !== req.user.id && req.user.role !== "broker") {
        return res.status(403).json({ error: 'Not authorized to delete this client' });
      }
      await storage.deleteClient(clientId);
      res.sendStatus(200);
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error && (error as Error & { statusCode: number }).statusCode === 409) {
        return res.status(409).json({ error: error.message });
      }
      console.error('Error deleting client:', error);
      res.status(500).json({ error: 'Failed to delete client' });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }

    try {
      const clientId = Number(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ error: 'Invalid client ID' });
      }

      const existing = await storage.getClient(clientId);
      if (!existing) return res.status(404).json({ error: 'Client not found' });
      if (existing.agentId !== req.user.id && req.user.role !== "broker") {
        return res.status(403).json({ error: 'Not authorized to update this client' });
      }

      const allowedFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'street', 'city', 'state', 'zipCode', 'notes', 'type', 'status', 'preApprovalAmount', 'lenderId', 'preferredContactMethod', 'birthday', 'anniversary', 'moveInDate', 'labels'];
      const safeBody: Record<string, any> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) safeBody[key] = req.body[key];
      }
      const client = await storage.updateClient(clientId, safeBody);

      const syncFields = ['street', 'city', 'state', 'zipCode', 'anniversary'];
      const changedSyncFields: Record<string, any> = {};
      for (const field of syncFields) {
        if (safeBody[field] !== undefined && safeBody[field] !== (existing as any)[field]) {
          changedSyncFields[field] = safeBody[field];
        }
      }

      if (Object.keys(changedSyncFields).length > 0 && existing.linkedClientId) {
        try {
          const linkedClient = await storage.getClient(existing.linkedClientId);
          if (linkedClient && (linkedClient.agentId === req.user.id || req.user.role === "broker")) {
            await storage.updateClient(existing.linkedClientId, changedSyncFields);
          }
        } catch (syncErr) {
          console.error('Error syncing linked client fields:', syncErr);
        }
      }

      res.json(client);
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(500).json({ error: 'Failed to update client' });
    }
  });

  app.post("/api/clients/bulk-update", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }
    try {
      const { clientIds, action, value } = req.body;
      if (!Array.isArray(clientIds) || clientIds.length === 0 || clientIds.length > 500) {
        return res.status(400).json({ error: 'clientIds must be a non-empty array (max 500)' });
      }
      const validActions = ['add_label', 'remove_label', 'set_status', 'delete'];
      if (!validActions.includes(action)) {
        return res.status(400).json({ error: `action must be one of: ${validActions.join(', ')}` });
      }
      const validStatuses = ['active', 'inactive', 'pending'];
      if (action === 'set_status' && (!value || !validStatuses.includes(value))) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
      }
      if ((action === 'add_label' || action === 'remove_label') && (typeof value !== 'string' || !value.trim())) {
        return res.status(400).json({ error: 'value must be a non-empty string for label actions' });
      }

      const uniqueIds = [...new Set(clientIds.map(Number).filter(n => !isNaN(n)))];
      let updated = 0;
      let skipped = 0;
      const results = [];

      for (const id of uniqueIds) {
        try {
          const client = await storage.getClient(id);
          if (!client || (client.agentId !== req.user.id && req.user.role !== "broker")) {
            skipped++;
            continue;
          }

          let update: Record<string, any> = {};
          if (action === 'add_label') {
            const currentLabels = client.labels || [];
            if (!currentLabels.includes(value.trim())) {
              update.labels = [...currentLabels, value.trim()];
            }
          } else if (action === 'remove_label') {
            update.labels = (client.labels || []).filter((l: string) => l !== value);
          } else if (action === 'set_status') {
            update.status = value;
          } else if (action === 'delete') {
            await storage.deleteClient(id);
            updated++;
            results.push({ id, deleted: true });
            continue;
          }

          if (Object.keys(update).length > 0) {
            const updatedClient = await storage.updateClient(id, update);
            updated++;
            results.push(updatedClient);
          }
        } catch (itemErr) {
          console.error(`Error processing client ${id}:`, itemErr);
          skipped++;
        }
      }
      res.json({ updated, skipped, results });
    } catch (error) {
      console.error('Error bulk updating clients:', error);
      res.status(500).json({ error: 'Failed to bulk update clients' });
    }
  });

  app.get("/api/clients/:id/linked", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const client = await storage.getClient(Number(req.params.id));
      if (!client) return res.status(404).json({ error: 'Client not found' });
      if (client.agentId !== req.user.id && req.user.role !== "broker") return res.sendStatus(403);
      if (!client.linkedClientId) return res.json(null);
      const linked = await storage.getClient(client.linkedClientId);
      res.json(linked || null);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch linked client' });
    }
  });

  app.post("/api/clients/:id/link", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const clientId = Number(req.params.id);
      const { linkedClientId } = req.body;
      if (!linkedClientId || clientId === linkedClientId) return res.status(400).json({ error: 'Invalid linked client' });
      const client = await storage.getClient(clientId);
      if (!client || client.agentId !== req.user.id) return res.sendStatus(403);
      const target = await storage.getClient(linkedClientId);
      if (!target || target.agentId !== req.user.id) return res.status(400).json({ error: 'Target client not found or not yours' });
      if (client.linkedClientId) return res.status(400).json({ error: 'Client is already linked. Unlink first.' });
      if (target.linkedClientId) return res.status(400).json({ error: 'Target client is already linked to someone else.' });
      await storage.linkClients(clientId, linkedClientId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error linking clients:', error);
      res.status(500).json({ error: 'Failed to link clients' });
    }
  });

  app.delete("/api/clients/:id/link", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const client = await storage.getClient(Number(req.params.id));
      if (!client || client.agentId !== req.user.id) return res.sendStatus(403);
      await storage.unlinkClients(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error unlinking clients:', error);
      res.status(500).json({ error: 'Failed to unlink clients' });
    }
  });

  // Client Excel Import
  app.post("/api/clients/import", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!isValidExcel(req.file.buffer, req.file.mimetype)) {
        return res.status(400).json({ error: 'File must be a valid Excel (.xlsx, .xls) or CSV file' });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

      if (data.length === 0) {
        return res.status(400).json({ error: 'Spreadsheet is empty' });
      }

      const results = { success: 0, failed: 0, errors: [] as string[] };

      for (const row of data) {
        try {
          // Map Excel columns to client fields (case-insensitive)
          const getField = (names: string[]) => {
            for (const name of names) {
              const key = Object.keys(row).find(k => k.toLowerCase() === name.toLowerCase());
              if (key && row[key]) return String(row[key]).trim();
            }
            return null;
          };

          const firstName = getField(['first name', 'firstname', 'first_name']);
          const lastName = getField(['last name', 'lastname', 'last_name']);

          if (!firstName || !lastName) {
            results.failed++;
            results.errors.push(`Row missing required first/last name`);
            continue;
          }

          // Parse type field - can be comma-separated
          const typeRaw = getField(['type', 'client type', 'clienttype']);
          let types: ('seller' | 'buyer' | 'renter')[] = ['buyer'];
          if (typeRaw) {
            const parsedTypes = typeRaw.toLowerCase().split(',').map(t => t.trim());
            const validTypes = parsedTypes.filter((t): t is 'seller' | 'buyer' | 'renter' => 
              ['seller', 'buyer', 'renter'].includes(t)
            );
            if (validTypes.length > 0) types = validTypes;
          }

          // Parse labels - can be comma-separated
          const labelsRaw = getField(['labels', 'tags', 'label']);
          const labels: string[] = labelsRaw 
            ? labelsRaw.split(',').map(l => l.trim()).filter(l => l.length > 0)
            : [];

          const clientData = {
            firstName,
            lastName,
            email: getField(['email', 'e-mail', 'email address']),
            phone: getField(['phone', 'phone number', 'telephone']),
            mobilePhone: getField(['mobile', 'mobile phone', 'cell', 'cell phone']),
            street: getField(['street', 'street address', 'address']),
            city: getField(['city']),
            zipCode: getField(['zip', 'zip code', 'zipcode', 'postal code']),
            type: types,
            status: 'active' as const,
            notes: getField(['notes', 'note', 'comments']),
            labels,
            agentId: req.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await storage.createClient(clientData);
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push(err instanceof Error ? err.message : 'Unknown error');
        }
      }

      res.json({
        message: `Imported ${results.success} clients successfully${results.failed > 0 ? `, ${results.failed} failed` : ''}`,
        ...results
      });
    } catch (error) {
      console.error('Error importing clients:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to import clients'
      });
    }
  });


  // Transactions
  app.get("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      let targetUserId = req.user.id;
      const actingAs = req.query.actingAs ? Number(req.query.actingAs) : null;
      const year = req.query.year ? Number(req.query.year) : undefined;
      if (actingAs && actingAs !== req.user.id) {
        const authCheck = await db.execute(sql`
          SELECT id FROM authorized_users 
          WHERE authorized_user_id = ${req.user.id} AND owner_id = ${actingAs} AND status = 'active'
          LIMIT 1
        `);
        if (authCheck.rows.length === 0) return res.status(403).json({ error: "Not authorized to view this account" });
        targetUserId = actingAs;
      }
      const transactions = await storage.getTransactionsByUser(targetUserId, year);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).send('Error fetching transactions');
    }
  });

  app.get("/api/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const id = Number(req.params.id);
      const { allowed, transaction } = await verifyTransactionAccess(id, req.user.id, req.user.role);
      if (!allowed || !transaction) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(transaction);

    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({ error: 'Error fetching transaction' });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) {
      return res.sendStatus(401);
    }

    try {
      const id = Number(req.params.id);
      const { allowed, permissionLevel } = await verifyTransactionAccess(id, req.user.id, req.user.role);
      if (!allowed || permissionLevel !== "full") {
        return res.status(403).json({ error: 'Not authorized to delete this transaction' });
      }
      if (isTransactionLockedByOther(id, req.user.id)) {
        return res.status(423).json({ error: "Transaction is currently being edited by another user" });
      }
      await storage.deleteTransaction(id);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      res.status(500).json({ error: 'Failed to delete transaction' });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }

    try {
      const id = Number(req.params.id);
      const allowedTxFields = ['status', 'type', 'streetName', 'city', 'state', 'zipCode', 'price', 'contractPrice', 'listDate', 'closingDate', 'contractExecutionDate', 'optionPeriodExpiration', 'notes', 'buyerName', 'sellerName', 'titleCompany', 'escrowOfficer', 'lenderName', 'propertyType', 'mlsNumber', 'earnestMoney', 'optionMoney', 'optionFee', 'downPayment', 'sellerConcessions', 'buyerAgentCompensation', 'homeWarranty', 'commission', 'clientId', 'requestClientReview', 'financing'];
      const data: Record<string, any> = {};
      for (const key of allowedTxFields) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      const { allowed: txAllowed, permissionLevel: txPermLevel, transaction: oldTransaction } = await verifyTransactionAccess(id, req.user.id, req.user.role);
      if (!txAllowed || !oldTransaction || txPermLevel !== "full") {
        return res.status(403).json({ error: "Not authorized to update this transaction" });
      }
      if (isTransactionLockedByOther(id, req.user.id)) {
        return res.status(423).json({ error: "Transaction is currently being edited by another user" });
      }

      const VALID_BUYER_STATUSES = ['prospect', 'qualified_buyer', 'active_search', 'offer_submitted', 'under_contract', 'closing', 'closed'];
      const VALID_SELLER_STATUSES = ['prospect', 'active_listing_prep', 'live_listing', 'under_contract', 'closed'];
      if (data.status) {
        const txType = data.type || oldTransaction.type || 'buy';
        const validStatuses = txType === 'buy' ? VALID_BUYER_STATUSES : VALID_SELLER_STATUSES;
        if (!validStatuses.includes(data.status)) {
          return res.status(400).json({ error: `Invalid status '${data.status}' for ${txType} transaction` });
        }
      }

      if (data.type === 'sell' && !data.streetName && !oldTransaction.streetName) {
        return res.status(400).json({ error: "Street name is required for seller transactions" });
      }

      // Handle date fields specifically
      const dateFields = ['closingDate', 'contractExecutionDate', 'optionPeriodExpiration'];
      dateFields.forEach(field => {
        if (data[field]) {
          const date = new Date(data[field]);
          date.setUTCHours(12, 0, 0, 0);
          data[field] = date.toISOString();
        }
      });

      // Remove any undefined fields
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });

      const transaction = await storage.updateTransaction(id, data);

      // Google Calendar sync is handled via iCal subscription feed and manual "Push to Google Calendar" button.
      // Automatic push removed to prevent duplicate events.

      if ((data.streetName || data.city || data.state || data.zipCode) && transaction.streetName && transaction.city) {
        const addressParts = [transaction.streetName, transaction.city, transaction.state, transaction.zipCode].filter(Boolean);
        const address = addressParts.join(', ');
        geocodeAddress(address)
          .then(result => {
            if (result) {
              storage.updateTransactionCoordinates(id, result.lat, result.lon);
            }
          })
          .catch(err => console.error('Background geocode error:', err?.message));
      }

      if (data.status && oldTransaction && oldTransaction.status !== data.status) {
        const address = [transaction.streetName, transaction.city].filter(Boolean).join(', ') || 'a property';
        const statusLabel = data.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const agentName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'your agent';

        (async () => {
          try {
            const allClientUsers = await storage.getClientUserIdsForTransaction(transaction.id);
            const seen = new Set<number>();
            const clientUsers = allClientUsers.filter(cu => {
              if (seen.has(cu.userId)) return false;
              seen.add(cu.userId);
              return true;
            });
            for (const clientUser of clientUsers) {
              const prefs = await storage.getClientNotificationPreferences(clientUser.userId);
              if (!prefs.transactionUpdates) continue;

              if (prefs.channelInApp) {
                notify(clientUser.userId, 'transaction_update', 'Transaction Updated', `${address} moved to ${statusLabel}`, transaction.id, 'transaction').catch(() => {});
              }

              if (prefs.channelEmail && clientUser.email) {
                const { sendTransactionStatusEmail } = await import("./email-service");
                sendTransactionStatusEmail(clientUser.email, clientUser.firstName, address, statusLabel, agentName).catch((err) => {
                  console.error('Failed to send transaction status email:', err);
                });
              }

              if (prefs.channelSms && clientUser.phone) {
                const isOptedOut = await storage.isPhoneOptedOut(clientUser.phone);
                if (!isOptedOut) {
                  const smsBody = `HomeBase: Your transaction for ${address} has moved to "${statusLabel}". Log in for details.`;
                  sendSMS(clientUser.phone, smsBody).catch((err) => {
                    console.error('Failed to send transaction status SMS:', err);
                  });
                }
              }

              if (prefs.channelPush) {
                try {
                  const subs = await storage.getPushSubscriptionsByUser(clientUser.userId);
                  if (subs.length > 0) {
                    const { sendPushNotification } = await import("./notification-service");
                    sendPushNotification(subs, {
                      title: 'Transaction Updated',
                      body: `${address} moved to ${statusLabel}`,
                      data: { url: `/client-transaction/${transaction.id}` },
                    }, async (subId) => {
                      await storage.deletePushSubscription(subId);
                    }).catch(() => {});
                  }
                } catch (pushErr) {
                  console.error('Failed to send transaction status push:', pushErr);
                }
              }
            }
          } catch (err) {
            console.error('Error dispatching client transaction notifications:', err);
          }
        })();

        if (transaction.agentId !== req.user.id) {
          notify(transaction.agentId, 'transaction_update', 'Transaction Updated', `${address} moved to ${statusLabel}`, transaction.id, 'transaction').catch(() => {});
        }
      }

      if (oldTransaction && oldTransaction.status !== "closed" && data.status === "closed" && transaction.requestClientReview !== false) {
        const clientIds = [transaction.clientId, transaction.secondaryClientId].filter(Boolean) as number[];
        const agentName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'your agent';
        const address = [transaction.streetName, transaction.city].filter(Boolean).join(', ') || 'your property';
        const baseUrl = getAppBaseUrl(req);
        const signupUrl = `${baseUrl}/auth`;

        for (const cId of clientIds) {
          try {
            const existing = await storage.getFeedbackRequestByTransaction(transaction.id, cId);
            if (existing) continue;
            const client = await storage.getClient(cId);
            if (!client) continue;

            const token = randomUUID();
            await storage.createFeedbackRequest({
              transactionId: transaction.id,
              agentId: req.user.id,
              clientId: cId,
              token,
            });

            const feedbackUrl = `${baseUrl}/feedback/${token}`;
            const clientName = client.firstName || 'there';
            const deliveredVia: string[] = [];

            if (client.phone) {
              try {
                const agentPhone = await storage.getAgentPhoneNumber(req.user.id);
                const smsMessage = `Congratulations on closing on ${address}! ${agentName} would love to hear about your experience. Please leave a review here: ${feedbackUrl}`;
                const smsResult = agentPhone
                  ? await sendSMSFromNumber(agentPhone.phoneNumber, client.phone, smsMessage)
                  : await sendSMS(client.phone, smsMessage);
                if (smsResult.success) deliveredVia.push('sms');
                else console.error("Failed to send feedback SMS:", smsResult.error);
              } catch (smsErr) {
                console.error("Failed to send feedback SMS:", smsErr);
              }
            }

            let emailSent = false;
            const clientUser = client.email ? await storage.getUserByEmail(client.email) : null;
            const isExistingMember = !!clientUser;

            if (client.email) {
              try {
                const gmailStatus = await getGmailStatus(req.user.id);
                if (gmailStatus.connected) {
                  const subject = `How was your experience? — ${address}`;
                  const emailBody = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
                    <h2 style="color:#333;">Congratulations on your closing!</h2>
                    <p>Hi ${clientName},</p>
                    <p>${agentName} would love to hear about your experience with the transaction at <strong>${address}</strong>.</p>
                    <p style="margin:24px 0;"><a href="${feedbackUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Leave a Review</a></p>
                    <p style="color:#666;font-size:13px;">Or copy this link: ${feedbackUrl}</p>
                    ${!isExistingMember ? `<div style="margin:24px 0;padding:16px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
                      <p style="color:#166534;font-weight:600;margin:0 0 4px;">New to HomeBase?</p>
                      <p style="color:#15803d;font-size:13px;margin:0 0 8px;">Create a free account to track your home details, access closing documents, and find trusted contractors.</p>
                      <a href="${signupUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">Create Your Free Account</a>
                    </div>` : ''}
                  </div>`;
                  const emailResult = await sendGmailEmail(req.user.id, client.email, subject, emailBody);
                  if (emailResult.success) { deliveredVia.push('email-gmail'); emailSent = true; }
                }
              } catch (emailErr) {
                console.error("Failed to send feedback email via Gmail:", emailErr);
              }
            }

            if (client.email && !emailSent) {
              try {
                const { sendReviewRequestEmail } = await import("./email-service");
                const sgResult = await sendReviewRequestEmail(
                  client.email, clientName, agentName, address,
                  feedbackUrl, signupUrl, isExistingMember
                );
                if (sgResult.success) deliveredVia.push('email-sendgrid');
              } catch (sgErr) {
                console.error("Failed to send feedback email via SendGrid:", sgErr);
              }
            }

            if (clientUser) {
              try {
                await storage.createPrivateMessage({
                  senderId: req.user.id,
                  recipientId: clientUser.id,
                  content: `Congratulations on closing on ${address}! I'd love to hear about your experience. Please leave a review here: ${feedbackUrl}`,
                });
                deliveredVia.push('message');
              } catch (msgErr) {
                console.error("Failed to send feedback private message:", msgErr);
              }
              try {
                await notify(clientUser.id, 'review_request', 'Review Request',
                  `${agentName} would love your feedback on ${address}`, transaction.id, 'feedback');
                deliveredVia.push('notification');
              } catch (notifyErr) {
                console.error("Failed to send review notification:", notifyErr);
              }
            }

            console.log(`[Feedback] Created feedback request for transaction ${transaction.id}, client ${client.firstName} ${client.lastName}, delivered via: ${deliveredVia.join(', ') || 'none (no contact info)'}`);
          } catch (feedbackErr) {
            console.error(`Error creating feedback request for client ${cId}:`, feedbackErr);
          }
        }

        if (transaction.contractPrice) {
          try {
            const existingComm = await storage.getCommissionEntryByTransaction(transaction.id, req.user.id);
            if (!existingComm) {
              await storage.createCommissionEntry({
                transactionId: transaction.id,
                agentId: req.user.id,
                commissionRate: 3,
                commissionAmount: Math.round(transaction.contractPrice * 0.03),
                status: 'pending',
              });
              console.log(`[Commission] Auto-created commission entry for transaction ${transaction.id}`);
            }
          } catch (commErr) {
            console.error("Error auto-creating commission entry:", commErr);
          }
        }

        if (transaction.clientId && transaction.closingDate) {
          try {
            const client = await storage.getClient(transaction.clientId);
            if (client) {
              const closingDate = new Date(transaction.closingDate);
              const nextAnniversary = new Date(closingDate);
              nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
              const address = [transaction.streetName, transaction.city].filter(Boolean).join(', ');
              await storage.createClientReminder({
                agentId: req.user.id,
                clientId: transaction.clientId,
                type: 'closing_anniversary',
                title: `Closing Anniversary — ${address}`,
                message: `Happy home anniversary! It's been a year since you closed on ${address}. Hope you're enjoying your home!`,
                reminderDate: nextAnniversary.toISOString(),
                recurring: true,
                channels: ['sms', 'email', 'message'],
              });
              console.log(`[Reminder] Auto-created closing anniversary reminder for client ${client.firstName} ${client.lastName}`);
            }
          } catch (reminderErr) {
            console.error("Error auto-creating anniversary reminder:", reminderErr);
          }
        }
      }

      res.json(transaction);
    } catch (error) {
      console.error('Error updating transaction:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Error updating transaction' });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }

    try {
      console.log('Creating transaction with body:', req.body);
      const parsed = insertTransactionSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error('Validation error:', parsed.error);
        return res.status(400).json(parsed.error);
      }

      if (parsed.data.type === 'sell' && (!parsed.data.streetName || !parsed.data.streetName.trim())) {
        return res.status(400).json({ error: "Street name is required for seller transactions" });
      }

      const defaultStatus = parsed.data.type === 'buy' ? 'qualified_buyer' : 'prospect';
      const transaction = await storage.createTransaction({
        ...parsed.data,
        agentId: req.user.id,
        status: parsed.data.status || defaultStatus,
        participants: []
      });

      if (transaction && (req.body.clientId || req.body.secondaryClientId)) {
        const clientIds = [
          { id: req.body.clientId, role: parsed.data.type === 'buy' ? 'Buyer' : 'Seller' },
          { id: req.body.secondaryClientId, role: 'Secondary Client' },
        ].filter(c => c.id);

        for (const { id, role } of clientIds) {
          try {
            const client = await storage.getClient(Number(id));
            if (client && client.agentId === req.user.id) {
              await storage.createContact({
                role,
                firstName: client.firstName,
                lastName: client.lastName,
                email: client.email || '',
                phone: client.phone || null,
                mobilePhone: client.mobilePhone || null,
                transactionId: transaction.id,
                clientId: client.id,
              });
            }
          } catch (e) {
            console.error(`Error auto-creating contact for client ${id}:`, e);
          }
        }
      }

      console.log('Created transaction:', transaction);
      fireWebhook("transaction_created", transaction);
      res.status(201).json(transaction);
    } catch (error) {
      console.error('Error creating transaction:', error);
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  // Checklists
  app.get("/api/checklists/:transactionId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const transactionId = parseInt(req.params.transactionId, 10);

    try {
      const { allowed, transaction } = await verifyTransactionAccess(transactionId, req.user.id, req.user.role);
      if (!allowed || !transaction) {
        return res.status(403).json({ error: "Not authorized to access this transaction" });
      }

      const checklist = await storage.getChecklist(transactionId, transaction.type);

      // If no checklist exists yet, create default items based on transaction type
      if (!checklist) {
        const defaultItems = transaction.type === 'sell' ?
          SELLER_CHECKLIST_ITEMS.map(item => ({ ...item, completed: false })) :
          BUYER_CHECKLIST_ITEMS.map(item => ({ ...item, completed: false }));

        return res.json({
          transactionId,
          items: defaultItems
        });
      }

      res.json(checklist);
    } catch (error) {
      console.error('Error fetching checklist:', error);
      res.status(500).json({ error: 'Failed to fetch checklist' });
    }
  });


  app.post("/api/checklists", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const parsed = insertChecklistSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error('Validation error:', parsed.error);
        return res.status(400).json(parsed.error);
      }

      const checklist = await storage.createChecklist(parsed.data);
      res.status(201).json(checklist);
    } catch (error) {
      console.error('Error creating checklist:', error);
      res.status(500).send('Error creating checklist');
    }
  });

  app.patch("/api/checklists/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const transactionId = Number(req.params.id);
      const { allowed, transaction, permissionLevel } = await verifyTransactionAccess(transactionId, req.user.id, req.user.role);
      if (!allowed || !transaction || permissionLevel !== "full") {
        return res.status(403).json({ error: "Not authorized to modify this checklist" });
      }
      if (isTransactionLockedByOther(transactionId, req.user.id)) {
        return res.status(423).json({ error: "Transaction is currently being edited by another user" });
      }

      let checklist = await storage.getChecklist(transactionId, transaction.type);
      if (!checklist) {
        const defaultItems = transaction.type === 'sell' ?
          SELLER_CHECKLIST_ITEMS.map(item => ({ ...item, completed: false })) :
          BUYER_CHECKLIST_ITEMS.map(item => ({ ...item, completed: false }));

        try {
          checklist = await storage.createChecklist({
            transactionId,
            role: transaction.type,
            items: defaultItems
          });
        } catch (createError) {
          // If creation fails due to duplicate, try fetching again
          checklist = await storage.getChecklist(transactionId, transaction.type);
          if (!checklist) {
            throw createError;
          }
        }
      }

      const updatedChecklist = await storage.updateChecklist(checklist.id, req.body.items);
      res.json(updatedChecklist);
    } catch (error) {
      console.error('Error updating checklist:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Error updating checklist' });
    }
  });

  // Messages
  app.get("/api/messages/recipients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transactions = await storage.getTransactionsByUser(req.user.id);
      const transactionIds = transactions.map(t => t.id);

      if (transactionIds.length === 0) {
        return res.json([]);
      }

      const result = await db.execute(sql`
        SELECT DISTINCT ON (email) id, first_name, last_name, role, email, phone
        FROM contacts
        WHERE transaction_id = ANY(${transactionIds})
        ORDER BY email, id
      `);

      const uniqueContacts = result.rows.map(c => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
        role: c.role,
        email: c.email
      }));

      res.json(uniqueContacts);
    } catch (error) {
      console.error('Error fetching recipients:', error);
      res.status(500).send('Error fetching recipients');
    }
  });

  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transactionId = req.query.transactionId ? Number(req.query.transactionId) : undefined;
      if (transactionId) {
        const { allowed } = await verifyTransactionAccess(transactionId, req.user.id, req.user.role);
        if (!allowed) return res.status(403).json({ error: "Not authorized" });
      }
      const messages = await storage.getMessages(transactionId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).send('Error fetching messages');
    }
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Ensure transactionId is present and valid
      if (!req.body.transactionId) {
        return res.status(400).send("Transaction ID is required");
      }

      const messageData = {
        content: req.body.content,
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        timestamp: new Date().toISOString(),
        transactionId: Number(req.body.transactionId)
      };

      // Validate the incoming data
      const parsed = insertMessageSchema.safeParse(messageData);
      if (!parsed.success) {
        console.error('Message validation error:', parsed.error);
        return res.status(400).send(parsed.error.message);
      }

      const message = await storage.createMessage(parsed.data);
      res.status(201).json(message);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).send('Error creating message');
    }
  });

  app.get("/api/private-messages/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const conversations = await storage.getPrivateConversations(req.user.id);
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  app.get("/api/private-messages/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const result = await db.execute(sql`
        SELECT id, first_name, last_name, role, email FROM users WHERE id != ${req.user.id} ORDER BY first_name, last_name
      `);
      res.json(result.rows.map((r: any) => ({
        id: r.id,
        name: `${r.first_name} ${r.last_name}`,
        role: r.role,
        email: r.email,
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.get("/api/private-messages/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const otherUserId = Number(req.params.userId);
      if (isNaN(otherUserId)) return res.status(400).json({ error: 'Invalid user ID' });
      const messages = await storage.getPrivateMessages(req.user.id, otherUserId);

      await db.execute(sql`
        UPDATE private_messages SET read = true
        WHERE sender_id = ${otherUserId} AND recipient_id = ${req.user.id} AND read = false
      `);

      res.json(messages);
    } catch (error) {
      console.error('Error fetching private messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post("/api/private-messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const schema = z.object({
        recipientId: z.number(),
        content: z.string().min(1),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error);

      if (parsed.data.recipientId === req.user.id) {
        return res.status(400).json({ error: 'Cannot message yourself' });
      }

      const recipient = await storage.getUser(parsed.data.recipientId);
      if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

      const message = await storage.createPrivateMessage({
        senderId: req.user.id,
        recipientId: parsed.data.recipientId,
        content: parsed.data.content,
      });

      const senderName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;
      notify(
        parsed.data.recipientId,
        'message_new',
        'New Message',
        `${senderName} sent you a message`,
        req.user.id,
        'message'
      ).catch(() => {});

      res.status(201).json(message);
    } catch (error) {
      console.error('Error creating private message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  app.get("/api/dashboard", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const data = await storage.getDashboardData(req.user.id, req.user.role);
      res.json(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ error: 'Failed to load dashboard data' });
    }
  });

  app.get("/api/dashboard/preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const prefs = await storage.getDashboardPreferences(req.user.id);
      res.json(prefs || { widgets: [] });
    } catch (error) {
      res.json({ widgets: [] });
    }
  });

  app.patch("/api/dashboard/preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { widgets } = req.body;
    if (!Array.isArray(widgets) || !widgets.every((w: any) => typeof w === "string")) {
      return res.status(400).json({ error: "widgets must be an array of strings" });
    }
    try {
      const result = await storage.updateDashboardPreferences(req.user.id, { widgets });
      res.json(result);
    } catch (error) {
      console.error('Error saving dashboard preferences:', error);
      res.status(500).json({ error: 'Failed to save preferences' });
    }
  });

  app.post("/api/tutorial/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      await storage.updateUser(req.user.id, { tutorialCompleted: true });
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking tutorial complete:', error);
      res.status(500).json({ error: 'Failed to update tutorial status' });
    }
  });

  app.get("/api/communications/metrics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!["agent", "broker", "vendor", "lender"].includes(req.user.role)) return res.sendStatus(403);
    try {
      const parsedContactId = req.query.contactId ? parseInt(req.query.contactId as string) : undefined;
      const contactId = parsedContactId && Number.isFinite(parsedContactId) ? parsedContactId : undefined;
      const metrics = await storage.getCommunicationMetrics(req.user.id, contactId);

      if (!contactId) {
        try {
          const clients = await storage.getClientsByAgent(req.user.id);
          const clientEmails = clients
            .map((c: any) => c.email)
            .filter((e: string | null | undefined): e is string => !!e && e.includes("@"));
          if (clientEmails.length > 0) {
            const gmailCounts = await countGmailEmailsForClients(req.user.id, clientEmails);
            if (!gmailCounts.error) {
              metrics.email = {
                today: gmailCounts.today,
                thisWeek: gmailCounts.thisWeek,
                thisMonth: gmailCounts.thisMonth,
                total: gmailCounts.total,
              };
              metrics.emailSource = "gmail";
            }
          }
        } catch (gmailErr) {
          console.error("Gmail email count failed (non-blocking):", gmailErr);
        }
      }

      res.json(metrics);
    } catch (error) {
      console.error('Error fetching communication metrics:', error);
      res.json({
        sms: { today: 0, thisWeek: 0, thisMonth: 0, total: 0, uniqueContacts: 0 },
        email: { today: 0, thisWeek: 0, thisMonth: 0, total: 0 },
        privateMessages: { today: 0, thisWeek: 0, thisMonth: 0, total: 0, uniqueRecipients: 0 },
      });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const txId = Number(req.body.transactionId);
      if (txId) {
        const { allowed, permissionLevel } = await verifyTransactionAccess(txId, req.user.id, req.user.role);
        if (!allowed || permissionLevel !== "full") return res.status(403).json({ error: "Not authorized" });
        if (isTransactionLockedByOther(txId, req.user.id)) {
          return res.status(423).json({ error: "Transaction is currently being edited by another user" });
        }
      }
      const allowedContactFields = ['firstName', 'lastName', 'role', 'email', 'phone', 'mobilePhone', 'company', 'notes', 'transactionId', 'clientId'];
      const contactData: Record<string, any> = {};
      for (const key of allowedContactFields) {
        if (req.body[key] !== undefined) {
          contactData[key] = (key === 'transactionId' || key === 'clientId') ? Number(req.body[key]) : req.body[key];
        }
      }

      const contact = await storage.createContact(contactData);
      if (!contact) {
        return res.status(500).json({ error: 'Failed to create contact' });
      }
      res.json(contact);
    } catch (error) {
      console.error('Error creating contact:', error);
      res.status(500).json({ error: 'Failed to create contact' });
    }
  });

  app.get("/api/contacts/:transactionId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const txId = Number(req.params.transactionId);
      const { allowed } = await verifyTransactionAccess(txId, req.user.id, req.user.role);
      if (!allowed) return res.status(403).json({ error: "Not authorized" });
      const contacts = await storage.getContactsByTransaction(txId);
      res.json(contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  app.patch("/api/contacts/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) {
      return res.sendStatus(401);
    }
    try {
      const contactId = Number(req.params.id);
      const existingContacts = await db.execute(sql`SELECT transaction_id FROM contacts WHERE id = ${contactId} LIMIT 1`);
      if (existingContacts.rows.length === 0) return res.status(404).json({ error: "Contact not found" });
      const txId = existingContacts.rows[0].transaction_id as number;
      if (txId) {
        const { allowed, permissionLevel } = await verifyTransactionAccess(txId, req.user.id, req.user.role);
        if (!allowed || permissionLevel !== "full") return res.status(403).json({ error: "Not authorized" });
        if (isTransactionLockedByOther(txId, req.user.id)) {
          return res.status(423).json({ error: "Transaction is currently being edited by another user" });
        }
      }
      const allowedContactFields = ['firstName', 'lastName', 'role', 'email', 'phone', 'mobilePhone', 'company', 'notes', 'clientId'];
      const safeContactBody: Record<string, any> = {};
      for (const key of allowedContactFields) {
        if (req.body[key] !== undefined) {
          safeContactBody[key] = key === 'clientId' ? Number(req.body[key]) : req.body[key];
        }
      }
      const contact = await storage.updateContact(contactId, safeContactBody);
      res.json(contact);
    } catch (error) {
      console.error('Error updating contact:', error);
      res.status(500).json({ error: 'Failed to update contact' });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) {
      return res.sendStatus(401);
    }
    try {
      const contactId = Number(req.params.id);
      const existingContacts = await db.execute(sql`SELECT transaction_id FROM contacts WHERE id = ${contactId} LIMIT 1`);
      if (existingContacts.rows.length === 0) return res.status(404).json({ error: "Contact not found" });
      const txId = existingContacts.rows[0].transaction_id as number;
      if (txId) {
        const { allowed, permissionLevel } = await verifyTransactionAccess(txId, req.user.id, req.user.role);
        if (!allowed || permissionLevel !== "full") return res.status(403).json({ error: "Not authorized" });
        if (isTransactionLockedByOther(txId, req.user.id)) {
          return res.status(423).json({ error: "Transaction is currently being edited by another user" });
        }
      }
      await storage.deleteContact(contactId);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting contact:', error);
      res.status(500).json({ error: 'Failed to delete contact' });
    }
  });

  // Documents
  app.get("/api/documents/:transactionId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const txId = Number(req.params.transactionId);
      const { allowed } = await verifyTransactionAccess(txId, req.user.id, req.user.role);
      if (!allowed) return res.status(403).json({ error: "Not authorized" });
      const documents = await storage.getDocumentsByTransaction(txId);
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  app.post("/api/documents/:transactionId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const txId = Number(req.params.transactionId);
      const { allowed, permissionLevel } = await verifyTransactionAccess(txId, req.user.id, req.user.role);
      if (!allowed || permissionLevel !== "full") return res.status(403).json({ error: "Not authorized" });
      if (isTransactionLockedByOther(txId, req.user.id)) {
        return res.status(423).json({ error: "Transaction is currently being edited by another user" });
      }
      const document = await storage.createDocument({
        ...req.body,
        transactionId: txId
      });
      res.status(201).json(document);
    } catch (error) {
      console.error('Error creating document:', error);
      res.status(500).json({ error: 'Failed to create document' });
    }
  });

  app.patch("/api/documents/:transactionId/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transactionId = Number(req.params.transactionId);
      const { allowed: docAllowed, permissionLevel: docPermLevel } = await verifyTransactionAccess(transactionId, req.user.id, req.user.role);
      if (!docAllowed || docPermLevel !== "full") {
        return res.status(403).json({ error: 'Not authorized to modify documents for this transaction' });
      }
      if (isTransactionLockedByOther(transactionId, req.user.id)) {
        return res.status(423).json({ error: "Transaction is currently being edited by another user" });
      }
      const existing = await storage.getDocument(req.params.id);
      if (!existing || existing.transactionId !== transactionId) {
        return res.status(404).json({ error: 'Document not found in this transaction' });
      }
      const document = await storage.updateDocument(req.params.id, req.body);
      res.json(document);
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  });

  app.delete("/api/documents/:transactionId/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transactionId = Number(req.params.transactionId);
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
      if (transaction.agentId !== req.user.id && req.user.role !== "broker") {
        return res.status(403).json({ error: 'Not authorized to delete documents for this transaction' });
      }
      if (isTransactionLockedByOther(transactionId, req.user.id)) {
        return res.status(423).json({ error: "Transaction is currently being edited by another user" });
      }
      const existing = await storage.getDocument(req.params.id);
      if (!existing || existing.transactionId !== transactionId) {
        return res.status(404).json({ error: 'Document not found in this transaction' });
      }
      await storage.deleteDocument(req.params.id);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  app.post("/api/documents/:transactionId/initialize", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const transactionId = Number(req.params.transactionId);
      const { allowed, permissionLevel } = await verifyTransactionAccess(transactionId, req.user.id, req.user.role);
      if (!allowed || permissionLevel !== "full") return res.status(403).json({ error: "Not authorized" });
      if (isTransactionLockedByOther(transactionId, req.user.id)) {
        return res.status(423).json({ error: "Transaction is currently being edited by another user" });
      }
      const { documents } = req.body;

      if (!Array.isArray(documents)) {
        return res.status(400).json({ error: 'Documents must be an array' });
      }

      // Initialize all documents in series to maintain order
      const createdDocs = [];
      for (const doc of documents) {
        const newDoc = await storage.createDocument({
          name: doc.name,
          status: doc.status,
          transactionId
        });
        createdDocs.push(newDoc);
      }

      res.status(201).json(createdDocs);
    } catch (error) {
      console.error('Error initializing documents:', error);
      res.status(500).json({ error: 'Failed to initialize documents' });
    }
  });

  // Calendar Integration
  app.post("/api/calendar/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { documentId, date, time, title } = req.body;

      // Create a combined date-time string
      const combinedDateTime = new Date(`${date}T${time}`);

      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      if (document.transactionId) {
        const { allowed, permissionLevel } = await verifyTransactionAccess(document.transactionId, req.user.id, req.user.role);
        if (!allowed || permissionLevel !== "full") return res.status(403).json({ error: "Not authorized" });
      }

      await storage.updateDocument(documentId, {
        deadline: date,
        deadlineTime: time
      });

      // The calendar will be automatically updated on next sync since we're using the same data
      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Error creating calendar event:', error);
      res.status(500).json({ error: 'Failed to create calendar event' });
    }
  });

  app.get("/api/calendar/:userId/:type", async (req, res) => {
    const userId = Number(req.params.userId);
    const isSubscription = req.params.type === 'subscribe';

    if (isSubscription) {
      const user = await storage.getUser(userId);
      if (!user) return res.sendStatus(404);
    } else {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (userId !== req.user!.id) return res.sendStatus(403);
    }

    try {
      const [transactions, documents] = await Promise.all([
        storage.getTransactionsByUser(userId),
        storage.getAllDocumentsByUser(userId)
      ]);

      const calendar = ical({ 
        name: "Real Estate Calendar",
        timezone: 'America/Chicago'
      });

      // Add transaction events
      transactions.forEach(transaction => {
        const address = [transaction.streetName, transaction.city, transaction.state, transaction.zipCode].filter(Boolean).join(', ') || 'TBD';

        if (transaction.closingDate) {
          calendar.createEvent({
            start: new Date(transaction.closingDate),
            end: new Date(transaction.closingDate),
            summary: `Closing - ${address}`,
            description: `Closing for property at ${address}`,
            location: address
          });
        }

        if (transaction.optionPeriodExpiration) {
          calendar.createEvent({
            start: new Date(transaction.optionPeriodExpiration),
            end: new Date(transaction.optionPeriodExpiration),
            summary: `Option Expiration - ${address}`,
            description: `Option period expiration for property at ${address}`,
            location: address
          });
        }
      });

      // Add document deadlines
      documents.forEach(doc => {
        if (doc.deadline && doc.deadlineTime) {
          const deadlineDate = new Date(`${doc.deadline}T${doc.deadlineTime}`);
          calendar.createEvent({
            start: deadlineDate,
            end: deadlineDate,
            summary: `Document Due: ${doc.name}`,
            description: `Deadline for document: ${doc.name}`,
          });
        }
      });

      // Set headers based on request type
      if (isSubscription) {
        res.set({
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'inline; filename=calendar.ics',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Refresh': '3600'
        });
      } else {
        res.set({
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'attachment; filename=calendar.ics'
        });
      }

      res.send(calendar.toString());
    } catch (error) {
      console.error('Error generating calendar feed:', error);
      res.status(500).json({ error: 'Failed to generate calendar feed' });
    }
  });

  // Contractors
  app.get("/api/contractors", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const contractors = await storage.getAllContractors();
      const contractorsWithRatings = await Promise.all(
        contractors.map(async (contractor) => {
          const reviews = await storage.getContractorReviews(contractor.id);
          const vendorRatings = await storage.getVendorRatings(contractor.id);
          const allRatings = [
            ...reviews.map(r => r.rating),
            ...vendorRatings.map(r => r.overallRating),
          ];
          let averageRating: number | null = null;
          if (allRatings.length > 0) {
            const total = allRatings.reduce((sum, r) => sum + r, 0);
            averageRating = Math.round((total / allRatings.length) * 10) / 10;
          }
          return { ...contractor, averageRating, reviewCount: allRatings.length };
        })
      );
      res.json(contractorsWithRatings);
    } catch (error) {
      console.error('Error fetching contractors:', error);
      res.status(500).json({ error: 'Failed to fetch contractors' });
    }
  });

  app.get("/api/contractors/my", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const contractors = await storage.getContractors(req.user.id);
      res.json(contractors);
    } catch (error) {
      console.error('Error fetching my contractors:', error);
      res.status(500).json({ error: 'Failed to fetch contractors' });
    }
  });

  app.get("/api/contractors/proximity", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { zip, radius = "20" } = req.query;
    if (!zip || typeof zip !== "string") {
      return res.status(400).json({ error: "Zip code is required" });
    }
    
    const radiusMiles = parseFloat(radius as string) || 20;
    
    try {
      const nominatimResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=USA&format=json&limit=1`,
        { headers: { "User-Agent": "HomeBase-RealEstate-App" } }
      );
      
      if (!nominatimResponse.ok) {
        return res.status(500).json({ error: "Geocoding service unavailable" });
      }
      
      const geocodeResults = await nominatimResponse.json();
      if (!geocodeResults.length) {
        return res.status(404).json({ error: "Zip code not found" });
      }
      
      const searchLat = parseFloat(geocodeResults[0].lat);
      const searchLon = parseFloat(geocodeResults[0].lon);
      
      const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 3959;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };
      
      const allContractors = await storage.getAllContractors();
      const contractors = allContractors.filter(c => c.vendorUserId !== null);
      
      const contractorsWithDistance = await Promise.all(
        contractors.map(async (contractor) => {
          let lat = contractor.latitude;
          let lon = contractor.longitude;
          
          if (!lat || !lon) {
            const addressParts = [contractor.address, contractor.city, contractor.state, contractor.zipCode].filter(Boolean);
            if (addressParts.length > 0) {
              try {
                const geoResponse = await fetch(
                  `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressParts.join(", "))}&format=json&limit=1`,
                  { headers: { "User-Agent": "HomeBase-RealEstate-App" } }
                );
                if (geoResponse.ok) {
                  const geoData = await geoResponse.json();
                  if (geoData.length > 0) {
                    lat = parseFloat(geoData[0].lat);
                    lon = parseFloat(geoData[0].lon);
                    storage.updateContractor(contractor.id, { latitude: lat, longitude: lon });
                  }
                }
              } catch (e) {
                console.error("Geocoding error for contractor:", contractor.id, e);
              }
            }
          }
          
          const reviews = await storage.getContractorReviews(contractor.id);
          let averageRating: number | null = null;
          if (reviews.length > 0) {
            const total = reviews.reduce((sum, r) => sum + r.rating, 0);
            averageRating = Math.round((total / reviews.length) * 10) / 10;
          }
          
          let distance: number | null = null;
          if (lat && lon) {
            distance = Math.round(haversineDistance(searchLat, searchLon, lat, lon) * 10) / 10;
          }
          
          return { ...contractor, averageRating, reviewCount: reviews.length, distance };
        })
      );
      
      const filteredContractors = contractorsWithDistance
        .filter(c => c.distance !== null && c.distance <= radiusMiles)
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
      
      res.json({
        searchLocation: { lat: searchLat, lon: searchLon, zip },
        radius: radiusMiles,
        contractors: filteredContractors
      });
    } catch (error) {
      console.error("Error in proximity search:", error);
      res.status(500).json({ error: "Failed to perform proximity search" });
    }
  });

  app.get("/api/contractors/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const contractor = await storage.getContractor(Number(req.params.id));
      if (!contractor) {
        return res.status(404).json({ error: 'Contractor not found' });
      }
      if (contractor.createdByUserId && contractor.createdByUserId !== req.user.id) {
        return res.status(404).json({ error: 'Contractor not found' });
      }
      res.json(contractor);
    } catch (error) {
      console.error('Error fetching contractor:', error);
      res.status(500).json({ error: 'Failed to fetch contractor' });
    }
  });

  app.post("/api/contractors", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const isAgentOrBroker = req.user.role === "agent" || req.user.role === "broker";
      const safeBody = isAgentOrBroker
        ? { ...req.body, agentId: req.user.id }
        : {
            name: req.body.name,
            category: req.body.category,
            phone: req.body.phone || null,
            email: req.body.email || null,
            website: req.body.website || null,
            address: req.body.address || null,
            city: req.body.city || null,
            state: req.body.state || null,
            zipCode: req.body.zipCode || null,
            description: req.body.description || null,
            googleMapsUrl: req.body.googleMapsUrl || null,
            yelpUrl: req.body.yelpUrl || null,
            bbbUrl: req.body.bbbUrl || null,
            agentId: null,
            vendorUserId: null,
            agentRating: null,
            agentNotes: null,
            latitude: null,
            longitude: null,
            createdByUserId: req.user.id,
          };
      const parsed = insertContractorSchema.safeParse(safeBody);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }
      const contractor = await storage.createContractor(parsed.data);
      res.status(201).json(contractor);
    } catch (error) {
      console.error('Error creating contractor:', error);
      res.status(500).json({ error: 'Failed to create contractor' });
    }
  });

  app.patch("/api/contractors/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const contractor = await storage.getContractor(Number(req.params.id));
      if (!contractor) {
        return res.status(404).json({ error: 'Contractor not found' });
      }
      const isPrivateOwner = contractor.createdByUserId && contractor.createdByUserId === req.user.id;
      const isAgentOwner = (req.user.role === "agent" || req.user.role === "broker") && contractor.agentId === req.user.id;
      if (!isPrivateOwner && !isAgentOwner) {
        return res.status(403).json({ error: 'Not authorized to edit this contractor.' });
      }
      
      const allowedFields = isPrivateOwner
        ? ['name', 'category', 'phone', 'email', 'website', 'address', 'city', 'state', 'zipCode', 'description', 'googleMapsUrl', 'yelpUrl', 'bbbUrl']
        : ['name', 'category', 'phone', 'email', 'website', 'address', 'city', 'state', 'zipCode', 'description', 'googleMapsUrl', 'yelpUrl', 'bbbUrl', 'agentRating', 'agentNotes'];
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sanitizedData[field] = req.body[field];
        }
      }
      
      const updated = await storage.updateContractor(Number(req.params.id), sanitizedData);
      res.json(updated);
    } catch (error) {
      console.error('Error updating contractor:', error);
      res.status(500).json({ error: 'Failed to update contractor' });
    }
  });

  app.delete("/api/contractors/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const contractor = await storage.getContractor(Number(req.params.id));
      if (!contractor) {
        return res.status(404).json({ error: 'Contractor not found' });
      }
      const isPrivateOwner = contractor.createdByUserId && contractor.createdByUserId === req.user.id;
      const isAgentOwner = (req.user.role === "agent" || req.user.role === "broker") && contractor.agentId === req.user.id;
      if (!isPrivateOwner && !isAgentOwner) {
        return res.status(403).json({ error: 'Not authorized to delete this contractor' });
      }
      await storage.deleteContractor(Number(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting contractor:', error);
      res.status(500).json({ error: 'Failed to delete contractor' });
    }
  });

  // Contractor Reviews
  app.get("/api/contractors/:id/reviews", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const reviews = await storage.getContractorReviews(Number(req.params.id));
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching contractor reviews:', error);
      res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  });

  app.post("/api/contractors/:id/reviews", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const contractorId = Number(req.params.id);
      const contractor = await storage.getContractor(contractorId);
      if (!contractor) {
        return res.status(404).json({ error: 'Contractor not found' });
      }
      
      const reviewData = {
        contractorId,
        reviewerName: req.body.reviewerName,
        rating: Math.min(5, Math.max(1, Number(req.body.rating) || 5)),
        comment: req.body.comment || null
      };
      
      const parsed = insertContractorReviewSchema.safeParse(reviewData);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }
      const review = await storage.createContractorReview(parsed.data);
      res.status(201).json(review);
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({ error: 'Failed to create review' });
    }
  });

  app.delete("/api/contractors/:contractorId/reviews/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }

    try {
      await storage.deleteContractorReview(Number(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting review:', error);
      res.status(500).json({ error: 'Failed to delete review' });
    }
  });

  // Contractor Recommendations API
  app.get("/api/contractors/:id/recommendations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const contractorId = Number(req.params.id);
      const recommendations = await storage.getContractorRecommendations(contractorId);
      const count = await storage.getContractorRecommendationCount(contractorId);
      const hasRecommended = req.user.role === "agent" 
        ? await storage.hasAgentRecommended(contractorId, req.user.id)
        : false;
      res.json({ recommendations, count, hasRecommended });
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  });

  app.post("/api/contractors/:id/recommend", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }

    try {
      const contractorId = Number(req.params.id);
      await storage.addContractorRecommendation(contractorId, req.user.id);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error adding recommendation:', error);
      res.status(500).json({ error: 'Failed to add recommendation' });
    }
  });

  app.delete("/api/contractors/:id/recommend", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }

    try {
      const contractorId = Number(req.params.id);
      await storage.removeContractorRecommendation(contractorId, req.user.id);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error removing recommendation:', error);
      res.status(500).json({ error: 'Failed to remove recommendation' });
    }
  });

  // Vendor Ratings
  app.post("/api/contractors/:id/ratings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }

    try {
      const contractorId = Number(req.params.id);
      if (isNaN(contractorId)) return res.status(400).json({ error: 'Invalid contractor ID' });

      const contractor = await storage.getContractor(contractorId);
      if (!contractor) return res.status(404).json({ error: 'Contractor not found' });

      const ratingFields = [req.body.overallRating, req.body.qualityRating, req.body.communicationRating, req.body.timelinessRating, req.body.valueRating];
      for (const val of ratingFields) {
        if (val !== undefined && val !== null && (val < 1 || val > 5)) {
          return res.status(400).json({ error: 'Rating values must be between 1 and 5' });
        }
      }
      if (!req.body.overallRating || req.body.overallRating < 1 || req.body.overallRating > 5) {
        return res.status(400).json({ error: 'Overall rating (1-5) is required' });
      }

      if (req.body.transactionId) {
        const transaction = await storage.getTransaction(Number(req.body.transactionId));
        if (!transaction || transaction.agentId !== req.user.id) {
          return res.status(403).json({ error: 'Transaction not found or does not belong to you' });
        }
      }

      const existingRatings = await storage.getVendorRatings(contractorId);
      const duplicate = existingRatings.find(r =>
        r.agentId === req.user.id &&
        r.contractorId === contractorId &&
        (req.body.transactionId ? r.transactionId === Number(req.body.transactionId) : !r.transactionId)
      );
      if (duplicate) {
        return res.status(409).json({ error: 'You have already rated this vendor for this transaction' });
      }

      const parsed = insertVendorRatingSchema.safeParse({
        ...req.body,
        contractorId,
        agentId: req.user.id,
      });
      if (!parsed.success) return res.status(400).json(parsed.error);

      const rating = await storage.createVendorRating(parsed.data);
      res.status(201).json(rating);
    } catch (error) {
      console.error('Error creating vendor rating:', error);
      res.status(500).json({ error: 'Failed to create vendor rating' });
    }
  });

  app.get("/api/contractors/:id/ratings", async (req, res) => {
    try {
      const contractorId = Number(req.params.id);
      if (isNaN(contractorId)) return res.status(400).json({ error: 'Invalid contractor ID' });

      const ratings = await storage.getVendorRatings(contractorId);
      const ratingsWithNames = await Promise.all(
        ratings.map(async (rating) => {
          const user = await storage.getUser(rating.agentId);
          return { ...rating, reviewerName: user ? `${user.firstName} ${user.lastName}`.trim() || user.username : "Anonymous" };
        })
      );
      res.json(ratingsWithNames);
    } catch (error) {
      console.error('Error fetching vendor ratings:', error);
      res.status(500).json({ error: 'Failed to fetch vendor ratings' });
    }
  });

  app.get("/api/contractors/:id/performance", async (req, res) => {
    try {
      const contractorId = Number(req.params.id);
      if (isNaN(contractorId)) return res.status(400).json({ error: 'Invalid contractor ID' });

      const stats = await storage.getVendorPerformanceStats(contractorId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching vendor performance:', error);
      res.status(500).json({ error: 'Failed to fetch vendor performance' });
    }
  });

  app.delete("/api/contractors/:id/ratings/:ratingId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const ratingId = Number(req.params.ratingId);
      if (isNaN(ratingId)) return res.status(400).json({ error: 'Invalid rating ID' });

      const contractorId = Number(req.params.id);
      const rating = await storage.getVendorRating(ratingId);
      if (!rating) return res.status(404).json({ error: 'Rating not found' });

      if (rating.contractorId !== contractorId) {
        return res.status(400).json({ error: 'Rating does not belong to this contractor' });
      }

      if (rating.agentId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to delete this rating' });
      }

      await storage.deleteVendorRating(ratingId);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting vendor rating:', error);
      res.status(500).json({ error: 'Failed to delete vendor rating' });
    }
  });

  app.get("/api/vendor/my-ratings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "vendor") {
      return res.sendStatus(401);
    }

    try {
      const contractor = await storage.getContractorByVendorUserId(req.user.id);
      if (!contractor) return res.status(404).json({ error: 'No vendor profile found' });

      const ratings = await storage.getVendorRatings(contractor.id);
      res.json(ratings);
    } catch (error) {
      console.error('Error fetching vendor ratings:', error);
      res.status(500).json({ error: 'Failed to fetch vendor ratings' });
    }
  });

  app.get("/api/vendor/my-performance", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "vendor") {
      return res.sendStatus(401);
    }

    try {
      const contractor = await storage.getContractorByVendorUserId(req.user.id);
      if (!contractor) return res.status(404).json({ error: 'No vendor profile found' });

      const stats = await storage.getVendorPerformanceStats(contractor.id);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching vendor performance:', error);
      res.status(500).json({ error: 'Failed to fetch vendor performance' });
    }
  });

  // Property Viewings API
  app.get("/api/viewings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      let viewings;
      if (req.user.role === "agent") {
        viewings = await storage.getViewingsByAgent(req.user.id);
      } else {
        const clientId = req.user.clientRecordId;
        if (!clientId) {
          return res.json([]);
        }
        viewings = await storage.getViewingsByClient(clientId);
      }
      res.json(viewings);
    } catch (error) {
      console.error('Error fetching viewings:', error);
      res.status(500).json({ error: 'Failed to fetch viewings' });
    }
  });

  app.get("/api/viewings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const viewing = await storage.getViewing(Number(req.params.id));
      if (!viewing) {
        return res.status(404).json({ error: 'Viewing not found' });
      }
      if (req.user.role === "agent" && viewing.agentId !== req.user.id) {
        return res.sendStatus(403);
      }
      if (req.user.role === "client" && viewing.clientId !== req.user.id) {
        return res.sendStatus(403);
      }
      res.json(viewing);
    } catch (error) {
      console.error('Error fetching viewing:', error);
      res.status(500).json({ error: 'Failed to fetch viewing' });
    }
  });

  app.post("/api/viewings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }

    try {
      const viewingData = {
        ...req.body,
        agentId: req.user.id
      };
      
      const parsed = insertPropertyViewingSchema.safeParse(viewingData);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }
      const viewing = await storage.createViewing(parsed.data);
      res.status(201).json(viewing);
    } catch (error) {
      console.error('Error creating viewing:', error);
      res.status(500).json({ error: 'Failed to create viewing' });
    }
  });

  app.patch("/api/viewings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    try {
      const viewing = await storage.getViewing(Number(req.params.id));
      if (!viewing) {
        return res.status(404).json({ error: 'Viewing not found' });
      }
      if (viewing.agentId !== req.user.id) {
        return res.sendStatus(403);
      }
      
      const allowedFields = ['address', 'city', 'state', 'zipCode', 'latitude', 'longitude', 'status', 'scheduledDate', 'notes'];
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sanitizedData[field] = req.body[field];
        }
      }
      
      const updated = await storage.updateViewing(Number(req.params.id), sanitizedData);
      res.json(updated);
    } catch (error) {
      console.error('Error updating viewing:', error);
      res.status(500).json({ error: 'Failed to update viewing' });
    }
  });

  app.delete("/api/viewings/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }

    try {
      const viewing = await storage.getViewing(Number(req.params.id));
      if (!viewing || viewing.agentId !== req.user.id) {
        return res.sendStatus(403);
      }
      await storage.deleteViewing(Number(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting viewing:', error);
      res.status(500).json({ error: 'Failed to delete viewing' });
    }
  });

  // Property Feedback API
  // Helper to check if user is authorized for a viewing
  const isAuthorizedForViewing = (user: Express.User, viewing: { agentId: number; clientId: number }): boolean => {
    if (user.role === "agent" && viewing.agentId === user.id) return true;
    if (user.role === "client" && user.clientRecordId && viewing.clientId === user.clientRecordId) return true;
    return false;
  };

  app.get("/api/viewings/:id/feedback", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const viewing = await storage.getViewing(Number(req.params.id));
      if (!viewing) {
        return res.status(404).json({ error: 'Viewing not found' });
      }
      
      if (!isAuthorizedForViewing(req.user, viewing)) {
        return res.sendStatus(403);
      }
      
      const feedback = await storage.getFeedbackByViewing(Number(req.params.id));
      res.json(feedback);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      res.status(500).json({ error: 'Failed to fetch feedback' });
    }
  });

  app.post("/api/viewings/:id/feedback", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const viewing = await storage.getViewing(Number(req.params.id));
      if (!viewing) {
        return res.status(404).json({ error: 'Viewing not found' });
      }
      
      if (!isAuthorizedForViewing(req.user, viewing)) {
        return res.sendStatus(403);
      }
      
      const feedbackData = {
        viewingId: Number(req.params.id),
        clientId: viewing.clientId,
        rating: Math.min(5, Math.max(1, Number(req.body.rating) || 3)),
        liked: req.body.liked || null,
        disliked: req.body.disliked || null,
        overallImpression: req.body.overallImpression || null,
        wouldPurchase: req.body.wouldPurchase ?? null
      };
      
      const parsed = insertPropertyFeedbackSchema.safeParse(feedbackData);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }
      const feedback = await storage.createFeedback(parsed.data);
      res.status(201).json(feedback);
    } catch (error) {
      console.error('Error creating feedback:', error);
      res.status(500).json({ error: 'Failed to create feedback' });
    }
  });

  app.patch("/api/feedback/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const feedback = await storage.getFeedback(Number(req.params.id));
      if (!feedback) {
        return res.status(404).json({ error: 'Feedback not found' });
      }
      
      const viewing = await storage.getViewing(feedback.viewingId);
      if (!viewing) {
        return res.status(404).json({ error: 'Viewing not found' });
      }
      
      if (!isAuthorizedForViewing(req.user, viewing)) {
        return res.sendStatus(403);
      }
      
      const allowedFields = ['rating', 'liked', 'disliked', 'overallImpression', 'wouldPurchase'];
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sanitizedData[field] = req.body[field];
        }
      }
      
      const updated = await storage.updateFeedback(Number(req.params.id), sanitizedData);
      res.json(updated);
    } catch (error) {
      console.error('Error updating feedback:', error);
      res.status(500).json({ error: 'Failed to update feedback' });
    }
  });

  // Map data endpoints
  app.get("/api/map/transactions", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }
    
    try {
      const transactions = await storage.getTransactionsWithCoordinates(req.user.id);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching map transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions for map' });
    }
  });

  async function geocodeAddress(address: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
    try {
      const censusUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
      const censusRes = await fetch(censusUrl);
      const censusData = await censusRes.json();
      const matches = censusData?.result?.addressMatches;
      if (matches && matches.length > 0) {
        const coords = matches[0].coordinates;
        const lat = coords.y;
        const lon = coords.x;
        if (lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66) {
          return { lat, lon, displayName: matches[0].matchedAddress || address };
        }
      }
    } catch (err) {
      console.error('Census geocoder error, falling back to Nominatim:', (err as any)?.message);
    }

    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us`,
        { headers: { 'User-Agent': 'HomeBase-RealEstate-App/1.0' } }
      );
      const nomData = await nomRes.json();
      if (nomData.length > 0) {
        const lat = parseFloat(nomData[0].lat);
        const lon = parseFloat(nomData[0].lon);
        if (lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66) {
          return { lat, lon, displayName: nomData[0].display_name };
        }
      }
    } catch (err) {
      console.error('Nominatim geocoder error:', (err as any)?.message);
    }

    return null;
  }

  app.post("/api/geocode", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    try {
      const result = await geocodeAddress(address);
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: 'Address not found' });
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      res.status(500).json({ error: 'Failed to geocode address' });
    }
  });

  app.post("/api/transactions/:id/geocode", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) {
      return res.sendStatus(401);
    }
    
    try {
      const { allowed, transaction } = await verifyTransactionAccess(Number(req.params.id), req.user.id, req.user.role);
      if (!allowed || !transaction) {
        return res.sendStatus(403);
      }
      
      const addressParts = [transaction.streetName, transaction.city, transaction.state, transaction.zipCode].filter(Boolean);
      if (addressParts.length === 0) {
        return res.status(400).json({ error: 'Property address required for geocoding' });
      }

      const queries = [
        addressParts.join(', '),
        [transaction.streetName, transaction.city, transaction.state].filter(Boolean).join(', '),
        [transaction.city, transaction.state, transaction.zipCode].filter(Boolean).join(', '),
      ].filter((q, i, arr) => q && arr.indexOf(q) === i);

      for (const query of queries) {
        const result = await geocodeAddress(query);
        if (result) {
          await storage.updateTransactionCoordinates(Number(req.params.id), result.lat, result.lon);
          return res.json({ success: true, lat: String(result.lat), lon: String(result.lon) });
        }
      }

      res.status(404).json({ error: 'Address not found' });
    } catch (error) {
      console.error('Error geocoding transaction:', error);
      res.status(500).json({ error: 'Failed to geocode transaction' });
    }
  });

  // Route planning endpoint using OSRM
  app.post("/api/route-plan", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }

    const { coordinates } = req.body;
    
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({ error: 'At least 2 coordinates are required' });
    }
    
    if (coordinates.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 stops allowed' });
    }

    try {
      // Format coordinates for OSRM: lon,lat;lon,lat;...
      const coordString = coordinates
        .map((c: { lat: number; lon: number }) => `${c.lon},${c.lat}`)
        .join(';');
      
      // Use OSRM trip service for optimized route (TSP solving)
      const response = await fetch(
        `https://router.project-osrm.org/trip/v1/driving/${coordString}?overview=full&geometries=geojson&steps=true&roundtrip=false&source=first&destination=last`,
        {
          headers: {
            'User-Agent': 'HomeBase-RealEstate-App/1.0'
          }
        }
      );
      
      if (!response.ok) {
        // Fallback to simple route if trip optimization fails
        const routeResponse = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`,
          {
            headers: {
              'User-Agent': 'HomeBase-RealEstate-App/1.0'
            }
          }
        );
        
        if (!routeResponse.ok) {
          return res.status(500).json({ error: 'Route planning service unavailable' });
        }
        
        const routeData = await routeResponse.json();
        if (routeData.code !== 'Ok' || !routeData.routes?.length) {
          return res.status(404).json({ error: 'No route found' });
        }
        
        const route = routeData.routes[0];
        return res.json({
          optimized: false,
          waypoints: coordinates.map((c: any, i: number) => ({ ...c, order: i })),
          geometry: route.geometry,
          totalDistance: route.distance, // in meters
          totalDuration: route.duration  // in seconds
        });
      }
      
      const data = await response.json();
      
      if (data.code !== 'Ok' || !data.trips?.length) {
        return res.status(404).json({ error: 'No route found' });
      }
      
      const trip = data.trips[0];
      
      // Map waypoints back to original coordinates with optimized order
      const orderedWaypoints = data.waypoints.map((wp: any) => ({
        ...coordinates[wp.waypoint_index],
        order: wp.trips_index !== undefined ? wp.trips_index : wp.waypoint_index,
        originalIndex: wp.waypoint_index
      })).sort((a: any, b: any) => a.order - b.order);
      
      res.json({
        optimized: true,
        waypoints: orderedWaypoints,
        geometry: trip.geometry,
        totalDistance: trip.distance, // in meters
        totalDuration: trip.duration  // in seconds
      });
    } catch (error) {
      console.error('Error planning route:', error);
      res.status(500).json({ error: 'Failed to plan route' });
    }
  });

  app.post("/api/claim-transaction", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { accessCode } = req.body;

    try {
      const transaction = await storage.getTransactionByAccessCode(accessCode);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      // Update user with claimed transaction
      await storage.updateUser(req.user.id, {
        claimedTransactionId: transaction.id,
        claimedAccessCode: accessCode
      });

      // Add user to transaction participants
      const updatedParticipants = [...transaction.participants, {
        userId: req.user.id,
        role: 'client'
      }];

      await storage.updateTransaction(transaction.id, {
        participants: updatedParticipants
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error claiming transaction:', error);
      res.status(500).json({ error: "Failed to claim transaction" });
    }
  });

  app.post("/api/register", async (req, res, next) => {
    //Existing register code here.
  });

  // Showing request routes
  app.get("/api/showing-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const requests = await storage.getShowingRequestsByUser(req.user.id, req.user.clientRecordId);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching showing requests:', error);
      res.status(500).json({ error: 'Failed to fetch showing requests' });
    }
  });

  app.get("/api/showing-requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const request = await storage.getShowingRequest(Number(req.params.id));
      if (!request) {
        return res.status(404).json({ error: 'Showing request not found' });
      }
      const isRequester = request.requesterId === req.user.id;
      const isRecipient = request.recipientId === req.user.id ||
        (req.user.clientRecordId && request.recipientId === req.user.clientRecordId);
      if (!isRequester && !isRecipient) {
        return res.sendStatus(403);
      }
      res.json(request);
    } catch (error) {
      console.error('Error fetching showing request:', error);
      res.status(500).json({ error: 'Failed to fetch showing request' });
    }
  });

  app.post("/api/showing-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { viewingId, requestedDate, notes } = req.body;
      
      if (!viewingId || !requestedDate) {
        return res.status(400).json({ error: 'viewingId and requestedDate are required' });
      }
      
      const viewing = await storage.getViewing(viewingId);
      if (!viewing) {
        return res.status(404).json({ error: 'Viewing not found' });
      }
      
      let recipientId: number;
      if (req.user.role === 'agent') {
        if (viewing.agentId !== req.user.id) {
          return res.status(403).json({ error: 'You can only create requests for your own viewings' });
        }
        recipientId = viewing.clientId;
      } else {
        const clientRecordId = req.user.clientRecordId;
        if (!clientRecordId || viewing.clientId !== clientRecordId) {
          return res.status(403).json({ error: 'You can only create requests for viewings assigned to you' });
        }
        recipientId = viewing.agentId;
      }
      
      const requestData = {
        viewingId,
        requesterId: req.user.id,
        recipientId,
        requestedDate: new Date(requestedDate),
        status: 'pending',
        notes: notes || null
      };
      const request = await storage.createShowingRequest(requestData);
      res.status(201).json(request);
    } catch (error) {
      console.error('Error creating showing request:', error);
      res.status(500).json({ error: 'Failed to create showing request' });
    }
  });

  app.patch("/api/showing-requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const request = await storage.getShowingRequest(Number(req.params.id));
      if (!request) {
        return res.status(404).json({ error: 'Showing request not found' });
      }
      
      const isRequester = request.requesterId === req.user.id;
      const isRecipient = request.recipientId === req.user.id || 
        (req.user.clientRecordId && request.recipientId === req.user.clientRecordId);
      
      if (!isRequester && !isRecipient) {
        return res.sendStatus(403);
      }
      
      const { status, responseNotes } = req.body;
      
      if (status === 'approved' || status === 'declined') {
        if (!isRecipient) {
          return res.status(403).json({ error: 'Only the recipient can approve or decline' });
        }
      }
      
      if (status === 'cancelled') {
        if (!isRequester) {
          return res.status(403).json({ error: 'Only the requester can cancel' });
        }
      }
      
      const allowedStatuses = ['pending', 'approved', 'declined', 'cancelled'];
      if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      const updated = await storage.updateShowingRequest(Number(req.params.id), { status, responseNotes });
      res.json(updated);
    } catch (error) {
      console.error('Error updating showing request:', error);
      res.status(500).json({ error: 'Failed to update showing request' });
    }
  });

  app.delete("/api/showing-requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const request = await storage.getShowingRequest(Number(req.params.id));
      if (!request) {
        return res.status(404).json({ error: 'Showing request not found' });
      }
      if (request.requesterId !== req.user.id) {
        return res.sendStatus(403);
      }
      await storage.deleteShowingRequest(Number(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      console.error('Error deleting showing request:', error);
      res.status(500).json({ error: 'Failed to delete showing request' });
    }
  });

  // Saved Properties
  app.get("/api/saved-properties", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const properties = await storage.getSavedPropertiesByUser(req.user.id);
      res.json(properties);
    } catch (error) {
      console.error('Error fetching saved properties:', error);
      res.status(500).json({ error: 'Failed to fetch saved properties' });
    }
  });

  app.post("/api/saved-properties", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const data = { ...req.body, userId: req.user.id };
      const parsed = insertSavedPropertySchema.safeParse(data);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }
      const property = await storage.createSavedProperty(parsed.data);
      res.status(201).json(property);
    } catch (error) {
      console.error('Error saving property:', error);
      res.status(500).json({ error: 'Failed to save property' });
    }
  });

  app.get("/api/saved-properties/showing-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const properties = await storage.getShowingRequestedProperties(req.user.id);
      res.json(properties);
    } catch (error) {
      console.error('Error fetching showing requested properties:', error);
      res.status(500).json({ error: 'Failed to fetch showing requested properties' });
    }
  });

  app.patch("/api/saved-properties/:id/showing", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { showingRequested } = req.body;
      if (typeof showingRequested !== "boolean") {
        return res.status(400).json({ error: "showingRequested must be a boolean" });
      }
      await storage.updateSavedPropertyShowing(Number(req.params.id), req.user.id, showingRequested);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating showing request:', error);
      res.status(404).json({ error: 'Property not found' });
    }
  });

  app.patch("/api/saved-properties/:id/price-alert", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { priceAlertEnabled } = req.body;
      if (typeof priceAlertEnabled !== "boolean") {
        return res.status(400).json({ error: "priceAlertEnabled must be a boolean" });
      }
      const id = Number(req.params.id);
      await db.execute(sql`
        UPDATE saved_properties SET price_alert_enabled = ${priceAlertEnabled}
        WHERE id = ${id} AND user_id = ${req.user.id}
      `);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating price alert:', error);
      res.status(500).json({ error: 'Failed to update price alert' });
    }
  });

  app.delete("/api/saved-properties/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      await storage.deleteSavedProperty(Number(req.params.id), req.user.id);
      res.sendStatus(204);
    } catch (error) {
      console.error('Error deleting saved property:', error);
      res.status(404).json({ error: 'Property not found' });
    }
  });

  const contractUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are accepted'));
      }
    }
  });

  app.post("/api/transactions/:id/parse-contract", contractUpload.single('contract'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== 'agent' && req.user.role !== 'broker') return res.status(403).json({ error: 'Only agents can upload contracts' });

    const transactionId = Number(req.params.id);
    try {
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      if (transaction.agentId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized for this transaction' });
      }
    } catch {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    try {
      const extracted = await parseContract(req.file.buffer);
      (req as any).file.buffer = Buffer.alloc(0);

      const { rawTextPreview, documentType, notes, aiUsed, ...fields } = extracted;

      const fieldCount = Object.values(fields).filter(v => v !== null && v !== undefined && v !== '').length;
      console.log(`=== DOCUMENT PARSED (AI: ${aiUsed ? 'yes' : 'no'}${documentType ? ', type: ' + documentType : ''}, fields: ${fieldCount}) ===`);

      res.json({
        extracted: fields,
        rawTextPreview: rawTextPreview.substring(0, 2000),
        documentType: documentType || (aiUsed ? 'unknown' : 'purchase_contract'),
        notes: notes || null,
        aiUsed: aiUsed || false,
        message: aiUsed
          ? 'Document parsed with AI assistance. Review the extracted data before applying to the transaction.'
          : 'Contract parsed successfully. Review the extracted data before applying to the transaction.',
      });
    } catch (error) {
      console.error('Error parsing contract:', error);
      res.status(422).json({ error: 'Failed to parse the document. Please ensure it is a valid PDF file.' });
    }
  });

  const RENTCAST_DEV_BLOCK = process.env.NODE_ENV !== "production" && process.env.RENTCAST_ALLOW_DEV !== "true";
  if (RENTCAST_DEV_BLOCK) {
    console.log("[RentCast] ⛔ Development mode: all live RentCast API calls are BLOCKED. Set RENTCAST_ALLOW_DEV=true to override.");
  }

  const MONTHLY_LIMIT = 45; // leave buffer under 50

  async function getRentcastCallCount(): Promise<number> {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const result = await db.execute(sql`
        SELECT call_count, reset_month, reset_year FROM api_usage_counters WHERE id = 'rentcast'
      `);
      if (result.rows.length === 0) {
        await db.execute(sql`
          INSERT INTO api_usage_counters (id, call_count, reset_month, reset_year) VALUES ('rentcast', 0, ${month}, ${year})
        `);
        return 0;
      }
      const row = result.rows[0] as any;
      if (row.reset_month !== month || row.reset_year !== year) {
        await db.execute(sql`
          UPDATE api_usage_counters SET call_count = 0, reset_month = ${month}, reset_year = ${year}, updated_at = NOW() WHERE id = 'rentcast'
        `);
        return 0;
      }
      return row.call_count;
    } catch (e) {
      console.error("[RentCast] Failed to read call counter:", e);
      return MONTHLY_LIMIT;
    }
  }

  async function incrementRentcastCallCount(): Promise<number> {
    try {
      const result = await db.execute(sql`
        UPDATE api_usage_counters SET call_count = call_count + 1, updated_at = NOW() WHERE id = 'rentcast' RETURNING call_count
      `);
      return (result.rows[0] as any)?.call_count ?? 0;
    } catch (e) {
      console.error("[RentCast] Failed to increment call counter:", e);
      return 0;
    }
  }

  app.get("/api/rentcast/listings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { city, state, zipCode, minPrice, maxPrice, bedrooms, bathrooms, bedroomsMin, bathroomsMin, propertyType, status, limit } = req.query;

    if (!city && !zipCode) {
      return res.status(400).json({ error: "Please provide a city or ZIP code" });
    }

    const params = new URLSearchParams();
    if (city) params.set("city", String(city));
    if (state) params.set("state", String(state));
    if (zipCode) params.set("zipCode", String(zipCode));
    if (minPrice && minPrice !== "any") params.set("minPrice", String(minPrice));
    if (maxPrice && maxPrice !== "any") params.set("maxPrice", String(maxPrice));
    if (bedroomsMin && bedroomsMin !== "any") params.set("bedroomsMin", String(bedroomsMin));
    else if (bedrooms && bedrooms !== "any") params.set("bedroomsMin", String(bedrooms));
    if (bathroomsMin && bathroomsMin !== "any") params.set("bathroomsMin", String(bathroomsMin));
    else if (bathrooms && bathrooms !== "any") params.set("bathroomsMin", String(bathrooms));
    if (propertyType && propertyType !== "any") params.set("propertyType", String(propertyType));
    if (status) params.set("status", String(status));
    const parsedLimit = Math.min(Math.max(parseInt(String(limit)) || 50, 1), 500);
    params.set("limit", String(parsedLimit));

    const cacheKey = buildListingsCacheKey(params);
    const forceRefresh = req.query.refresh === "true";

    if (!forceRefresh) {
      const cached = await getCached(cacheKey);
      if (cached) {
        const count = await getRentcastCallCount();
        return res.json({ listings: cached, fromCache: true, apiCallsUsed: count, apiCallsLimit: MONTHLY_LIMIT });
      }
    }

    if (RENTCAST_DEV_BLOCK) {
      return res.json({ listings: [], fromCache: true, devBlocked: true, message: "RentCast API calls blocked in development. Set RENTCAST_ALLOW_DEV=true to override.", apiCallsUsed: 0, apiCallsLimit: MONTHLY_LIMIT });
    }
    const callCount = await getRentcastCallCount();
    if (callCount >= MONTHLY_LIMIT) {
      return res.status(429).json({
        error: `Monthly API limit reached (${MONTHLY_LIMIT} calls). Resets next month. Try a cached search or adjust filters.`,
        apiCallsUsed: callCount,
        apiCallsLimit: MONTHLY_LIMIT
      });
    }

    try {
      const apiKey = process.env.RENTCAST_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "RentCast API key not configured" });
      }

      const url = `https://api.rentcast.io/v1/listings/sale?${params.toString()}`;
      console.log(`RentCast API call #${callCount + 1}: ${url}`);

      const response = await fetch(url, {
        headers: { "X-Api-Key": apiKey, "Accept": "application/json" }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("RentCast API error:", response.status, errorText);
        return res.status(response.status).json({ error: `RentCast API error: ${response.statusText}` });
      }

      const data = await response.json();
      const newCount = await incrementRentcastCallCount();
      console.log(`RentCast returned ${Array.isArray(data) ? data.length : 'non-array'} listings for: ${cacheKey}`);

      await setCache(cacheKey, data, "listings");

      res.json({ listings: data, fromCache: false, apiCallsUsed: newCount, apiCallsLimit: MONTHLY_LIMIT });
    } catch (error) {
      console.error("RentCast API fetch error:", error);
      res.status(500).json({ error: "Failed to fetch listings from RentCast" });
    }
  });

  app.get("/api/rentcast/property", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { address, city, state, zipCode } = req.query;
    if (!address) {
      return res.status(400).json({ error: "Please provide an address" });
    }

    const addressStr = String(address).trim();
    const cityStr = city ? String(city).trim() : "";
    const stateStr = state ? String(state).trim() : "";
    const zipStr = zipCode ? String(zipCode).trim() : "";

    const cacheKey = buildPropertyCacheKey(addressStr, cityStr, stateStr, zipStr);
    const cached = await getCached(cacheKey);
    if (cached) {
      return res.json({ property: cached, fromCache: true });
    }

    const fromListings = await findPropertyInCachedListings(addressStr);
    if (fromListings) {
      return res.json({ property: fromListings, fromCache: true, source: "listings_cache" });
    }

    if (RENTCAST_DEV_BLOCK) {
      return res.json({ property: null, fromCache: true, devBlocked: true, message: "RentCast API calls blocked in development." });
    }
    const propCallCount = await getRentcastCallCount();
    if (propCallCount >= MONTHLY_LIMIT) {
      return res.status(429).json({ error: "Monthly API limit reached." });
    }

    try {
      const apiKey = process.env.RENTCAST_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "RentCast API key not configured" });
      }

      let resolvedCity = cityStr;
      let resolvedState = stateStr;
      let resolvedZip = zipStr;

      if (!resolvedCity && !resolvedZip) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressStr)}&limit=1&addressdetails=1`, {
            headers: { "User-Agent": "HomeBase-CRM/1.0" }
          });
          const geoData = await geoRes.json();
          if (geoData.length > 0) {
            const addr = geoData[0].address || {};
            resolvedCity = addr.city || addr.town || addr.village || "";
            resolvedState = addr.state || "";
            resolvedZip = addr.postcode || "";
          }
        } catch (e) {
          console.log("Geocoding fallback failed, continuing with original address");
        }
      }

      const params = new URLSearchParams();
      params.set("address", addressStr);
      if (resolvedCity) params.set("city", resolvedCity);
      if (resolvedState) params.set("state", resolvedState);
      if (resolvedZip) params.set("zipCode", resolvedZip);

      const url = `https://api.rentcast.io/v1/properties?${params.toString()}`;
      console.log(`RentCast property lookup #${propCallCount + 1}: ${url}`);

      const response = await fetch(url, {
        headers: { "X-Api-Key": apiKey, "Accept": "application/json" }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return res.json({ property: null, fromCache: false, message: "Property not found in RentCast database" });
        }
        const errorText = await response.text();
        console.error("RentCast property lookup error:", response.status, errorText);
        return res.status(response.status).json({ error: `RentCast API error: ${response.statusText}` });
      }

      const data = await response.json();
      await incrementRentcastCallCount();

      const property = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (property) {
        await setCache(cacheKey, property, "property");
      }

      res.json({ property, fromCache: false });
    } catch (error) {
      console.error("RentCast property lookup error:", error);
      res.status(500).json({ error: "Failed to look up property" });
    }
  });

  app.get("/api/rentcast/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const statusCount = await getRentcastCallCount();
    const now = new Date();
    const dbCacheEntries = await getDbCacheSize();
    res.json({
      apiCallsUsed: statusCount,
      apiCallsLimit: MONTHLY_LIMIT,
      cacheEntries: getCacheSize(),
      dbCacheEntries,
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    });
  });

  app.get("/api/communications/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const [agentPhone, gmailStatus] = await Promise.all([
        storage.getAgentPhoneNumber(req.user.id),
        getGmailStatus(req.user.id),
      ]);
      const hasAgentNumber = !!agentPhone;
      const hasPlatformNumber = isTwilioConfigured() && !!process.env.TWILIO_PHONE_NUMBER;
      res.json({
        twilio: isTwilioConfigured() && (hasAgentNumber || hasPlatformNumber),
        twilioPhone: agentPhone?.phoneNumber || (hasPlatformNumber ? getTwilioPhoneNumber() : null),
        hasOwnNumber: hasAgentNumber,
        gmail: gmailStatus,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to check communication status" });
    }
  });

  app.get("/api/phone-number", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const agentPhone = await storage.getAgentPhoneNumber(req.user.id);
      res.json({ phoneNumber: agentPhone });
    } catch (error) {
      res.status(500).json({ error: "Failed to get phone number" });
    }
  });

  app.get("/api/phone-number/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const existing = await storage.getAgentPhoneNumber(req.user.id);
      if (existing) {
        return res.status(400).json({ error: "You already have a phone number assigned. Release it first to get a new one." });
      }

      const areaCode = req.query.areaCode as string | undefined;
      const result = await searchAvailableNumbers(areaCode);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ numbers: result.numbers });
    } catch (error) {
      res.status(500).json({ error: "Failed to search available numbers" });
    }
  });

  app.post("/api/phone-number/purchase", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const existing = await storage.getAgentPhoneNumber(req.user.id);
      if (existing) {
        return res.status(400).json({ error: "You already have a phone number. Each agent is limited to one number." });
      }

      const phoneSchema = z.object({
        phoneNumber: z.string().min(1),
        areaCode: z.string().optional(),
      });
      const parsed = phoneSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const result = await purchasePhoneNumber(parsed.data.phoneNumber);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const saved = await storage.saveAgentPhoneNumber({
        userId: req.user.id,
        phoneNumber: result.phoneNumber!,
        twilioSid: result.sid!,
        areaCode: parsed.data.areaCode,
        friendlyName: result.friendlyName,
      });

      res.json({ success: true, phoneNumber: saved });
    } catch (error) {
      console.error("Error purchasing phone number:", error);
      res.status(500).json({ error: "Failed to purchase phone number" });
    }
  });

  app.post("/api/phone-number/release", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const existing = await storage.getAgentPhoneNumber(req.user.id);
      if (!existing) {
        return res.status(400).json({ error: "You don't have a phone number to release." });
      }

      const result = await releasePhoneNumber(existing.twilioSid);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      await storage.deleteAgentPhoneNumber(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error releasing phone number:", error);
      res.status(500).json({ error: "Failed to release phone number" });
    }
  });

  app.get("/api/gmail/auth-url", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const crypto = await import("crypto");
      const nonce = crypto.randomBytes(32).toString("hex");
      (req.session as any).gmailOAuthState = nonce;
      (req.session as any).gmailOAuthUserId = req.user.id;
      const returnTo = req.query.returnTo as string | undefined;
      if (returnTo) {
        (req.session as any).gmailOAuthReturnTo = returnTo;
      }
      const url = getAuthUrl(nonce, req.get("host"));
      res.json({ url });
    } catch (error: any) {
      console.error("Error generating Gmail auth URL:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  app.get("/api/gmail/callback", async (req, res) => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const host = req.get("host") || "";
    const proto = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${proto}://${host}`;

    if (!code || !state) {
      return res.redirect(`${baseUrl}/clients?gmail=error`);
    }

    const sessionState = (req.session as any).gmailOAuthState;
    const userId = (req.session as any).gmailOAuthUserId;

    if (!sessionState || !userId || state !== sessionState) {
      console.error("Gmail OAuth state mismatch or missing session data");
      return res.redirect(`${baseUrl}/clients?gmail=error`);
    }

    const returnTo = (req.session as any).gmailOAuthReturnTo;
    delete (req.session as any).gmailOAuthState;
    delete (req.session as any).gmailOAuthUserId;
    delete (req.session as any).gmailOAuthReturnTo;

    const defaultReturn = "/clients";
    const returnPath = returnTo === "/settings" ? "/settings" : defaultReturn;

    try {
      await handleCallback(code, userId, req.get("host"));
      res.redirect(`${baseUrl}${returnPath}?gmail=connected`);
    } catch (error: any) {
      console.error("Gmail callback error:", error);
      res.redirect(`${baseUrl}${returnPath}?gmail=error`);
    }
  });

  app.get("/api/gmail/signature", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const result = await getSignature(req.user.id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ signature: "", error: "Failed to fetch signature" });
    }
  });

  app.post("/api/gmail/disconnect", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      await disconnectGmail(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting Gmail:", error);
      res.status(500).json({ error: "Failed to disconnect Gmail" });
    }
  });

  app.get("/api/gmail/messages/:clientId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const clientId = Number(req.params.clientId);
      const client = await storage.getClient(clientId);
      if (!client || client.agentId !== req.user.id) {
        return res.status(404).json({ error: "Client not found" });
      }
      if (!client.email) {
        return res.status(400).json({ error: "Client has no email address on file" });
      }
      const result = await getGmailMessages(req.user.id, client.email);
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching Gmail messages:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/gmail/inbox", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const { pageToken, q, label, maxResults } = req.query;
      const parsedMax = maxResults ? Math.min(Number(maxResults), 50) : 25;
      const result = await getGmailInbox(req.user.id, {
        pageToken: pageToken as string | undefined,
        query: q as string | undefined,
        label: label as string | undefined,
        maxResults: parsedMax,
      });
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching Gmail inbox:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to fetch inbox" });
    }
  });

  app.get("/api/gmail/message/:messageId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const result = await getGmailMessageDetail(req.user.id, req.params.messageId);
      if (!result.message) {
        return res.status(404).json({ error: result.error || "Message not found" });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching Gmail message detail:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to fetch message" });
    }
  });

  app.get("/api/communications/:clientId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const clientId = Number(req.params.clientId);
      const client = await storage.getClient(clientId);
      if (!client || client.agentId !== req.user.id) {
        return res.status(404).json({ error: "Client not found" });
      }
      const comms = await storage.getCommunicationsByClient(clientId, req.user.id);
      res.json(comms);
    } catch (error) {
      console.error("Error fetching communications:", error);
      res.status(500).json({ error: "Failed to fetch communications" });
    }
  });

  const SMS_DAILY_LIMIT = 200;
  const SMS_UNIQUE_RECIPIENTS_LIMIT = 50;

  app.post("/api/communications/sms", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const schema = z.object({
        clientId: z.number(),
        content: z.string().min(1).max(1600),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }
      const { clientId, content } = parsed.data;

      if (!isTwilioConfigured()) {
        return res.status(400).json({ error: "SMS is not available. Please contact your platform administrator." });
      }

      const agentPhone = await storage.getAgentPhoneNumber(req.user.id);
      if (!agentPhone && !process.env.TWILIO_PHONE_NUMBER) {
        return res.status(400).json({ error: "No phone number available. Please request a phone number first." });
      }

      const client = await storage.getClient(clientId);
      if (!client || client.agentId !== req.user.id) {
        return res.status(404).json({ error: "Client not found" });
      }

      const phone = client.mobilePhone || client.phone;
      if (!phone) {
        return res.status(400).json({ error: "Client has no phone number on file" });
      }

      if (isBlockedNumber(phone)) {
        return res.status(400).json({ error: "This number cannot receive SMS messages. Emergency and short-code numbers are not allowed." });
      }

      const contentCheck = containsThreateningContent(content);
      if (contentCheck.flagged) {
        return res.status(400).json({ error: contentCheck.reason });
      }

      const isOptedOut = await storage.isPhoneOptedOut(phone);
      if (isOptedOut) {
        return res.status(403).json({ error: "This number has opted out of SMS messages. You cannot send texts to this number." });
      }

      const [dailyCount, uniqueRecipients] = await Promise.all([
        storage.getSmsSentCountToday(req.user.id),
        storage.getUniqueRecipientsToday(req.user.id),
      ]);

      if (dailyCount >= SMS_DAILY_LIMIT) {
        return res.status(429).json({ error: `Daily SMS limit reached (${SMS_DAILY_LIMIT} messages per day). Please try again tomorrow.` });
      }

      if (uniqueRecipients >= SMS_UNIQUE_RECIPIENTS_LIMIT) {
        const existingComms = await storage.getCommunicationsByClient(clientId, req.user.id);
        const hasSentToday = existingComms.some(c => c.type === 'sms' && c.status === 'sent' && c.createdAt && new Date(c.createdAt).toDateString() === new Date().toDateString());
        if (!hasSentToday) {
          return res.status(429).json({ error: `You've reached the limit of ${SMS_UNIQUE_RECIPIENTS_LIMIT} unique contacts per day. You can still message contacts you've already texted today.` });
        }
      }

      const fromNumber = agentPhone?.phoneNumber || process.env.TWILIO_PHONE_NUMBER!;
      const result = await sendSMSFromNumber(fromNumber, phone, content);

      const comm = await storage.createCommunication({
        clientId,
        agentId: req.user.id,
        type: "sms",
        content,
        status: result.success ? "sent" : "failed",
        externalId: result.externalId || null,
        subject: null,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error, communication: comm });
      }

      res.json(comm);
    } catch (error) {
      console.error("Error sending SMS:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });

  app.post("/api/communications/sms-direct", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const schema = z.object({
        phone: z.string().min(10).max(20),
        content: z.string().min(1).max(1600),
        context: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }
      const { phone, content } = parsed.data;

      if (!isTwilioConfigured()) {
        return res.status(400).json({ error: "SMS is not available. Please contact your platform administrator." });
      }

      const agentPhone = await storage.getAgentPhoneNumber(req.user.id);
      if (!agentPhone && !process.env.TWILIO_PHONE_NUMBER) {
        return res.status(400).json({ error: "No phone number available. Please request a phone number first." });
      }

      const normalizedPhone = normalizePhoneNumber(phone);
      const isOptedOut = await storage.isPhoneOptedOut(normalizedPhone);
      if (isOptedOut) {
        return res.status(403).json({ error: "This number has opted out of SMS messages." });
      }

      const [dailyCount] = await Promise.all([
        storage.getSmsSentCountToday(req.user.id),
      ]);

      if (dailyCount >= SMS_DAILY_LIMIT) {
        return res.status(429).json({ error: `Daily SMS limit reached (${SMS_DAILY_LIMIT} messages per day).` });
      }

      const fromNumber = agentPhone?.phoneNumber || process.env.TWILIO_PHONE_NUMBER!;
      const result = await sendSMSFromNumber(fromNumber, normalizedPhone, content);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true, message: "SMS sent successfully" });
    } catch (error) {
      console.error("Error sending direct SMS:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });

  app.post("/api/twilio/webhook", async (req, res) => {
    try {
      const { From, Body } = req.body;
      if (!From || !Body) {
        return res.status(400).send('<Response></Response>');
      }

      const webhookUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const isValid = await validateTwilioWebhook(req, webhookUrl);
      if (!isValid) {
        console.warn('Twilio webhook: rejected invalid signature');
        return res.status(403).send('<Response></Response>');
      }

      const normalizedFrom = normalizePhoneNumber(From);
      console.log(`Incoming SMS from ${normalizedFrom}: "${Body.trim()}"`);

      if (isOptOutMessage(Body)) {
        await storage.addOptOut(normalizedFrom);
        console.log(`Opt-out processed for ${normalizedFrom}`);
        res.type('text/xml').send('<Response><Message>You have been unsubscribed and will no longer receive SMS messages from us. Reply START to re-subscribe.</Message></Response>');
        return;
      }

      if (isOptInMessage(Body)) {
        await storage.removeOptOut(normalizedFrom);
        console.log(`Opt-in processed for ${normalizedFrom}`);
        res.type('text/xml').send('<Response><Message>You have been re-subscribed and may receive SMS messages from us again. Reply STOP to unsubscribe.</Message></Response>');
        return;
      }

      res.type('text/xml').send('<Response></Response>');
    } catch (error) {
      console.error("Error processing Twilio webhook:", error);
      res.type('text/xml').send('<Response></Response>');
    }
  });

  app.get("/api/sms/limits", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const [dailyCount, uniqueRecipients] = await Promise.all([
        storage.getSmsSentCountToday(req.user.id),
        storage.getUniqueRecipientsToday(req.user.id),
      ]);
      res.json({
        dailySent: dailyCount,
        dailyLimit: SMS_DAILY_LIMIT,
        uniqueRecipients,
        uniqueRecipientsLimit: SMS_UNIQUE_RECIPIENTS_LIMIT,
      });
    } catch (error) {
      console.error("Error fetching SMS limits:", error);
      res.status(500).json({ error: "Failed to fetch SMS limits" });
    }
  });

  app.post("/api/communications/email", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const schema = z.object({
        clientId: z.number(),
        subject: z.string().min(1),
        content: z.string().min(1),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }
      const { clientId, subject, content } = parsed.data;

      const client = await storage.getClient(clientId);
      if (!client || client.agentId !== req.user.id) {
        return res.status(404).json({ error: "Client not found" });
      }

      if (!client.email) {
        return res.status(400).json({ error: "Client has no email address on file" });
      }

      const result = await sendGmailEmail(req.user.id, client.email, subject, content);

      const comm = await storage.createCommunication({
        clientId,
        agentId: req.user.id,
        type: "email",
        subject,
        content,
        status: result.success ? "sent" : "failed",
        externalId: result.messageId || null,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error, communication: comm });
      }

      res.json(comm);
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  app.post("/api/communications/call", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const schema = z.object({
        clientId: z.number(),
        duration: z.number().int().min(0).max(43200),
        outcome: z.enum(["connected", "no_answer", "voicemail", "busy", "wrong_number"]),
        notes: z.string().max(2000).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }
      const { clientId, duration, outcome, notes } = parsed.data;

      const client = await storage.getClient(clientId);
      if (!client || client.agentId !== req.user.id) {
        return res.status(404).json({ error: "Client not found" });
      }

      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      const durationStr = `${minutes}m ${seconds}s`;

      const comm = await storage.createCommunication({
        clientId,
        agentId: req.user.id,
        type: "call",
        subject: `${outcome} — ${durationStr}`,
        content: notes || null,
        status: "sent",
        externalId: null,
      });

      res.json(comm);
    } catch (error) {
      console.error("Error logging call:", error);
      res.status(500).json({ error: "Failed to log call" });
    }
  });

  app.post("/api/gmail/send", upload.array("attachments", 10), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const { to, cc, subject, body } = req.body;
      const sendSchema = z.object({
        to: z.string().email("Invalid email address"),
        cc: z.string().optional(),
        subject: z.string().min(1, "Subject is required"),
        body: z.string().min(1, "Body is required"),
      });
      const parsed = sendSchema.safeParse({ to, cc, subject, body });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const files = (req.files as Express.Multer.File[]) || [];
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      if (totalSize > 25 * 1024 * 1024) {
        return res.status(400).json({ error: "Total attachment size exceeds 25MB limit" });
      }

      const attachments: EmailAttachment[] = files.map((f) => ({
        filename: f.originalname,
        mimeType: f.mimetype,
        content: f.buffer,
      }));

      const trackingId = randomUUID();
      const domains = process.env.REPLIT_DOMAINS || "";
      const domain = domains.split(",")[0];
      const baseUrl = domain ? `https://${domain}` : "http://localhost:5000";
      const trackingPixel = `<img src="${baseUrl}/api/track/${trackingId}.png" width="1" height="1" style="display:none" alt="" />`;
      const trackedBody = body + trackingPixel;

      const result = await sendGmailEmail(req.user.id, to, subject, trackedBody, cc || undefined, attachments.length > 0 ? attachments : undefined);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      try {
        await storage.createEmailTracking({
          trackingId,
          userId: req.user.id,
          gmailMessageId: result.messageId || null,
          recipientEmail: to,
          subject,
        });
      } catch (trackErr) {
        console.error("Failed to save tracking record:", trackErr);
      }

      res.json({ success: true, messageId: result.messageId });
    } catch (error: any) {
      console.error("Error sending email via Gmail:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to send email" });
    }
  });

  // ============ Calculator Email Results ============
  app.post("/api/calculators/email-results", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const calcSchema = z.object({
        type: z.enum(["mortgage", "affordability", "refinance", "rent_vs_buy"]),
        results: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
      });
      const parsed = calcSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid calculator data" });
      const { type, results } = parsed.data;

      const userEmail = req.user.email;
      if (!userEmail) return res.status(400).json({ error: "No email on your account" });

      const esc = (v: any) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const formatCurrency = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(n) || 0);
      const formatCurrencyDec = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

      let subject = "Your HomeBase Calculator Results";
      let rows = "";

      if (type === "mortgage") {
        subject = "Your Mortgage Calculation Results";
        const r = results;
        rows = `
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Property</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${esc(r.address) || "Not specified"}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Purchase Price</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${formatCurrency(r.purchasePrice)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Down Payment</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${formatCurrency(r.downPayment)} (${r.downPaymentPct}%)</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Loan Amount</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${formatCurrency(r.loanAmount)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Interest Rate</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${r.interestRate}%</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Loan Term</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${r.loanTerm} years</td></tr>
          <tr style="background:#f9f9f9"><td style="padding:12px;font-weight:600;font-size:16px">Monthly Payment</td><td style="padding:12px;font-weight:700;font-size:18px">${formatCurrencyDec(r.monthlyPayment)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Principal & Interest</td><td style="padding:8px;border-bottom:1px solid #eee">${formatCurrencyDec(r.principalAndInterest)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Taxes</td><td style="padding:8px;border-bottom:1px solid #eee">${formatCurrencyDec(r.monthlyTaxes)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Insurance</td><td style="padding:8px;border-bottom:1px solid #eee">${formatCurrencyDec(r.monthlyInsurance)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Total Interest Paid</td><td style="padding:8px;border-bottom:1px solid #eee">${formatCurrency(r.totalInterest)}</td></tr>
        `;
      } else if (type === "affordability") {
        subject = "Your Affordability Calculation Results";
        const r = results;
        rows = `
          <tr style="background:#f9f9f9"><td style="padding:12px;font-weight:600;font-size:16px">Max Home Price</td><td style="padding:12px;font-weight:700;font-size:18px">${formatCurrency(r.maxHomePrice)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Annual Income</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${formatCurrency(r.annualIncome)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Monthly Debts</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${formatCurrencyDec(r.monthlyDebts)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Down Payment Saved</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${formatCurrency(r.downPaymentSaved)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Max Monthly Payment</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${formatCurrencyDec(r.maxMonthlyPayment)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Target DTI</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${r.dtiTarget}%</td></tr>
        `;
      } else if (type === "refinance") {
        subject = "Your Refinance Calculation Results";
        const r = results;
        rows = `
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Current Balance</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${formatCurrency(r.currentBalance)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Current Rate</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${r.currentRate}%</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Current Payment</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${formatCurrencyDec(r.currentPayment)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">New Rate</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${r.newRate}%</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">New Payment</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${formatCurrencyDec(r.newPayment)}</td></tr>
          <tr style="background:#f9f9f9"><td style="padding:12px;font-weight:600;font-size:16px">Monthly Savings</td><td style="padding:12px;font-weight:700;font-size:18px">${formatCurrencyDec(r.monthlySavings)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Break-even</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${r.breakEven} months</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Lifetime Savings</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${formatCurrency(r.lifetimeSavings)}</td></tr>
        `;
      } else if (type === "rent_vs_buy") {
        subject = "Your Rent vs. Buy Comparison Results";
        const r = results;
        rows = `
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Monthly Rent</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${formatCurrencyDec(r.monthlyRent)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Monthly Buy Payment</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${formatCurrencyDec(r.monthlyBuyPayment)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Home Price</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${formatCurrency(r.homePrice)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Years Compared</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${r.yearsCompared}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Total Rent Cost</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${formatCurrency(r.totalRentCost)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Total Buy Cost</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${formatCurrency(r.totalBuyCost)}</td></tr>
          <tr style="background:#f9f9f9"><td style="padding:12px;font-weight:600;font-size:16px">${r.buyAdvantage > 0 ? "Buying Saves" : "Renting Saves"}</td><td style="padding:12px;font-weight:700;font-size:18px">${formatCurrency(Math.abs(r.buyAdvantage))}</td></tr>
        `;
      }

      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#000;color:#fff;padding:24px 20px;border-radius:8px 8px 0 0">
            <h1 style="margin:0;font-size:20px">${subject}</h1>
            <p style="margin:8px 0 0;opacity:0.7;font-size:13px">Generated by HomeBase Financial Tools</p>
          </div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-top:none">
            ${rows}
          </table>
          <div style="padding:16px 20px;background:#f9f9f9;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;text-align:center">
            <p style="margin:0;font-size:12px;color:#999">This is an estimate for informational purposes only. Contact a lender for exact figures.</p>
          </div>
        </div>
      `;

      const result = await sendGmailEmail(req.user.id, userEmail, subject, html);
      if (!result.success) {
        return res.status(400).json({ error: result.error || "Failed to send email. Please connect Gmail first." });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error sending calculator results email:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to send email" });
    }
  });

  // ============ Authorized Users ============

  app.get("/api/authorized-users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const result = await db.execute(sql`
        SELECT au.*, 
          u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email, u.role as user_role, u.profile_photo_url as user_photo
        FROM authorized_users au
        JOIN users u ON u.id = au.authorized_user_id
        WHERE au.owner_id = ${req.user.id}
        ORDER BY au.created_at DESC
      `);
      res.json(result.rows.map(r => ({
        id: r.id,
        ownerId: r.owner_id,
        authorizedUserId: r.authorized_user_id,
        permissionLevel: r.permission_level,
        status: r.status,
        createdAt: r.created_at,
        user: {
          id: r.authorized_user_id,
          firstName: r.user_first_name,
          lastName: r.user_last_name,
          email: r.user_email,
          role: r.user_role,
          profilePhotoUrl: r.user_photo,
        }
      })));
    } catch (error) {
      console.error("Error fetching authorized users:", error);
      res.status(500).json({ error: "Failed to fetch authorized users" });
    }
  });

  app.get("/api/authorized-users/accounts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const result = await db.execute(sql`
        SELECT au.id, au.owner_id, au.permission_level, au.status,
          u.first_name, u.last_name, u.email, u.role, u.profile_photo_url
        FROM authorized_users au
        JOIN users u ON u.id = au.owner_id
        WHERE au.authorized_user_id = ${req.user.id} AND au.status = 'active'
        ORDER BY u.last_name, u.first_name
      `);
      res.json(result.rows.map(r => ({
        id: r.id,
        ownerId: r.owner_id,
        permissionLevel: r.permission_level,
        owner: {
          id: r.owner_id,
          firstName: r.first_name,
          lastName: r.last_name,
          email: r.email,
          role: r.role,
          profilePhotoUrl: r.profile_photo_url,
        }
      })));
    } catch (error) {
      console.error("Error fetching authorized accounts:", error);
      res.status(500).json({ error: "Failed to fetch authorized accounts" });
    }
  });

  app.post("/api/authorized-users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    const schema = z.object({
      email: z.string().email(),
      permissionLevel: z.enum(["view", "full"]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

    try {
      const targetUser = await storage.getUserByEmail(parsed.data.email);
      if (!targetUser) return res.status(404).json({ error: "No user found with that email address" });
      if (targetUser.role !== "agent" && targetUser.role !== "broker") {
        return res.status(400).json({ error: "Only agent or broker users can be added as authorized users" });
      }
      if (targetUser.id === req.user.id) {
        return res.status(400).json({ error: "You cannot add yourself as an authorized user" });
      }

      const existing = await db.execute(sql`
        SELECT id, status FROM authorized_users WHERE owner_id = ${req.user.id} AND authorized_user_id = ${targetUser.id}
      `);
      if (existing.rows.length > 0) {
        if (existing.rows[0].status === 'active') {
          return res.status(409).json({ error: "This user is already authorized on your account" });
        }
        await db.execute(sql`
          UPDATE authorized_users SET status = 'pending', permission_level = ${parsed.data.permissionLevel}, updated_at = NOW()
          WHERE id = ${existing.rows[0].id}
        `);
        return res.json({ message: "Invitation re-sent", id: existing.rows[0].id });
      }

      const result = await db.execute(sql`
        INSERT INTO authorized_users (owner_id, authorized_user_id, permission_level, status)
        VALUES (${req.user.id}, ${targetUser.id}, ${parsed.data.permissionLevel}, 'pending')
        RETURNING id
      `);

      res.status(201).json({
        id: result.rows[0].id,
        message: "Authorized user invitation sent",
        user: {
          id: targetUser.id,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          email: targetUser.email,
        }
      });
    } catch (error) {
      console.error("Error adding authorized user:", error);
      res.status(500).json({ error: "Failed to add authorized user" });
    }
  });

  app.post("/api/authorized-users/:id/respond", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const schema = z.object({ action: z.enum(["accept", "decline"]) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid action" });

    try {
      const record = await db.execute(sql`
        SELECT * FROM authorized_users WHERE id = ${req.params.id} AND authorized_user_id = ${req.user.id} AND status = 'pending'
      `);
      if (record.rows.length === 0) return res.status(404).json({ error: "Invitation not found" });

      const newStatus = parsed.data.action === "accept" ? "active" : "declined";
      await db.execute(sql`
        UPDATE authorized_users SET status = ${newStatus}, updated_at = NOW() WHERE id = ${req.params.id}
      `);
      res.json({ message: `Invitation ${parsed.data.action}ed`, status: newStatus });
    } catch (error) {
      console.error("Error responding to invitation:", error);
      res.status(500).json({ error: "Failed to respond to invitation" });
    }
  });

  app.patch("/api/authorized-users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const schema = z.object({ permissionLevel: z.enum(["view", "full"]) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid permission level" });

    try {
      const record = await db.execute(sql`
        SELECT * FROM authorized_users WHERE id = ${req.params.id} AND owner_id = ${req.user.id}
      `);
      if (record.rows.length === 0) return res.status(404).json({ error: "Authorized user not found" });

      await db.execute(sql`
        UPDATE authorized_users SET permission_level = ${parsed.data.permissionLevel}, updated_at = NOW() WHERE id = ${req.params.id}
      `);
      res.json({ message: "Permission level updated" });
    } catch (error) {
      console.error("Error updating authorized user:", error);
      res.status(500).json({ error: "Failed to update authorized user" });
    }
  });

  app.delete("/api/authorized-users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const record = await db.execute(sql`
        SELECT * FROM authorized_users WHERE id = ${req.params.id} AND (owner_id = ${req.user.id} OR authorized_user_id = ${req.user.id})
      `);
      if (record.rows.length === 0) return res.status(404).json({ error: "Authorized user not found" });

      await db.execute(sql`DELETE FROM authorized_users WHERE id = ${req.params.id}`);
      res.json({ message: "Authorized user removed" });
    } catch (error) {
      console.error("Error removing authorized user:", error);
      res.status(500).json({ error: "Failed to remove authorized user" });
    }
  });

  app.get("/api/authorized-users/pending", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const result = await db.execute(sql`
        SELECT au.id, au.owner_id, au.permission_level, au.created_at,
          u.first_name, u.last_name, u.email, u.role, u.profile_photo_url
        FROM authorized_users au
        JOIN users u ON u.id = au.owner_id
        WHERE au.authorized_user_id = ${req.user.id} AND au.status = 'pending'
        ORDER BY au.created_at DESC
      `);
      res.json(result.rows.map(r => ({
        id: r.id,
        ownerId: r.owner_id,
        permissionLevel: r.permission_level,
        createdAt: r.created_at,
        owner: {
          id: r.owner_id,
          firstName: r.first_name,
          lastName: r.last_name,
          email: r.email,
          role: r.role,
          profilePhotoUrl: r.profile_photo_url,
        }
      })));
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
      res.status(500).json({ error: "Failed to fetch pending invitations" });
    }
  });

  // ============ Profile & Verification ============

  app.get("/api/profile/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid ID" });
      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ error: "User not found" });
      const isOwn = req.user.id === id;
      const publicProfile: any = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        brokerageName: user.brokerageName,
        licenseNumber: user.licenseNumber,
        licenseState: user.licenseState,
        nmlsNumber: user.nmlsNumber,
        verificationStatus: user.verificationStatus,
        profilePhotoUrl: user.profilePhotoUrl,
        profileBio: user.profileBio,
        profilePhone: user.profilePhone,
        facebookUrl: user.facebookUrl,
        instagramUrl: user.instagramUrl,
        twitterUrl: user.twitterUrl,
        linkedinUrl: user.linkedinUrl,
      };
      if (isOwn) {
        publicProfile.stripeCustomerId = user.stripeCustomerId;
        publicProfile.stripeSubscriptionId = user.stripeSubscriptionId;
        publicProfile.emailVerified = user.emailVerified;
        publicProfile.dashboardPreferences = user.dashboardPreferences;
        publicProfile.brokerageId = user.brokerageId;
        publicProfile.agentId = user.agentId;
        publicProfile.stripeNameVerified = user.stripeNameVerified;
        publicProfile.stripeCardholderName = user.stripeCardholderName;
        publicProfile.licenseVerifiedAt = user.licenseVerifiedAt;
        publicProfile.licenseVerifiedBy = user.licenseVerifiedBy;
        publicProfile.nmlsNumber = user.nmlsNumber;
      }
      res.json(publicProfile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.patch("/api/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const schema = z.object({
      profileBio: z.string().max(1000).optional(),
      profilePhone: z.string().max(50).optional(),
      profilePhotoUrl: z.string().nullable().optional(),
      brokerageName: z.string().max(200).optional(),
      licenseNumber: z.string().max(50).optional(),
      licenseState: z.string().max(5).optional(),
      facebookUrl: z.string().max(500).optional().refine(v => !v || /^https?:\/\//i.test(v), { message: "Must be a valid URL" }),
      instagramUrl: z.string().max(500).optional().refine(v => !v || /^https?:\/\//i.test(v), { message: "Must be a valid URL" }),
      twitterUrl: z.string().max(500).optional().refine(v => !v || /^https?:\/\//i.test(v), { message: "Must be a valid URL" }),
      linkedinUrl: z.string().max(500).optional().refine(v => !v || /^https?:\/\//i.test(v), { message: "Must be a valid URL" }),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid data" });
    try {
      const updated = await storage.updateUser(req.user.id, parsed.data);
      const { password, emailVerificationToken, ...safe } = updated;
      res.json(safe);
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/profile/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" });
    try {
      const { hashPassword } = await import('./auth');
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      const { scrypt, randomBytes, timingSafeEqual } = await import("crypto");
      const { promisify } = await import("util");
      const scryptAsync = promisify(scrypt);
      const [hashed, salt] = user.password.split(".");
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(parsed.data.currentPassword, salt, 64)) as Buffer;
      if (!timingSafeEqual(hashedBuf, suppliedBuf)) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      const newHashed = await hashPassword(parsed.data.newPassword);
      await storage.updateUser(req.user.id, { password: newHashed });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  app.post("/api/profile/support-access", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const schema = z.object({ enabled: z.boolean() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid data" });
    try {
      const expires = parsed.data.enabled ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
      await storage.updateUser(req.user.id, {
        supportAccessGranted: parsed.data.enabled,
        supportAccessExpires: expires,
      });
      res.json({ enabled: parsed.data.enabled, expires });
    } catch (error) {
      res.status(500).json({ error: "Failed to update support access" });
    }
  });

  app.post("/api/profile/logout-all-devices", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    try {
      const currentSessionId = req.sessionID;
      const { pool } = await import("@db");
      await pool.query(
        `DELETE FROM session WHERE sess::jsonb -> 'passport' ->> 'user' = $1 AND sid != $2`,
        [String(req.user.id), currentSessionId]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to log out other devices" });
    }
  });

  app.delete("/api/profile/account", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    try {
      const userId = req.user.id;
      const { pool } = await import("@db");
      const { hashPassword } = await import('./auth');
      const { randomUUID } = await import("crypto");
      await pool.query(`DELETE FROM session WHERE sess::jsonb -> 'passport' ->> 'user' = $1`, [String(userId)]);
      const randomPass = await hashPassword(randomUUID());
      await storage.updateUser(userId, {
        email: `deleted_${userId}_${Date.now()}@deleted.homebase.com`,
        firstName: "Deleted",
        lastName: "User",
        password: randomPass,
        profilePhotoUrl: null,
        profileBio: null,
        profilePhone: null,
        brokerageName: null,
        licenseNumber: null,
        licenseState: null,
        nmlsNumber: null,
        facebookUrl: null,
        instagramUrl: null,
        twitterUrl: null,
        linkedinUrl: null,
        stripeCardholderName: null,
        supportAccessGranted: false,
        supportAccessExpires: null,
      });
      req.logout((err) => {
        if (err) return res.status(500).json({ error: "Failed to logout" });
        res.json({ success: true });
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  app.post("/api/account/deactivate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    try {
      const userId = req.user.id;
      await storage.updateUser(userId, { accountStatus: "inactive" });
      await db.execute(sql`INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details) VALUES (${userId}, ${"self_deactivate"}, ${"user"}, ${userId}, ${JSON.stringify({ previousStatus: "active", newStatus: "inactive" })})`);
      const { pool } = await import("@db");
      await pool.query(
        `DELETE FROM session WHERE sess::jsonb -> 'passport' ->> 'user' = $1`,
        [String(userId)]
      );
      req.logout(() => {
        req.session.destroy(() => {
          res.json({ success: true });
        });
      });
    } catch (error) {
      console.error('Error deactivating account:', error);
      res.status(500).json({ error: "Failed to deactivate account" });
    }
  });

  app.post("/api/account/reactivate", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const { comparePasswords } = await import('./auth');
      if (!(await comparePasswords(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      if (user.accountStatus === "suspended") {
        return res.status(403).json({ error: "Your account has been suspended. Please contact support for assistance." });
      }
      if (user.accountStatus === "active") {
        return res.status(400).json({ error: "Account is already active" });
      }
      await storage.updateUser(user.id, { accountStatus: "active" });
      await db.execute(sql`INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details) VALUES (${user.id}, ${"self_reactivate"}, ${"user"}, ${user.id}, ${JSON.stringify({ previousStatus: "inactive", newStatus: "active" })})`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error reactivating account:', error);
      res.status(500).json({ error: "Failed to reactivate account" });
    }
  });

  app.patch("/api/admin/users/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
      const { status } = req.body;
      if (!["active", "inactive", "suspended"].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be: active, inactive, or suspended" });
      }
      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ error: "User not found" });
      if (targetUser.role === "admin" && req.user.id !== userId) {
        return res.status(403).json({ error: "Cannot change status of another admin" });
      }
      const previousStatus = targetUser.accountStatus || "active";
      await storage.updateUser(userId, { accountStatus: status });
      await logAdminAction(req.user!.id, "update_account_status", "user", userId, { previousStatus, newStatus: status });
      if (status !== "active") {
        const { pool } = await import("@db");
        await pool.query(
          `DELETE FROM session WHERE sess::jsonb -> 'passport' ->> 'user' = $1`,
          [String(userId)]
        );
      }
      res.json({ success: true, status });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  app.post("/api/profile/photo", upload.single("photo"), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      if (!isValidImage(req.file.buffer, req.file.mimetype)) return res.status(400).json({ error: "File must be a valid image (PNG, JPEG, GIF, or WebP)" });

      const photoWidth = 400;
      const photoHeight = 500;
      const bgColor = { r: 235, g: 235, b: 235, alpha: 1 };

      let processedBuffer: Buffer;
      try {
        const { removeBackground } = await import("@imgly/background-removal-node");
        const inputBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
        const resultBlob = await removeBackground(inputBlob, { output: { format: "image/png" } });
        const arrayBuf = await resultBlob.arrayBuffer();
        processedBuffer = Buffer.from(arrayBuf);
      } catch (bgErr) {
        console.error("Background removal failed, using original image:", bgErr);
        processedBuffer = req.file.buffer;
      }

      const resizedPhoto = await sharp(processedBuffer)
        .resize(photoWidth, photoHeight, { fit: "cover", position: "top" })
        .png()
        .toBuffer();

      const finalPhoto = await sharp({
        create: {
          width: photoWidth,
          height: photoHeight,
          channels: 4,
          background: bgColor,
        },
      })
        .composite([{ input: resizedPhoto, blend: "over" }])
        .png()
        .toBuffer();

      const base64 = `data:image/png;base64,${finalPhoto.toString("base64")}`;
      const updated = await storage.updateUser(req.user.id, { profilePhotoUrl: base64 });
      const { password, emailVerificationToken, ...safe } = updated;
      res.json(safe);
    } catch (error) {
      console.error("Profile photo upload error:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  app.post("/api/profile/photo/touchup", upload.single("photo"), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      if (!isValidImage(req.file.buffer, req.file.mimetype)) return res.status(400).json({ error: "File must be a valid image (PNG, JPEG, GIF, or WebP)" });

      const resized = await sharp(req.file.buffer)
        .resize(400, 500, { fit: "cover", position: "top" })
        .png()
        .toBuffer();

      const base64 = `data:image/png;base64,${resized.toString("base64")}`;
      const updated = await storage.updateUser(req.user.id, { profilePhotoUrl: base64 });
      const { password, emailVerificationToken, ...safe } = updated;
      res.json(safe);
    } catch (error) {
      console.error("Profile photo touchup error:", error);
      res.status(500).json({ error: "Failed to save touchup" });
    }
  });

  app.post("/api/broker/verify-agent/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== "broker") return res.status(403).json({ error: "Only brokers can verify agents" });
    const broker = await storage.getUser(req.user.id);
    if (!broker || (broker.verificationStatus !== "admin_verified" && broker.verificationStatus !== "broker_verified")) {
      return res.status(403).json({ error: "You must be a verified broker to verify agents" });
    }
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid ID" });
    try {
      const targetUser = await storage.getUser(id);
      if (!targetUser) return res.status(404).json({ error: "User not found" });
      if (targetUser.role !== "agent") return res.status(400).json({ error: "Can only verify agents" });
      const updated = await storage.updateUser(id, { verificationStatus: "broker_verified" });
      const { password, emailVerificationToken, ...safe } = updated;
      res.json(safe);
    } catch (error) {
      res.status(500).json({ error: "Failed to verify agent" });
    }
  });

  app.get("/api/verification/state-lookup/:state", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const { getStateLookupUrl } = await import("./license-verification");
    const lookup = getStateLookupUrl(req.params.state);
    if (!lookup) return res.status(404).json({ error: "State not found" });
    res.json(lookup);
  });

  app.get("/api/verification/all-state-lookups", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const { getAllStateLookups } = await import("./license-verification");
    res.json(getAllStateLookups());
  });

  app.post("/api/verification/check-stripe-name", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== "agent" && req.user.role !== "broker" && req.user.role !== "lender") {
      return res.status(403).json({ error: "Only agents, brokers, and lenders can verify" });
    }
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (!user.stripeCustomerId) {
        return res.status(400).json({ error: "No payment method on file. Please subscribe first." });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: "card",
      });

      if (paymentMethods.data.length === 0) {
        return res.status(400).json({ error: "No credit card found on your account." });
      }

      const cardName = paymentMethods.data[0].billing_details?.name;
      if (!cardName) {
        return res.status(400).json({ error: "No cardholder name found on your payment method." });
      }

      const profileName = `${user.firstName} ${user.lastName}`;
      const { fuzzyNameMatch } = await import("./license-verification");
      const match = fuzzyNameMatch(profileName, cardName);

      await storage.updateUser(user.id, {
        stripeCardholderName: cardName,
        stripeNameVerified: match.matched,
      });

      const { getStateLookupUrl } = await import("./license-verification");
      const lookupInfo = user.licenseState ? getStateLookupUrl(user.licenseState) : null;

      await db.execute(sql`
        INSERT INTO license_verifications (user_id, license_number, license_state, profile_name, cardholder_name, name_match_score, name_matched, verification_method, lookup_url, notes)
        VALUES (${user.id}, ${user.licenseNumber || "N/A"}, ${user.licenseState || "N/A"}, ${profileName}, ${cardName}, ${match.score}, ${match.matched}, ${"stripe_name_check"}, ${lookupInfo?.url || null}, ${match.matched ? "Automatic name match" : "Name mismatch - manual review recommended"})
      `);

      if (match.matched && user.verificationStatus === "licensed") {
        await storage.updateUser(user.id, { verificationStatus: "payment_verified" });
      }

      res.json({
        profileName,
        cardholderName: cardName,
        score: match.score,
        matched: match.matched,
        verificationStatus: match.matched ? "payment_verified" : user.verificationStatus,
        lookupUrl: lookupInfo?.url || null,
        stateName: lookupInfo?.name || null,
      });
    } catch (error) {
      console.error("Stripe name verification error:", error);
      res.status(500).json({ error: "Failed to verify name" });
    }
  });

  app.get("/api/verification/history/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const userId = parseInt(req.params.userId, 10);
    if (req.user.id !== userId && req.user.role !== "broker") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const rows = await db.execute(sql`
        SELECT id, user_id, license_number, license_state, profile_name, verified_by, 
               verification_method, lookup_url, name_match_score, name_matched, notes, created_at
        FROM license_verifications WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 20
      `);
      res.json(rows.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch verification history" });
    }
  });

  app.post("/api/verification/manual-verify/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== "broker") return res.status(403).json({ error: "Only brokers can manually verify" });

    const broker = await storage.getUser(req.user.id);
    if (!broker || (broker.verificationStatus !== "admin_verified" && broker.verificationStatus !== "broker_verified")) {
      return res.status(403).json({ error: "You must be a verified broker" });
    }

    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId) || userId <= 0) return res.status(400).json({ error: "Invalid user ID" });

    try {
      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ error: "User not found" });

      if (!["agent", "broker", "lender"].includes(targetUser.role)) {
        return res.status(400).json({ error: "Can only verify agents, brokers, or lenders" });
      }

      const { notes } = req.body || {};

      const { getStateLookupUrl } = await import("./license-verification");
      const lookupInfo = targetUser.licenseState ? getStateLookupUrl(targetUser.licenseState) : null;

      await db.execute(sql`
        INSERT INTO license_verifications (user_id, license_number, license_state, profile_name, verified_by, verification_method, lookup_url, notes, name_matched)
        VALUES (${userId}, ${targetUser.licenseNumber || "N/A"}, ${targetUser.licenseState || "N/A"}, ${targetUser.firstName + " " + targetUser.lastName}, ${req.user.id}, ${"manual_broker_review"}, ${lookupInfo?.url || null}, ${notes || "Manually verified by broker"}, ${true})
      `);

      const updated = await storage.updateUser(userId, {
        verificationStatus: "broker_verified",
        licenseVerifiedAt: new Date(),
        licenseVerifiedBy: req.user.id,
      });

      const { password, emailVerificationToken, ...safe } = updated;
      res.json(safe);
    } catch (error) {
      res.status(500).json({ error: "Failed to verify user" });
    }
  });

  app.get("/api/listing-alerts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    try {
      const result = await db.execute(sql`
        SELECT * FROM listing_alerts WHERE user_id = ${req.user.id} ORDER BY created_at DESC
      `);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch listing alerts" });
    }
  });

  app.post("/api/listing-alerts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    const existingCount = await db.execute(sql`SELECT COUNT(*) as count FROM listing_alerts WHERE user_id = ${req.user.id}`);
    if (Number((existingCount.rows[0] as any).count) >= 1) {
      return res.status(400).json({ error: "You can only have one listing alert. Edit or delete your existing alert to create a new one." });
    }

    const schema = z.object({
      name: z.string().min(1).max(100),
      city: z.string().max(100).optional().nullable(),
      state: z.string().max(5).optional().nullable(),
      zipCode: z.string().max(10).optional().nullable(),
      minPrice: z.number().int().positive().optional().nullable(),
      maxPrice: z.number().int().positive().optional().nullable(),
      bedroomsMin: z.number().int().min(0).optional().nullable(),
      bathroomsMin: z.number().int().min(0).optional().nullable(),
      propertyType: z.string().max(50).optional().nullable(),
      notifyEmail: z.boolean().optional(),
      notifySms: z.boolean().optional(),
      notifyInApp: z.boolean().optional(),
    }).refine(data => data.city || data.zipCode, {
      message: "Either city or ZIP code is required",
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid data" });

    try {
      const d = parsed.data;
      const result = await db.execute(sql`
        INSERT INTO listing_alerts (user_id, name, city, state, zip_code, min_price, max_price, bedrooms_min, bathrooms_min, property_type, notify_email, notify_sms, notify_in_app)
        VALUES (${req.user.id}, ${d.name}, ${d.city || null}, ${d.state || null}, ${d.zipCode || null}, ${d.minPrice || null}, ${d.maxPrice || null}, ${d.bedroomsMin || null}, ${d.bathroomsMin || null}, ${d.propertyType || null}, ${d.notifyEmail ?? true}, ${d.notifySms ?? false}, ${d.notifyInApp ?? true})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create listing alert" });
    }
  });

  app.patch("/api/listing-alerts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const alertId = parseInt(req.params.id, 10);
    if (!Number.isFinite(alertId)) return res.status(400).json({ error: "Invalid ID" });

    try {
      const existing = await db.execute(sql`SELECT * FROM listing_alerts WHERE id = ${alertId} AND user_id = ${req.user.id}`);
      if (existing.rows.length === 0) return res.status(404).json({ error: "Alert not found" });

      const schema = z.object({
        name: z.string().min(1).max(100).optional(),
        city: z.string().max(100).optional().nullable(),
        state: z.string().max(5).optional().nullable(),
        zipCode: z.string().max(10).optional().nullable(),
        minPrice: z.number().int().positive().optional().nullable(),
        maxPrice: z.number().int().positive().optional().nullable(),
        bedroomsMin: z.number().int().min(0).optional().nullable(),
        bathroomsMin: z.number().int().min(0).optional().nullable(),
        propertyType: z.string().max(50).optional().nullable(),
        notifyEmail: z.boolean().optional(),
        notifySms: z.boolean().optional(),
        notifyInApp: z.boolean().optional(),
        isActive: z.boolean().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid data" });

      const d = parsed.data;
      const cur = existing.rows[0] as any;
      const newCity = d.city !== undefined ? (d.city || null) : cur.city;
      const newZip = d.zipCode !== undefined ? (d.zipCode || null) : cur.zip_code;
      if (!newCity && !newZip) {
        return res.status(400).json({ error: "Either city or ZIP code is required" });
      }

      const result = await db.execute(sql`
        UPDATE listing_alerts SET
          name = ${d.name !== undefined ? d.name : cur.name},
          city = ${d.city !== undefined ? (d.city || null) : cur.city},
          state = ${d.state !== undefined ? (d.state || null) : cur.state},
          zip_code = ${d.zipCode !== undefined ? (d.zipCode || null) : cur.zip_code},
          min_price = ${d.minPrice !== undefined ? (d.minPrice || null) : cur.min_price},
          max_price = ${d.maxPrice !== undefined ? (d.maxPrice || null) : cur.max_price},
          bedrooms_min = ${d.bedroomsMin !== undefined ? d.bedroomsMin : cur.bedrooms_min},
          bathrooms_min = ${d.bathroomsMin !== undefined ? d.bathroomsMin : cur.bathrooms_min},
          property_type = ${d.propertyType !== undefined ? (d.propertyType || null) : cur.property_type},
          notify_email = ${d.notifyEmail !== undefined ? d.notifyEmail : cur.notify_email},
          notify_sms = ${d.notifySms !== undefined ? d.notifySms : cur.notify_sms},
          notify_in_app = ${d.notifyInApp !== undefined ? d.notifyInApp : cur.notify_in_app},
          is_active = ${d.isActive !== undefined ? d.isActive : cur.is_active}
        WHERE id = ${alertId} AND user_id = ${req.user.id}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update listing alert" });
    }
  });

  app.delete("/api/listing-alerts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const alertId = parseInt(req.params.id, 10);
    if (!Number.isFinite(alertId)) return res.status(400).json({ error: "Invalid ID" });

    try {
      const result = await db.execute(sql`DELETE FROM listing_alerts WHERE id = ${alertId} AND user_id = ${req.user.id} RETURNING id`);
      if (result.rows.length === 0) return res.status(404).json({ error: "Alert not found" });
      await db.execute(sql`DELETE FROM listing_alert_results WHERE alert_id = ${alertId}`);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete listing alert" });
    }
  });

  app.get("/api/listing-alerts/:id/results", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const alertId = parseInt(req.params.id, 10);
    if (!Number.isFinite(alertId)) return res.status(400).json({ error: "Invalid ID" });

    try {
      const alertCheck = await db.execute(sql`SELECT id FROM listing_alerts WHERE id = ${alertId} AND user_id = ${req.user.id}`);
      if (alertCheck.rows.length === 0) return res.status(404).json({ error: "Alert not found" });

      const result = await db.execute(sql`
        SELECT * FROM listing_alert_results WHERE alert_id = ${alertId} ORDER BY notified_at DESC LIMIT 50
      `);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alert results" });
    }
  });

  app.get("/api/agents", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    try {
      const result = await db.execute(sql`
        SELECT id, first_name, last_name, role, brokerage_name, license_state, 
               verification_status, profile_photo_url, profile_bio
        FROM users WHERE role IN ('agent', 'broker') AND email_verified = true
        ORDER BY 
          CASE verification_status 
            WHEN 'admin_verified' THEN 1 
            WHEN 'broker_verified' THEN 2 
            WHEN 'payment_verified' THEN 3 
            WHEN 'licensed' THEN 4 
            ELSE 5 
          END ASC,
          first_name ASC
      `);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  // ============ Listing Photos & Active Listings ============

  app.get("/api/profile/:id/listings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const agentId = parseInt(req.params.id, 10);
    if (!Number.isFinite(agentId) || agentId <= 0) return res.status(400).json({ error: "Invalid ID" });
    try {
      const result = await db.execute(sql`
        SELECT t.id, t.street_name, t.city, t.state, t.zip_code, t.status, t.type,
               t.contract_price, t.mls_number,
               COALESCE(
                 (SELECT json_agg(json_build_object('id', lp.id, 'photoUrl', lp.photo_url, 'caption', lp.caption, 'sortOrder', lp.sort_order) ORDER BY lp.sort_order)
                  FROM listing_photos lp WHERE lp.transaction_id = t.id),
                 '[]'::json
               ) AS photos
        FROM transactions t
        WHERE t.agent_id = ${agentId}
          AND LOWER(t.status) NOT IN ('closed', 'cancelled', 'withdrawn', 'expired')
          AND t.type = 'sell'
          AND t.street_name IS NOT NULL
        ORDER BY t.updated_at DESC NULLS LAST
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  app.post("/api/listing-photos/:transactionId", upload.single("photo"), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.status(403).json({ error: "Agents/brokers only" });
    const transactionId = parseInt(req.params.transactionId, 10);
    if (!Number.isFinite(transactionId) || transactionId <= 0) return res.status(400).json({ error: "Invalid transaction ID" });
    try {
      const txn = await storage.getTransaction(transactionId);
      if (!txn || txn.agentId !== req.user.id) return res.status(403).json({ error: "Not your transaction" });
      const closedStatuses = ["closed", "cancelled", "withdrawn", "expired"];
      if (closedStatuses.includes(txn.status.toLowerCase())) return res.status(400).json({ error: "Cannot add photos to closed listing" });
      if (!req.file) return res.status(400).json({ error: "No photo provided" });
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(req.file.mimetype)) return res.status(400).json({ error: "Invalid file type. Upload an image (JPEG, PNG, or WebP)." });
      if (req.file.size > 5 * 1024 * 1024) return res.status(400).json({ error: "Image too large. Maximum 5MB." });
      const sharp = (await import("sharp")).default;
      const processed = await sharp(req.file.buffer).resize(800, 600, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
      const base64 = `data:image/jpeg;base64,${processed.toString("base64")}`;
      const caption = typeof req.body.caption === "string" ? req.body.caption : null;
      const result = await db.execute(sql`
        INSERT INTO listing_photos (transaction_id, agent_id, photo_url, caption, sort_order)
        VALUES (${transactionId}, ${req.user.id}, ${base64}, ${caption},
          COALESCE((SELECT MAX(sort_order) + 1 FROM listing_photos WHERE transaction_id = ${transactionId}), 0))
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error uploading listing photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  app.delete("/api/listing-photos/:photoId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const photoId = parseInt(req.params.photoId, 10);
    if (!Number.isFinite(photoId) || photoId <= 0) return res.status(400).json({ error: "Invalid photo ID" });
    try {
      const result = await db.execute(sql`
        DELETE FROM listing_photos WHERE id = ${photoId} AND agent_id = ${req.user.id} RETURNING id
      `);
      if (result.rows.length === 0) return res.status(404).json({ error: "Photo not found or not yours" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // ============ Verified Listings (Auto-Discovered) ============

  app.get("/api/profile/:id/verified-listings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const agentId = parseInt(req.params.id, 10);
    if (!Number.isFinite(agentId) || agentId <= 0) return res.status(400).json({ error: "Invalid ID" });

    try {
      const agent = await storage.getUser(agentId);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      if (agent.role !== "agent" && agent.role !== "broker") {
        return res.json({ listings: [], message: "Only agents/brokers have verified listings" });
      }
      if (agent.verificationStatus === "unverified") {
        return res.json({ listings: [], message: "Agent is not verified" });
      }

      const agentFullName = `${agent.firstName || ''} ${agent.lastName || ''}`.trim();
      if (!agentFullName) {
        return res.json({ listings: [], message: "Agent name not available" });
      }

      const existingListings = await db.execute(sql`
        SELECT * FROM verified_listings WHERE agent_id = ${agentId} ORDER BY created_at DESC
      `);

      const STALE_HOURS = 24;
      let needsRefresh = existingListings.rows.length === 0;
      if (!needsRefresh && existingListings.rows.length > 0) {
        const lastVerified = existingListings.rows[0].last_verified_at;
        if (lastVerified) {
          const hoursSinceVerified = (Date.now() - new Date(lastVerified as string).getTime()) / (1000 * 60 * 60);
          needsRefresh = hoursSinceVerified >= STALE_HOURS;
        }
      }

      if (needsRefresh) {
        if (RENTCAST_DEV_BLOCK) {
          console.log("[RentCast] Verified listings refresh blocked in development mode");
          needsRefresh = false;
        }

        const apiKey = process.env.RENTCAST_API_KEY;
        if (!apiKey || !needsRefresh) {
          if (existingListings.rows.length > 0) {
            const listingsWithMarketing = await enrichListingsWithMarketing(existingListings.rows);
            return res.json({ listings: listingsWithMarketing, fromCache: true });
          }
          if (!needsRefresh) return res.json({ listings: [], message: "RentCast API calls blocked in development" });
          return res.json({ listings: [], message: "RentCast API key not configured" });
        }

        let verifiedCallCount = await getRentcastCallCount();
        if (verifiedCallCount >= MONTHLY_LIMIT) {
          if (existingListings.rows.length > 0) {
            const listingsWithMarketing = await enrichListingsWithMarketing(existingListings.rows);
            return res.json({ listings: listingsWithMarketing, fromCache: true });
          }
          return res.json({ listings: [], message: "Monthly API limit reached" });
        }

        const searchCities: string[] = [];
        const txnCities = await db.execute(sql`
          SELECT DISTINCT city FROM transactions 
          WHERE agent_id = ${agentId} AND city IS NOT NULL AND city != '' 
          LIMIT 3
        `);
        for (const row of txnCities.rows) {
          if (row.city) searchCities.push(String(row.city));
        }

        if (searchCities.length === 0 && agent.licenseState) {
          searchCities.push('');
        }

        const { fuzzyNameMatch } = await import("./license-verification");
        const matchedListings: any[] = [];

        for (const city of searchCities) {
          verifiedCallCount = await getRentcastCallCount();
          if (verifiedCallCount >= MONTHLY_LIMIT) break;

          const params = new URLSearchParams();
          if (city) params.set("city", city);
          if (agent.licenseState) params.set("state", agent.licenseState);
          params.set("status", "Active");
          params.set("limit", "500");

          const cacheKey = `verified:agent-${agentId}-${buildListingsCacheKey(params)}`;
          const cachedVerified = await getCached(cacheKey);
          let listings: any[];

          if (cachedVerified) {
            listings = cachedVerified;
          } else {
            try {
              const url = `https://api.rentcast.io/v1/listings/sale?${params.toString()}`;
              console.log(`[VerifiedListings] RentCast API call #${verifiedCallCount + 1} for agent ${agentId}: ${url}`);
              const response = await fetch(url, {
                headers: { "X-Api-Key": apiKey, "Accept": "application/json" }
              });
              if (!response.ok) {
                console.error(`[VerifiedListings] RentCast error: ${response.status}`);
                continue;
              }
              listings = await response.json();
              await incrementRentcastCallCount();
              await setCache(cacheKey, listings, "verified");
            } catch (e) {
              console.error("[VerifiedListings] RentCast fetch error:", e);
              continue;
            }
          }

          if (!Array.isArray(listings)) continue;

          for (const listing of listings) {
            const listingAgentName = listing.listingAgent?.name || listing.listedByAgentName || '';
            if (!listingAgentName) continue;

            const match = fuzzyNameMatch(agentFullName, listingAgentName);
            if (match.score >= 0.7) {
              matchedListings.push(listing);
            }
          }
        }

        await db.execute(sql`
          UPDATE verified_listings SET last_verified_at = NOW() WHERE agent_id = ${agentId}
        `);

        for (const listing of matchedListings) {
          const addr = listing.formattedAddress || listing.addressLine1 || '';
          const mlsNum = listing.mlsNumber || listing.id || '';

          const existing = await db.execute(sql`
            SELECT id FROM verified_listings 
            WHERE agent_id = ${agentId} AND (mls_number = ${mlsNum} OR address = ${addr})
            LIMIT 1
          `);

          if (existing.rows.length > 0) {
            await db.execute(sql`
              UPDATE verified_listings SET
                price = ${listing.price || null},
                listing_status = ${listing.status || 'Active'},
                rentcast_data = ${JSON.stringify(listing)}::json,
                last_verified_at = NOW()
              WHERE id = ${existing.rows[0].id}
            `);
          } else {
            await db.execute(sql`
              INSERT INTO verified_listings (agent_id, mls_number, address, city, state, zip_code, price, bedrooms, bathrooms, square_feet, property_type, listing_agent_name, listing_agent_phone, listing_agent_email, photo_url, listing_status, rentcast_data, last_verified_at)
              VALUES (${agentId}, ${mlsNum}, ${addr}, ${listing.city || null}, ${listing.state || null}, ${listing.zipCode || null}, ${listing.price || null}, ${listing.bedrooms || null}, ${listing.bathrooms || null}, ${listing.squareFootage || null}, ${listing.propertyType || null}, ${listing.listingAgent?.name || null}, ${listing.listingAgent?.phone || null}, ${listing.listingAgent?.email || null}, ${listing.photos?.[0] || null}, ${listing.status || 'Active'}, ${JSON.stringify(listing)}::json, NOW())
            `);
          }
        }

        if (matchedListings.length > 0) {
          const mlsIds = matchedListings.map(l => l.mlsNumber || l.id || '');
          const removed = await db.execute(sql`
            DELETE FROM verified_listings 
            WHERE agent_id = ${agentId} 
              AND mls_number IS NOT NULL 
              AND mls_number NOT IN (${sql.join(mlsIds.map(id => sql`${id}`), sql`,`)})
              AND last_verified_at < NOW() - INTERVAL '48 hours'
            RETURNING id
          `);
          if (removed.rows.length > 0) {
            console.log(`[VerifiedListings] Removed ${removed.rows.length} stale listings for agent ${agentId}`);
          }
        }
      }

      const finalListings = await db.execute(sql`
        SELECT * FROM verified_listings WHERE agent_id = ${agentId} ORDER BY created_at DESC
      `);

      const listingsWithMarketing = await enrichListingsWithMarketing(finalListings.rows);
      res.json({ listings: listingsWithMarketing, fromCache: !needsRefresh });

    } catch (error) {
      console.error("Error fetching verified listings:", error);
      res.status(500).json({ error: "Failed to fetch verified listings" });
    }
  });

  async function enrichListingsWithMarketing(listings: any[]) {
    const result = [];
    for (const listing of listings) {
      const marketing = await db.execute(sql`
        SELECT * FROM listing_marketing WHERE verified_listing_id = ${listing.id} LIMIT 1
      `);
      const photos = await db.execute(sql`
        SELECT * FROM listing_marketing_photos WHERE verified_listing_id = ${listing.id} ORDER BY sort_order
      `);
      result.push({
        ...listing,
        marketing: marketing.rows[0] || null,
        marketingPhotos: photos.rows || [],
      });
    }
    return result;
  }

  app.get("/api/verified-listings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid ID" });
    try {
      const listing = await db.execute(sql`SELECT * FROM verified_listings WHERE id = ${id}`);
      if (listing.rows.length === 0) return res.status(404).json({ error: "Listing not found" });

      const marketing = await db.execute(sql`
        SELECT * FROM listing_marketing WHERE verified_listing_id = ${id} LIMIT 1
      `);
      const photos = await db.execute(sql`
        SELECT * FROM listing_marketing_photos WHERE verified_listing_id = ${id} ORDER BY sort_order
      `);
      const agent = await storage.getUser(listing.rows[0].agent_id as number);

      res.json({
        ...listing.rows[0],
        marketing: marketing.rows[0] || null,
        marketingPhotos: photos.rows || [],
        agent: agent ? {
          id: agent.id,
          firstName: agent.firstName,
          lastName: agent.lastName,
          profilePhotoUrl: agent.profilePhotoUrl,
          profilePhone: agent.profilePhone,
          email: agent.email,
          brokerageName: agent.brokerageName,
          verificationStatus: agent.verificationStatus,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching verified listing:", error);
      res.status(500).json({ error: "Failed to fetch listing" });
    }
  });

  app.put("/api/verified-listings/:id/marketing", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.status(403).json({ error: "Agents/brokers only" });
    const listingId = parseInt(req.params.id, 10);
    if (!Number.isFinite(listingId) || listingId <= 0) return res.status(400).json({ error: "Invalid ID" });

    const schema = z.object({
      youtubeUrl: z.string().max(500).nullable().optional(),
      matterportUrl: z.string().max(500).nullable().optional(),
      description: z.string().max(5000).nullable().optional(),
      floorplanPdf: z.string().nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });

    try {
      const listing = await db.execute(sql`SELECT agent_id FROM verified_listings WHERE id = ${listingId}`);
      if (listing.rows.length === 0) return res.status(404).json({ error: "Listing not found" });
      if (listing.rows[0].agent_id !== req.user.id) return res.status(403).json({ error: "Not your listing" });

      if (parsed.data.floorplanPdf) {
        const pdfSize = Buffer.byteLength(parsed.data.floorplanPdf, 'utf8');
        if (pdfSize > 7 * 1024 * 1024) {
          return res.status(400).json({ error: "Floorplan PDF too large. Maximum 5MB." });
        }
      }

      const existing = await db.execute(sql`
        SELECT id FROM listing_marketing WHERE verified_listing_id = ${listingId} LIMIT 1
      `);

      if (existing.rows.length > 0) {
        await db.execute(sql`
          UPDATE listing_marketing SET
            youtube_url = COALESCE(${parsed.data.youtubeUrl ?? null}, youtube_url),
            matterport_url = COALESCE(${parsed.data.matterportUrl ?? null}, matterport_url),
            description = COALESCE(${parsed.data.description ?? null}, description),
            floorplan_pdf = COALESCE(${parsed.data.floorplanPdf ?? null}, floorplan_pdf),
            updated_at = NOW()
          WHERE verified_listing_id = ${listingId}
        `);
      } else {
        await db.execute(sql`
          INSERT INTO listing_marketing (verified_listing_id, agent_id, youtube_url, matterport_url, description, floorplan_pdf)
          VALUES (${listingId}, ${req.user.id}, ${parsed.data.youtubeUrl || null}, ${parsed.data.matterportUrl || null}, ${parsed.data.description || null}, ${parsed.data.floorplanPdf || null})
        `);
      }

      const result = await db.execute(sql`SELECT * FROM listing_marketing WHERE verified_listing_id = ${listingId} LIMIT 1`);
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating listing marketing:", error);
      res.status(500).json({ error: "Failed to update marketing materials" });
    }
  });

  app.post("/api/verified-listings/:id/photos", upload.single("photo"), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.status(403).json({ error: "Agents/brokers only" });
    const listingId = parseInt(req.params.id, 10);
    if (!Number.isFinite(listingId) || listingId <= 0) return res.status(400).json({ error: "Invalid ID" });

    try {
      const listing = await db.execute(sql`SELECT agent_id FROM verified_listings WHERE id = ${listingId}`);
      if (listing.rows.length === 0) return res.status(404).json({ error: "Listing not found" });
      if (listing.rows[0].agent_id !== req.user.id) return res.status(403).json({ error: "Not your listing" });

      if (!req.file) return res.status(400).json({ error: "No photo provided" });
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(req.file.mimetype)) return res.status(400).json({ error: "Invalid file type" });
      if (req.file.size > 5 * 1024 * 1024) return res.status(400).json({ error: "Image too large. Maximum 5MB." });

      const sharp = (await import("sharp")).default;
      const processed = await sharp(req.file.buffer).resize(1200, 800, { fit: "cover" }).jpeg({ quality: 85 }).toBuffer();
      const base64 = `data:image/jpeg;base64,${processed.toString("base64")}`;
      const caption = typeof req.body.caption === "string" ? req.body.caption : null;

      const result = await db.execute(sql`
        INSERT INTO listing_marketing_photos (verified_listing_id, agent_id, photo_url, caption, sort_order)
        VALUES (${listingId}, ${req.user.id}, ${base64}, ${caption},
          COALESCE((SELECT MAX(sort_order) + 1 FROM listing_marketing_photos WHERE verified_listing_id = ${listingId}), 0))
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error uploading listing marketing photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  app.delete("/api/verified-listings/photos/:photoId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const photoId = parseInt(req.params.photoId, 10);
    if (!Number.isFinite(photoId) || photoId <= 0) return res.status(400).json({ error: "Invalid ID" });
    try {
      const result = await db.execute(sql`
        DELETE FROM listing_marketing_photos WHERE id = ${photoId} AND agent_id = ${req.user.id} RETURNING id
      `);
      if (result.rows.length === 0) return res.status(404).json({ error: "Photo not found or not yours" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  app.post("/api/verified-listings/:id/photos/bulk", upload.array("photos", 20), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const role = req.user.role;
    if (role !== "agent" && role !== "broker") return res.status(403).json({ error: "Only agents/brokers can upload photos" });
    const listingId = parseInt(req.params.id, 10);
    if (!Number.isFinite(listingId) || listingId <= 0) return res.status(400).json({ error: "Invalid listing ID" });
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });
    try {
      const listing = await db.execute(sql`SELECT agent_id FROM verified_listings WHERE id = ${listingId}`);
      if (listing.rows.length === 0) return res.status(404).json({ error: "Listing not found" });
      if (listing.rows[0].agent_id !== req.user.id) return res.status(403).json({ error: "Not your listing" });

      const maxOrder = await db.execute(sql`SELECT COALESCE(MAX(sort_order), -1) as max_order FROM listing_marketing_photos WHERE verified_listing_id = ${listingId}`);
      let nextOrder = (maxOrder.rows[0]?.max_order ?? -1) + 1;

      const inserted = [];
      for (const file of files) {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        const result = await db.execute(sql`
          INSERT INTO listing_marketing_photos (verified_listing_id, agent_id, photo_url, sort_order)
          VALUES (${listingId}, ${req.user.id}, ${base64}, ${nextOrder++})
          RETURNING id, photo_url, sort_order
        `);
        inserted.push(result.rows[0]);
      }
      res.json({ success: true, photos: inserted, count: inserted.length });
    } catch (error) {
      console.error("Bulk photo upload error:", error);
      res.status(500).json({ error: "Failed to upload photos" });
    }
  });

  app.put("/api/verified-listings/:id/photos/reorder", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const listingId = parseInt(req.params.id, 10);
    if (!Number.isFinite(listingId) || listingId <= 0) return res.status(400).json({ error: "Invalid listing ID" });
    const schema = z.object({ photoIds: z.array(z.number().int().positive()) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid photo order data" });
    try {
      const listing = await db.execute(sql`SELECT agent_id FROM verified_listings WHERE id = ${listingId}`);
      if (listing.rows.length === 0) return res.status(404).json({ error: "Listing not found" });
      if (listing.rows[0].agent_id !== req.user.id) return res.status(403).json({ error: "Not your listing" });

      for (let i = 0; i < parsed.data.photoIds.length; i++) {
        await db.execute(sql`
          UPDATE listing_marketing_photos SET sort_order = ${i}
          WHERE id = ${parsed.data.photoIds[i]} AND verified_listing_id = ${listingId}
        `);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder photos" });
    }
  });

  app.post("/api/verified-listings/:id/report", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const listingId = parseInt(req.params.id, 10);
    if (!Number.isFinite(listingId) || listingId <= 0) return res.status(400).json({ error: "Invalid ID" });
    const schema = z.object({ reason: z.string().min(5).max(500) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Please provide a reason (5-500 characters)" });

    try {
      const listing = await db.execute(sql`SELECT id FROM verified_listings WHERE id = ${listingId}`);
      if (listing.rows.length === 0) return res.status(404).json({ error: "Listing not found" });

      const existingReport = await db.execute(sql`
        SELECT id FROM listing_reports WHERE verified_listing_id = ${listingId} AND reported_by = ${req.user.id} LIMIT 1
      `);
      if (existingReport.rows.length > 0) return res.status(400).json({ error: "You've already reported this listing" });

      await db.execute(sql`
        INSERT INTO listing_reports (verified_listing_id, reported_by, reason)
        VALUES (${listingId}, ${req.user.id}, ${parsed.data.reason})
      `);
      res.json({ success: true, message: "Report submitted for review" });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit report" });
    }
  });

  const SOCRATA_CRIME_SOURCES: Record<string, { domain: string; dataset: string; latField: string; lngField: string; typeField: string; locationField: string; dateField: string }> = {
    "chicago": { domain: "data.cityofchicago.org", dataset: "crimes", latField: "latitude", lngField: "longitude", typeField: "primary_type", locationField: "location", dateField: "date" },
    "san francisco": { domain: "data.sfgov.org", dataset: "wg3w-h783", latField: "latitude", lngField: "longitude", typeField: "incident_category", locationField: "point", dateField: "incident_date" },
    "los angeles": { domain: "data.lacity.org", dataset: "2nrs-mtv8", latField: "lat", lngField: "lon", typeField: "crm_cd_desc", locationField: "location", dateField: "date_occ" },
    "new york": { domain: "data.cityofnewyork.us", dataset: "5uac-w243", latField: "latitude", lngField: "longitude", typeField: "ofns_desc", locationField: "loc_of_occur_desc", dateField: "cmplnt_fr_dt" },
    "seattle": { domain: "data.seattle.gov", dataset: "tazs-3rd5", latField: "latitude", lngField: "longitude", typeField: "offense", locationField: "_100_block_address", dateField: "offense_start_datetime" },
    "denver": { domain: "data.denvergov.org", dataset: "j6g8-fkyh", latField: "geo_lat", lngField: "geo_lon", typeField: "offense_category_id", locationField: "geo_x", dateField: "first_occurrence_date" },
    "portland": { domain: "data.portland.gov", dataset: "9pha-t5dv", latField: "openlat", lngField: "openlon", typeField: "offensecategory", locationField: "openlat", dateField: "reportdatetime" },
    "philadelphia": { domain: "phl.carto.com", dataset: "incidents_part1_part2", latField: "lat", lngField: "lng", typeField: "text_general_code", locationField: "shape", dateField: "dispatch_date" },
    "dallas": { domain: "www.dallasopendata.com", dataset: "qv6i-rri7", latField: "geocoded_column.latitude", lngField: "geocoded_column.longitude", typeField: "nibrs_crime_category", locationField: "geocoded_column", dateField: "date1" },
    "houston": { domain: "data.houstontx.gov", dataset: "2acm-fvke", latField: "maplatitude", lngField: "maplongitude", typeField: "offensecount", locationField: "maplatitude", dateField: "date" },
    "austin": { domain: "data.austintexas.gov", dataset: "fdj4-gpfu", latField: "", lngField: "", typeField: "crime_type", locationField: "", dateField: "occ_date" },
  };

  function findCrimeSource(city: string, state: string): typeof SOCRATA_CRIME_SOURCES[string] | null {
    const cityLower = city.toLowerCase().trim();
    const stateUpper = (state || "").toUpperCase().trim();
    if (SOCRATA_CRIME_SOURCES[cityLower] && SOCRATA_CRIME_SOURCES[cityLower].latField) {
      return SOCRATA_CRIME_SOURCES[cityLower];
    }
    if (cityLower.includes("new york") || cityLower.includes("manhattan") || cityLower.includes("brooklyn") || cityLower.includes("queens") || cityLower.includes("bronx")) {
      return SOCRATA_CRIME_SOURCES["new york"];
    }
    if (cityLower.includes("los angeles") || cityLower === "la") return SOCRATA_CRIME_SOURCES["los angeles"];
    if (cityLower.includes("san francisco") || cityLower === "sf") return SOCRATA_CRIME_SOURCES["san francisco"];
    return null;
  }

  app.get("/api/crime-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const city = (req.query.city as string) || "";
    const state = (req.query.state as string) || "";
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ error: "Invalid coordinates" });

    const source = findCrimeSource(city, state);
    if (!source) {
      return res.json({ available: false, city, message: "Crime data not available for this area yet" });
    }

    try {
      const radius = 1500;
      const url = `https://${source.domain}/resource/${source.dataset}.json?$limit=500&$select=${source.typeField},${source.latField},${source.lngField}&$where=within_circle(${source.locationField},${lat},${lng},${radius}) AND ${source.latField} IS NOT NULL&$order=${source.dateField} DESC`;
      const response = await fetch(url, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`Socrata API returned ${response.status}`);
      const data = await response.json();

      const incidents = (data as any[]).map((item: any) => ({
        lat: parseFloat(item[source.latField]),
        lng: parseFloat(item[source.lngField]),
        type: item[source.typeField] || "Unknown",
      })).filter((i: any) => Number.isFinite(i.lat) && Number.isFinite(i.lng));

      const typeCounts: Record<string, number> = {};
      incidents.forEach((i: any) => {
        typeCounts[i.type] = (typeCounts[i.type] || 0) + 1;
      });
      const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

      res.json({ available: true, city, totalIncidents: incidents.length, incidents, topTypes, source: `${city} Open Data Portal` });
    } catch (error: any) {
      console.error("Crime data fetch error:", error.message);
      res.json({ available: false, city, message: "Could not fetch crime data at this time" });
    }
  });

  app.get("/api/profile/:id/service-areas", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const agentId = parseInt(req.params.id, 10);
    if (!Number.isFinite(agentId) || agentId <= 0) return res.status(400).json({ error: "Invalid ID" });
    try {
      const citiesResult = await db.execute(sql`
        SELECT city, state, COUNT(*)::int as transaction_count
        FROM transactions
        WHERE agent_id = ${agentId} AND city IS NOT NULL AND city != ''
        GROUP BY city, state
        ORDER BY transaction_count DESC
        LIMIT 10
      `);
      const agentResult = await db.execute(sql`
        SELECT license_state FROM users WHERE id = ${agentId}
      `);
      const licenseState = agentResult.rows[0]?.license_state || null;
      const totalResult = await db.execute(sql`
        SELECT COUNT(*)::int as total,
               COUNT(CASE WHEN status = 'closed' THEN 1 END)::int as closed
        FROM transactions WHERE agent_id = ${agentId}
      `);
      res.json({
        cities: citiesResult.rows.map((r: any) => ({
          city: r.city,
          state: r.state,
          transactionCount: r.transaction_count,
        })),
        licenseState,
        totalTransactions: totalResult.rows[0]?.total || 0,
        closedTransactions: totalResult.rows[0]?.closed || 0,
      });
    } catch (error) {
      console.error("Error fetching service areas:", error);
      res.status(500).json({ error: "Failed to fetch service areas" });
    }
  });

  app.post("/api/profile/:id/contact", async (req, res) => {
    const agentId = parseInt(req.params.id, 10);
    if (!Number.isFinite(agentId) || agentId <= 0) return res.status(400).json({ error: "Invalid ID" });
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Name, email, and message are required" });
    }
    if (typeof name !== "string" || name.length > 100 ||
        typeof email !== "string" || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof message !== "string" || message.length > 2000) {
      return res.status(400).json({ error: "Invalid input" });
    }
    try {
      const agentResult = await db.execute(sql`
        SELECT id, email, first_name, last_name FROM users WHERE id = ${agentId} AND role IN ('agent', 'broker')
      `);
      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: "Agent not found" });
      }
      const agent = agentResult.rows[0] as any;
      await notify(agentId, "profile_contact", "New Contact Request",
        `${name} (${email}${phone ? ', ' + phone : ''}) sent you a message from your profile: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`
      );
      res.json({ success: true, message: "Your message has been sent" });
    } catch (error) {
      console.error("Error sending profile contact:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  (async () => {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS platform_inquiries (
          id SERIAL PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT,
          email TEXT NOT NULL,
          phone TEXT,
          topic TEXT DEFAULT 'general',
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    } catch (e) {
      console.error("Failed to ensure platform_inquiries table:", e);
    }
  })();

  app.post("/api/platform/contact", async (req, res) => {
    const { firstName, lastName, email, phone, message, topic } = req.body;
    if (!firstName || !email || !message) {
      return res.status(400).json({ error: "First name, email, and message are required" });
    }
    if (typeof firstName !== "string" || firstName.length > 100 ||
        typeof email !== "string" || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof message !== "string" || message.length > 2000) {
      return res.status(400).json({ error: "Invalid input" });
    }
    try {
      await db.execute(sql`
        INSERT INTO platform_inquiries (first_name, last_name, email, phone, topic, message)
        VALUES (${firstName}, ${lastName || ""}, ${email}, ${phone || ""}, ${topic || "general"}, ${message})
      `);
      const adminResult = await db.execute(sql`
        SELECT id FROM users WHERE role = 'admin' LIMIT 1
      `);
      if (adminResult.rows.length > 0) {
        const adminId = adminResult.rows[0].id as number;
        await notify(adminId, "platform_contact", "New Platform Inquiry",
          `${firstName} ${lastName || ""} (${email}) - ${topic || "general"}: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`
        );
      }
      res.json({ success: true, message: "Your message has been sent" });
    } catch (error) {
      console.error("Error saving platform contact:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/profile/:id/reviews", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const agentId = parseInt(req.params.id, 10);
    if (!Number.isFinite(agentId) || agentId <= 0) return res.status(400).json({ error: "Invalid ID" });
    try {
      const reviewsResult = await db.execute(sql`
        SELECT ar.id, ar.rating, ar.title, ar.comment, ar.created_at,
               u.first_name || ' ' || LEFT(u.last_name, 1) || '.' AS reviewer_name
        FROM agent_reviews ar
        LEFT JOIN users u ON u.id = ar.reviewer_id
        WHERE ar.agent_id = ${agentId} AND ar.is_public = true
        ORDER BY ar.created_at DESC
        LIMIT 5
      `);
      const avgResult = await db.execute(sql`
        SELECT AVG(rating)::float as avg_rating, COUNT(*)::int as review_count
        FROM agent_reviews WHERE agent_id = ${agentId} AND is_public = true
      `);
      const { avg_rating, review_count } = avgResult.rows[0] || { avg_rating: 0, review_count: 0 };
      res.json({
        reviews: reviewsResult.rows.map((r: any) => ({
          id: r.id,
          rating: Number(r.rating),
          title: r.title,
          comment: r.comment,
          createdAt: r.created_at,
          reviewerName: r.reviewer_name || "Anonymous",
        })),
        avgRating: avg_rating || 0,
        reviewCount: review_count || 0,
      });
    } catch (error) {
      console.error("Error fetching profile reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // ============ Gmail Bulk Actions ============
  app.post("/api/gmail/batch-modify", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    const schema = z.object({
      messageIds: z.array(z.string()).min(1),
      addLabelIds: z.array(z.string()).optional(),
      removeLabelIds: z.array(z.string()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });
    const result = await batchModifyMessages(req.user.id, parsed.data.messageIds, parsed.data.addLabelIds, parsed.data.removeLabelIds);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json({ success: true });
  });

  app.post("/api/gmail/trash", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    const schema = z.object({
      messageIds: z.array(z.string()).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });
    const result = await trashMessages(req.user.id, parsed.data.messageIds);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json({ success: true });
  });

  app.get("/api/gmail/labels", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    const result = await getGmailLabels(req.user.id);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result.labels);
  });

  app.post("/api/gmail/sync-calendar", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userTransactions = await storage.getTransactionsByUser(req.user.id);
      const transactionsWithDates = userTransactions.filter(
        (t: any) => t.closingDate || t.optionPeriodExpiration
      );

      if (transactionsWithDates.length === 0) {
        return res.json({ synced: 0, errors: 0, message: "No transactions with dates to sync" });
      }

      const result = await syncAllTransactionsToGoogleCalendar(req.user.id, transactionsWithDates);
      if (result.error) {
        if (result.error.includes("expired") || result.error.includes("reconnect")) {
          return res.status(400).json({ error: "Your Google connection needs to be refreshed. Please disconnect and reconnect your Google account in Settings to grant calendar permissions." });
        }
        return res.status(400).json({ error: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Calendar sync endpoint error:", error?.message);
      const msg = error.message || "Calendar sync failed";
      if (msg.includes("insufficient") || msg.includes("scope") || msg.includes("403") || msg.includes("calendar")) {
        return res.status(400).json({ error: "Calendar permissions not granted. Please disconnect and reconnect your Google account in Settings to enable calendar sync." });
      }
      res.status(500).json({ error: msg });
    }
  });

  // ============ SignNow e-Signature ============
  app.get("/api/signnow/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const configured = isSignNowConfigured();
      if (!configured) return res.json({ configured: false, connected: false });
      const status = await getSignNowStatus(req.user.id);
      res.json({ configured: true, ...status });
    } catch (error: any) {
      res.json({ configured: false, connected: false });
    }
  });

  app.get("/api/signnow/auth-url", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const crypto = await import("crypto");
      const nonce = crypto.randomBytes(32).toString("hex");
      (req.session as any).signnowOAuthState = nonce;
      (req.session as any).signnowOAuthUserId = req.user.id;
      const url = getSignNowAuthUrl(nonce);
      res.json({ url });
    } catch (error: any) {
      console.error("Error generating SignNow auth URL:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  app.get("/api/signnow/callback", async (req, res) => {
    const code = req.query.code as string;
    const state = req.query.state as string;

    const sendCallbackPage = (success: boolean, message: string) => {
      res.send(`<!DOCTYPE html><html><head><title>SignNow Connection</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;color:#111}div{text-align:center;padding:2rem;border-radius:12px;background:white;box-shadow:0 1px 3px rgba(0,0,0,.1);max-width:400px}h2{margin:0 0 .5rem}p{color:#6b7280;margin:.5rem 0}</style></head><body><div><h2>${success ? "Connected!" : "Connection Failed"}</h2><p>${message}</p><p style="font-size:14px;color:#9ca3af">You can close this tab and return to HomeBase.</p></div></body></html>`);
    };

    if (!code || !state) {
      return sendCallbackPage(false, "Missing authorization code. Please try again from Settings.");
    }

    const sessionState = (req.session as any).signnowOAuthState;
    const userId = (req.session as any).signnowOAuthUserId;

    if (!sessionState || !userId || state !== sessionState) {
      console.error("SignNow OAuth state mismatch");
      return sendCallbackPage(false, "Session expired or state mismatch. Please try again from Settings.");
    }

    delete (req.session as any).signnowOAuthState;
    delete (req.session as any).signnowOAuthUserId;

    try {
      await handleSignNowCallback(code, userId);
      await logSignNowAction(userId, "account_connected", { ipAddress: req.ip, userAgent: req.get("user-agent") || undefined });
      sendCallbackPage(true, "Your SignNow account has been connected successfully.");
    } catch (error: any) {
      console.error("SignNow callback error:", error);
      sendCallbackPage(false, "Something went wrong connecting your account. Please try again.");
    }
  });

  app.post("/api/signnow/disconnect", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      await logSignNowAction(req.user.id, "account_disconnected", { ipAddress: req.ip, userAgent: req.get("user-agent") || undefined });
      await disconnectSignNow(req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to disconnect SignNow" });
    }
  });

  app.post("/api/signnow/upload", upload.single("file"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    try {
      const result = await snUploadDocument(req.user.id, req.file.buffer, req.file.originalname);
      await logSignNowAction(req.user.id, "document_uploaded", {
        documentId: result.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
        metadata: { fileName: req.file.originalname, fileSize: req.file.size },
      });
      res.json(result);
    } catch (error: any) {
      console.error("SignNow upload error:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to upload document" });
    }
  });

  app.post("/api/signnow/invite", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    const schema = z.object({
      documentId: z.string().min(1),
      signerEmail: z.string().email(),
      signerRole: z.string().optional(),
      consentAcknowledged: z.literal(true, { errorMap: () => ({ message: "You must acknowledge the e-signature consent to proceed" }) }),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });
    try {
      const result = await sendSigningInvite(req.user.id, parsed.data.documentId, parsed.data.signerEmail, parsed.data.signerRole);
      await logSignNowAction(req.user.id, "signing_invite_sent", {
        documentId: parsed.data.documentId,
        signerEmail: parsed.data.signerEmail,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
        metadata: { consentAcknowledged: true, signerRole: parsed.data.signerRole },
      });
      res.json(result);
    } catch (error: any) {
      console.error("SignNow invite error:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to send invite" });
    }
  });

  app.get("/api/signnow/documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const docs = await snGetDocuments(req.user.id);
      res.json(docs);
    } catch (error: any) {
      console.error("SignNow list docs error:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to list documents" });
    }
  });

  app.get("/api/signnow/document/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const status = await snGetDocumentStatus(req.user.id, req.params.id);
      res.json(status);
    } catch (error: any) {
      console.error("SignNow doc status error:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to get document status" });
    }
  });

  app.get("/api/signnow/document/:id/download", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const pdfBuffer = await snDownloadDocument(req.user.id, req.params.id);
      await logSignNowAction(req.user.id, "document_downloaded", {
        documentId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="document.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("SignNow download error:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to download document" });
    }
  });

  // ============ Firma e-Signature (Embedded) ============
  app.get("/api/firma/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      res.json({ configured: isFirmaConfigured() });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get Firma status" });
    }
  });

  app.get("/api/firma/editor-script", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json({ url: getEditorScriptUrl() });
  });

  app.post("/api/firma/signing-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { title, message, transactionId, document: documentBase64 } = req.body;
      if (!title || typeof title !== "string") return res.status(400).json({ error: "Title is required" });
      if (!documentBase64 || typeof documentBase64 !== "string") return res.status(400).json({ error: "A PDF document is required" });
      if (transactionId) {
        const { allowed } = await verifyTransactionAccess(transactionId, req.user!.id, req.user!.role);
        if (!allowed) return res.status(403).json({ error: "Not authorized for this transaction" });
      }
      const result = await firmaCreateSR({ title, message, document: documentBase64 });
      console.log("Firma create SR result:", JSON.stringify(result).substring(0, 500));
      const srId = result.id || result.signing_request_id || result.data?.id;
      if (srId) {
        await saveFirmaSigningRequest({
          userId: req.user!.id,
          transactionId: transactionId || undefined,
          firmaSigningRequestId: srId,
          title,
          status: "draft",
        });
        const { templateFields, templateRecipients } = req.body;
        if (templateFields?.length || templateRecipients?.length) {
          const mobileData = {
            fields: (templateFields || []).map((f: any) => ({
              type: f.type || "signature",
              label: f.label || f.type || "signature",
              page: f.page || 0,
              x: f.x || 0,
              y: f.y || 0,
              width: f.width || 200,
              height: f.height || 60,
              required: f.required !== false,
              assignedTo: f.assignedTo,
            })),
            signers: (templateRecipients || []).map((r: any) => ({
              name: `${r.first_name || r.firstName || ""} ${r.last_name || r.lastName || ""}`.trim(),
              email: r.email || "",
            })).filter((s: any) => s.name && s.email),
            pageDims: [],
          };
          await db.execute(sql`
            UPDATE firma_signing_requests 
            SET mobile_data = ${JSON.stringify(mobileData)}::json
            WHERE firma_signing_request_id = ${srId}
          `);
        }
        await logFirmaAction(req.user!.id, "signing_request_created", { signingRequestId: srId, title, transactionId });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Firma create SR error:", error);
      res.status(500).json({ error: "Failed to create signing request" });
    }
  });

  app.get("/api/firma/signing-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transactionId = req.query.transactionId ? parseInt(req.query.transactionId as string) : undefined;
      if (transactionId) {
        const { allowed } = await verifyTransactionAccess(transactionId, req.user!.id, req.user!.role);
        if (!allowed && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
        const local = await getTransactionSigningRequests(transactionId);
        return res.json(local);
      }
      const local = await getUserSigningRequests(req.user!.id);
      res.json(local);
    } catch (error: any) {
      console.error("Firma list SR error:", error);
      res.status(500).json({ error: "Failed to list signing requests" });
    }
  });

  app.get("/api/firma/signing-requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      const result = await firmaGetSR(req.params.id);
      res.json(result);
    } catch (error: any) {
      console.error("Firma get SR error:", error);
      res.status(500).json({ error: "Failed to get signing request" });
    }
  });

  app.put("/api/firma/signing-requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      const result = await firmaUpdateSR(req.params.id, req.body);
      await logFirmaAction(req.user!.id, "signing_request_updated", { signingRequestId: req.params.id });
      res.json(result);
    } catch (error: any) {
      console.error("Firma update SR error:", error);
      res.status(500).json({ error: "Failed to update signing request" });
    }
  });

  app.get("/api/firma/signing-requests/:id/fields", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      const fields = await firmaGetFields(req.params.id);
      res.json(fields);
    } catch (error: any) {
      console.error("Firma get fields error:", error);
      res.status(500).json({ error: "Failed to get fields" });
    }
  });

  const firmaFieldSchema = z.object({
    type: z.enum(["signature", "text", "date", "checkbox", "initials"]),
    label: z.string().max(100).optional(),
    page: z.number().int().min(0),
    x: z.number().min(0),
    y: z.number().min(0),
    width: z.number().min(1).max(2000),
    height: z.number().min(1).max(2000),
    required: z.boolean().optional(),
    assigned_to: z.string().max(200).optional(),
  });

  const firmaUserSchema = z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().max(200),
  });

  app.post("/api/firma/signing-requests/:id/fields", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const parsed = firmaFieldSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid field data", details: parsed.error.issues });
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      const field = await firmaAddField(req.params.id, parsed.data);
      res.json(field);
    } catch (error: any) {
      console.error("Firma add field error:", error);
      res.status(500).json({ error: error.message || "Failed to add field" });
    }
  });

  app.put("/api/firma/signing-requests/:id/fields/:fieldId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const parsed = firmaFieldSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid field data", details: parsed.error.issues });
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      const field = await firmaUpdateField(req.params.id, req.params.fieldId, parsed.data);
      res.json(field);
    } catch (error: any) {
      console.error("Firma update field error:", error);
      res.status(500).json({ error: error.message || "Failed to update field" });
    }
  });

  app.delete("/api/firma/signing-requests/:id/fields/:fieldId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      await firmaDeleteField(req.params.id, req.params.fieldId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Firma delete field error:", error);
      res.status(500).json({ error: error.message || "Failed to delete field" });
    }
  });

  app.get("/api/firma/signing-requests/:id/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      const users = await firmaGetUsers(req.params.id);
      res.json(users);
    } catch (error: any) {
      console.error("Firma get users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  app.post("/api/firma/signing-requests/:id/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const parsed = firmaUserSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid signer data", details: parsed.error.issues });
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      const user = await firmaAddUser(req.params.id, parsed.data);
      res.json(user);
    } catch (error: any) {
      console.error("Firma add user error:", error);
      res.status(500).json({ error: error.message || "Failed to add signer" });
    }
  });

  app.delete("/api/firma/signing-requests/:id/users/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      await firmaDeleteUser(req.params.id, req.params.userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Firma delete user error:", error);
      res.status(500).json({ error: error.message || "Failed to remove signer" });
    }
  });

  app.get("/api/firma/signing-requests/:id/mobile-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      const record = await getSigningRequestRecord(req.params.id);
      if (!record) return res.status(404).json({ error: "Not found" });
      const mobileData = record.mobile_data || record.mobileData || { fields: [], signers: [] };
      res.json(mobileData);
    } catch (error: any) {
      console.error("Firma get mobile data error:", error);
      res.status(500).json({ error: "Failed to get mobile data" });
    }
  });

  app.post("/api/firma/signing-requests/:id/mobile-save", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      const { fields, signers, pageDims } = req.body;
      if (!Array.isArray(fields) || !Array.isArray(signers)) {
        return res.status(400).json({ error: "fields and signers must be arrays" });
      }
      await db.execute(sql`
        UPDATE firma_signing_requests 
        SET mobile_data = ${JSON.stringify({ fields, signers, pageDims: pageDims || [] })}::json,
            updated_at = NOW()
        WHERE firma_signing_request_id = ${req.params.id}
      `);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Firma mobile save error:", error);
      res.status(500).json({ error: "Failed to save" });
    }
  });

  app.post("/api/firma/signing-requests/:id/mobile-send", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      const record = await getSigningRequestRecord(req.params.id);
      if (!record) return res.status(404).json({ error: "Not found" });
      const mobileData = (record.mobile_data || record.mobileData) as any;
      if (!mobileData?.signers?.length) {
        return res.status(400).json({ error: "Add at least one signer first" });
      }

      const title = (record as any).title || "Signing Request";
      let sentViaFirma = false;
      let activeSrId = req.params.id;

      const recreateResult = await recreateSigningRequestWithRecipients(req.params.id, mobileData, title);

      if (recreateResult.newSrId) {
        try {
          await firmaSendSR(recreateResult.newSrId);
          sentViaFirma = true;
          activeSrId = recreateResult.newSrId;
          console.log(`[Firma Mobile Send] Sent via Firma with full audit trail (new SR: ${recreateResult.newSrId})`);

          await db.execute(sql`
            UPDATE firma_signing_requests
            SET firma_signing_request_id = ${recreateResult.newSrId}, updated_at = NOW()
            WHERE firma_signing_request_id = ${req.params.id}
          `);
        } catch (sendErr: any) {
          console.error(`[Firma Mobile Send] Firma send failed after recreate:`, sendErr?.message);
        }
      } else {
        console.log(`[Firma Mobile Send] Recreate failed: ${recreateResult.error}`);
      }

      let emailsSent = 0;
      if (!sentViaFirma) {
        console.log("[Firma Mobile Send] Falling back to direct email (no Firma audit trail)");
        const { sendSigningEmail } = await import("./email-service");
        const sr = await firmaGetSR(req.params.id);
        const senderName = req.user!.firstName ? `${req.user!.firstName} ${req.user!.lastName || ""}`.trim() : req.user!.username;
        for (const signer of mobileData.signers) {
          if (signer.email) {
            try {
              const signingLink = sr?.document_url || `${req.get("host") ? `https://${req.get("host")}` : ""}/sign/${req.params.id}`;
              const result = await sendSigningEmail(signer.email, signer.name, title, senderName, signingLink);
              if (result.success) emailsSent++;
            } catch (emailErr: any) {
              console.error(`Failed to send email to ${signer.email}:`, emailErr?.message);
            }
          }
        }

        if (emailsSent === 0) {
          return res.status(500).json({ error: "Failed to deliver signing request. Please try again or use the desktop editor." });
        }
      }

      await updateSigningRequestStatus(activeSrId, "sent");
      await logFirmaAction(req.user!.id, "mobile_signing_request_sent", {
        signingRequestId: activeSrId,
        originalSrId: req.params.id,
        sentViaFirma,
        emailsFallback: !sentViaFirma,
        emailsSent,
        signerCount: mobileData.signers.length,
        fieldCount: mobileData.fields?.length || 0,
        recreateError: recreateResult.error || null,
      });
      res.json({ success: true, sentViaFirma });
    } catch (error: any) {
      console.error("Firma mobile send error:", error);
      res.status(500).json({ error: error.message || "Failed to send" });
    }
  });

  app.get("/api/firma/signing-requests/:id/document", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      const sr = await firmaGetSR(req.params.id);
      if (!sr?.document_url) {
        return res.status(404).json({ error: "No document found" });
      }

      const allowedHosts = ["ielmshcswdhuacyjlpiy.supabase.co", "api.firma.dev"];
      try {
        const parsed = new URL(sr.document_url);
        if (!allowedHosts.includes(parsed.host)) {
          return res.status(403).json({ error: "Document URL not from allowed host" });
        }
      } catch {
        return res.status(400).json({ error: "Invalid document URL" });
      }

      const response = await fetch(sr.document_url);
      if (!response.ok) {
        console.error("Firma document fetch failed:", response.status, await response.text().catch(() => ""));
        return res.status(502).json({ error: "Failed to fetch document from storage" });
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Cache-Control", "private, max-age=60");
      res.send(buffer);
    } catch (error: any) {
      console.error("Firma get document error:", error);
      res.status(500).json({ error: "Failed to get document" });
    }
  });

  app.post("/api/firma/signing-requests/:id/mark-sent", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      await updateSigningRequestStatus(req.params.id, "sent");
      await logFirmaAction(req.user!.id, "signing_request_sent", { signingRequestId: req.params.id });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Firma mark-sent error:", error);
      res.status(500).json({ error: "Failed to update signing request status" });
    }
  });

  app.post("/api/firma/signing-requests/:id/send", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      console.log(`[Firma Send] Attempting to send signing request: ${req.params.id}`);
      const result = await firmaSendSR(req.params.id);
      console.log(`[Firma Send] Success:`, JSON.stringify(result));
      await updateSigningRequestStatus(req.params.id, "sent");
      await logFirmaAction(req.user!.id, "signing_request_sent", { signingRequestId: req.params.id });
      res.json(result);
    } catch (error: any) {
      console.error("[Firma Send] Error sending SR:", error.message || error);
      res.status(500).json({ error: error.message || "Failed to send signing request" });
    }
  });

  app.post("/api/firma/signing-requests/:id/cancel", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      const result = await firmaCancelSR(req.params.id);
      await updateSigningRequestStatus(req.params.id, "cancelled");
      await logFirmaAction(req.user!.id, "signing_request_cancelled", { signingRequestId: req.params.id });
      res.json(result);
    } catch (error: any) {
      console.error("Firma cancel SR error:", error);
      res.status(500).json({ error: "Failed to cancel signing request" });
    }
  });

  app.post("/api/firma/signing-requests/:id/jwt", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const owns = await verifySigningRequestOwnership(req.params.id, req.user!.id);
      if (!owns && req.user!.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      const result = await generateSigningRequestJWT(req.params.id);
      const token = result.token || result.jwt || result.data?.token || result.data?.jwt;
      res.json({ token });
    } catch (error: any) {
      console.error("Firma JWT generation error:", error);
      res.status(500).json({ error: "Failed to generate JWT for editor" });
    }
  });


  app.post("/api/firma/proxy/embedded-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { signingRequestId, jwt, validate_only } = req.body;
      if (!signingRequestId || !jwt) {
        return res.status(400).json({ error: "signingRequestId and jwt are required" });
      }
      const payload: any = { signingRequestId };
      if (validate_only) payload.validate_only = true;
      const response = await fetch(
        "https://ielmshcswdhuacyjlpiy.supabase.co/functions/v1/get-embedded-signing-request-data",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwt}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      res.json(data);
    } catch (error: any) {
      console.error("Firma proxy error:", error);
      res.status(500).json({ error: "Failed to fetch signing request data" });
    }
  });

  app.post("/api/firma/proxy/supabase", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { targetUrl, jwt, payload } = req.body;
      if (!targetUrl || !jwt) {
        return res.status(400).json({ error: "targetUrl and jwt are required" });
      }
      const allowedHosts = ["ielmshcswdhuacyjlpiy.supabase.co", "api.firma.dev"];
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch {
        return res.status(400).json({ error: "Invalid target URL" });
      }
      if (!allowedHosts.includes(parsedUrl.host)) {
        return res.status(403).json({ error: "Target URL not allowed" });
      }
      let authHeader = `Bearer ${jwt}`;
      if (parsedUrl.host === "api.firma.dev") {
        const firmaKey = process.env.FIRMA_API_KEY;
        if (firmaKey) {
          authHeader = `Bearer ${firmaKey}`;
        }
      }
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify(payload || {}),
      });
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        return res.status(response.status).json(data);
      }
      const text = await response.text();
      res.status(response.status).send(text);
    } catch (error: any) {
      console.error("Firma supabase proxy error:", error);
      res.status(500).json({ error: "Proxy request failed" });
    }
  });

  app.get("/api/firma/proxy/storage", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { url: targetUrl, jwt } = req.query as { url?: string; jwt?: string };
      if (!targetUrl || !jwt) {
        return res.status(400).json({ error: "url and jwt are required" });
      }
      const allowedHosts = ["ielmshcswdhuacyjlpiy.supabase.co", "api.firma.dev"];
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch {
        return res.status(400).json({ error: "Invalid target URL" });
      }
      if (!allowedHosts.includes(parsedUrl.host)) {
        return res.status(403).json({ error: "Target URL not allowed" });
      }
      const response = await fetch(targetUrl, {
        headers: {
          "Authorization": `Bearer ${jwt}`,
        },
      });
      if (!response.ok) {
        return res.status(response.status).send("Failed to fetch file");
      }
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      const contentDisposition = response.headers.get("content-disposition");
      if (contentDisposition) {
        res.setHeader("Content-Disposition", contentDisposition);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    } catch (error: any) {
      console.error("Firma storage proxy error:", error);
      res.status(500).json({ error: "Storage proxy request failed" });
    }
  });

  app.post("/api/firma/webhook", async (req, res) => {
    try {
      const event = req.body;
      if (event?.payload?.signing_request_id) {
        const status = event.payload.status || event.event?.replace("signing_request.", "");
        if (status && typeof status === "string" && status.length < 50) {
          await updateSigningRequestStatus(event.payload.signing_request_id, status);
        }
      }
      res.sendStatus(200);
    } catch (error: any) {
      console.error("Firma webhook error:", error);
      res.sendStatus(200);
    }
  });

  // ============ DocuSign e-Signature ============
  app.get("/api/docusign/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const configured = isDocuSignConfigured();
      if (!configured) return res.json({ configured: false, connected: false });
      const status = await getDocuSignStatus(req.user.id);
      res.json({ configured: true, ...status });
    } catch (error: any) {
      res.json({ configured: false, connected: false });
    }
  });

  app.get("/api/docusign/auth-url", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const crypto = await import("crypto");
      const nonce = crypto.randomBytes(32).toString("hex");
      const { codeVerifier, codeChallenge } = generatePKCE();
      (req.session as any).docusignOAuthState = nonce;
      (req.session as any).docusignOAuthUserId = req.user.id;
      (req.session as any).docusignCodeVerifier = codeVerifier;
      const url = getDocuSignAuthUrl(nonce, codeChallenge);
      res.json({ url });
    } catch (error: any) {
      console.error("Error generating DocuSign auth URL:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  app.get("/api/docusign/callback", async (req, res) => {
    const code = req.query.code as string;
    const state = req.query.state as string;

    const domains = process.env.REPLIT_DOMAINS || "";
    const domain = domains.split(",")[0];
    const baseUrl = domain ? `https://${domain}` : "http://localhost:5000";

    const sendCallbackPage = (success: boolean, _message: string) => {
      const param = success ? "docusign=connected" : "docusign=error";
      res.redirect(`${baseUrl}/settings?${param}`);
    };

    if (!code || !state) {
      return sendCallbackPage(false, "Missing authorization code. Please try again from Settings.");
    }

    const sessionState = (req.session as any).docusignOAuthState;
    const userId = (req.session as any).docusignOAuthUserId;

    if (!sessionState || !userId || state !== sessionState) {
      console.error("DocuSign OAuth state mismatch");
      return sendCallbackPage(false, "Session expired or state mismatch. Please try again from Settings.");
    }

    const codeVerifier = (req.session as any).docusignCodeVerifier;
    delete (req.session as any).docusignOAuthState;
    delete (req.session as any).docusignOAuthUserId;
    delete (req.session as any).docusignCodeVerifier;

    if (!codeVerifier) {
      console.error("DocuSign PKCE code verifier missing from session");
      return sendCallbackPage(false, "Session expired. Please try again from Settings.");
    }

    try {
      await handleDocuSignCallback(code, userId, codeVerifier);
      await logDocuSignAction(userId, "account_connected", { ipAddress: req.ip, userAgent: req.get("user-agent") || undefined });
      sendCallbackPage(true, "Your DocuSign account has been connected successfully.");
    } catch (error: any) {
      console.error("DocuSign callback error:", error);
      sendCallbackPage(false, "Something went wrong connecting your account. Please try again.");
    }
  });

  app.post("/api/docusign/disconnect", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      await logDocuSignAction(req.user.id, "account_disconnected", { ipAddress: req.ip, userAgent: req.get("user-agent") || undefined });
      await disconnectDocuSign(req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to disconnect DocuSign" });
    }
  });

  app.post("/api/docusign/send", upload.single("file"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const schema = z.object({
      signerEmail: z.string().email(),
      signerName: z.string().min(1),
      emailSubject: z.string().optional(),
      consentAcknowledged: z.string().transform(v => v === "true"),
      documentId: z.string().optional(),
      transactionId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });
    if (!parsed.data.consentAcknowledged) return res.status(400).json({ error: "Consent acknowledgment required" });

    try {
      const allowedExts = ['pdf', 'doc', 'docx'];
      const ext = req.file.originalname.toLowerCase().split('.').pop();
      if (!ext || !allowedExts.includes(ext)) {
        return res.status(400).json({ error: "Only PDF, DOC, and DOCX files are supported" });
      }

      const result = await createEnvelope(
        req.user.id,
        req.file.buffer,
        req.file.originalname,
        parsed.data.signerEmail,
        parsed.data.signerName,
        parsed.data.emailSubject
      );

      await logDocuSignAction(req.user.id, "envelope_sent", {
        envelopeId: result.envelopeId,
        signerEmail: parsed.data.signerEmail,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
        metadata: { fileName: req.file.originalname, fileSize: req.file.size, signerName: parsed.data.signerName },
      });

      if (parsed.data.documentId && parsed.data.transactionId) {
        const docId = parseInt(parsed.data.documentId);
        const txnId = parseInt(parsed.data.transactionId);
        if (!isNaN(docId) && !isNaN(txnId)) {
          const txn = await storage.getTransaction(txnId);
          if (txn && (txn.agentId === req.user.id || req.user.role === "broker")) {
            const signingUrl = `https://app.docusign.com/documents/details/${result.envelopeId}`;
            await db.execute(sql`UPDATE documents SET signing_url = ${signingUrl}, signing_platform = 'docusign', docusign_envelope_id = ${result.envelopeId}, status = 'waiting_signatures' WHERE id = ${docId} AND transaction_id = ${txnId}`);
          }
        }
      }

      res.json(result);
    } catch (error: any) {
      console.error("DocuSign send error:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to send envelope" });
    }
  });

  app.post("/api/docusign/prepare", upload.single("file"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const schema = z.object({
      signerEmail: z.string().email(),
      signerName: z.string().min(1),
      emailSubject: z.string().optional(),
      consentAcknowledged: z.string().transform(v => v === "true"),
      documentId: z.string().optional(),
      transactionId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });
    if (!parsed.data.consentAcknowledged) return res.status(400).json({ error: "Consent acknowledgment required" });

    try {
      const allowedExts = ['pdf', 'doc', 'docx'];
      const ext = req.file.originalname.toLowerCase().split('.').pop();
      if (!ext || !allowedExts.includes(ext)) {
        return res.status(400).json({ error: "Only PDF, DOC, and DOCX files are supported" });
      }

      const domains = process.env.REPLIT_DOMAINS || "";
      const domain = domains.split(",")[0];
      const baseUrl = domain ? `https://${domain}` : "http://localhost:5000";
      const returnUrl = `${baseUrl}/api/docusign/sender-return`;

      const draft = await createDraftEnvelope(
        req.user.id,
        req.file.buffer,
        req.file.originalname,
        parsed.data.signerEmail,
        parsed.data.signerName,
        parsed.data.emailSubject
      );

      const senderView = await createSenderView(req.user.id, draft.envelopeId, returnUrl);

      await logDocuSignAction(req.user.id, "envelope_prepared", {
        envelopeId: draft.envelopeId,
        signerEmail: parsed.data.signerEmail,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
        metadata: { fileName: req.file.originalname, fileSize: req.file.size, signerName: parsed.data.signerName, mode: "embedded_sending" },
      });

      if (parsed.data.documentId && parsed.data.transactionId) {
        const docId = parseInt(parsed.data.documentId);
        const txnId = parseInt(parsed.data.transactionId);
        if (!isNaN(docId) && !isNaN(txnId)) {
          const txn = await storage.getTransaction(txnId);
          if (txn && (txn.agentId === req.user.id || req.user.role === "broker")) {
            const signingUrl = `https://app.docusign.com/documents/details/${draft.envelopeId}`;
            await db.execute(sql`UPDATE documents SET signing_url = ${signingUrl}, signing_platform = 'docusign', docusign_envelope_id = ${draft.envelopeId}, status = 'waiting_signatures' WHERE id = ${docId} AND transaction_id = ${txnId}`);
          }
        }
      }

      res.json({ envelopeId: draft.envelopeId, senderViewUrl: senderView.url });
    } catch (error: any) {
      console.error("DocuSign prepare error:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to prepare envelope" });
    }
  });

  app.get("/api/docusign/sender-return", async (req, res) => {
    const event = req.query.event as string || "unknown";
    const domains = process.env.REPLIT_DOMAINS || "";
    const domain = domains.split(",")[0];
    const baseUrl = domain ? `https://${domain}` : "http://localhost:5000";

    if (req.isAuthenticated() && req.user) {
      await logDocuSignAction(req.user.id, "sender_view_completed", {
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
        metadata: { event },
      });
    }

    res.redirect(`${baseUrl}/transactions?docusign_event=${encodeURIComponent(event)}`);
  });

  app.get("/api/docusign/envelopes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const envelopes = await listEnvelopes(req.user.id, req.query.from_date as string | undefined);
      res.json(envelopes);
    } catch (error: any) {
      console.error("DocuSign list envelopes error:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to list envelopes" });
    }
  });

  app.get("/api/docusign/envelope/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const status = await getEnvelopeStatus(req.user.id, req.params.id);
      res.json(status);
    } catch (error: any) {
      console.error("DocuSign envelope status error:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to get envelope status" });
    }
  });

  app.post("/api/docusign/sync-status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    const schema = z.object({ transactionId: z.number() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "transactionId required" });

    try {
      const txn = await storage.getTransaction(parsed.data.transactionId);
      if (!txn) return res.status(404).json({ error: "Transaction not found" });
      if (txn.agentId !== req.user.id && req.user.role !== "broker") {
        return res.status(403).json({ error: "Not authorized for this transaction" });
      }
      if (isTransactionLockedByOther(parsed.data.transactionId, req.user.id)) {
        return res.status(423).json({ error: "Transaction is currently being edited by another user" });
      }

      const STATUS_ORDER: Record<string, number> = {
        'not_applicable': 0,
        'waiting_signatures': 1,
        'signed': 2,
        'waiting_others': 3,
        'complete': 4,
      };

      const docs = await db.execute(sql`SELECT id, docusign_envelope_id, status, manually_moved FROM documents WHERE transaction_id = ${parsed.data.transactionId} AND docusign_envelope_id IS NOT NULL AND status NOT IN ('signed', 'complete')`);
      const results: Array<{ documentId: number; envelopeId: string; envelopeStatus: string; advanced: boolean; skipped?: boolean; reason?: string }> = [];

      for (const doc of docs.rows) {
        try {
          const envStatus = await getEnvelopeStatus(req.user.id, doc.docusign_envelope_id as string);
          let advanced = false;
          let reason: string | undefined;

          if (doc.manually_moved) {
            reason = "agent_override";
          } else if (envStatus.status === "completed") {
            const currentOrder = STATUS_ORDER[doc.status as string] ?? 0;
            const targetOrder = STATUS_ORDER['signed'] ?? 2;
            if (targetOrder > currentOrder) {
              await db.execute(sql`UPDATE documents SET status = 'signed' WHERE id = ${doc.id}`);
              advanced = true;
            } else {
              reason = "already_ahead";
            }
          }

          results.push({
            documentId: doc.id as number,
            envelopeId: doc.docusign_envelope_id as string,
            envelopeStatus: envStatus.status,
            advanced,
            skipped: (doc.manually_moved || reason === "already_ahead") ? true : undefined,
            reason,
          });
        } catch (e: any) {
          results.push({
            documentId: doc.id as number,
            envelopeId: doc.docusign_envelope_id as string,
            envelopeStatus: "error",
            advanced: false,
          });
        }
      }

      res.json({ synced: results.length, results });
    } catch (error: any) {
      console.error("DocuSign sync-status error:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to sync envelope statuses" });
    }
  });

  app.get("/api/docusign/envelope/:id/download", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const pdfBuffer = await downloadEnvelopeDocuments(req.user.id, req.params.id);
      await logDocuSignAction(req.user.id, "document_downloaded", {
        envelopeId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="envelope.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("DocuSign download error:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to download documents" });
    }
  });

  app.get("/api/docusign/document-pdf/:transactionId/:documentId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    const transactionId = parseInt(req.params.transactionId);
    const documentId = req.params.documentId;
    if (isNaN(transactionId)) return res.status(400).json({ error: "Invalid transaction ID" });

    try {
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction || (transaction.agentId !== req.user.id && req.user.role !== "broker")) {
        return res.status(403).json({ error: "Not authorized for this transaction" });
      }

      const document = await storage.getDocument(documentId);
      if (!document || document.transactionId !== transactionId) {
        return res.status(404).json({ error: "Document not found" });
      }
      if (!document.docusignEnvelopeId) {
        return res.status(400).json({ error: "Document has no DocuSign envelope" });
      }

      const pdfBuffer = await downloadEnvelopeDocuments(req.user.id, document.docusignEnvelopeId);
      const safeFileName = document.name.replace(/[^\w\s.-]/g, '_');

      await logDocuSignAction(req.user.id, "document_downloaded", {
        envelopeId: document.docusignEnvelopeId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
        metadata: { documentName: document.name, transactionId, documentId },
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${safeFileName}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("DocuSign document-pdf error:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to download document PDF" });
    }
  });

  // ============ Dropbox Integration ============
  app.get("/api/dropbox/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const configured = isDropboxConfigured();
      if (!configured) return res.json({ configured: false, connected: false });
      const status = await getDropboxConnectionStatus(req.user.id);
      res.json({ configured: true, ...status });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to check Dropbox status" });
    }
  });

  app.get("/api/dropbox/auth-url", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const state = generateDropboxState();
      (req.session as any).dropboxState = state;
      const domains = process.env.REPLIT_DOMAINS || "";
      const domain = domains.split(",")[0];
      const baseUrl = domain ? `https://${domain}` : "http://localhost:5000";
      const redirectUri = `${baseUrl}/api/dropbox/callback`;
      const url = getDropboxAuthUrl(state, redirectUri);
      res.json({ url });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  app.get("/api/dropbox/callback", async (req, res) => {
    const { code, state, error: oauthError } = req.query;
    const domains = process.env.REPLIT_DOMAINS || "";
    const domain = domains.split(",")[0];
    const baseUrl = domain ? `https://${domain}` : "http://localhost:5000";
    const redirectUri = `${baseUrl}/api/dropbox/callback`;

    if (oauthError || !code) {
      return res.send(`<html><body><script>window.close();</script><p>Dropbox connection failed. You can close this window.</p></body></html>`);
    }

    if (!req.isAuthenticated() || !req.user) {
      return res.send(`<html><body><script>window.close();</script><p>Session expired. Please try again.</p></body></html>`);
    }

    const sessionState = (req.session as any).dropboxState;
    if (!sessionState || sessionState !== state) {
      return res.send(`<html><body><script>window.close();</script><p>Invalid state. Please try again.</p></body></html>`);
    }

    try {
      await handleDropboxCallback(code as string, redirectUri, req.user.id);
      delete (req.session as any).dropboxState;
      res.send(`<html><body><script>window.close();</script><p>Dropbox connected successfully! You can close this window.</p></body></html>`);
    } catch (error: any) {
      console.error("Dropbox callback error:", error);
      res.send(`<html><body><script>window.close();</script><p>Failed to connect Dropbox. Please try again.</p></body></html>`);
    }
  });

  app.post("/api/dropbox/disconnect", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      await disconnectDropbox(req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to disconnect Dropbox" });
    }
  });

  app.post("/api/dropbox/files", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    const { path } = req.body;
    try {
      const result = await listDropboxFiles(req.user.id, path || "");
      res.json(result);
    } catch (error: any) {
      console.error("Server error:", error); res.status(500).json({ error: "Failed to list files" });
    }
  });

  app.post("/api/dropbox/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query required" });
    try {
      const results = await searchDropboxFiles(req.user.id, query);
      res.json(results);
    } catch (error: any) {
      console.error("Server error:", error); res.status(500).json({ error: "Failed to search files" });
    }
  });

  app.post("/api/dropbox/add-to-checklist", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    const schema = z.object({
      dropboxPath: z.string().min(1),
      transactionId: z.number(),
      documentName: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });

    try {
      const txn = await storage.getTransaction(parsed.data.transactionId);
      if (!txn) return res.status(404).json({ error: "Transaction not found" });
      if (txn.agentId !== req.user.id && req.user.role !== "broker") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const fileName = parsed.data.dropboxPath.split("/").pop() || "Dropbox Document";
      const docName = parsed.data.documentName || fileName;

      const document = await storage.createDocument({
        name: docName,
        status: "not_applicable",
        transactionId: parsed.data.transactionId,
      });

      res.json({ document, fileName: docName });
    } catch (error: any) {
      console.error("Dropbox add-to-checklist error:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to add file from Dropbox" });
    }
  });

  app.post("/api/dropbox/download-for-signing", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    const schema = z.object({ dropboxPath: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });

    try {
      const file = await downloadDropboxFile(req.user.id, parsed.data.dropboxPath);
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
      res.send(file.buffer);
    } catch (error: any) {
      console.error("Server error:", error); res.status(500).json({ error: "Failed to download file" });
    }
  });

  app.post("/api/dropbox/send-to-docusign", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    const schema = z.object({
      dropboxPath: z.string().min(1),
      signerEmail: z.string().email(),
      signerName: z.string().min(1),
      emailSubject: z.string().optional(),
      mode: z.enum(["send", "prepare"]).default("prepare"),
      documentId: z.number().optional(),
      transactionId: z.number().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });

    try {
      const ext = parsed.data.dropboxPath.split('.').pop()?.toLowerCase();
      if (!ext || !['pdf', 'doc', 'docx'].includes(ext)) {
        return res.status(400).json({ error: "Only PDF, DOC, and DOCX files are supported" });
      }

      const file = await downloadDropboxFile(req.user.id, parsed.data.dropboxPath);

      let result: any;
      if (parsed.data.mode === "prepare") {
        const domains = process.env.REPLIT_DOMAINS || "";
        const domain = domains.split(",")[0];
        const baseUrl = domain ? `https://${domain}` : "http://localhost:5000";
        const returnUrl = `${baseUrl}/api/docusign/sender-return`;

        const draft = await createDraftEnvelope(
          req.user.id, file.buffer, file.name,
          parsed.data.signerEmail, parsed.data.signerName, parsed.data.emailSubject
        );
        const senderView = await createSenderView(req.user.id, draft.envelopeId, returnUrl);

        await logDocuSignAction(req.user.id, "envelope_prepared", {
          envelopeId: draft.envelopeId,
          signerEmail: parsed.data.signerEmail,
          ipAddress: req.ip,
          userAgent: req.get("user-agent") || undefined,
          metadata: { fileName: file.name, source: "dropbox", mode: "embedded_sending" },
        });

        result = { envelopeId: draft.envelopeId, senderViewUrl: senderView.url };
      } else {
        const envelope = await createEnvelope(
          req.user.id, file.buffer, file.name,
          parsed.data.signerEmail, parsed.data.signerName, parsed.data.emailSubject
        );

        await logDocuSignAction(req.user.id, "envelope_sent", {
          envelopeId: envelope.envelopeId,
          signerEmail: parsed.data.signerEmail,
          ipAddress: req.ip,
          userAgent: req.get("user-agent") || undefined,
          metadata: { fileName: file.name, source: "dropbox" },
        });

        result = envelope;
      }

      if (parsed.data.documentId && parsed.data.transactionId) {
        const txn = await storage.getTransaction(parsed.data.transactionId);
        if (txn && (txn.agentId === req.user.id || req.user.role === "broker")) {
          const signingUrl = `https://app.docusign.com/documents/details/${result.envelopeId}`;
          await db.execute(sql`UPDATE documents SET signing_url = ${signingUrl}, signing_platform = 'docusign', docusign_envelope_id = ${result.envelopeId}, status = 'waiting_signatures' WHERE id = ${parsed.data.documentId} AND transaction_id = ${parsed.data.transactionId}`);
        }
      }

      res.json(result);
    } catch (error: any) {
      console.error("Dropbox-to-DocuSign error:", error);
      console.error("Server error:", error); res.status(500).json({ error: "Failed to send file from Dropbox to DocuSign" });
    }
  });

  // ============ Email Snippets ============
  app.get("/api/snippets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    const snippets = await storage.getSnippetsByUser(req.user.id);
    res.json(snippets);
  });

  app.post("/api/snippets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    const schema = z.object({
      title: z.string().min(1, "Title is required"),
      body: z.string().min(1, "Body is required"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });
    const snippet = await storage.createSnippet({ userId: req.user.id, title: parsed.data.title, body: parsed.data.body });
    res.json(snippet);
  });

  app.patch("/api/snippets/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    const id = parseInt(req.params.id);
    const existing = await storage.getSnippet(id);
    if (!existing || existing.userId !== req.user.id) return res.sendStatus(404);
    const schema = z.object({
      title: z.string().min(1).optional(),
      body: z.string().min(1).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });
    const updated = await storage.updateSnippet(id, parsed.data);
    res.json(updated);
  });

  app.delete("/api/snippets/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    const id = parseInt(req.params.id);
    const existing = await storage.getSnippet(id);
    if (!existing || existing.userId !== req.user.id) return res.sendStatus(404);
    await storage.deleteSnippet(id);
    res.json({ success: true });
  });

  // ============ Email Tracking ============
  app.get("/api/track/:trackingId.png", async (req, res) => {
    const { trackingId } = req.params;
    try {
      await storage.recordEmailOpen(trackingId);
    } catch (e) {
      // silently fail — don't break image loading
    }
    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    res.set({ "Content-Type": "image/png", "Content-Length": pixel.length.toString(), "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", "Pragma": "no-cache", "Expires": "0" });
    res.end(pixel);
  });

  app.get("/api/email-tracking", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    const tracking = await storage.getEmailTrackingByUser(req.user.id);
    res.json(tracking);
  });

  // Transaction Timeline & Risk Alerts
  app.get("/api/transactions/:id/timeline", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const transactionId = parseInt(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) return res.sendStatus(404);
      const isAgent = transaction.agentId === req.user.id;
      const isClient = req.user.clientRecordId && (
        transaction.clientId === req.user.clientRecordId ||
        transaction.secondaryClientId === req.user.clientRecordId
      );
      const isParticipant = Array.isArray(transaction.participants) &&
        transaction.participants.some((p: any) => p.userId === req.user!.id);
      if (!isAgent && !isClient && !isParticipant) return res.sendStatus(403);
      const { generateTransactionTimeline } = await import("./timeline-service");
      const timeline = await generateTransactionTimeline(transactionId);
      res.json(timeline);
    } catch (error: any) {
      console.error("Timeline error:", error);
      res.status(500).json({ error: "Failed to generate timeline" });
    }
  });

  app.get("/api/alerts", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const { generateAgentAlerts } = await import("./timeline-service");
      const alerts = await generateAgentAlerts(req.user.id);
      res.json(alerts);
    } catch (error: any) {
      console.error("Alerts error:", error);
      res.status(500).json({ error: "Failed to generate alerts" });
    }
  });

  // Client Portal - My Transaction
  app.get("/api/client/my-transactions", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const userId = req.user.id;
      const clientRecordId = req.user.clientRecordId;
      const claimedTxId = req.user.claimedTransactionId;

      const txIds = new Set<number>();
      if (claimedTxId) txIds.add(claimedTxId);

      if (clientRecordId) {
        const result = await db.execute(sql`
          SELECT id FROM transactions WHERE client_id = ${clientRecordId} OR secondary_client_id = ${clientRecordId}
        `);
        for (const row of result.rows as any[]) txIds.add(row.id);
      }

      const participantResult = await db.execute(sql`
        SELECT id, participants FROM transactions
      `);
      for (const row of participantResult.rows as any[]) {
        const participants = (row.participants as any[]) || [];
        if (participants.some((p: any) => p.userId === userId)) {
          txIds.add(row.id);
        }
      }

      if (txIds.size === 0) return res.json([]);

      const txList = [];
      for (const txId of txIds) {
        const tx = await storage.getTransaction(txId);
        if (tx) {
          const docsResult = await db.execute(sql`
            SELECT COUNT(*)::int as count FROM documents
            WHERE transaction_id = ${tx.id} AND status IN ('waiting_signatures', 'waiting_others')
          `);
          txList.push({
            id: tx.id,
            streetName: tx.streetName,
            city: tx.city,
            state: tx.state,
            status: tx.status,
            type: tx.type,
            contractPrice: tx.contractPrice,
            closingDate: tx.closingDate,
            pendingDocuments: (docsResult.rows[0] as any)?.count || 0,
          });
        }
      }
      res.json(txList);
    } catch (error) {
      console.error("Error fetching client transactions:", error);
      res.status(500).json({ error: "Failed to load transactions" });
    }
  });

  app.get("/api/client/my-transaction", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      let transaction = null;
      const requestedTxId = req.query.transactionId ? Number(req.query.transactionId) : null;

      if (requestedTxId) {
        const tx = await storage.getTransaction(requestedTxId);
        if (tx) {
          const participants = (tx.participants as any[]) || [];
          const isParticipant = participants.some((p: any) => p.userId === req.user!.id);
          const isLinkedClient = req.user.clientRecordId && (tx.clientId === req.user.clientRecordId || tx.secondaryClientId === req.user.clientRecordId);
          const isClaimed = tx.id === req.user.claimedTransactionId;
          if (isParticipant || isLinkedClient || isClaimed) {
            transaction = tx;
          }
        }
      }

      if (!transaction && req.user.claimedTransactionId) {
        const claimed = await storage.getTransaction(req.user.claimedTransactionId);
        if (claimed) {
          const participants = (claimed.participants as any[]) || [];
          const isParticipant = participants.some((p: any) => p.userId === req.user!.id);
          const isLinkedClient = req.user.clientRecordId && (claimed.clientId === req.user.clientRecordId || claimed.secondaryClientId === req.user.clientRecordId);
          if (isParticipant || isLinkedClient) {
            transaction = claimed;
          }
        }
      }
      if (!transaction && req.user.clientRecordId) {
        const clientId = req.user.clientRecordId;
        const result = await db.execute(sql`
          SELECT * FROM transactions WHERE client_id = ${clientId} OR secondary_client_id = ${clientId} LIMIT 1
        `);
        if (result.rows.length > 0) {
          transaction = result.rows[0] as any;
        }
      }
      if (!transaction) {
        return res.json(null);
      }
      const documents = await storage.getDocumentsByTransaction(transaction.id);
      let checklist = await storage.getChecklist(transaction.id, "buyer");
      if (!checklist) {
        checklist = await storage.getChecklist(transaction.id, "seller");
      }
      const { generateTransactionTimeline } = await import("./timeline-service");
      let timeline = null;
      try {
        timeline = await generateTransactionTimeline(transaction.id);
      } catch (e) {}

      let agent = null;
      try {
        if (transaction.agentId) {
          const agentUser = await storage.getUser(transaction.agentId);
          if (agentUser) {
            agent = {
              id: agentUser.id,
              name: `${agentUser.firstName || ""} ${agentUser.lastName || ""}`.trim() || agentUser.username,
              email: agentUser.email,
              phone: agentUser.phone || null,
              profilePhoto: agentUser.profilePhoto || null,
              role: agentUser.role,
            };
          }
        }
      } catch (e) {}

      let contacts: any[] = [];
      try {
        const txContacts = await storage.getContactsByTransaction(transaction.id);
        contacts = txContacts.map((c: any) => ({
          id: c.id,
          name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.name || 'Unknown',
          role: c.role || c.type,
          email: c.email,
          phone: c.phone,
        }));
      } catch (e) {}

      const pendingActions = [];
      const docsNeedingSig = documents.filter(d => d.status === "waiting_signatures" && d.signingUrl);
      if (docsNeedingSig.length > 0) {
        pendingActions.push({
          type: "signature",
          title: `${docsNeedingSig.length} document${docsNeedingSig.length > 1 ? 's' : ''} need${docsNeedingSig.length === 1 ? 's' : ''} your signature`,
          priority: "high",
          items: docsNeedingSig.map(d => ({ id: d.id, name: d.name, url: d.signingUrl })),
        });
      }
      const checklistItems = checklist?.items || [];
      const incompleteItems = checklistItems.filter((item: any) => !item.completed);
      if (incompleteItems.length > 0) {
        pendingActions.push({
          type: "checklist",
          title: `${incompleteItems.length} checklist item${incompleteItems.length > 1 ? 's' : ''} remaining`,
          priority: "medium",
          count: incompleteItems.length,
        });
      }
      if (timeline) {
        const urgentEvents = timeline.events.filter((e: any) =>
          (e.status === "warning" || e.status === "overdue") && e.daysRemaining !== null
        );
        if (urgentEvents.length > 0) {
          pendingActions.push({
            type: "deadline",
            title: `${urgentEvents.length} upcoming deadline${urgentEvents.length > 1 ? 's' : ''} need attention`,
            priority: "high",
            items: urgentEvents.map((e: any) => ({ event: e.event, daysRemaining: e.daysRemaining, status: e.status })),
          });
        }
      }

      let inspectionData: any = null;
      try {
        const items = await storage.getInspectionItemsByTransaction(transaction.id);
        if (items.length > 0) {
          const bidRequestsResult = await db.execute(sql`
            SELECT br.id, br.inspection_item_id, br.contractor_id, br.status,
              c.name as contractor_name, c.category as contractor_category
            FROM bid_requests br
            LEFT JOIN contractors c ON c.id = br.contractor_id
            WHERE br.transaction_id = ${transaction.id}
          `);
          const bidsResult = await db.execute(sql`
            SELECT b.id, b.bid_request_id, b.amount, b.estimated_days, b.description, b.status,
              c.name as contractor_name
            FROM bids b
            JOIN bid_requests br ON br.id = b.bid_request_id
            LEFT JOIN contractors c ON c.id = br.contractor_id
            WHERE br.transaction_id = ${transaction.id}
          `);
          const bidsByItem: Record<number, any[]> = {};
          for (const bid of bidsResult.rows as any[]) {
            const br = (bidRequestsResult.rows as any[]).find(r => r.id === bid.bid_request_id);
            if (br) {
              if (!bidsByItem[br.inspection_item_id]) bidsByItem[br.inspection_item_id] = [];
              bidsByItem[br.inspection_item_id].push({
                id: bid.id,
                amount: bid.amount,
                estimatedDays: bid.estimated_days,
                description: bid.description,
                status: bid.status,
                contractorName: bid.contractor_name,
              });
            }
          }
          const bidRequestsByItem: Record<number, number> = {};
          for (const br of bidRequestsResult.rows as any[]) {
            bidRequestsByItem[br.inspection_item_id] = (bidRequestsByItem[br.inspection_item_id] || 0) + 1;
          }
          const enrichedItems = items.map((item: any) => ({
            id: item.id,
            category: item.category,
            description: item.description,
            severity: item.severity,
            location: item.location,
            status: item.status,
            notes: item.notes,
            repairRequested: item.repairRequested ?? item.repair_requested ?? false,
            repairStatus: item.repairStatus ?? item.repair_status ?? 'not_requested',
            repairNotes: item.repairNotes ?? item.repair_notes ?? null,
            creditAmount: item.creditAmount ?? item.credit_amount ?? null,
            bidRequestCount: bidRequestsByItem[item.id] || 0,
            bids: bidsByItem[item.id] || [],
            lowestBid: bidsByItem[item.id]?.length
              ? Math.min(...bidsByItem[item.id].map((b: any) => Number(b.amount)))
              : null,
          }));

          const totalItems = enrichedItems.length;
          const itemsWithBids = enrichedItems.filter((i: any) => i.bids.length > 0).length;
          const requestedRepairs = enrichedItems.filter((i: any) => i.repairRequested).length;
          const resolvedRepairs = enrichedItems.filter((i: any) =>
            ['agreed', 'credit_offered', 'resolved'].includes(i.repairStatus)
          ).length;
          const deniedRepairs = enrichedItems.filter((i: any) => i.repairStatus === 'denied').length;

          let currentStep = 'report';
          if (requestedRepairs > 0 && (resolvedRepairs + deniedRepairs) === requestedRepairs) {
            currentStep = 'resolution';
          } else if (requestedRepairs > 0) {
            currentStep = 'negotiation';
          } else if (itemsWithBids > 0) {
            currentStep = 'choose_repairs';
          } else if (totalItems > 0 && enrichedItems.some((i: any) => i.bidRequestCount > 0)) {
            currentStep = 'estimates';
          }

          inspectionData = {
            items: enrichedItems,
            summary: {
              totalItems,
              itemsWithBids,
              requestedRepairs,
              resolvedRepairs,
              deniedRepairs,
              currentStep,
            },
          };
        }
      } catch (e) {
        console.error("Error loading inspection data for client:", e);
      }

      res.json({ transaction, documents, checklist, timeline, agent, contacts, pendingActions, inspectionData });
    } catch (error: any) {
      console.error("Client portal error:", error);
      res.status(500).json({ error: "Failed to load transaction data" });
    }
  });

  // Client repair request toggle
  app.patch("/api/client/inspection-items/:id/repair-request", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const itemId = Number(req.params.id);
      const { repairRequested } = req.body;
      if (typeof repairRequested !== 'boolean') {
        return res.status(400).json({ error: 'repairRequested must be a boolean' });
      }
      const item = await db.execute(sql`SELECT * FROM inspection_items WHERE id = ${itemId} LIMIT 1`);
      if (item.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
      const inspItem = item.rows[0] as any;
      let transaction = null;
      if (req.user.claimedTransactionId) {
        const claimed = await storage.getTransaction(req.user.claimedTransactionId);
        if (claimed && claimed.id === inspItem.transaction_id) transaction = claimed;
      }
      if (!transaction && req.user.clientRecordId) {
        const result = await db.execute(sql`
          SELECT * FROM transactions WHERE id = ${inspItem.transaction_id}
          AND (client_id = ${req.user.clientRecordId} OR secondary_client_id = ${req.user.clientRecordId})
          LIMIT 1
        `);
        if (result.rows.length > 0) transaction = result.rows[0];
      }
      if (!transaction) return res.status(403).json({ error: 'Not authorized' });
      if (repairRequested) {
        await db.execute(sql`
          UPDATE inspection_items
          SET repair_requested = true,
              repair_status = 'requested'
          WHERE id = ${itemId}
        `);
      } else {
        await db.execute(sql`
          UPDATE inspection_items
          SET repair_requested = false,
              repair_status = 'not_requested',
              repair_notes = NULL,
              credit_amount = NULL
          WHERE id = ${itemId}
        `);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating repair request:", error);
      res.status(500).json({ error: "Failed to update repair request" });
    }
  });

  // Agent/broker update repair negotiation status
  app.patch("/api/inspection-items/:id/repair-status", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) {
      return res.sendStatus(401);
    }
    try {
      const itemId = Number(req.params.id);
      const allowedFields = ['repairStatus', 'repairNotes', 'creditAmount'];
      const data: Record<string, any> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      const validStatuses = ['not_requested', 'requested', 'agreed', 'denied', 'credit_offered', 'resolved'];
      if (data.repairStatus && !validStatuses.includes(data.repairStatus)) {
        return res.status(400).json({ error: 'Invalid repair status' });
      }
      const item = await db.execute(sql`SELECT * FROM inspection_items WHERE id = ${itemId} LIMIT 1`);
      if (item.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
      const inspItem = item.rows[0] as any;
      const { allowed } = await verifyTransactionAccess(inspItem.transaction_id, req.user.id, req.user.role);
      if (!allowed) return res.status(403).json({ error: 'Not authorized' });

      await db.execute(sql`
        UPDATE inspection_items SET
          repair_status = COALESCE(${data.repairStatus || null}, repair_status),
          repair_notes = COALESCE(${data.repairNotes !== undefined ? data.repairNotes : null}, repair_notes),
          credit_amount = COALESCE(${data.creditAmount !== undefined ? String(data.creditAmount) : null}::numeric, credit_amount)
        WHERE id = ${itemId}
      `);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating repair status:", error);
      res.status(500).json({ error: "Failed to update repair status" });
    }
  });

  // ============ Inspection Items ============
  app.post("/api/transactions/:id/parse-inspection", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const transactionId = Number(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction || transaction.agentId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized for this transaction' });
      }
      let items;
      let aiUsed = false;

      const fs = await import("fs");
      const path = await import("path");
      const uploadDir = path.default.join(process.cwd(), 'uploads', 'inspections');
      fs.default.mkdirSync(uploadDir, { recursive: true });
      const fileName = `${transactionId}_${Date.now()}.pdf`;
      const filePath = path.default.join(uploadDir, fileName);
      fs.default.writeFileSync(filePath, req.file.buffer);
      await storage.saveInspectionPdf(transactionId, req.file.originalname || fileName, filePath);

      if (req.file.mimetype === 'application/pdf') {
        try {
          console.log("[InspectionParser] Using AI parser with direct PDF (primary, multimodal)");
          const { parseInspectionWithAI } = await import("./ai-document-parser");
          const aiResult = await parseInspectionWithAI(req.file.buffer);
          items = aiResult.items;
          aiUsed = true;
          console.log(`[InspectionParser] AI extracted ${items.length} items (with photo detection)`);
        } catch (aiErr) {
          console.error("[InspectionParser] AI parsing failed, falling back to text extraction + regex:", aiErr);
          try {
            const pdfParseModule = await import("pdf-parse");
            const pdfParseFn = (pdfParseModule as any).default || pdfParseModule;
            const pdfData = await pdfParseFn(req.file.buffer);
            const rawText = pdfData.text || "";
            const { parseInspectionReport } = await import("./inspection-parser");
            items = parseInspectionReport(rawText);
          } catch (fallbackErr) {
            console.error("[InspectionParser] Regex fallback also failed:", fallbackErr);
            return res.status(400).json({ error: 'Failed to parse inspection report' });
          }
        }
      } else {
        const rawText = req.file.buffer.toString('utf-8');
        try {
          const { parseInspectionWithAI } = await import("./ai-document-parser");
          const aiResult = await parseInspectionWithAI(rawText);
          items = aiResult.items;
          aiUsed = true;
        } catch {
          const { parseInspectionReport } = await import("./inspection-parser");
          items = parseInspectionReport(rawText);
        }
      }

      res.json({ items, transactionId, aiUsed });
    } catch (error) {
      console.error('Error parsing inspection report:', error);
      res.status(500).json({ error: 'Failed to parse inspection report' });
    }
  });

  app.get("/api/transactions/:id/inspection-pdf", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transactionId = Number(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
      if (req.user.role === "agent") {
        if (transaction.agentId !== req.user.id) {
          return res.status(403).json({ error: 'Not authorized' });
        }
      } else {
        return res.status(403).json({ error: 'Not authorized' });
      }
      const pdfInfo = await storage.getInspectionPdf(transactionId);
      if (!pdfInfo) return res.status(404).json({ error: 'No inspection PDF found' });
      const fs = await import("fs");
      if (!fs.default.existsSync(pdfInfo.filePath)) {
        return res.status(404).json({ error: 'PDF file not found on disk' });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${pdfInfo.fileName}"`);
      const fileStream = fs.default.createReadStream(pdfInfo.filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error serving inspection PDF:', error);
      res.status(500).json({ error: 'Failed to serve inspection PDF' });
    }
  });

  app.post("/api/transactions/:id/inspection-items", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const transactionId = Number(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction || transaction.agentId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      const items = req.body.items;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array is required' });
      }
      const created = [];
      for (const item of items) {
        const parsed = insertInspectionItemSchema.safeParse({
          ...item,
          transactionId,
          status: item.status || 'approved',
        });
        if (!parsed.success) {
          console.error('Validation error for inspection item:', parsed.error);
          continue;
        }
        const createdItem = await storage.createInspectionItem(parsed.data);
        created.push(createdItem);
      }
      res.status(201).json(created);
    } catch (error) {
      console.error('Error saving inspection items:', error);
      res.status(500).json({ error: 'Failed to save inspection items' });
    }
  });

  app.get("/api/transactions/:id/inspection-items", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transactionId = Number(req.params.id);
      const { allowed } = await verifyTransactionAccess(transactionId, req.user.id, req.user.role);
      if (!allowed) return res.status(403).json({ error: 'Not authorized' });
      const items = await storage.getInspectionItemsByTransaction(transactionId);
      res.json(items);
    } catch (error) {
      console.error('Error fetching inspection items:', error);
      res.status(500).json({ error: 'Failed to fetch inspection items' });
    }
  });

  app.patch("/api/inspection-items/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const id = Number(req.params.id);
      const item = await db.execute(sql`SELECT transaction_id FROM inspection_items WHERE id = ${id} LIMIT 1`);
      if (item.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
      const { allowed, permissionLevel } = await verifyTransactionAccess((item.rows[0] as any).transaction_id, req.user.id, req.user.role);
      if (!allowed || permissionLevel === 'view') return res.status(403).json({ error: 'Not authorized' });
      const allowedFields = ['category', 'description', 'severity', 'location', 'status', 'notes'];
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sanitizedData[field] = req.body[field];
        }
      }
      const updated = await storage.updateInspectionItem(id, sanitizedData);
      res.json(updated);
    } catch (error) {
      console.error('Error updating inspection item:', error);
      res.status(500).json({ error: 'Failed to update inspection item' });
    }
  });

  app.delete("/api/inspection-items/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const id = Number(req.params.id);
      const item = await db.execute(sql`SELECT transaction_id FROM inspection_items WHERE id = ${id} LIMIT 1`);
      if (item.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
      const { allowed, permissionLevel } = await verifyTransactionAccess((item.rows[0] as any).transaction_id, req.user.id, req.user.role);
      if (!allowed || permissionLevel === 'view') return res.status(403).json({ error: 'Not authorized' });
      await storage.deleteInspectionItem(id);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting inspection item:', error);
      res.status(500).json({ error: 'Failed to delete inspection item' });
    }
  });

  // ============ Bid Requests ============
  app.post("/api/inspection-items/:id/send-bids", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const inspectionItemId = Number(req.params.id);
      const { contractorIds, transactionId } = req.body;
      if (!Array.isArray(contractorIds) || contractorIds.length === 0) {
        return res.status(400).json({ error: 'contractorIds array is required' });
      }
      if (!transactionId) {
        return res.status(400).json({ error: 'transactionId is required' });
      }
      const itemCheck = await db.execute(sql`SELECT transaction_id FROM inspection_items WHERE id = ${inspectionItemId} LIMIT 1`);
      if (itemCheck.rows.length === 0) return res.status(404).json({ error: 'Inspection item not found' });
      if ((itemCheck.rows[0] as any).transaction_id !== Number(transactionId)) {
        return res.status(400).json({ error: 'Item does not belong to this transaction' });
      }
      const { allowed, permissionLevel } = await verifyTransactionAccess(Number(transactionId), req.user.id, req.user.role);
      if (!allowed || permissionLevel === 'view') {
        return res.status(403).json({ error: 'Not authorized for this transaction' });
      }
      const createdRequests = [];
      for (const contractorId of contractorIds) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const parsed = insertBidRequestSchema.safeParse({
          transactionId: Number(transactionId),
          inspectionItemId,
          contractorId: Number(contractorId),
          status: 'pending',
          expiresAt,
          notes: req.body.notes || null,
        });
        if (!parsed.success) {
          console.error('Validation error for bid request:', parsed.error);
          continue;
        }
        const created = await storage.createBidRequest(parsed.data);
        createdRequests.push(created);
      }
      await storage.updateInspectionItem(inspectionItemId, { status: 'sent_for_bids' });
      res.status(201).json(createdRequests);
    } catch (error) {
      console.error('Error sending bid requests:', error);
      res.status(500).json({ error: 'Failed to send bid requests' });
    }
  });

  app.get("/api/transactions/:id/bid-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transactionId = Number(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction || (req.user.role === "agent" && transaction.agentId !== req.user.id)) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      const bidRequests = await storage.getBidRequestsByTransaction(transactionId);
      res.json(bidRequests);
    } catch (error) {
      console.error('Error fetching bid requests:', error);
      res.status(500).json({ error: 'Failed to fetch bid requests' });
    }
  });

  // ============ Vendor Portal ============
  const CONTRACTOR_TO_INSPECTION_CATEGORIES: Record<string, string[]> = {
    roofer: ['roof'],
    plumber: ['plumbing'],
    electrician: ['electrical'],
    hvac: ['hvac'],
    painter: ['interior', 'exterior'],
    landscaper: ['exterior'],
    handyman: ['interior', 'exterior', 'appliances', 'other'],
    pest_control: ['exterior', 'interior', 'foundation'],
    home_inspector: ['roof', 'plumbing', 'electrical', 'hvac', 'foundation', 'exterior', 'interior', 'appliances', 'other'],
    cleaner: ['interior'],
    other: ['roof', 'plumbing', 'electrical', 'hvac', 'foundation', 'exterior', 'interior', 'appliances', 'other'],
  };

  app.get("/api/vendor/bid-requests", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "vendor") return res.sendStatus(401);
    try {
      const contractor = await storage.getContractorByVendorUserId(req.user.id);
      if (!contractor) {
        return res.json([]);
      }
      const bidRequests = await storage.getBidRequestsByContractor(contractor.id);
      const allowedCategories = CONTRACTOR_TO_INSPECTION_CATEGORIES[contractor.category] || [];

      const enrichedRequests = [];
      for (const br of bidRequests) {
        const items = await storage.getInspectionItemsByTransaction(br.transactionId);
        const item = items.find(i => i.id === br.inspectionItemId);
        if (!item) continue;
        if (allowedCategories.length > 0 && !allowedCategories.includes(item.category)) continue;

        const pdfInfo = await storage.getInspectionPdf(br.transactionId);
        enrichedRequests.push({
          ...br,
          inspectionItem: item,
          hasPdf: !!pdfInfo,
        });
      }
      res.json(enrichedRequests);
    } catch (error) {
      console.error('Error fetching vendor bid requests:', error);
      res.status(500).json({ error: 'Failed to fetch bid requests' });
    }
  });

  app.get("/api/vendor/inspection-pdf/:transactionId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "vendor") return res.sendStatus(401);
    try {
      const transactionId = Number(req.params.transactionId);
      const contractor = await storage.getContractorByVendorUserId(req.user.id);
      if (!contractor) return res.status(403).json({ error: 'No vendor profile' });
      const bidRequests = await storage.getBidRequestsByContractor(contractor.id);
      const hasAccess = bidRequests.some(br => br.transactionId === transactionId);
      if (!hasAccess) return res.status(403).json({ error: 'Not authorized to view this PDF' });

      const pdfInfo = await storage.getInspectionPdf(transactionId);
      if (!pdfInfo) return res.status(404).json({ error: 'No inspection PDF found' });
      const fs = await import("fs");
      if (!fs.default.existsSync(pdfInfo.filePath)) {
        return res.status(404).json({ error: 'PDF file not found' });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${pdfInfo.fileName}"`);
      fs.default.createReadStream(pdfInfo.filePath).pipe(res);
    } catch (error) {
      console.error('Error serving vendor inspection PDF:', error);
      res.status(500).json({ error: 'Failed to serve PDF' });
    }
  });

  app.get("/api/vendor/profile", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "vendor") return res.sendStatus(401);
    try {
      const contractor = await storage.getContractorByVendorUserId(req.user.id);
      if (!contractor) {
        return res.json(null);
      }
      res.json(contractor);
    } catch (error) {
      console.error('Error fetching vendor profile:', error);
      res.status(500).json({ error: 'Failed to fetch vendor profile' });
    }
  });

  app.patch("/api/vendor/profile", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "vendor") return res.sendStatus(401);
    try {
      const contractor = await storage.getContractorByVendorUserId(req.user.id);
      if (!contractor) {
        return res.status(404).json({ error: 'No vendor profile found' });
      }
      const allowedFields = ['name', 'category', 'phone', 'email', 'website', 'address',
        'city', 'state', 'zipCode', 'description', 'googleMapsUrl', 'yelpUrl', 'bbbUrl'];
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sanitizedData[field] = req.body[field];
        }
      }
      const updated = await storage.updateContractor(contractor.id, sanitizedData);
      res.json(updated);
    } catch (error) {
      console.error('Error updating vendor profile:', error);
      res.status(500).json({ error: 'Failed to update vendor profile' });
    }
  });

  // ============ Vendor-to-Private-Contractor Matching ============
  const NAME_STOPWORDS = new Set(['the', 'and', 'inc', 'llc', 'corp', 'company', 'co', 'services', 'service', 'group', 'solutions', 'pro', 'pros', 'team']);

  function fuzzyNameMatch(vendorName: string, privateName: string): boolean {
    const vendorWords = vendorName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      .filter(w => w.length > 2 && !NAME_STOPWORDS.has(w));
    const privateWords = privateName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      .filter(w => w.length > 2 && !NAME_STOPWORDS.has(w));
    if (vendorWords.length === 0 || privateWords.length === 0) return false;
    const commonWords = vendorWords.filter(w => privateWords.includes(w));
    const similarity = commonWords.length / Math.max(vendorWords.length, privateWords.length);
    return similarity >= 0.6 && commonWords.length >= 2;
  }

  async function findMatchingPrivateContractors(
    vendor: { name: string; email?: string; phone?: string },
    vendorContractorId: number
  ): Promise<Array<{ id: number; name: string; agentId: number; matchType: string }>> {
    const matches: Array<{ id: number; name: string; agentId: number; matchType: string }> = [];
    const seen = new Set<number>();
    const notifiedAgents = new Set<number>();

    if (vendor.email) {
      const emailMatches: any = await db.execute(sql`
        SELECT id, name, agent_id FROM contractors
        WHERE agent_id IS NOT NULL AND vendor_user_id IS NULL
          AND LOWER(email) = LOWER(${vendor.email})
      `);
      for (const row of (emailMatches.rows || emailMatches)) {
        if (!seen.has(row.id)) {
          seen.add(row.id);
          notifiedAgents.add(row.agent_id);
          matches.push({ id: row.id, name: row.name, agentId: row.agent_id, matchType: 'email' });
        }
      }
    }

    if (vendor.phone) {
      const digits = vendor.phone.replace(/\D/g, '').slice(-10);
      if (digits.length === 10) {
        const phoneMatches: any = await db.execute(sql`
          SELECT id, name, agent_id FROM contractors
          WHERE agent_id IS NOT NULL AND vendor_user_id IS NULL
            AND RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = ${digits}
        `);
        for (const row of (phoneMatches.rows || phoneMatches)) {
          if (!seen.has(row.id) && !notifiedAgents.has(row.agent_id)) {
            seen.add(row.id);
            notifiedAgents.add(row.agent_id);
            matches.push({ id: row.id, name: row.name, agentId: row.agent_id, matchType: 'phone' });
          }
        }
      }
    }

    if (vendor.name) {
      const nameMatches: any = await db.execute(sql`
        SELECT id, name, agent_id FROM contractors
        WHERE agent_id IS NOT NULL AND vendor_user_id IS NULL
          AND LOWER(name) != ''
      `);
      for (const row of (nameMatches.rows || nameMatches)) {
        if (seen.has(row.id) || notifiedAgents.has(row.agent_id)) continue;
        if (fuzzyNameMatch(vendor.name, row.name)) {
          seen.add(row.id);
          notifiedAgents.add(row.agent_id);
          matches.push({ id: row.id, name: row.name, agentId: row.agent_id, matchType: 'name' });
        }
      }
    }

    return matches;
  }

  async function findMatchingHomeTeamUsers(
    vendor: { name: string; email?: string; phone?: string },
    vendorContractorId: number
  ): Promise<Array<{ userId: number; contractorId: number; contractorName: string; matchType: string }>> {
    const results: Array<{ userId: number; contractorId: number; contractorName: string; matchType: string }> = [];
    const notifiedUsers = new Set<number>();

    const teamRows: any = await db.execute(sql`
      SELECT htm.user_id, htm.contractor_id, c.name, c.email, c.phone
      FROM home_team_members htm
      JOIN contractors c ON c.id = htm.contractor_id
      WHERE c.vendor_user_id IS NULL AND c.id != ${vendorContractorId}
    `);
    const rows = teamRows.rows || teamRows;

    for (const row of rows) {
      if (notifiedUsers.has(row.user_id)) continue;

      let matchType: string | null = null;
      if (vendor.email && row.email && vendor.email.toLowerCase() === row.email.toLowerCase()) {
        matchType = 'email';
      } else if (vendor.phone && row.phone) {
        const vendorDigits = vendor.phone.replace(/\D/g, '').slice(-10);
        const rowDigits = (row.phone || '').replace(/\D/g, '').slice(-10);
        if (vendorDigits.length === 10 && vendorDigits === rowDigits) {
          matchType = 'phone';
        }
      }
      if (!matchType && vendor.name && row.name && fuzzyNameMatch(vendor.name, row.name)) {
        matchType = 'name';
      }

      if (matchType) {
        notifiedUsers.add(row.user_id);
        results.push({
          userId: row.user_id,
          contractorId: row.contractor_id,
          contractorName: row.name,
          matchType,
        });
      }
    }

    return results;
  }

  // ============ Vendor Self-Registration ============
  app.post("/api/vendor/profile", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "vendor") return res.sendStatus(401);
    try {
      const existing = await storage.getContractorByVendorUserId(req.user.id);
      if (existing) {
        return res.status(409).json({ error: 'Vendor profile already exists' });
      }
      const { name, category, phone, email, website, address, city, state, zipCode, description, googleMapsUrl, yelpUrl, bbbUrl } = req.body;
      if (!name || !category) {
        return res.status(400).json({ error: 'Name and category are required' });
      }
      const contractor = await storage.createVendorProfile({
        name, category, phone, email, website, address, city, state, zipCode, description, googleMapsUrl, yelpUrl, bbbUrl,
        vendorUserId: req.user.id
      });

      try {
        const allNotifiedUsers = new Set<number>();

        const matchingPrivatePros = await findMatchingPrivateContractors(
          { name, email, phone },
          contractor.id
        );
        for (const match of matchingPrivatePros) {
          if (match.agentId && !allNotifiedUsers.has(match.agentId)) {
            allNotifiedUsers.add(match.agentId);
            await notify(
              match.agentId,
              'vendor_match',
              `${name} just joined HomeBase Pros!`,
              `A vendor matching "${match.name}" on your team has registered on the platform. Would you like to sync their profile?`,
              contractor.id,
              'contractor'
            );
            console.log(`[Vendor Match] Notified agent ${match.agentId} about vendor ${name} matching private contractor "${match.name}" (match: ${match.matchType})`);
          }
        }

        const matchingTeamUsers = await findMatchingHomeTeamUsers(
          { name, email, phone },
          contractor.id
        );
        for (const match of matchingTeamUsers) {
          if (!allNotifiedUsers.has(match.userId)) {
            allNotifiedUsers.add(match.userId);
            await notify(
              match.userId,
              'vendor_match',
              `${name} just joined HomeBase Pros!`,
              `A vendor matching "${match.contractorName}" on your team has registered on the platform. Would you like to sync their profile?`,
              contractor.id,
              'contractor'
            );
            console.log(`[Vendor Match] Notified user ${match.userId} about vendor ${name} matching team member "${match.contractorName}" (match: ${match.matchType})`);
          }
        }

        if (allNotifiedUsers.size > 0) {
          console.log(`[Vendor Match] Total users notified: ${allNotifiedUsers.size}`);
        }
      } catch (matchErr) {
        console.error('[Vendor Match] Error checking for matches:', matchErr);
      }

      res.status(201).json(contractor);
    } catch (error) {
      console.error('Error creating vendor profile:', error);
      res.status(500).json({ error: 'Failed to create vendor profile' });
    }
  });

  // ============ Vendor Sync (match private contractor to marketplace vendor) ============
  app.post("/api/vendor/sync-contractor", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { privateContractorId, vendorContractorId } = req.body;
      if (!privateContractorId || !vendorContractorId) {
        return res.status(400).json({ error: 'Both privateContractorId and vendorContractorId are required' });
      }

      const isAgent = req.user.role === 'agent' || req.user.role === 'broker';

      let privatePro: any = null;
      if (isAgent) {
        const privateRow: any = await db.execute(sql`
          SELECT id, name, agent_id FROM contractors WHERE id = ${privateContractorId} AND agent_id = ${req.user.id}
        `);
        privatePro = (privateRow.rows || privateRow)[0];
      }
      if (!privatePro) {
        const teamRow: any = await db.execute(sql`
          SELECT htm.contractor_id, c.name FROM home_team_members htm
          JOIN contractors c ON c.id = htm.contractor_id
          WHERE htm.user_id = ${req.user.id} AND htm.contractor_id = ${privateContractorId}
        `);
        const teamMatch = (teamRow.rows || teamRow)[0];
        if (teamMatch) {
          privatePro = { id: privateContractorId, name: teamMatch.name, fromTeam: true };
        }
      }
      if (!privatePro) return res.status(404).json({ error: 'Contractor not found or not on your team' });

      const vendorRow: any = await db.execute(sql`
        SELECT id, name, vendor_user_id FROM contractors WHERE id = ${vendorContractorId} AND vendor_user_id IS NOT NULL
      `);
      const vendorPro = (vendorRow.rows || vendorRow)[0];
      if (!vendorPro) return res.status(404).json({ error: 'Vendor profile not found' });

      const existingTeam: any = await db.execute(sql`
        SELECT id FROM home_team_members WHERE user_id = ${req.user.id} AND contractor_id = ${vendorContractorId}
      `);
      if ((existingTeam.rows || existingTeam).length > 0) {
        return res.status(409).json({ error: 'This vendor is already on your team' });
      }

      await db.execute(sql`
        INSERT INTO home_team_members (user_id, contractor_id, category, notes, added_at)
        SELECT ${req.user.id}, ${vendorContractorId}, category, 
          ${'Synced from: ' + privatePro.name}, NOW()
        FROM contractors WHERE id = ${vendorContractorId}
      `);

      if (privatePro.fromTeam) {
        await db.execute(sql`
          UPDATE home_team_members SET notes = COALESCE(notes, '') || ${'\n[Synced to verified vendor: ' + vendorPro.name + ']'}
          WHERE user_id = ${req.user.id} AND contractor_id = ${privateContractorId}
        `);
      } else if (privatePro.agent_id) {
        await db.execute(sql`
          UPDATE contractors 
          SET agent_notes = COALESCE(agent_notes, '') || ${'\n[Synced to vendor: ' + vendorPro.name + ']'}
          WHERE id = ${privateContractorId}
        `);
      }

      console.log(`[Vendor Sync] User ${req.user.id} synced contractor ${privateContractorId} with vendor ${vendorContractorId}`);
      res.json({ success: true, message: `${vendorPro.name} has been added to your team` });
    } catch (error) {
      console.error('Error syncing vendor:', error);
      res.status(500).json({ error: 'Failed to sync vendor' });
    }
  });

  app.post("/api/vendor/sync-review", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { contractorId, rating, comment } = req.body;
      if (!contractorId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'contractorId and rating (1-5) are required' });
      }

      const vendorRow: any = await db.execute(sql`
        SELECT id, name, vendor_user_id FROM contractors WHERE id = ${contractorId} AND vendor_user_id IS NOT NULL
      `);
      const vendor = (vendorRow.rows || vendorRow)[0];
      if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

      const existing: any = await db.execute(sql`
        SELECT id FROM contractor_reviews 
        WHERE contractor_id = ${contractorId} AND reviewer_name = ${req.user.firstName + ' ' + req.user.lastName}
      `);
      if ((existing.rows || existing).length > 0) {
        return res.status(409).json({ error: 'You have already reviewed this vendor' });
      }

      const reviewerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email;
      await db.execute(sql`
        INSERT INTO contractor_reviews (contractor_id, reviewer_name, rating, comment, created_at)
        VALUES (${contractorId}, ${reviewerName}, ${rating}, ${comment || null}, NOW())
      `);

      console.log(`[Vendor Review] User ${req.user.id} reviewed vendor ${contractorId} with ${rating} stars`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error submitting vendor review:', error);
      res.status(500).json({ error: 'Failed to submit review' });
    }
  });

  app.get("/api/vendor/match-candidates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const vendorContractorId = Number(req.query.vendorContractorId);
      if (!vendorContractorId) return res.status(400).json({ error: 'vendorContractorId required' });

      const hasNotification: any = await db.execute(sql`
        SELECT id FROM notifications
        WHERE user_id = ${req.user.id} AND type = 'vendor_match'
          AND related_id = ${vendorContractorId} AND related_type = 'contractor'
        LIMIT 1
      `);
      if ((hasNotification.rows || hasNotification).length === 0) {
        return res.status(403).json({ error: 'No matching notification found for this vendor' });
      }

      const vendorRow: any = await db.execute(sql`
        SELECT id, name, email, phone, category FROM contractors WHERE id = ${vendorContractorId} AND vendor_user_id IS NOT NULL
      `);
      const vendor = (vendorRow.rows || vendorRow)[0];
      if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

      const isAgent = req.user.role === 'agent' || req.user.role === 'broker';
      let myPros: any[] = [];

      if (isAgent) {
        const privatePros: any = await db.execute(sql`
          SELECT id, name, email, phone, category FROM contractors
          WHERE agent_id = ${req.user.id} AND vendor_user_id IS NULL
        `);
        myPros = [...(privatePros.rows || privatePros)];
      }

      const teamPros: any = await db.execute(sql`
        SELECT c.id, c.name, c.email, c.phone, c.category FROM home_team_members htm
        JOIN contractors c ON c.id = htm.contractor_id
        WHERE htm.user_id = ${req.user.id} AND c.vendor_user_id IS NULL AND c.id != ${vendorContractorId}
      `);
      const teamRows = teamPros.rows || teamPros;
      const existingIds = new Set(myPros.map((p: any) => p.id));
      for (const row of teamRows) {
        if (!existingIds.has(row.id)) {
          myPros.push(row);
        }
      }

      res.json({ vendor, privatePros: myPros });
    } catch (error) {
      console.error('Error fetching match candidates:', error);
      res.status(500).json({ error: 'Failed to fetch match candidates' });
    }
  });

  // ============ Vendor Team Requests ============
  app.get("/api/vendor/agent-opportunities", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "vendor") return res.sendStatus(401);
    try {
      const profile = await storage.getContractorByVendorUserId(req.user.id);
      if (!profile) return res.status(404).json({ error: 'Create your profile first' });
      const category = (req.query.category as string) || profile.category;
      const agents = await storage.getAgentsWithoutCategoryVendor(category);
      const filteredAgents = agents.filter(a => a.id !== req.user!.id);
      res.json(filteredAgents);
    } catch (error) {
      console.error('Error fetching agent opportunities:', error);
      res.status(500).json({ error: 'Failed to fetch agent opportunities' });
    }
  });

  app.post("/api/vendor/team-requests", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "vendor") return res.sendStatus(401);
    try {
      const profile = await storage.getContractorByVendorUserId(req.user.id);
      if (!profile) return res.status(404).json({ error: 'Create your profile first' });
      const { agentId, message } = req.body;
      if (!agentId) return res.status(400).json({ error: 'Agent ID is required' });
      const targetAgent = await storage.getUser(Number(agentId));
      if (!targetAgent || (targetAgent.role !== 'agent' && targetAgent.role !== 'broker')) {
        return res.status(400).json({ error: 'Target must be an agent or broker' });
      }
      const existingRequests = await storage.getTeamRequestsByVendor(profile.id);
      const hasPending = existingRequests.some(r => r.agentId === Number(agentId) && r.status === 'pending');
      if (hasPending) {
        return res.status(409).json({ error: 'You already have a pending request to this agent' });
      }
      const request = await storage.createVendorTeamRequest({
        vendorContractorId: profile.id,
        agentId: Number(agentId),
        category: profile.category,
        message: message || null
      });
      res.status(201).json(request);
    } catch (error) {
      console.error('Error creating team request:', error);
      res.status(500).json({ error: 'Failed to create team request' });
    }
  });

  app.get("/api/vendor/team-requests", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "vendor") return res.sendStatus(401);
    try {
      const profile = await storage.getContractorByVendorUserId(req.user.id);
      if (!profile) return res.json([]);
      const requests = await storage.getTeamRequestsByVendor(profile.id);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching vendor team requests:', error);
      res.status(500).json({ error: 'Failed to fetch team requests' });
    }
  });

  app.get("/api/agent/team-requests", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const requests = await storage.getTeamRequestsByAgent(req.user.id);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching agent team requests:', error);
      res.status(500).json({ error: 'Failed to fetch team requests' });
    }
  });

  app.patch("/api/agent/team-requests/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const { status } = req.body;
      if (!status || !['accepted', 'declined'].includes(status)) {
        return res.status(400).json({ error: 'Status must be accepted or declined' });
      }
      const requests = await storage.getTeamRequestsByAgent(req.user.id);
      const request = requests.find(r => r.id === Number(req.params.id));
      if (!request) {
        return res.status(404).json({ error: 'Request not found or not yours' });
      }
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Request already processed' });
      }
      const updated = await storage.updateTeamRequestStatus(Number(req.params.id), status);
      if (status === 'accepted') {
        const existingTeam = await storage.getHomeTeamByUser(req.user.id);
        const alreadyOnTeam = existingTeam.some(m => m.contractorId === updated.vendorContractorId);
        if (!alreadyOnTeam) {
          await storage.addHomeTeamMember({
            userId: req.user.id,
            contractorId: updated.vendorContractorId,
            category: updated.category,
            notes: 'Added via vendor team request'
          });
        }
      }
      res.json(updated);
    } catch (error) {
      console.error('Error updating team request:', error);
      res.status(500).json({ error: 'Failed to update team request' });
    }
  });

  // ============ Bids ============
  app.post("/api/bids", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "vendor") return res.sendStatus(401);
    try {
      const contractor = await storage.getContractorByVendorUserId(req.user.id);
      if (!contractor) {
        return res.status(403).json({ error: 'No vendor profile linked' });
      }
      const parsed = insertBidSchema.safeParse({
        ...req.body,
        contractorId: contractor.id,
      });
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }
      const bid = await storage.createBid(parsed.data);
      await storage.updateBidRequest(parsed.data.bidRequestId, { status: 'bid_submitted' });

      try {
        const brResult = await db.execute(sql`
          SELECT transaction_id FROM bid_requests WHERE id = ${parsed.data.bidRequestId}
        `);
        if (brResult.rows[0]) {
          const transaction = await storage.getTransaction(Number(brResult.rows[0].transaction_id));
          if (transaction) {
            const vendorName = contractor.companyName || contractor.name || 'A vendor';
            notify(
              transaction.agentId,
              'bid_received',
              'New Bid Received',
              `${vendorName} submitted a bid for inspection repairs`,
              transaction.id,
              'bid'
            ).catch(() => {});
          }
        }
      } catch (e) {}

      res.status(201).json(bid);
    } catch (error) {
      console.error('Error creating bid:', error);
      res.status(500).json({ error: 'Failed to create bid' });
    }
  });

  app.get("/api/transactions/:id/bids", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transactionId = Number(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction || (req.user.role === "agent" && transaction.agentId !== req.user.id)) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      const bidRequests = await storage.getBidRequestsByTransaction(transactionId);
      const allBids = [];
      for (const br of bidRequests) {
        const bids = await storage.getBidsByBidRequest(br.id);
        allBids.push(...bids);
      }
      res.json(allBids);
    } catch (error) {
      console.error('Error fetching bids:', error);
      res.status(500).json({ error: 'Failed to fetch bids' });
    }
  });

  app.patch("/api/bids/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const id = Number(req.params.id);
      const allowedFields = ['status'];
      const sanitizedData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sanitizedData[field] = req.body[field];
        }
      }
      sanitizedData.updatedAt = new Date();
      const updated = await storage.updateBid(id, sanitizedData);
      res.json(updated);
    } catch (error) {
      console.error('Error updating bid:', error);
      res.status(500).json({ error: 'Failed to update bid' });
    }
  });

  app.get("/api/vendor/bids", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "vendor") return res.sendStatus(401);
    try {
      const contractor = await storage.getContractorByVendorUserId(req.user.id);
      if (!contractor) {
        return res.json([]);
      }
      const bids = await storage.getBidsByContractor(contractor.id);
      res.json(bids);
    } catch (error) {
      console.error('Error fetching vendor bids:', error);
      res.status(500).json({ error: 'Failed to fetch vendor bids' });
    }
  });

  app.post("/api/referral/generate", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const existing = await storage.getReferralCodeByAgent(req.user.id);
      if (existing) {
        return res.json(existing);
      }
      const code = `HB-${req.user.id}-${randomUUID().slice(0, 8).toUpperCase()}`;
      const referralCode = await storage.createReferralCode({
        agentUserId: req.user.id,
        code,
      });
      res.status(201).json(referralCode);
    } catch (error) {
      console.error('Error generating referral code:', error);
      res.status(500).json({ error: 'Failed to generate referral code' });
    }
  });

  app.get("/api/referral/my-code", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const referralCode = await storage.getReferralCodeByAgent(req.user.id);
      if (!referralCode) {
        return res.status(404).json({ error: 'No referral code found. Generate one first.' });
      }
      res.json(referralCode);
    } catch (error) {
      console.error('Error fetching referral code:', error);
      res.status(500).json({ error: 'Failed to fetch referral code' });
    }
  });

  app.get("/api/referral/credits", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const credits = await storage.getReferralCreditsByUser(req.user.id);
      res.json(credits);
    } catch (error) {
      console.error('Error fetching referral credits:', error);
      res.status(500).json({ error: 'Failed to fetch referral credits' });
    }
  });

  app.get("/api/marketplace/categories", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const categories = [
        { id: "plumbing", name: "Plumbing", icon: "wrench" },
        { id: "electrical", name: "Electrical", icon: "zap" },
        { id: "hvac", name: "HVAC", icon: "thermometer" },
        { id: "roofing", name: "Roofing", icon: "home" },
        { id: "painting", name: "Painting", icon: "paintbrush" },
        { id: "landscaping", name: "Landscaping", icon: "trees" },
        { id: "cleaning", name: "Cleaning", icon: "sparkles" },
        { id: "handyman", name: "Handyman", icon: "hammer" },
        { id: "pest_control", name: "Pest Control", icon: "bug" },
        { id: "pool_maintenance", name: "Pool Maintenance", icon: "waves" },
        { id: "window_specialist", name: "Window Specialist", icon: "square" },
        { id: "garage_door", name: "Garage Door", icon: "door-open" },
        { id: "carpet_cleaning", name: "Carpet Cleaning", icon: "vacuum" },
        { id: "locksmith", name: "Locksmith", icon: "key" },
        { id: "tree_service", name: "Tree Service", icon: "tree-pine" },
        { id: "gutter_cleaning", name: "Gutter Cleaning", icon: "droplets" },
        { id: "pressure_washing", name: "Pressure Washing", icon: "spray-can" },
        { id: "fence", name: "Fence", icon: "fence" },
        { id: "concrete", name: "Concrete", icon: "construction" },
        { id: "flooring", name: "Flooring", icon: "layers" },
        { id: "cabinet", name: "Cabinet", icon: "cabinet" },
        { id: "countertop", name: "Countertop", icon: "square" },
        { id: "appliance_repair", name: "Appliance Repair", icon: "settings" },
        { id: "security_system", name: "Security System", icon: "shield" },
        { id: "inspector", name: "Inspector", icon: "search" },
        { id: "appraiser", name: "Appraiser", icon: "clipboard" },
        { id: "surveyor", name: "Surveyor", icon: "map" },
        { id: "photographer", name: "Photographer", icon: "camera" },
        { id: "stager", name: "Stager", icon: "sofa" },
        { id: "mover", name: "Mover", icon: "truck" },
        { id: "other", name: "Other", icon: "more-horizontal" },
      ];
      res.json(categories);
    } catch (error) {
      console.error('Error fetching marketplace categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  app.get("/api/marketplace/contractors", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const category = req.query.category ? String(req.query.category) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      const [contractors, total] = await Promise.all([
        storage.getMarketplaceContractors({ category, search, limit, offset }),
        storage.getMarketplaceContractorCount({ category, search }),
      ]);

      if (contractors.length === 0) {
        return res.json({ contractors: [], total, limit, offset });
      }

      const contractorIds = contractors.map(c => c.id);
      const idsArray = `{${contractorIds.join(',')}}`;
      const [teamCounts, trustedCounts] = await Promise.all([
        db.execute(sql`
          SELECT contractor_id, COUNT(DISTINCT user_id) as count 
          FROM home_team_members 
          WHERE contractor_id = ANY(${idsArray}::int[])
          GROUP BY contractor_id
        `),
        db.execute(sql`
          SELECT contractor_id, COUNT(DISTINCT agent_id) as count 
          FROM vendor_ratings 
          WHERE contractor_id = ANY(${idsArray}::int[]) AND would_recommend = true
          GROUP BY contractor_id
        `),
      ]);

      const teamMap = new Map<number, number>();
      for (const row of teamCounts.rows as any[]) {
        teamMap.set(row.contractor_id, Number(row.count));
      }
      const trustedMap = new Map<number, number>();
      for (const row of trustedCounts.rows as any[]) {
        trustedMap.set(row.contractor_id, Number(row.count));
      }

      const enriched = contractors.map(c => ({
        ...c,
        teamCount: teamMap.get(c.id) || 0,
        trustedByCount: trustedMap.get(c.id) || 0,
      }));

      res.json({ contractors: enriched, total, limit, offset });
    } catch (error) {
      console.error('Error fetching marketplace contractors:', error);
      res.status(500).json({ error: 'Failed to fetch contractors' });
    }
  });

  app.get("/api/marketplace/contractors/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid contractor ID' });

      const contractor = await storage.getContractor(id);
      if (!contractor) return res.status(404).json({ error: 'Contractor not found' });
      if (!contractor.vendorUserId) return res.status(404).json({ error: 'Contractor not found in marketplace' });

      const [reviews, recommendationCount, teamCount, trustedByCount] = await Promise.all([
        storage.getContractorReviews(id),
        storage.getContractorRecommendationCount(id),
        storage.getContractorTeamCount(id),
        storage.getContractorTrustedByAgentCount(id),
      ]);

      res.json({ ...contractor, reviews, recommendationCount, teamCount, trustedByCount });
    } catch (error) {
      console.error('Error fetching marketplace contractor:', error);
      res.status(500).json({ error: 'Failed to fetch contractor' });
    }
  });

  // ==================== MyHome Routes ====================

  app.post("/api/my-homes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const parsed = insertHomeownerHomeSchema.safeParse({ ...req.body, userId: req.user.id });
      if (!parsed.success) return res.status(400).json(parsed.error);
      const home = await storage.createHome(parsed.data);
      res.status(201).json(home);
    } catch (error) {
      console.error('Error creating home:', error);
      res.status(500).json({ error: 'Failed to create home' });
    }
  });

  app.get("/api/my-homes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const homes = await storage.getHomesByUser(req.user.id);
      res.json(homes);
    } catch (error) {
      console.error('Error fetching homes:', error);
      res.status(500).json({ error: 'Failed to fetch homes' });
    }
  });

  app.get("/api/my-homes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = Number(req.params.id);
      const home = await storage.getHome(id);
      if (!home) return res.status(404).json({ error: 'Home not found' });
      if (home.userId !== req.user.id) return res.sendStatus(403);
      const maintenance = await storage.getMaintenanceByHome(id);
      res.json({ ...home, maintenance });
    } catch (error) {
      console.error('Error fetching home:', error);
      res.status(500).json({ error: 'Failed to fetch home' });
    }
  });

  app.patch("/api/my-homes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = Number(req.params.id);
      const home = await storage.getHome(id);
      if (!home) return res.status(404).json({ error: 'Home not found' });
      if (home.userId !== req.user.id) return res.sendStatus(403);
      const updated = await storage.updateHome(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error updating home:', error);
      res.status(500).json({ error: 'Failed to update home' });
    }
  });

  app.delete("/api/my-homes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = Number(req.params.id);
      const home = await storage.getHome(id);
      if (!home) return res.status(404).json({ error: 'Home not found' });
      if (home.userId !== req.user.id) return res.sendStatus(403);
      await storage.deleteHome(id);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting home:', error);
      res.status(500).json({ error: 'Failed to delete home' });
    }
  });

  // ==================== Maintenance Routes ====================

  app.post("/api/my-homes/:id/maintenance", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const homeId = Number(req.params.id);
      const home = await storage.getHome(homeId);
      if (!home) return res.status(404).json({ error: 'Home not found' });
      if (home.userId !== req.user.id) return res.sendStatus(403);
      const parsed = insertMaintenanceRecordSchema.safeParse({ ...req.body, homeId });
      if (!parsed.success) return res.status(400).json(parsed.error);
      const record = await storage.createMaintenanceRecord(parsed.data);
      res.status(201).json(record);
    } catch (error) {
      console.error('Error creating maintenance record:', error);
      res.status(500).json({ error: 'Failed to create maintenance record' });
    }
  });

  app.get("/api/my-homes/:id/maintenance", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const homeId = Number(req.params.id);
      const home = await storage.getHome(homeId);
      if (!home) return res.status(404).json({ error: 'Home not found' });
      if (home.userId !== req.user.id) return res.sendStatus(403);
      const records = await storage.getMaintenanceByHome(homeId);
      res.json(records);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
      res.status(500).json({ error: 'Failed to fetch maintenance records' });
    }
  });

  app.patch("/api/maintenance/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = Number(req.params.id);
      const homes = await storage.getHomesByUser(req.user.id);
      const homeIds = homes.map(h => h.id);
      let ownsRecord = false;
      for (const hId of homeIds) {
        const records = await storage.getMaintenanceByHome(hId);
        if (records.some(r => r.id === id)) { ownsRecord = true; break; }
      }
      if (!ownsRecord) return res.status(403).json({ error: 'Not authorized' });
      const updated = await storage.updateMaintenanceRecord(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error updating maintenance record:', error);
      res.status(500).json({ error: 'Failed to update maintenance record' });
    }
  });

  app.delete("/api/maintenance/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = Number(req.params.id);
      const homes = await storage.getHomesByUser(req.user.id);
      const homeIds = homes.map(h => h.id);
      let ownsRecord = false;
      for (const hId of homeIds) {
        const records = await storage.getMaintenanceByHome(hId);
        if (records.some(r => r.id === id)) { ownsRecord = true; break; }
      }
      if (!ownsRecord) return res.status(403).json({ error: 'Not authorized' });
      await storage.deleteMaintenanceRecord(id);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting maintenance record:', error);
      res.status(500).json({ error: 'Failed to delete maintenance record' });
    }
  });

  // ==================== Home Expenses Routes ====================

  app.get("/api/my-homes/:id/expenses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const homeId = parseInt(req.params.id);
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === homeId)) return res.status(403).json({ error: 'Not authorized' });
      const expenses = await db.select().from(homeExpenses).where(eq(homeExpenses.homeId, homeId)).orderBy(desc(homeExpenses.billingDate));
      res.json(expenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  });

  app.post("/api/my-homes/:id/expenses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const homeId = parseInt(req.params.id);
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === homeId)) return res.status(403).json({ error: 'Not authorized' });
      const parsed = insertHomeExpenseSchema.safeParse({ ...req.body, homeId });
      if (!parsed.success) return res.status(400).json(parsed.error);
      const [expense] = await db.insert(homeExpenses).values(parsed.data).returning();
      res.status(201).json(expense);
    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(500).json({ error: 'Failed to create expense' });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const [expense] = await db.select().from(homeExpenses).where(eq(homeExpenses.id, id));
      if (!expense) return res.status(404).json({ error: 'Not found' });
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === expense.homeId)) return res.status(403).json({ error: 'Not authorized' });
      const { id: _, createdAt: __, homeId: ___, ...updates } = req.body;
      const [updated] = await db.update(homeExpenses).set(updates).where(eq(homeExpenses.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error('Error updating expense:', error);
      res.status(500).json({ error: 'Failed to update expense' });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const [expense] = await db.select().from(homeExpenses).where(eq(homeExpenses.id, id));
      if (!expense) return res.status(404).json({ error: 'Not found' });
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === expense.homeId)) return res.status(403).json({ error: 'Not authorized' });
      await db.delete(homeExpenses).where(eq(homeExpenses.id, id));
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting expense:', error);
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  });

  // ==================== Home Maintenance Reminders Routes ====================

  app.get("/api/my-homes/:id/reminders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const homeId = parseInt(req.params.id);
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === homeId)) return res.status(403).json({ error: 'Not authorized' });
      const reminders = await db.select().from(homeMaintenanceReminders).where(eq(homeMaintenanceReminders.homeId, homeId)).orderBy(homeMaintenanceReminders.nextDue);
      res.json(reminders);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      res.status(500).json({ error: 'Failed to fetch reminders' });
    }
  });

  app.post("/api/my-homes/:id/reminders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const homeId = parseInt(req.params.id);
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === homeId)) return res.status(403).json({ error: 'Not authorized' });
      const parsed = insertHomeMaintenanceReminderSchema.safeParse({ ...req.body, homeId });
      if (!parsed.success) return res.status(400).json(parsed.error);
      const [reminder] = await db.insert(homeMaintenanceReminders).values(parsed.data).returning();
      res.status(201).json(reminder);
    } catch (error) {
      console.error('Error creating reminder:', error);
      res.status(500).json({ error: 'Failed to create reminder' });
    }
  });

  app.patch("/api/home-reminders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const [reminder] = await db.select().from(homeMaintenanceReminders).where(eq(homeMaintenanceReminders.id, id));
      if (!reminder) return res.status(404).json({ error: 'Not found' });
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === reminder.homeId)) return res.status(403).json({ error: 'Not authorized' });
      const { id: _, createdAt: __, homeId: ___, ...updates } = req.body;
      const [updated] = await db.update(homeMaintenanceReminders).set(updates).where(eq(homeMaintenanceReminders.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error('Error updating reminder:', error);
      res.status(500).json({ error: 'Failed to update reminder' });
    }
  });

  app.delete("/api/home-reminders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const [reminder] = await db.select().from(homeMaintenanceReminders).where(eq(homeMaintenanceReminders.id, id));
      if (!reminder) return res.status(404).json({ error: 'Not found' });
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === reminder.homeId)) return res.status(403).json({ error: 'Not authorized' });
      await db.delete(homeMaintenanceReminders).where(eq(homeMaintenanceReminders.id, id));
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting reminder:', error);
      res.status(500).json({ error: 'Failed to delete reminder' });
    }
  });

  // ==================== Home Equity Profile Routes ====================

  app.get("/api/my-homes/:id/equity", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const homeId = parseInt(req.params.id);
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === homeId)) return res.status(403).json({ error: 'Not authorized' });
      const [profile] = await db.select().from(homeEquityProfiles).where(eq(homeEquityProfiles.homeId, homeId));
      res.json(profile || null);
    } catch (error) {
      console.error('Error fetching equity profile:', error);
      res.status(500).json({ error: 'Failed to fetch equity profile' });
    }
  });

  app.post("/api/my-homes/:id/equity", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const homeId = parseInt(req.params.id);
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === homeId)) return res.status(403).json({ error: 'Not authorized' });
      const existing = await db.select().from(homeEquityProfiles).where(eq(homeEquityProfiles.homeId, homeId));
      if (existing.length > 0) {
        const { id: _, createdAt: __, ...updates } = req.body;
        const [updated] = await db.update(homeEquityProfiles).set({ ...updates, homeId, updatedAt: new Date() }).where(eq(homeEquityProfiles.homeId, homeId)).returning();
        return res.json(updated);
      }
      const parsed = insertHomeEquityProfileSchema.safeParse({ ...req.body, homeId });
      if (!parsed.success) return res.status(400).json(parsed.error);
      const [profile] = await db.insert(homeEquityProfiles).values(parsed.data).returning();
      res.status(201).json(profile);
    } catch (error) {
      console.error('Error saving equity profile:', error);
      res.status(500).json({ error: 'Failed to save equity profile' });
    }
  });

  app.post("/api/my-homes/:id/equity/refresh-estimate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const homeId = parseInt(req.params.id);
      const homes = await storage.getHomesByUser(req.user.id);
      const home = homes.find(h => h.id === homeId);
      if (!home) return res.status(403).json({ error: 'Not authorized' });
      
      const [profile] = await db.select().from(homeEquityProfiles).where(eq(homeEquityProfiles.homeId, homeId));
      if (profile?.estimatedValueUpdatedAt) {
        const daysSinceUpdate = (Date.now() - new Date(profile.estimatedValueUpdatedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 30) {
          return res.status(429).json({ 
            error: 'Estimate was recently refreshed', 
            nextRefreshDate: new Date(new Date(profile.estimatedValueUpdatedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            currentEstimate: profile.estimatedValue
          });
        }
      }

      const address = home.address;
      const city = home.city || '';
      const state = home.state || '';
      
      try {
        const { getCachedOrFetch } = await import('./rentcast-cache.js');
        const cacheKey = `property_${address}_${city}_${state}`;
        const propertyData = await getCachedOrFetch(
          cacheKey,
          async () => {
            const params = new URLSearchParams({ address });
            if (city) params.append('city', city);
            if (state) params.append('state', state);
            const apiRes = await fetch(`https://api.rentcast.io/v1/properties?${params}`, {
              headers: { 'X-Api-Key': process.env.RENTCAST_API_KEY || '', Accept: 'application/json' }
            });
            if (!apiRes.ok) throw new Error('RentCast API error');
            return apiRes.json();
          },
          'property'
        );
        
        let estimatedValue = null;
        if (Array.isArray(propertyData) && propertyData.length > 0) {
          estimatedValue = propertyData[0].price || propertyData[0].estimatedValue || propertyData[0].lastSalePrice;
        } else if (propertyData?.price || propertyData?.estimatedValue) {
          estimatedValue = propertyData.price || propertyData.estimatedValue;
        }
        
        if (estimatedValue) {
          await db.update(homeEquityProfiles).set({ 
            estimatedValue: Math.round(estimatedValue), 
            estimatedValueUpdatedAt: new Date(),
            updatedAt: new Date()
          }).where(eq(homeEquityProfiles.homeId, homeId));
        }
        
        res.json({ estimatedValue: estimatedValue ? Math.round(estimatedValue) : null, updatedAt: new Date().toISOString() });
      } catch (apiError) {
        console.error('RentCast estimate error:', apiError);
        res.json({ estimatedValue: null, error: 'Unable to fetch estimate at this time' });
      }
    } catch (error) {
      console.error('Error refreshing estimate:', error);
      res.status(500).json({ error: 'Failed to refresh estimate' });
    }
  });

  app.get("/api/mortgage-rates", async (_req, res) => {
    try {
      const response = await fetch('https://www.freddiemac.com/pmms/docs/PMMS_history.csv');
      if (!response.ok) {
        return res.json({ rate30yr: '6.65', rate15yr: '5.89', source: 'fallback', asOf: new Date().toISOString() });
      }
      const text = await response.text();
      const lines = text.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const parts = lastLine.split(',');
      const rate30yr = parts[1] || '6.65';
      const rate15yr = parts[2] || '5.89';
      const dateStr = parts[0] || '';
      res.json({ rate30yr, rate15yr, source: 'freddie_mac', asOf: dateStr });
    } catch (error) {
      console.error('Error fetching mortgage rates:', error);
      res.json({ rate30yr: '6.65', rate15yr: '5.89', source: 'fallback', asOf: new Date().toISOString() });
    }
  });

  // ==================== Home Warranty Items Routes ====================

  app.get("/api/my-homes/:id/warranty", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const homeId = parseInt(req.params.id);
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === homeId)) return res.status(403).json({ error: 'Not authorized' });
      const items = await db.select().from(homeWarrantyItems).where(eq(homeWarrantyItems.homeId, homeId)).orderBy(homeWarrantyItems.expirationDate);
      res.json(items);
    } catch (error) {
      console.error('Error fetching warranty items:', error);
      res.status(500).json({ error: 'Failed to fetch warranty items' });
    }
  });

  app.post("/api/my-homes/:id/warranty", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const homeId = parseInt(req.params.id);
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === homeId)) return res.status(403).json({ error: 'Not authorized' });
      const parsed = insertHomeWarrantyItemSchema.safeParse({ ...req.body, homeId });
      if (!parsed.success) return res.status(400).json(parsed.error);
      const [item] = await db.insert(homeWarrantyItems).values(parsed.data).returning();
      res.status(201).json(item);
    } catch (error) {
      console.error('Error creating warranty item:', error);
      res.status(500).json({ error: 'Failed to create warranty item' });
    }
  });

  app.patch("/api/warranty/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const [item] = await db.select().from(homeWarrantyItems).where(eq(homeWarrantyItems.id, id));
      if (!item) return res.status(404).json({ error: 'Not found' });
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === item.homeId)) return res.status(403).json({ error: 'Not authorized' });
      const { id: _, createdAt: __, homeId: ___, ...updates } = req.body;
      const [updated] = await db.update(homeWarrantyItems).set(updates).where(eq(homeWarrantyItems.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error('Error updating warranty item:', error);
      res.status(500).json({ error: 'Failed to update warranty item' });
    }
  });

  app.delete("/api/warranty/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const [item] = await db.select().from(homeWarrantyItems).where(eq(homeWarrantyItems.id, id));
      if (!item) return res.status(404).json({ error: 'Not found' });
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === item.homeId)) return res.status(403).json({ error: 'Not authorized' });
      await db.delete(homeWarrantyItems).where(eq(homeWarrantyItems.id, id));
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting warranty item:', error);
      res.status(500).json({ error: 'Failed to delete warranty item' });
    }
  });

  // ==================== Home Improvements Routes ====================

  app.get("/api/my-homes/:id/improvements", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const homeId = parseInt(req.params.id);
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === homeId)) return res.status(403).json({ error: 'Not authorized' });
      const items = await db.select().from(homeImprovements).where(eq(homeImprovements.homeId, homeId)).orderBy(desc(homeImprovements.completionDate));
      res.json(items);
    } catch (error) {
      console.error('Error fetching improvements:', error);
      res.status(500).json({ error: 'Failed to fetch improvements' });
    }
  });

  app.post("/api/my-homes/:id/improvements", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const homeId = parseInt(req.params.id);
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === homeId)) return res.status(403).json({ error: 'Not authorized' });
      const parsed = insertHomeImprovementSchema.safeParse({ ...req.body, homeId });
      if (!parsed.success) return res.status(400).json(parsed.error);
      const [item] = await db.insert(homeImprovements).values(parsed.data).returning();
      res.status(201).json(item);
    } catch (error) {
      console.error('Error creating improvement:', error);
      res.status(500).json({ error: 'Failed to create improvement' });
    }
  });

  app.patch("/api/improvements/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const [item] = await db.select().from(homeImprovements).where(eq(homeImprovements.id, id));
      if (!item) return res.status(404).json({ error: 'Not found' });
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === item.homeId)) return res.status(403).json({ error: 'Not authorized' });
      const { id: _, createdAt: __, homeId: ___, ...updates } = req.body;
      const [updated] = await db.update(homeImprovements).set(updates).where(eq(homeImprovements.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error('Error updating improvement:', error);
      res.status(500).json({ error: 'Failed to update improvement' });
    }
  });

  app.delete("/api/improvements/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const [item] = await db.select().from(homeImprovements).where(eq(homeImprovements.id, id));
      if (!item) return res.status(404).json({ error: 'Not found' });
      const homes = await storage.getHomesByUser(req.user.id);
      if (!homes.find(h => h.id === item.homeId)) return res.status(403).json({ error: 'Not authorized' });
      await db.delete(homeImprovements).where(eq(homeImprovements.id, id));
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting improvement:', error);
      res.status(500).json({ error: 'Failed to delete improvement' });
    }
  });

  // ==================== Market Insights Route ====================

  app.get("/api/my-homes/:id/market-insights", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const homeId = parseInt(req.params.id);
      const homes = await storage.getHomesByUser(req.user.id);
      const home = homes.find(h => h.id === homeId);
      if (!home) return res.status(403).json({ error: 'Not authorized' });

      const zipCode = home.zipCode;
      const insights: any = { zipCode, medianValue: null, activeListings: 0, disclaimer: 'Estimated values are approximate and not an appraisal.' };

      if (zipCode) {
        try {
          const censusRes = await fetch(`https://api.census.gov/data/2022/acs/acs5?get=B25077_001E&for=zip%20code%20tabulation%20area:${zipCode}`);
          if (censusRes.ok) {
            const data = await censusRes.json();
            if (data.length > 1) {
              insights.medianValue = parseInt(data[1][0]);
            }
          }
        } catch (e) {
          console.error('Census API error:', e);
        }
      }

      const [equityProfile] = await db.select().from(homeEquityProfiles).where(eq(homeEquityProfiles.homeId, homeId));
      if (equityProfile) {
        insights.estimatedValue = equityProfile.estimatedValue;
        insights.estimatedValueUpdatedAt = equityProfile.estimatedValueUpdatedAt;
      }

      res.json(insights);
    } catch (error) {
      console.error('Error fetching market insights:', error);
      res.status(500).json({ error: 'Failed to fetch market insights' });
    }
  });

  app.post("/api/my-homes/:id/scan-receipt", upload.single("file"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    try {
      const allowedMimes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
      if (!allowedMimes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Invalid file type. Upload a PDF or image (JPEG, PNG, WebP, HEIC)." });
      }
      if (req.file.size > 20 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large. Maximum 20MB." });
      }
      const homeId = parseInt(req.params.id);
      const homes = await storage.getHomesByUser(req.user.id);
      const home = homes.find(h => h.id === homeId);
      if (!home) return res.status(403).json({ error: "Not authorized" });

      const { parseHomeReceiptWithAI } = await import("./ai-document-parser");
      const mimeType = req.file.mimetype === "image/jpg" ? "image/jpeg" : req.file.mimetype;
      const result = await parseHomeReceiptWithAI(req.file.buffer, mimeType);

      res.json(result.parsed);
    } catch (error) {
      console.error("Error scanning receipt:", error);
      res.status(500).json({ error: "Failed to scan document" });
    }
  });

  // ==================== Vendor Invite Routes ====================

  app.post("/api/vendor-invite", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { contractorId } = req.body;
      let contractor = null;
      if (contractorId) {
        contractor = await storage.getContractor(contractorId);
      }

      let referralCodeId: number | null = null;
      const isAgentOrBroker = req.user.role === "agent" || req.user.role === "broker";
      if (isAgentOrBroker) {
        let referralCode = await storage.getReferralCodeByAgent(req.user.id);
        if (!referralCode) {
          const code = `HB-${req.user.id}-${randomUUID().slice(0, 8).toUpperCase()}`;
          referralCode = await storage.createReferralCode({
            agentUserId: req.user.id,
            code,
          });
        }
        referralCodeId = referralCode.id;
      }

      const token = randomUUID().replace(/-/g, '').slice(0, 12);
      const invite = await storage.createVendorInviteToken({
        token,
        invitedByUserId: req.user.id,
        referralCodeId,
        contractorId: contractor?.id || null,
        contractorName: contractor?.name || req.body.contractorName || null,
      });

      res.status(201).json({ token: invite.token });
    } catch (error) {
      console.error('Error creating vendor invite:', error);
      res.status(500).json({ error: 'Failed to create invite' });
    }
  });

  app.get("/api/vendor-invite/:token", async (req, res) => {
    try {
      const invite = await storage.getVendorInviteTokenByToken(req.params.token);
      if (!invite) {
        return res.status(404).json({ error: 'Invalid invite link' });
      }

      if (invite.referralCodeId) {
        const referralCode = await storage.getReferralCodeByAgent(invite.invitedByUserId);
        if (referralCode) {
          res.cookie('hb_referral', referralCode.code, {
            maxAge: 30 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
          });
        }
      }

      const inviter = await storage.getUser(invite.invitedByUserId);
      res.json({
        contractorName: invite.contractorName,
        invitedBy: inviter ? `${inviter.firstName} ${inviter.lastName}` : null,
        hasReferral: !!invite.referralCodeId,
      });
    } catch (error) {
      console.error('Error resolving vendor invite:', error);
      res.status(500).json({ error: 'Failed to resolve invite' });
    }
  });

  // ==================== MyHomeTeam Routes ====================

  app.post("/api/my-team", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const parsed = insertHomeTeamMemberSchema.safeParse({ ...req.body, userId: req.user.id });
      if (!parsed.success) return res.status(400).json(parsed.error);
      const member = await storage.addHomeTeamMember(parsed.data);
      res.status(201).json(member);
    } catch (error) {
      console.error('Error adding team member:', error);
      res.status(500).json({ error: 'Failed to add team member' });
    }
  });

  app.get("/api/my-team", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const members = await storage.getHomeTeamByUser(req.user.id);
      const membersWithContractors = await Promise.all(
        members.map(async (member) => {
          const contractor = await storage.getContractor(member.contractorId);
          let vendorProfilePhoto: string | null = null;
          if (contractor?.vendorUserId) {
            const vendorUser = await storage.getUser(contractor.vendorUserId);
            vendorProfilePhoto = vendorUser?.profilePhotoUrl || null;
          }
          return { ...member, contractor: contractor || null, vendorProfilePhoto };
        })
      );
      res.json(membersWithContractors);
    } catch (error) {
      console.error('Error fetching team members:', error);
      res.status(500).json({ error: 'Failed to fetch team members' });
    }
  });

  app.patch("/api/my-team/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = Number(req.params.id);
      const member = await storage.getHomeTeamMember(id);
      if (!member) return res.status(404).json({ error: 'Team member not found' });
      if (member.userId !== req.user.id) return res.sendStatus(403);
      const { notes, category } = req.body;
      const updates: Record<string, any> = {};
      if (notes !== undefined) updates.notes = notes;
      if (category !== undefined) updates.category = category;
      if (Object.keys(updates).length === 0) return res.json(member);
      const updated = await storage.updateHomeTeamMember(id, updates);
      res.json(updated);
    } catch (error) {
      console.error('Error updating team member:', error);
      res.status(500).json({ error: 'Failed to update team member' });
    }
  });

  app.delete("/api/my-team/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = Number(req.params.id);
      const member = await storage.getHomeTeamMember(id);
      if (!member) return res.status(404).json({ error: 'Team member not found' });
      if (member.userId !== req.user.id) return res.sendStatus(403);
      await storage.removeHomeTeamMember(id);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error removing team member:', error);
      res.status(500).json({ error: 'Failed to remove team member' });
    }
  });

  app.get("/api/stripe/publishable-key", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { getStripePublishableKey } = await import('./stripeClient');
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error('Error getting Stripe publishable key:', error);
      res.status(500).json({ error: 'Failed to get Stripe configuration' });
    }
  });

  app.get("/api/stripe/subscription", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = await storage.getUser(req.user.id);
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      let hasPaymentMethod = false;
      let currentSubscription = null;

      if (user?.stripeCustomerId) {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: user.stripeCustomerId,
          type: 'card',
        });
        hasPaymentMethod = paymentMethods.data.length > 0;

        if (user.stripeSubscriptionId) {
          try {
            currentSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          } catch (subErr: any) {
            console.error('Error retrieving subscription:', subErr.message);
          }
        }

        if (!currentSubscription) {
          const subs = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: 'active',
            limit: 1,
          });
          if (subs.data.length > 0) {
            currentSubscription = subs.data[0];
            await storage.updateUser(req.user.id, { stripeSubscriptionId: currentSubscription.id });
          }
        }
      }

      let trialActive = false;
      let trialDaysLeft = 0;
      let trialEndsAt = null;

      if (currentSubscription?.status === 'trialing' && currentSubscription?.trial_end) {
        const now = new Date();
        const ends = new Date(currentSubscription.trial_end * 1000);
        trialEndsAt = ends.toISOString();
        if (ends > now) {
          trialActive = true;
          trialDaysLeft = Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }
      } else if (!currentSubscription && user?.trialEndsAt) {
        const now = new Date();
        const ends = new Date(user.trialEndsAt);
        trialEndsAt = ends.toISOString();
        if (ends > now) {
          trialActive = true;
          trialDaysLeft = Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      res.json({ subscription: currentSubscription, hasPaymentMethod, trialActive, trialDaysLeft, trialEndsAt });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  });

  app.get("/api/stripe/products", async (req, res) => {
    try {
      const { db: pgDb } = await import('./db');
      const { sql: sqlTag } = await import('drizzle-orm/sql');
      const result = await pgDb.execute(sqlTag`
        SELECT p.id as product_id, p.name, p.description, p.metadata,
               pr.id as price_id, pr.unit_amount, pr.currency, pr.recurring
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY p.name, pr.unit_amount
      `);
      const productsMap = new Map();
      for (const row of result.rows as any[]) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.name,
            description: row.description,
            metadata: row.metadata,
            prices: [],
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
          });
        }
      }
      res.json({ products: Array.from(productsMap.values()) });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  app.post("/api/stripe/create-checkout", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== 'agent' && req.user.role !== 'vendor') {
      return res.status(403).json({ error: 'Only agents and vendors can subscribe' });
    }
    try {
      const { priceId } = req.body;
      if (!priceId) return res.status(400).json({ error: 'priceId is required' });

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
      const product = price.product as any;
      const productRole = typeof product.metadata === 'object' ? product.metadata.role : null;
      if (productRole && productRole !== req.user.role) {
        return res.status(403).json({ error: 'This plan is not available for your account type' });
      }

      let customerId = req.user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: req.user.email,
          metadata: { userId: String(req.user.id), role: req.user.role },
        });
        customerId = customer.id;
        await storage.updateUser(req.user.id, { stripeCustomerId: customerId });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const hasExistingSub = !!req.user.stripeSubscriptionId;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/billing?success=true`,
        cancel_url: `${baseUrl}/billing?canceled=true`,
        subscription_data: {
          metadata: { userId: String(req.user.id) },
          ...(!hasExistingSub ? { trial_period_days: 7 } : {}),
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  app.post("/api/stripe/create-setup-checkout", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== 'agent' && req.user.role !== 'vendor') {
      return res.status(403).json({ error: 'Only agents and vendors can add payment methods' });
    }
    try {
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      let customerId = req.user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: req.user.email,
          metadata: { userId: String(req.user.id), role: req.user.role },
        });
        customerId = customer.id;
        await storage.updateUser(req.user.id, { stripeCustomerId: customerId });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'setup',
        payment_method_types: ['card'],
        success_url: `${baseUrl}/billing?setup_success=true`,
        cancel_url: `${baseUrl}/billing?canceled=true`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Error creating setup session:', error);
      res.status(500).json({ error: 'Failed to create setup session' });
    }
  });

  app.post("/api/stripe/activate-referral-credits", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const user = await storage.getUser(req.user.id);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: 'No payment method on file. Add one first.' });
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
      });
      if (paymentMethods.data.length === 0) {
        return res.status(400).json({ error: 'No payment method on file. Add one first.' });
      }

      const pendingCredits = await storage.getReferralCreditsByUser(req.user.id);
      const toActivate = pendingCredits.filter(c => c.status === 'pending');
      let activated = 0;

      const planAmount = req.user.role === 'agent' ? 4900 : 2900;

      for (const credit of toActivate) {
        try {
          await stripe.customers.createBalanceTransaction(user.stripeCustomerId, {
            amount: -planAmount,
            currency: 'usd',
            description: `Referral bonus: free month credit (${credit.type === 'referrer' ? 'you referred someone' : 'you were referred'})`,
          });
        } catch (stripeErr: any) {
          console.error('Error applying Stripe credit:', stripeErr.message);
        }

        await storage.applyReferralCredit(credit.id);
        activated++;

        if (credit.type === 'referred' && credit.referralCodeId) {
          const referrerCredits = await storage.getReferralCreditsByReferralCode(credit.referralCodeId);
          for (const rc of referrerCredits) {
            if (rc.type === 'referrer' && rc.status === 'pending' && rc.referredUserId === req.user.id) {
              const referrerUser = await storage.getUser(rc.userId);
              if (referrerUser?.stripeCustomerId) {
                const referrerAmount = referrerUser.role === 'agent' ? 4900 : 2900;
                try {
                  await stripe.customers.createBalanceTransaction(referrerUser.stripeCustomerId, {
                    amount: -referrerAmount,
                    currency: 'usd',
                    description: `Referral bonus: free month credit (referred user activated)`,
                  });
                } catch (stripeErr: any) {
                  console.error('Error applying referrer Stripe credit:', stripeErr.message);
                }
              }
              await storage.applyReferralCredit(rc.id);
            }
          }
        }
      }

      res.json({ activated, message: `${activated} referral credit(s) activated with billing credit applied` });
    } catch (error) {
      console.error('Error activating referral credits:', error);
      res.status(500).json({ error: 'Failed to activate referral credits' });
    }
  });

  app.post("/api/stripe/portal", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      if (!req.user.stripeCustomerId) {
        return res.status(400).json({ error: 'No billing account found' });
      }
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripe.billingPortal.sessions.create({
        customer: req.user.stripeCustomerId,
        return_url: `${baseUrl}/billing`,
      });
      res.json({ url: session.url });
    } catch (error) {
      console.error('Error creating portal session:', error);
      res.status(500).json({ error: 'Failed to create portal session' });
    }
  });

  // Drip Campaign Routes

  app.get("/api/drip/campaigns", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const campaigns = await storage.getDripCampaignsByAgent(req.user.id);
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching drip campaigns:', error);
      res.status(500).json({ error: 'Failed to fetch drip campaigns' });
    }
  });

  app.post("/api/drip/campaigns", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const parsed = insertDripCampaignSchema.safeParse({ ...req.body, agentId: req.user.id });
      if (!parsed.success) return res.status(400).json(parsed.error);
      const campaign = await storage.createDripCampaign(parsed.data);
      res.status(201).json(campaign);
    } catch (error) {
      console.error('Error creating drip campaign:', error);
      res.status(500).json({ error: 'Failed to create drip campaign' });
    }
  });

  app.get("/api/drip/campaigns/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const campaign = await storage.getDripCampaign(Number(req.params.id));
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      if (campaign.agentId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      const steps = await storage.getDripStepsByCampaign(campaign.id);
      res.json({ ...campaign, steps });
    } catch (error) {
      console.error('Error fetching drip campaign:', error);
      res.status(500).json({ error: 'Failed to fetch drip campaign' });
    }
  });

  app.patch("/api/drip/campaigns/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const existing = await storage.getDripCampaign(Number(req.params.id));
      if (!existing) return res.status(404).json({ error: 'Campaign not found' });
      if (existing.agentId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      const campaign = await storage.updateDripCampaign(Number(req.params.id), req.body);
      res.json(campaign);
    } catch (error) {
      console.error('Error updating drip campaign:', error);
      res.status(500).json({ error: 'Failed to update drip campaign' });
    }
  });

  app.delete("/api/drip/campaigns/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const existing = await storage.getDripCampaign(Number(req.params.id));
      if (!existing) return res.status(404).json({ error: 'Campaign not found' });
      if (existing.agentId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      await storage.deleteDripCampaign(Number(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting drip campaign:', error);
      res.status(500).json({ error: 'Failed to delete drip campaign' });
    }
  });

  app.post("/api/drip/campaigns/:id/steps", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const campaignId = Number(req.params.id);
      const campaign = await storage.getDripCampaign(campaignId);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      if (campaign.agentId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      const parsed = insertDripStepSchema.safeParse({ ...req.body, campaignId });
      if (!parsed.success) return res.status(400).json(parsed.error);
      const step = await storage.createDripStep(parsed.data);
      res.status(201).json(step);
    } catch (error) {
      console.error('Error creating drip step:', error);
      res.status(500).json({ error: 'Failed to create drip step' });
    }
  });

  app.patch("/api/drip/campaigns/:id/steps/:stepId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const campaign = await storage.getDripCampaign(Number(req.params.id));
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      if (campaign.agentId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      const step = await storage.updateDripStep(Number(req.params.stepId), req.body);
      res.json(step);
    } catch (error) {
      console.error('Error updating drip step:', error);
      res.status(500).json({ error: 'Failed to update drip step' });
    }
  });

  app.delete("/api/drip/campaigns/:id/steps/:stepId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const campaign = await storage.getDripCampaign(Number(req.params.id));
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      if (campaign.agentId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      await storage.deleteDripStep(Number(req.params.stepId));
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting drip step:', error);
      res.status(500).json({ error: 'Failed to delete drip step' });
    }
  });

  app.post("/api/drip/campaigns/:id/enroll", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const campaignId = Number(req.params.id);
      const campaign = await storage.getDripCampaign(campaignId);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      if (campaign.agentId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      const { clientId } = req.body;
      if (!clientId) return res.status(400).json({ error: 'clientId is required' });

      const steps = await storage.getDripStepsByCampaign(campaignId);
      const firstStep = steps.sort((a, b) => a.stepOrder - b.stepOrder)[0];
      const nextActionAt = firstStep
        ? new Date(Date.now() + firstStep.delayDays * 24 * 60 * 60 * 1000)
        : null;

      const parsed = insertDripEnrollmentSchema.safeParse({
        campaignId,
        clientId: Number(clientId),
        agentId: req.user.id,
        status: 'active',
        currentStepIndex: 0,
        nextActionAt,
      });
      if (!parsed.success) return res.status(400).json(parsed.error);
      const enrollment = await storage.createDripEnrollment(parsed.data);
      res.status(201).json(enrollment);
    } catch (error) {
      console.error('Error enrolling client:', error);
      res.status(500).json({ error: 'Failed to enroll client' });
    }
  });

  app.get("/api/drip/enrollments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const enrollments = await storage.getDripEnrollmentsByAgent(req.user.id);
      res.json(enrollments);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      res.status(500).json({ error: 'Failed to fetch enrollments' });
    }
  });

  app.patch("/api/drip/enrollments/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const { status } = req.body;
      if (!status || !['active', 'paused', 'completed', 'canceled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      const existing = await storage.getDripEnrollment(Number(req.params.id));
      if (!existing) return res.status(404).json({ error: 'Enrollment not found' });
      if (existing.agentId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      const enrollment = await storage.updateDripEnrollmentStatus(Number(req.params.id), status);
      res.json(enrollment);
    } catch (error) {
      console.error('Error updating enrollment:', error);
      res.status(500).json({ error: 'Failed to update enrollment' });
    }
  });

  app.get("/api/drip/special-dates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const dates = await storage.getClientSpecialDatesByAgent(req.user.id);
      res.json(dates);
    } catch (error) {
      console.error('Error fetching special dates:', error);
      res.status(500).json({ error: 'Failed to fetch special dates' });
    }
  });

  app.post("/api/drip/special-dates", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const parsed = insertClientSpecialDateSchema.safeParse({ ...req.body, agentId: req.user.id });
      if (!parsed.success) return res.status(400).json(parsed.error);
      const date = await storage.createClientSpecialDate(parsed.data);
      if ((date.dateType === 'birthday' || date.dateType === 'anniversary') && date.clientId) {
        const targetClient = await storage.getClient(date.clientId);
        if (targetClient && targetClient.agentId === req.user.id) {
          await storage.updateClient(date.clientId, { [date.dateType]: date.dateValue } as any);
        }
      }
      res.status(201).json(date);
    } catch (error) {
      console.error('Error creating special date:', error);
      res.status(500).json({ error: 'Failed to create special date' });
    }
  });

  app.patch("/api/drip/special-dates/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const existing = await storage.getClientSpecialDate(Number(req.params.id));
      if (!existing) return res.status(404).json({ error: 'Special date not found' });
      if (existing.agentId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      if (existing.dateType !== req.body.dateType && (existing.dateType === 'birthday' || existing.dateType === 'anniversary') && existing.clientId) {
        const client = await storage.getClient(existing.clientId);
        if (client && client.agentId === req.user.id) {
          await storage.updateClient(existing.clientId, { [existing.dateType]: null } as any);
        }
      }
      const date = await storage.updateClientSpecialDate(Number(req.params.id), req.body);
      if ((date.dateType === 'birthday' || date.dateType === 'anniversary') && date.clientId) {
        const client = await storage.getClient(date.clientId);
        if (client && client.agentId === req.user.id) {
          await storage.updateClient(date.clientId, { [date.dateType]: date.dateValue } as any);
        }
      }
      res.json(date);
    } catch (error) {
      console.error('Error updating special date:', error);
      res.status(500).json({ error: 'Failed to update special date' });
    }
  });

  app.delete("/api/drip/special-dates/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const existing = await storage.getClientSpecialDate(Number(req.params.id));
      if (!existing) return res.status(404).json({ error: 'Special date not found' });
      if (existing.agentId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      if ((existing.dateType === 'birthday' || existing.dateType === 'anniversary') && existing.clientId) {
        const targetClient = await storage.getClient(existing.clientId);
        if (targetClient && targetClient.agentId === req.user.id) {
          await storage.updateClient(existing.clientId, { [existing.dateType]: null } as any);
        }
      }
      await storage.deleteClientSpecialDate(Number(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting special date:', error);
      res.status(500).json({ error: 'Failed to delete special date' });
    }
  });

  app.get("/api/drip/upcoming", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const withinDays = Number(req.query.days) || 30;
      const upcomingDates = await storage.getUpcomingSpecialDates(req.user.id, withinDays);
      const dueEnrollments = await storage.getDueEnrollments();
      const agentDueEnrollments = dueEnrollments.filter(e => e.agentId === req.user.id);
      res.json({ specialDates: upcomingDates, dueEnrollments: agentDueEnrollments });
    } catch (error) {
      console.error('Error fetching upcoming items:', error);
      res.status(500).json({ error: 'Failed to fetch upcoming items' });
    }
  });

  app.post("/api/drip/seed-templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const agentId = req.user.id;
      const templates = [
        {
          name: "New Lead Nurture",
          description: "Automated follow-up sequence for new leads to build rapport and convert to clients",
          type: "lead_nurture" as const,
          steps: [
            { stepOrder: 1, delayDays: 0, method: "email" as const, subject: "Nice to meet you, {{firstName}}!", content: "Hi {{firstName}},\n\nThank you for reaching out! I'm {{agentName}} and I'd love to help you with your real estate needs.\n\nWhat are you looking for in your next home? I'd love to learn more about your goals.\n\nBest regards,\n{{agentName}}" },
            { stepOrder: 2, delayDays: 3, method: "sms" as const, subject: null, content: "Hi {{firstName}}, it's {{agentName}}! Just checking in - do you have any questions about the market? Happy to help!" },
            { stepOrder: 3, delayDays: 7, method: "email" as const, subject: "Market update for you, {{firstName}}", content: "Hi {{firstName}},\n\nI wanted to share some exciting updates about the local market. Properties in your area of interest are moving fast!\n\nWould you like to schedule a quick call to discuss your options?\n\nBest,\n{{agentName}}" },
            { stepOrder: 4, delayDays: 14, method: "reminder" as const, subject: "Follow up with {{firstName}} {{lastName}}", content: "Time to personally reach out to {{firstName}} {{lastName}}. Consider calling to check in on their home search." },
            { stepOrder: 5, delayDays: 30, method: "email" as const, subject: "Still thinking about making a move, {{firstName}}?", content: "Hi {{firstName}},\n\nI know finding the right home takes time, and I'm here whenever you're ready. In the meantime, feel free to reach out if you have any questions.\n\nWarm regards,\n{{agentName}}" },
          ],
        },
        {
          name: "Post-Close Follow-Up",
          description: "Stay in touch with clients after closing to maintain the relationship and generate referrals",
          type: "post_close" as const,
          steps: [
            { stepOrder: 1, delayDays: 1, method: "email" as const, subject: "Congratulations on your new home, {{firstName}}!", content: "Hi {{firstName}},\n\nCongratulations on closing on your new home! It was a pleasure working with you.\n\nIf you need anything as you settle in - contractor recommendations, utility setup help, or anything else - don't hesitate to reach out.\n\nBest,\n{{agentName}}" },
            { stepOrder: 2, delayDays: 14, method: "sms" as const, subject: null, content: "Hi {{firstName}}! How's the move going? Let me know if you need any help settling in. 🏠" },
            { stepOrder: 3, delayDays: 30, method: "email" as const, subject: "How's your new home, {{firstName}}?", content: "Hi {{firstName}},\n\nIt's been a month since you moved in! How are you enjoying your new home?\n\nIf you know anyone looking to buy or sell, I'd love a referral. Your recommendation means the world to me.\n\nBest,\n{{agentName}}" },
            { stepOrder: 4, delayDays: 90, method: "reminder" as const, subject: "Check in with {{firstName}} {{lastName}} - 3 months post-close", content: "It's been 3 months since {{firstName}} {{lastName}} closed. Consider sending a personal note or small gift." },
            { stepOrder: 5, delayDays: 365, method: "email" as const, subject: "Happy Home Anniversary, {{firstName}}! 🎉", content: "Hi {{firstName}},\n\nCan you believe it's been a year since you closed on your home? Time flies!\n\nI hope you're loving every moment. If you ever need anything real estate related, I'm always here.\n\nCheers,\n{{agentName}}" },
          ],
        },
        {
          name: "Birthday & Anniversary",
          description: "Celebrate your clients' special occasions to strengthen relationships",
          type: "birthday" as const,
          steps: [
            { stepOrder: 1, delayDays: 0, method: "email" as const, subject: "Happy Birthday, {{firstName}}! 🎂", content: "Hi {{firstName}},\n\nWishing you a wonderful birthday filled with joy and happiness!\n\nThinking of you today. Hope it's a great one!\n\nWarm wishes,\n{{agentName}}" },
            { stepOrder: 2, delayDays: 0, method: "sms" as const, subject: null, content: "Happy Birthday, {{firstName}}! 🎂🎉 Wishing you an amazing day! - {{agentName}}" },
          ],
        },
      ];

      const createdCampaigns = [];
      for (const template of templates) {
        const { steps, ...campaignData } = template;
        const campaign = await storage.createDripCampaign({ ...campaignData, agentId, status: 'active' });
        for (const step of steps) {
          await storage.createDripStep({ ...step, campaignId: campaign.id, content: step.content });
        }
        const campaignWithSteps = await storage.getDripCampaign(campaign.id);
        const campaignSteps = await storage.getDripStepsByCampaign(campaign.id);
        createdCampaigns.push({ ...campaignWithSteps, steps: campaignSteps });
      }

      res.status(201).json(createdCampaigns);
    } catch (error) {
      console.error('Error seeding templates:', error);
      res.status(500).json({ error: 'Failed to seed templates' });
    }
  });

  app.get("/api/agents/top", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const topAgents = await storage.getTopAgents(limit);
      const safeAgents = topAgents.map(({ user, avgRating, reviewCount }) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avgRating,
        reviewCount,
      }));
      res.json(safeAgents);
    } catch (error) {
      console.error('Error fetching top agents:', error);
      res.status(500).json({ error: 'Failed to fetch top agents' });
    }
  });

  // ===== Lead Zip Code Routes (agent-only, authenticated) =====

  const MAX_AGENTS_PER_ZIP = 5;
  const AGENT_MIN_BUDGET = 2500; // $25.00 minimum monthly spend in cents
  const AGENT_BUDGET_OPTIONS = [2500, 5000, 10000, 20000, 50000]; // $25, $50, $100, $200, $500

  app.get("/api/leads/zip-pricing/:zipCode", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    try {
      const zipCode = req.params.zipCode.trim();
      if (!/^\d{5}$/.test(zipCode)) {
        return res.status(400).json({ error: 'Invalid zip code' });
      }

      const agentCount = await storage.getAgentCountForZipCode(zipCode);
      const alreadyClaimed = await storage.isZipCodeClaimed(req.user.id, zipCode);
      const agents = await storage.getAgentsForZipCode(zipCode);
      const totalSpend = agents.reduce((sum, a) => sum + (a.monthlyRate || AGENT_MIN_BUDGET), 0);
      const mySpend = agents.find(a => a.agentId === req.user.id)?.monthlyRate || AGENT_MIN_BUDGET;

      const [leads30, leads60, leads90] = await Promise.all([
        storage.getLeadCountForZip(zipCode, 30),
        storage.getLeadCountForZip(zipCode, 60),
        storage.getLeadCountForZip(zipCode, 90),
      ]);

      res.json({
        zipCode,
        currentAgents: agentCount,
        maxAgents: MAX_AGENTS_PER_ZIP,
        spotsRemaining: MAX_AGENTS_PER_ZIP - agentCount,
        isFull: agentCount >= MAX_AGENTS_PER_ZIP,
        alreadyClaimed,
        minBudget: AGENT_MIN_BUDGET,
        budgetOptions: AGENT_BUDGET_OPTIONS,
        totalSpendInZip: totalSpend,
        mySpend,
        shareOfVoice: totalSpend > 0 && mySpend > 0 ? Math.round((mySpend / totalSpend) * 100) : 0,
        leadActivity: { last30: leads30, last60: leads60, last90: leads90 },
        noLeadsNoCharge: true,
      });
    } catch (error) {
      console.error('Error fetching zip pricing:', error);
      res.status(500).json({ error: 'Failed to fetch pricing' });
    }
  });

  const LEAD_VERIFIED_STATUSES = new Set(["payment_verified", "broker_verified", "admin_verified"]);

  app.post("/api/leads/zip-codes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    try {
      const agent = await storage.getUser(req.user.id);
      if (!agent) return res.status(404).json({ error: "User not found" });

      if (!agent.licenseNumber?.trim() || !agent.licenseState?.trim() || !agent.brokerageName?.trim()) {
        return res.status(403).json({
          error: "License number, license state, and brokerage name are required before claiming zip codes. Please complete your profile in Settings.",
          code: "LICENSE_REQUIRED"
        });
      }

      if (!LEAD_VERIFIED_STATUSES.has(agent.verificationStatus || "")) {
        return res.status(403).json({
          error: "Your identity must be verified before claiming zip codes. Please complete payment verification so we can match your name on file.",
          code: "VERIFICATION_REQUIRED"
        });
      }

      const { zipCode, monthlyBudget } = req.body;
      if (!zipCode || typeof zipCode !== 'string') {
        return res.status(400).json({ error: 'Zip code is required' });
      }

      const trimmedZip = zipCode.trim();
      if (!/^\d{5}$/.test(trimmedZip)) {
        return res.status(400).json({ error: 'Please enter a valid 5-digit zip code' });
      }

      const budget = Number(monthlyBudget) || AGENT_MIN_BUDGET;
      if (!AGENT_BUDGET_OPTIONS.includes(budget)) {
        return res.status(400).json({ error: `Budget must be one of: ${AGENT_BUDGET_OPTIONS.map(o => '$' + (o/100)).join(', ')}` });
      }

      const alreadyClaimed = await storage.isZipCodeClaimed(req.user.id, trimmedZip);
      if (alreadyClaimed) {
        return res.status(409).json({ error: 'You have already claimed this zip code' });
      }

      const agentCount = await storage.getAgentCountForZipCode(trimmedZip);
      if (agentCount >= MAX_AGENTS_PER_ZIP) {
        return res.status(409).json({ error: `This zip code is full (max ${MAX_AGENTS_PER_ZIP} agents). Try a nearby zip code.` });
      }

      const claimed = await storage.claimZipCode({
        agentId: req.user.id,
        zipCode: trimmedZip,
        isActive: true,
        monthlyRate: budget,
      });

      const agents = await storage.getAgentsForZipCode(trimmedZip);
      const totalSpend = agents.reduce((sum, a) => sum + (a.monthlyRate || 0), 0);

      res.status(201).json({
        ...claimed,
        currentAgents: agentCount + 1,
        maxAgents: MAX_AGENTS_PER_ZIP,
        shareOfVoice: totalSpend > 0 ? Math.round((budget / totalSpend) * 100) : 100,
      });
    } catch (error) {
      console.error('Error claiming zip code:', error);
      res.status(500).json({ error: 'Failed to claim zip code' });
    }
  });

  app.delete("/api/leads/zip-codes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    try {
      const id = Number(req.params.id);
      const agentZips = await storage.getAgentZipCodes(req.user.id);
      const owns = agentZips.find(z => z.id === id);
      if (!owns) {
        return res.status(403).json({ error: 'You do not own this zip code claim' });
      }

      await storage.unclaimZipCode(id);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error unclaiming zip code:', error);
      res.status(500).json({ error: 'Failed to unclaim zip code' });
    }
  });

  app.get("/api/leads/zip-codes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    try {
      const zips = await storage.getAgentZipCodes(req.user.id);
      const enriched = await Promise.all(zips.map(async (zc) => {
        const agents = await storage.getAgentsForZipCode(zc.zipCode);
        const agentCount = agents.length;
        const totalSpend = agents.reduce((sum, a) => sum + (a.monthlyRate || AGENT_MIN_BUDGET), 0);
        const myShare = totalSpend > 0 ? Math.round(((zc.monthlyRate || AGENT_MIN_BUDGET) / totalSpend) * 100) : 100;
        return {
          ...zc,
          currentAgents: agentCount,
          maxAgents: MAX_AGENTS_PER_ZIP,
          shareOfVoice: myShare,
          totalSpendInZip: totalSpend,
        };
      }));
      res.json({
        zipCodes: enriched,
        maxAgentsPerZip: MAX_AGENTS_PER_ZIP,
        budgetOptions: AGENT_BUDGET_OPTIONS,
        minBudget: AGENT_MIN_BUDGET,
      });
    } catch (error) {
      console.error('Error fetching zip codes:', error);
      res.status(500).json({ error: 'Failed to fetch zip codes' });
    }
  });

  app.patch("/api/leads/zip-codes/:id/budget", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    try {
      const id = Number(req.params.id);
      const { monthlyBudget } = req.body;
      const budget = Number(monthlyBudget);

      if (!budget || !AGENT_BUDGET_OPTIONS.includes(budget)) {
        return res.status(400).json({ error: `Budget must be one of: ${AGENT_BUDGET_OPTIONS.map(o => '$' + (o/100)).join(', ')}` });
      }

      const agentZips = await storage.getAgentZipCodes(req.user.id);
      const owns = agentZips.find(z => z.id === id);
      if (!owns) {
        return res.status(403).json({ error: 'You do not own this zip code claim' });
      }

      await storage.updateZipCodeBudget(id, budget);
      res.json({ success: true, monthlyRate: budget });
    } catch (error) {
      console.error('Error updating zip code budget:', error);
      res.status(500).json({ error: 'Failed to update budget' });
    }
  });

  // ===== Lead Submission Route (PUBLIC, no auth) =====

  async function assignLeadToAgent(zipCode: string): Promise<{ assignedAgentId: number | null; status: string }> {
    const agents = await storage.getAgentsForZipCode(zipCode);
    if (agents.length === 0) return { assignedAgentId: null, status: 'new' };

    if (agents.length === 1) {
      await storage.upsertLeadRotation(zipCode, agents[0].agentId);
      return { assignedAgentId: agents[0].agentId, status: 'assigned' };
    }

    const totalSpend = agents.reduce((sum, a) => sum + (a.monthlyRate || AGENT_MIN_BUDGET), 0);
    const rand = Math.random() * totalSpend;
    let cumulative = 0;
    let selectedAgent = agents[0];

    for (const agent of agents) {
      cumulative += (agent.monthlyRate || AGENT_MIN_BUDGET);
      if (rand <= cumulative) {
        selectedAgent = agent;
        break;
      }
    }

    await storage.upsertLeadRotation(zipCode, selectedAgent.agentId);
    return { assignedAgentId: selectedAgent.agentId, status: 'assigned' };
  }

  app.post("/api/leads/submit", async (req, res) => {
    try {
      const schema = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional().nullable(),
        zipCode: z.string().min(1),
        type: z.enum(['buyer', 'seller', 'both']),
        message: z.string().optional().nullable(),
        budget: z.string().optional().nullable(),
        timeframe: z.string().optional().nullable(),
        source: z.string().optional().nullable(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }

      const data = parsed.data;
      const { assignedAgentId, status } = await assignLeadToAgent(data.zipCode);

      const lead = await storage.createLead({
        ...data,
        phone: data.phone || null,
        message: data.message || null,
        budget: data.budget || null,
        timeframe: data.timeframe || null,
        source: data.source || 'website',
        status,
        assignedAgentId,
      });

      fireWebhook("new_lead", lead);

      if (assignedAgentId) {
        try {
          const agent = await storage.getUser(assignedAgentId);
          if (agent) {
            const subs = await storage.getPushSubscriptionsByUser(assignedAgentId);
            await notifyAgentOfNewLead(
              agent,
              { zipCode: data.zipCode, type: data.type, firstName: data.firstName, lastName: data.lastName, budget: data.budget, timeframe: data.timeframe, message: data.message },
              subs,
              async (subId) => storage.deletePushSubscription(subId)
            );
            notify(
              assignedAgentId,
              'lead_new',
              'New Lead',
              `${data.firstName} ${data.lastName} in ${data.zipCode} (${data.type})`,
              lead.id,
              'lead'
            ).catch(() => {});
          }
        } catch (notifErr) {
          console.error('Error sending lead notification:', notifErr);
        }
      }

      res.status(201).json(lead);
    } catch (error) {
      console.error('Error submitting lead:', error);
      res.status(500).json({ error: 'Failed to submit lead' });
    }
  });

  app.post("/api/leads/submit-with-account", async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        zipCode: z.string().min(1),
        type: z.enum(['buyer', 'seller', 'both']),
        message: z.string().optional().nullable(),
        budget: z.string().optional().nullable(),
        timeframe: z.string().optional().nullable(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }

      const data = parsed.data;

      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists. Please log in instead.' });
      }

      const { hashPassword } = await import('./auth');
      const user = await storage.createUser({
        email: data.email,
        password: await hashPassword(data.password),
        firstName: 'HomeBase',
        lastName: 'User',
        role: 'client',
      });

      const { assignedAgentId, status } = await assignLeadToAgent(data.zipCode);

      const lead = await storage.createLead({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: null,
        zipCode: data.zipCode,
        type: data.type,
        message: data.message || null,
        budget: data.budget || null,
        timeframe: data.timeframe || null,
        status,
        assignedAgentId,
      });

      if (assignedAgentId) {
        try {
          await storage.createCommunication({
            clientId: null,
            agentId: assignedAgentId,
            type: 'reminder',
            subject: 'New Lead via HomeBase',
            content: `A new lead is interested in ${data.zipCode} (${data.type}). They've created a HomeBase account and prefer to communicate through the platform. Check your Leads dashboard to connect.`,
            status: 'sent',
            externalId: null,
          });
        } catch (e) {
          console.error('Error creating lead notification:', e);
        }

        try {
          const agent = await storage.getUser(assignedAgentId);
          if (agent) {
            const subs = await storage.getPushSubscriptionsByUser(assignedAgentId);
            await notifyAgentOfNewLead(
              agent,
              { zipCode: data.zipCode, type: data.type, firstName: user.firstName, lastName: user.lastName, budget: data.budget, timeframe: data.timeframe, message: data.message },
              subs,
              async (subId) => storage.deletePushSubscription(subId)
            );
          }
        } catch (notifErr) {
          console.error('Error sending lead push/sms notification:', notifErr);
        }
      }

      req.login(user, (err) => {
        if (err) {
          console.error('Error logging in new lead user:', err);
          return res.status(201).json({ lead, user: { id: user.id, email: user.email } });
        }
        res.status(201).json({ lead, user: { id: user.id, email: user.email } });
      });
    } catch (error) {
      console.error('Error submitting lead with account:', error);
      res.status(500).json({ error: 'Failed to submit lead' });
    }
  });

  // ===== Lead Management Routes (agent-only, authenticated) =====

  app.get("/api/leads", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    try {
      const leads = await storage.getLeadsByAgent(req.user.id);
      res.json(leads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  });

  app.patch("/api/leads/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    try {
      const id = Number(req.params.id);
      const { status } = req.body;

      if (!status || !['accepted', 'rejected', 'converted'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be accepted, rejected, or converted.' });
      }

      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      if (lead.assignedAgentId !== req.user.id) {
        return res.status(403).json({ error: 'You are not assigned to this lead' });
      }

      const updatedLead = await storage.updateLeadStatus(id, status);

      if (status === 'accepted' && lead.status !== 'accepted') {
        try {
          await storage.createClient({
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email || null,
            phone: lead.phone || null,
            mobilePhone: null,
            address: null,
            street: null,
            city: null,
            zipCode: lead.zipCode,
            type: lead.type === 'both' ? ['buyer', 'seller'] : [lead.type as 'buyer' | 'seller'],
            status: 'active',
            notes: lead.message || null,
            labels: ['lead'],
            source: lead.source || 'lead_gen',
            agentId: req.user.id,
          });
        } catch (clientError) {
          console.error('Error auto-creating client from lead:', clientError);
        }
      }

      res.json(updatedLead);
    } catch (error) {
      console.error('Error updating lead status:', error);
      res.status(500).json({ error: 'Failed to update lead status' });
    }
  });

  app.get("/api/leads/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    try {
      const leads = await storage.getLeadsByAgent(req.user.id);
      const total = leads.length;
      const newCount = leads.filter(l => l.status === 'new' || l.status === 'assigned').length;
      const accepted = leads.filter(l => l.status === 'accepted').length;
      const converted = leads.filter(l => l.status === 'converted').length;
      const rejected = leads.filter(l => l.status === 'rejected').length;
      const acceptanceRate = (accepted + converted + rejected) > 0
        ? Math.round(((accepted + converted) / (accepted + converted + rejected)) * 100)
        : 0;

      const contacted = leads.filter(l => l.contactedAt).length;
      const connected = leads.filter(l => l.connectedAt).length;
      const connectionRate = contacted > 0 ? Math.round((connected / contacted) * 100) : 0;

      const sourceCounts: Record<string, number> = {};
      leads.forEach(l => {
        const src = l.source || 'unknown';
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      });

      res.json({ total, new: newCount, accepted, converted, rejected, acceptanceRate, contacted, connected, connectionRate, sourceCounts });
    } catch (error) {
      console.error('Error fetching lead stats:', error);
      res.status(500).json({ error: 'Failed to fetch lead stats' });
    }
  });

  app.get("/api/leads/metrics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    try {
      const leads = await storage.getLeadsByAgent(req.user.id);
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const total = leads.length;
      const newCount = leads.filter(l => l.status === 'new' || l.status === 'assigned').length;
      const accepted = leads.filter(l => l.status === 'accepted').length;
      const converted = leads.filter(l => l.status === 'converted').length;
      const rejected = leads.filter(l => l.status === 'rejected').length;
      const expired = leads.filter(l => l.status === 'expired').length;
      const acceptanceRate = (accepted + converted + rejected) > 0
        ? Math.round(((accepted + converted) / (accepted + converted + rejected)) * 100) : 0;

      const contacted = leads.filter(l => l.contactedAt).length;
      const connected = leads.filter(l => l.connectedAt).length;
      const connectionRate = contacted > 0 ? Math.round((connected / contacted) * 100) : 0;

      const sourceCounts: Record<string, number> = {};
      const sourceConversions: Record<string, { total: number; converted: number; accepted: number; rejected: number; avgResponseMs: number; responseTimes: number[] }> = {};
      leads.forEach(l => {
        const src = l.source || 'unknown';
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
        if (!sourceConversions[src]) {
          sourceConversions[src] = { total: 0, converted: 0, accepted: 0, rejected: 0, avgResponseMs: 0, responseTimes: [] };
        }
        sourceConversions[src].total++;
        if (l.status === 'converted') sourceConversions[src].converted++;
        if (l.status === 'accepted') sourceConversions[src].accepted++;
        if (l.status === 'rejected') sourceConversions[src].rejected++;
        if (l.contactedAt && l.assignedAt) {
          const rt = new Date(l.contactedAt).getTime() - new Date(l.assignedAt).getTime();
          if (rt > 0) sourceConversions[src].responseTimes.push(rt);
        }
      });

      Object.values(sourceConversions).forEach(sc => {
        if (sc.responseTimes.length > 0) {
          sc.avgResponseMs = Math.round(sc.responseTimes.reduce((a, b) => a + b, 0) / sc.responseTimes.length);
        }
      });

      const monthlyData: { month: string; monthNum: number; year: number; total: number; converted: number; accepted: number; rejected: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const m = d.getMonth();
        const y = d.getFullYear();
        const monthLeads = leads.filter(l => {
          if (!l.createdAt) return false;
          const ld = new Date(l.createdAt);
          return ld.getMonth() === m && ld.getFullYear() === y;
        });
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        monthlyData.push({
          month: monthNames[m],
          monthNum: m,
          year: y,
          total: monthLeads.length,
          converted: monthLeads.filter(l => l.status === 'converted').length,
          accepted: monthLeads.filter(l => l.status === 'accepted').length,
          rejected: monthLeads.filter(l => l.status === 'rejected').length,
        });
      }

      const thisMonthLeads = leads.filter(l => {
        if (!l.createdAt) return false;
        const ld = new Date(l.createdAt);
        return ld.getMonth() === currentMonth && ld.getFullYear() === currentYear;
      }).length;
      const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
      const lastMonthLeads = leads.filter(l => {
        if (!l.createdAt) return false;
        const ld = new Date(l.createdAt);
        return ld.getMonth() === lastMonthDate.getMonth() && ld.getFullYear() === lastMonthDate.getFullYear();
      }).length;
      const monthChange = lastMonthLeads > 0 ? Math.round(((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100) : undefined;

      const avgResponseMs = leads.filter(l => l.contactedAt && l.assignedAt).map(l => {
        return new Date(l.contactedAt!).getTime() - new Date(l.assignedAt!).getTime();
      }).filter(t => t > 0);
      const avgResponseTime = avgResponseMs.length > 0
        ? Math.round(avgResponseMs.reduce((a, b) => a + b, 0) / avgResponseMs.length)
        : 0;

      const sourcePerformance = Object.entries(sourceConversions).map(([source, data]) => ({
        source,
        total: data.total,
        converted: data.converted,
        accepted: data.accepted,
        rejected: data.rejected,
        conversionRate: (data.accepted + data.converted + data.rejected) > 0
          ? Math.round(((data.accepted + data.converted) / (data.accepted + data.converted + data.rejected)) * 100) : 0,
        avgResponseMs: data.avgResponseMs,
      })).sort((a, b) => b.total - a.total);

      const funnelData = {
        total,
        assigned: leads.filter(l => l.assignedAt || l.assignedAgentId).length,
        contacted,
        connected,
        accepted: accepted + converted,
        converted,
      };

      res.json({
        summary: { total, new: newCount, accepted, converted, rejected, expired, acceptanceRate, connectionRate, contacted, connected, avgResponseTime, thisMonthLeads, monthChange },
        sourceCounts,
        sourcePerformance,
        monthlyData,
        funnelData,
      });
    } catch (error) {
      console.error('Error fetching lead metrics:', error);
      res.status(500).json({ error: 'Failed to fetch lead metrics' });
    }
  });

  app.patch("/api/leads/:id/contact", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    try {
      const id = Number(req.params.id);
      const { connected } = req.body;
      const lead = await storage.getLead(id);
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      if (lead.assignedAgentId !== req.user.id) return res.status(403).json({ error: 'Not your lead' });

      const now = new Date();
      await db.execute(sql`
        UPDATE leads SET contacted_at = ${now}${connected ? sql`, connected_at = ${now}` : sql``} WHERE id = ${id}
      `);

      const updated = await storage.getLead(id);
      res.json(updated);
    } catch (error) {
      console.error('Error updating lead contact status:', error);
      res.status(500).json({ error: 'Failed to update contact status' });
    }
  });

  app.post("/api/leads/:id/rotate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    try {
      const id = Number(req.params.id);
      const lead = await storage.getLead(id);
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      if (lead.assignedAgentId !== req.user.id && req.user.role !== "broker") {
        return res.status(403).json({ error: 'Not authorized to rotate this lead' });
      }

      if (lead.exclusiveUntil && new Date() < new Date(lead.exclusiveUntil)) {
        return res.status(400).json({ error: 'Lead is still in exclusive period', exclusiveUntil: lead.exclusiveUntil });
      }

      const agentsInZip = await db.execute(sql`
        SELECT agent_id FROM lead_zip_codes WHERE zip_code = ${lead.zipCode} AND agent_id != ${lead.assignedAgentId || 0} ORDER BY RANDOM() LIMIT 1
      `);

      if (!agentsInZip.rows[0]) {
        return res.status(400).json({ error: 'No other agents available in this zip code' });
      }

      const nextAgentId = Number(agentsInZip.rows[0].agent_id);
      const newExclusive = new Date(Date.now() + 15 * 60 * 1000);
      await db.execute(sql`
        UPDATE leads SET assigned_agent_id = ${nextAgentId}, assigned_at = NOW(), exclusive_until = ${newExclusive}, status = 'assigned' WHERE id = ${id}
      `);

      const updated = await storage.getLead(id);
      res.json(updated);
    } catch (error) {
      console.error('Error rotating lead:', error);
      res.status(500).json({ error: 'Failed to rotate lead' });
    }
  });

  app.get("/api/leads/zip-metrics/:zipCode", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const zipCode = req.params.zipCode.trim();
      if (!/^\d{5}$/.test(zipCode)) return res.status(400).json({ error: "Invalid zip code" });

      const agentCount = await storage.getAgentCountForZipCode(zipCode);
      const alreadyClaimed = await storage.isZipCodeClaimed(req.user.id, zipCode);

      const txResult = await db.execute(sql`
        SELECT
          COALESCE(AVG(contract_price), 0)::int as avg_home_value,
          COUNT(*)::int as total_transactions,
          COUNT(*) FILTER (WHERE closing_date >= NOW() - INTERVAL '6 months')::int as recent_transactions
        FROM transactions
        WHERE zip_code = ${zipCode} AND contract_price IS NOT NULL AND contract_price > 0
      `);
      const txStats = txResult.rows[0] || { avg_home_value: 0, total_transactions: 0, recent_transactions: 0 };

      const leadResult = await db.execute(sql`
        SELECT
          COUNT(*)::int as total_leads,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int as monthly_leads,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '6 months')::int as six_month_leads
        FROM leads
        WHERE zip_code = ${zipCode}
      `);
      const leadStats = leadResult.rows[0] || { total_leads: 0, monthly_leads: 0, six_month_leads: 0 };

      const allAgents = await storage.getAgentsForZipCode(zipCode);
      const totalSpend = allAgents.reduce((sum, a) => sum + (a.monthlyRate || AGENT_MIN_BUDGET), 0);
      const myAgent = allAgents.find(a => a.agentId === req.user.id);
      const mySpend = myAgent?.monthlyRate || AGENT_MIN_BUDGET;
      const projectedTotalSpend = alreadyClaimed ? totalSpend : totalSpend + mySpend;
      const shareOfVoice = projectedTotalSpend > 0 ? Math.round((mySpend / projectedTotalSpend) * 100) : 100;
      const estMonthlyLeads = Number(leadStats.monthly_leads) || 0;
      const estConnectionsPerAgent = agentCount > 0
        ? Math.round((estMonthlyLeads / agentCount) * 10) / 10
        : estMonthlyLeads;

      const avgHomeValue = await getEstimatedHomeValue(zipCode);
      const avgCommission = avgHomeValue * 0.03;
      const estSixMonthLeads = Number(leadStats.six_month_leads) || 0;
      const estLeadsForAgent = agentCount > 0 ? Math.round((estSixMonthLeads / agentCount) * 10) / 10 : estSixMonthLeads;
      const conversionRate = 0.05;
      const estRevenue = estLeadsForAgent * conversionRate * avgCommission;

      const monthlyRate = myAgent?.monthlyRate || AGENT_MIN_BUDGET;
      const sixMonthCost = monthlyRate * 6;
      const estLeadsForMe = shareOfVoice > 0 ? Math.round((estSixMonthLeads * shareOfVoice / 100) * 10) / 10 : estLeadsForAgent;
      const estRevenueForMe = estLeadsForMe * conversionRate * avgCommission;
      const roi = sixMonthCost > 0 ? Math.round((estRevenueForMe / (sixMonthCost / 100)) * 100) / 100 : 0;

      const [leads30, leads60, leads90] = await Promise.all([
        storage.getLeadCountForZip(zipCode, 30),
        storage.getLeadCountForZip(zipCode, 60),
        storage.getLeadCountForZip(zipCode, 90),
      ]);

      res.json({
        zipCode,
        avgHomeValue,
        currentAgents: agentCount,
        maxAgents: MAX_AGENTS_PER_ZIP,
        spotsRemaining: MAX_AGENTS_PER_ZIP - agentCount,
        isFull: agentCount >= MAX_AGENTS_PER_ZIP,
        alreadyClaimed,
        shareOfVoice,
        estMonthlyLeads,
        estConnections: estConnectionsPerAgent,
        estAdditionalLeads: Math.round(estConnectionsPerAgent * 1.2 * 10) / 10,
        roiSixMonth: roi,
        totalLeads: Number(leadStats.total_leads),
        sixMonthLeads: estSixMonthLeads,
        monthlyRate,
        monthlyRateDisplay: `$${(monthlyRate / 100).toFixed(0)}`,
        minBudget: AGENT_MIN_BUDGET,
        budgetOptions: AGENT_BUDGET_OPTIONS,
        totalSpendInZip: totalSpend,
        leadActivity: { last30: leads30, last60: leads60, last90: leads90 },
        noLeadsNoCharge: true,
      });
    } catch (error) {
      console.error("Error fetching zip metrics:", error);
      res.status(500).json({ error: "Failed to fetch zip metrics" });
    }
  });

  app.get("/api/leads/all-zip-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const result = await db.execute(sql`
        SELECT zip_code, COUNT(*)::int as agent_count
        FROM lead_zip_codes
        WHERE is_active = true
        GROUP BY zip_code
        ORDER BY zip_code
      `);
      const myZips = await storage.getAgentZipCodes(req.user.id);
      const myZipSet = new Set(myZips.map(z => z.zipCode));

      const zipData = (result.rows as any[]).map(row => ({
        zipCode: row.zip_code,
        agentCount: Number(row.agent_count),
        isMine: myZipSet.has(row.zip_code),
        spotsRemaining: MAX_AGENTS_PER_ZIP - Number(row.agent_count),
        isFull: Number(row.agent_count) >= MAX_AGENTS_PER_ZIP,
      }));
      res.json(zipData);
    } catch (error) {
      console.error("Error fetching all zip data:", error);
      res.status(500).json({ error: "Failed to fetch zip data" });
    }
  });

  // ===== Public Lead Page Route =====

  app.get("/api/leads/available-zip-codes", async (req, res) => {
    try {
      const zipCodes = await storage.getAvailableZipCodes();
      res.json(zipCodes);
    } catch (error) {
      console.error('Error fetching available zip codes:', error);
      res.status(500).json({ error: 'Failed to fetch available zip codes' });
    }
  });

  // ===== Agent Review Routes =====

  app.post("/api/agents/:agentId/reviews", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const agentId = Number(req.params.agentId);
      if (agentId === req.user.id) {
        return res.status(400).json({ error: 'You cannot review yourself' });
      }

      const agent = await storage.getUser(agentId);
      if (!agent || agent.role !== 'agent') {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const schema = z.object({
        rating: z.number().int().min(1).max(5),
        title: z.string().optional().nullable(),
        comment: z.string().min(1),
        transactionId: z.number().optional().nullable(),
        isPublic: z.boolean().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }

      const review = await storage.createAgentReview({
        agentId,
        reviewerId: req.user.id,
        rating: parsed.data.rating,
        title: parsed.data.title || null,
        comment: parsed.data.comment,
        transactionId: parsed.data.transactionId || null,
        isPublic: parsed.data.isPublic ?? true,
      });

      res.status(201).json(review);
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({ error: 'Failed to create review' });
    }
  });

  app.get("/api/agents/:agentId/reviews", async (req, res) => {
    try {
      const agentId = Number(req.params.agentId);
      const reviews = await storage.getAgentReviews(agentId);
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  });

  app.get("/api/agents/:agentId/profile", async (req, res) => {
    try {
      const agentId = Number(req.params.agentId);
      const profile = await storage.getPublicAgentProfile(agentId);
      if (!profile) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      const { password, email, ...safeUser } = profile.user;
      res.json({ user: safeUser, avgRating: profile.avgRating, reviewCount: profile.reviewCount });
    } catch (error) {
      console.error('Error fetching agent profile:', error);
      res.status(500).json({ error: 'Failed to fetch agent profile' });
    }
  });

  app.delete("/api/agents/:agentId/reviews/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const reviewId = Number(req.params.id);
      const review = await storage.getAgentReview(reviewId);
      if (!review) {
        return res.status(404).json({ error: 'Review not found' });
      }
      if (review.reviewerId !== req.user.id) {
        return res.status(403).json({ error: 'You can only delete your own reviews' });
      }

      await storage.deleteAgentReview(reviewId);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting review:', error);
      res.status(500).json({ error: 'Failed to delete review' });
    }
  });

  // ===== Push Notification Subscription Routes =====

  app.get("/api/push/vapid-key", (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
      return res.status(503).json({ error: 'Push notifications not configured' });
    }
    res.json({ publicKey: key });
  });

  app.post("/api/push/subscribe", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const schema = z.object({
        endpoint: z.string().url(),
        keys: z.object({
          p256dh: z.string().min(1),
          auth: z.string().min(1),
        }),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid subscription data' });
      }

      const sub = await storage.savePushSubscription({
        userId: req.user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
      });

      res.status(201).json(sub);
    } catch (error) {
      console.error('Error saving push subscription:', error);
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  });

  app.delete("/api/push/unsubscribe", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint is required' });
      }
      await storage.deletePushSubscriptionByUserAndEndpoint(req.user.id, endpoint);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error removing push subscription:', error);
      res.status(500).json({ error: 'Failed to remove subscription' });
    }
  });

  // ============ VENDOR LEAD SYSTEM ============

  const FREE_VENDOR_ZIPS = 3;
  const MAX_VENDORS_PER_ZIP_CATEGORY = 5;
  const VENDOR_ZIP_BASE_PRICE = 1000;
  const VENDOR_ZIP_PRICE_INCREMENT = 500;
  const FREE_ELIGIBLE_MIN_OPEN_SLOTS_VENDOR = 3;

  function getVendorZipPrice(currentVendorCount: number): number {
    return VENDOR_ZIP_BASE_PRICE + (currentVendorCount * VENDOR_ZIP_PRICE_INCREMENT);
  }

  function isVendorZipFreeEligible(currentVendorCount: number): boolean {
    const openSlots = MAX_VENDORS_PER_ZIP_CATEGORY - currentVendorCount;
    return openSlots >= FREE_ELIGIBLE_MIN_OPEN_SLOTS_VENDOR;
  }

  app.get("/api/vendor/zip-codes", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'vendor') return res.status(403).json({ error: 'Forbidden' });
    try {
      const zipCodes = await storage.getVendorZipCodes(req.user.id);
      res.json(zipCodes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch vendor zip codes' });
    }
  });

  app.get("/api/vendor/zip-codes/pricing", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'vendor') return res.status(403).json({ error: 'Forbidden' });
    try {
      const { zipCode, category } = req.query;
      if (!zipCode || !category) return res.status(400).json({ error: 'zipCode and category are required' });

      const currentCount = await storage.getVendorCountForZipCategory(String(zipCode), String(category));
      const alreadyClaimed = await storage.isVendorZipClaimed(req.user.id, String(zipCode), String(category));
      const totalVendorZips = await storage.countVendorZipCodes(req.user.id);
      const freeZipsUsed = await storage.countVendorFreeZipCodes(req.user.id);
      const freeEligible = isVendorZipFreeEligible(currentCount);
      const hasFreeSlots = freeZipsUsed < FREE_VENDOR_ZIPS && freeEligible;

      const [leads30, leads60, leads90] = await Promise.all([
        storage.getVendorLeadCountForZip(String(zipCode), String(category), 30),
        storage.getVendorLeadCountForZip(String(zipCode), String(category), 60),
        storage.getVendorLeadCountForZip(String(zipCode), String(category), 90),
      ]);

      res.json({
        zipCode: String(zipCode),
        category: String(category),
        currentVendors: currentCount,
        maxVendors: MAX_VENDORS_PER_ZIP_CATEGORY,
        isFull: currentCount >= MAX_VENDORS_PER_ZIP_CATEGORY,
        alreadyClaimed,
        monthlyRate: hasFreeSlots ? 0 : getVendorZipPrice(currentCount),
        freeSlots: FREE_VENDOR_ZIPS - freeZipsUsed,
        totalClaimed: totalVendorZips,
        freeEligible,
        leadActivity: { last30: leads30, last60: leads60, last90: leads90 },
        noLeadsNoCharge: true,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pricing' });
    }
  });

  app.post("/api/vendor/zip-codes/claim", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'vendor') return res.status(403).json({ error: 'Forbidden' });
    try {
      const schema = z.object({
        zipCode: z.string().min(5).max(5),
        category: z.string().min(1),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error);

      const { zipCode, category } = parsed.data;
      const alreadyClaimed = await storage.isVendorZipClaimed(req.user.id, zipCode, category);
      if (alreadyClaimed) return res.status(400).json({ error: 'You already claimed this zip code for this category' });

      const currentCount = await storage.getVendorCountForZipCategory(zipCode, category);
      if (currentCount >= MAX_VENDORS_PER_ZIP_CATEGORY) return res.status(400).json({ error: 'This zip code is full for this category' });

      const freeZipsUsed = await storage.countVendorFreeZipCodes(req.user.id);
      const freeEligible = isVendorZipFreeEligible(currentCount);
      const isFree = freeZipsUsed < FREE_VENDOR_ZIPS && freeEligible;
      const monthlyRate = isFree ? 0 : getVendorZipPrice(currentCount);

      const zipClaim = await storage.claimVendorZipCode({
        vendorId: req.user.id,
        zipCode,
        category,
        isActive: true,
        monthlyRate,
      });

      res.status(201).json(zipClaim);
    } catch (error) {
      console.error('Error claiming vendor zip code:', error);
      res.status(500).json({ error: 'Failed to claim zip code' });
    }
  });

  app.delete("/api/vendor/zip-codes/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'vendor') return res.status(403).json({ error: 'Forbidden' });
    try {
      await storage.releaseVendorZipCode(Number(req.params.id), req.user.id);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: 'Failed to release zip code' });
    }
  });

  async function assignVendorLead(zipCode: string, category: string): Promise<{ assignedVendorId: number | null; status: string }> {
    const vendors = await storage.getVendorZipCodesByZip(zipCode, category);
    if (vendors.length === 0) return { assignedVendorId: null, status: 'new' };

    const rotation = await storage.getVendorLeadRotation(zipCode, category);
    const lastVendorId = rotation?.lastVendorId;

    let nextVendor: typeof vendors[0];
    if (lastVendorId) {
      const lastIndex = vendors.findIndex(v => v.vendorId === lastVendorId);
      const nextIndex = (lastIndex + 1) % vendors.length;
      nextVendor = vendors[nextIndex];
    } else {
      nextVendor = vendors[0];
    }

    await storage.upsertVendorLeadRotation(zipCode, category, nextVendor.vendorId);
    return { assignedVendorId: nextVendor.vendorId, status: 'assigned' };
  }

  app.post("/api/vendor-leads/submit", async (req, res) => {
    try {
      const schema = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional().nullable(),
        zipCode: z.string().regex(/^\d{5}$/, "Invalid zip code"),
        category: z.string().min(1),
        description: z.string().optional().nullable(),
        urgency: z.enum(['low', 'medium', 'high', 'emergency']).optional().default('medium'),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error);

      const data = parsed.data;
      const { assignedVendorId, status } = await assignVendorLead(data.zipCode, data.category);

      const lead = await storage.createVendorLead({
        ...data,
        phone: data.phone || null,
        description: data.description || null,
        status,
        assignedVendorId,
      });

      if (assignedVendorId) {
        try {
          const vendor = await storage.getUser(assignedVendorId);
          if (vendor) {
            const subs = await storage.getPushSubscriptionsByUser(assignedVendorId);
            await notifyVendorOfNewLead(
              vendor,
              { zipCode: data.zipCode, category: data.category, firstName: data.firstName, lastName: data.lastName, urgency: data.urgency, description: data.description },
              subs,
              async (subId) => storage.deletePushSubscription(subId)
            );
          }
        } catch (notifErr) {
          console.error('Error sending vendor lead notification:', notifErr);
        }
      }

      res.status(201).json({ success: true, assigned: !!assignedVendorId });
    } catch (error) {
      console.error('Error submitting vendor lead:', error);
      res.status(500).json({ error: 'Failed to submit service request' });
    }
  });

  app.get("/api/vendor/leads", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'vendor') return res.status(403).json({ error: 'Forbidden' });
    try {
      const leads = await storage.getVendorLeadsByVendor(req.user.id);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch vendor leads' });
    }
  });

  app.patch("/api/vendor/leads/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'vendor') return res.status(403).json({ error: 'Forbidden' });
    try {
      const { status } = req.body;
      if (!['accepted', 'rejected', 'converted'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      const lead = await storage.getVendorLead(Number(req.params.id));
      if (!lead || lead.assignedVendorId !== req.user.id) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      const updated = await storage.updateVendorLeadStatus(lead.id, status);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update lead status' });
    }
  });

  app.get("/api/vendor/leads/stats", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'vendor') return res.status(403).json({ error: 'Forbidden' });
    try {
      const stats = await storage.getVendorLeadStats(req.user.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch vendor lead stats' });
    }
  });

  app.get("/api/vendor/leads/response-metrics", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'vendor') return res.status(403).json({ error: 'Forbidden' });
    try {
      const metrics = await storage.getVendorResponseMetrics(req.user.id);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch response metrics' });
    }
  });

  app.get("/api/leads/response-metrics", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'agent' && req.user.role !== 'broker')) return res.status(403).json({ error: 'Forbidden' });
    try {
      const metrics = await storage.getAgentResponseMetrics(req.user.id);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch response metrics' });
    }
  });

  const MAX_LENDERS_PER_ZIP = 5;
  const LENDER_TIER_RATES: Record<number, number> = {
    1: 0,      // 1 lender: free
    2: 0,      // 2 lenders: free
    3: 2500,   // 3 lenders: $25/mo each
    4: 5000,   // 4 lenders: $50/mo each
    5: 10000,  // 5 lenders: $100/mo each
  };

  function getLenderTierRate(occupancy: number): number {
    return LENDER_TIER_RATES[Math.min(occupancy, MAX_LENDERS_PER_ZIP)] ?? 10000;
  }

  async function syncLenderRatesForZip(zipCode: string) {
    const lenders = await storage.getLendersForZipCode(zipCode);
    const newRate = getLenderTierRate(lenders.length);
    for (const lender of lenders) {
      if (lender.monthlyRate !== newRate) {
        await storage.updateLenderZipCodeRate(lender.id, newRate);
      }
    }
  }

  app.get("/api/lender-leads/zip-pricing/:zipCode", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "lender") return res.sendStatus(403);

    try {
      const zipCode = req.params.zipCode.trim();
      if (!/^\d{5}$/.test(zipCode)) {
        return res.status(400).json({ error: 'Invalid zip code' });
      }

      const lenderCount = await storage.getLenderCountForZipCode(zipCode);
      const alreadyClaimed = await storage.isLenderZipClaimed(req.user.id, zipCode);
      const currentRate = getLenderTierRate(lenderCount);
      const rateIfJoined = getLenderTierRate(lenderCount + (alreadyClaimed ? 0 : 1));

      const [leads30, leads60, leads90] = await Promise.all([
        storage.getLenderLeadCountForZip(zipCode, 30),
        storage.getLenderLeadCountForZip(zipCode, 60),
        storage.getLenderLeadCountForZip(zipCode, 90),
      ]);

      res.json({
        zipCode,
        currentLenders: lenderCount,
        maxLenders: MAX_LENDERS_PER_ZIP,
        spotsRemaining: MAX_LENDERS_PER_ZIP - lenderCount,
        isFull: lenderCount >= MAX_LENDERS_PER_ZIP,
        alreadyClaimed,
        currentRate,
        rateIfJoined,
        currentRateDisplay: currentRate === 0 ? "Free" : `$${(currentRate / 100).toFixed(0)}/mo`,
        rateIfJoinedDisplay: rateIfJoined === 0 ? "Free" : `$${(rateIfJoined / 100).toFixed(0)}/mo`,
        tierSchedule: Object.entries(LENDER_TIER_RATES).map(([count, rate]) => ({
          lenders: Number(count),
          rate,
          rateDisplay: rate === 0 ? "Free" : `$${(rate / 100).toFixed(0)}/mo`,
        })),
        leadActivity: { last30: leads30, last60: leads60, last90: leads90 },
        noLeadsNoCharge: true,
      });
    } catch (error) {
      console.error('Error fetching lender zip pricing:', error);
      res.status(500).json({ error: 'Failed to fetch pricing' });
    }
  });

  app.post("/api/lender-leads/zip-codes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "lender") return res.sendStatus(403);

    try {
      const lender = await storage.getUser(req.user.id);
      if (!lender) return res.status(404).json({ error: "User not found" });

      if (!LEAD_VERIFIED_STATUSES.has(lender.verificationStatus || "")) {
        return res.status(403).json({
          error: "Your identity must be verified before claiming zip codes. Please complete payment verification so we can match your name on file.",
          code: "VERIFICATION_REQUIRED"
        });
      }

      const { zipCode } = req.body;
      if (!zipCode || typeof zipCode !== 'string') {
        return res.status(400).json({ error: 'Zip code is required' });
      }

      const trimmedZip = zipCode.trim();
      if (!/^\d{5}$/.test(trimmedZip)) {
        return res.status(400).json({ error: 'Please enter a valid 5-digit zip code' });
      }

      const alreadyClaimed = await storage.isLenderZipClaimed(req.user.id, trimmedZip);
      if (alreadyClaimed) {
        return res.status(409).json({ error: 'You have already claimed this zip code' });
      }

      const lenderCount = await storage.getLenderCountForZipCode(trimmedZip);
      if (lenderCount >= MAX_LENDERS_PER_ZIP) {
        return res.status(409).json({ error: `This zip code is full (max ${MAX_LENDERS_PER_ZIP} lenders). Try a nearby zip code.` });
      }

      const newOccupancy = lenderCount + 1;
      const newRate = getLenderTierRate(newOccupancy);

      const claimed = await storage.claimLenderZipCode({
        lenderId: req.user.id,
        zipCode: trimmedZip,
        isActive: true,
        monthlyRate: newRate,
      });

      await syncLenderRatesForZip(trimmedZip);

      res.status(201).json({
        ...claimed,
        monthlyRate: newRate,
        currentLenders: newOccupancy,
        maxLenders: MAX_LENDERS_PER_ZIP,
      });
    } catch (error: any) {
      console.error('Error claiming lender zip code:', error);
      if (error.message?.includes('max 5 lenders')) {
        return res.status(409).json({ error: `This zip code is full (max ${MAX_LENDERS_PER_ZIP} lenders). Try a nearby zip code.` });
      }
      res.status(500).json({ error: 'Failed to claim zip code' });
    }
  });

  app.delete("/api/lender-leads/zip-codes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "lender") return res.sendStatus(403);

    try {
      const id = Number(req.params.id);
      const lenderZips = await storage.getLenderZipCodes(req.user.id);
      const owns = lenderZips.find(z => z.id === id);
      if (!owns) {
        return res.status(403).json({ error: 'You do not own this zip code claim' });
      }

      const zipCode = owns.zipCode;
      await storage.releaseLenderZipCode(id, req.user.id);
      await syncLenderRatesForZip(zipCode);

      res.sendStatus(200);
    } catch (error) {
      console.error('Error releasing lender zip code:', error);
      res.status(500).json({ error: 'Failed to release zip code' });
    }
  });

  app.get("/api/lender-leads/zip-codes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "lender") return res.sendStatus(403);

    try {
      const zipCodes = await storage.getLenderZipCodes(req.user.id);
      res.json({
        zipCodes,
        maxLendersPerZip: MAX_LENDERS_PER_ZIP,
        tierRates: LENDER_TIER_RATES,
      });
    } catch (error) {
      console.error('Error fetching lender zip codes:', error);
      res.status(500).json({ error: 'Failed to fetch zip codes' });
    }
  });

  async function assignLenderLead(zipCode: string): Promise<{ assignedLenderId: number | null; status: string }> {
    const lenders = await storage.getLendersForZipCode(zipCode);
    if (lenders.length === 0) return { assignedLenderId: null, status: 'new' };

    const rotation = await storage.getLenderLeadRotation(zipCode);
    const lastLenderId = rotation?.lastLenderId;

    let nextLender: typeof lenders[0];
    if (lastLenderId) {
      const lastIndex = lenders.findIndex(l => l.lenderId === lastLenderId);
      const nextIndex = (lastIndex + 1) % lenders.length;
      nextLender = lenders[nextIndex];
    } else {
      nextLender = lenders[0];
    }

    await storage.upsertLenderLeadRotation(zipCode, nextLender.lenderId);
    return { assignedLenderId: nextLender.lenderId, status: 'assigned' };
  }

  app.post("/api/lender-leads/submit", async (req, res) => {
    try {
      const schema = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional().nullable(),
        zipCode: z.string().regex(/^\d{5}$/, "Invalid zip code"),
        loanType: z.enum(['conventional', 'fha', 'va', 'usda', 'other']).optional().default('conventional'),
        purchasePrice: z.string().optional().nullable(),
        downPayment: z.string().optional().nullable(),
        creditScore: z.string().optional().nullable(),
        message: z.string().optional().nullable(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error);

      const data = parsed.data;
      const { assignedLenderId, status } = await assignLenderLead(data.zipCode);

      const lead = await storage.createLenderLead({
        ...data,
        phone: data.phone || null,
        purchasePrice: data.purchasePrice || null,
        downPayment: data.downPayment || null,
        creditScore: data.creditScore || null,
        message: data.message || null,
        status,
        assignedLenderId,
      });

      if (assignedLenderId) {
        try {
          const lender = await storage.getUser(assignedLenderId);
          if (lender) {
            notify(
              assignedLenderId,
              'lead_new',
              'New Lender Lead',
              `${data.firstName} ${data.lastName} in ${data.zipCode} — ${data.loanType} loan`,
              lead.id,
              'lender_lead'
            ).catch(() => {});
          }
        } catch (notifErr) {
          console.error('Error sending lender lead notification:', notifErr);
        }
      }

      res.status(201).json({ success: true, assigned: !!assignedLenderId });
    } catch (error) {
      console.error('Error submitting lender lead:', error);
      res.status(500).json({ error: 'Failed to submit lender request' });
    }
  });

  app.get("/api/lender/leads", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'lender') return res.status(403).json({ error: 'Forbidden' });
    try {
      const leads = await storage.getLenderLeadsByLender(req.user.id);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch lender leads' });
    }
  });

  app.patch("/api/lender/leads/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'lender') return res.status(403).json({ error: 'Forbidden' });
    try {
      const { status } = req.body;
      if (!['accepted', 'rejected', 'converted'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      const lead = await storage.getLenderLead(Number(req.params.id));
      if (!lead || lead.assignedLenderId !== req.user.id) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      const updated = await storage.updateLenderLeadStatus(lead.id, status);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update lead status' });
    }
  });

  // ===== LENDER PORTAL ROUTES =====

  const LENDER_STAGES = ['invited', 'under_contract', 'processing', 'underwriting', 'conditions_clearing', 'clear_to_close', 'closed', 'on_hold'];

  const DEFAULT_CHECKLIST_MAPPINGS: Array<{ lenderItemId: string; agentItemId: string; description: string }> = [
    { lenderItemId: "l-inv-1", agentItemId: "b-pre-2", description: "Pre-qualification letter → Pre-approval obtained" },
    { lenderItemId: "l-uc-1", agentItemId: "b-dd-1", description: "Contract received → Contract executed" },
    { lenderItemId: "l-proc-3", agentItemId: "b-dd-3", description: "Appraisal ordered → Appraisal ordered" },
    { lenderItemId: "l-uw-3", agentItemId: "b-dd-5", description: "Conditional approval → Loan approval received" },
    { lenderItemId: "l-cc-5", agentItemId: "b-close-1", description: "Clear-to-close → Clear to close confirmed" },
    { lenderItemId: "l-ctc-2", agentItemId: "b-close-2", description: "CD sent → Closing disclosure reviewed" },
    { lenderItemId: "l-cl-1", agentItemId: "b-close-5", description: "Loan funded → Closing complete" },
  ];

  const lenderProfileCreateSchema = z.object({
    name: z.string().min(1).max(200),
    company: z.string().min(1).max(200),
    nmls: z.string().max(50).optional().nullable(),
    phone: z.string().max(50).optional().nullable(),
    email: z.string().max(200).optional().nullable(),
    conventionalRate: z.string().max(20).optional().nullable(),
    fhaRate: z.string().max(20).optional().nullable(),
    vaRate: z.string().max(20).optional().nullable(),
    usdaRate: z.string().max(20).optional().nullable(),
    closingCostsPct: z.string().max(20).optional().nullable(),
    minCreditScore: z.string().max(10).optional().nullable(),
    minDownPaymentPct: z.string().max(10).optional().nullable(),
    specialties: z.string().max(500).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  });
  const lenderProfileUpdateSchema = lenderProfileCreateSchema.partial();

  function parseIdParam(val: string): number | null {
    const n = parseInt(val, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  app.get("/api/lender-profiles", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const role = req.user.role;
    if (role !== 'agent' && role !== 'broker') return res.status(403).json({ error: "Forbidden" });
    try {
      const profiles = await storage.getLenderProfiles(req.user.id);
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lender profiles" });
    }
  });

  app.post("/api/lender-profiles", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const role = req.user.role;
    if (role !== 'agent' && role !== 'broker') return res.status(403).json({ error: "Forbidden" });
    const parsed = lenderProfileCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
    try {
      const profile = await storage.createLenderProfile({ ...parsed.data, agentId: req.user.id });
      res.status(201).json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to create lender profile" });
    }
  });

  app.patch("/api/lender-profiles/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const role = req.user.role;
    if (role !== 'agent' && role !== 'broker') return res.status(403).json({ error: "Forbidden" });
    const id = parseIdParam(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    const parsed = lenderProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
    try {
      const existing = await storage.getLenderProfile(id);
      if (!existing || existing.agentId !== req.user.id) return res.status(404).json({ error: "Not found" });
      const updated = await storage.updateLenderProfile(id, parsed.data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update lender profile" });
    }
  });

  app.delete("/api/lender-profiles/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const role = req.user.role;
    if (role !== 'agent' && role !== 'broker') return res.status(403).json({ error: "Forbidden" });
    const id = parseIdParam(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    try {
      const existing = await storage.getLenderProfile(id);
      if (!existing || existing.agentId !== req.user.id) return res.status(404).json({ error: "Not found" });
      await storage.deleteLenderProfile(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete lender profile" });
    }
  });

  app.post("/api/lender-profiles/:id/photo", upload.single("photo"), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const role = req.user.role;
    if (role !== 'agent' && role !== 'broker') return res.status(403).json({ error: "Forbidden" });
    const id = parseIdParam(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });
    try {
      const existing = await storage.getLenderProfile(id);
      if (!existing || existing.agentId !== req.user.id) return res.status(404).json({ error: "Not found" });
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      if (!isValidImage(req.file.buffer, req.file.mimetype)) return res.status(400).json({ error: "File must be a valid image (PNG, JPEG, GIF, or WebP)" });
      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const updated = await storage.updateLenderProfile(id, { photoUrl: base64 });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  app.get("/api/lender/transactions", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'lender') return res.status(403).json({ error: 'Forbidden' });
    try {
      const transactions = await storage.getLenderTransactionsByLender(req.user.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch lender transactions' });
    }
  });

  app.post("/api/lender/transactions", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'lender') return res.status(403).json({ error: 'Forbidden' });
    try {
      const schema = z.object({
        borrowerName: z.string().min(1),
        borrowerEmail: z.string().email().optional().nullable(),
        borrowerPhone: z.string().optional().nullable(),
        propertyAddress: z.string().optional().nullable(),
        loanAmount: z.number().optional().nullable(),
        loanType: z.enum(['conventional', 'fha', 'va', 'usda', 'jumbo', 'other']).optional().default('conventional'),
        interestRate: z.number().optional().nullable(),
        notes: z.string().optional().nullable(),
        agentTransactionId: z.number().optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error);

      let agentId = null;
      if (parsed.data.agentTransactionId) {
        const agentTx = await storage.getTransaction(parsed.data.agentTransactionId);
        if (agentTx) agentId = agentTx.agentId;
      }

      const transaction = await storage.createLenderTransaction({
        ...parsed.data,
        lenderId: req.user.id,
        agentId,
        status: 'invited',
      });

      await storage.createLenderChecklist({
        lenderTransactionId: transaction.id,
        items: [],
      });

      if (parsed.data.agentTransactionId) {
        for (const mapping of DEFAULT_CHECKLIST_MAPPINGS) {
          await storage.createLenderChecklistMapping({
            lenderTransactionId: transaction.id,
            lenderChecklistItemId: mapping.lenderItemId,
            agentTransactionId: parsed.data.agentTransactionId,
            agentChecklistItemId: mapping.agentItemId,
          });
        }
      }

      res.status(201).json(transaction);
    } catch (error) {
      console.error('Error creating lender transaction:', error);
      res.status(500).json({ error: 'Failed to create lender transaction' });
    }
  });

  app.get("/api/lender/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'lender') return res.status(403).json({ error: 'Forbidden' });
    try {
      const transaction = await storage.getLenderTransaction(Number(req.params.id));
      if (!transaction || transaction.lenderId !== req.user.id) return res.status(404).json({ error: 'Not found' });
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch lender transaction' });
    }
  });

  app.patch("/api/lender/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'lender') return res.status(403).json({ error: 'Forbidden' });
    try {
      const transaction = await storage.getLenderTransaction(Number(req.params.id));
      if (!transaction || transaction.lenderId !== req.user.id) return res.status(404).json({ error: 'Not found' });

      const schema = z.object({
        borrowerName: z.string().optional(),
        borrowerEmail: z.string().email().optional().nullable(),
        borrowerPhone: z.string().optional().nullable(),
        propertyAddress: z.string().optional().nullable(),
        loanAmount: z.number().optional().nullable(),
        loanType: z.string().optional(),
        interestRate: z.number().optional().nullable(),
        status: z.enum(['invited', 'under_contract', 'processing', 'underwriting', 'conditions_clearing', 'clear_to_close', 'closed', 'on_hold'] as const).optional(),
        notes: z.string().optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error);

      const updated = await storage.updateLenderTransaction(Number(req.params.id), parsed.data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update lender transaction' });
    }
  });

  app.delete("/api/lender/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'lender') return res.status(403).json({ error: 'Forbidden' });
    try {
      const transaction = await storage.getLenderTransaction(Number(req.params.id));
      if (!transaction || transaction.lenderId !== req.user.id) return res.status(404).json({ error: 'Not found' });
      await storage.deleteLenderTransaction(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete lender transaction' });
    }
  });

  app.get("/api/lender/transactions/:id/checklist", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'lender') return res.status(403).json({ error: 'Forbidden' });
    try {
      const transaction = await storage.getLenderTransaction(Number(req.params.id));
      if (!transaction || transaction.lenderId !== req.user.id) return res.status(404).json({ error: 'Not found' });

      let checklist = await storage.getLenderChecklist(transaction.id);
      if (!checklist) {
        checklist = await storage.createLenderChecklist({
          lenderTransactionId: transaction.id,
          items: [],
        });
      }
      res.json(checklist);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch lender checklist' });
    }
  });

  app.patch("/api/lender/transactions/:id/checklist", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'lender') return res.status(403).json({ error: 'Forbidden' });
    try {
      const transaction = await storage.getLenderTransaction(Number(req.params.id));
      if (!transaction || transaction.lenderId !== req.user.id) return res.status(404).json({ error: 'Not found' });

      const { items } = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ error: 'Items must be an array' });

      let checklist = await storage.getLenderChecklist(transaction.id);
      if (!checklist) {
        checklist = await storage.createLenderChecklist({ lenderTransactionId: transaction.id, items: [] });
      }

      const updated = await storage.updateLenderChecklist(checklist.id, items);

      const mappings = await storage.getLenderChecklistMappings(transaction.id);
      if (mappings.length > 0 && transaction.agentTransactionId) {
        for (const mapping of mappings) {
          const lenderItem = items.find((i: any) => i.id === mapping.lenderChecklistItemId);
          if (lenderItem) {
            const agentChecklist = await storage.getChecklist(mapping.agentTransactionId);
            if (agentChecklist) {
              const agentItems = (agentChecklist.items as any[]) || [];
              const agentItemIndex = agentItems.findIndex((i: any) => i.id === mapping.agentChecklistItemId);
              if (agentItemIndex >= 0 && agentItems[agentItemIndex].completed !== lenderItem.completed) {
                agentItems[agentItemIndex].completed = lenderItem.completed;
                await storage.updateChecklist(agentChecklist.id, agentItems);
              }
            }
          }
        }
      }

      res.json(updated);
    } catch (error) {
      console.error('Error updating lender checklist:', error);
      res.status(500).json({ error: 'Failed to update lender checklist' });
    }
  });

  app.get("/api/lender/transactions/:id/checklist/mappings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'lender') return res.status(403).json({ error: 'Forbidden' });
    try {
      const transaction = await storage.getLenderTransaction(Number(req.params.id));
      if (!transaction || transaction.lenderId !== req.user.id) return res.status(404).json({ error: 'Not found' });
      const mappings = await storage.getLenderChecklistMappings(transaction.id);
      res.json(mappings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch mappings' });
    }
  });

  app.post("/api/lender/transactions/:id/checklist/mappings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'lender') return res.status(403).json({ error: 'Forbidden' });
    try {
      const transaction = await storage.getLenderTransaction(Number(req.params.id));
      if (!transaction || transaction.lenderId !== req.user.id) return res.status(404).json({ error: 'Not found' });

      const schema = z.object({
        lenderChecklistItemId: z.string(),
        agentTransactionId: z.number(),
        agentChecklistItemId: z.string(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error);

      if (transaction.agentTransactionId !== parsed.data.agentTransactionId) {
        return res.status(403).json({ error: 'Can only map to linked agent transaction' });
      }

      const mapping = await storage.createLenderChecklistMapping({
        lenderTransactionId: transaction.id,
        ...parsed.data,
      });
      res.status(201).json(mapping);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create mapping' });
    }
  });

  app.post("/api/transactions/:id/invite-lender", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'agent') return res.status(403).json({ error: 'Forbidden' });
    try {
      const transaction = await storage.getTransaction(Number(req.params.id));
      if (!transaction || transaction.agentId !== req.user.id) return res.status(404).json({ error: 'Not found' });

      const existing = await storage.getLenderTransactionByAgentTransaction(transaction.id);
      if (existing) return res.status(400).json({ error: 'A lender is already linked to this transaction' });

      const schema = z.object({
        lenderId: z.number(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error);

      const lender = await storage.getUser(parsed.data.lenderId);
      if (!lender || lender.role !== 'lender') return res.status(400).json({ error: 'Invalid lender' });

      const clientName = transaction.clientId 
        ? await storage.getClient(transaction.clientId).then(c => c ? `${c.firstName} ${c.lastName}` : 'Unknown Borrower')
        : 'Unknown Borrower';

      const lenderTx = await storage.createLenderTransaction({
        lenderId: parsed.data.lenderId,
        borrowerName: clientName,
        propertyAddress: `${transaction.streetName || ''}, ${transaction.city || ''}, ${transaction.state || ''} ${transaction.zipCode || ''}`.trim(),
        loanAmount: transaction.contractPrice ? Number(transaction.contractPrice) : null,
        agentId: req.user.id,
        agentTransactionId: transaction.id,
        status: 'invited',
      });

      await storage.createLenderChecklist({
        lenderTransactionId: lenderTx.id,
        items: [],
      });

      for (const mapping of DEFAULT_CHECKLIST_MAPPINGS) {
        await storage.createLenderChecklistMapping({
          lenderTransactionId: lenderTx.id,
          lenderChecklistItemId: mapping.lenderItemId,
          agentTransactionId: transaction.id,
          agentChecklistItemId: mapping.agentItemId,
        });
      }

      const existingContacts = await storage.getContactsByTransaction(transaction.id);
      const alreadyHasLenderContact = existingContacts.some(
        (c: any) => c.role === 'Lender' && c.email === lender.email
      );
      if (!alreadyHasLenderContact) {
        await storage.createContact({
          transactionId: transaction.id,
          role: 'Lender',
          firstName: lender.firstName,
          lastName: lender.lastName,
          email: lender.email,
          phone: '',
          mobilePhone: '',
        });
      }

      res.status(201).json(lenderTx);
    } catch (error) {
      console.error('Error inviting lender:', error);
      res.status(500).json({ error: 'Failed to invite lender' });
    }
  });

  app.get("/api/transactions/:id/lender-status", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const transaction = await storage.getTransaction(Number(req.params.id));
      if (!transaction) return res.status(404).json({ error: 'Not found' });
      if (transaction.agentId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

      const lenderTx = await storage.getLenderTransactionByAgentTransaction(transaction.id);
      if (!lenderTx) return res.json({ linked: false });

      const lender = await storage.getUser(lenderTx.lenderId);
      const checklist = await storage.getLenderChecklist(lenderTx.id);
      const items = (checklist?.items as any[]) || [];
      const completed = items.filter((i: any) => i.completed).length;
      const total = items.length;

      res.json({
        linked: true,
        lenderName: lender ? `${lender.firstName} ${lender.lastName}` : 'Unknown',
        status: lenderTx.status,
        loanType: lenderTx.loanType,
        loanAmount: lenderTx.loanAmount,
        interestRate: lenderTx.interestRate,
        checklistProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch lender status' });
    }
  });

  app.get("/api/lenders", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'agent') return res.status(403).json({ error: 'Forbidden' });
    try {
      const { db } = await import('./db');
      const { sql: sqlTag } = await import('drizzle-orm/sql');
      const result = await db.execute(sqlTag`SELECT id, first_name, last_name, email FROM users WHERE role = 'lender' ORDER BY first_name`);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch lenders' });
    }
  });

  app.post("/api/client-invitations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    try {
      const { email, firstName, lastName, clientRecordId } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      if (clientRecordId) {
        const clients = await storage.getClients(req.user.id);
        const ownsClient = clients.some((c: any) => c.id === clientRecordId);
        if (!ownsClient) {
          return res.status(403).json({ error: "Client record does not belong to you" });
        }
      }

      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invitation = await storage.createClientInvitation({
        agentId: req.user.id,
        email: email.toLowerCase().trim(),
        firstName: firstName || null,
        lastName: lastName || null,
        token,
        status: "pending",
        clientRecordId: clientRecordId || null,
        expiresAt,
      });

      res.status(201).json(invitation);
    } catch (error) {
      console.error("Error creating client invitation:", error);
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  app.get("/api/client-invitations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      if (req.user.role === "agent") {
        const invitations = await storage.getClientInvitationsByAgent(req.user.id);
        res.json(invitations);
      } else {
        const invitations = await storage.getClientInvitationsByEmail(req.user.email);
        res.json(invitations);
      }
    } catch (error) {
      console.error("Error fetching client invitations:", error);
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  app.get("/api/client-invitations/pending", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const invitations = await storage.getClientInvitationsByEmail(req.user.email);
      const pending = invitations.filter(inv => inv.status === "pending" && new Date(inv.expiresAt) > new Date());

      const enriched = await Promise.all(pending.map(async (inv) => {
        const agent = await storage.getUser(inv.agentId);
        return {
          ...inv,
          agentName: agent ? `${agent.firstName} ${agent.lastName}` : "Unknown Agent",
        };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
      res.status(500).json({ error: "Failed to fetch pending invitations" });
    }
  });

  app.post("/api/client-invitations/:token/accept", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const invitation = await storage.getClientInvitationByToken(req.params.token);
      if (!invitation) return res.status(404).json({ error: "Invitation not found" });
      if (invitation.status !== "pending") return res.status(400).json({ error: "Invitation already processed" });
      if (new Date(invitation.expiresAt) < new Date()) return res.status(400).json({ error: "Invitation has expired" });
      if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ error: "This invitation is not for your email address" });
      }

      await storage.updateUser(req.user.id, {
        agentId: invitation.agentId,
        clientRecordId: invitation.clientRecordId,
      });

      const updated = await storage.updateClientInvitationStatus(invitation.id, "accepted", invitation.clientRecordId || undefined);

      const user = await storage.getUser(req.user.id);

      res.json({ invitation: updated, user });
    } catch (error) {
      console.error("Error accepting client invitation:", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  app.post("/api/client-invitations/:token/decline", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const invitation = await storage.getClientInvitationByToken(req.params.token);
      if (!invitation) return res.status(404).json({ error: "Invitation not found" });
      if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ error: "This invitation is not for your email address" });
      }

      const updated = await storage.updateClientInvitationStatus(invitation.id, "declined");
      res.json(updated);
    } catch (error) {
      console.error("Error declining client invitation:", error);
      res.status(500).json({ error: "Failed to decline invitation" });
    }
  });

  app.get("/api/broker/agents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "broker") return res.sendStatus(403);
    try {
      const agents = await storage.getBrokerageAgents(req.user.id);
      const enriched = await Promise.all(agents.map(async ({ password, ...a }) => {
        const metrics = await storage.getAgentMetrics(a.id);
        return { ...a, transactions: metrics.totalTransactions, clients: metrics.totalClients, pipelineValue: metrics.pipelineValue, communications: metrics.totalActivity };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching broker agents:", error);
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  app.get("/api/broker/metrics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "broker") return res.sendStatus(403);
    try {
      const metrics = await storage.getBrokerMetrics(req.user.id);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching broker metrics:", error);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  app.get("/api/broker/agent/:id/metrics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "broker") return res.sendStatus(403);
    try {
      const agentId = Number(req.params.id);
      const agent = await storage.getUser(agentId);
      if (!agent || agent.brokerageId !== req.user.id) {
        return res.status(404).json({ error: "Agent not found in your brokerage" });
      }
      const metrics = await storage.getAgentMetrics(agentId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching agent metrics:", error);
      res.status(500).json({ error: "Failed to fetch agent metrics" });
    }
  });

  app.post("/api/broker/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "broker") return res.sendStatus(403);
    try {
      const { title, message, priority } = req.body;
      if (!title || !message) {
        return res.status(400).json({ error: "Title and message are required" });
      }
      const notification = await storage.createBrokerNotification({
        brokerId: req.user.id,
        title,
        message,
        priority: priority || "normal",
      });
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating broker notification:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  app.get("/api/broker/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "broker") return res.sendStatus(403);
    try {
      const notifications = await storage.getBrokerNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching broker notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const notifications = await storage.getAgentNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching agent notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent") return res.sendStatus(403);
    try {
      const notificationId = Number(req.params.id);
      const notification = await db.execute(sql`SELECT broker_id FROM broker_notifications WHERE id = ${notificationId}`);
      if (notification.rows.length === 0) return res.status(404).json({ error: "Notification not found" });
      const brokerId = (notification.rows[0] as any).broker_id;
      if (req.user.brokerageId !== brokerId) return res.sendStatus(403);
      const read = await storage.markBrokerNotificationRead(notificationId, req.user.id);
      res.json(read);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/broker/competitions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "broker") return res.sendStatus(403);
    try {
      const { name, description, startDate, endDate, metric, prize, status } = req.body;
      if (!name || !startDate || !endDate || !metric) {
        return res.status(400).json({ error: "Name, start date, end date, and metric are required" });
      }
      const competition = await storage.createSalesCompetition({
        brokerId: req.user.id,
        name,
        description: description || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        metric,
        prize: prize || null,
        status: status || "upcoming",
      });
      res.status(201).json(competition);
    } catch (error) {
      console.error("Error creating competition:", error);
      res.status(500).json({ error: "Failed to create competition" });
    }
  });

  app.get("/api/broker/competitions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "broker") return res.sendStatus(403);
    try {
      const competitions = await storage.getSalesCompetitions(req.user.id);
      res.json(competitions);
    } catch (error) {
      console.error("Error fetching competitions:", error);
      res.status(500).json({ error: "Failed to fetch competitions" });
    }
  });

  app.get("/api/broker/competitions/:id/leaderboard", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "broker") return res.sendStatus(403);
    try {
      const competitionId = Number(req.params.id);
      const competitions = await storage.getSalesCompetitions(req.user.id);
      const competition = competitions.find(c => c.id === competitionId);
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }
      const leaderboard = await storage.getCompetitionLeaderboard(competitionId, competition.metric, req.user.id);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/feedback/:token", async (req, res) => {
    try {
      const feedbackRequest = await storage.getFeedbackRequestByToken(req.params.token);
      if (!feedbackRequest) return res.status(404).json({ error: "Feedback request not found" });
      if (feedbackRequest.status === 'completed') return res.status(400).json({ error: "Feedback already submitted", completed: true });
      res.json(feedbackRequest);
    } catch (error) {
      console.error("Error fetching feedback request:", error);
      res.status(500).json({ error: "Failed to fetch feedback request" });
    }
  });

  app.post("/api/feedback/:token/submit", async (req, res) => {
    try {
      const feedbackRequest = await storage.getFeedbackRequestByToken(req.params.token);
      if (!feedbackRequest) return res.status(404).json({ error: "Feedback request not found" });
      if (feedbackRequest.status === 'completed') return res.status(400).json({ error: "Feedback already submitted" });

      const { rating, title, comment } = req.body;
      if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
      }
      if (!comment || typeof comment !== 'string' || !comment.trim()) {
        return res.status(400).json({ error: "Comment is required" });
      }
      if (comment.length > 2000) return res.status(400).json({ error: "Comment must be 2000 characters or less" });
      if (title && (typeof title !== 'string' || title.length > 100)) {
        return res.status(400).json({ error: "Title must be 100 characters or less" });
      }

      const reviewResult = await db.execute(sql`
        INSERT INTO agent_reviews (agent_id, reviewer_id, rating, title, comment, transaction_id, is_public)
        VALUES (${feedbackRequest.agent_id}, ${feedbackRequest.client_id}, ${rating}, ${title || null}, ${comment}, ${feedbackRequest.transaction_id}, true)
        RETURNING *
      `);
      const review = reviewResult.rows[0] as any;

      await storage.completeFeedbackRequest(feedbackRequest.id, review.id);

      res.json({ success: true, message: "Thank you for your feedback!" });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  app.get("/api/feedback-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const requests = await storage.getFeedbackRequestsByAgent(req.user.id);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching feedback requests:", error);
      res.status(500).json({ error: "Failed to fetch feedback requests" });
    }
  });

  app.post("/api/feedback-requests/send", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const { transactionId, clientId } = req.body;
      if (!transactionId || !clientId) return res.status(400).json({ error: "Transaction ID and Client ID are required" });

      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) return res.status(404).json({ error: "Transaction not found" });
      if (transaction.agentId !== req.user.id) return res.status(403).json({ error: "Not authorized for this transaction" });
      if (transaction.clientId !== clientId && transaction.secondaryClientId !== clientId) {
        return res.status(400).json({ error: "Client is not part of this transaction" });
      }

      const existing = await storage.getFeedbackRequestByTransaction(transactionId, clientId);
      if (existing) return res.status(400).json({ error: "Feedback request already sent for this transaction" });

      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ error: "Client not found" });

      const token = randomUUID();
      const feedbackReq = await storage.createFeedbackRequest({
        transactionId,
        agentId: req.user.id,
        clientId,
        token,
      });

      const agentName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'your agent';
      const address = [transaction.streetName, transaction.city].filter(Boolean).join(', ') || 'your property';
      const feedbackUrl = `${getAppBaseUrl(req)}/feedback/${token}`;
      const deliveredVia: string[] = [];

      if (client.phone) {
        const agentPhone = await storage.getAgentPhoneNumber(req.user.id);
        const smsMessage = `Hi ${client.firstName}! ${agentName} would love to hear about your experience with the transaction at ${address}. Please leave a review here: ${feedbackUrl}`;
        const smsResult = agentPhone
          ? await sendSMSFromNumber(agentPhone.phoneNumber, client.phone, smsMessage)
          : await sendSMS(client.phone, smsMessage);
        if (smsResult.success) deliveredVia.push('sms');
        else console.error("Failed to send feedback SMS:", smsResult.error);
      }

      if (client.email) {
        try {
          const gmailStatus = await getGmailStatus(req.user.id);
          if (gmailStatus.connected) {
            const subject = `How was your experience? — ${address}`;
            const emailBody = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#333;">We'd love your feedback!</h2>
              <p>Hi ${client.firstName || 'there'},</p>
              <p>${agentName} would love to hear about your experience with the transaction at <strong>${address}</strong>.</p>
              <p style="margin:24px 0;"><a href="${feedbackUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Leave a Review</a></p>
              <p style="color:#666;font-size:13px;">Or copy this link: ${feedbackUrl}</p>
            </div>`;
            const emailResult = await sendGmailEmail(req.user.id, client.email, subject, emailBody);
            if (emailResult.success) deliveredVia.push('email');
          }
        } catch (emailErr) {
          console.error("Failed to send feedback email:", emailErr);
        }
      }

      if (client.email) {
        try {
          const clientUser = await storage.getUserByEmail(client.email);
          if (clientUser) {
            await storage.createPrivateMessage({
              senderId: req.user.id,
              recipientId: clientUser.id,
              content: `Hi ${client.firstName || 'there'}! I'd love to hear about your experience with the transaction at ${address}. Please leave a review here: ${feedbackUrl}`,
            });
            deliveredVia.push('message');
          }
        } catch (msgErr) {
          console.error("Failed to send feedback private message:", msgErr);
        }
      }

      if (deliveredVia.length === 0 && !client.phone && !client.email) {
        return res.status(400).json({ error: "Client has no phone number or email address on file" });
      }

      res.json({ ...feedbackReq, deliveredVia });
    } catch (error) {
      console.error("Error sending feedback request:", error);
      res.status(500).json({ error: "Failed to send feedback request" });
    }
  });

  app.get("/api/broker/leads", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "broker") return res.sendStatus(403);
    try {
      const leads = await storage.getBrokerageLeads(req.user.id);
      res.json(leads);
    } catch (error) {
      console.error("Error fetching broker leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.post("/api/broker/leads/:id/reassign", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "broker") return res.sendStatus(403);
    try {
      const leadId = Number(req.params.id);
      const { agentId } = req.body;
      if (!agentId) return res.status(400).json({ error: "Agent ID is required" });

      const agents = await storage.getBrokerageAgents(req.user.id);
      const agentIds = agents.map(a => a.id);
      agentIds.push(req.user.id);
      if (!agentIds.includes(agentId)) {
        return res.status(403).json({ error: "Agent is not in your brokerage" });
      }

      const lead = await storage.reassignLead(leadId, agentId);
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      res.json(lead);
    } catch (error) {
      console.error("Error reassigning lead:", error);
      res.status(500).json({ error: "Failed to reassign lead" });
    }
  });

  // Transaction Templates
  app.get("/api/transaction-templates", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const templates = await storage.getTransactionTemplatesByAgent(req.user.id);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.post("/api/transaction-templates", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const { name, type, checklistItems, documents, notes } = req.body;
      if (!name) return res.status(400).json({ error: "Template name is required" });
      const template = await storage.createTransactionTemplate({
        agentId: req.user.id, name, type, checklistItems, documents, notes,
      });
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.post("/api/transaction-templates/from-transaction/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const txId = Number(req.params.id);
      const transaction = await storage.getTransaction(txId);
      if (!transaction || transaction.agentId !== req.user.id) return res.status(403).json({ error: "Not authorized" });

      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Template name is required" });

      const buyerChecklist = await storage.getChecklist(txId, 'buyer');
      const sellerChecklist = await storage.getChecklist(txId, 'seller');
      const checklistItems = {
        buyer: buyerChecklist?.items || [],
        seller: sellerChecklist?.items || [],
      };

      const docsResult = await db.execute(sql`SELECT name, status, notes FROM documents WHERE transaction_id = ${txId}`);
      const documents = docsResult.rows.map((d: any) => ({ name: d.name, notes: d.notes }));

      const template = await storage.createTransactionTemplate({
        agentId: req.user.id, name, type: transaction.type || 'buy', checklistItems, documents, notes: req.body.notes,
      });
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to create template from transaction" });
    }
  });

  app.patch("/api/transaction-templates/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const template = await storage.getTransactionTemplate(Number(req.params.id));
      if (!template || template.agent_id !== req.user.id) return res.status(403).json({ error: "Not authorized" });
      const updated = await storage.updateTransactionTemplate(Number(req.params.id), req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/transaction-templates/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const template = await storage.getTransactionTemplate(Number(req.params.id));
      if (!template || template.agent_id !== req.user.id) return res.status(403).json({ error: "Not authorized" });
      await storage.deleteTransactionTemplate(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  app.post("/api/transactions/from-template/:templateId", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const template = await storage.getTransactionTemplate(Number(req.params.templateId));
      if (!template || template.agent_id !== req.user.id) return res.status(403).json({ error: "Not authorized" });

      const { streetName, city, state, zipCode, clientId, accessCode, type } = req.body;
      const effectiveType = type || template.type || 'buy';
      if (effectiveType === 'sell' && (!streetName || !streetName.trim())) {
        return res.status(400).json({ error: "Street name is required for seller transactions" });
      }

      const transaction = await storage.createTransaction({
        streetName: streetName || null, city: city || null, state: state || null, zipCode: zipCode || null,
        accessCode, type: effectiveType,
        agentId: req.user.id, clientId: clientId || null, status: effectiveType === 'buy' ? 'qualified_buyer' : 'prospect',
      });

      if (template.checklist_items) {
        const items = typeof template.checklist_items === 'string' ? JSON.parse(template.checklist_items) : template.checklist_items;
        if (items.buyer && Array.isArray(items.buyer)) {
          const resetItems = items.buyer.map((item: any) => ({ ...item, completed: false }));
          await storage.createChecklist({ transactionId: transaction.id, role: 'buyer', items: resetItems });
        }
        if (items.seller && Array.isArray(items.seller)) {
          const resetItems = items.seller.map((item: any) => ({ ...item, completed: false }));
          await storage.createChecklist({ transactionId: transaction.id, role: 'seller', items: resetItems });
        }
      }

      if (template.documents) {
        const docs = typeof template.documents === 'string' ? JSON.parse(template.documents) : template.documents;
        if (Array.isArray(docs)) {
          for (const doc of docs) {
            await db.execute(sql`
              INSERT INTO documents (transaction_id, name, status, notes)
              VALUES (${transaction.id}, ${doc.name}, 'not_applicable', ${doc.notes || null})
            `);
          }
        }
      }

      if (transaction && clientId) {
        try {
          const client = await storage.getClient(Number(clientId));
          if (client && client.agentId === req.user.id) {
            await storage.createContact({
              role: effectiveType === 'buy' ? 'Buyer' : 'Seller',
              firstName: client.firstName,
              lastName: client.lastName,
              email: client.email || '',
              phone: client.phone || null,
              mobilePhone: client.mobilePhone || null,
              transactionId: transaction.id,
              clientId: client.id,
            });
          }
        } catch (e) {
          console.error(`Error auto-creating contact for client ${clientId}:`, e);
        }
      }

      res.json(transaction);
    } catch (error) {
      console.error("Error creating transaction from template:", error);
      res.status(500).json({ error: "Failed to create transaction from template" });
    }
  });

  // Commission Entries
  app.get("/api/commissions", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const entries = await storage.getCommissionEntriesByAgent(req.user.id);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch commissions" });
    }
  });

  app.get("/api/commissions/transaction/:transactionId", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const entry = await storage.getCommissionEntryByTransaction(Number(req.params.transactionId), req.user.id);
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch commission" });
    }
  });

  app.get("/api/commissions/summary", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const summary = await storage.getCommissionSummary(req.user.id);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch commission summary" });
    }
  });

  app.post("/api/commissions", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const { transactionId, commissionRate, commissionAmount, brokerageSplitPercent, referralFeePercent, expenses, notes } = req.body;
      if (!transactionId) return res.status(400).json({ error: "Transaction ID is required" });

      const transaction = await storage.getTransaction(transactionId);
      if (!transaction || transaction.agentId !== req.user.id) return res.status(403).json({ error: "Not authorized" });

      const existing = await storage.getCommissionEntryByTransaction(transactionId, req.user.id);
      if (existing) return res.status(400).json({ error: "Commission entry already exists for this transaction" });

      const entry = await storage.createCommissionEntry({
        transactionId, agentId: req.user.id, commissionRate, commissionAmount, brokerageSplitPercent, referralFeePercent, expenses, notes,
      });
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to create commission entry" });
    }
  });

  app.patch("/api/commissions/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const entry = await storage.getCommissionEntry(Number(req.params.id));
      if (!entry || entry.agent_id !== req.user.id) return res.status(403).json({ error: "Not authorized" });
      const updated = await storage.updateCommissionEntry(Number(req.params.id), req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update commission entry" });
    }
  });

  app.delete("/api/commissions/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const entry = await storage.getCommissionEntry(Number(req.params.id));
      if (!entry || entry.agent_id !== req.user.id) return res.status(403).json({ error: "Not authorized" });
      await storage.deleteCommissionEntry(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete commission entry" });
    }
  });

  // Open Houses
  app.get("/api/open-houses", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const openHouses = await storage.getOpenHousesByAgent(req.user.id);
      res.json(openHouses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch open houses" });
    }
  });

  app.post("/api/open-houses", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const { address, city, state, zipCode, date, startTime, endTime, notes, transactionId } = req.body;
      if (!address || !date || !startTime || !endTime) return res.status(400).json({ error: "Address, date, start time, and end time are required" });

      const slug = `${address.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;

      const openHouse = await storage.createOpenHouse({
        agentId: req.user.id, transactionId, address, city, state, zipCode, date, startTime, endTime, notes, slug,
      });
      res.json(openHouse);
    } catch (error) {
      res.status(500).json({ error: "Failed to create open house" });
    }
  });

  app.patch("/api/open-houses/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const oh = await storage.getOpenHouse(Number(req.params.id));
      if (!oh || oh.agent_id !== req.user.id) return res.status(403).json({ error: "Not authorized" });
      const updated = await storage.updateOpenHouse(Number(req.params.id), req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update open house" });
    }
  });

  app.delete("/api/open-houses/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const oh = await storage.getOpenHouse(Number(req.params.id));
      if (!oh || oh.agent_id !== req.user.id) return res.status(403).json({ error: "Not authorized" });
      await storage.deleteOpenHouse(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete open house" });
    }
  });

  app.get("/api/open-houses/:id/visitors", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const oh = await storage.getOpenHouse(Number(req.params.id));
      if (!oh || oh.agent_id !== req.user.id) return res.status(403).json({ error: "Not authorized" });
      const visitors = await storage.getOpenHouseVisitors(Number(req.params.id));
      res.json(visitors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch visitors" });
    }
  });

  app.get("/api/open-house/:slug", async (req, res) => {
    try {
      const openHouse = await storage.getOpenHouseBySlug(req.params.slug);
      if (!openHouse) return res.status(404).json({ error: "Open house not found" });
      res.json({
        id: openHouse.id, address: openHouse.address, city: openHouse.city, state: openHouse.state,
        date: openHouse.date, startTime: openHouse.start_time, endTime: openHouse.end_time,
        agentName: `${openHouse.agent_first_name || ''} ${openHouse.agent_last_name || ''}`.trim(),
        status: openHouse.status,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch open house" });
    }
  });

  app.post("/api/open-house/:slug/sign-in", async (req, res) => {
    try {
      const openHouse = await storage.getOpenHouseBySlug(req.params.slug);
      if (!openHouse) return res.status(404).json({ error: "Open house not found" });

      const { firstName, lastName, email, phone, interestedLevel, notes, preApproved, workingWithAgent, visitorRole, brokerageName } = req.body;
      if (!firstName) return res.status(400).json({ error: "First name is required" });

      let role = ['unrepresented_buyer', 'represented_buyer', 'agent'].includes(visitorRole) ? visitorRole : 'unrepresented_buyer';
      if (role === 'unrepresented_buyer' && workingWithAgent) role = 'represented_buyer';
      const isWorkingWithAgent = role === 'represented_buyer' || workingWithAgent;

      const visitor = await storage.createOpenHouseVisitor({
        openHouseId: openHouse.id, firstName, lastName, email, phone, interestedLevel, notes,
        preApproved, workingWithAgent: isWorkingWithAgent, visitorRole: role,
        brokerageName: role === 'agent' ? (brokerageName || null) : null,
      });

      if (role === 'unrepresented_buyer' && (email || phone)) {
        try {
          await storage.createLead({
            firstName, lastName: lastName || '', email: email || '', phone: phone || '',
            zipCode: openHouse.zip_code || '', type: 'buyer', message: `Open house visitor at ${openHouse.address}`,
            status: 'new', assignedAgentId: openHouse.agent_id,
          });
        } catch (leadErr) {
          console.error("Failed to create lead from open house visitor:", leadErr);
        }
      }

      res.json({ success: true, message: "Thank you for visiting!" });
    } catch (error) {
      res.status(500).json({ error: "Failed to sign in" });
    }
  });

  // Client Reminders
  app.get("/api/reminders", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const reminders = await storage.getClientRemindersByAgent(req.user.id);
      res.json(reminders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reminders" });
    }
  });

  app.post("/api/reminders", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const { clientId, type, title, message, reminderDate, recurring, channels } = req.body;
      if (!clientId || !title || !reminderDate) return res.status(400).json({ error: "Client, title, and date are required" });
      const client = await storage.getClient(clientId);
      if (!client || client.agentId !== req.user.id) return res.status(403).json({ error: "Client not found or not authorized" });
      const reminder = await storage.createClientReminder({
        agentId: req.user.id, clientId, type, title, message, reminderDate, recurring, channels,
      });
      res.json(reminder);
    } catch (error) {
      res.status(500).json({ error: "Failed to create reminder" });
    }
  });

  app.patch("/api/reminders/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const reminder = await storage.getClientReminder(Number(req.params.id));
      if (!reminder || reminder.agent_id !== req.user.id) return res.status(403).json({ error: "Not authorized" });
      const updated = await storage.updateClientReminder(Number(req.params.id), req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update reminder" });
    }
  });

  app.delete("/api/reminders/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "agent" && req.user.role !== "broker")) return res.sendStatus(401);
    try {
      const reminder = await storage.getClientReminder(Number(req.params.id));
      if (!reminder || reminder.agent_id !== req.user.id) return res.status(403).json({ error: "Not authorized" });
      await storage.deleteClientReminder(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete reminder" });
    }
  });

  app.get("/api/notifications/list", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Number(req.query.offset) || 0;
      const notifications = await storage.getNotificationsByUser(req.user.id, limit, offset);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.get("/api/notifications/unread-count", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const count = await storage.getUnreadNotificationCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const updated = await storage.markNotificationRead(Number(req.params.id), req.user.id);
      if (!updated) return res.status(404).json({ error: 'Notification not found' });
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification read:', error);
      res.status(500).json({ error: 'Failed to mark notification read' });
    }
  });

  app.patch("/api/notifications/read-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      await storage.markAllNotificationsRead(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications read' });
    }
  });

  app.get("/api/client-notification-preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== 'client') return res.status(403).json({ error: 'Client role required' });
    try {
      const prefs = await storage.getClientNotificationPreferences(req.user.id);
      res.json(prefs);
    } catch (error) {
      console.error('Error fetching client notification preferences:', error);
      res.status(500).json({ error: 'Failed to fetch preferences' });
    }
  });

  app.get("/api/transactions/:id/client-notification-status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!['agent', 'broker'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    try {
      const transactionId = parseInt(req.params.id);
      if (isNaN(transactionId)) return res.status(400).json({ error: 'Invalid transaction ID' });
      const { allowed } = await verifyTransactionAccess(transactionId, req.user.id, req.user.role);
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const allClientUsers = await storage.getClientUserIdsForTransaction(transactionId);
      const seenIds = new Set<number>();
      const clientUsers = allClientUsers.filter(cu => {
        if (seenIds.has(cu.userId)) return false;
        seenIds.add(cu.userId);
        return true;
      });
      const statuses = await Promise.all(
        clientUsers.map(async (cu) => {
          const prefs = await storage.getClientNotificationPreferences(cu.userId);
          return {
            firstName: cu.firstName,
            notificationsEnabled: prefs.transactionUpdates,
            channels: prefs.transactionUpdates ? {
              inApp: prefs.channelInApp,
              email: prefs.channelEmail,
              sms: prefs.channelSms,
              push: prefs.channelPush,
            } : null,
          };
        })
      );
      res.json({ clients: statuses });
    } catch (error) {
      console.error('Error fetching client notification status:', error);
      res.status(500).json({ error: 'Failed to fetch status' });
    }
  });

  app.put("/api/client-notification-preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== 'client') return res.status(403).json({ error: 'Client role required' });
    try {
      const schema = z.object({
        transactionUpdates: z.boolean(),
        channelEmail: z.boolean(),
        channelSms: z.boolean(),
        channelPush: z.boolean(),
        channelInApp: z.boolean(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid preferences", details: parsed.error.flatten() });
      }
      const prefs = await storage.upsertClientNotificationPreferences(req.user.id, parsed.data);
      res.json(prefs);
    } catch (error) {
      console.error('Error updating client notification preferences:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  const ALLOWED_SCAN_MIMES = new Set([
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif",
    "application/pdf",
  ]);

  const MAGIC_BYTES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
    { mime: "image/jpeg", bytes: [0xFF, 0xD8, 0xFF] },
    { mime: "image/png", bytes: [0x89, 0x50, 0x4E, 0x47] },
    { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
    { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  ];

  function validateFileContent(buffer: Buffer, claimedMime: string): boolean {
    if (buffer.length < 8) return false;
    const normalizedMime = claimedMime === "image/jpg" ? "image/jpeg" : claimedMime;
    if (normalizedMime === "image/heic" || normalizedMime === "image/heif") return true;
    const match = MAGIC_BYTES.find(m => {
      const offset = m.offset ?? 0;
      return m.bytes.every((b, i) => buffer[offset + i] === b);
    });
    if (!match) return false;
    if (normalizedMime === "image/webp") return match.mime === "image/webp";
    if (normalizedMime.startsWith("image/")) return match.mime.startsWith("image/");
    return match.mime === normalizedMime;
  }

  function sanitizeFileName(name: string): string {
    return name
      .replace(/[^\w\s\-_.()]/g, '')
      .replace(/\.{2,}/g, '.')
      .replace(/\//g, '')
      .replace(/\\/g, '')
      .trim()
      .slice(0, 200) || 'document';
  }

  app.post("/api/scanned-documents", upload.single("file"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file uploaded" });
      if (file.size > 10 * 1024 * 1024) return res.status(400).json({ error: "File size exceeds 10MB limit" });

      if (!ALLOWED_SCAN_MIMES.has(file.mimetype)) {
        return res.status(400).json({ error: "File type not allowed. Please upload PDF, JPG, PNG, or WebP files only." });
      }

      if (!validateFileContent(file.buffer, file.mimetype)) {
        return res.status(400).json({ error: "File content does not match its type. The file may be corrupted or invalid." });
      }

      const { name, category, transactionId, clientId, notes } = req.body;
      if (!name) return res.status(400).json({ error: "Document name is required" });

      const safeName = sanitizeFileName(name);

      const fileData = file.buffer.toString("base64");
      const doc = await storage.createScannedDocument({
        userId: req.user.id,
        name: safeName,
        category: category || "other",
        fileData,
        mimeType: file.mimetype,
        fileSize: file.size,
        transactionId: transactionId && transactionId !== 'none' ? parseInt(transactionId) || null : null,
        clientId: clientId && clientId !== 'none' ? parseInt(clientId) || null : null,
        notes: notes || null,
      });

      console.log(`[Audit] Document uploaded: id=${doc.id}, user=${req.user.id}, type=${file.mimetype}, size=${file.size}`);

      const { fileData: _, ...metadata } = doc;
      res.json(metadata);
    } catch (error) {
      console.error("Error uploading scanned document:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  app.get("/api/scanned-documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const transactionId = req.query.transactionId ? parseInt(req.query.transactionId as string) : undefined;
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
      const docs = await storage.getScannedDocuments(req.user.id, transactionId, clientId);
      const metadata = docs.map(({ fileData, ...rest }) => {
        const { file_data, ...clean } = rest as any;
        return clean;
      });
      res.json(metadata);
    } catch (error) {
      console.error("Error fetching scanned documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/scanned-documents/:id/file", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const doc = await storage.getScannedDocument(parseInt(req.params.id));
      if (!doc) return res.status(404).json({ error: "Document not found" });
      if (doc.userId !== req.user.id) return res.sendStatus(403);

      const buffer = Buffer.from(doc.fileData, "base64");
      const safeName = sanitizeFileName(doc.name).replace(/[^\w\-_.]/g, '_');
      res.setHeader("Content-Type", doc.mimeType);
      res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Content-Security-Policy", "default-src 'none'");
      res.send(buffer);
    } catch (error) {
      console.error("Error serving scanned document:", error);
      res.status(500).json({ error: "Failed to serve document" });
    }
  });

  app.delete("/api/scanned-documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const doc = await storage.getScannedDocument(parseInt(req.params.id));
      if (!doc) return res.status(404).json({ error: "Document not found" });
      if (doc.userId !== req.user.id) return res.sendStatus(403);

      await storage.deleteScannedDocument(doc.id);
      console.log(`[Audit] Document deleted: id=${doc.id}, user=${req.user.id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting scanned document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  app.post("/api/scanned-documents/:id/email", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const doc = await storage.getScannedDocument(parseInt(req.params.id));
      if (!doc) return res.status(404).json({ error: "Document not found" });
      if (doc.userId !== req.user.id) return res.sendStatus(403);

      const { to, subject, body } = req.body;
      if (!to || !subject) return res.status(400).json({ error: "Recipient and subject are required" });

      const buffer = Buffer.from(doc.fileData, "base64");
      const ext = doc.mimeType.includes("pdf") ? ".pdf" : doc.mimeType.includes("png") ? ".png" : doc.mimeType.includes("jpeg") || doc.mimeType.includes("jpg") ? ".jpg" : "";
      const safeName = sanitizeFileName(doc.name);
      const attachment: EmailAttachment = {
        filename: `${safeName}${ext}`,
        mimeType: doc.mimeType,
        content: buffer,
      };

      const result = await sendGmailEmail(req.user.id, to, subject, body || "", undefined, [attachment]);
      if (result.success) {
        console.log(`[Audit] Document emailed: id=${doc.id}, user=${req.user.id}, to=${to}`);
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(500).json({ error: result.error || "Failed to send email" });
      }
    } catch (error) {
      console.error("Error emailing scanned document:", error);
      res.status(500).json({ error: "Failed to email document" });
    }
  });

  // ============ FORM TEMPLATES / FORMS LIBRARY ============

  app.get("/api/form-templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const result: any = await db.execute(sql`
        SELECT id, user_id, title, description, category, form_state, file_name, mime_type, file_size,
               field_positions, is_shared, usage_count, created_at, updated_at
        FROM form_templates
        WHERE user_id = ${req.user.id}
           OR (is_shared = true AND user_id IN (
             SELECT au.owner_id FROM authorized_users au WHERE au.authorized_user_id = ${req.user.id} AND au.status = 'active'
             UNION
             SELECT u.id FROM users u WHERE u.role = 'broker' AND u.id IN (
               SELECT au2.owner_id FROM authorized_users au2 WHERE au2.authorized_user_id = ${req.user.id} AND au2.status = 'active'
             )
           ))
        ORDER BY updated_at DESC
      `);
      const templates = (result.rows || result).map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        title: t.title,
        description: t.description,
        category: t.category,
        formState: t.form_state,
        fileName: t.file_name,
        mimeType: t.mime_type,
        fileSize: t.file_size,
        fieldPositions: t.field_positions,
        isShared: t.is_shared,
        usageCount: t.usage_count,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        isOwner: t.user_id === req.user.id,
      }));
      res.json(templates);
    } catch (error) {
      console.error("Error fetching form templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.post("/api/form-templates", upload.single("file"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      if (!req.file) return res.status(400).json({ error: "PDF file is required" });
      if (req.file.mimetype !== "application/pdf") return res.status(400).json({ error: "Only PDF files are allowed" });

      const { title, description, category, formState, isShared } = req.body;
      if (!title) return res.status(400).json({ error: "Title is required" });

      const fileData = req.file.buffer.toString("base64");
      const result: any = await db.execute(sql`
        INSERT INTO form_templates (user_id, title, description, category, form_state, file_name, file_data, mime_type, file_size, is_shared, created_at, updated_at)
        VALUES (${req.user.id}, ${title}, ${description || null}, ${category || 'other'}, ${formState || null},
                ${req.file.originalname}, ${fileData}, ${req.file.mimetype}, ${req.file.size},
                ${(isShared === 'true' || isShared === true) && req.user.role === 'broker'}, NOW(), NOW())
        RETURNING id, user_id, title, description, category, form_state, file_name, mime_type, file_size, is_shared, usage_count, created_at, updated_at
      `);
      const template = (result.rows || result)[0];
      console.log(`[Forms] User ${req.user.id} created template "${title}" (id: ${template.id})`);
      res.json(template);
    } catch (error) {
      console.error("Error creating form template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  async function canAccessTemplate(userId: number, template: any): Promise<boolean> {
    if (template.user_id === userId) return true;
    if (!template.is_shared) return false;
    const teamCheck: any = await db.execute(sql`
      SELECT 1 FROM authorized_users
      WHERE authorized_user_id = ${userId} AND owner_id = ${template.user_id} AND status = 'active'
      LIMIT 1
    `);
    return (teamCheck.rows || teamCheck).length > 0;
  }

  app.get("/api/form-templates/:id/file", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const result: any = await db.execute(sql`
        SELECT file_data, mime_type, file_name, user_id, is_shared FROM form_templates WHERE id = ${id}
      `);
      const template = (result.rows || result)[0];
      if (!template) return res.status(404).json({ error: "Template not found" });
      if (!(await canAccessTemplate(req.user.id, template))) return res.sendStatus(403);

      const buffer = Buffer.from(template.file_data, "base64");
      res.setHeader("Content-Type", template.mime_type);
      res.setHeader("Content-Disposition", `inline; filename="${template.file_name}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error serving template file:", error);
      res.status(500).json({ error: "Failed to serve file" });
    }
  });

  app.patch("/api/form-templates/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const ownerCheck: any = await db.execute(sql`SELECT user_id FROM form_templates WHERE id = ${id}`);
      const template = (ownerCheck.rows || ownerCheck)[0];
      if (!template) return res.status(404).json({ error: "Template not found" });
      if (template.user_id !== req.user.id) return res.sendStatus(403);

      const { title, description, category, formState, isShared, fieldPositions } = req.body;
      const resolvedIsShared = isShared !== undefined && req.user.role === 'broker' ? isShared : null;
      const result: any = await db.execute(sql`
        UPDATE form_templates SET
          title = COALESCE(${title || null}, title),
          description = COALESCE(${description !== undefined ? description : null}, description),
          category = COALESCE(${category || null}, category),
          form_state = COALESCE(${formState || null}, form_state),
          is_shared = COALESCE(${resolvedIsShared}, is_shared),
          field_positions = COALESCE(${fieldPositions ? JSON.stringify(fieldPositions) : null}::json, field_positions),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, title, description, category, form_state, is_shared, usage_count, updated_at
      `);
      res.json((result.rows || result)[0]);
    } catch (error) {
      console.error("Error updating form template:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/form-templates/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const ownerCheck: any = await db.execute(sql`SELECT user_id FROM form_templates WHERE id = ${id}`);
      const template = (ownerCheck.rows || ownerCheck)[0];
      if (!template) return res.status(404).json({ error: "Template not found" });
      if (template.user_id !== req.user.id) return res.sendStatus(403);

      await db.execute(sql`DELETE FROM form_templates WHERE id = ${id}`);
      console.log(`[Forms] User ${req.user.id} deleted template id: ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting form template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  app.post("/api/form-templates/:id/use", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      const result: any = await db.execute(sql`
        SELECT id, file_data, file_name, title, user_id, is_shared, field_positions FROM form_templates WHERE id = ${id}
      `);
      const template = (result.rows || result)[0];
      if (!template) return res.status(404).json({ error: "Template not found" });
      if (!(await canAccessTemplate(req.user.id, template))) return res.sendStatus(403);

      await db.execute(sql`UPDATE form_templates SET usage_count = usage_count + 1 WHERE id = ${id}`);

      const response: any = {
        templateId: template.id,
        title: template.title,
        fileName: template.file_name,
        documentBase64: template.file_data,
        fieldPositions: template.field_positions,
      };

      const { transactionId } = req.body || {};
      if (transactionId) {
        const { allowed } = await verifyTransactionAccess(transactionId, req.user.id, req.user.role);
        if (!allowed) return res.status(403).json({ error: "Not authorized for this transaction" });
        try {
          const txResult: any = await db.execute(sql`
            SELECT t.id, t.property_address, t.buyer_name, t.seller_name, t.type,
                   u.first_name as agent_first, u.last_name as agent_last, u.email as agent_email
            FROM transactions t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.id = ${transactionId}
          `);
          const tx = (txResult.rows || txResult)[0];
          if (tx) {
            const recipients: any[] = [];
            if (tx.buyer_name) {
              const parts = tx.buyer_name.trim().split(/\s+/);
              recipients.push({ role: "buyer", firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "" });
            }
            if (tx.seller_name) {
              const parts = tx.seller_name.trim().split(/\s+/);
              recipients.push({ role: "seller", firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "" });
            }
            if (tx.agent_first || tx.agent_last) {
              recipients.push({ role: "agent", firstName: tx.agent_first || "", lastName: tx.agent_last || "", email: tx.agent_email });
            }
            const clientsResult: any = await db.execute(sql`
              SELECT c.first_name, c.last_name, c.email, c.type as client_type
              FROM clients c WHERE c.transaction_id = ${transactionId}
            `);
            const clients = clientsResult.rows || clientsResult;
            for (const c of clients) {
              const existingRole = c.client_type === "buyer" ? "buyer" : c.client_type === "seller" ? "seller" : "other";
              if (!recipients.find(r => r.role === existingRole && r.firstName === c.first_name)) {
                recipients.push({ role: existingRole, firstName: c.first_name || "", lastName: c.last_name || "", email: c.email });
              }
            }
            response.transactionRecipients = recipients;
            response.transactionAddress = tx.property_address;
          }
        } catch (e) {
          console.error("Error fetching transaction data for template:", e);
        }
      }

      res.json(response);
    } catch (error) {
      console.error("Error using form template:", error);
      res.status(500).json({ error: "Failed to use template" });
    }
  });

  // ============ API KEY MANAGEMENT ============

  app.post("/api/api-keys", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { name, permissions } = req.body;
      if (!name) return res.status(400).json({ error: "Key name is required" });

      const rawKey = generateApiKey();
      const keyHash = hashApiKey(rawKey);
      const prefix = rawKey.substring(0, 10);

      const apiKey = await storage.createApiKey({
        userId: req.user.id,
        name,
        keyHash,
        prefix,
        permissions: permissions || ["read", "write"],
        isActive: true,
      });

      res.json({ ...apiKey, key: rawKey });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ error: "Failed to create API key" });
    }
  });

  app.get("/api/api-keys", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const keys = await storage.getApiKeys(req.user.id);
      const safeKeys = keys.map(({ keyHash, ...rest }) => rest);
      res.json(safeKeys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  });

  app.delete("/api/api-keys/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      await storage.deleteApiKey(parseInt(req.params.id), req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ error: "Failed to delete API key" });
    }
  });

  // ============ WEBHOOK MANAGEMENT ============

  app.post("/api/webhooks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { url, event } = req.body;
      if (!url || !event) return res.status(400).json({ error: "URL and event are required" });

      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") return res.status(400).json({ error: "Webhook URL must use HTTPS" });
        if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "0.0.0.0") {
          return res.status(400).json({ error: "Webhook URL cannot target localhost" });
        }
      } catch {
        return res.status(400).json({ error: "Invalid webhook URL" });
      }

      const validEvents = ["new_lead", "lead_updated", "transaction_created", "transaction_updated", "transaction_closed", "client_created", "client_updated", "document_uploaded", "message_received"];
      if (!validEvents.includes(event)) return res.status(400).json({ error: "Invalid event type" });

      const secret = randomUUID();
      const webhook = await storage.createWebhook({
        userId: req.user.id,
        url,
        event,
        secret,
        isActive: true,
      });

      res.json(webhook);
    } catch (error) {
      console.error("Error creating webhook:", error);
      res.status(500).json({ error: "Failed to create webhook" });
    }
  });

  app.get("/api/webhooks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const webhooksList = await storage.getWebhooks(req.user.id);
      res.json(webhooksList);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  app.delete("/api/webhooks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      await storage.deleteWebhook(parseInt(req.params.id), req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting webhook:", error);
      res.status(500).json({ error: "Failed to delete webhook" });
    }
  });

  // ============ PUBLIC API (API-KEY AUTHENTICATED) ============

  app.get("/api/v1/leads", apiKeyAuthMiddleware, async (req, res) => {
    try {
      const userId = (req as any).apiKeyUserId;
      const leads = await db.execute(sql`SELECT * FROM leads WHERE agent_id = ${userId} ORDER BY created_at DESC LIMIT 100`);
      res.json(leads.rows);
    } catch (error) {
      console.error("API v1 error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/v1/leads", apiKeyAuthMiddleware, async (req, res) => {
    try {
      const userId = (req as any).apiKeyUserId;
      const { firstName, lastName, email, phone, source, zipCode, notes } = req.body;
      if (!firstName || !lastName) return res.status(400).json({ error: "firstName and lastName are required" });

      const result = await db.execute(sql`
        INSERT INTO leads (first_name, last_name, email, phone, source, zip_code, notes, agent_id, status, created_at)
        VALUES (${firstName}, ${lastName}, ${email || null}, ${phone || null}, ${source || 'api'}, ${zipCode || null}, ${notes || null}, ${userId}, 'new', NOW())
        RETURNING *
      `);
      fireWebhook("new_lead", result.rows[0]);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("API v1 error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/v1/transactions", apiKeyAuthMiddleware, async (req, res) => {
    try {
      const userId = (req as any).apiKeyUserId;
      const transactions = await storage.getTransactionsByUser(userId);
      res.json(transactions);
    } catch (error) {
      console.error("API v1 error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/v1/transactions", apiKeyAuthMiddleware, async (req, res) => {
    try {
      const agentId = (req as any).apiKeyUserId;
      const data = req.body;
      const defaultStatus = (data.type === 'buy') ? 'qualified_buyer' : 'prospect';
      const transaction = await storage.createTransaction({ ...data, agentId, status: data.status || defaultStatus, participants: data.participants || [] });
      fireWebhook("transaction_created", transaction);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("API v1 error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/v1/clients", apiKeyAuthMiddleware, async (req, res) => {
    try {
      const agentId = (req as any).apiKeyUserId;
      const clientsList = await storage.getClientsByAgent(agentId);
      res.json(clientsList);
    } catch (error) {
      console.error("API v1 error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/v1/clients", apiKeyAuthMiddleware, async (req, res) => {
    try {
      const agentId = (req as any).apiKeyUserId;
      const data = req.body;
      const client = await storage.createClient({ ...data, agentId });
      fireWebhook("client_created", client);
      res.status(201).json(client);
    } catch (error) {
      console.error("API v1 error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/v1/clients/:id", apiKeyAuthMiddleware, async (req, res) => {
    try {
      const agentId = (req as any).apiKeyUserId;
      const clientId = parseInt(req.params.id);
      const existing = await storage.getClient(clientId);
      if (!existing || existing.agentId !== agentId) return res.status(404).json({ error: "Client not found" });

      const updated = await storage.updateClient(clientId, req.body);
      fireWebhook("client_updated", updated);
      res.json(updated);
    } catch (error) {
      console.error("API v1 error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/v1/documents", apiKeyAuthMiddleware, async (req, res) => {
    try {
      const userId = (req as any).apiKeyUserId;
      const docs = await storage.getAllDocumentsByUser(userId);
      res.json(docs);
    } catch (error) {
      console.error("API v1 error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Simple ping endpoint for health checks
  app.get("/ping", (req, res) => {
    res.json({ 
      timestamp: Date.now(),
      status: "ok" 
    });
  });

  // ============ Badge Counts ============
  app.get("/api/badge-counts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = req.user.id;
      const role = req.user.role;
      let unreadMessages = 0;
      let pendingDocuments = 0;
      let upcomingDeadlines = 0;
      let overdueTasks = 0;
      let newLeads = 0;

      const msgResult = await db.execute(sql`SELECT COUNT(*) as count FROM private_messages WHERE recipient_id = ${userId} AND read = false`);
      unreadMessages = Number(msgResult.rows[0]?.count || 0);

      if (role === "agent" || role === "broker") {
        const docResult = await db.execute(sql`SELECT COUNT(*) as count FROM documents d JOIN transactions t ON d.transaction_id = t.id WHERE t.agent_id = ${userId} AND d.status IN ('pending', 'waiting_signatures')`);
        pendingDocuments = Number(docResult.rows[0]?.count || 0);

        const deadlineResult = await db.execute(sql`SELECT COUNT(*) as count FROM transactions WHERE agent_id = ${userId} AND status = 'active' AND closing_date IS NOT NULL AND closing_date <= NOW() + INTERVAL '7 days' AND closing_date > NOW()`);
        upcomingDeadlines = Number(deadlineResult.rows[0]?.count || 0);

        const leadResult = await db.execute(sql`SELECT COUNT(*) as count FROM leads WHERE assigned_agent_id = ${userId} AND status = 'new'`);
        newLeads = Number(leadResult.rows[0]?.count || 0);
      }

      const taskResult = await db.execute(sql`SELECT COUNT(*) as count FROM tasks WHERE (created_by = ${userId} OR assigned_to = ${userId}) AND status != 'completed' AND due_date IS NOT NULL AND due_date < NOW()`);
      overdueTasks = Number(taskResult.rows[0]?.count || 0);

      res.json({ unreadMessages, pendingDocuments, upcomingDeadlines, overdueTasks, newLeads });
    } catch (error) {
      console.error("Badge counts error:", error);
      res.status(500).json({ error: "Failed to fetch badge counts" });
    }
  });

  // ============ Export Clients ============
  app.get("/api/clients/export", exportLimiter, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const clients = await storage.getClients(req.user.id);
      const format = (req.query.format as string) || "csv";

      const rows = clients.map(c => ({
        "First Name": c.firstName || "",
        "Last Name": c.lastName || "",
        "Email": c.email || "",
        "Phone": c.phone || "",
        "Mobile Phone": c.mobilePhone || "",
        "Address": c.address || "",
        "Street": c.street || "",
        "City": c.city || "",
        "Zip Code": c.zipCode || "",
        "Type": Array.isArray(c.type) ? c.type.join(", ") : (c.type || ""),
        "Status": c.status || "",
        "Source": c.source || "",
        "Labels": Array.isArray(c.labels) ? c.labels.join(", ") : "",
        "Birthday": c.birthday || "",
        "Anniversary": c.anniversary || "",
        "Notes": c.notes || "",
      }));

      if (format === "xlsx") {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="clients_export.xlsx"`);
        res.send(buffer);
      } else {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="clients_export.csv"`);
        res.send(csv);
      }
    } catch (error) {
      console.error("Export clients error:", error);
      res.status(500).json({ error: "Failed to export clients" });
    }
  });

  // ============ Tasks CRUD ============
  app.get("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = req.user.id;
      const result = await db.execute(sql`SELECT * FROM tasks WHERE created_by = ${userId} OR assigned_to = ${userId} ORDER BY CASE WHEN status = 'completed' THEN 1 ELSE 0 END, CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, due_date ASC NULLS LAST`);
      res.json(result.rows);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate', 'transactionId', 'assignedTo'];
      const data: Record<string, any> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      if (!data.title) return res.status(400).json({ error: "Title is required" });

      if (data.transactionId) {
        const { allowed, permissionLevel } = await verifyTransactionAccess(Number(data.transactionId), req.user.id, req.user.role);
        if (!allowed || permissionLevel !== "full") return res.status(403).json({ error: "Not authorized for this transaction" });
      }

      const result = await db.execute(sql`INSERT INTO tasks (title, description, status, priority, due_date, transaction_id, assigned_to, created_by) VALUES (${data.title}, ${data.description || null}, ${data.status || 'todo'}, ${data.priority || 'medium'}, ${data.dueDate ? new Date(data.dueDate) : null}, ${data.transactionId ? Number(data.transactionId) : null}, ${data.assignedTo ? Number(data.assignedTo) : null}, ${req.user.id}) RETURNING *`);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const taskId = Number(req.params.id);
      const existing = await db.execute(sql`SELECT * FROM tasks WHERE id = ${taskId} LIMIT 1`);
      if (existing.rows.length === 0) return res.status(404).json({ error: "Task not found" });
      const task = existing.rows[0] as any;
      if (task.created_by !== req.user.id && task.assigned_to !== req.user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate', 'assignedTo'];
      const updates: string[] = [];
      const values: any[] = [];
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updates.push(`${dbKey} = $${values.length + 1}`);
          values.push(key === 'dueDate' && req.body[key] ? new Date(req.body[key]) : req.body[key]);
        }
      }
      if (req.body.status === 'completed') {
        updates.push(`completed_at = $${values.length + 1}`);
        values.push(new Date());
      } else if (req.body.status && req.body.status !== 'completed') {
        updates.push(`completed_at = NULL`);
      }
      updates.push(`updated_at = $${values.length + 1}`);
      values.push(new Date());

      if (updates.length === 0) return res.json(task);

      const setClauses = updates.join(', ');
      values.push(taskId);
      const result = await db.execute(sql.raw(`UPDATE tasks SET ${setClauses} WHERE id = $${values.length} RETURNING *`, values));
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const taskId = Number(req.params.id);
      const existing = await db.execute(sql`SELECT created_by FROM tasks WHERE id = ${taskId} LIMIT 1`);
      if (existing.rows.length === 0) return res.status(404).json({ error: "Task not found" });
      if ((existing.rows[0] as any).created_by !== req.user.id) {
        return res.status(403).json({ error: "Only the task creator can delete it" });
      }
      await db.execute(sql`DELETE FROM tasks WHERE id = ${taskId}`);
      res.sendStatus(200);
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // ============ Sponsored Ads ============
  app.get("/api/ads/mine", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const result = await db.execute(sql`SELECT * FROM sponsored_ads WHERE user_id = ${req.user.id} ORDER BY created_at DESC`);
      res.json(result.rows);
    } catch (error) {
      console.error("Get my ads error:", error);
      res.status(500).json({ error: "Failed to fetch ads" });
    }
  });

  app.post("/api/ads", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!["agent", "vendor", "lender", "broker"].includes(req.user.role)) return res.sendStatus(403);
    try {
      const allowed = ['type', 'title', 'description', 'imageUrl', 'targetUrl', 'category', 'zipCodes', 'budgetCents', 'startDate', 'endDate'];
      const data: Record<string, any> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      if (!data.title) return res.status(400).json({ error: "Title is required" });
      if (data.targetUrl && !/^https?:\/\/.+/.test(data.targetUrl)) return res.status(400).json({ error: "Invalid target URL" });
      if (data.imageUrl && typeof data.imageUrl === 'string') {
        if (!data.imageUrl.startsWith('data:image/')) return res.status(400).json({ error: "Image must be a valid data URL" });
        if (data.imageUrl.length > 7 * 1024 * 1024) return res.status(400).json({ error: "Image too large (max 5MB)" });
      }

      const result = await db.execute(sql`INSERT INTO sponsored_ads (user_id, type, title, description, image_url, target_url, category, zip_codes, budget_cents, start_date, end_date, status) VALUES (${req.user.id}, ${data.type || 'marketplace'}, ${data.title}, ${data.description || null}, ${data.imageUrl || null}, ${data.targetUrl || null}, ${data.category || null}, ${data.zipCodes || []}, ${data.budgetCents || 0}, ${data.startDate ? new Date(data.startDate) : null}, ${data.endDate ? new Date(data.endDate) : null}, 'pending') RETURNING *`);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Create ad error:", error);
      res.status(500).json({ error: "Failed to create ad" });
    }
  });

  app.patch("/api/ads/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const adId = Number(req.params.id);
      const existing = await db.execute(sql`SELECT * FROM sponsored_ads WHERE id = ${adId} LIMIT 1`);
      if (existing.rows.length === 0) return res.status(404).json({ error: "Ad not found" });
      if ((existing.rows[0] as any).user_id !== req.user.id) return res.status(403).json({ error: "Not authorized" });

      const allowed = ['title', 'description', 'imageUrl', 'targetUrl', 'category', 'zipCodes', 'budgetCents', 'startDate', 'endDate', 'status'];
      const data: Record<string, any> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      if (data.status && !['draft', 'paused'].includes(data.status)) {
        delete data.status;
      }
      if (data.imageUrl && typeof data.imageUrl === 'string') {
        if (!data.imageUrl.startsWith('data:image/')) return res.status(400).json({ error: "Image must be a valid data URL" });
        if (data.imageUrl.length > 7 * 1024 * 1024) return res.status(400).json({ error: "Image too large (max 5MB)" });
      }

      const ad = existing.rows[0] as any;
      if (data.status === 'paused' && ad.stripe_subscription_id) {
        try {
          const { getUncachableStripeClient } = await import('./stripeClient');
          const stripe = await getUncachableStripeClient();
          await stripe.subscriptions.update(ad.stripe_subscription_id, { pause_collection: { behavior: 'void' } });
        } catch (stripeErr: any) {
          console.error("Stripe pause on user ad pause:", stripeErr);
        }
      }

      const result = await db.execute(sql`UPDATE sponsored_ads SET title = COALESCE(${data.title}, title), description = COALESCE(${data.description}, description), image_url = COALESCE(${data.imageUrl}, image_url), target_url = COALESCE(${data.targetUrl}, target_url), category = COALESCE(${data.category}, category), budget_cents = COALESCE(${data.budgetCents}, budget_cents), status = COALESCE(${data.status}, status), updated_at = NOW() WHERE id = ${adId} RETURNING *`);
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Update ad error:", error);
      res.status(500).json({ error: "Failed to update ad" });
    }
  });

  app.delete("/api/ads/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const adId = Number(req.params.id);
      const existing = await db.execute(sql`SELECT * FROM sponsored_ads WHERE id = ${adId} LIMIT 1`);
      if (existing.rows.length === 0) return res.status(404).json({ error: "Ad not found" });
      const ad = existing.rows[0] as any;
      if (ad.user_id !== req.user.id) return res.status(403).json({ error: "Not authorized" });

      if (ad.stripe_subscription_id) {
        try {
          const { getUncachableStripeClient } = await import('./stripeClient');
          const stripe = await getUncachableStripeClient();
          await stripe.subscriptions.cancel(ad.stripe_subscription_id);
        } catch (stripeErr: any) {
          console.error("Stripe cancel on ad delete:", stripeErr);
        }
      }

      await db.execute(sql`DELETE FROM sponsored_ads WHERE id = ${adId}`);
      res.sendStatus(200);
    } catch (error) {
      console.error("Delete ad error:", error);
      res.status(500).json({ error: "Failed to delete ad" });
    }
  });

  app.get("/api/ads/active", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const zipCode = req.query.zipCode as string | undefined;
      let result;
      if (category && zipCode) {
        result = await db.execute(sql`SELECT id, type, title, description, image_url, target_url, category, user_id FROM sponsored_ads WHERE status = 'active' AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW()) AND (category = ${category} OR category IS NULL) AND (${zipCode} = ANY(zip_codes) OR zip_codes = '{}') ORDER BY budget_cents DESC LIMIT 5`);
      } else if (category) {
        result = await db.execute(sql`SELECT id, type, title, description, image_url, target_url, category, user_id FROM sponsored_ads WHERE status = 'active' AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW()) AND (category = ${category} OR category IS NULL) ORDER BY budget_cents DESC LIMIT 5`);
      } else {
        result = await db.execute(sql`SELECT id, type, title, description, image_url, target_url, category, user_id FROM sponsored_ads WHERE status = 'active' AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW()) ORDER BY budget_cents DESC LIMIT 5`);
      }
      res.json(result.rows);
    } catch (error) {
      console.error("Get active ads error:", error);
      res.status(500).json({ error: "Failed to fetch ads" });
    }
  });

  app.post("/api/ads/:id/click", async (req, res) => {
    try {
      const adId = Number(req.params.id);
      if (req.isAuthenticated()) {
        const ad = await db.execute(sql`SELECT user_id FROM sponsored_ads WHERE id = ${adId} LIMIT 1`);
        if (ad.rows.length > 0 && (ad.rows[0] as any).user_id === req.user!.id) {
          return res.json({ tracked: false });
        }
      }
      await db.execute(sql`UPDATE sponsored_ads SET clicks = clicks + 1 WHERE id = ${adId}`);
      res.json({ tracked: true });
    } catch (error) {
      res.json({ tracked: false });
    }
  });

  app.post("/api/ads/:id/impression", async (req, res) => {
    try {
      await db.execute(sql`UPDATE sponsored_ads SET impressions = impressions + 1 WHERE id = ${Number(req.params.id)}`);
      res.json({ tracked: true });
    } catch (error) {
      res.json({ tracked: false });
    }
  });

  // ============ API Usage Dashboard ============
  app.get("/api/admin/api-usage", requireAdmin, async (req, res) => {
    try {
      const safeQuery = async (query: any, label: string, fallback: any = { rows: [] }) => {
        try { return await query; } catch (e) { console.error(`[API Usage] ${label} query failed:`, e); return fallback; }
      };

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [
        rentcastUsage,
        twilioSmsThisMonth, twilioSmsLastMonth, twilioSmsByDay,
        gmailThisMonth, gmailLastMonth, gmailByDay, gmailOpens,
        signnowActions, docusignActions,
        esignByDay,
        webhookCount,
        stripeEvents,
      ] = await Promise.all([
        safeQuery(db.execute(sql`SELECT call_count, reset_month, reset_year, updated_at FROM api_usage_counters WHERE id = 'rentcast'`), "rentcast"),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM communications WHERE type = 'sms' AND created_at >= DATE_TRUNC('month', NOW())`), "twilio-this-month"),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM communications WHERE type = 'sms' AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') AND created_at < DATE_TRUNC('month', NOW())`), "twilio-last-month"),
        safeQuery(db.execute(sql`
          SELECT DATE(created_at) as day, COUNT(*) as count FROM communications
          WHERE type = 'sms' AND created_at >= DATE_TRUNC('month', NOW())
          GROUP BY DATE(created_at) ORDER BY day
        `), "twilio-daily"),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM email_tracking WHERE sent_at >= DATE_TRUNC('month', NOW())`), "gmail-this-month"),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM email_tracking WHERE sent_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') AND sent_at < DATE_TRUNC('month', NOW())`), "gmail-last-month"),
        safeQuery(db.execute(sql`
          SELECT DATE(sent_at) as day, COUNT(*) as count FROM email_tracking
          WHERE sent_at >= DATE_TRUNC('month', NOW())
          GROUP BY DATE(sent_at) ORDER BY day
        `), "gmail-daily"),
        safeQuery(db.execute(sql`SELECT SUM(open_count) as total_opens, COUNT(CASE WHEN open_count > 0 THEN 1 END) as emails_opened FROM email_tracking WHERE sent_at >= DATE_TRUNC('month', NOW())`), "gmail-opens"),
        safeQuery(db.execute(sql`
          SELECT action, COUNT(*) as count FROM signnow_audit_log
          WHERE created_at >= DATE_TRUNC('month', NOW()) AND action NOT LIKE 'docusign_%'
          GROUP BY action ORDER BY count DESC
        `), "signnow-actions"),
        safeQuery(db.execute(sql`
          SELECT action, COUNT(*) as count FROM signnow_audit_log
          WHERE created_at >= DATE_TRUNC('month', NOW()) AND action LIKE 'docusign_%'
          GROUP BY action ORDER BY count DESC
        `), "docusign-actions"),
        safeQuery(db.execute(sql`
          SELECT DATE(created_at) as day,
            COUNT(CASE WHEN action NOT LIKE 'docusign_%' THEN 1 END) as signnow,
            COUNT(CASE WHEN action LIKE 'docusign_%' THEN 1 END) as docusign
          FROM signnow_audit_log
          WHERE created_at >= DATE_TRUNC('month', NOW())
          GROUP BY DATE(created_at) ORDER BY day
        `), "esign-daily"),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM webhooks`), "webhooks"),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM stripe.events`), "stripe-events"),
      ]);

      const rentcastRow = rentcastUsage.rows[0] as any;
      const rentcastCalls = (rentcastRow && (rentcastRow.reset_month === month && rentcastRow.reset_year === year))
        ? Number(rentcastRow.call_count) : 0;

      res.json({
        rentcast: {
          callsUsed: rentcastCalls,
          callsLimit: MONTHLY_LIMIT,
          lastUsed: rentcastRow?.updated_at || null,
          resetDate: new Date(year, month, 1).toISOString(),
        },
        twilio: {
          smsThisMonth: Number(twilioSmsThisMonth.rows[0]?.count || 0),
          smsLastMonth: Number(twilioSmsLastMonth.rows[0]?.count || 0),
          dailyUsage: twilioSmsByDay.rows,
        },
        gmail: {
          emailsThisMonth: Number(gmailThisMonth.rows[0]?.count || 0),
          emailsLastMonth: Number(gmailLastMonth.rows[0]?.count || 0),
          dailyUsage: gmailByDay.rows,
          totalOpens: Number(gmailOpens.rows[0]?.total_opens || 0),
          emailsOpened: Number(gmailOpens.rows[0]?.emails_opened || 0),
        },
        signnow: {
          actions: signnowActions.rows,
          totalThisMonth: signnowActions.rows.reduce((s: number, r: any) => s + Number(r.count), 0),
        },
        docusign: {
          actions: docusignActions.rows,
          totalThisMonth: docusignActions.rows.reduce((s: number, r: any) => s + Number(r.count), 0),
        },
        esignDaily: esignByDay.rows,
        webhooks: {
          totalConfigured: Number(webhookCount.rows[0]?.count || 0),
        },
        stripe: {
          totalEvents: Number(stripeEvents.rows[0]?.count || 0),
        },
        period: {
          month: now.toLocaleString('default', { month: 'long' }),
          year,
        },
      });
    } catch (error) {
      console.error("API usage error:", error);
      res.status(500).json({ error: "Failed to fetch API usage data" });
    }
  });

  // ============ Admin Dashboard ============
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const safeQuery = async (query: any, fallback: any = { rows: [] }) => {
        try { return await query; } catch (e) { console.error("Admin stats sub-query error:", e); return fallback; }
      };

      const [usersCount, txCount, activeAds, pendingVerifications, pendingReports, totalUsers, totalTx, totalClients, totalLeads, userGrowth, txGrowth, recentSignups, adStats, pendingAds] = await Promise.all([
        safeQuery(db.execute(sql`SELECT COUNT(*) as count, role FROM users GROUP BY role`)),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count, status FROM transactions GROUP BY status`)),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM sponsored_ads WHERE status = 'active'`)),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM users WHERE verification_status = 'pending'`)),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM listing_reports WHERE status = 'pending'`)),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM users`)),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM transactions`)),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM clients`)),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM leads`)),
        safeQuery(db.execute(sql`SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month, role, COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '12 months' GROUP BY month, role ORDER BY month`)),
        safeQuery(db.execute(sql`SELECT TO_CHAR(DATE_TRUNC('month', updated_at), 'YYYY-MM') as month, COUNT(*) as count FROM transactions WHERE updated_at >= NOW() - INTERVAL '12 months' GROUP BY month ORDER BY month`)),
        safeQuery(db.execute(sql`SELECT id, first_name, last_name, email, role, created_at FROM users ORDER BY id DESC LIMIT 10`)),
        safeQuery(db.execute(sql`SELECT SUM(impressions) as total_impressions, SUM(clicks) as total_clicks, SUM(budget_cents) as total_budget FROM sponsored_ads WHERE status = 'active'`)),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM sponsored_ads WHERE status = 'pending'`)),
      ]);

      const usersThisMonth = { rows: [{ count: 0 }] };
      const usersLastMonth = { rows: [{ count: 0 }] };
      const txThisMonth = await safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM transactions WHERE updated_at >= DATE_TRUNC('month', NOW())`));
      const txLastMonth = await safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM transactions WHERE updated_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') AND updated_at < DATE_TRUNC('month', NOW())`));

      const thisM = Number(usersThisMonth.rows[0]?.count || 0);
      const lastM = Number(usersLastMonth.rows[0]?.count || 0);
      const userChange = lastM > 0 ? Math.round(((thisM - lastM) / lastM) * 100) : (thisM > 0 ? 100 : 0);

      const txThisM = Number(txThisMonth.rows[0]?.count || 0);
      const txLastM = Number(txLastMonth.rows[0]?.count || 0);
      const txChange = txLastM > 0 ? Math.round(((txThisM - txLastM) / txLastM) * 100) : (txThisM > 0 ? 100 : 0);

      const [stripeSubs, stripeRevenue, stripeRecentInvoices, stripeSubsByStatus, stripeMonthlyRevenue, stripeCustomerCount, stripeMrr] = await Promise.all([
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM stripe.subscriptions WHERE status = 'active'`)),
        safeQuery(db.execute(sql`SELECT COALESCE(SUM(amount_paid), 0) as total FROM stripe.invoices WHERE status = 'paid'`)),
        safeQuery(db.execute(sql`SELECT id, customer_name, customer_email, amount_paid, currency, status, created, billing_reason FROM stripe.invoices ORDER BY created DESC LIMIT 10`)),
        safeQuery(db.execute(sql`SELECT status, COUNT(*) as count FROM stripe.subscriptions GROUP BY status`)),
        safeQuery(db.execute(sql`SELECT TO_CHAR(TO_TIMESTAMP(created), 'YYYY-MM') as month, SUM(amount_paid) as revenue, COUNT(*) as invoice_count FROM stripe.invoices WHERE status = 'paid' AND created >= EXTRACT(EPOCH FROM NOW() - INTERVAL '12 months')::integer GROUP BY month ORDER BY month`)),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM stripe.customers`)),
        safeQuery(db.execute(sql`SELECT COALESCE(SUM((items->0->>'amount')::bigint), 0) as mrr FROM stripe.subscriptions WHERE status = 'active'`), { rows: [{ mrr: 0 }] }),
      ]);

      const usersWithSubs = await safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM users WHERE stripe_subscription_id IS NOT NULL`));

      const adRevenue = await safeQuery(db.execute(sql`SELECT COALESCE(SUM(budget_cents), 0) as total FROM sponsored_ads WHERE status = 'active'`));

      const [agentLeadRev, lenderLeadRev, vendorLeadRev] = await Promise.all([
        safeQuery(db.execute(sql`SELECT COALESCE(SUM(monthly_rate), 0) as total FROM lead_zip_codes WHERE is_active = true`)),
        safeQuery(db.execute(sql`SELECT COALESCE(SUM(monthly_rate), 0) as total FROM lender_zip_codes WHERE is_active = true`)),
        safeQuery(db.execute(sql`SELECT COALESCE(SUM(monthly_rate), 0) as total FROM vendor_zip_codes WHERE is_active = true`)),
      ]);

      const [leadTotal, leadConverted, leadByStatus, leadBySource, leadAvgResponse, leadByZip,
             txByState, txByZip, activeClaimedZips] = await Promise.all([
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM leads`)),
        safeQuery(db.execute(sql`SELECT COUNT(*) as count FROM leads WHERE status = 'converted'`)),
        safeQuery(db.execute(sql`SELECT COALESCE(status, 'new') as status, COUNT(*) as count FROM leads GROUP BY status ORDER BY count DESC`)),
        safeQuery(db.execute(sql`SELECT COALESCE(source, 'direct') as source, COUNT(*) as count FROM leads GROUP BY source ORDER BY count DESC`)),
        safeQuery(db.execute(sql`SELECT AVG(EXTRACT(EPOCH FROM (responded_at - created_at))) as avg_seconds, COUNT(*) as responded_count FROM leads WHERE responded_at IS NOT NULL AND created_at IS NOT NULL`)),
        safeQuery(db.execute(sql`SELECT zip_code, COUNT(*) as count FROM leads WHERE zip_code IS NOT NULL GROUP BY zip_code ORDER BY count DESC LIMIT 10`)),
        safeQuery(db.execute(sql`SELECT state, COUNT(*) as count FROM transactions WHERE state IS NOT NULL AND state != '' GROUP BY state ORDER BY count DESC LIMIT 10`)),
        safeQuery(db.execute(sql`SELECT zip_code, COUNT(*) as count FROM transactions WHERE zip_code IS NOT NULL AND zip_code != '' GROUP BY zip_code ORDER BY count DESC LIMIT 10`)),
        safeQuery(db.execute(sql`
          SELECT zip_code, SUM(cnt) as total_claims FROM (
            SELECT zip_code, COUNT(*) as cnt FROM lead_zip_codes WHERE is_active = true GROUP BY zip_code
            UNION ALL
            SELECT zip_code, COUNT(*) as cnt FROM lender_zip_codes WHERE is_active = true GROUP BY zip_code
            UNION ALL
            SELECT zip_code, COUNT(*) as cnt FROM vendor_zip_codes WHERE is_active = true GROUP BY zip_code
          ) combined GROUP BY zip_code ORDER BY total_claims DESC LIMIT 10
        `)),
      ]);

      res.json({
        totalUsers: Number(totalUsers.rows[0]?.count || 0),
        totalTransactions: Number(totalTx.rows[0]?.count || 0),
        totalClients: Number(totalClients.rows[0]?.count || 0),
        totalLeads: Number(totalLeads.rows[0]?.count || 0),
        usersByRole: usersCount.rows,
        transactionsByStatus: txCount.rows,
        activeAds: Number(activeAds.rows[0]?.count || 0),
        pendingAds: Number(pendingAds.rows[0]?.count || 0),
        pendingVerifications: Number(pendingVerifications.rows[0]?.count || 0),
        pendingReports: Number(pendingReports.rows[0]?.count || 0),
        roleGrowth: userGrowth.rows,
        txGrowth: txGrowth.rows,
        recentSignups: recentSignups.rows,
        adStats: adStats.rows[0] || { total_impressions: 0, total_clicks: 0, total_budget: 0 },
        usersThisMonth: thisM,
        usersLastMonth: lastM,
        userChange,
        txThisMonth: txThisM,
        txChange,
        financial: {
          activeSubscriptions: Number(stripeSubs.rows[0]?.count || 0),
          totalRevenue: Number(stripeRevenue.rows[0]?.total || 0),
          mrr: Number(stripeMrr.rows[0]?.mrr || 0),
          stripeCustomers: Number(stripeCustomerCount.rows[0]?.count || 0),
          subscribedUsers: Number(usersWithSubs.rows[0]?.count || 0),
          subscriptionsByStatus: stripeSubsByStatus.rows,
          monthlyRevenue: stripeMonthlyRevenue.rows,
          recentInvoices: stripeRecentInvoices.rows,
          adRevenueCents: Number(adRevenue.rows[0]?.total || 0),
          leadGenRevenue: {
            agents: Number(agentLeadRev.rows[0]?.total || 0),
            lenders: Number(lenderLeadRev.rows[0]?.total || 0),
            vendors: Number(vendorLeadRev.rows[0]?.total || 0),
            total: Number(agentLeadRev.rows[0]?.total || 0) + Number(lenderLeadRev.rows[0]?.total || 0) + Number(vendorLeadRev.rows[0]?.total || 0),
          },
        },
        leadInsights: {
          totalLeads: Number(leadTotal.rows[0]?.count || 0),
          convertedLeads: Number(leadConverted.rows[0]?.count || 0),
          conversionRate: Number(leadTotal.rows[0]?.count || 0) > 0
            ? Math.round((Number(leadConverted.rows[0]?.count || 0) / Number(leadTotal.rows[0]?.count || 0)) * 100)
            : 0,
          avgResponseSeconds: Number(leadAvgResponse.rows[0]?.avg_seconds || 0),
          respondedCount: Number(leadAvgResponse.rows[0]?.responded_count || 0),
          byStatus: leadByStatus.rows,
          bySource: leadBySource.rows,
          byZipCode: leadByZip.rows,
        },
        geographic: {
          transactionsByState: txByState.rows,
          transactionsByZip: txByZip.rows,
          activeClaimedZips: activeClaimedZips.rows,
        },
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = (page - 1) * limit;
      const search = (req.query.search as string) || "";
      const roleFilter = req.query.role as string | undefined;

      const userFields = sql`id, email, first_name, last_name, role, email_verified, verification_status, stripe_subscription_id, account_status`;
      let result;
      if (search && roleFilter) {
        result = await db.execute(sql`SELECT ${userFields} FROM users WHERE role = ${roleFilter} AND (email ILIKE ${'%' + search + '%'} OR first_name ILIKE ${'%' + search + '%'} OR last_name ILIKE ${'%' + search + '%'}) ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`);
      } else if (search) {
        result = await db.execute(sql`SELECT ${userFields} FROM users WHERE email ILIKE ${'%' + search + '%'} OR first_name ILIKE ${'%' + search + '%'} OR last_name ILIKE ${'%' + search + '%'} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`);
      } else if (roleFilter) {
        result = await db.execute(sql`SELECT ${userFields} FROM users WHERE role = ${roleFilter} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`);
      } else {
        result = await db.execute(sql`SELECT ${userFields} FROM users ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`);
      }

      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
      res.json({ users: result.rows, total: Number(countResult.rows[0]?.count || 0), page, limit });
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const targetId = Number(req.params.id);
      const allowedFields = ['role', 'emailVerified', 'verificationStatus'];
      const data: Record<string, any> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }

      if (data.role) {
        await db.execute(sql`UPDATE users SET role = ${data.role} WHERE id = ${targetId}`);
      }
      if (data.emailVerified !== undefined) {
        await db.execute(sql`UPDATE users SET email_verified = ${data.emailVerified} WHERE id = ${targetId}`);
      }
      if (data.verificationStatus) {
        await db.execute(sql`UPDATE users SET verification_status = ${data.verificationStatus} WHERE id = ${targetId}`);
      }

      await logAdminAction(req.user!.id, "update_user", "user", targetId, data);

      const updated = await db.execute(sql`SELECT id, email, first_name, last_name, role, email_verified, verification_status FROM users WHERE id = ${targetId}`);
      res.json(updated.rows[0]);
    } catch (error) {
      console.error("Admin update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.get("/api/admin/verifications", requireAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.verification_status, u.license_number, u.license_state, u.brokerage_name, lv.verification_method, lv.name_matched, lv.name_match_score, lv.lookup_url, lv.created_at FROM users u LEFT JOIN license_verifications lv ON u.id = lv.user_id WHERE u.verification_status IN ('pending', 'license_verified', 'stripe_verified') ORDER BY lv.created_at DESC NULLS LAST`);
      res.json(result.rows);
    } catch (error) {
      console.error("Admin verifications error:", error);
      res.status(500).json({ error: "Failed to fetch verifications" });
    }
  });

  app.post("/api/admin/verifications/:id/approve", requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      await db.execute(sql`UPDATE users SET verification_status = 'admin_verified' WHERE id = ${userId}`);
      await logAdminAction(req.user!.id, "approve_verification", "user", userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Admin approve error:", error);
      res.status(500).json({ error: "Failed to approve verification" });
    }
  });

  app.post("/api/admin/verifications/:id/reject", requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      await db.execute(sql`UPDATE users SET verification_status = 'unverified' WHERE id = ${userId}`);
      await logAdminAction(req.user!.id, "reject_verification", "user", userId, { reason: req.body.reason });
      res.json({ success: true });
    } catch (error) {
      console.error("Admin reject error:", error);
      res.status(500).json({ error: "Failed to reject verification" });
    }
  });

  app.get("/api/admin/reports", requireAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`SELECT lr.*, vl.address, vl.listing_agent_name, u.first_name, u.last_name, u.email FROM listing_reports lr LEFT JOIN verified_listings vl ON lr.verified_listing_id = vl.id LEFT JOIN users u ON lr.reported_by = u.id ORDER BY lr.created_at DESC`);
      res.json(result.rows);
    } catch (error) {
      console.error("Admin reports error:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.patch("/api/admin/reports/:id", requireAdmin, async (req, res) => {
    try {
      const reportId = Number(req.params.id);
      const status = req.body.status;
      if (!['reviewed', 'dismissed'].includes(status)) return res.status(400).json({ error: "Invalid status" });
      await db.execute(sql`UPDATE listing_reports SET status = ${status} WHERE id = ${reportId}`);
      await logAdminAction(req.user!.id, `report_${status}`, "listing_report", reportId);
      res.json({ success: true });
    } catch (error) {
      console.error("Admin update report error:", error);
      res.status(500).json({ error: "Failed to update report" });
    }
  });

  app.get("/api/admin/ads", requireAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`SELECT sa.*, u.first_name, u.last_name, u.email FROM sponsored_ads sa JOIN users u ON sa.user_id = u.id ORDER BY CASE sa.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END, sa.created_at DESC`);
      res.json(result.rows);
    } catch (error) {
      console.error("Admin ads error:", error);
      res.status(500).json({ error: "Failed to fetch ads" });
    }
  });

  app.patch("/api/admin/ads/:id", requireAdmin, async (req, res) => {
    try {
      const adId = Number(req.params.id);
      const { status, adminNotes } = req.body;
      if (status && !['active', 'rejected', 'paused'].includes(status)) return res.status(400).json({ error: "Invalid status" });

      if (adminNotes) await db.execute(sql`UPDATE sponsored_ads SET admin_notes = ${adminNotes}, updated_at = NOW() WHERE id = ${adId}`);

      if (status) {
        const adResult = await db.execute(sql`SELECT sa.*, u.stripe_customer_id FROM sponsored_ads sa JOIN users u ON sa.user_id = u.id WHERE sa.id = ${adId}`);
        const ad = adResult.rows[0] as any;

        if (status === 'active' && ad && ad.budget_cents > 0) {
          try {
            const { getUncachableStripeClient } = await import('./stripeClient');
            const stripe = await getUncachableStripeClient();

            if (!ad.stripe_customer_id) {
              await db.execute(sql`UPDATE sponsored_ads SET status = 'rejected', admin_notes = COALESCE(admin_notes || E'\n', '') || 'Rejected: No payment method on file.', updated_at = NOW() WHERE id = ${adId}`);
              await logAdminAction(req.user!.id, 'ad_rejected', "sponsored_ad", adId, { reason: 'No payment method' });
              const updated = await db.execute(sql`SELECT * FROM sponsored_ads WHERE id = ${adId}`);
              return res.json(updated.rows[0]);
            }

            const paymentMethods = await stripe.paymentMethods.list({
              customer: ad.stripe_customer_id,
              type: 'card',
            });
            if (paymentMethods.data.length === 0) {
              await db.execute(sql`UPDATE sponsored_ads SET status = 'rejected', admin_notes = COALESCE(admin_notes || E'\n', '') || 'Rejected: No payment method on file.', updated_at = NOW() WHERE id = ${adId}`);
              await logAdminAction(req.user!.id, 'ad_rejected', "sponsored_ad", adId, { reason: 'No payment method' });
              const updated = await db.execute(sql`SELECT * FROM sponsored_ads WHERE id = ${adId}`);
              return res.json(updated.rows[0]);
            }

            const price = await stripe.prices.create({
              unit_amount: ad.budget_cents,
              currency: 'usd',
              recurring: { interval: 'month' },
              product_data: {
                name: `Sponsored Ad: ${ad.title}`,
                metadata: { adId: String(adId), type: ad.type },
              },
            });

            const subscription = await stripe.subscriptions.create({
              customer: ad.stripe_customer_id,
              items: [{ price: price.id }],
              default_payment_method: paymentMethods.data[0].id,
              metadata: { adId: String(adId), type: 'sponsored_ad' },
            });

            await db.execute(sql`UPDATE sponsored_ads SET status = 'active', stripe_subscription_id = ${subscription.id}, updated_at = NOW() WHERE id = ${adId}`);
          } catch (stripeErr: any) {
            console.error("Stripe ad billing error:", stripeErr);
            await db.execute(sql`UPDATE sponsored_ads SET status = 'rejected', admin_notes = COALESCE(admin_notes || E'\n', '') || 'Rejected: Payment failed. Please update your payment method.', updated_at = NOW() WHERE id = ${adId}`);
            await logAdminAction(req.user!.id, 'ad_rejected', "sponsored_ad", adId, { reason: 'Stripe billing failed' });
            const updated = await db.execute(sql`SELECT * FROM sponsored_ads WHERE id = ${adId}`);
            return res.json(updated.rows[0]);
          }
        } else if ((status === 'paused' || status === 'rejected') && ad?.stripe_subscription_id) {
          try {
            const { getUncachableStripeClient } = await import('./stripeClient');
            const stripe = await getUncachableStripeClient();
            if (status === 'paused') {
              await stripe.subscriptions.update(ad.stripe_subscription_id, { pause_collection: { behavior: 'void' } });
            } else {
              await stripe.subscriptions.cancel(ad.stripe_subscription_id);
              await db.execute(sql`UPDATE sponsored_ads SET stripe_subscription_id = NULL WHERE id = ${adId}`);
            }
          } catch (stripeErr: any) {
            console.error("Stripe ad cancel/pause error:", stripeErr);
          }
          await db.execute(sql`UPDATE sponsored_ads SET status = ${status}, updated_at = NOW() WHERE id = ${adId}`);
        } else {
          await db.execute(sql`UPDATE sponsored_ads SET status = ${status}, updated_at = NOW() WHERE id = ${adId}`);
        }
      }

      await logAdminAction(req.user!.id, `ad_${status || 'update'}`, "sponsored_ad", adId, { status, adminNotes });
      const updated = await db.execute(sql`SELECT * FROM sponsored_ads WHERE id = ${adId}`);
      res.json(updated.rows[0]);
    } catch (error) {
      console.error("Admin update ad error:", error);
      res.status(500).json({ error: "Failed to update ad" });
    }
  });

  app.get("/api/admin/audit-log", requireAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`SELECT al.*, u.first_name, u.last_name FROM admin_audit_log al JOIN users u ON al.admin_id = u.id ORDER BY al.created_at DESC LIMIT 100`);
      res.json(result.rows);
    } catch (error) {
      console.error("Admin audit log error:", error);
      res.status(500).json({ error: "Failed to fetch audit log" });
    }
  });

  app.post("/api/contact-admin", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { subject, content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Message content is required" });
    try {
      const result = await db.execute(sql`INSERT INTO admin_messages (user_id, subject, content) VALUES (${req.user.id}, ${subject || null}, ${content.trim()}) RETURNING *`);
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Contact admin error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/admin/messages", requireAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`SELECT am.*, u.first_name, u.last_name, u.email, u.role FROM admin_messages am JOIN users u ON am.user_id = u.id ORDER BY am.created_at DESC LIMIT 100`);
      res.json(result.rows);
    } catch (error) {
      console.error("Admin messages error:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/admin/messages/:id/reply", requireAdmin, async (req, res) => {
    const msgId = Number(req.params.id);
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Reply content is required" });
    try {
      await db.execute(sql`UPDATE admin_messages SET admin_reply = ${content.trim()}, admin_replied_at = NOW(), read = TRUE WHERE id = ${msgId}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Admin reply error:", error);
      res.status(500).json({ error: "Failed to send reply" });
    }
  });

  return createServer(app);
}