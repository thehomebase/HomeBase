import { 
  users, transactions, checklists, messages, clients,
  type User, type Transaction, type Checklist, type Message, type Client,
  type InsertUser, type InsertTransaction, type InsertChecklist, type InsertMessage, type InsertClient 
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
  getMessages(transactionId?: number): Promise<Message[]>;

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
      const result = await db.execute(sql`
        SELECT id, username, password, role 
        FROM users 
        WHERE id = ${id}
      `);

      if (result.rows.length === 0) {
        return undefined;
      }

      const user = result.rows[0];
      return {
        id: Number(user.id),
        username: String(user.username),
        password: String(user.password),
        role: String(user.role)
      };
    } catch (error) {
      console.error('Error in getUser:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT id, username, password, role 
        FROM users 
        WHERE username = ${username}
      `);

      if (result.rows.length === 0) {
        return undefined;
      }

      const user = result.rows[0];
      return {
        id: Number(user.id),
        username: String(user.username),
        password: String(user.password),
        role: String(user.role)
      };
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
      const result = await db.execute(sql`
        INSERT INTO transactions (
          address,
          access_code,
          status,
          agent_id,
          client_id,
          participants,
          contract_price,
          option_period,
          option_fee,
          earnest_money,
          down_payment,
          seller_concessions,
          closing_date
        ) VALUES (
          ${insertTransaction.address},
          ${insertTransaction.accessCode},
          ${insertTransaction.status},
          ${insertTransaction.agentId},
          ${insertTransaction.clientId || null},
          ${JSON.stringify(insertTransaction.participants)}::jsonb,
          ${insertTransaction.contractPrice || null},
          ${insertTransaction.optionPeriod || null},
          ${insertTransaction.optionFee || null},
          ${insertTransaction.earnestMoney || null},
          ${insertTransaction.downPayment || null},
          ${insertTransaction.sellerConcessions || null},
          ${insertTransaction.closingDate || null}
        )
        RETURNING *
      `);

      const row = result.rows[0];
      return {
        id: Number(row.id),
        address: String(row.address),
        accessCode: String(row.access_code),
        status: String(row.status),
        agentId: Number(row.agent_id),
        clientId: row.client_id ? Number(row.client_id) : null,
        participants: Array.isArray(row.participants) ? row.participants : [],
        contractPrice: row.contract_price ? Number(row.contract_price) : null,
        optionPeriod: row.option_period ? Number(row.option_period) : null,
        optionFee: row.option_fee ? Number(row.option_fee) : null,
        earnestMoney: row.earnest_money ? Number(row.earnest_money) : null,
        downPayment: row.down_payment ? Number(row.down_payment) : null,
        sellerConcessions: row.seller_concessions ? Number(row.seller_concessions) : null,
        closingDate: row.closing_date || null
      };
    } catch (error) {
      console.error('Error in createTransaction:', error);
      throw error;
    }
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    try {
      console.log('Database query - fetching transaction with ID:', id);

      // First check if transaction exists
      const existsCheck = await db.execute(sql`
        SELECT EXISTS(
          SELECT 1 FROM transactions WHERE id = ${id}
        );
      `);

      const exists = existsCheck.rows[0]?.exists;
      console.log('Transaction exists check:', exists);

      if (!exists) {
        console.log('Transaction not found with ID:', id);
        return undefined;
      }

      // If it exists, get the full transaction with explicit type casting
      const result = await db.execute(sql`
        SELECT 
          id::integer,
          address::text,
          access_code::text as "accessCode",
          status::text,
          agent_id::integer as "agentId",
          client_id::integer as "clientId",
          participants::jsonb,
          contract_price::numeric as "contractPrice",
          option_period::integer as "optionPeriod",
          option_fee::numeric as "optionFee",
          earnest_money::numeric as "earnestMoney",
          down_payment::numeric as "downPayment",
          seller_concessions::numeric as "sellerConcessions",
          closing_date::text as "closingDate"
        FROM transactions 
        WHERE id = ${id}
      `);

      if (result.rows.length === 0) {
        console.log('No rows returned for existing transaction:', id);
        return undefined;
      }

      const row = result.rows[0];
      console.log('Raw transaction data:', row);

      // Construct a properly typed transaction object
      const transaction: Transaction = {
        id: Number(row.id),
        address: String(row.address),
        accessCode: String(row.accessCode),
        status: String(row.status),
        agentId: Number(row.agentId),
        clientId: row.clientId ? Number(row.clientId) : null,
        participants: Array.isArray(row.participants) ? row.participants : [],
        contractPrice: row.contractPrice ? Number(row.contractPrice) : null,
        optionPeriod: row.optionPeriod ? Number(row.optionPeriod) : null,
        optionFee: row.optionFee ? Number(row.optionFee) : null,
        earnestMoney: row.earnestMoney ? Number(row.earnestMoney) : null,
        downPayment: row.downPayment ? Number(row.downPayment) : null,
        sellerConcessions: row.sellerConcessions ? Number(row.sellerConcessions) : null,
        closingDate: row.closingDate || null
      };

      console.log('Processed transaction:', transaction);
      return transaction;

    } catch (error) {
      console.error('Error in getTransaction:', error);
      return undefined;
    }
  }

  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          t.id::integer,
          t.address::text,
          t.access_code::text as "accessCode",
          t.status::text,
          t.agent_id::integer as "agentId",
          COALESCE(t.client_id, null)::integer as "clientId",
          t.participants::jsonb,
          t.contract_price::numeric as "contractPrice",
          t.option_period::integer as "optionPeriod",
          t.option_fee::numeric as "optionFee",
          t.earnest_money::numeric as "earnestMoney",
          t.down_payment::numeric as "downPayment",
          t.seller_concessions::numeric as "sellerConcessions",
          t.closing_date::text as "closingDate"
        FROM transactions t
        WHERE t.agent_id = ${userId}
        ORDER BY t.id DESC
      `);

      return result.rows.map(row => ({
        id: Number(row.id),
        address: String(row.address),
        accessCode: String(row.accessCode),
        status: String(row.status),
        agentId: Number(row.agentId),
        clientId: row.clientId ? Number(row.clientId) : null,
        participants: Array.isArray(row.participants) ? row.participants : [],
        contractPrice: row.contractPrice ? Number(row.contractPrice) : null,
        optionPeriod: row.optionPeriod ? Number(row.optionPeriod) : null,
        optionFee: row.optionFee ? Number(row.optionFee) : null,
        earnestMoney: row.earnestMoney ? Number(row.earnestMoney) : null,
        downPayment: row.downPayment ? Number(row.downPayment) : null,
        sellerConcessions: row.sellerConcessions ? Number(row.sellerConcessions) : null,
        closingDate: row.closingDate || null
      }));
    } catch (error) {
      console.error('Error in getTransactionsByUser:', error);
      return [];
    }
  }

  async updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction> {
    const result = await db
      .update(transactions)
      .set(data)
      .where(eq(transactions.id, id))
      .returning();
    return result[0];
  }

  async createChecklist(insertChecklist: InsertChecklist): Promise<Checklist> {
    try {
      const result = await db.execute(sql`
        INSERT INTO checklists (
          transaction_id,
          role,
          items
        ) VALUES (
          ${insertChecklist.transactionId},
          ${insertChecklist.role},
          ${JSON.stringify(insertChecklist.items)}::jsonb
        )
        RETURNING *
      `);

      const row = result.rows[0];
      return {
        id: Number(row.id),
        transactionId: Number(row.transaction_id),
        role: String(row.role),
        items: row.items
      };
    } catch (error) {
      console.error('Error in createChecklist:', error);
      throw error;
    }
  }

  async getChecklist(transactionId: number, role: string): Promise<Checklist | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          transaction_id as "transactionId",
          role,
          items
        FROM checklists 
        WHERE transaction_id = ${transactionId} AND role = ${role}
      `);

      if (result.rows.length === 0) {
        return undefined;
      }

      const row = result.rows[0];
      return {
        id: Number(row.id),
        transactionId: Number(row.transactionId),
        role: String(row.role),
        items: row.items
      };
    } catch (error) {
      console.error('Error in getChecklist:', error);
      return undefined;
    }
  }

  async updateChecklist(id: number, items: Checklist["items"]): Promise<Checklist> {
    try {
      const result = await db.execute(sql`
        UPDATE checklists
        SET items = ${JSON.stringify(items)}::jsonb
        WHERE id = ${id}
        RETURNING 
          id,
          transaction_id as "transactionId",
          role,
          items
      `);

      const row = result.rows[0];
      return {
        id: Number(row.id),
        transactionId: Number(row.transactionId),
        role: String(row.role),
        items: row.items
      };
    } catch (error) {
      console.error('Error in updateChecklist:', error);
      throw error;
    }
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    try {
      // Ensure transactionId is a number
      const transactionId = Number(insertMessage.transactionId);

      if (!transactionId || isNaN(transactionId)) {
        throw new Error('Transaction ID must be a valid number');
      }

      // First verify if the transaction exists
      const transactionCheck = await db.execute(sql`
        SELECT EXISTS(
          SELECT 1 FROM transactions 
          WHERE id = ${transactionId}
        );
      `);

      const transactionExists = transactionCheck.rows[0]?.exists;

      if (!transactionExists) {
        throw new Error(`Transaction with ID ${transactionId} does not exist`);
      }

      // Create the message
      const result = await db.execute(sql`
        INSERT INTO messages (
          transaction_id,
          user_id,
          username,
          role,
          content,
          timestamp
        ) VALUES (
          ${transactionId},
          ${insertMessage.userId},
          ${insertMessage.username},
          ${insertMessage.role},
          ${insertMessage.content},
          NOW()
        )
        RETURNING 
          id,
          transaction_id as "transactionId",
          user_id as "userId",
          username,
          role,
          content,
          timestamp::text
      `);

      if (!result.rows[0]) {
        throw new Error('Failed to create message');
      }

      const message = result.rows[0];

      // Return a properly typed message object
      return {
        id: Number(message.id),
        transactionId: Number(message.transactionId),
        userId: Number(message.userId),
        username: String(message.username),
        role: String(message.role),
        content: String(message.content),
        timestamp: String(message.timestamp)
      };

    } catch (error) {
      console.error('Error in createMessage:', error);
      throw error;
    }
  }

  async getMessages(transactionId?: number): Promise<Message[]> {
    try {
      const query = transactionId
        ? sql`
          SELECT * FROM messages 
          WHERE transaction_id = ${transactionId}
          ORDER BY timestamp ASC
        `
        : sql`
          SELECT * FROM messages 
          WHERE transaction_id IS NULL
          ORDER BY timestamp ASC
        `;

      const result = await db.execute(query);

      return result.rows.map(row => ({
        id: Number(row.id),
        transactionId: row.transaction_id ? Number(row.transaction_id) : null,
        userId: Number(row.user_id),
        username: String(row.username),
        role: String(row.role),
        content: String(row.content),
        timestamp: String(row.timestamp)
      }));
    } catch (error) {
      console.error('Error in getMessages:', error);
      return [];
    }
  }

  async getClientsByAgent(agentId: number): Promise<Client[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          first_name as "firstName",
          last_name as "lastName",
          email,
          phone,
          address,
          type,
          status,
          notes,
          agent_id as "agentId",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM clients 
        WHERE agent_id = ${agentId}
        ORDER BY created_at DESC
      `);

      return result.rows.map(row => ({
        id: Number(row.id),
        firstName: String(row.firstName),
        lastName: String(row.lastName),
        email: row.email ? String(row.email) : null,
        phone: row.phone ? String(row.phone) : null,
        address: row.address ? String(row.address) : null,
        type: String(row.type),
        status: String(row.status),
        notes: row.notes ? String(row.notes) : null,
        agentId: Number(row.agentId),
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
      }));
    } catch (error) {
      console.error('Error in getClientsByAgent:', error);
      return [];
    }
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    try {
      const [client] = await db.insert(clients).values({
        ...insertClient,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return client;
    } catch (error) {
      console.error('Error in createClient:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();