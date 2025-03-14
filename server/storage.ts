// Rename the local Document interface to avoid conflict
interface StorageDocument {
  id: number;
  name: string;
  status: 'not_applicable' | 'waiting_signatures' | 'signed' | 'waiting_others' | 'complete';
  transactionId: number;
  deadline: Date | null;
  deadlineTime: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  notes: string | null;
  clientId: number | null;
}

// Update Document type to use the imported one from schema.ts
import {
  users, transactions, checklists, messages, clients, documents,
  type User, type Transaction, type Checklist, type Message, type Client, type Document,
  type InsertUser, type InsertTransaction, type InsertChecklist, type InsertMessage, type InsertClient,
  type InsertDocument
} from "@shared/schema";
import { db } from "./db";
import { sql } from 'drizzle-orm/sql';
import session from 'express-session';
import MemoryStore from 'memorystore';

// Define ChecklistItem type to match the frontend
interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  phase: string;
}


export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;

  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionsByUser(userId: number): Promise<Transaction[]>;
  updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;

  // Document operations
  getDocumentsByTransaction(transactionId: number): Promise<Document[]>;
  getAllDocumentsByUser(userId: number): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, data: Partial<Document>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  // Other existing operations...
  sessionStore: session.Store;
  getClientsByAgent(agentId: number): Promise<Client[]>;
  createClient(insertClient: InsertClient): Promise<Client>;
  updateClient(id: number, data: Partial<Client>): Promise<Client>;
  deleteClient(clientId: number): Promise<void>;
  createChecklist(checklist: InsertChecklist): Promise<Checklist>;
  getChecklist(transactionId: number, role: string): Promise<Checklist | undefined>;
  updateChecklist(id: number, items: ChecklistItem[]): Promise<Checklist>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(transactionId?: number): Promise<Message[]>;
  getContactsByTransaction(transactionId: number): Promise<any[]>;
  deleteContact(id: number): Promise<boolean>;
  createContact(data: any): Promise<any>;
  updateContact(id: number, data: Partial<any>): Promise<any>;

}

