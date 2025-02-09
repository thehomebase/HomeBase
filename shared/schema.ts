import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  type: text("type").notNull(), // 'buyer' or 'seller'
  status: text("status").notNull(), // 'active', 'inactive', 'pending'
  notes: text("notes"),
  agentId: integer("agent_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  address: text("address").notNull(),
  accessCode: text("access_code").notNull(),
  status: text("status").notNull(),
  agentId: integer("agent_id").notNull(),
  clientId: integer("client_id").notNull(),
  participants: json("participants").notNull().$type<{
    userId: number;
    role: string;
  }[]>(),
});

export const checklists = pgTable("checklists", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  role: text("role").notNull(),
  items: json("items").notNull().$type<{
    id: string;
    text: string;
    completed: boolean;
  }[]>(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(), // Changed from nullable to required
  userId: integer("user_id").notNull(),
  username: text("username").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  timestamp: text("timestamp").notNull(),
});

// Add relations
export const transactionsRelations = relations(transactions, ({ many }) => ({
  messages: many(messages),
  checklists: many(checklists),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  transaction: one(transactions, {
    fields: [messages.transactionId],
    references: [transactions.id],
  }),
}));

const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean()
});

export const insertUserSchema = createInsertSchema(users);
export const insertClientSchema = createInsertSchema(clients).omit({ 
  createdAt: true,
  updatedAt: true 
});
export const insertTransactionSchema = createInsertSchema(transactions);
export const insertChecklistSchema = createInsertSchema(checklists).extend({
  items: z.array(checklistItemSchema)
});
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertChecklist = z.infer<typeof insertChecklistSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Checklist = typeof checklists.$inferSelect;
export type Message = typeof messages.$inferSelect;