import { pgTable, serial, text, timestamp, integer, boolean, json, date, time, doublePrecision } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from "zod";

export const privateMessages = pgTable("private_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  recipientId: integer("recipient_id").notNull(),
  content: text("content").notNull(),
  timestamp: text("timestamp").notNull(),
  read: boolean("read").notNull().default(false),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull(),
  agentId: integer("agent_id"),
  clientRecordId: integer("client_record_id"),
  claimedTransactionId: integer("claimed_transaction_id"),
  claimedAccessCode: text("claimed_access_code")
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  mobilePhone: text("mobile_phone"), 
  address: text("address"),
  street: text("street"),
  city: text("city"),
  zipCode: text("zip_code"),
  type: text("type").array().notNull().default(['seller']), 
  status: text("status").notNull(), 
  notes: text("notes"),
  labels: text("labels").array().default([]),
  agentId: integer("agent_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  streetName: text("street_name").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  accessCode: text("access_code").notNull(),
  status: text("status").notNull(),
  type: text("type").notNull().default('buy'), 
  agentId: integer("agent_id").notNull(),
  clientId: integer("client_id"),
  secondaryClientId: integer("secondary_client_id"), 
  participants: json("participants").notNull().$type<{
    userId: number;
    role: string;
  }[]>(),
  contractPrice: integer("contract_price"),
  optionPeriodExpiration: timestamp("option_period_expiration"),
  optionFee: integer("option_fee"),
  earnestMoney: integer("earnest_money"),
  downPayment: integer("down_payment"),
  sellerConcessions: integer("seller_concessions"),
  closingDate: timestamp("closing_date"),
  contractExecutionDate: timestamp("contract_execution_date"),
  mlsNumber: text("mls_number"),
  financing: text("financing"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const checklists = pgTable("checklists", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  role: text("role").notNull(),
  items: json("items").notNull().$type<{
    id: string;
    text: string;
    completed: boolean;
    phase: string;
  }[]>(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  userId: integer("user_id").notNull(),
  username: text("username").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  isRead: boolean("is_read").default(false).notNull()
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status", { enum: ['not_applicable', 'waiting_signatures', 'signed', 'waiting_others', 'complete'] }).notNull(),
  transactionId: integer("transaction_id").notNull(),
  deadline: date("deadline"),
  deadlineTime: time("deadline_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  notes: text("notes"),
  clientId: integer("client_id"),
  signingUrl: text("signing_url"),
  signingPlatform: text("signing_platform", { enum: ['docusign', 'zipforms', 'dotloop', 'other'] })
});

export const contractors = pgTable("contractors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  description: text("description"),
  googleMapsUrl: text("google_maps_url"),
  yelpUrl: text("yelp_url"),
  bbbUrl: text("bbb_url"),
  vendorUserId: integer("vendor_user_id"),
  agentId: integer("agent_id").notNull(),
  agentRating: integer("agent_rating"),
  agentNotes: text("agent_notes"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const contractorRecommendations = pgTable("contractor_recommendations", {
  id: serial("id").primaryKey(),
  contractorId: integer("contractor_id").notNull(),
  agentId: integer("agent_id").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const contractorReviews = pgTable("contractor_reviews", {
  id: serial("id").primaryKey(),
  contractorId: integer("contractor_id").notNull(),
  reviewerName: text("reviewer_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow()
});

export const propertyViewings = pgTable("property_viewings", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  clientId: integer("client_id").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  status: text("status").notNull().default("scheduled"),
  scheduledDate: timestamp("scheduled_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const propertyFeedback = pgTable("property_feedback", {
  id: serial("id").primaryKey(),
  viewingId: integer("viewing_id").notNull(),
  clientId: integer("client_id").notNull(),
  rating: integer("rating").notNull(),
  liked: text("liked"),
  disliked: text("disliked"),
  overallImpression: text("overall_impression"),
  wouldPurchase: boolean("would_purchase"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const showingRequests = pgTable("showing_requests", {
  id: serial("id").primaryKey(),
  viewingId: integer("viewing_id").notNull(),
  requesterId: integer("requester_id").notNull(),
  recipientId: integer("recipient_id").notNull(),
  requestedDate: timestamp("requested_date").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  responseNotes: text("response_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const inspectionItems = pgTable("inspection_items", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  category: text("category", { enum: ['roof', 'plumbing', 'electrical', 'hvac', 'foundation', 'exterior', 'interior', 'appliances', 'other'] }).notNull(),
  description: text("description").notNull(),
  severity: text("severity", { enum: ['minor', 'moderate', 'major', 'safety'] }).notNull(),
  location: text("location"),
  status: text("status", { enum: ['pending_review', 'approved', 'sent_for_bids', 'bids_received', 'accepted', 'declined'] }).notNull().default('pending_review'),
  notes: text("notes"),
  pageNumber: integer("page_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inspectionPdfs = pgTable("inspection_pdfs", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const bidRequests = pgTable("bid_requests", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  inspectionItemId: integer("inspection_item_id").notNull(),
  contractorId: integer("contractor_id").notNull(),
  status: text("status", { enum: ['pending', 'viewed', 'bid_submitted', 'declined', 'expired'] }).notNull().default('pending'),
  sentAt: timestamp("sent_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  notes: text("notes"),
});

export const bids = pgTable("bids", {
  id: serial("id").primaryKey(),
  bidRequestId: integer("bid_request_id").notNull(),
  contractorId: integer("contractor_id").notNull(),
  amount: integer("amount").notNull(),
  estimatedDays: integer("estimated_days"),
  description: text("description"),
  warranty: text("warranty"),
  status: text("status", { enum: ['submitted', 'accepted', 'rejected', 'withdrawn'] }).notNull().default('submitted'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
  phase: z.string()
});

export const insertUserSchema = createInsertSchema(users).extend({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export const insertClientSchema = createInsertSchema(clients, {
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.union([
    z.string().email("Invalid email format"),
    z.string().length(0),
    z.null(),
    z.undefined()
  ]).transform(val => val && val.trim() ? val : null),
  phone: z.union([z.string(), z.null(), z.undefined()]).transform(val => val && typeof val === 'string' && val.trim() ? val : null),
  mobilePhone: z.union([z.string(), z.null(), z.undefined()]).transform(val => val && typeof val === 'string' && val.trim() ? val : null),
  type: z.array(z.enum(["buyer", "seller", "renter"])).min(1, "At least one type is required"),
  status: z.enum(["active", "inactive", "pending"]),
  labels: z.array(z.string()).default([]),
  agentId: z.number(),
}).omit({ 
  createdAt: true,
  updatedAt: true 
});

export const insertTransactionSchema = createInsertSchema(transactions);
export const insertChecklistSchema = createInsertSchema(checklists).extend({
  items: z.array(checklistItemSchema)
});
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true 
});
export const insertContractorSchema = createInsertSchema(contractors).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export const insertContractorReviewSchema = createInsertSchema(contractorReviews).omit({
  id: true,
  createdAt: true
});
export const insertContractorRecommendationSchema = createInsertSchema(contractorRecommendations).omit({
  id: true,
  createdAt: true
});
export const insertPropertyViewingSchema = createInsertSchema(propertyViewings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export const insertPropertyFeedbackSchema = createInsertSchema(propertyFeedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export const insertShowingRequestSchema = createInsertSchema(showingRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const savedProperties = pgTable("saved_properties", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  url: text("url").notNull(),
  source: text("source").notNull(),
  streetAddress: text("street_address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  notes: text("notes"),
  showingRequested: boolean("showing_requested").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  agentId: integer("agent_id").notNull(),
  type: text("type").notNull(), // 'email', 'sms', 'call'
  subject: text("subject"),
  content: text("content"),
  status: text("status").notNull().default("sent"),
  externalId: text("external_id"), // ID from Twilio/Gmail
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommunicationSchema = createInsertSchema(communications).omit({
  id: true,
  createdAt: true,
});

export type Communication = typeof communications.$inferSelect;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;

export const smsOptOuts = pgTable("sms_opt_outs", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  optedOutAt: timestamp("opted_out_at").defaultNow(),
});

export type SmsOptOut = typeof smsOptOuts.$inferSelect;

export const twilioCredentials = pgTable("twilio_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  accountSid: text("account_sid").notNull(),
  authToken: text("auth_token").notNull(),
  phoneNumber: text("phone_number").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTwilioCredentialSchema = createInsertSchema(twilioCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TwilioCredential = typeof twilioCredentials.$inferSelect;
export type InsertTwilioCredential = z.infer<typeof insertTwilioCredentialSchema>;

export const agentPhoneNumbers = pgTable("agent_phone_numbers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  phoneNumber: text("phone_number").notNull(),
  twilioSid: text("twilio_sid").notNull(),
  areaCode: text("area_code"),
  friendlyName: text("friendly_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AgentPhoneNumber = typeof agentPhoneNumbers.$inferSelect;

export const googleTokens = pgTable("google_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiry: timestamp("token_expiry").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGoogleTokenSchema = createInsertSchema(googleTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GoogleToken = typeof googleTokens.$inferSelect;
export type InsertGoogleToken = z.infer<typeof insertGoogleTokenSchema>;

export const emailSnippets = pgTable("email_snippets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailSnippetSchema = createInsertSchema(emailSnippets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const emailTracking = pgTable("email_tracking", {
  id: serial("id").primaryKey(),
  trackingId: text("tracking_id").notNull().unique(),
  userId: integer("user_id").notNull(),
  gmailMessageId: text("gmail_message_id"),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  firstOpenedAt: timestamp("first_opened_at"),
  lastOpenedAt: timestamp("last_opened_at"),
  openCount: integer("open_count").notNull().default(0),
});

export const insertEmailTrackingSchema = createInsertSchema(emailTracking).omit({
  id: true,
  sentAt: true,
  firstOpenedAt: true,
  lastOpenedAt: true,
  openCount: true,
});

export const insertInspectionItemSchema = createInsertSchema(inspectionItems).omit({
  id: true,
  createdAt: true,
});
export const insertBidRequestSchema = createInsertSchema(bidRequests).omit({
  id: true,
  sentAt: true,
});
export const insertBidSchema = createInsertSchema(bids).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSavedPropertySchema = createInsertSchema(savedProperties).omit({
  id: true,
  createdAt: true,
});

export const homeTeamMembers = pgTable("home_team_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  contractorId: integer("contractor_id").notNull(),
  category: text("category").notNull(),
  notes: text("notes"),
  addedAt: timestamp("added_at").defaultNow(),
});

export const homeownerHomes = pgTable("homeowner_homes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  purchaseDate: text("purchase_date"),
  purchasePrice: integer("purchase_price"),
  transactionId: integer("transaction_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const homeMaintenanceRecords = pgTable("home_maintenance_records", {
  id: serial("id").primaryKey(),
  homeId: integer("home_id").notNull(),
  contractorId: integer("contractor_id"),
  category: text("category").notNull(),
  description: text("description").notNull(),
  serviceDate: text("service_date"),
  cost: integer("cost"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  agentUserId: integer("agent_user_id").notNull(),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referralCredits = pgTable("referral_credits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type", { enum: ['referrer', 'referred'] }).notNull(),
  referralCodeId: integer("referral_code_id").notNull(),
  referredUserId: integer("referred_user_id"),
  status: text("status", { enum: ['pending', 'applied', 'expired'] }).notNull().default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
  appliedAt: timestamp("applied_at"),
});

export const insertHomeTeamMemberSchema = createInsertSchema(homeTeamMembers).omit({
  id: true,
  addedAt: true,
});
export const insertHomeownerHomeSchema = createInsertSchema(homeownerHomes).omit({
  id: true,
  createdAt: true,
});
export const insertMaintenanceRecordSchema = createInsertSchema(homeMaintenanceRecords).omit({
  id: true,
  createdAt: true,
});
export const insertReferralCodeSchema = createInsertSchema(referralCodes).omit({
  id: true,
  createdAt: true,
});
export const insertReferralCreditSchema = createInsertSchema(referralCredits).omit({
  id: true,
  createdAt: true,
  appliedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertChecklist = z.infer<typeof insertChecklistSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertContractor = z.infer<typeof insertContractorSchema>;
export type InsertContractorReview = z.infer<typeof insertContractorReviewSchema>;

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Checklist = typeof checklists.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Contractor = typeof contractors.$inferSelect;
export type ContractorReview = typeof contractorReviews.$inferSelect;
export type ContractorRecommendation = typeof contractorRecommendations.$inferSelect;
export type InsertContractorRecommendation = z.infer<typeof insertContractorRecommendationSchema>;
export type PropertyViewing = typeof propertyViewings.$inferSelect;
export type PropertyFeedback = typeof propertyFeedback.$inferSelect;
export type ShowingRequest = typeof showingRequests.$inferSelect;
export type InsertPropertyViewing = z.infer<typeof insertPropertyViewingSchema>;
export type InsertPropertyFeedback = z.infer<typeof insertPropertyFeedbackSchema>;
export type InsertShowingRequest = z.infer<typeof insertShowingRequestSchema>;
export type SavedProperty = typeof savedProperties.$inferSelect;
export type InsertSavedProperty = z.infer<typeof insertSavedPropertySchema>;
export type EmailSnippet = typeof emailSnippets.$inferSelect;
export type InsertEmailSnippet = z.infer<typeof insertEmailSnippetSchema>;
export type EmailTracking = typeof emailTracking.$inferSelect;
export type InsertEmailTracking = z.infer<typeof insertEmailTrackingSchema>;
export type InspectionItem = typeof inspectionItems.$inferSelect;
export type InsertInspectionItem = z.infer<typeof insertInspectionItemSchema>;
export type InspectionPdf = typeof inspectionPdfs.$inferSelect;
export type BidRequest = typeof bidRequests.$inferSelect;
export type InsertBidRequest = z.infer<typeof insertBidRequestSchema>;
export type Bid = typeof bids.$inferSelect;
export type InsertBid = z.infer<typeof insertBidSchema>;
export type HomeTeamMember = typeof homeTeamMembers.$inferSelect;
export type InsertHomeTeamMember = z.infer<typeof insertHomeTeamMemberSchema>;
export type HomeownerHome = typeof homeownerHomes.$inferSelect;
export type InsertHomeownerHome = z.infer<typeof insertHomeownerHomeSchema>;
export type MaintenanceRecord = typeof homeMaintenanceRecords.$inferSelect;
export type InsertMaintenanceRecord = z.infer<typeof insertMaintenanceRecordSchema>;
export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = z.infer<typeof insertReferralCodeSchema>;
export type ReferralCredit = typeof referralCredits.$inferSelect;
export type InsertReferralCredit = z.infer<typeof insertReferralCreditSchema>;
