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
    try {
      const result = await db.execute(sql`SELECT * FROM users WHERE id = ${id}`);
      return result.rows[0];
    } catch (error) {
      console.error('Error in getUser:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.execute(sql`SELECT * FROM users WHERE username = ${username}`);
      return result.rows[0];
    } catch (error) {
      console.error('Error in getUserByUsername:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    try {
      const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
      return transaction;
    } catch (error) {
      console.error('Error in createTransaction:', error);
      throw error;
    }
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    try {
      console.log('Database query - fetching transaction with ID:', id);
      const result = await db.execute(sql`
        SELECT 
          t.id,
          t.address,
          t.access_code as "accessCode",
          t.status,
          t.agent_id as "agentId",
          COALESCE(t.participants, '[]'::jsonb) as participants
        FROM transactions t
        WHERE t.id = ${id}
      `);

      if (result.rows.length === 0) {
        console.log('No transaction found with ID:', id);
        return undefined;
      }

      const transaction = result.rows[0];
      console.log('Retrieved transaction:', transaction);

      // Ensure participants is an array
      if (!transaction.participants) {
        transaction.participants = [];
      } else if (typeof transaction.participants === 'string') {
        transaction.participants = JSON.parse(transaction.participants);
      }

      // Cast numeric fields to ensure correct types
      return {
        id: Number(transaction.id),
        address: String(transaction.address),
        accessCode: String(transaction.accessCode),
        status: String(transaction.status),
        agentId: Number(transaction.agentId),
        participants: Array.isArray(transaction.participants) ? transaction.participants : []
      };

    } catch (error) {
      console.error('Database error in getTransaction:', error);
      throw error;
    }
  }

  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    try {
      // Changed to use a simpler query first to get it working
      const result = await db.execute(sql`
        SELECT 
          t.id,
          t.address,
          t.access_code as "accessCode",
          t.status,
          t.agent_id as "agentId",
          t.participants
        FROM transactions t
        WHERE t.agent_id = ${userId}
      `);

      console.log('Retrieved transactions:', result.rows);
      return result.rows;
    } catch (error) {
      console.error('Error in getTransactionsByUser:', error);
      return [];
    }
  }

  async updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction> {
    const [transaction] = await db.update(transactions).set(data).where(eq(transactions.id, id)).returning();
    return transaction;
  }

  async createChecklist(insertChecklist: InsertChecklist): Promise<Checklist> {
    const [checklist] = await db.insert(checklists).values(insertChecklist).returning();
    return checklist;
  }

  async getChecklist(transactionId: number, role: string): Promise<Checklist | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM checklists 
        WHERE transaction_id = ${transactionId} AND role = ${role}
      `);
      return result.rows[0];
    } catch (error) {
      console.error('Error in getChecklist:', error);
      return undefined;
    }
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
    try {
      const result = await db.execute(sql`
        SELECT * FROM messages 
        WHERE transaction_id = ${transactionId}
        ORDER BY timestamp ASC
      `);
      return result.rows;
    } catch (error) {
      console.error('Error in getMessages:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();