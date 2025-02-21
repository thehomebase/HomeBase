import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertTransactionSchema, insertChecklistSchema, insertMessageSchema, insertClientSchema } from "@shared/schema";
import ical from "ical-generator";
import { parse } from 'csv-parse/sync';
import type { InsertClient } from '@shared/schema';

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

      // Ensure required fields are present
      const clientData = {
        ...parsed.data,
        agentId: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
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
      const client = await storage.updateClient(Number(req.params.id), req.body);
      res.json(client);
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(500).json({ error: 'Failed to update client' });
    }
  });

  app.post("/api/clients/import", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent") {
      return res.sendStatus(401);
    }

    try {
      const csvData = req.body.csvData;
      if (!csvData) {
        return res.status(400).json({ error: 'No CSV data provided' });
      }

      // Parse CSV data
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true
      });

      // Map CSV fields to client schema
      const clients: InsertClient[] = records.map((record: any) => ({
        firstName: record.firstName || record['First Name'] || '',
        lastName: record.lastName || record['Last Name'] || '',
        email: record.email || record.Email || '',
        phone: record.phone || record.Phone || '',
        address: record.address || record.Address || '',
        type: (record.type || record.Type || 'buyer').toLowerCase(),
        status: (record.status || record.Status || 'active').toLowerCase(),
        notes: record.notes || record.Notes || '',
        labels: record.labels ? record.labels.split(',').map((l: string) => l.trim()) : [],
        agentId: req.user.id
      }));

      // Validate each client
      const validationErrors: any[] = [];
      clients.forEach((client, index) => {
        if (!client.firstName || !client.lastName) {
          validationErrors.push({
            row: index + 1,
            error: 'First name and last name are required'
          });
        }
        if (client.email && !client.email.includes('@')) {
          validationErrors.push({
            row: index + 1,
            error: 'Invalid email format'
          });
        }
        if (!['buyer', 'seller'].includes(client.type)) {
          validationErrors.push({
            row: index + 1,
            error: 'Type must be either buyer or seller'
          });
        }
      });

      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          error: 'Validation errors in CSV data',
          details: validationErrors
        });
      }

      // Insert all valid clients
      const insertedClients = await Promise.all(
        clients.map(client => storage.createClient(client))
      );

      res.status(201).json({
        message: `Successfully imported ${insertedClients.length} clients`,
        clients: insertedClients
      });

    } catch (error) {
      console.error('Error importing clients:', error);
      res.status(500).json({ 
        error: 'Failed to import clients',
        details: error instanceof Error ? error.message : 'Unknown error'
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
      const parsed = insertTransactionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).send(parsed.error.message);
      }

      const transaction = await storage.createTransaction(parsed.data);
      res.status(201).json(transaction);
    } catch (error) {
      console.error('Error creating transaction:', error);
      res.status(500).send('Error creating transaction');
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

  // Calendar Integration
  app.get("/api/calendar/:userId/:type", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const transactions = await storage.getTransactionsByUser(Number(req.params.userId));
      const isSubscription = req.params.type === 'subscribe';

      const calendar = ical({ 
        name: "Real Estate Calendar",
        timezone: 'America/Chicago'
      });

      transactions.forEach(transaction => {
        if (transaction.closingDate) {
          calendar.createEvent({
            start: new Date(transaction.closingDate),
            end: new Date(transaction.closingDate),
            summary: `Closing - ${transaction.address}`,
            description: `Closing for property at ${transaction.address}`,
            location: transaction.address
          });
        }

        if (transaction.optionPeriodExpiration) {
          calendar.createEvent({
            start: new Date(transaction.optionPeriodExpiration),
            end: new Date(transaction.optionPeriodExpiration),
            summary: `Option Expiration - ${transaction.address}`,
            description: `Option period expiration for property at ${transaction.address}`,
            location: transaction.address
          });
        }
      });

      // Set headers based on request type
      if (isSubscription) {
        // Headers for calendar subscription
        res.set({
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'inline; filename=calendar.ics',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Refresh': '3600' // Suggest refresh every hour
        });
      } else {
        // Headers for calendar download
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

  return createServer(app);
}