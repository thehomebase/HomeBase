import { users, transactions, checklists, messages } from "@shared/schema";
import type { InsertUser, InsertTransaction, InsertChecklist, InsertMessage } from "@shared/schema";
import type { User, Transaction, Checklist, Message } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionsByUser(userId: number): Promise<Transaction[]>;
  updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction>;

  // Checklist operations
  createChecklist(checklist: InsertChecklist): Promise<Checklist>;
  getChecklist(transactionId: number, role: string): Promise<Checklist | undefined>;
  updateChecklist(id: number, items: Checklist["items"]): Promise<Checklist>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(transactionId: number): Promise<Message[]>;

  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<number, Transaction>;
  private checklists: Map<number, Checklist>;
  private messages: Map<number, Message>;
  private currentId: { [key: string]: number };
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.checklists = new Map();
    this.messages = new Map();
    this.currentId = { users: 1, transactions: 1, checklists: 1, messages: 1 };
    this.sessionStore = new MemoryStore({ checkPeriod: 86400000 });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentId.transactions++;
    const transaction: Transaction = { ...insertTransaction, id };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(t => 
      t.agentId === userId || t.participants.some(p => p.userId === userId)
    );
  }

  async updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction> {
    const transaction = await this.getTransaction(id);
    if (!transaction) throw new Error("Transaction not found");
    
    const updated = { ...transaction, ...data };
    this.transactions.set(id, updated);
    return updated;
  }

  async createChecklist(insertChecklist: InsertChecklist): Promise<Checklist> {
    const id = this.currentId.checklists++;
    const checklist: Checklist = { ...insertChecklist, id };
    this.checklists.set(id, checklist);
    return checklist;
  }

  async getChecklist(transactionId: number, role: string): Promise<Checklist | undefined> {
    return Array.from(this.checklists.values()).find(
      c => c.transactionId === transactionId && c.role === role
    );
  }

  async updateChecklist(id: number, items: Checklist["items"]): Promise<Checklist> {
    const checklist = this.checklists.get(id);
    if (!checklist) throw new Error("Checklist not found");
    
    const updated = { ...checklist, items };
    this.checklists.set(id, updated);
    return updated;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentId.messages++;
    const message: Message = { ...insertMessage, id };
    this.messages.set(id, message);
    return message;
  }

  async getMessages(transactionId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(m => m.transactionId === transactionId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}

export const storage = new MemStorage();
