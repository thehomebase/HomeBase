import { 
  users, transactions, checklists, messages, clients, contacts,
  type User, type Transaction, type Checklist, type Message, type Client, type Contact,
  type InsertUser, type InsertTransaction, type InsertChecklist, type InsertMessage, type InsertClient 
} from "@shared/schema";
import { db } from "./db";
import { sql } from 'drizzle-orm/sql';
import session from 'express-session';
import MemoryStore from 'memorystore';

const MemoryStoreSession = MemoryStore(session);

// Define ChecklistItem type to match the frontend
interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  phase: string;
}

interface Document {
  id: string;
  name: string;
  status: 'not_applicable' | 'waiting_signatures' | 'signed' | 'waiting_others' | 'complete';
  transactionId: number;
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionsByUser(userId: number): Promise<Transaction[]>;
  updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;

  // Checklist operations
  createChecklist(checklist: InsertChecklist): Promise<Checklist>;
  getChecklist(transactionId: number, role: string): Promise<Checklist | undefined>;
  updateChecklist(id: number, items: ChecklistItem[]): Promise<Checklist>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(transactionId?: number): Promise<Message[]>;

  // Session store
  sessionStore: session.Store;
  getClientsByAgent(agentId: number):Promise<Client[]>;
  createClient(insertClient:InsertClient):Promise<Client>;

