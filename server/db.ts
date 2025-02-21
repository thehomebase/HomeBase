import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { serial, text, integer, timestamp, pgTable } from 'drizzle-orm/pg-core';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Add error handler for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const db = drizzle(pool, { schema });

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  status: text('status').notNull(),
  agentId: integer('agent_id').notNull(),
  clientId: integer('client_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  closingDate: timestamp('closing_date'),
  contractExecutionDate: timestamp('contract_execution_date'),
  optionPeriodExpiration: timestamp('option_period_expiration'),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: text('role').notNull(),
  agentId: integer('agent_id'),
});