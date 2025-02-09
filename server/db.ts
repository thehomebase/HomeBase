import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

import { pgTable } from 'drizzle-orm/pg-core';

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
  option_period_expiration: timestamp('option_period_expiration'),
});