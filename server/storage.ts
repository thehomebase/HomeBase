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
      console.log('Creating transaction with data:', insertTransaction);

      const participantsArray = insertTransaction.participants || [];
      console.log('Participants array:', participantsArray);

      const [transaction] = await db
        .insert(transactions)
        .values({
          address: insertTransaction.address,
          accessCode: insertTransaction.accessCode,
          status: insertTransaction.status,
          agentId: insertTransaction.agentId,
          participants: participantsArray
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
      const result = await db.execute(
        sql`
        SELECT 
          id,
          address,
          access_code as "accessCode",
          status,
          agent_id as "agentId",
          participants
        FROM transactions 
        WHERE id = ${id}
        `
      );

      console.log('Raw query result:', result.rows[0]);

      if (!result.rows.length) {
        console.log('No transaction found with ID:', id);
        return undefined;
      }

      const transaction = result.rows[0];
      console.log('Parsed transaction:', transaction);
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
            sql`${transactions.participants}::jsonb @> ANY(ARRAY['[{"userId":'||${userId}||'}]']::jsonb[])`
          )
        );

      console.log('Retrieved transactions:', userTransactions);
      return userTransactions;
    } catch (error) {
      console.error('Error in getTransactionsByUser:', error);
      return []; // Return empty array instead of throwing to prevent app crash
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