import { pgTable, serial, text, timestamp, integer, boolean, json, date, time, doublePrecision, real, uniqueIndex, numeric } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from "zod";

export const privateMessages = pgTable("private_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  recipientId: integer("recipient_id").notNull(),
  content: text("content").notNull(),
  timestamp: text("timestamp").notNull(),
  read: boolean("read").notNull().default(false),
  encrypted: boolean("encrypted").notNull().default(true),
  iv: text("iv"),
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
  claimedAccessCode: text("claimed_access_code"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  dashboardPreferences: json("dashboard_preferences"),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  registrationIp: text("registration_ip"),
  brokerageId: integer("brokerage_id"),
  licenseNumber: text("license_number"),
  licenseState: text("license_state"),
  brokerageName: text("brokerage_name"),
  verificationStatus: text("verification_status").default("unverified"),
  profilePhotoUrl: text("profile_photo_url"),
  profileBio: text("profile_bio"),
  profilePhone: text("profile_phone"),
  nmlsNumber: text("nmls_number"),
  stripeNameVerified: boolean("stripe_name_verified").default(false),
  stripeCardholderName: text("stripe_cardholder_name"),
  licenseVerifiedAt: timestamp("license_verified_at"),
  licenseVerifiedBy: integer("license_verified_by"),
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  twitterUrl: text("twitter_url"),
  linkedinUrl: text("linkedin_url"),
  supportAccessGranted: boolean("support_access_granted").default(false),
  supportAccessExpires: timestamp("support_access_expires"),
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").default(false),
  accountStatus: text("account_status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const licenseVerifications = pgTable("license_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  licenseNumber: text("license_number").notNull(),
  licenseState: text("license_state").notNull(),
  profileName: text("profile_name").notNull(),
  cardholderName: text("cardholder_name"),
  nameMatchScore: real("name_match_score"),
  nameMatched: boolean("name_matched").default(false),
  verifiedBy: integer("verified_by"),
  verificationMethod: text("verification_method").notNull(),
  lookupUrl: text("lookup_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLicenseVerificationSchema = createInsertSchema(licenseVerifications).omit({ id: true, createdAt: true });
export type InsertLicenseVerification = z.infer<typeof insertLicenseVerificationSchema>;
export type LicenseVerification = typeof licenseVerifications.$inferSelect;

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
  state: text("state"),
  zipCode: text("zip_code"),
  type: text("type").array().notNull().default(['seller']), 
  status: text("status").notNull(), 
  notes: text("notes"),
  labels: text("labels").array().default([]),
  source: text("source"),
  agentId: integer("agent_id").notNull(),
  linkedClientId: integer("linked_client_id"),
  birthday: text("birthday"),
  anniversary: text("anniversary"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  streetName: text("street_name"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
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
  signingPlatform: text("signing_platform", { enum: ['docusign', 'zipforms', 'dotloop', 'signnow', 'other'] }),
  signnowDocumentId: text("signnow_document_id"),
  docusignEnvelopeId: text("docusign_envelope_id"),
  manuallyMoved: boolean("manually_moved").default(false)
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
  agentId: integer("agent_id"),
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
  hasPhoto: boolean("has_photo").default(false),
  repairRequested: boolean("repair_requested").default(false),
  repairStatus: text("repair_status", { enum: ['not_requested', 'requested', 'agreed', 'denied', 'credit_offered', 'resolved'] }).default('not_requested'),
  repairNotes: text("repair_notes"),
  creditAmount: numeric("credit_amount"),
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
  contractorId: integer("contractor_id"),
  status: text("status", { enum: ['pending', 'viewed', 'bid_submitted', 'declined', 'expired'] }).notNull().default('pending'),
  sentAt: timestamp("sent_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  notes: text("notes"),
});

export const bids = pgTable("bids", {
  id: serial("id").primaryKey(),
  bidRequestId: integer("bid_request_id").notNull(),
  contractorId: integer("contractor_id"),
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
export const insertPrivateMessageSchema = createInsertSchema(privateMessages).omit({ id: true });
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
  lastKnownPrice: integer("last_known_price"),
  listingId: text("listing_id"),
  priceAlertEnabled: boolean("price_alert_enabled").default(true),
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

export const signnowTokens = pgTable("signnow_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiry: timestamp("token_expiry").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSignnowTokenSchema = createInsertSchema(signnowTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SignnowToken = typeof signnowTokens.$inferSelect;
export type InsertSignnowToken = z.infer<typeof insertSignnowTokenSchema>;

export const firmaSigningRequests = pgTable("firma_signing_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  transactionId: integer("transaction_id"),
  firmaSigningRequestId: text("firma_signing_request_id").notNull().unique(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  mobileData: json("mobile_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFirmaSigningRequestSchema = createInsertSchema(firmaSigningRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type FirmaSigningRequest = typeof firmaSigningRequests.$inferSelect;
export type InsertFirmaSigningRequest = z.infer<typeof insertFirmaSigningRequestSchema>;

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

export const authorizedUsers = pgTable("authorized_users", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(),
  authorizedUserId: integer("authorized_user_id").notNull(),
  permissionLevel: text("permission_level").notNull().default("view"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAuthorizedUserSchema = createInsertSchema(authorizedUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAuthorizedUser = z.infer<typeof insertAuthorizedUserSchema>;
export type AuthorizedUser = typeof authorizedUsers.$inferSelect;

export const homeTeamMembers = pgTable("home_team_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  contractorId: integer("contractor_id").notNull(),
  category: text("category").notNull(),
  notes: text("notes"),
  addedAt: timestamp("added_at").defaultNow(),
});

export const vendorTeamRequests = pgTable("vendor_team_requests", {
  id: serial("id").primaryKey(),
  vendorContractorId: integer("vendor_contractor_id").notNull(),
  agentId: integer("agent_id").notNull(),
  category: text("category").notNull(),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVendorTeamRequestSchema = createInsertSchema(vendorTeamRequests).omit({
  id: true,
  createdAt: true,
});
export type InsertVendorTeamRequest = z.infer<typeof insertVendorTeamRequestSchema>;
export type VendorTeamRequest = typeof vendorTeamRequests.$inferSelect;

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

export const dripCampaigns = pgTable("drip_campaigns", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", { enum: ['lead_nurture', 'post_close', 'birthday', 'anniversary', 'custom'] }).notNull().default('custom'),
  status: text("status", { enum: ['active', 'paused', 'archived'] }).notNull().default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dripSteps = pgTable("drip_steps", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  stepOrder: integer("step_order").notNull(),
  delayDays: integer("delay_days").notNull().default(1),
  method: text("method", { enum: ['email', 'sms', 'reminder'] }).notNull().default('email'),
  subject: text("subject"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dripEnrollments = pgTable("drip_enrollments", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  clientId: integer("client_id").notNull(),
  agentId: integer("agent_id").notNull(),
  status: text("status", { enum: ['active', 'paused', 'completed', 'canceled'] }).notNull().default('active'),
  currentStepIndex: integer("current_step_index").notNull().default(0),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  lastActionAt: timestamp("last_action_at"),
  nextActionAt: timestamp("next_action_at"),
});

export const clientSpecialDates = pgTable("client_special_dates", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  agentId: integer("agent_id").notNull(),
  dateType: text("date_type", { enum: ['birthday', 'anniversary', 'home_purchase', 'custom'] }).notNull(),
  dateValue: text("date_value").notNull(),
  year: integer("year"),
  label: text("label"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leadZipCodes = pgTable("lead_zip_codes", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  zipCode: text("zip_code").notNull(),
  isActive: boolean("is_active").default(true),
  monthlyRate: integer("monthly_rate").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  zipCode: text("zip_code").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  type: text("type", { enum: ['buyer', 'seller', 'both'] }).notNull(),
  message: text("message"),
  budget: text("budget"),
  timeframe: text("timeframe"),
  source: text("source"),
  status: text("status", { enum: ['new', 'assigned', 'accepted', 'rejected', 'converted', 'expired'] }).notNull().default('new'),
  assignedAgentId: integer("assigned_agent_id"),
  assignedAt: timestamp("assigned_at"),
  respondedAt: timestamp("responded_at"),
  contactedAt: timestamp("contacted_at"),
  connectedAt: timestamp("connected_at"),
  exclusiveUntil: timestamp("exclusive_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leadRotations = pgTable("lead_rotations", {
  id: serial("id").primaryKey(),
  zipCode: text("zip_code").notNull().unique(),
  lastAgentId: integer("last_agent_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentReviews = pgTable("agent_reviews", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  reviewerId: integer("reviewer_id").notNull(),
  rating: integer("rating").notNull(),
  title: text("title"),
  comment: text("comment").notNull(),
  transactionId: integer("transaction_id"),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendorRatings = pgTable("vendor_ratings", {
  id: serial("id").primaryKey(),
  contractorId: integer("contractor_id").notNull(),
  agentId: integer("agent_id").notNull(),
  overallRating: integer("overall_rating").notNull(),
  qualityRating: integer("quality_rating"),
  communicationRating: integer("communication_rating"),
  timelinessRating: integer("timelines_rating"),
  valueRating: integer("value_rating"),
  title: text("title"),
  comment: text("comment").notNull(),
  transactionId: integer("transaction_id"),
  bidId: integer("bid_id"),
  wouldRecommend: boolean("would_recommend").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVendorRatingSchema = createInsertSchema(vendorRatings).omit({
  id: true,
  createdAt: true,
});

export const insertDripCampaignSchema = createInsertSchema(dripCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertDripStepSchema = createInsertSchema(dripSteps).omit({
  id: true,
  createdAt: true,
});
export const insertDripEnrollmentSchema = createInsertSchema(dripEnrollments).omit({
  id: true,
  enrolledAt: true,
  lastActionAt: true,
});
export const insertClientSpecialDateSchema = createInsertSchema(clientSpecialDates).omit({
  id: true,
  createdAt: true,
});
export const insertLeadZipCodeSchema = createInsertSchema(leadZipCodes).omit({
  id: true,
  createdAt: true,
});
export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
});
export const insertLeadRotationSchema = createInsertSchema(leadRotations).omit({
  id: true,
  updatedAt: true,
});
export const insertAgentReviewSchema = createInsertSchema(agentReviews).omit({
  id: true,
  createdAt: true,
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
export type InsertPrivateMessage = z.infer<typeof insertPrivateMessageSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertContractor = z.infer<typeof insertContractorSchema>;
export type InsertContractorReview = z.infer<typeof insertContractorReviewSchema>;

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Checklist = typeof checklists.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type PrivateMessage = typeof privateMessages.$inferSelect;
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
export type DripCampaign = typeof dripCampaigns.$inferSelect;
export type InsertDripCampaign = z.infer<typeof insertDripCampaignSchema>;
export type DripStep = typeof dripSteps.$inferSelect;
export type InsertDripStep = z.infer<typeof insertDripStepSchema>;
export type DripEnrollment = typeof dripEnrollments.$inferSelect;
export type InsertDripEnrollment = z.infer<typeof insertDripEnrollmentSchema>;
export type ClientSpecialDate = typeof clientSpecialDates.$inferSelect;
export type InsertClientSpecialDate = z.infer<typeof insertClientSpecialDateSchema>;
export type LeadZipCode = typeof leadZipCodes.$inferSelect;
export type InsertLeadZipCode = z.infer<typeof insertLeadZipCodeSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type LeadRotation = typeof leadRotations.$inferSelect;
export type InsertLeadRotation = z.infer<typeof insertLeadRotationSchema>;
export type AgentReview = typeof agentReviews.$inferSelect;
export type InsertAgentReview = z.infer<typeof insertAgentReviewSchema>;
export type VendorRating = typeof vendorRatings.$inferSelect;
export type InsertVendorRating = z.infer<typeof insertVendorRatingSchema>;

export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceType: text("device_type"),
  backedUp: boolean("backed_up").default(false),
  transports: text("transports"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type WebAuthnCredential = typeof webauthnCredentials.$inferSelect;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

export const vendorZipCodes = pgTable("vendor_zip_codes", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull(),
  zipCode: text("zip_code").notNull(),
  category: text("category").notNull(),
  isActive: boolean("is_active").default(true),
  monthlyRate: integer("monthly_rate").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("vendor_zip_unique").on(table.vendorId, table.zipCode, table.category),
]);

export const vendorLeads = pgTable("vendor_leads", {
  id: serial("id").primaryKey(),
  zipCode: text("zip_code").notNull(),
  category: text("category").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  description: text("description"),
  urgency: text("urgency", { enum: ['low', 'medium', 'high', 'emergency'] }).notNull().default('medium'),
  status: text("status", { enum: ['new', 'assigned', 'accepted', 'rejected', 'converted'] }).notNull().default('new'),
  assignedVendorId: integer("assigned_vendor_id"),
  assignedAt: timestamp("assigned_at"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendorLeadRotations = pgTable("vendor_lead_rotations", {
  id: serial("id").primaryKey(),
  zipCode: text("zip_code").notNull(),
  category: text("category").notNull(),
  lastVendorId: integer("last_vendor_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVendorZipCodeSchema = createInsertSchema(vendorZipCodes).omit({
  id: true,
  createdAt: true,
});
export const insertVendorLeadSchema = createInsertSchema(vendorLeads).omit({
  id: true,
  createdAt: true,
});
export const insertVendorLeadRotationSchema = createInsertSchema(vendorLeadRotations).omit({
  id: true,
  updatedAt: true,
});

export type VendorZipCode = typeof vendorZipCodes.$inferSelect;
export type InsertVendorZipCode = z.infer<typeof insertVendorZipCodeSchema>;
export type VendorLead = typeof vendorLeads.$inferSelect;
export type InsertVendorLead = z.infer<typeof insertVendorLeadSchema>;
export type VendorLeadRotation = typeof vendorLeadRotations.$inferSelect;
export type InsertVendorLeadRotation = z.infer<typeof insertVendorLeadRotationSchema>;

export const lenderZipCodes = pgTable("lender_zip_codes", {
  id: serial("id").primaryKey(),
  lenderId: integer("lender_id").notNull(),
  zipCode: text("zip_code").notNull(),
  isActive: boolean("is_active").default(true),
  monthlyRate: integer("monthly_rate").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("lender_zip_unique").on(table.lenderId, table.zipCode),
]);

export const lenderLeads = pgTable("lender_leads", {
  id: serial("id").primaryKey(),
  zipCode: text("zip_code").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  loanType: text("loan_type", { enum: ['conventional', 'fha', 'va', 'usda', 'other'] }).notNull().default('conventional'),
  purchasePrice: text("purchase_price"),
  downPayment: text("down_payment"),
  creditScore: text("credit_score"),
  message: text("message"),
  status: text("status", { enum: ['new', 'assigned', 'accepted', 'rejected', 'converted'] }).notNull().default('new'),
  assignedLenderId: integer("assigned_lender_id"),
  assignedAt: timestamp("assigned_at"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lenderLeadRotations = pgTable("lender_lead_rotations", {
  id: serial("id").primaryKey(),
  zipCode: text("zip_code").notNull().unique(),
  lastLenderId: integer("last_lender_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLenderZipCodeSchema = createInsertSchema(lenderZipCodes).omit({
  id: true,
  createdAt: true,
});
export const insertLenderLeadSchema = createInsertSchema(lenderLeads).omit({
  id: true,
  createdAt: true,
});
export const insertLenderLeadRotationSchema = createInsertSchema(lenderLeadRotations).omit({
  id: true,
  updatedAt: true,
});

export type LenderZipCode = typeof lenderZipCodes.$inferSelect;
export type InsertLenderZipCode = z.infer<typeof insertLenderZipCodeSchema>;
export type LenderLead = typeof lenderLeads.$inferSelect;
export type InsertLenderLead = z.infer<typeof insertLenderLeadSchema>;
export type LenderLeadRotation = typeof lenderLeadRotations.$inferSelect;
export type InsertLenderLeadRotation = z.infer<typeof insertLenderLeadRotationSchema>;

export const lenderTransactions = pgTable("lender_transactions", {
  id: serial("id").primaryKey(),
  lenderId: integer("lender_id").notNull(),
  borrowerName: text("borrower_name").notNull(),
  borrowerEmail: text("borrower_email"),
  borrowerPhone: text("borrower_phone"),
  propertyAddress: text("property_address"),
  loanAmount: integer("loan_amount"),
  loanType: text("loan_type").default("conventional"),
  interestRate: doublePrecision("interest_rate"),
  status: text("status").default("invited").notNull(),
  notes: text("notes"),
  agentId: integer("agent_id"),
  agentTransactionId: integer("agent_transaction_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const lenderChecklists = pgTable("lender_checklists", {
  id: serial("id").primaryKey(),
  lenderTransactionId: integer("lender_transaction_id").notNull(),
  items: json("items").$type<Array<{ id: string; text: string; completed: boolean; phase: string }>>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lenderChecklistMappings = pgTable("lender_checklist_mappings", {
  id: serial("id").primaryKey(),
  lenderTransactionId: integer("lender_transaction_id").notNull(),
  lenderChecklistItemId: text("lender_checklist_item_id").notNull(),
  agentTransactionId: integer("agent_transaction_id").notNull(),
  agentChecklistItemId: text("agent_checklist_item_id").notNull(),
});

export const insertLenderTransactionSchema = createInsertSchema(lenderTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertLenderChecklistSchema = createInsertSchema(lenderChecklists).omit({
  id: true,
  createdAt: true,
});
export const insertLenderChecklistMappingSchema = createInsertSchema(lenderChecklistMappings).omit({
  id: true,
});

export type LenderTransaction = typeof lenderTransactions.$inferSelect;
export type InsertLenderTransaction = z.infer<typeof insertLenderTransactionSchema>;
export type LenderChecklist = typeof lenderChecklists.$inferSelect;
export type InsertLenderChecklist = z.infer<typeof insertLenderChecklistSchema>;
export type LenderChecklistMapping = typeof lenderChecklistMappings.$inferSelect;
export type InsertLenderChecklistMapping = z.infer<typeof insertLenderChecklistMappingSchema>;

export const lenderProfiles = pgTable("lender_profiles", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  nmls: text("nmls"),
  phone: text("phone"),
  email: text("email"),
  photoUrl: text("photo_url"),
  conventionalRate: text("conventional_rate"),
  fhaRate: text("fha_rate"),
  vaRate: text("va_rate"),
  usdaRate: text("usda_rate"),
  closingCostsPct: text("closing_costs_pct"),
  minCreditScore: text("min_credit_score"),
  minDownPaymentPct: text("min_down_payment_pct"),
  specialties: text("specialties"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLenderProfileSchema = createInsertSchema(lenderProfiles).omit({
  id: true,
  createdAt: true,
});

export type LenderProfile = typeof lenderProfiles.$inferSelect;
export type InsertLenderProfile = z.infer<typeof insertLenderProfileSchema>;

export const clientInvitations = pgTable("client_invitations", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"),
  clientRecordId: integer("client_record_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertClientInvitationSchema = createInsertSchema(clientInvitations).omit({
  id: true,
  createdAt: true,
});

export type ClientInvitation = typeof clientInvitations.$inferSelect;
export type InsertClientInvitation = z.infer<typeof insertClientInvitationSchema>;

export const brokerNotifications = pgTable("broker_notifications", {
  id: serial("id").primaryKey(),
  brokerId: integer("broker_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  priority: text("priority").notNull().default("normal"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const brokerNotificationReads = pgTable("broker_notification_reads", {
  id: serial("id").primaryKey(),
  notificationId: integer("notification_id").notNull(),
  agentId: integer("agent_id").notNull(),
  readAt: timestamp("read_at").notNull().defaultNow(),
});

export const salesCompetitions = pgTable("sales_competitions", {
  id: serial("id").primaryKey(),
  brokerId: integer("broker_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  metric: text("metric").notNull(),
  prize: text("prize"),
  status: text("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBrokerNotificationSchema = createInsertSchema(brokerNotifications).omit({
  id: true,
  createdAt: true,
});

export const insertSalesCompetitionSchema = createInsertSchema(salesCompetitions).omit({
  id: true,
  createdAt: true,
});

export const feedbackRequests = pgTable("feedback_requests", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  agentId: integer("agent_id").notNull(),
  clientId: integer("client_id").notNull(),
  token: text("token").notNull().unique(),
  status: text("status", { enum: ['pending', 'completed', 'expired'] }).notNull().default('pending'),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  reviewId: integer("review_id"),
});

export const insertFeedbackRequestSchema = createInsertSchema(feedbackRequests).omit({
  id: true,
  sentAt: true,
  completedAt: true,
  reviewId: true,
});

export type FeedbackRequest = typeof feedbackRequests.$inferSelect;
export type InsertFeedbackRequest = z.infer<typeof insertFeedbackRequestSchema>;

export type BrokerNotification = typeof brokerNotifications.$inferSelect;
export type InsertBrokerNotification = z.infer<typeof insertBrokerNotificationSchema>;
export type BrokerNotificationRead = typeof brokerNotificationReads.$inferSelect;
export type SalesCompetition = typeof salesCompetitions.$inferSelect;
export type InsertSalesCompetition = z.infer<typeof insertSalesCompetitionSchema>;

export const transactionTemplates = pgTable("transaction_templates", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("buy"),
  checklistItems: json("checklist_items"),
  documents: json("documents"),
  notes: text("notes"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransactionTemplateSchema = createInsertSchema(transactionTemplates).omit({
  id: true,
  createdAt: true,
});

export type TransactionTemplate = typeof transactionTemplates.$inferSelect;
export type InsertTransactionTemplate = z.infer<typeof insertTransactionTemplateSchema>;

export const commissionEntries = pgTable("commission_entries", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  agentId: integer("agent_id").notNull(),
  commissionRate: real("commission_rate"),
  commissionAmount: integer("commission_amount"),
  brokerageSplitPercent: real("brokerage_split_percent"),
  referralFeePercent: real("referral_fee_percent"),
  expenses: json("expenses"),
  notes: text("notes"),
  status: text("status", { enum: ["pending", "paid"] }).notNull().default("pending"),
  paidDate: timestamp("paid_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommissionEntrySchema = createInsertSchema(commissionEntries).omit({
  id: true,
  createdAt: true,
});

export type CommissionEntry = typeof commissionEntries.$inferSelect;
export type InsertCommissionEntry = z.infer<typeof insertCommissionEntrySchema>;

export const openHouses = pgTable("open_houses", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  transactionId: integer("transaction_id"),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  notes: text("notes"),
  status: text("status", { enum: ["scheduled", "active", "completed"] }).notNull().default("scheduled"),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOpenHouseSchema = createInsertSchema(openHouses).omit({
  id: true,
  createdAt: true,
});

export type OpenHouse = typeof openHouses.$inferSelect;
export type InsertOpenHouse = z.infer<typeof insertOpenHouseSchema>;

export const openHouseVisitors = pgTable("open_house_visitors", {
  id: serial("id").primaryKey(),
  openHouseId: integer("open_house_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  interestedLevel: integer("interested_level"),
  notes: text("notes"),
  preApproved: boolean("pre_approved").default(false),
  workingWithAgent: boolean("working_with_agent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOpenHouseVisitorSchema = createInsertSchema(openHouseVisitors).omit({
  id: true,
  createdAt: true,
});

export type OpenHouseVisitor = typeof openHouseVisitors.$inferSelect;
export type InsertOpenHouseVisitor = z.infer<typeof insertOpenHouseVisitorSchema>;

export const clientReminders = pgTable("client_reminders", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  clientId: integer("client_id").notNull(),
  type: text("type", { enum: ["closing_anniversary", "birthday", "custom"] }).notNull().default("custom"),
  title: text("title").notNull(),
  message: text("message"),
  reminderDate: timestamp("reminder_date").notNull(),
  recurring: boolean("recurring").default(false),
  channels: json("channels"),
  lastSentAt: timestamp("last_sent_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientReminderSchema = createInsertSchema(clientReminders).omit({
  id: true,
  lastSentAt: true,
  createdAt: true,
});

export type ClientReminder = typeof clientReminders.$inferSelect;
export type InsertClientReminder = z.infer<typeof insertClientReminderSchema>;

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type", {
    enum: ["lead_new", "message_new", "document_updated", "bid_received", "transaction_update", "client_invited", "reminder", "general"]
  }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: integer("related_id"),
  relatedType: text("related_type", {
    enum: ["transaction", "lead", "message", "bid", "client", "document"]
  }),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  read: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export const scannedDocuments = pgTable("scanned_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  transactionId: integer("transaction_id"),
  clientId: integer("client_id"),
  name: text("name").notNull(),
  category: text("category", {
    enum: ["contract", "disclosure", "inspection", "identification", "financial", "correspondence", "other"]
  }).notNull().default("other"),
  fileData: text("file_data").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScannedDocumentSchema = createInsertSchema(scannedDocuments).omit({
  id: true,
  createdAt: true,
});

export type ScannedDocument = typeof scannedDocuments.$inferSelect;
export type InsertScannedDocument = z.infer<typeof insertScannedDocumentSchema>;

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  prefix: text("prefix").notNull(),
  permissions: text("permissions").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  url: text("url").notNull(),
  event: text("event", {
    enum: ["new_lead", "lead_updated", "transaction_created", "transaction_updated", "transaction_closed", "client_created", "client_updated", "document_uploaded", "message_received"]
  }).notNull(),
  secret: text("secret").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  createdAt: true,
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;

export const listingPhotos = pgTable("listing_photos", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  agentId: integer("agent_id").notNull(),
  photoUrl: text("photo_url").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertListingPhotoSchema = createInsertSchema(listingPhotos).omit({
  id: true,
  createdAt: true,
});

export type ListingPhoto = typeof listingPhotos.$inferSelect;
export type InsertListingPhoto = z.infer<typeof insertListingPhotoSchema>;

export const listingAlerts = pgTable("listing_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  minPrice: integer("min_price"),
  maxPrice: integer("max_price"),
  bedroomsMin: integer("bedrooms_min"),
  bathroomsMin: integer("bathrooms_min"),
  propertyType: text("property_type"),
  notifyEmail: boolean("notify_email").default(true),
  notifySms: boolean("notify_sms").default(false),
  notifyInApp: boolean("notify_in_app").default(true),
  isActive: boolean("is_active").default(true),
  lastCheckedAt: timestamp("last_checked_at"),
  lastMatchCount: integer("last_match_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertListingAlertSchema = createInsertSchema(listingAlerts).omit({
  id: true,
  lastCheckedAt: true,
  lastMatchCount: true,
  createdAt: true,
});

export type ListingAlert = typeof listingAlerts.$inferSelect;
export type InsertListingAlert = z.infer<typeof insertListingAlertSchema>;

export const listingAlertResults = pgTable("listing_alert_results", {
  id: serial("id").primaryKey(),
  alertId: integer("alert_id").notNull(),
  userId: integer("user_id").notNull(),
  listingId: text("listing_id").notNull(),
  listingAddress: text("listing_address").notNull(),
  listingPrice: integer("listing_price"),
  listingBedrooms: integer("listing_bedrooms"),
  listingBathrooms: real("listing_bathrooms"),
  listingData: json("listing_data"),
  notifiedAt: timestamp("notified_at").defaultNow().notNull(),
});

export type ListingAlertResult = typeof listingAlertResults.$inferSelect;

export const verifiedListings = pgTable("verified_listings", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  mlsNumber: text("mls_number"),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  price: integer("price"),
  bedrooms: integer("bedrooms"),
  bathrooms: real("bathrooms"),
  squareFeet: integer("square_feet"),
  propertyType: text("property_type"),
  listingAgentName: text("listing_agent_name"),
  listingAgentPhone: text("listing_agent_phone"),
  listingAgentEmail: text("listing_agent_email"),
  photoUrl: text("photo_url"),
  listingStatus: text("listing_status"),
  rentcastData: json("rentcast_data"),
  lastVerifiedAt: timestamp("last_verified_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type VerifiedListing = typeof verifiedListings.$inferSelect;

export const listingMarketing = pgTable("listing_marketing", {
  id: serial("id").primaryKey(),
  verifiedListingId: integer("verified_listing_id").notNull(),
  agentId: integer("agent_id").notNull(),
  youtubeUrl: text("youtube_url"),
  matterportUrl: text("matterport_url"),
  description: text("description"),
  floorplanPdf: text("floorplan_pdf"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ListingMarketing = typeof listingMarketing.$inferSelect;

export const listingMarketingPhotos = pgTable("listing_marketing_photos", {
  id: serial("id").primaryKey(),
  verifiedListingId: integer("verified_listing_id").notNull(),
  agentId: integer("agent_id").notNull(),
  photoUrl: text("photo_url").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").default(0),
});

export type ListingMarketingPhoto = typeof listingMarketingPhotos.$inferSelect;

export const listingReports = pgTable("listing_reports", {
  id: serial("id").primaryKey(),
  verifiedListingId: integer("verified_listing_id").notNull(),
  reportedBy: integer("reported_by").notNull(),
  reason: text("reason").notNull(),
  status: text("status", { enum: ['pending', 'reviewed', 'dismissed'] }).default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ListingReport = typeof listingReports.$inferSelect;

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ['todo', 'in_progress', 'completed'] }).notNull().default('todo'),
  priority: text("priority", { enum: ['low', 'medium', 'high', 'urgent'] }).notNull().default('medium'),
  dueDate: timestamp("due_date"),
  transactionId: integer("transaction_id"),
  assignedTo: integer("assigned_to"),
  createdBy: integer("created_by").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const sponsoredAds = pgTable("sponsored_ads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type", { enum: ['marketplace', 'sidebar', 'banner'] }).notNull().default('marketplace'),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  targetUrl: text("target_url"),
  category: text("category"),
  zipCodes: text("zip_codes").array().default([]),
  budgetCents: integer("budget_cents").notNull().default(0),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: text("status", { enum: ['draft', 'pending', 'active', 'paused', 'rejected', 'expired'] }).notNull().default('draft'),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  adminNotes: text("admin_notes"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSponsoredAdSchema = createInsertSchema(sponsoredAds).omit({ id: true, impressions: true, clicks: true, adminNotes: true, createdAt: true, updatedAt: true });
export type InsertSponsoredAd = z.infer<typeof insertSponsoredAdSchema>;
export type SponsoredAd = typeof sponsoredAds.$inferSelect;

export const adminAuditLog = pgTable("admin_audit_log", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id"),
  details: json("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdminAuditLog = typeof adminAuditLog.$inferSelect;

export const adminMessages = pgTable("admin_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  adminReply: text("admin_reply"),
  adminRepliedAt: timestamp("admin_replied_at"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdminMessage = typeof adminMessages.$inferSelect;
