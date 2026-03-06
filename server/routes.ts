import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertTransactionSchema, insertChecklistSchema, insertMessageSchema, insertClientSchema, insertContractorSchema, insertContractorReviewSchema, insertPropertyViewingSchema, insertPropertyFeedbackSchema, insertSavedPropertySchema, insertCommunicationSchema } from "@shared/schema";
import ical from "ical-generator";
import multer from "multer";
import * as XLSX from "xlsx";
import { parseContract } from "./contract-parser";
import { sendSMS, sendSMSFromNumber, isTwilioConfigured, getTwilioPhoneNumber, isOptOutMessage, isOptInMessage, normalizePhoneNumber, validateTwilioWebhook, isBlockedNumber, containsThreateningContent, searchAvailableNumbers, purchasePhoneNumber, releasePhoneNumber } from "./twilio-service";
import { getAuthUrl, handleCallback, getGmailStatus, disconnectGmail, sendGmailEmail, getGmailMessages, getGmailInbox, getGmailMessageDetail, getSignature, batchModifyMessages, trashMessages, getGmailLabels, type EmailAttachment } from "./gmail-service";
import { randomUUID } from "crypto";

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

    if (req.user.role !== "agent") {
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
    if (!req.isAuthenticated() || req.user.role !== "agent") {
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
    if (req.user.role !== "agent") return res.sendStatus(403);

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
    if (!req.isAuthenticated() || req.user.role !== "agent") {
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
    if (!req.isAuthenticated() || req.user.role !== "agent") {
      return res.sendStatus(401);
    }

    try {
      const id = Number(req.params.id);
      const data = { ...req.body };

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
      res.json(transaction);
    } catch (error) {
      console.error('Error updating transaction:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Error updating transaction' });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent") {
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
    if (!req.isAuthenticated() || req.user.role !== "agent") {
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
    if (!req.isAuthenticated() || req.user.role !== "agent") {
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
    if (!req.isAuthenticated() || req.user.role !== "agent") {
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
        'city', 'state', 'zipCode', 'description', 'googleMapsUrl', 'agentRating', 'agentNotes'];
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
    if (!req.isAuthenticated() || req.user.role !== "agent") {
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
    if (!req.isAuthenticated() || req.user.role !== "agent") {
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
    if (!req.isAuthenticated() || req.user.role !== "agent") {
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
    if (!req.isAuthenticated() || req.user.role !== "agent") {
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
    if (!req.isAuthenticated() || req.user.role !== "agent") {
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
    if (req.user.role !== "agent") return res.sendStatus(403);

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
    if (!req.isAuthenticated() || req.user.role !== "agent") {
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
    if (!req.isAuthenticated() || req.user.role !== "agent") {
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
    if (!req.isAuthenticated() || req.user.role !== "agent") {
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
    if (!req.isAuthenticated() || req.user.role !== "agent") {
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
    try {
      const agentPhone = await storage.getAgentPhoneNumber(req.user.id);
      res.json({ phoneNumber: agentPhone });
    } catch (error) {
      res.status(500).json({ error: "Failed to get phone number" });
    }
  });

  app.get("/api/phone-number/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
    try {
      const result = await getSignature(req.user.id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ signature: "", error: error.message });
    }
  });

  app.post("/api/gmail/disconnect", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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

  app.post("/api/gmail/send", upload.array("attachments", 10), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
    const result = await getGmailLabels(req.user.id);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result.labels);
  });

  // ============ Email Snippets ============
  app.get("/api/snippets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent") return res.sendStatus(403);
    const snippets = await storage.getSnippetsByUser(req.user.id);
    res.json(snippets);
  });

  app.post("/api/snippets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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
    if (req.user.role !== "agent") return res.sendStatus(403);
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

  // Simple ping endpoint for health checks
  app.get("/ping", (req, res) => {
    res.json({ 
      timestamp: Date.now(),
      status: "ok" 
    });
  });

  return createServer(app);
}