const MemoryStoreSession = MemoryStore(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  private BUYER_CHECKLIST_ITEMS: ChecklistItem[];
  private SELLER_CHECKLIST_ITEMS: ChecklistItem[];

  constructor() {
    this.sessionStore = new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    });

    // Initialize checklist items
    this.SELLER_CHECKLIST_ITEMS = [
      // Pre-Listing Preparation
      { id: "assess-value", text: "Assess Home Value: Hire a real estate appraiser or use online tools to determine a competitive listing price", phase: "Pre-Listing Preparation", completed: false },
      { id: "home-inspection", text: "Conduct pre-listing inspection to identify any issues that might need fixing before listing", phase: "Pre-Listing Preparation", completed: false },
      { id: "repairs", text: "Make necessary repairs or upgrades based on inspection. Focus on high-impact areas like kitchens and bathrooms", phase: "Pre-Listing Preparation", completed: false },
      { id: "declutter", text: "Remove personal items and declutter to make the home more appealing to potential buyers", phase: "Pre-Listing Preparation", completed: false },
      { id: "staging", text: "Either stage the home yourself or hire a professional to enhance its appeal", phase: "Pre-Listing Preparation", completed: false },
      { id: "curb-appeal", text: "Enhance the exterior; mow the lawn, plant flowers, paint the front door if needed", phase: "Pre-Listing Preparation", completed: false },

      // Listing Phase
      { id: "select-agent", text: "Choose an agent with good local market knowledge and successful sales records", phase: "Listing Phase", completed: false },
      { id: "photos", text: "Invest in high-quality photos and possibly a virtual tour for online listings", phase: "Listing Phase", completed: false },
      { id: "listing-desc", text: "Write a compelling listing: Highlight unique features, recent upgrades, and neighborhood attractions", phase: "Listing Phase", completed: false },
      { id: "showings", text: "Coordinate with your agent for open houses and private showings, ensuring the home is always ready", phase: "Listing Phase", completed: false },

      // Offer and Negotiation
      { id: "review-offers", text: "Analyze each offer with your agent, focusing on price, contingencies, and the buyer's financial status", phase: "Offer and Negotiation", completed: false },
      { id: "counter-offers", text: "Be prepared to negotiate; consider terms beyond just price, like closing dates or included furnishings", phase: "Offer and Negotiation", completed: false },
      { id: "accept-offer", text: "Once you agree on terms, sign the purchase agreement", phase: "Offer and Negotiation", completed: false },

      // Post-Acceptance
      { id: "appraisal", text: "Coordinate with the buyer's lender for the appraisal. Be ready to address any discrepancies if the appraisal comes in low", phase: "Post-Acceptance", completed: false },
      { id: "buyer-inspection", text: "Allow for the buyer's inspection, and be open to negotiating repairs or price adjustments", phase: "Post-Acceptance", completed: false },
      { id: "disclosures", text: "Complete and provide all necessary property disclosure documents about known defects or issues", phase: "Post-Acceptance", completed: false },
      { id: "title-search", text: "Ensure there are no liens or issues with the title that could delay or derail the sale", phase: "Post-Acceptance", completed: false },

      // Closing Preparation
      { id: "cancel-utilities", text: "Arrange to cancel or transfer utilities like water, gas, and electricity on the closing date", phase: "Closing Preparation", completed: false },
      { id: "moving-prep", text: "Schedule movers or plan your move. Consider packing non-essential items early", phase: "Closing Preparation", completed: false },
      { id: "final-walkthrough", text: "Agree to a time for the buyer's final walkthrough, usually 24-48 hours before closing", phase: "Closing Preparation", completed: false },

      // Closing
      { id: "review-docs", text: "Go over all documents with your agent or attorney to ensure everything is correct", phase: "Closing", completed: false },
      { id: "sign-docs", text: "Attend the closing either in person or via electronic means if permitted", phase: "Closing", completed: false },
      { id: "hand-over-keys", text: "After receiving payment confirmation, provide keys and garage door openers to the new owner", phase: "Closing", completed: false },

      // Post-Closing
      { id: "change-address", text: "Update your address with banks, employers, subscriptions, etc", phase: "Post-Closing", completed: false },
      { id: "complete-move", text: "Ensure all personal belongings are moved out, and the house is left in agreed-upon condition", phase: "Post-Closing", completed: false }
    ];

    this.BUYER_CHECKLIST_ITEMS = [
      { id: "buying-criteria", text: "Determine buying criteria", phase: "Pre-Offer", completed: false },
      { id: "hire-agent", text: "Hire a real estate agent", phase: "Pre-Offer", completed: false },
      { id: "get-preapproval", text: "Hire a lender & get pre-approved", phase: "Pre-Offer", completed: false },
    ];
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT id, email, password, first_name as "firstName", 
               last_name as "lastName", role, agent_id as "agentId",
               claimed_transaction_id as "claimedTransactionId",
               claimed_access_code as "claimedAccessCode"
        FROM users 
        WHERE id = ${id}
      `);

      if (result.rows.length === 0) {
        console.log('No user found with ID:', id);
        return undefined;
      }

      const user = result.rows[0];
      return {
        id: Number(user.id),
        email: String(user.email),
        password: String(user.password),
        firstName: String(user.firstName),
        lastName: String(user.lastName),
        role: String(user.role),
        agentId: user.agentId ? Number(user.agentId) : null,
        claimedTransactionId: user.claimedTransactionId ? Number(user.claimedTransactionId) : null,
        claimedAccessCode: user.claimedAccessCode ? String(user.claimedAccessCode) : null
      };
    } catch (error) {
      console.error('Error in getUser:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(sql`email = ${email}`);
      if (!user) {
        console.log('No user found with email:', email);
        return undefined;
      }

      return {
        id: Number(user.id),
        email: String(user.email),
        password: String(user.password),
        firstName: String(user.firstName),
        lastName: String(user.lastName),
        role: String(user.role),
        agentId: user.agentId ? Number(user.agentId) : null,
        claimedTransactionId: user.claimedTransactionId ? Number(user.claimedTransactionId) : null,
        claimedAccessCode: user.claimedAccessCode ? String(user.claimedAccessCode) : null
      };
    } catch (error) {
      console.error('Error in getUserByEmail:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Validate required fields
      if (!insertUser.email || !insertUser.password) {
        throw new Error('Email and password are required');
      }

      const [user] = await db
        .insert(users)
        .values({
          email: insertUser.email,
          password: insertUser.password,
          firstName: insertUser.firstName,
          lastName: insertUser.lastName,
          role: insertUser.role || 'user',
          agentId: null,
          claimedTransactionId: null,
          claimedAccessCode: null
        })
        .returning();

      if (!user) {
        throw new Error('Failed to create user');
      }

      return {
        id: Number(user.id),
        email: String(user.email),
        password: String(user.password),
        firstName: String(user.firstName),
        lastName: String(user.lastName),
        role: String(user.role),
        agentId: user.agentId ? Number(user.agentId) : null,
        claimedTransactionId: user.claimedTransactionId ? Number(user.claimedTransactionId) : null,
        claimedAccessCode: user.claimedAccessCode ? String(user.claimedAccessCode) : null
      };
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  async getTransactionByAccessCode(accessCode: string): Promise<Transaction | null> {
    try {
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(sql`access_code = ${accessCode}`);
      return transaction || null;
    } catch (error) {
      console.error('Error in getTransactionByAccessCode:', error);
      return null;
    }
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    try {
      console.log('Creating transaction with data:', insertTransaction);
      const result = await db.execute(sql`
        INSERT INTO transactions (
          street_name,
          city,
          state,
          zip_code,
          access_code,
          status,
          type,
          agent_id,
          client_id,
          participants
        ) VALUES (
          ${insertTransaction.streetName},
          ${insertTransaction.city},
          ${insertTransaction.state},
          ${insertTransaction.zipCode},
          ${insertTransaction.accessCode},
          ${insertTransaction.status || 'prospect'},
          ${insertTransaction.type || 'buy'},
          ${insertTransaction.agentId},
          ${insertTransaction.clientId || null},
          ${JSON.stringify(insertTransaction.participants || [])}::jsonb
        )
        RETURNING *
      `);

      console.log('Database result:', result.rows[0]);

      if (!result.rows[0]) {
        throw new Error('Failed to create transaction');
      }

      const row = result.rows[0];
      const transaction = {
        id: Number(row.id),
        streetName: String(row.street_name),
        city: String(row.city),
        state: String(row.state),
        zipCode: String(row.zip_code),
        accessCode: String(row.access_code),
        status: String(row.status),
        type: String(row.type),
        agentId: Number(row.agent_id),
        clientId: row.client_id ? Number(row.client_id) : null,
        participants: Array.isArray(row.participants) ? row.participants : [],
        contractPrice: row.contract_price ? Number(row.contract_price) : null,
        optionPeriodExpiration: row.option_period_expiration ? new Date(row.option_period_expiration) : null,
        optionFee: row.option_fee ? Number(row.option_fee) : null,
        earnestMoney: row.earnest_money ? Number(row.earnest_money) : null,
        downPayment: row.down_payment ? Number(row.down_payment) : null,
        sellerConcessions: row.seller_concessions ? Number(row.seller_concessions) : null,
        closingDate: row.closing_date ? new Date(row.closing_date) : null,
        contractExecutionDate: row.contract_execution_date ? new Date(row.contract_execution_date) : null,
        mlsNumber: row.mls_number || null,
        financing: row.financing || null
      };

      console.log('Returning transaction:', transaction);
      return transaction;
    } catch (error) {
      console.error('Error in createTransaction:', error);
      throw error;
    }
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    try {
      if (!id || isNaN(id)) {
        console.log('Invalid transaction ID provided:', id);
        return undefined;
      }

      console.log('Fetching transaction with ID:', id);
      const result = await db.execute(sql`
        SELECT 
          id,
          street_name as "streetName",
          city,
          state,
          zip_code as "zipCode",
          access_code as "accessCode",
          status,
          type,
          agent_id as "agentId",
          client_id as "clientId",
          participants,
          contract_price as "contractPrice",
          option_period_expiration as "optionPeriodExpiration",
          option_fee as "optionFee",
          earnest_money as "earnestMoney",
          down_payment as "downPayment",
          seller_concessions as "sellerConcessions",
          closing_date as "closingDate",
          contract_execution_date as "contractExecutionDate",
          mls_number as "mlsNumber",
          financing,
          updated_at as "updatedAt"
        FROM transactions 
        WHERE id = ${id}
      `);

      console.log('Query result:', result.rows);

      if (!result.rows || result.rows.length === 0) {
        console.log('No transaction found with ID:', id);
        return undefined;
      }

      const row = result.rows[0];
      const transaction: Transaction = {
        id: Number(row.id),
        streetName: String(row.streetName),
        city: String(row.city),
        state: String(row.state),
        zipCode: String(row.zipCode),
        accessCode: String(row.accessCode),
        status: String(row.status),
        type: String(row.type),
        agentId: Number(row.agentId),
        clientId: row.clientId ? Number(row.clientId) : null,
        participants: Array.isArray(row.participants) ? row.participants : [],
        contractPrice: row.contractPrice ? Number(row.contractPrice) : null,
        optionPeriodExpiration: row.optionPeriodExpiration ? new Date(row.optionPeriodExpiration) : null,
        optionFee: row.optionFee ? Number(row.optionFee) : null,
        earnestMoney: row.earnestMoney ? Number(row.earnestMoney) : null,
        downPayment: row.downPayment ? Number(row.downPayment) : null,
        sellerConcessions: row.sellerConcessions ? Number(row.sellerConcessions) : null,
        closingDate: row.closingDate ? new Date(row.closingDate) : null,
        contractExecutionDate: row.contractExecutionDate ? new Date(row.contractExecutionDate) : null,
        mlsNumber: row.mlsNumber || null,
        financing: row.financing || null,
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
      };

      console.log('Processed transaction:', transaction);
      return transaction;

    } catch (error) {
      console.error('Error in getTransaction:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      throw error;
    }
  }

  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    try {
      console.log('Fetching transactions for user:', userId);
      const result = await db.execute(sql`
        SELECT 
          t.id::integer,
          t.street_name::text as "streetName",
          t.city::text,
          t.state::text,
          t.zip_code::text as "zipCode",
          t.access_code::text as "accessCode",
          t.status::text,
          t.type::text,
          t.agent_id::integer as "agentId",
          COALESCE(t.client_id, null)::integer as "clientId",
          t.participants::jsonb,
          t.contract_price::numeric as "contractPrice",
          t.option_period_expiration::timestamptz as "optionPeriodExpiration",
          t.option_fee::numeric as "optionFee",
          t.earnest_money::numeric as "earnestMoney",
          t.down_payment::numeric as "downPayment",
          t.seller_concessions::numeric as "sellerConcessions",
          t.closing_date::timestamptz as "closingDate",
          t.contract_execution_date::timestamptz as "contractExecutionDate",
          t.mls_number as "mlsNumber",
          t.financing,
          t.updated_at::timestamptz as "updatedAt"
        FROM transactions t
        WHERE t.agent_id = ${userId}
        ORDER BY t.id DESC
      `);

      console.log('Found transactions:', result.rows);

      return result.rows.map(row => ({
        id: Number(row.id),
        streetName: String(row.streetName),
        city: String(row.city),
        state: String(row.state),
        zipCode: String(row.zipCode),
        accessCode: String(row.accessCode),
        status: String(row.status),
        type: String(row.type),
        agentId: Number(row.agentId),
        clientId: row.clientId ? Number(row.clientId) : null,
        participants: Array.isArray(row.participants) ? row.participants : [],
        contractPrice: row.contractPrice ? Number(row.contractPrice) : null,
        optionPeriodExpiration: row.optionPeriodExpiration ? new Date(row.optionPeriodExpiration) : null,
        optionFee: row.optionFee ? Number(row.optionFee) : null,
        earnestMoney: row.earnestMoney ? Number(row.earnestMoney) : null,
        downPayment: row.downPayment ? Number(row.downPayment) : null,
        sellerConcessions: row.sellerConcessions ? Number(row.sellerConcessions) : null,
        closingDate: row.closingDate ? new Date(row.closingDate) : null,
        contractExecutionDate: row.contractExecutionDate ? new Date(row.contractExecutionDate) : null,
        mlsNumber: row.mlsNumber || null,
        financing: row.financing || null,
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
      }));
    } catch (error) {
      console.error('Error in getTransactionsByUser:', error);
      throw error;
    }
  }

  async updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction> {
    try {
      const cleanData: Record<string, any> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          // Convert camelCase to snake_case for SQL
          const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

          // Handle date fields consistently
          if (['closing_date', 'contract_execution_date', 'option_period_expiration'].includes(snakeKey)) {
            console.log(`Processing date field ${snakeKey}:`, value);
            if (value) {
              const date = new Date(value);
              date.setUTCHours(12, 0, 0, 0);
              console.log(`Converted date for ${snakeKey}:`, date.toISOString());
              cleanData[snakeKey] = date.toISOString();
            } else {
              cleanData[snakeKey] = null;
            }
          } else if (key === 'participants' && Array.isArray(value)) {
            cleanData[snakeKey] = JSON.stringify(value);
          } else if (value === null) {
            cleanData[snakeKey] = null;
          } else {
            cleanData[snakeKey] = value;
          }
        }
      });

      console.log('Clean data for SQL update:', cleanData);

      // Create SET clause for SQL update
      const setColumns = Object.entries(cleanData).map(([key, value]) => {
        if (value === null) {
          return sql`${sql.identifier([key])} = NULL`;
        }
        if (key === 'participants') {
          return sql`${sql.identifier([key])} = ${value}::jsonb`;
        }
        if (['closing_date', 'contract_execution_date', 'option_period_expiration'].includes(key)) {
          return sql`${sql.identifier([key])} = ${value}::timestamptz`;
        }
        return sql`${sql.identifier([key])} = ${value}`;
      });

      const result = await db.execute(sql`
        UPDATE transactions
        SET ${sql.join(setColumns, sql`, `)}
        WHERE id = ${id}
        RETURNING *
      `);

      if (!result.rows[0]) {
        throw new Error('Failed to update transaction');
      }

      const row = result.rows[0];
      return {
        id: Number(row.id),
        address: String(row.address),
        accessCode: String(row.access_code),
        status: String(row.status),
        type: String(row.type),
        agentId: Number(row.agent_id),
        clientId: row.clientId ? Number(row.client_id) : null,
        participants: Array.isArray(row.participants) ? row.participants : [],
        contractPrice: row.contract_price ? Number(row.contract_price) : null,
        optionPeriod: row.option_period ? Number(row.option_period) : null,
        optionFee: row.option_fee ? Number(row.option_fee) : null,
        earnestMoney: row.earnest_money ? Number(row.earnest_money) : null,
        downPayment: row.down_payment ? Number(row.down_payment) : null,
        sellerConcessions: row.seller_concessions ? Number(row.seller_concessions) : null,
        closingDate: row.closing_date ? new Date(row.closing_date).toISOString() : null,
        contractExecutionDate: row.contract_execution_date ? new Date(row.contract_execution_date).toISOString() : null,
        optionPeriodExpiration: row.option_period_expiration ? new Date(row.option_period_expiration).toISOString() : null,
        mlsNumber: row.mls_number || null,
        financing: row.financing || null
      };
    } catch (error) {
      console.error('Error in updateTransaction:', error);
      throw error;
    }
  }

  async createChecklist(insertChecklist: InsertChecklist): Promise<Checklist> {
    try {
      // First check if a checklist already exists
      const existingChecklist = await this.getChecklist(
        insertChecklist.transactionId,
        insertChecklist.role
      );

      if (existingChecklist) {
        return existingChecklist;
      }

      // Get the transaction to check its type
      const transaction = await this.getTransaction(insertChecklist.transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Get the appropriate checklist items based on transaction type
      const defaultItems = transaction.type === 'sell' ?
        this.SELLER_CHECKLIST_ITEMS :
        this.BUYER_CHECKLIST_ITEMS;

      const result = await db.execute(sql`
        INSERT INTO checklists (
          transaction_id,
          role,
          items
        ) VALUES (
          ${insertChecklist.transactionId},
          ${insertChecklist.role},
          ${JSON.stringify(defaultItems)}::jsonb
        )
        RETURNING *
      `);

      const row = result.rows[0];
      return {
        id: Number(row.id),
        transactionId: Number(row.transaction_id),
        role: String(row.role),
        items: row.items as ChecklistItem[]
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
      const items = row.items as ChecklistItem[];

      return {
        id: Number(row.id),
        transactionId: Number(row.transactionId),
        role: String(row.role),
        items: items
      };
    } catch (error) {
      console.error('Error in getChecklist:', error);
      return undefined;
    }
  }

  async updateChecklist(id: number, items: ChecklistItem[]): Promise<Checklist> {
    try {
      console.log('Starting updateChecklist with:', { id, items });

      if (!id || isNaN(id)) {
        throw new Error('Invalid checklist ID');
      }

      if (!Array.isArray(items)) {
        throw new Error('Items must be an array');
      }

      // Validate each item in the array
      items.forEach(item => {
        if (!item.id || typeof item.text !== 'string' || typeof item.completed !== 'boolean' || !item.phase) {
          throw new Error('Invalid checklist item format');
        }
      });

      // First verify if the checklist exists
      const existingChecklist = await db.execute(sql`
        SELECT id FROM checklists WHERE id = ${id}
      `);

      if (!existingChecklist.rows.length) {
        throw new Error('Checklist not found');
      }

      // Update the checklist items
      const result = await db.execute(sql`
        UPDATE checklists 
        SET items = ${JSON.stringify(items)}::jsonb
        WHERE id = ${id}
        RETURNING id, transaction_id, role, items
      `);

      if (!result.rows[0]) {
        throw new Error('Failed to update checklist');
      }

      const row = result.rows[0];
      return {
        id: Number(row.id),
        transactionId: Number(row.transaction_id),
        role: String(row.role),
        items: row.items as ChecklistItem[]
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

  async getContactsByTransaction(transactionId: number) {
    try {
      const result = await db.execute(sql`
        SELECT * FROM contacts WHERE transaction_id = ${transactionId}
      `);

      return result.rows.map(row => ({
        id: row.id,
        role: row.role,
        firstName: row.firstname,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        mobilePhone: row.mobile_phone,
        transactionId: row.transaction_id
      }));
    } catch (error) {
      console.error('Error in getContactsByTransaction:', error);
      throw error;
    }
  }

  async deleteContact(id: number) {
        try {      const result = await db.execute(sql`        DELETE FROM contacts WHERE id = ${id} RETURNING id
      `);
      if (!result.rows[0]) {
        throw new Error('Contact not found');
      }
      return true;
    } catch (error) {
      console.error('Error in deleteContact:', error);
      throw error;
    }
  }

  async createContact(data: any) {
    try {
      if (!data.role || !data.firstName || !data.lastName || !data.email || !data.transactionId) {
        throw new Error('Missing required fields');
      }

      const transactionExists = await db.execute(sql`
        SELECT EXISTS(SELECT 1 FROM transactions WHERE id =${data.transactionId})
      `);

      if (!transactionExists.rows[0].exists) {
        throw new Error('Transaction not found');
      }

            const result = await db.execute(sql`
        INSERT INTO contacts (
          role,
          first_name,
          last_name,
          email,
          phone,
          mobile_phone,
          transaction_id,
          client_id
        ) VALUES (
          ${data.role},
          ${data.firstName},
          ${data.lastName},
          ${data.email},
          ${data.phone || null},
          ${data.mobilePhone || null},
          ${data.transactionId},
          ${data.clientId || null}
        ) RETURNING *
      `);

      if (!result.rows[0]) {
        throw new Error('Failed to create contact');
      }

      return {
        id: result.rows[0].id,
        role: result.rows[0].role,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        email: result.rows[0].email,
        phone: result.rows[0].phone,
        mobilePhone: result.rows[0].mobile_phone,
        transactionId: result.rows[0].transaction_id,
        clientId: result.rows[0].client_id
      };
    } catch (error) {
      console.error('Error in createContact:', error);
      throw error;
    }
  }

  async updateContact(id: number, data: Partial<Contact>): Promise<Contact> {
    try {
            const result = await db.execute(sql`
        UPDATE contacts 
        SET 
          role = COALESCE(${data.role}, role),
          first_name = COALESCE(${data.firstName}, first_name),
          last_name = COALESCE(${data.lastName}, last_name),
          email = COALESCE(${data.email}, email),
          phone = COALESCE(${data.phone}, phone),
          mobile_phone = COALESCE(${data.mobilePhone}, mobile_phone),
          client_id = COALESCE(${data.clientId}, client_id)
        WHERE id = ${id}
        RETURNING *
      `);

      if (!result.rows[0]) {
        throw new Error('Contact not found');
      }

      return {
        id: result.rows[0].id,
        role: result.rows[0].role,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        email: result.rows[0].email,
        phone: result.rows[0].phone,
        mobilePhone: result.rows[0].mobile_phone,
        transactionId: result.rows[0].transaction_id,
        clientId: result.rows[0].client_id
      };
    } catch (error) {
      console.error('Error in updateContact:', error);
      throw error;
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
          labels,
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
        labels: Array.isArray(row.labels) ? row.labels : [],
        agentId: Number(row.agentId),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      }));
    } catch (error) {
      console.error('Error in getClientsByAgent:', error);
      return [];
    }
  }

  async deleteClient(clientId: number): Promise<void> {
    try {
      await db.delete(clients).where(sql`id = ${clientId}`);
    } catch (error) {
      console.error('Error in deleteClient:', error);
      throw error;
    }
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    try {
      // Ensure labels is always an array
      const labels = Array.isArray(insertClient.labels) 
        ? insertClient.labels 
        : insertClient.labels 
          ? [insertClient.labels] 
          : [];

      const [client] = await db
        .insert(clients)
        .values({
          ...insertClient,
          labels,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (!client) {
        throw new Error('Failed to create client record');
      }

      return {
        id: Number(client.id),
        firstName: String(client.firstName),
        lastName: String(client.lastName),
        email: client.email ? String(client.email) : null,
        phone: client.phone ? String(client.phone) : null,
        address: client.address ? String(client.address) : null,
        type: String(client.type),
        status: String(client.status),
        notes: client.notes ? String(client.notes) : null,
        labels: Array.isArray(client.labels) ? client.labels : [],
        agentId: Number(client.agentId),
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
      };
    } catch (error) {
      console.error('Error in createClient:', error);
      throw error;
    }
  }

  async getDocumentsByTransaction(transactionId: number): Promise<Document[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          name,
          status,
          transaction_id as "transactionId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          deadline,
          deadline_time as "deadlineTime",
          notes,
          client_id as "clientId"
        FROM documents 
        WHERE transaction_id = ${transactionId}
        ORDER BY created_at ASC
      `);

      return result.rows.map(doc => ({
        id: Number(doc.id),
        name: String(doc.name),
        status: doc.status as Document['status'],
        transactionId: Number(doc.transactionId),
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt),
        deadline: doc.deadline ? new Date(doc.deadline) : null,
        deadlineTime: doc.deadlineTime ? String(doc.deadlineTime) : null,
        notes: doc.notes ? String(doc.notes) : null,
        clientId: doc.clientId ? Number(doc.clientId) : null
      }));
    } catch (error) {
      console.error('Error in getDocumentsByTransaction:', error);
      return [];
    }
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    try {
      const [doc] = await db
        .insert(documents)
        .values({
          name: document.name,
          status: document.status,
          transactionId: document.transactionId,
          deadline: document.deadline ? new Date(document.deadline) : null,
          deadlineTime: document.deadlineTime,
          notes: document.notes,
          clientId: document.clientId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (!doc) {
        throw new Error('Failed to create document');
      }

      return {
        id: Number(doc.id),
        name: String(doc.name),
        status: doc.status,
        transactionId: Number(doc.transactionId),
        deadline: doc.deadline ? new Date(doc.deadline) : null,
        deadlineTime: doc.deadlineTime ? String(doc.deadlineTime) : null,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : null,
        notes: doc.notes ? String(doc.notes) : null,
        clientId: doc.clientId ? Number(doc.clientId) : null
      };
    } catch (error) {
      console.error('Error in createDocument:', error);
      throw error;
    }
  }

  async updateDocument(id: string, data: Partial<Document>): Promise<Document> {
    try {
      const updateData: Record<string, any> = {};

      // Convert all fields to their proper types
      if (data.name !== undefined) updateData.name = String(data.name);
      if (data.status !== undefined) updateData.status = data.status;
      if (data.transactionId !== undefined) updateData.transaction_id = Number(data.transactionId);
      if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
      if (data.deadlineTime !== undefined) updateData.deadline_time = data.deadlineTime;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.clientId !== undefined) updateData.client_id = data.clientId ? Number(data.clientId) : null;
      updateData.updated_at = new Date();

      const [doc] = await db
        .update(documents)
        .set(updateData)
        .where(sql`id = ${id}`)
        .returning();

      if (!doc) {
        throw new Error('Document not found');
      }

      return {
        id: Number(doc.id),
        name: String(doc.name),
        status: doc.status,
        transactionId: Number(doc.transactionId),
        deadline: doc.deadline ? new Date(doc.deadline) : null,
        deadlineTime: doc.deadlineTime ? String(doc.deadlineTime) : null,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : null,
        notes: doc.notes ? String(doc.notes) : null,
        clientId: doc.clientId ? Number(doc.clientId) : null
      };
    } catch (error) {
      console.error('Error in updateDocument:', error);
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      await db
        .delete(documents)
        .where(sql`id = ${id}`);
    } catch (error) {
      console.error('Error in deleteDocument:', error);
      throw error;
    }
  }

  async deleteTransaction(id: number): Promise<void> {
    try {
      await db.execute(sql`
        DELETE FROM transactions 
        WHERE id = ${id}
      `);
    } catch (error) {
      console.error('Error in deleteTransaction:', error);
      throw error;
    }
  }
  async getDocument(id: string): Promise<Document | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM documents WHERE id = ${id}
      `);

      if (!result.rows[0]) return undefined;

      const doc = result.rows[0];
      return {
        id: Number(doc.id),
        name: String(doc.name),
        status: doc.status as Document['status'],
        transactionId: Number(doc.transaction_id),
        deadline: doc.deadline ? new Date(doc.deadline) : null,
        deadlineTime: doc.deadline_time ? String(doc.deadline_time) : null,
        createdAt: doc.created_at ? new Date(doc.created_at) : null,
        updatedAt: doc.updated_at ? new Date(doc.updated_at) : null,
        notes: doc.notes ? String(doc.notes) : null,
        clientId: doc.client_id ? Number(doc.client_id) : null
      };
    } catch (error) {
      console.error('Error in getDocument:', error);
      return undefined;
    }
  }

  async getAllDocumentsByUser(userId: number): Promise<Document[]> {
    try {
      const result = await db.execute(sql`
        SELECT d.* 
        FROM documents d
        JOIN transactions t ON d.transaction_id = t.id
        WHERE t.agent_id = ${userId}
      `);

      return result.rows.map(doc => ({
        id: Number(doc.id),
        name: String(doc.name),
        status: doc.status as Document['status'],
        transactionId: Number(doc.transaction_id),
        deadline: doc.deadline ? new Date(doc.deadline) : null,
        deadlineTime: doc.deadline_time ? String(doc.deadline_time) : null,
        createdAt: doc.created_at ? new Date(doc.created_at) : null,
        updatedAt: doc.updated_at ? new Date(doc.updated_at) : null,
        notes: doc.notes ? String(doc.notes) : null,
        clientId: doc.client_id ? Number(doc.client_id) : null
      }));
    } catch (error) {
      console.error('Error in getAllDocumentsByUser:', error);
      return [];
    }
  }

  async getDocumentsByTransaction(transactionId: number): Promise<Document[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM documents WHERE transaction_id = ${transactionId}
      `);

      return result.rows.map(doc => ({
        id: Number(doc.id),
        name: String(doc.name),
        status: doc.status as Document['status'],
        transactionId: Number(doc.transaction_id),
        deadline: doc.deadline ? new Date(doc.deadline) : null,
        deadlineTime: doc.deadline_time ? String(doc.deadline_time) : null,
        createdAt: doc.created_at ? new Date(doc.created_at) : null,
        updatedAt: doc.updated_at ? new Date(doc.updated_at) : null,
        notes: doc.notes ? String(doc.notes) : null,
        clientId: doc.client_id ? Number(doc.client_id) : null
      }));
    } catch (error) {
      console.error('Error in getDocumentsByTransaction:', error);
      return [];
    }
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    try {
      const [doc] = await db
        .insert(documents)
        .values({
          name: document.name,
          status: document.status,
          transactionId: document.transactionId,
          deadline: document.deadline ? new Date(document.deadline) : null,
          deadlineTime: document.deadlineTime,
          notes: document.notes,
          clientId: document.clientId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (!doc) {
        throw new Error('Failed to create document');
      }

      return {
        id: Number(doc.id),
        name: String(doc.name),
        status: doc.status,
        transactionId: Number(doc.transactionId),
        deadline: doc.deadline ? new Date(doc.deadline) : null,
        deadlineTime: doc.deadlineTime ? String(doc.deadlineTime) : null,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : null,
        notes: doc.notes ? String(doc.notes) : null,
        clientId: doc.clientId ? Number(doc.clientId) : null
      };
    } catch (error) {
      console.error('Error in createDocument:', error);
      throw error;
    }
  }

  async updateDocument(id: string, data: Partial<Document>): Promise<Document> {
    try {
      const updateData: Record<string, any> = {};

      // Convert all fields to their proper types
      if (data.name !== undefined) updateData.name = String(data.name);
      if (data.status !== undefined) updateData.status = data.status;
      if (data.transactionId !== undefined) updateData.transaction_id = Number(data.transactionId);
      if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
      if (data.deadlineTime !== undefined) updateData.deadline_time = data.deadlineTime;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.clientId !== undefined) updateData.client_id = data.clientId ? Number(data.clientId) : null;
      updateData.updated_at = new Date();

      const [doc] = await db
        .update(documents)
        .set(updateData)
        .where(sql`id = ${id}`)
        .returning();

      if (!doc) {
        throw new Error('Document not found');
      }

      return {
        id: Number(doc.id),
        name: String(doc.name),
        status: doc.status,
        transactionId: Number(doc.transactionId),
        deadline: doc.deadline ? new Date(doc.deadline) : null,
        deadlineTime: doc.deadlineTime ? String(doc.deadlineTime) : null,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : null,
        notes: doc.notes ? String(doc.notes) : null,
        clientId: doc.clientId ? Number(doc.clientId) : null
      };
    } catch (error) {
      console.error('Error in updateDocument:', error);
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      await db
        .delete(documents)
        .where(sql`id = ${id}`);
    } catch (error) {
      console.error('Error in deleteDocument:', error);
      throw error;
    }
  }

  async updateClient(id: number, data: Partial<Client>): Promise<Client> {
    try {
      // First check if client exists
      const existingClient = await db.execute(sql`
        SELECT EXISTS(SELECT 1 FROM clients WHERE id = ${id})
      `);

      if (!existingClient.rows[0]?.exists) {
        throw new Error(`Client with ID ${id} not found`);
      }

      // Create a sanitized version of the data
      const sanitizedData = { ...data };
      

      // Special handling for labels array
      if ('labels' in sanitizedData) {
        const labelsArray = Array.isArray(sanitizedData.labels) 
          ? sanitizedData.labels.filter(label => typeof label === 'string' && label.trim().length > 0)
          : [];
        

        await db.execute(sql`
          UPDATE clients 
          SET labels = array[${sql.join(labelsArray, sql`, `)}]::text[]
          WHERE id = ${id}
        `);
        delete sanitizedData.labels;
      }

      // Handle remaining fields
      const updateParts = [];
      Object.entries(sanitizedData).forEach(([key, value]) => {
        if (value !== undefined && key !== 'updatedAt') {
          const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          

          if (value === null) {
            updateParts.push(sql`${sql.identifier([snakeKey])} = NULL`);
          } else {
            updateParts.push(sql`${sql.identifier([snakeKey])} = ${value}`);
          }
        }
      });

      // Add single updated_at timestamp
      updateParts.push(sql`updated_at = CURRENT_TIMESTAMP`);

      // Execute the update query
      const result = await db.execute(sql`
        UPDATE clients
        SET ${sql.join(updateParts, sql`, `)}
        WHERE id = ${id}
        RETURNING 
          id,
          first_name as "firstName",
          last_name as "lastName",
          email,
          phone,
          address,
          type,
          status,
          notes,
          labels,
          agent_id as "agentId",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `);

      if (!result.rows[0]) {
        throw new Error('Failed to update client');
      }

      const row = result.rows[0];
      return {
        id: Number(row.id),
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        address: row.address,
        type: String(row.type),
        status: String(row.status),
        notes: row.notes,
        labels: Array.isArray(row.labels) ? row.labels : [],
        agentId: Number(row.agentId),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };
    } catch (error) {
      console.error('Error in updateClient:', error);
      throw error;
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
          labels,
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
        labels: Array.isArray(row.labels) ? row.labels : [],
        agentId: Number(row.agentId),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      }));
    } catch (error) {
      console.error('Error in getClientsByAgent:', error);
      return [];
    }
  }

  async deleteClient(clientId: number): Promise<void> {
    try {
      await db.delete(clients).where(sql`id = ${clientId}`);
    } catch (error) {
      console.error('Error in deleteClient:', error);
      throw error;
    }
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    try {
      // Ensure labels is always an array
      const labels = Array.isArray(insertClient.labels) 
        ? insertClient.labels 
        : insertClient.labels 
          ? [insertClient.labels] 
          : [];

      const [client] = await db
        .insert(clients)
        .values({
          ...insertClient,
          labels,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (!client) {
        throw new Error('Failed to create client record');
      }

      return {
        id: Number(client.id),
        firstName: String(client.firstName),
        lastName: String(client.lastName),
        email: client.email ? String(client.email) : null,
        phone: client.phone ? String(client.phone) : null,
        address: client.address ? String(client.address) : null,
        type: String(client.type),
        status: String(client.status),
        notes: client.notes ? String(client.notes) : null,
        labels: Array.isArray(client.labels) ? client.labels : [],
        agentId: Number(client.agentId),
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
      };
    } catch (error) {
      console.error('Error in createClient:', error);
      throw error;
    }
  }

  async getDocumentsByTransaction(transactionId: number): Promise<Document[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          name,
          status,
          transaction_id as "transactionId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          deadline,
          deadline_time as "deadlineTime",
          notes,
          client_id as "clientId"
        FROM documents 
        WHERE transaction_id = ${transactionId}
        ORDER BY created_at ASC
      `);

      return result.rows.map(doc => ({
        id: Number(doc.id),
        name: String(doc.name),
        status: doc.status as Document['status'],
        transactionId: Number(doc.transactionId),
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt),
        deadline: doc.deadline ? new Date(doc.deadline) : null,
        deadlineTime: doc.deadlineTime ? String(doc.deadlineTime) : null,
        notes: doc.notes ? String(doc.notes) : null,
        clientId: doc.clientId ? Number(doc.clientId) : null
      }));
    } catch (error) {
      console.error('Error in getDocumentsByTransaction:', error);
      return [];
    }
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    try {
      const [doc] = await db
        .insert(documents)
        .values({
          name: document.name,
          status: document.status,
          transactionId: document.transactionId,
          deadline: document.deadline ? new Date(document.deadline) : null,
          deadlineTime: document.deadlineTime,
          notes: document.notes,
          clientId: document.clientId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (!doc) {
        throw new Error('Failed to create document');
      }

      return {
        id: Number(doc.id),
        name: String(doc.name),
        status: doc.status,
        transactionId: Number(doc.transactionId),
        deadline: doc.deadline ? new Date(doc.deadline) : null,
        deadlineTime: doc.deadlineTime ? String(doc.deadlineTime) : null,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : null,
        notes: doc.notes ? String(doc.notes) : null,
        clientId: doc.clientId ? Number(doc.clientId) : null
      };
    } catch (error) {
      console.error('Error in createDocument:', error);
      throw error;
    }
  }

  async updateDocument(id: string, data: Partial<Document>): Promise<Document> {
    try {
      const updateData: Record<string, any> = {};

      // Convert all fields to their proper types
      if (data.name !== undefined) updateData.name = String(data.name);
      if (data.status !== undefined) updateData.status = data.status;
      if (data.transactionId !== undefined) updateData.transaction_id = Number(data.transactionId);
      if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
      if (data.deadlineTime !== undefined) updateData.deadline_time = data.deadlineTime;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.clientId !== undefined) updateData.client_id = data.clientId ? Number(data.clientId) : null;
      updateData.updated_at = new Date();

      const [doc] = await db
        .update(documents)
        .set(updateData)
        .where(sql`id = ${id}`)
        .returning();

      if (!doc) {
        throw new Error('Document not found');
      }

      return {
        id: Number(doc.id),
        name: String(doc.name),
        status: doc.status,
        transactionId: Number(doc.transactionId),
        deadline: doc.deadline ? new Date(doc.deadline) : null,
        deadlineTime: doc.deadlineTime ? String(doc.deadlineTime) : null,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : null,
        notes: doc.notes ? String(doc.notes) : null,
        clientId: doc.clientId ? Number(doc.clientId) : null
      };
    } catch (error) {
      console.error('Error in updateDocument:', error);
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      await db
        .delete(documents)
        .where(sql`id = ${id}`);
    } catch (error) {
      console.error('Error in deleteDocument:', error);
      throw error;
    }
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    try {
      const columns = Object.entries(data)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => {
          const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          return sql`${sql.identifier([snakeKey])} = ${value}`;
        });

      const result = await db.execute(sql`
        UPDATE users
        SET ${sql.join(columns, sql`, `)}
        WHERE id = ${id}
        RETURNING *
      `);

      if (!result.rows[0]) {
        throw new Error('Failed to update user');
      }

      const user = result.rows[0];
      return {
        id: Number(user.id),
        email: String(user.email),
        password: String(user.password),
        firstName: String(user.first_name),
        lastName: String(user.last_name),
        role: String(user.role),
        agentId: user.agent_id ? Number(user.agent_id) : null,
        claimedTransactionId: user.claimed_transaction_id ? Number(user.claimed_transaction_id) : null,
        claimedAccessCode: user.claimed_access_code ? String(user.claimed_access_code) : null
      };
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  }

}

export const storage = new DatabaseStorage();