  // Document operations
  getDocumentsByTransaction(transactionId: number): Promise<Document[]>;
  createDocument(document: { name: string; status: string; transactionId: number }): Promise<Document>;
  updateDocument(id: string, data: Partial<Document>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
}

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
      {id: "buying-criteria", text: "Determine buying criteria", phase: "Pre-Offer", completed: false},
      {id: "hire-agent", text: "Hire a real estate agent", phase: "Pre-Offer", completed: false},
      {id: "get-preapproval", text: "Hire a lender & get pre-approved", phase: "Pre-Offer", completed: false},
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
          closing_date,
          type
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
          ${insertTransaction.closingDate || null},
          ${insertTransaction.type}
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
        closingDate: row.closing_date ? String(row.closing_date) : null,
        type: row.type
      };
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
          address,
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
          financing
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
        address: String(row.address),
        accessCode: String(row.accessCode),
        status: String(row.status),
        type: String(row.type),
        agentId: Number(row.agentId),
        clientId: row.clientId ? Number(row.clientId) : null,
        participants: Array.isArray(row.participants) ? row.participants : [],
        contractPrice: row.contractPrice ? Number(row.contractPrice) : null,
        optionPeriodExpiration: row.optionPeriodExpiration ? new Date(row.optionPeriodExpiration).toISOString() : null,
        optionFee: row.optionFee ? Number(row.optionFee) : null,
        earnestMoney: row.earnestMoney ? Number(row.earnestMoney) : null,
        downPayment: row.downPayment ? Number(row.downPayment) : null,
        sellerConcessions: row.sellerConcessions ? Number(row.sellerConcessions) : null,
        closingDate: row.closingDate ? new Date(row.closingDate).toISOString() : null,
        contractExecutionDate: row.contractExecutionDate ? new Date(row.contractExecutionDate).toISOString() : null,
        mlsNumber: row.mlsNumber || null,
        financing: row.financing || null
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
          t.option_period_expiration as "optionPeriodExpiration",
          t.option_fee::numeric as "optionFee",
          t.earnest_money::numeric as "earnestMoney",
          t.down_payment::numeric as "downPayment",
          t.seller_concessions::numeric as "sellerConcessions",
          t.closing_date::text as "closingDate",
          t.type::text as "type",
          t.contract_execution_date as "contractExecutionDate",
          t.mls_number as "mlsNumber",
          t.financing
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
        optionPeriodExpiration: row.optionPeriodExpiration ? new Date(row.optionPeriodExpiration).toISOString() : null,
        optionFee: row.optionFee ? Number(row.optionFee) : null,
        earnestMoney: row.earnestMoney ? Number(row.earnestMoney) : null,
        downPayment: row.downPayment ? Number(row.downPayment) : null,
        sellerConcessions: row.sellerConcessions ? Number(row.sellerConcessions) : null,
        closingDate: row.closingDate ? new Date(row.closingDate).toISOString() : null,
        type: row.type,
        contractExecutionDate: row.contractExecutionDate ? new Date(row.contractExecutionDate).toISOString() : null,
        mlsNumber: row.mlsNumber || null,
        financing: row.financing || null
      }));
    } catch (error) {
      console.error('Error in getTransactionsByUser:', error);
      return [];
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
        clientId: row.client_id ? Number(row.client_id) : null,
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
        firstName: row.first_name,
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
    try {
      const result = await db.execute(sql`
        DELETE FROM contacts WHERE id = ${id} RETURNING id
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
        SELECT EXISTS(SELECT 1 FROM transactions WHERE id = ${data.transactionId})
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
          transaction_id
        ) VALUES (
          ${data.role},
          ${data.firstName},
          ${data.lastName},
          ${data.email},
          ${data.phone || null},
          ${data.mobilePhone || null},
          ${data.transactionId}
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
        transactionId: result.rows[0].transaction_id
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
          mobile_phone = COALESCE(${data.mobilePhone}, mobile_phone)
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
        transactionId: result.rows[0].transaction_id
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
          id::integer,
          first_name::text as "firstName",
          last_name::text as "lastName",
          email::text,
          phone::text,
          address::text,
          type::text,
          status::text,
          notes::text,
          labels::text[],
          agent_id::integer as "agentId",
          created_at::timestamptz as "createdAt",
          updated_at::timestamptz as "updatedAt"
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
      const result = await db.execute(sql`
        INSERT INTO clients (
          first_name,
          last_name,
          email,
          phone,
          address,
          type,
          status,
          notes,
          labels,
          agent_id,
          created_at,
          updated_at
        ) VALUES (
          ${insertClient.firstName},
          ${insertClient.lastName},
          ${insertClient.email},
          ${insertClient.phone},
          ${insertClient.address},
          ${insertClient.type},
          ${insertClient.status},
          ${insertClient.notes},
          array[${insertClient.labels.map(l => `'${l}'`).join(',')}]::text[],
          ${insertClient.agentId},
          NOW(),
          NOW()
        )
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

      const row = result.rows[0];

      return {
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
      };
    } catch (error) {
      console.error('Error in createClient:', error);
      throw error;
    }
  }

  async getDocumentsByTransaction(transactionId: number): Promise<Document[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM documents 
        WHERE transaction_id = ${transactionId}
        ORDER BY id ASC
      `);

      return result.rows.map(row => ({
        id: String(row.id),
        name: String(row.name),
        status: String(row.status),
        transactionId: Number(row.transaction_id)
      }));
    } catch (error) {
      console.error('Error in getDocumentsByTransaction:', error);
      return [];
    }
  }

  async createDocument(document: { name: string; status: string; transactionId: number }): Promise<Document> {
    try {
      const result = await db.execute(sql`
        INSERT INTO documents (name, status, transaction_id)
        VALUES (${document.name}, ${document.status},${document.transactionId})
        RETURNING *
      `);

      const row = result.rows[0];
      return {
        id: String(row.id),
        name: String(row.name),
        status: String(row.status),
        transactionId: Number(row.transaction_id)
      };
    } catch (error) {
      console.error('Error in createDocument:', error);
      throw error;
    }
  }

  async updateDocument(id: string, data: Partial<Document>): Promise<Document> {
    try {
      const result = await db.execute(sql`
        UPDATE documents 
        SET 
          status = COALESCE(${data.status}, status),
          name = COALESCE(${data.name}, name)
        WHERE id = ${id}
        RETURNING *
      `);

      const row = result.rows[0];
      return {
        id: String(row.id),
        name: String(row.name),
        status: String(row.status),
        transactionId: Number(row.transaction_id)
      };
    } catch (error) {
      console.error('Error in updateDocument:', error);
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      await db.execute(sql`
        DELETE FROM documents 
        WHERE id = ${id}
      `);
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
}

export const storage = new DatabaseStorage();