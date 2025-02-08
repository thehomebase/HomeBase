import { 
  users, transactions, checklists, messages,
  type User, type Transaction, type Checklist, type Message,
  type InsertUser, type InsertTransaction, type InsertChecklist, type InsertMessage 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { sql } from 'drizzle-orm/sql'

const PostgresSessionStore = connectPg(session);

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
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    try {
      const [transaction] = await db
        .insert(transactions)
        .values({
          address: insertTransaction.address,
          accessCode: insertTransaction.accessCode,
          status: insertTransaction.status,
          agentId: insertTransaction.agentId,
          participants: insertTransaction.participants || [],
        })
        .returning();

      console.log('Created transaction:', transaction);
      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    try {
      console.log('Getting transaction with ID:', id);
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, id));

      console.log('Retrieved transaction:', transaction);
      return transaction;
    } catch (error) {
      console.error('Error in getTransaction:', error);
      throw error;
    }
  }

  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    try {
      console.log('Getting transactions for user:', userId);
      const userTransactions = await db
        .select()
        .from(transactions)
        .where(
          or(
            eq(transactions.agentId, userId),
            sql`${transactions.participants}::jsonb @> jsonb_build_array(jsonb_build_object('userId', ${userId}))`
          )
        );

      console.log('Retrieved transactions:', userTransactions);
      return userTransactions;
    } catch (error) {
      console.error('Error in getTransactionsByUser:', error);
      return [];
    }
  }

  async updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction> {
    const [transaction] = await db
      .update(transactions)
      .set(data)
      .where(eq(transactions.id, id))
      .returning();
    return transaction;
  }

  async createChecklist(insertChecklist: InsertChecklist): Promise<Checklist> {
    const [checklist] = await db.insert(checklists).values(insertChecklist).returning();
    return checklist;
  }

  async getChecklist(transactionId: number, role: string): Promise<Checklist | undefined> {
    const [checklist] = await db
      .select()
      .from(checklists)
      .where(
        and(
          eq(checklists.transactionId, transactionId),
          eq(checklists.role, role)
        )
      );
    return checklist;
  }

  async updateChecklist(id: number, items: Checklist["items"]): Promise<Checklist> {
    const [checklist] = await db
      .update(checklists)
      .set({ items })
      .where(eq(checklists.id, id))
      .returning();
    return checklist;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getMessages(transactionId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.transactionId, transactionId))
      .orderBy(messages.timestamp);
  }
}

export const storage = new DatabaseStorage();