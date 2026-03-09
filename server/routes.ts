import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm/sql";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertTransactionSchema, insertChecklistSchema, insertMessageSchema, insertClientSchema, insertContractorSchema, insertContractorReviewSchema, insertPropertyViewingSchema, insertPropertyFeedbackSchema, insertSavedPropertySchema, insertCommunicationSchema, insertInspectionItemSchema, insertBidRequestSchema, insertBidSchema, insertHomeownerHomeSchema, insertMaintenanceRecordSchema, insertHomeTeamMemberSchema, insertDripCampaignSchema, insertDripStepSchema, insertDripEnrollmentSchema, insertClientSpecialDateSchema, insertLeadZipCodeSchema, insertLeadSchema, insertAgentReviewSchema, insertVendorRatingSchema } from "@shared/schema";
import ical from "ical-generator";
import multer from "multer";
import * as XLSX from "xlsx";
import { parseContract } from "./contract-parser";
import { sendSMS, sendSMSFromNumber, isTwilioConfigured, getTwilioPhoneNumber, isOptOutMessage, isOptInMessage, normalizePhoneNumber, validateTwilioWebhook, isBlockedNumber, containsThreateningContent, searchAvailableNumbers, purchasePhoneNumber, releasePhoneNumber } from "./twilio-service";
import { getAuthUrl, handleCallback, getGmailStatus, disconnectGmail, sendGmailEmail, getGmailMessages, getGmailInbox, getGmailMessageDetail, getSignature, batchModifyMessages, trashMessages, getGmailLabels, type EmailAttachment } from "./gmail-service";
import { randomUUID } from "crypto";
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 },
});

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
  ]);

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

      res.status(201).json(client);
    } catch (error) {
      console.error('Error creating client:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create client',
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      await storage.deleteClient(Number(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({ error: 'Failed to delete client' });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }

    try {
      // Validate client ID
      const clientId = Number(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ error: 'Invalid client ID' });
      }

      console.log('Processing client update request:', {
        clientId,
        updateData: req.body
      });

      const client = await storage.updateClient(clientId, req.body);

      console.log('Client updated successfully:', client);
      res.json(client);
    } catch (error) {
      console.error('Error updating client:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ 
        error: 'Failed to update client',
        details: errorMessage
      });
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
      const transactions = await storage.getTransactionsByUser(req.user.id);
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
      console.log('Processing request for transaction ID:', id, 'User:', req.user);

      const transaction = await storage.getTransaction(id);

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      const userHasAccess =
        transaction.agentId === req.user.id ||
        (transaction.participants && transaction.participants.some(p => p.userId === req.user.id));

      if (!userHasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(transaction);

    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({ error: 'Error fetching transaction' });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }

    try {
      const id = Number(req.params.id);
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
      const data = { ...req.body };
      delete data.id;
      delete data.agentId;

      const oldTransaction = await storage.getTransaction(id);
      if (!oldTransaction || oldTransaction.agentId !== req.user.id) {
        return res.status(403).json({ error: "Not authorized to update this transaction" });
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

      if (oldTransaction && oldTransaction.status !== "closed" && data.status === "closed" && transaction.clientId) {
        try {
          const existing = await storage.getFeedbackRequestByTransaction(transaction.id, transaction.clientId);
          if (!existing) {
            const client = await storage.getClient(transaction.clientId);
            if (client) {
              const token = randomUUID();
              await storage.createFeedbackRequest({
                transactionId: transaction.id,
                agentId: req.user.id,
                clientId: transaction.clientId,
                token,
              });

              const agentName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'your agent';
              const address = [transaction.streetName, transaction.city].filter(Boolean).join(', ') || 'your property';
              const feedbackUrl = `${getAppBaseUrl(req)}/feedback/${token}`;
              const deliveredVia: string[] = [];

              if (client.phone) {
                const agentPhone = await storage.getAgentPhoneNumber(req.user.id);
                const smsMessage = `Congratulations on closing on ${address}! ${agentName} would love to hear about your experience. Please leave a review here: ${feedbackUrl}`;
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
                      <h2 style="color:#333;">Congratulations on your closing!</h2>
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
                      content: `Congratulations on closing on ${address}! I'd love to hear about your experience. Please leave a review here: ${feedbackUrl}`,
                    });
                    deliveredVia.push('message');
                  }
                } catch (msgErr) {
                  console.error("Failed to send feedback private message:", msgErr);
                }
              }

              console.log(`[Feedback] Created feedback request for transaction ${transaction.id}, client ${client.firstName} ${client.lastName}, delivered via: ${deliveredVia.join(', ') || 'none (no contact info)'}`);
            }
          }
        } catch (feedbackErr) {
          console.error("Error creating feedback request:", feedbackErr);
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

      // Create transaction with the new schema fields
      const transaction = await storage.createTransaction({
        ...parsed.data,
        agentId: req.user.id,
        status: 'prospect',
        participants: []
      });

      console.log('Created transaction:', transaction);
      res.status(201).json(transaction);
    } catch (error) {
      console.error('Error creating transaction:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Error creating transaction',
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Checklists
  app.get("/api/checklists/:transactionId", async (req, res) => {
    const transactionId = parseInt(req.params.transactionId, 10);

    try {
      const transaction = await storage.getTransaction(transactionId);

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
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
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
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
      // Get all transactions for the user
      const transactions = await storage.getTransactionsByUser(req.user.id);

      // Get all unique contacts from these transactions
      const contacts = await Promise.all(
        transactions.map(t => storage.getContactsByTransaction(t.id))
      );

      // Flatten and remove duplicates
      const uniqueContacts = Array.from(new Set(
        contacts.flat().map(c => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          role: c.role,
          email: c.email
        }))
      ));

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

  app.get("/api/communications/metrics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!["agent", "vendor", "lender"].includes(req.user.role)) return res.sendStatus(403);
    try {
      const parsedContactId = req.query.contactId ? parseInt(req.query.contactId as string) : undefined;
      const contactId = parsedContactId && Number.isFinite(parsedContactId) ? parsedContactId : undefined;
      const metrics = await storage.getCommunicationMetrics(req.user.id, contactId);
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
      const contactData = {
        ...req.body,
        transactionId: Number(req.body.transactionId)
      };
      console.log("Creating contact with data:", JSON.stringify(contactData));

      const contact = await storage.createContact(contactData);
      if (!contact) {
        return res.status(500).json({ error: 'Failed to create contact' });
      }
      res.json(contact);
    } catch (error) {
      console.error('Error creating contact:', error);
      const message = error instanceof Error ? error.message : 'Failed to create contact';
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/contacts/:transactionId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const contacts = await storage.getContactsByTransaction(Number(req.params.transactionId));
      res.json(contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  app.patch("/api/contacts/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }
    try {
      const contact = await storage.updateContact(Number(req.params.id), req.body);
      res.json(contact);
    } catch (error) {
      console.error('Error updating contact:', error);
      res.status(500).json({ error: 'Failed to update contact' });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      await storage.deleteContact(Number(req.params.id));
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
      const documents = await storage.getDocumentsByTransaction(Number(req.params.transactionId));
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  app.post("/api/documents/:transactionId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const document = await storage.createDocument({
        ...req.body,
        transactionId: Number(req.params.transactionId)
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

      // Get the document to verify it exists and belongs to this transaction
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Update the document with the deadline
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
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const [transactions, documents] = await Promise.all([
        storage.getTransactionsByUser(Number(req.params.userId)),
        storage.getAllDocumentsByUser(Number(req.params.userId))
      ]);

      const isSubscription = req.params.type === 'subscribe';

      const calendar = ical({ 
        name: "Real Estate Calendar",
        timezone: 'America/Chicago'
      });

      // Add transaction events
      transactions.forEach(transaction => {
        const address = `${transaction.streetName}, ${transaction.city}, ${transaction.state} ${transaction.zipCode}`;

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
          let averageRating: number | null = null;
          if (reviews.length > 0) {
            const total = reviews.reduce((sum, r) => sum + r.rating, 0);
            averageRating = Math.round((total / reviews.length) * 10) / 10;
          }
          return { ...contractor, averageRating, reviewCount: reviews.length };
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
      
      const contractors = await storage.getAllContractors();
      
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
      res.json(contractor);
    } catch (error) {
      console.error('Error fetching contractor:', error);
      res.status(500).json({ error: 'Failed to fetch contractor' });
    }
  });

  app.post("/api/contractors", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }

    try {
      const parsed = insertContractorSchema.safeParse({
        ...req.body,
        agentId: req.user.id
      });
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
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }

    try {
      const contractor = await storage.getContractor(Number(req.params.id));
      if (!contractor) {
        return res.status(404).json({ error: 'Contractor not found' });
      }
      if (contractor.agentId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to edit this contractor' });
      }
      
      const allowedFields = ['name', 'category', 'phone', 'email', 'website', 'address', 
        'city', 'state', 'zipCode', 'description', 'googleMapsUrl', 'yelpUrl', 'bbbUrl', 'vendorUserId', 'agentRating', 'agentNotes'];
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
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }

    try {
      const contractor = await storage.getContractor(Number(req.params.id));
      if (!contractor) {
        return res.status(404).json({ error: 'Contractor not found' });
      }
      if (contractor.agentId !== req.user.id) {
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
      res.json(ratings);
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

  app.post("/api/geocode", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'HomeBase-RealEstate-App/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data.length > 0) {
        res.json({
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          displayName: data[0].display_name
        });
      } else {
        res.status(404).json({ error: 'Address not found' });
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      res.status(500).json({ error: 'Failed to geocode address' });
    }
  });

  app.post("/api/transactions/:id/geocode", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") {
      return res.sendStatus(401);
    }
    
    try {
      const transaction = await storage.getTransaction(Number(req.params.id));
      if (!transaction || transaction.agentId !== req.user.id) {
        return res.sendStatus(403);
      }
      
      const address = `${transaction.streetName}, ${transaction.city}, ${transaction.state} ${transaction.zipCode}`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'HomeBase-RealEstate-App/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data.length > 0) {
        await storage.updateTransactionCoordinates(
          Number(req.params.id),
          parseFloat(data[0].lat),
          parseFloat(data[0].lon)
        );
        res.json({ success: true, lat: data[0].lat, lon: data[0].lon });
      } else {
        res.status(404).json({ error: 'Address not found' });
      }
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
    if (req.user.role !== 'agent') return res.status(403).json({ error: 'Only agents can upload contracts' });

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

      const { rawTextPreview, ...fields } = extracted;

      const fs = await import('fs');
      fs.writeFileSync('/tmp/contract_debug.txt', rawTextPreview);
      console.log('=== FULL CONTRACT TEXT WRITTEN TO /tmp/contract_debug.txt ===');
      console.log('=== EXTRACTED FIELDS ===');
      console.log(JSON.stringify(fields, null, 2));

      res.json({
        extracted: fields,
        rawTextPreview,
        message: 'Contract parsed successfully. Review the extracted data before applying to the transaction.',
      });
    } catch (error) {
      console.error('Error parsing contract:', error);
      res.status(422).json({ error: 'Failed to parse the contract. Please ensure it is a valid PDF document.' });
    }
  });

  // RentCast property search with caching
  const rentcastCache = new Map<string, { data: any; timestamp: number }>();
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  let monthlyCallCount = 0;
  let monthlyCallResetDate = new Date();
  const MONTHLY_LIMIT = 45; // leave buffer under 50

  function resetMonthlyCounterIfNeeded() {
    const now = new Date();
    if (now.getMonth() !== monthlyCallResetDate.getMonth() || now.getFullYear() !== monthlyCallResetDate.getFullYear()) {
      monthlyCallCount = 0;
      monthlyCallResetDate = now;
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

    const cacheKey = params.toString();
    const forceRefresh = req.query.refresh === "true";

    const cached = rentcastCache.get(cacheKey);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ listings: cached.data, fromCache: true, apiCallsUsed: monthlyCallCount, apiCallsLimit: MONTHLY_LIMIT });
    }

    resetMonthlyCounterIfNeeded();
    if (monthlyCallCount >= MONTHLY_LIMIT) {
      return res.status(429).json({
        error: `Monthly API limit reached (${MONTHLY_LIMIT} calls). Resets next month. Try a cached search or adjust filters.`,
        apiCallsUsed: monthlyCallCount,
        apiCallsLimit: MONTHLY_LIMIT
      });
    }

    try {
      const apiKey = process.env.RENTCAST_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "RentCast API key not configured" });
      }

      const url = `https://api.rentcast.io/v1/listings/sale?${params.toString()}`;
      console.log(`RentCast API call #${monthlyCallCount + 1}: ${url}`);

      const response = await fetch(url, {
        headers: { "X-Api-Key": apiKey, "Accept": "application/json" }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("RentCast API error:", response.status, errorText);
        return res.status(response.status).json({ error: `RentCast API error: ${response.statusText}` });
      }

      const data = await response.json();
      monthlyCallCount++;
      console.log(`RentCast returned ${Array.isArray(data) ? data.length : 'non-array'} listings for: ${cacheKey}`);

      rentcastCache.set(cacheKey, { data, timestamp: Date.now() });

      res.json({ listings: data, fromCache: false, apiCallsUsed: monthlyCallCount, apiCallsLimit: MONTHLY_LIMIT });
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

    const cacheKey = `property:${[addressStr, cityStr, stateStr, zipStr].join("|").toLowerCase()}`;
    const cached = rentcastCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ property: cached.data, fromCache: true });
    }

    resetMonthlyCounterIfNeeded();
    if (monthlyCallCount >= MONTHLY_LIMIT) {
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
      console.log(`RentCast property lookup #${monthlyCallCount + 1}: ${url}`);

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
      monthlyCallCount++;

      const property = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (property) {
        rentcastCache.set(cacheKey, { data: property, timestamp: Date.now() });
      }

      res.json({ property, fromCache: false });
    } catch (error) {
      console.error("RentCast property lookup error:", error);
      res.status(500).json({ error: "Failed to look up property" });
    }
  });

  app.get("/api/rentcast/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    resetMonthlyCounterIfNeeded();
    res.json({
      apiCallsUsed: monthlyCallCount,
      apiCallsLimit: MONTHLY_LIMIT,
      cacheEntries: rentcastCache.size,
      resetDate: new Date(monthlyCallResetDate.getFullYear(), monthlyCallResetDate.getMonth() + 1, 1).toISOString()
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
      const url = getAuthUrl(nonce);
      res.json({ url });
    } catch (error: any) {
      console.error("Error generating Gmail auth URL:", error);
      res.status(500).json({ error: error.message || "Failed to generate auth URL" });
    }
  });

  app.get("/api/gmail/callback", async (req, res) => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const domains = process.env.REPLIT_DOMAINS || "";
    const domain = domains.split(",")[0];
    const baseUrl = domain ? `https://${domain}` : "http://localhost:5000";

    if (!code || !state) {
      return res.redirect(`${baseUrl}/clients?gmail=error`);
    }

    const sessionState = (req.session as any).gmailOAuthState;
    const userId = (req.session as any).gmailOAuthUserId;

    if (!sessionState || !userId || state !== sessionState) {
      console.error("Gmail OAuth state mismatch or missing session data");
      return res.redirect(`${baseUrl}/clients?gmail=error`);
    }

    delete (req.session as any).gmailOAuthState;
    delete (req.session as any).gmailOAuthUserId;

    try {
      await handleCallback(code, userId);
      res.redirect(`${baseUrl}/clients?gmail=connected`);
    } catch (error: any) {
      console.error("Gmail callback error:", error);
      res.redirect(`${baseUrl}/clients?gmail=error`);
    }
  });

  app.get("/api/gmail/signature", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);
    try {
      const result = await getSignature(req.user.id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ signature: "", error: error.message });
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
      res.status(500).json({ error: error.message || "Failed to fetch messages" });
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
      res.status(500).json({ error: error.message || "Failed to fetch inbox" });
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
      res.status(500).json({ error: error.message || "Failed to fetch message" });
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
      res.status(500).json({ error: error.message || "Failed to send email" });
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
      res.status(500).json({ error: error.message });
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
      res.status(500).json({ error: error.message });
    }
  });

  // Client Portal - My Transaction
  app.get("/api/client/my-transaction", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      let transaction = null;
      if (req.user.claimedTransactionId) {
        transaction = await storage.getTransaction(req.user.claimedTransactionId);
      }
      if (!transaction && req.user.clientRecordId) {
        const allTransactions = await storage.getTransactionsByUser(req.user.agentId || 0);
        transaction = allTransactions.find(t =>
          t.clientId === req.user!.clientRecordId || t.secondaryClientId === req.user!.clientRecordId
        );
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
      res.json({ transaction, documents, checklist, timeline });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
      const { parseInspectionReport, parseInspectionReportWithPages } = await import("./inspection-parser");
      let items;

      if (req.file.mimetype === 'application/pdf') {
        try {
          const pdfParseModule = await import("pdf-parse");
          const pdfParseFn = (pdfParseModule as any).default || pdfParseModule;
          const pdfData = await pdfParseFn(req.file.buffer);

          if (pdfData.numpages && pdfData.numpages > 1) {
            const pageTexts: Array<{ pageNumber: number; text: string }> = [];
            const fullText = pdfData.text || "";
            const pageMarkers = fullText.split(/\f/);
            for (let i = 0; i < pageMarkers.length; i++) {
              if (pageMarkers[i].trim().length > 0) {
                pageTexts.push({ pageNumber: i + 1, text: pageMarkers[i] });
              }
            }
            items = pageTexts.length > 1
              ? parseInspectionReportWithPages(pageTexts)
              : parseInspectionReport(fullText);
          } else {
            items = parseInspectionReport(pdfData.text || "");
          }

          const fs = await import("fs");
          const path = await import("path");
          const uploadDir = path.default.join(process.cwd(), 'uploads', 'inspections');
          fs.default.mkdirSync(uploadDir, { recursive: true });
          const fileName = `${transactionId}_${Date.now()}.pdf`;
          const filePath = path.default.join(uploadDir, fileName);
          fs.default.writeFileSync(filePath, req.file.buffer);
          await storage.saveInspectionPdf(transactionId, req.file.originalname || fileName, filePath);
        } catch (pdfErr) {
          console.error('PDF parse error:', pdfErr);
          return res.status(400).json({ error: 'Failed to parse PDF file' });
        }
      } else {
        const text = req.file.buffer.toString('utf-8');
        items = parseInspectionReport(text);
      }
      res.json({ items, transactionId });
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
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction || (req.user.role === "agent" && transaction.agentId !== req.user.id)) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      const items = await storage.getInspectionItemsByTransaction(transactionId);
      res.json(items);
    } catch (error) {
      console.error('Error fetching inspection items:', error);
      res.status(500).json({ error: 'Failed to fetch inspection items' });
    }
  });

  app.patch("/api/inspection-items/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const id = Number(req.params.id);
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
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      await storage.deleteInspectionItem(Number(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting inspection item:', error);
      res.status(500).json({ error: 'Failed to delete inspection item' });
    }
  });

  // ============ Bid Requests ============
  app.post("/api/inspection-items/:id/send-bids", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(401);
    try {
      const inspectionItemId = Number(req.params.id);
      const { contractorIds, transactionId } = req.body;
      if (!Array.isArray(contractorIds) || contractorIds.length === 0) {
        return res.status(400).json({ error: 'contractorIds array is required' });
      }
      if (!transactionId) {
        return res.status(400).json({ error: 'transactionId is required' });
      }
      const transaction = await storage.getTransaction(Number(transactionId));
      if (!transaction || transaction.agentId !== req.user.id) {
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

      res.json({ contractors, total, limit, offset });
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

      const reviews = await storage.getContractorReviews(id);
      const recommendationCount = await storage.getContractorRecommendationCount(id);

      res.json({ ...contractor, reviews, recommendationCount });
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
          return { ...member, contractor: contractor || null };
        })
      );
      res.json(membersWithContractors);
    } catch (error) {
      console.error('Error fetching team members:', error);
      res.status(500).json({ error: 'Failed to fetch team members' });
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

      res.json({ subscription: currentSubscription, hasPaymentMethod });
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
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/billing?success=true`,
        cancel_url: `${baseUrl}/billing?canceled=true`,
        subscription_data: {
          metadata: { userId: String(req.user.id) },
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
      const date = await storage.updateClientSpecialDate(Number(req.params.id), req.body);
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

  const FREE_ZIP_CODES_PER_AGENT = 3;
  const MAX_AGENTS_PER_ZIP = 5;
  const FREE_ELIGIBLE_MIN_OPEN_SLOTS = 3;
  const ZIP_BASE_PRICE = 1000; // $10.00 in cents
  const ZIP_PRICE_INCREMENT = 500; // $5.00 in cents

  function calculateZipCodePrice(currentAgentCount: number): number {
    return ZIP_BASE_PRICE + (currentAgentCount * ZIP_PRICE_INCREMENT);
  }

  function isZipFreeEligible(agentCount: number): boolean {
    const openSlots = MAX_AGENTS_PER_ZIP - agentCount;
    return openSlots >= FREE_ELIGIBLE_MIN_OPEN_SLOTS;
  }

  app.get("/api/leads/zip-pricing/:zipCode", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    try {
      const zipCode = req.params.zipCode.trim();
      if (!/^\d{5}$/.test(zipCode)) {
        return res.status(400).json({ error: 'Invalid zip code' });
      }

      const agentCount = await storage.getAgentCountForZipCode(zipCode);
      const freeZipsUsed = await storage.countAgentFreeZipCodes(req.user.id);
      const alreadyClaimed = await storage.isZipCodeClaimed(req.user.id, zipCode);
      const hasFreeSlots = freeZipsUsed < FREE_ZIP_CODES_PER_AGENT;
      const zipEligibleForFree = isZipFreeEligible(agentCount);
      const isFreeSlot = hasFreeSlots && zipEligibleForFree;
      const price = isFreeSlot ? 0 : calculateZipCodePrice(agentCount);

      res.json({
        zipCode,
        currentAgents: agentCount,
        maxAgents: MAX_AGENTS_PER_ZIP,
        spotsRemaining: MAX_AGENTS_PER_ZIP - agentCount,
        isFull: agentCount >= MAX_AGENTS_PER_ZIP,
        alreadyClaimed,
        freeZipsUsed,
        freeZipsTotal: FREE_ZIP_CODES_PER_AGENT,
        hasFreeSlots,
        zipEligibleForFree,
        isFreeSlot,
        monthlyRate: price,
        monthlyRateDisplay: isFreeSlot ? "Free (included)" : `$${(price / 100).toFixed(2)}/mo`,
      });
    } catch (error) {
      console.error('Error fetching zip pricing:', error);
      res.status(500).json({ error: 'Failed to fetch pricing' });
    }
  });

  app.post("/api/leads/zip-codes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent" && req.user.role !== "broker") return res.sendStatus(403);

    try {
      const { zipCode } = req.body;
      if (!zipCode || typeof zipCode !== 'string') {
        return res.status(400).json({ error: 'Zip code is required' });
      }

      const trimmedZip = zipCode.trim();
      if (!/^\d{5}$/.test(trimmedZip)) {
        return res.status(400).json({ error: 'Please enter a valid 5-digit zip code' });
      }

      const alreadyClaimed = await storage.isZipCodeClaimed(req.user.id, trimmedZip);
      if (alreadyClaimed) {
        return res.status(409).json({ error: 'You have already claimed this zip code' });
      }

      const agentCount = await storage.getAgentCountForZipCode(trimmedZip);
      if (agentCount >= MAX_AGENTS_PER_ZIP) {
        return res.status(409).json({ error: `This zip code is full (max ${MAX_AGENTS_PER_ZIP} agents). Try a nearby zip code.` });
      }

      const freeZipsUsed = await storage.countAgentFreeZipCodes(req.user.id);
      const hasFreeSlots = freeZipsUsed < FREE_ZIP_CODES_PER_AGENT;
      const zipEligibleForFree = isZipFreeEligible(agentCount);
      const isFreeSlot = hasFreeSlots && zipEligibleForFree;
      const monthlyRate = isFreeSlot ? 0 : calculateZipCodePrice(agentCount);

      const claimed = await storage.claimZipCode({
        agentId: req.user.id,
        zipCode: trimmedZip,
        isActive: true,
        monthlyRate,
      });
      res.status(201).json({
        ...claimed,
        isFreeSlot,
        currentAgents: agentCount + 1,
        maxAgents: MAX_AGENTS_PER_ZIP,
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
      const freeZipsUsed = await storage.countAgentFreeZipCodes(req.user.id);
      const enriched = await Promise.all(zips.map(async (zc) => {
        const agentCount = await storage.getAgentCountForZipCode(zc.zipCode);
        return {
          ...zc,
          currentAgents: agentCount,
          maxAgents: MAX_AGENTS_PER_ZIP,
          isFreeSlot: zc.monthlyRate === 0,
        };
      }));
      res.json({
        zipCodes: enriched,
        freeZipsUsed,
        freeZipsTotal: FREE_ZIP_CODES_PER_AGENT,
        maxAgentsPerZip: MAX_AGENTS_PER_ZIP,
      });
    } catch (error) {
      console.error('Error fetching zip codes:', error);
      res.status(500).json({ error: 'Failed to fetch zip codes' });
    }
  });

  // ===== Lead Submission Route (PUBLIC, no auth) =====

  async function assignLeadToAgent(zipCode: string): Promise<{ assignedAgentId: number | null; status: string }> {
    const agents = await storage.getAgentsForZipCode(zipCode);
    if (agents.length === 0) return { assignedAgentId: null, status: 'new' };

    const rotation = await storage.getLeadRotation(zipCode);
    const lastAgentId = rotation?.lastAgentId;

    let nextAgent: typeof agents[0];
    if (lastAgentId) {
      const lastIndex = agents.findIndex(a => a.agentId === lastAgentId);
      const nextIndex = (lastIndex + 1) % agents.length;
      nextAgent = agents[nextIndex];
    } else {
      nextAgent = agents[0];
    }

    await storage.upsertLeadRotation(zipCode, nextAgent.agentId);
    return { assignedAgentId: nextAgent.agentId, status: 'assigned' };
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
        status,
        assignedAgentId,
      });

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

      res.json({ total, new: newCount, accepted, converted, rejected, acceptanceRate });
    } catch (error) {
      console.error('Error fetching lead stats:', error);
      res.status(500).json({ error: 'Failed to fetch lead stats' });
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
    if (!req.isAuthenticated() || req.user.role !== 'agent') return res.status(403).json({ error: 'Forbidden' });
    try {
      const metrics = await storage.getAgentResponseMetrics(req.user.id);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch response metrics' });
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
      const read = await storage.markNotificationRead(notificationId, req.user.id);
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

  // Simple ping endpoint for health checks
  app.get("/ping", (req, res) => {
    res.json({ 
      timestamp: Date.now(),
      status: "ok" 
    });
  });

  return createServer(app);
}