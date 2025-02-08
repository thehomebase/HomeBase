import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertTransactionSchema, insertChecklistSchema, insertMessageSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Transactions
  app.get("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const transactions = await storage.getTransactionsByUser(req.user.id);
    res.json(transactions);
  });

  app.get("/api/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      console.error('Invalid transaction ID:', req.params.id);
      return res.status(400).send('Invalid transaction ID');
    }

    try {
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        console.error('Transaction not found:', id);
        return res.status(404).send('Transaction not found');
      }
      console.log('Retrieved transaction:', transaction);
      res.json(transaction);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).send('Error fetching transaction');
    }
  });

  app.post("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "agent") return res.sendStatus(401);
    const parsed = insertTransactionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).send(parsed.error.message);
    const transaction = await storage.createTransaction(parsed.data);
    res.status(201).json(transaction);
  });

  // Checklists
  app.get("/api/checklists/:transactionId/:role", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const checklist = await storage.getChecklist(
      Number(req.params.transactionId),
      req.params.role
    );
    res.json(checklist);
  });

  app.post("/api/checklists", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertChecklistSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).send(parsed.error.message);
    const checklist = await storage.createChecklist(parsed.data);
    res.status(201).json(checklist);
  });

  app.patch("/api/checklists/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = z.array(z.object({
      id: z.string(),
      text: z.string(),
      completed: z.boolean(),
    })).safeParse(req.body.items);
    if (!parsed.success) return res.status(400).send(parsed.error.message);
    const checklist = await storage.updateChecklist(Number(req.params.id), parsed.data);
    res.json(checklist);
  });

  // Messages
  app.get("/api/messages/:transactionId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const messages = await storage.getMessages(Number(req.params.transactionId));
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertMessageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).send(parsed.error.message);
    const message = await storage.createMessage(parsed.data);
    res.status(201).json(message);

    const httpServer = createServer(app);
    const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "message",
          transactionId: message.transactionId,
        }));
      }
    });
  });

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  return httpServer;
}