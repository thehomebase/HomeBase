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
  users, transactions, checklists, messages, clients, documents, contractors, contractorReviews,
  propertyViewings, propertyFeedback, showingRequests, savedProperties, communications, smsOptOuts,
  emailSnippets, emailTracking, inspectionItems, bidRequests, bids,
  homeTeamMembers, homeownerHomes, homeMaintenanceRecords, referralCodes, vendorInviteTokens, referralCredits,
  dripCampaigns, dripSteps, dripEnrollments, clientSpecialDates,
  type User, type Transaction, type Checklist, type Message, type Client, type Document,
  type Contractor, type ContractorReview, type PropertyViewing, type PropertyFeedback,
  type ShowingRequest, type SavedProperty, type InsertSavedProperty,
  type Communication, type InsertCommunication,
  type AgentPhoneNumber,
  type EmailSnippet, type InsertEmailSnippet,
  type EmailTracking, type InsertEmailTracking,
  type InspectionItem, type InsertInspectionItem,
  type BidRequest, type InsertBidRequest,
  type Bid, type InsertBid,
  type HomeTeamMember, type InsertHomeTeamMember,
  type HomeownerHome, type InsertHomeownerHome,
  type MaintenanceRecord, type InsertMaintenanceRecord,
  type ReferralCode, type InsertReferralCode,
  type VendorInviteToken, type InsertVendorInviteToken,
  type ReferralCredit, type InsertReferralCredit,
  type DripCampaign, type InsertDripCampaign,
  type DripStep, type InsertDripStep,
  type DripEnrollment, type InsertDripEnrollment,
  type ClientSpecialDate, type InsertClientSpecialDate,
  type LeadZipCode, type InsertLeadZipCode,
  type Lead, type InsertLead,
  type LeadRotation, type InsertLeadRotation,
  type AgentReview, type InsertAgentReview,
  type VendorRating, type InsertVendorRating,
  type WebAuthnCredential,
  type PushSubscription, type InsertPushSubscription,
  pushSubscriptions,
  type VendorZipCode, type InsertVendorZipCode,
  type VendorLead, type InsertVendorLead,
  type VendorLeadRotation, type InsertVendorLeadRotation,
  type LenderZipCode, type InsertLenderZipCode,
  type LenderLead, type InsertLenderLead,
  type LenderLeadRotation, type InsertLenderLeadRotation,
  type LenderTransaction, type InsertLenderTransaction,
  type LenderChecklist, type InsertLenderChecklist,
  type LenderChecklistMapping, type InsertLenderChecklistMapping,
  type LenderProfile, type InsertLenderProfile,
  type ClientInvitation, type InsertClientInvitation,
  type BrokerNotification, type InsertBrokerNotification,
  type BrokerNotificationRead,
  type SalesCompetition, type InsertSalesCompetition,
  type InsertUser, type InsertTransaction, type InsertChecklist, type InsertMessage, type InsertClient,
  type InsertDocument, type InsertContractor, type InsertContractorReview,
  type InsertPropertyViewing, type InsertPropertyFeedback, type InsertShowingRequest,
  scannedDocuments, type ScannedDocument, type InsertScannedDocument,
  apiKeys, type ApiKey, type InsertApiKey,
  webhooks, type Webhook, type InsertWebhook,
  vendorTeamRequests, type VendorTeamRequest, type InsertVendorTeamRequest
} from "@shared/schema";
import { db } from "./db";
import { sql } from 'drizzle-orm/sql';
import { eq, and, desc } from 'drizzle-orm';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';

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
  getTransactionsByUser(userId: number, year?: number): Promise<Transaction[]>;
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
  getClient(id: number): Promise<Client | undefined>;
  getClientsByAgent(agentId: number): Promise<Client[]>;
  createClient(insertClient: InsertClient): Promise<Client>;
  updateClient(id: number, data: Partial<Client>): Promise<Client>;
  deleteClient(clientId: number): Promise<void>;
  linkClients(clientId: number, linkedClientId: number): Promise<void>;
  unlinkClients(clientId: number): Promise<void>;
  createChecklist(checklist: InsertChecklist): Promise<Checklist>;
  getChecklist(transactionId: number, role: string): Promise<Checklist | undefined>;
  updateChecklist(id: number, items: ChecklistItem[]): Promise<Checklist>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(transactionId?: number): Promise<Message[]>;

  createPrivateMessage(data: { senderId: number; recipientId: number; content: string; encrypted?: boolean; iv?: string | null }): Promise<any>;
  getPrivateMessages(userId1: number, userId2: number): Promise<any[]>;
  getPrivateConversations(userId: number): Promise<any[]>;
  markPrivateMessageRead(id: number, userId: number): Promise<any>;
  getCommunicationMetrics(userId: number): Promise<any>;
  getDashboardData(userId: number, role: string): Promise<any>;
  getDashboardPreferences(userId: number): Promise<any>;
  updateDashboardPreferences(userId: number, preferences: any): Promise<any>;

  getContactsByTransaction(transactionId: number): Promise<any[]>;
  deleteContact(id: number): Promise<boolean>;
  createContact(data: any): Promise<any>;
  updateContact(id: number, data: Partial<any>): Promise<any>;

  // Contractor operations
  getContractors(agentId: number): Promise<Contractor[]>;
  getAllContractors(): Promise<Contractor[]>;
  getContractor(id: number): Promise<Contractor | undefined>;
  createContractor(contractor: InsertContractor): Promise<Contractor>;
  updateContractor(id: number, data: Partial<Contractor>): Promise<Contractor>;
  deleteContractor(id: number): Promise<void>;

  // Contractor review operations
  getContractorReviews(contractorId: number): Promise<ContractorReview[]>;
  createContractorReview(review: InsertContractorReview): Promise<ContractorReview>;
  deleteContractorReview(id: number): Promise<void>;

  // Contractor recommendation operations
  getContractorRecommendations(contractorId: number): Promise<{ agentId: number; agentName: string }[]>;
  getContractorRecommendationCount(contractorId: number): Promise<number>;
  hasAgentRecommended(contractorId: number, agentId: number): Promise<boolean>;
  addContractorRecommendation(contractorId: number, agentId: number): Promise<void>;
  removeContractorRecommendation(contractorId: number, agentId: number): Promise<void>;

  // Property viewing operations
  getViewingsByAgent(agentId: number): Promise<PropertyViewing[]>;
  getViewingsByClient(clientId: number): Promise<PropertyViewing[]>;
  getViewing(id: number): Promise<PropertyViewing | undefined>;
  createViewing(viewing: InsertPropertyViewing): Promise<PropertyViewing>;
  updateViewing(id: number, data: Partial<PropertyViewing>): Promise<PropertyViewing>;
  deleteViewing(id: number): Promise<void>;

  // Property feedback operations
  getFeedbackByViewing(viewingId: number): Promise<PropertyFeedback[]>;
  getFeedbackByClient(clientId: number): Promise<PropertyFeedback[]>;
  createFeedback(feedback: InsertPropertyFeedback): Promise<PropertyFeedback>;
  updateFeedback(id: number, data: Partial<PropertyFeedback>): Promise<PropertyFeedback>;
  deleteFeedback(id: number): Promise<void>;

  // Map data operations
  getTransactionsWithCoordinates(agentId: number): Promise<Transaction[]>;
  updateTransactionCoordinates(id: number, lat: number, lon: number): Promise<void>;

  // Showing request operations
  getShowingRequestsByUser(userId: number, clientRecordId?: number | null): Promise<ShowingRequest[]>;
  getShowingRequest(id: number): Promise<ShowingRequest | undefined>;
  createShowingRequest(request: InsertShowingRequest): Promise<ShowingRequest>;
  updateShowingRequest(id: number, data: Partial<ShowingRequest>): Promise<ShowingRequest>;
  deleteShowingRequest(id: number): Promise<void>;

  // Saved property operations
  getSavedPropertiesByUser(userId: number): Promise<SavedProperty[]>;
  getShowingRequestedProperties(agentId: number): Promise<(SavedProperty & { clientName?: string })[]>;
  createSavedProperty(property: InsertSavedProperty): Promise<SavedProperty>;
  updateSavedPropertyShowing(id: number, userId: number, showingRequested: boolean): Promise<void>;
  deleteSavedProperty(id: number, userId: number): Promise<void>;

  // Communication operations
  getCommunicationsByClient(clientId: number, agentId: number): Promise<Communication[]>;
  createCommunication(comm: InsertCommunication): Promise<Communication>;

  // SMS opt-out operations
  isPhoneOptedOut(phoneNumber: string): Promise<boolean>;
  addOptOut(phoneNumber: string): Promise<void>;
  removeOptOut(phoneNumber: string): Promise<void>;

  // SMS rate limiting
  getSmsSentCountToday(agentId: number): Promise<number>;
  getUniqueRecipientsToday(agentId: number): Promise<number>;

  // Agent phone numbers
  getAgentPhoneNumber(userId: number): Promise<AgentPhoneNumber | null>;
  saveAgentPhoneNumber(data: { userId: number; phoneNumber: string; twilioSid: string; areaCode?: string; friendlyName?: string }): Promise<AgentPhoneNumber>;
  deleteAgentPhoneNumber(userId: number): Promise<void>;
  getAgentByPhoneNumber(phoneNumber: string): Promise<AgentPhoneNumber | null>;

  // Email snippets
  getSnippetsByUser(userId: number): Promise<EmailSnippet[]>;
  getSnippet(id: number): Promise<EmailSnippet | undefined>;
  createSnippet(snippet: InsertEmailSnippet): Promise<EmailSnippet>;
  updateSnippet(id: number, data: Partial<EmailSnippet>): Promise<EmailSnippet>;
  deleteSnippet(id: number): Promise<void>;

  // Email tracking
  createEmailTracking(tracking: InsertEmailTracking): Promise<EmailTracking>;
  getEmailTracking(trackingId: string): Promise<EmailTracking | undefined>;
  recordEmailOpen(trackingId: string): Promise<void>;
  getEmailTrackingByUser(userId: number): Promise<EmailTracking[]>;
  updateEmailTrackingMessageId(trackingId: string, gmailMessageId: string): Promise<void>;

  // Inspection item operations
  createInspectionItem(item: InsertInspectionItem): Promise<InspectionItem>;
  getInspectionItemsByTransaction(transactionId: number): Promise<InspectionItem[]>;
  updateInspectionItem(id: number, data: Partial<InspectionItem>): Promise<InspectionItem>;
  deleteInspectionItem(id: number): Promise<void>;

  // Bid request operations
  createBidRequest(request: InsertBidRequest): Promise<BidRequest>;
  getBidRequestsByTransaction(transactionId: number): Promise<BidRequest[]>;
  getBidRequestsByContractor(contractorId: number): Promise<BidRequest[]>;
  updateBidRequest(id: number, data: Partial<BidRequest>): Promise<BidRequest>;

  // Bid operations
  createBid(bid: InsertBid): Promise<Bid>;
  getBidsByBidRequest(bidRequestId: number): Promise<Bid[]>;
  getBidsByContractor(contractorId: number): Promise<Bid[]>;
  updateBid(id: number, data: Partial<Bid>): Promise<Bid>;

  // Inspection PDF operations
  saveInspectionPdf(transactionId: number, fileName: string, filePath: string): Promise<void>;
  getInspectionPdf(transactionId: number): Promise<{ fileName: string; filePath: string } | undefined>;

  // Contractor by vendor user
  getContractorByVendorUserId(vendorUserId: number): Promise<Contractor | undefined>;
  createVendorProfile(data: any): Promise<Contractor>;

  // Vendor team request operations
  createVendorTeamRequest(data: any): Promise<VendorTeamRequest>;
  getTeamRequestsByVendor(vendorContractorId: number): Promise<VendorTeamRequest[]>;
  getTeamRequestsByAgent(agentId: number): Promise<(VendorTeamRequest & { vendorName?: string; vendorCategory?: string })[]>;
  updateTeamRequestStatus(id: number, status: string): Promise<VendorTeamRequest>;
  getAgentsWithoutCategoryVendor(category: string): Promise<{ id: number; username: string; fullName: string; teamSize: number }[]>;

  // Home Team operations
  addHomeTeamMember(data: InsertHomeTeamMember): Promise<HomeTeamMember>;
  removeHomeTeamMember(id: number): Promise<void>;
  getHomeTeamByUser(userId: number): Promise<HomeTeamMember[]>;
  getHomeTeamMember(id: number): Promise<HomeTeamMember | undefined>;

  // Homeowner Home operations
  createHome(data: InsertHomeownerHome): Promise<HomeownerHome>;
  getHomesByUser(userId: number): Promise<HomeownerHome[]>;
  getHome(id: number): Promise<HomeownerHome | undefined>;
  updateHome(id: number, data: Partial<HomeownerHome>): Promise<HomeownerHome>;
  deleteHome(id: number): Promise<void>;

  // Maintenance Record operations
  createMaintenanceRecord(data: InsertMaintenanceRecord): Promise<MaintenanceRecord>;
  getMaintenanceByHome(homeId: number): Promise<MaintenanceRecord[]>;
  updateMaintenanceRecord(id: number, data: Partial<MaintenanceRecord>): Promise<MaintenanceRecord>;
  deleteMaintenanceRecord(id: number): Promise<void>;

  // Referral operations
  createReferralCode(data: InsertReferralCode): Promise<ReferralCode>;
  getReferralCodeByAgent(agentUserId: number): Promise<ReferralCode | undefined>;
  getReferralCodeByCode(code: string): Promise<ReferralCode | undefined>;
  createVendorInviteToken(data: InsertVendorInviteToken): Promise<VendorInviteToken>;
  getVendorInviteTokenByToken(token: string): Promise<VendorInviteToken | undefined>;
  createReferralCredit(data: InsertReferralCredit): Promise<ReferralCredit>;
  getReferralCreditsByUser(userId: number): Promise<ReferralCredit[]>;
  getReferralCreditsByReferralCode(referralCodeId: number): Promise<ReferralCredit[]>;
  applyReferralCredit(id: number): Promise<ReferralCredit>;

  // Marketplace operations
  getMarketplaceContractors(filters?: { category?: string; search?: string; limit?: number; offset?: number }): Promise<Contractor[]>;
  getMarketplaceContractorCount(filters?: { category?: string; search?: string }): Promise<number>;

  // Drip Campaign operations
  createDripCampaign(data: InsertDripCampaign): Promise<DripCampaign>;
  getDripCampaign(id: number): Promise<DripCampaign | undefined>;
  getDripCampaignsByAgent(agentId: number): Promise<DripCampaign[]>;
  updateDripCampaign(id: number, data: Partial<DripCampaign>): Promise<DripCampaign>;
  deleteDripCampaign(id: number): Promise<void>;

  // Drip Step operations
  createDripStep(data: InsertDripStep): Promise<DripStep>;
  getDripStepsByCampaign(campaignId: number): Promise<DripStep[]>;
  updateDripStep(id: number, data: Partial<DripStep>): Promise<DripStep>;
  deleteDripStep(id: number): Promise<void>;
  reorderDripSteps(campaignId: number, stepIds: number[]): Promise<DripStep[]>;

  // Drip Enrollment operations
  createDripEnrollment(data: InsertDripEnrollment): Promise<DripEnrollment>;
  getDripEnrollment(id: number): Promise<DripEnrollment | undefined>;
  getDripEnrollmentsByAgent(agentId: number): Promise<DripEnrollment[]>;
  getDripEnrollmentsByClient(clientId: number): Promise<DripEnrollment[]>;
  getDripEnrollmentsByCampaign(campaignId: number): Promise<DripEnrollment[]>;
  updateDripEnrollmentStatus(id: number, status: string): Promise<DripEnrollment>;
  advanceDripEnrollmentStep(id: number, nextActionAt: Date | null): Promise<DripEnrollment>;
  getDueEnrollments(): Promise<DripEnrollment[]>;

  // Client Special Date operations
  createClientSpecialDate(data: InsertClientSpecialDate): Promise<ClientSpecialDate>;
  getClientSpecialDate(id: number): Promise<ClientSpecialDate | undefined>;
  getClientSpecialDatesByClient(clientId: number): Promise<ClientSpecialDate[]>;
  getClientSpecialDatesByAgent(agentId: number): Promise<ClientSpecialDate[]>;
  updateClientSpecialDate(id: number, data: Partial<ClientSpecialDate>): Promise<ClientSpecialDate>;
  deleteClientSpecialDate(id: number): Promise<void>;
  getUpcomingSpecialDates(agentId: number, withinDays: number): Promise<ClientSpecialDate[]>;

  claimZipCode(data: InsertLeadZipCode): Promise<LeadZipCode>;
  unclaimZipCode(id: number): Promise<void>;
  getAgentZipCodes(agentId: number): Promise<LeadZipCode[]>;
  getAgentsForZipCode(zipCode: string): Promise<LeadZipCode[]>;
  isZipCodeClaimed(agentId: number, zipCode: string): Promise<boolean>;
  getAvailableZipCodes(): Promise<string[]>;
  getAgentCountForZipCode(zipCode: string): Promise<number>;
  countAgentZipCodes(agentId: number): Promise<number>;
  countAgentFreeZipCodes(agentId: number): Promise<number>;
  updateZipCodeBudget(id: number, monthlyRate: number): Promise<void>;

  getLeadCountForZip(zipCode: string, days: number): Promise<number>;
  getLenderLeadCountForZip(zipCode: string, days: number): Promise<number>;
  getVendorLeadCountForZip(zipCode: string, category: string, days: number): Promise<number>;

  createLead(data: InsertLead): Promise<Lead>;
  getLead(id: number): Promise<Lead | undefined>;
  getLeadsByAgent(agentId: number): Promise<Lead[]>;
  getLeadsByZipCode(zipCode: string): Promise<Lead[]>;
  updateLeadStatus(id: number, status: string, agentId?: number): Promise<Lead>;
  getNewLeadsByZipCode(zipCode: string): Promise<Lead[]>;

  getLeadRotation(zipCode: string): Promise<LeadRotation | undefined>;
  upsertLeadRotation(zipCode: string, lastAgentId: number): Promise<LeadRotation>;

  createAgentReview(data: InsertAgentReview): Promise<AgentReview>;
  getAgentReviews(agentId: number): Promise<AgentReview[]>;
  getAgentAverageRating(agentId: number): Promise<{ avg: number; count: number }>;
  getReviewsByReviewer(reviewerId: number): Promise<AgentReview[]>;
  deleteAgentReview(id: number): Promise<void>;
  getAgentReview(id: number): Promise<AgentReview | undefined>;
  getPublicAgentProfile(agentId: number): Promise<{ user: User; avgRating: number; reviewCount: number } | undefined>;
  getTopAgents(limit: number): Promise<{ user: User; avgRating: number; reviewCount: number }[]>;

  createVendorRating(data: InsertVendorRating): Promise<VendorRating>;
  getVendorRatings(contractorId: number): Promise<VendorRating[]>;
  getVendorRating(id: number): Promise<VendorRating | undefined>;
  getVendorRatingsByAgent(agentId: number): Promise<VendorRating[]>;
  deleteVendorRating(id: number): Promise<void>;
  getVendorPerformanceStats(contractorId: number): Promise<{ avgOverall: number; avgQuality: number; avgCommunication: number; avgTimeliness: number; avgValue: number; totalRatings: number; recommendRate: number }>;
  getContractorTeamCount(contractorId: number): Promise<number>;
  getContractorTrustedByAgentCount(contractorId: number): Promise<number>;

  createWebAuthnCredential(credential: { id: string; userId: number; publicKey: string; counter: number; deviceType?: string; backedUp?: boolean; transports?: string }): Promise<WebAuthnCredential>;
  getWebAuthnCredentialsByUser(userId: number): Promise<WebAuthnCredential[]>;
  getWebAuthnCredential(id: string): Promise<WebAuthnCredential | undefined>;
  updateWebAuthnCredentialCounter(id: string, counter: number): Promise<void>;
  deleteWebAuthnCredential(id: string): Promise<void>;

  savePushSubscription(sub: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptionsByUser(userId: number): Promise<PushSubscription[]>;
  deletePushSubscription(id: number): Promise<void>;
  deletePushSubscriptionByEndpoint(endpoint: string): Promise<void>;
  deletePushSubscriptionByUserAndEndpoint(userId: number, endpoint: string): Promise<void>;

  getVendorZipCodes(vendorId: number): Promise<VendorZipCode[]>;
  claimVendorZipCode(data: InsertVendorZipCode): Promise<VendorZipCode>;
  releaseVendorZipCode(id: number, vendorId: number): Promise<void>;
  getVendorZipCodesByZip(zipCode: string, category?: string): Promise<VendorZipCode[]>;
  getVendorCountForZipCategory(zipCode: string, category: string): Promise<number>;
  countVendorZipCodes(vendorId: number): Promise<number>;
  countVendorFreeZipCodes(vendorId: number): Promise<number>;
  isVendorZipClaimed(vendorId: number, zipCode: string, category: string): Promise<boolean>;

  createVendorLead(data: InsertVendorLead): Promise<VendorLead>;
  getVendorLead(id: number): Promise<VendorLead | undefined>;
  getVendorLeadsByVendor(vendorId: number): Promise<VendorLead[]>;
  updateVendorLeadStatus(id: number, status: string, vendorId?: number): Promise<VendorLead>;
  getVendorLeadStats(vendorId: number): Promise<{ total: number; new: number; accepted: number; rejected: number; converted: number }>;

  getVendorLeadRotation(zipCode: string, category: string): Promise<VendorLeadRotation | undefined>;
  upsertVendorLeadRotation(zipCode: string, category: string, lastVendorId: number): Promise<VendorLeadRotation>;

  claimLenderZipCode(data: InsertLenderZipCode): Promise<LenderZipCode>;
  releaseLenderZipCode(id: number, lenderId: number): Promise<void>;
  getLenderZipCodes(lenderId: number): Promise<LenderZipCode[]>;
  getLendersForZipCode(zipCode: string): Promise<LenderZipCode[]>;
  isLenderZipClaimed(lenderId: number, zipCode: string): Promise<boolean>;
  getLenderCountForZipCode(zipCode: string): Promise<number>;
  countLenderZipCodes(lenderId: number): Promise<number>;
  updateLenderZipCodeRate(id: number, monthlyRate: number): Promise<void>;

  createLenderLead(data: InsertLenderLead): Promise<LenderLead>;
  getLenderLead(id: number): Promise<LenderLead | undefined>;
  getLenderLeadsByLender(lenderId: number): Promise<LenderLead[]>;
  updateLenderLeadStatus(id: number, status: string, lenderId?: number): Promise<LenderLead>;

  getLenderLeadRotation(zipCode: string): Promise<LenderLeadRotation | undefined>;
  upsertLenderLeadRotation(zipCode: string, lastLenderId: number): Promise<LenderLeadRotation>;

  getAgentResponseMetrics(agentId: number): Promise<{ avgResponseMs: number; fastestMs: number; slowestMs: number; totalResponded: number; responseRate: number }>;
  getVendorResponseMetrics(vendorId: number): Promise<{ avgResponseMs: number; fastestMs: number; slowestMs: number; totalResponded: number; responseRate: number }>;

  createLenderTransaction(data: InsertLenderTransaction): Promise<LenderTransaction>;
  getLenderTransaction(id: number): Promise<LenderTransaction | undefined>;
  getLenderTransactionsByLender(lenderId: number): Promise<LenderTransaction[]>;
  getLenderTransactionByAgentTransaction(agentTransactionId: number): Promise<LenderTransaction | undefined>;
  updateLenderTransaction(id: number, data: Partial<LenderTransaction>): Promise<LenderTransaction>;
  deleteLenderTransaction(id: number): Promise<void>;

  createLenderChecklist(data: InsertLenderChecklist): Promise<LenderChecklist>;
  getLenderChecklist(lenderTransactionId: number): Promise<LenderChecklist | undefined>;
  updateLenderChecklist(id: number, items: any[]): Promise<LenderChecklist>;

  getLenderChecklistMappings(lenderTransactionId: number): Promise<LenderChecklistMapping[]>;
  createLenderChecklistMapping(data: InsertLenderChecklistMapping): Promise<LenderChecklistMapping>;

  getLenderProfiles(agentId: number): Promise<LenderProfile[]>;
  getLenderProfile(id: number): Promise<LenderProfile | undefined>;
  createLenderProfile(data: InsertLenderProfile): Promise<LenderProfile>;
  updateLenderProfile(id: number, data: Partial<LenderProfile>): Promise<LenderProfile>;
  deleteLenderProfile(id: number): Promise<void>;

  createClientInvitation(data: InsertClientInvitation): Promise<ClientInvitation>;
  getClientInvitationsByAgent(agentId: number): Promise<ClientInvitation[]>;
  getClientInvitationByToken(token: string): Promise<ClientInvitation | undefined>;
  getClientInvitationsByEmail(email: string): Promise<ClientInvitation[]>;
  updateClientInvitationStatus(id: number, status: string, clientRecordId?: number): Promise<ClientInvitation>;

  getBrokerageAgents(brokerageId: number): Promise<User[]>;
  getBrokerMetrics(brokerageId: number): Promise<any>;
  getAgentMetrics(agentId: number): Promise<any>;
  getBrokerageLeads(brokerageId: number): Promise<any[]>;
  reassignLead(leadId: number, newAgentId: number): Promise<any>;
  createFeedbackRequest(data: any): Promise<any>;
  getFeedbackRequestByToken(token: string): Promise<any>;
  getFeedbackRequestsByAgent(agentId: number): Promise<any[]>;
  completeFeedbackRequest(id: number, reviewId: number): Promise<any>;
  getFeedbackRequestByTransaction(transactionId: number, clientId: number): Promise<any>;
  createBrokerNotification(data: InsertBrokerNotification): Promise<BrokerNotification>;
  getBrokerNotifications(brokerId: number): Promise<(BrokerNotification & { readCount: number })[]>;
  getAgentNotifications(agentId: number): Promise<BrokerNotification[]>;
  markBrokerNotificationRead(notificationId: number, agentId: number): Promise<BrokerNotificationRead>;
  createSalesCompetition(data: InsertSalesCompetition): Promise<SalesCompetition>;
  getSalesCompetitions(brokerId: number): Promise<SalesCompetition[]>;
  getCompetitionLeaderboard(competitionId: number, metric: string, brokerageId: number): Promise<any[]>;

  createTransactionTemplate(data: any): Promise<any>;
  getTransactionTemplatesByAgent(agentId: number): Promise<any[]>;
  getTransactionTemplate(id: number): Promise<any>;
  updateTransactionTemplate(id: number, data: any): Promise<any>;
  deleteTransactionTemplate(id: number): Promise<void>;

  createCommissionEntry(data: any): Promise<any>;
  getCommissionEntriesByAgent(agentId: number): Promise<any[]>;
  getCommissionEntry(id: number): Promise<any>;
  getCommissionEntryByTransaction(transactionId: number, agentId: number): Promise<any>;
  updateCommissionEntry(id: number, data: any): Promise<any>;
  deleteCommissionEntry(id: number): Promise<void>;
  getCommissionSummary(agentId: number): Promise<any>;

  createOpenHouse(data: any): Promise<any>;
  getOpenHousesByAgent(agentId: number): Promise<any[]>;
  getOpenHouse(id: number): Promise<any>;
  getOpenHouseBySlug(slug: string): Promise<any>;
  updateOpenHouse(id: number, data: any): Promise<any>;
  deleteOpenHouse(id: number): Promise<void>;
  createOpenHouseVisitor(data: any): Promise<any>;
  getOpenHouseVisitors(openHouseId: number): Promise<any[]>;

  createClientReminder(data: any): Promise<any>;
  getClientRemindersByAgent(agentId: number): Promise<any[]>;
  getClientReminder(id: number): Promise<any>;
  updateClientReminder(id: number, data: any): Promise<any>;
  deleteClientReminder(id: number): Promise<void>;
  getDueReminders(): Promise<any[]>;
  markReminderSent(id: number): Promise<void>;

  createNotification(data: any): Promise<any>;
  getNotificationsByUser(userId: number, limit?: number, offset?: number): Promise<any[]>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  markNotificationRead(id: number, userId?: number): Promise<boolean>;
  markAllNotificationsRead(userId: number): Promise<void>;

  createScannedDocument(doc: InsertScannedDocument): Promise<ScannedDocument>;
  getScannedDocuments(userId: number, transactionId?: number, clientId?: number): Promise<ScannedDocument[]>;
  getScannedDocument(id: number): Promise<ScannedDocument | undefined>;
  deleteScannedDocument(id: number): Promise<void>;

  createApiKey(data: InsertApiKey): Promise<ApiKey>;
  getApiKeys(userId: number): Promise<ApiKey[]>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  deleteApiKey(id: number, userId: number): Promise<void>;
  updateApiKeyLastUsed(id: number): Promise<void>;

  createWebhook(data: InsertWebhook): Promise<Webhook>;
  getWebhooks(userId: number): Promise<Webhook[]>;
  getWebhooksByEvent(event: string): Promise<Webhook[]>;
  deleteWebhook(id: number, userId: number): Promise<void>;
}

const PgStore = connectPgSimple(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  private BUYER_CHECKLIST_ITEMS: ChecklistItem[];
  private SELLER_CHECKLIST_ITEMS: ChecklistItem[];

  constructor() {
    this.sessionStore = new PgStore({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15,
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
      const [user] = await db.select().from(users).where(sql`id = ${id}`);
      if (!user) {
        console.log('No user found with ID:', id);
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
        clientRecordId: user.clientRecordId ? Number(user.clientRecordId) : null,
        claimedTransactionId: user.claimedTransactionId ? Number(user.claimedTransactionId) : null,
        claimedAccessCode: user.claimedAccessCode ? String(user.claimedAccessCode) : null,
        stripeCustomerId: user.stripeCustomerId ? String(user.stripeCustomerId) : null,
        stripeSubscriptionId: user.stripeSubscriptionId ? String(user.stripeSubscriptionId) : null,
        dashboardPreferences: user.dashboardPreferences ?? null,
        emailVerified: user.emailVerified ?? false,
        emailVerificationToken: user.emailVerificationToken ?? null,
        emailVerificationExpires: user.emailVerificationExpires ?? null,
        registrationIp: user.registrationIp ?? null,
        brokerageId: user.brokerageId ? Number(user.brokerageId) : null,
        licenseNumber: user.licenseNumber ?? null,
        licenseState: user.licenseState ?? null,
        brokerageName: user.brokerageName ?? null,
        verificationStatus: user.verificationStatus ?? "unverified",
        profilePhotoUrl: user.profilePhotoUrl ?? null,
        profileBio: user.profileBio ?? null,
        profilePhone: user.profilePhone ?? null,
        nmlsNumber: user.nmlsNumber ?? null,
        stripeNameVerified: user.stripeNameVerified ?? false,
        stripeCardholderName: user.stripeCardholderName ?? null,
        licenseVerifiedAt: user.licenseVerifiedAt ?? null,
        licenseVerifiedBy: user.licenseVerifiedBy ? Number(user.licenseVerifiedBy) : null,
        facebookUrl: user.facebookUrl ?? null,
        instagramUrl: user.instagramUrl ?? null,
        twitterUrl: user.twitterUrl ?? null,
        linkedinUrl: user.linkedinUrl ?? null,
        accountStatus: user.accountStatus ?? "active",
      };
    } catch (error) {
      console.error('Error in getUser:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(sql`LOWER(email) = LOWER(${email})`);
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
        clientRecordId: user.clientRecordId ? Number(user.clientRecordId) : null,
        claimedTransactionId: user.claimedTransactionId ? Number(user.claimedTransactionId) : null,
        claimedAccessCode: user.claimedAccessCode ? String(user.claimedAccessCode) : null,
        stripeCustomerId: user.stripeCustomerId ? String(user.stripeCustomerId) : null,
        stripeSubscriptionId: user.stripeSubscriptionId ? String(user.stripeSubscriptionId) : null,
        dashboardPreferences: user.dashboardPreferences ?? null,
        emailVerified: user.emailVerified ?? false,
        emailVerificationToken: user.emailVerificationToken ?? null,
        emailVerificationExpires: user.emailVerificationExpires ?? null,
        registrationIp: user.registrationIp ?? null,
        brokerageId: user.brokerageId ? Number(user.brokerageId) : null,
        licenseNumber: user.licenseNumber ?? null,
        licenseState: user.licenseState ?? null,
        brokerageName: user.brokerageName ?? null,
        verificationStatus: user.verificationStatus ?? "unverified",
        profilePhotoUrl: user.profilePhotoUrl ?? null,
        profileBio: user.profileBio ?? null,
        profilePhone: user.profilePhone ?? null,
        nmlsNumber: user.nmlsNumber ?? null,
        stripeNameVerified: user.stripeNameVerified ?? false,
        stripeCardholderName: user.stripeCardholderName ?? null,
        licenseVerifiedAt: user.licenseVerifiedAt ?? null,
        licenseVerifiedBy: user.licenseVerifiedBy ? Number(user.licenseVerifiedBy) : null,
        facebookUrl: user.facebookUrl ?? null,
        instagramUrl: user.instagramUrl ?? null,
        twitterUrl: user.twitterUrl ?? null,
        linkedinUrl: user.linkedinUrl ?? null,
        accountStatus: user.accountStatus ?? "active",
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
          clientRecordId: null,
          claimedTransactionId: null,
          claimedAccessCode: null,
          emailVerified: false,
          registrationIp: (insertUser as any).registrationIp || null,
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
        clientRecordId: user.clientRecordId ? Number(user.clientRecordId) : null,
        claimedTransactionId: user.claimedTransactionId ? Number(user.claimedTransactionId) : null,
        claimedAccessCode: user.claimedAccessCode ? String(user.claimedAccessCode) : null,
        stripeCustomerId: user.stripeCustomerId ? String(user.stripeCustomerId) : null,
        stripeSubscriptionId: user.stripeSubscriptionId ? String(user.stripeSubscriptionId) : null,
        dashboardPreferences: user.dashboardPreferences ?? null,
        emailVerified: user.emailVerified ?? false,
        emailVerificationToken: user.emailVerificationToken ?? null,
        emailVerificationExpires: user.emailVerificationExpires ?? null,
        registrationIp: user.registrationIp ?? null,
        brokerageId: user.brokerageId ? Number(user.brokerageId) : null,
        accountStatus: user.accountStatus ?? "active",
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
        type: String(row.type).replace(/[{}]/g, ''),
        agentId: Number(row.agent_id),
        clientId: row.client_id ? Number(row.client_id) : null,
        participants: Array.isArray(row.participants) ? row.participants : [],
        contractPrice: row.contract_price ? Number(row.contract_price) : null,
        optionPeriodExpiration: row.option_period_expiration ? new Date(row.option_period_expiration) : null,
        optionFee: row.option_fee ? Number(row.option_fee) : null,
        earnestMoney: row.earnest_money ? Number(row.earnest_money) : null,
        downPayment: row.down_payment ? Number(row.down_payment) : null,
        sellerConcessions: row.seller_concessions ? Number(row.seller_concessions) : null,
        listDate: row.list_date ? new Date(row.list_date) : null,
        closingDate: row.closing_date ? new Date(row.closing_date) : null,
        contractExecutionDate: row.contract_execution_date ? new Date(row.contract_execution_date) : null,
        mlsNumber: row.mls_number || null,
        financing: row.financing || null
      };
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
          secondary_client_id as "secondaryClientId",
          participants,
          contract_price as "contractPrice",
          option_period_expiration as "optionPeriodExpiration",
          option_fee as "optionFee",
          earnest_money as "earnestMoney",
          down_payment as "downPayment",
          seller_concessions as "sellerConcessions",
          list_date as "listDate",
          closing_date as "closingDate",
          contract_execution_date as "contractExecutionDate",
          mls_number as "mlsNumber",
          financing,
          request_client_review as "requestClientReview",
          updated_at as "updatedAt"
        FROM transactions 
        WHERE id = ${id}
      `);

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
        type: String(row.type).replace(/[{}]/g, ''),
        agentId: Number(row.agentId),
        clientId: row.clientId ? Number(row.clientId) : null,
        secondaryClientId: (row as any).secondaryClientId ? Number((row as any).secondaryClientId) : null,
        participants: Array.isArray(row.participants) ? row.participants : [],
        contractPrice: row.contractPrice ? Number(row.contractPrice) : null,
        optionPeriodExpiration: row.optionPeriodExpiration ? new Date(row.optionPeriodExpiration) : null,
        optionFee: row.optionFee ? Number(row.optionFee) : null,
        earnestMoney: row.earnestMoney ? Number(row.earnestMoney) : null,
        downPayment: row.downPayment ? Number(row.downPayment) : null,
        sellerConcessions: row.sellerConcessions ? Number(row.sellerConcessions) : null,
        listDate: row.listDate ? new Date(row.listDate) : null,
        closingDate: row.closingDate ? new Date(row.closingDate) : null,
        contractExecutionDate: row.contractExecutionDate ? new Date(row.contractExecutionDate) : null,
        mlsNumber: row.mlsNumber || null,
        financing: row.financing || null,
        requestClientReview: row.requestClientReview !== false,
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
      };

      return transaction;

    } catch (error) {
      console.error('Error in getTransaction:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      throw error;
    }
  }

  async getTransactionsByUser(userId: number, year?: number): Promise<Transaction[]> {
    try {
      console.log('Fetching transactions for user:', userId, year ? `year: ${year}` : '');
      const yearFilter = year 
        ? sql`AND EXTRACT(YEAR FROM COALESCE(t.closing_date, t.updated_at, NOW())) = ${year}`
        : sql``;
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
          t.list_date::timestamptz as "listDate",
          t.closing_date::timestamptz as "closingDate",
          t.contract_execution_date::timestamptz as "contractExecutionDate",
          t.mls_number as "mlsNumber",
          t.financing,
          t.updated_at::timestamptz as "updatedAt",
          t.updated_at::timestamptz as "createdAt",
          c.first_name as "clientFirstName",
          c.last_name as "clientLastName"
        FROM transactions t
        LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.agent_id = ${userId}
        ${yearFilter}
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
        type: String(row.type).replace(/[{}]/g, ''),
        agentId: Number(row.agentId),
        clientId: row.clientId ? Number(row.clientId) : null,
        participants: Array.isArray(row.participants) ? row.participants : [],
        contractPrice: row.contractPrice ? Number(row.contractPrice) : null,
        optionPeriodExpiration: row.optionPeriodExpiration ? new Date(row.optionPeriodExpiration) : null,
        optionFee: row.optionFee ? Number(row.optionFee) : null,
        earnestMoney: row.earnestMoney ? Number(row.earnestMoney) : null,
        downPayment: row.downPayment ? Number(row.downPayment) : null,
        sellerConcessions: row.sellerConcessions ? Number(row.sellerConcessions) : null,
        listDate: row.listDate ? new Date(row.listDate) : null,
        closingDate: row.closingDate ? new Date(row.closingDate) : null,
        contractExecutionDate: row.contractExecutionDate ? new Date(row.contractExecutionDate) : null,
        mlsNumber: row.mlsNumber || null,
        financing: row.financing || null,
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
        createdAt: (row as any).createdAt ? new Date((row as any).createdAt) : null,
        client: (row as any).clientFirstName ? {
          firstName: String((row as any).clientFirstName),
          lastName: String((row as any).clientLastName),
        } : null,
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
          if (['list_date', 'closing_date', 'contract_execution_date', 'option_period_expiration'].includes(snakeKey)) {
            if (value) {
              const date = new Date(value);
              date.setUTCHours(12, 0, 0, 0);
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

      // Create SET clause for SQL update
      const setColumns = Object.entries(cleanData).map(([key, value]) => {
        if (value === null) {
          return sql`${sql.identifier([key])} = NULL`;
        }
        if (key === 'participants') {
          return sql`${sql.identifier([key])} = ${value}::jsonb`;
        }
        if (['list_date', 'closing_date', 'contract_execution_date', 'option_period_expiration'].includes(key)) {
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
        type: String(row.type).replace(/[{}]/g, ''),
        agentId: Number(row.agent_id),
        clientId: row.clientId ? Number(row.client_id) : null,
        participants: Array.isArray(row.participants) ? row.participants : [],
        contractPrice: row.contract_price ? Number(row.contract_price) : null,
        optionPeriod: row.option_period ? Number(row.option_period) : null,
        optionFee: row.option_fee ? Number(row.option_fee) : null,
        earnestMoney: row.earnest_money ? Number(row.earnest_money) : null,
        downPayment: row.down_payment ? Number(row.down_payment) : null,
        sellerConcessions: row.seller_concessions ? Number(row.seller_concessions) : null,
        listDate: row.list_date ? new Date(row.list_date).toISOString() : null,
        closingDate: row.closing_date ? new Date(row.closing_date).toISOString() : null,
        contractExecutionDate: row.contract_execution_date ? new Date(row.contract_execution_date).toISOString() : null,
        optionPeriodExpiration: row.option_period_expiration ? new Date(row.option_period_expiration).toISOString() : null,
        mlsNumber: row.mls_number || null,
        financing: row.financing || null,
        requestClientReview: row.request_client_review !== false,
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

  async createPrivateMessage(data: { senderId: number; recipientId: number; content: string; encrypted?: boolean; iv?: string | null }): Promise<any> {
    const { encryptMessage } = await import("./encryption");
    const ts = new Date().toISOString();
    const { ciphertext, iv } = encryptMessage(data.content);
    const result = await db.execute(sql`
      INSERT INTO private_messages (sender_id, recipient_id, content, timestamp, read, encrypted, iv)
      VALUES (${data.senderId}, ${data.recipientId}, ${ciphertext}, ${ts}, false, true, ${iv})
      RETURNING *
    `);
    const row = result.rows[0];
    return {
      id: row.id,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
      content: data.content,
      timestamp: row.timestamp,
      read: row.read,
      encrypted: true,
      iv: row.iv,
    };
  }

  async getPrivateMessages(userId1: number, userId2: number): Promise<any[]> {
    const { decryptMessage } = await import("./encryption");
    const result = await db.execute(sql`
      SELECT pm.*, 
        s.first_name as sender_first_name, s.last_name as sender_last_name, s.role as sender_role,
        r.first_name as recipient_first_name, r.last_name as recipient_last_name, r.role as recipient_role
      FROM private_messages pm
      JOIN users s ON pm.sender_id = s.id
      JOIN users r ON pm.recipient_id = r.id
      WHERE (pm.sender_id = ${userId1} AND pm.recipient_id = ${userId2})
         OR (pm.sender_id = ${userId2} AND pm.recipient_id = ${userId1})
      ORDER BY pm.timestamp ASC
    `);
    return result.rows.map((row: any) => {
      const content = row.encrypted && row.iv
        ? decryptMessage(row.content as string, row.iv as string)
        : row.content;
      return {
        id: row.id,
        senderId: row.sender_id,
        recipientId: row.recipient_id,
        content,
        timestamp: row.timestamp,
        read: row.read,
        encrypted: row.encrypted,
        iv: row.iv,
        senderName: `${row.sender_first_name} ${row.sender_last_name}`,
        senderRole: row.sender_role,
        recipientName: `${row.recipient_first_name} ${row.recipient_last_name}`,
        recipientRole: row.recipient_role,
      };
    });
  }

  async getPrivateConversations(userId: number): Promise<any[]> {
    const { decryptMessage } = await import("./encryption");
    const result = await db.execute(sql`
      SELECT 
        CASE WHEN pm.sender_id = ${userId} THEN pm.recipient_id ELSE pm.sender_id END as other_user_id,
        pm.content as last_message,
        pm.timestamp as last_timestamp,
        pm.encrypted as last_encrypted,
        pm.iv as last_iv,
        u.first_name, u.last_name, u.role, u.email
      FROM private_messages pm
      JOIN users u ON u.id = CASE WHEN pm.sender_id = ${userId} THEN pm.recipient_id ELSE pm.sender_id END
      WHERE pm.sender_id = ${userId} OR pm.recipient_id = ${userId}
      ORDER BY pm.timestamp DESC
    `);
    const convMap = new Map<number, any>();
    for (const row of result.rows as any[]) {
      const otherId = row.other_user_id as number;
      if (!convMap.has(otherId)) {
        const lastMessage = row.last_encrypted && row.last_iv
          ? decryptMessage(row.last_message as string, row.last_iv as string)
          : row.last_message;
        convMap.set(otherId, {
          userId: otherId,
          name: `${row.first_name} ${row.last_name}`,
          role: row.role,
          email: row.email,
          lastMessage,
          lastTimestamp: row.last_timestamp,
          unreadCount: 0,
        });
      }
    }

    if (convMap.size > 0) {
      const unreadResult = await db.execute(sql`
        SELECT sender_id, COUNT(*)::int as cnt
        FROM private_messages
        WHERE recipient_id = ${userId} AND read = false
        GROUP BY sender_id
      `);
      for (const row of unreadResult.rows as any[]) {
        const conv = convMap.get(row.sender_id);
        if (conv) conv.unreadCount = row.cnt;
      }
    }

    return Array.from(convMap.values());
  }

  async getCommunicationMetrics(userId: number, contactId?: number): Promise<any> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const smsResult = contactId
      ? await db.execute(sql`
          SELECT 
            COUNT(*) FILTER (WHERE created_at >= ${todayStart}::timestamp)::int as sms_today,
            COUNT(*) FILTER (WHERE created_at >= ${weekStart}::timestamp)::int as sms_week,
            COUNT(*) FILTER (WHERE created_at >= ${monthStart}::timestamp)::int as sms_month,
            COUNT(*)::int as sms_total
          FROM communications 
          WHERE agent_id = ${userId} AND type = 'sms' AND status = 'sent' AND client_id = ${contactId}
        `)
      : await db.execute(sql`
          SELECT 
            COUNT(*) FILTER (WHERE created_at >= ${todayStart}::timestamp)::int as sms_today,
            COUNT(*) FILTER (WHERE created_at >= ${weekStart}::timestamp)::int as sms_week,
            COUNT(*) FILTER (WHERE created_at >= ${monthStart}::timestamp)::int as sms_month,
            COUNT(*)::int as sms_total
          FROM communications 
          WHERE agent_id = ${userId} AND type = 'sms' AND status = 'sent'
        `);

    const emailResult = contactId
      ? await db.execute(sql`
          SELECT 0::int as email_today, 0::int as email_week, 0::int as email_month, 0::int as email_total
        `)
      : await db.execute(sql`
          SELECT 
            COUNT(*) FILTER (WHERE sent_at >= ${todayStart}::timestamp)::int as email_today,
            COUNT(*) FILTER (WHERE sent_at >= ${weekStart}::timestamp)::int as email_week,
            COUNT(*) FILTER (WHERE sent_at >= ${monthStart}::timestamp)::int as email_month,
            COUNT(*)::int as email_total
          FROM email_tracking WHERE user_id = ${userId}
        `);

    const pmResult = contactId
      ? await db.execute(sql`
          SELECT 
            COUNT(*) FILTER (WHERE timestamp >= ${todayStart})::int as pm_today,
            COUNT(*) FILTER (WHERE timestamp >= ${weekStart})::int as pm_week,
            COUNT(*) FILTER (WHERE timestamp >= ${monthStart})::int as pm_month,
            COUNT(*)::int as pm_total
          FROM private_messages
          WHERE ((sender_id = ${userId} AND recipient_id = ${contactId})
              OR (sender_id = ${contactId} AND recipient_id = ${userId}))
        `)
      : await db.execute(sql`
          SELECT 
            COUNT(*) FILTER (WHERE timestamp >= ${todayStart})::int as pm_today,
            COUNT(*) FILTER (WHERE timestamp >= ${weekStart})::int as pm_week,
            COUNT(*) FILTER (WHERE timestamp >= ${monthStart})::int as pm_month,
            COUNT(*)::int as pm_total
          FROM private_messages WHERE sender_id = ${userId}
        `);

    const recipientsResult = contactId
      ? await db.execute(sql`
          SELECT 1::int as unique_recipients
        `)
      : await db.execute(sql`
          SELECT COUNT(DISTINCT recipient_id)::int as unique_recipients
          FROM private_messages WHERE sender_id = ${userId}
        `);

    const smsRecipientsResult = contactId
      ? await db.execute(sql`
          SELECT 1::int as unique_sms_contacts
        `)
      : await db.execute(sql`
          SELECT COUNT(DISTINCT client_id)::int as unique_sms_contacts
          FROM communications WHERE agent_id = ${userId} AND type = 'sms'
        `);

    const pmHourlyResult = contactId
      ? await db.execute(sql`
          SELECT EXTRACT(HOUR FROM timestamp::timestamp)::int as hour, COUNT(*)::int as count
          FROM private_messages
          WHERE ((sender_id = ${userId} AND recipient_id = ${contactId})
              OR (sender_id = ${contactId} AND recipient_id = ${userId}))
            AND timestamp >= ${todayStart}
          GROUP BY hour
        `)
      : await db.execute(sql`
          SELECT EXTRACT(HOUR FROM timestamp::timestamp)::int as hour, COUNT(*)::int as count
          FROM private_messages
          WHERE sender_id = ${userId} AND timestamp >= ${todayStart}
          GROUP BY hour
        `);

    const smsHourlyResult = contactId
      ? await db.execute(sql`
          SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*)::int as count
          FROM communications
          WHERE agent_id = ${userId} AND client_id = ${contactId} AND status = 'sent'
            AND created_at >= ${todayStart}::timestamp
          GROUP BY hour
        `)
      : await db.execute(sql`
          SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*)::int as count
          FROM communications
          WHERE agent_id = ${userId} AND status = 'sent'
            AND created_at >= ${todayStart}::timestamp
          GROUP BY hour
        `);

    const emailHourlyResult = contactId
      ? { rows: [] }
      : await db.execute(sql`
          SELECT EXTRACT(HOUR FROM sent_at)::int as hour, COUNT(*)::int as count
          FROM email_tracking
          WHERE user_id = ${userId} AND sent_at >= ${todayStart}::timestamp
          GROUP BY hour
        `);

    const hourlyData: { hour: number; messages: number; sms: number; emails: number }[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, messages: 0, sms: 0, emails: 0 }));
    for (const row of pmHourlyResult.rows as any[]) {
      const h = row.hour;
      if (h >= 0 && h < 24) hourlyData[h].messages += row.count;
    }
    for (const row of smsHourlyResult.rows as any[]) {
      const h = row.hour;
      if (h >= 0 && h < 24) hourlyData[h].sms += row.count;
    }
    for (const row of emailHourlyResult.rows as any[]) {
      const h = row.hour;
      if (h >= 0 && h < 24) hourlyData[h].emails += row.count;
    }

    const sms = (smsResult.rows[0] as any) || {};
    const email = (emailResult.rows[0] as any) || {};
    const pm = (pmResult.rows[0] as any) || {};

    return {
      sms: {
        today: sms.sms_today || 0,
        thisWeek: sms.sms_week || 0,
        thisMonth: sms.sms_month || 0,
        total: sms.sms_total || 0,
        uniqueContacts: (smsRecipientsResult.rows[0] as any)?.unique_sms_contacts || 0,
      },
      email: {
        today: email.email_today || 0,
        thisWeek: email.email_week || 0,
        thisMonth: email.email_month || 0,
        total: email.email_total || 0,
      },
      privateMessages: {
        today: pm.pm_today || 0,
        thisWeek: pm.pm_week || 0,
        thisMonth: pm.pm_month || 0,
        total: pm.pm_total || 0,
        uniqueRecipients: (recipientsResult.rows[0] as any)?.unique_recipients || 0,
      },
      hourlyActivity: hourlyData,
    };
  }

  async markPrivateMessageRead(id: number, userId: number): Promise<any> {
    const result = await db.execute(sql`
      UPDATE private_messages SET read = true
      WHERE id = ${id} AND recipient_id = ${userId}
      RETURNING *
    `);
    return result.rows[0] || null;
  }

  async getDashboardData(userId: number, role: string): Promise<any> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastMonthEnd = monthStart;
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    if (role === "agent" || role === "broker") {
      const txResult = await db.execute(sql`
        SELECT status, COUNT(*)::int as count, COALESCE(SUM(contract_price), 0)::bigint as total_value
        FROM transactions WHERE agent_id = ${userId}
        GROUP BY status
      `);
      const stages: Record<string, number> = {};
      let activeCount = 0;
      let totalPipeline = 0;
      let closedCount = 0;
      for (const row of txResult.rows as any[]) {
        stages[row.status] = row.count;
        if (row.status !== "closed") {
          activeCount += row.count;
          totalPipeline += Number(row.total_value);
        } else {
          closedCount = row.count;
        }
      }

      const closingThisMonth = await db.execute(sql`
        SELECT COUNT(*)::int as count FROM transactions
        WHERE agent_id = ${userId} AND closing_date >= ${monthStart}::timestamp
        AND closing_date < ${new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()}::timestamp
      `);

      const closedLastMonth = await db.execute(sql`
        SELECT COUNT(*)::int as count FROM transactions
        WHERE agent_id = ${userId} AND status = 'closed'
        AND updated_at >= ${lastMonthStart}::timestamp AND updated_at < ${lastMonthEnd}::timestamp
      `);

      const clientsResult = await db.execute(sql`
        SELECT COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE created_at >= ${monthStart}::timestamp)::int as new_this_month,
          COUNT(*) FILTER (WHERE created_at >= ${lastMonthStart}::timestamp AND created_at < ${lastMonthEnd}::timestamp)::int as last_month
        FROM clients WHERE agent_id = ${userId}
      `);

      const leadsResult = await db.execute(sql`
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'new')::int as new_leads,
          COUNT(*) FILTER (WHERE status = 'converted')::int as converted,
          COUNT(*) FILTER (WHERE created_at >= ${monthStart}::timestamp)::int as this_month
        FROM leads WHERE assigned_agent_id = ${userId}
      `);

      const unreadResult = await db.execute(sql`
        SELECT COUNT(*)::int as count FROM private_messages
        WHERE recipient_id = ${userId} AND read = false
      `);

      const pmActivityResult = await db.execute(sql`
        SELECT EXTRACT(HOUR FROM timestamp::timestamp)::int as hour, COUNT(*)::int as count
        FROM private_messages
        WHERE (sender_id = ${userId} OR recipient_id = ${userId})
        AND timestamp >= ${last24h}
        GROUP BY EXTRACT(HOUR FROM timestamp::timestamp)
      `);
      const smsActivityResult = await db.execute(sql`
        SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*)::int as count
        FROM communications
        WHERE agent_id = ${userId} AND created_at >= ${last24h}::timestamp
        GROUP BY EXTRACT(HOUR FROM created_at)
      `);
      const emailActivityResult = await db.execute(sql`
        SELECT EXTRACT(HOUR FROM sent_at)::int as hour, COUNT(*)::int as count
        FROM email_tracking
        WHERE user_id = ${userId} AND sent_at >= ${last24h}::timestamp
        GROUP BY EXTRACT(HOUR FROM sent_at)
      `);
      const activityChart = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        messages: 0,
        sms: 0,
        emails: 0,
      }));
      for (const row of pmActivityResult.rows as any[]) {
        if (activityChart[row.hour]) activityChart[row.hour].messages = row.count;
      }
      for (const row of smsActivityResult.rows as any[]) {
        if (activityChart[row.hour]) activityChart[row.hour].sms = row.count;
      }
      for (const row of emailActivityResult.rows as any[]) {
        if (activityChart[row.hour]) activityChart[row.hour].emails = row.count;
      }

      const upcomingDeadlines = await db.execute(sql`
        SELECT d.name, d.deadline, d.status, t.street_name, t.id as transaction_id,
          c.first_name as client_first_name, c.last_name as client_last_name
        FROM documents d
        JOIN transactions t ON d.transaction_id = t.id
        LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.agent_id = ${userId}
        AND d.deadline IS NOT NULL
        AND d.deadline >= ${todayStart}::date
        AND d.status != 'complete'
        ORDER BY d.deadline ASC
        LIMIT 5
      `);

      const recentActivity = await db.execute(sql`
        (SELECT 'transaction' as type,
          COALESCE(NULLIF(t.street_name, ''), c.first_name || ' ' || c.last_name, 'Transaction #' || t.id::text) as title,
          COALESCE(t.updated_at, NOW()) as activity_time, t.status as detail
        FROM transactions t
        LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.agent_id = ${userId}
        ORDER BY COALESCE(t.updated_at, NOW()) DESC LIMIT 5)
        UNION ALL
        (SELECT 'lead' as type, first_name || ' ' || last_name as title,
          created_at as activity_time, status as detail
        FROM leads WHERE assigned_agent_id = ${userId}
        ORDER BY created_at DESC LIMIT 5)
        ORDER BY activity_time DESC LIMIT 10
      `);

      const clients = (clientsResult.rows[0] as any) || {};
      const leads = (leadsResult.rows[0] as any) || {};
      const prevClosedCount = ((closedLastMonth.rows[0] as any)?.count) || 0;

      return {
        role: "agent",
        transactions: {
          active: activeCount,
          closed: closedCount,
          stages,
          pipelineValue: totalPipeline,
          closingThisMonth: (closingThisMonth.rows[0] as any)?.count || 0,
          closedChangePercent: prevClosedCount > 0 ? Math.round(((closedCount - prevClosedCount) / prevClosedCount) * 100) : 0,
        },
        clients: {
          total: clients.total || 0,
          newThisMonth: clients.new_this_month || 0,
          changePercent: clients.last_month > 0 ? Math.round(((clients.new_this_month - clients.last_month) / clients.last_month) * 100) : 0,
        },
        leads: {
          total: leads.total || 0,
          new: leads.new_leads || 0,
          converted: leads.converted || 0,
          conversionRate: leads.total > 0 ? Math.round((leads.converted / leads.total) * 100) : 0,
          thisMonth: leads.this_month || 0,
        },
        unreadMessages: (unreadResult.rows[0] as any)?.count || 0,
        activityChart,
        upcomingDeadlines: (upcomingDeadlines.rows as any[]).map(d => ({
          name: d.name,
          deadline: d.deadline,
          status: d.status,
          transactionStreet: d.street_name || (d.client_first_name ? `${d.client_first_name} ${d.client_last_name}` : `Transaction #${d.transaction_id}`),
          transactionId: d.transaction_id,
        })),
        recentActivity: (recentActivity.rows as any[]).map(a => ({
          type: a.type,
          title: a.title,
          time: a.activity_time,
          detail: a.detail,
        })),
      };
    }

    if (role === "vendor") {
      const contractorResult = await db.execute(sql`
        SELECT id FROM contractors WHERE vendor_user_id = ${userId} LIMIT 1
      `);
      const contractorId = (contractorResult.rows[0] as any)?.id;

      let bids: any = { pending: 0, accepted: 0, total: 0 };
      if (contractorId) {
        const bidsResult = await db.execute(sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'submitted')::int as pending,
            COUNT(*) FILTER (WHERE status = 'accepted')::int as accepted,
            COUNT(*)::int as total
          FROM bids WHERE contractor_id = ${contractorId}
        `);
        bids = (bidsResult.rows[0] as any) || bids;
      }

      const leadsResult = await db.execute(sql`
        SELECT COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'new')::int as new_leads
        FROM vendor_leads WHERE assigned_vendor_id = ${userId}
      `);
      const unreadResult = await db.execute(sql`
        SELECT COUNT(*)::int as count FROM private_messages
        WHERE recipient_id = ${userId} AND read = false
      `);
      const leads = (leadsResult.rows[0] as any) || {};
      return {
        role: "vendor",
        bids: { pending: bids.pending || 0, accepted: bids.accepted || 0, total: bids.total || 0 },
        leads: { total: leads.total || 0, new: leads.new_leads || 0 },
        unreadMessages: (unreadResult.rows[0] as any)?.count || 0,
      };
    }

    if (role === "lender") {
      const pipelineResult = await db.execute(sql`
        SELECT lender_status, COUNT(*)::int as count
        FROM transactions
        WHERE EXISTS (
          SELECT 1 FROM json_array_elements(participants::json) p
          WHERE (p->>'userId')::int = ${userId}
        )
        GROUP BY lender_status
      `);
      const stages: Record<string, number> = {};
      let total = 0;
      for (const row of pipelineResult.rows as any[]) {
        stages[row.lender_status || "unknown"] = row.count;
        total += row.count;
      }
      const unreadResult = await db.execute(sql`
        SELECT COUNT(*)::int as count FROM private_messages
        WHERE recipient_id = ${userId} AND read = false
      `);
      return {
        role: "lender",
        pipeline: { total, stages },
        unreadMessages: (unreadResult.rows[0] as any)?.count || 0,
      };
    }

    if (role === "admin") {
      const usersResult = await db.execute(sql`
        SELECT COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE role = 'agent')::int as agents,
          COUNT(*) FILTER (WHERE role = 'broker')::int as brokers,
          COUNT(*) FILTER (WHERE role = 'client')::int as clients,
          COUNT(*) FILTER (WHERE role = 'vendor')::int as vendors,
          COUNT(*) FILTER (WHERE role = 'lender')::int as lenders,
          COUNT(*) FILTER (WHERE created_at >= ${monthStart}::timestamp)::int as new_this_month
        FROM users
      `);
      const txResult = await db.execute(sql`
        SELECT COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'closed')::int as closed,
          COUNT(*) FILTER (WHERE status != 'closed')::int as active
        FROM transactions
      `);
      const leadsResult = await db.execute(sql`
        SELECT COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'new')::int as pending
        FROM leads
      `);
      const unreadResult = await db.execute(sql`
        SELECT COUNT(*)::int as count FROM private_messages
        WHERE recipient_id = ${userId} AND read = false
      `);
      const users = (usersResult.rows[0] as any) || {};
      const txs = (txResult.rows[0] as any) || {};
      const leads = (leadsResult.rows[0] as any) || {};
      return {
        role: "admin",
        users: {
          total: users.total || 0,
          agents: users.agents || 0,
          brokers: users.brokers || 0,
          clients: users.clients || 0,
          vendors: users.vendors || 0,
          lenders: users.lenders || 0,
          newThisMonth: users.new_this_month || 0,
        },
        transactions: {
          total: txs.total || 0,
          active: txs.active || 0,
          closed: txs.closed || 0,
        },
        leads: {
          total: leads.total || 0,
          pending: leads.pending || 0,
        },
        unreadMessages: (unreadResult.rows[0] as any)?.count || 0,
      };
    }

    if (role === "client") {
      const txResult = await db.execute(sql`
        SELECT t.id, t.street_name, t.city, t.status, t.closing_date, t.contract_price, t.type
        FROM transactions t
        JOIN users u ON u.id = ${userId}
        WHERE t.client_id = u.client_record_id OR t.secondary_client_id = u.client_record_id OR t.id = u.claimed_transaction_id
      `);

      const participantResult = await db.execute(sql`
        SELECT id, street_name, city, status, closing_date, contract_price, type, participants
        FROM transactions
      `);
      const extraTxs = (participantResult.rows as any[]).filter(row => {
        const parts = (row.participants as any[]) || [];
        return parts.some((p: any) => p.userId === userId) &&
          !(txResult.rows as any[]).some((t: any) => t.id === row.id);
      });

      const allTxRows = [...(txResult.rows as any[]), ...extraTxs];

      const transactions = [];
      let totalPendingDocs = 0;
      for (const tx of allTxRows) {
        const docsResult = await db.execute(sql`
          SELECT COUNT(*)::int as count FROM documents
          WHERE transaction_id = ${tx.id} AND status IN ('waiting_signatures', 'waiting_others')
        `);
        const pendingDocs = (docsResult.rows[0] as any)?.count || 0;
        totalPendingDocs += pendingDocs;
        transactions.push({
          id: tx.id,
          streetName: tx.street_name,
          city: tx.city,
          status: tx.status,
          closingDate: tx.closing_date,
          contractPrice: tx.contract_price,
          type: tx.type,
          pendingDocuments: pendingDocs,
        });
      }

      const unreadResult = await db.execute(sql`
        SELECT COUNT(*)::int as count FROM private_messages
        WHERE recipient_id = ${userId} AND read = false
      `);

      return {
        role: "client",
        transaction: transactions[0] || null,
        transactions,
        pendingDocuments: totalPendingDocs,
        unreadMessages: (unreadResult.rows[0] as any)?.count || 0,
      };
    }

    return { role, unreadMessages: 0 };
  }

  async getDashboardPreferences(userId: number): Promise<any> {
    const result = await db.execute(sql`
      SELECT dashboard_preferences FROM users WHERE id = ${userId}
    `);
    return (result.rows[0] as any)?.dashboard_preferences || null;
  }

  async updateDashboardPreferences(userId: number, preferences: any): Promise<any> {
    await db.execute(sql`
      UPDATE users SET dashboard_preferences = ${JSON.stringify(preferences)}::jsonb
      WHERE id = ${userId}
    `);
    return preferences;
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
      if (!data.role || !data.firstName || !data.lastName || !data.transactionId) {
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
            const role = data.role ?? null;
            const firstName = data.firstName ?? null;
            const lastName = data.lastName ?? null;
            const email = data.email ?? null;
            const phone = data.phone ?? null;
            const mobilePhone = data.mobilePhone ?? null;
            const clientId = data.clientId ?? null;

            const result = await db.execute(sql`
        UPDATE contacts 
        SET 
          role = COALESCE(${role}, role),
          first_name = COALESCE(${firstName}, first_name),
          last_name = COALESCE(${lastName}, last_name),
          email = COALESCE(${email}, email),
          phone = COALESCE(${phone}, phone),
          mobile_phone = COALESCE(${mobilePhone}, mobile_phone),
          client_id = COALESCE(${clientId}, client_id)
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

  async getClient(id: number): Promise<Client | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id, first_name as "firstName", last_name as "lastName",
          email, phone, mobile_phone as "mobilePhone", address, street, city,
          zip_code as "zipCode", type, status, notes, labels, source,
          agent_id as "agentId", linked_client_id as "linkedClientId",
          birthday, anniversary,
          created_at as "createdAt", updated_at as "updatedAt"
        FROM clients WHERE id = ${id} LIMIT 1
      `);
      if (result.rows.length === 0) return undefined;
      const row = result.rows[0];
      return {
        id: Number(row.id),
        firstName: String(row.firstName),
        lastName: String(row.lastName),
        email: row.email ? String(row.email) : null,
        phone: row.phone ? String(row.phone) : null,
        mobilePhone: row.mobilePhone ? String(row.mobilePhone) : null,
        address: row.address ? String(row.address) : null,
        street: row.street ? String(row.street) : null,
        city: row.city ? String(row.city) : null,
        zipCode: row.zipCode ? String(row.zipCode) : null,
        type: Array.isArray(row.type) ? row.type : [String(row.type).replace(/[{}]/g, '')],
        status: String(row.status),
        notes: row.notes ? String(row.notes) : null,
        labels: Array.isArray(row.labels) ? row.labels : [],
        source: row.source ? String(row.source) : null,
        agentId: Number(row.agentId),
        linkedClientId: row.linkedClientId ? Number(row.linkedClientId) : null,
        birthday: row.birthday ? String(row.birthday) : null,
        anniversary: row.anniversary ? String(row.anniversary) : null,
        createdAt: new Date(row.createdAt as string),
        updatedAt: new Date(row.updatedAt as string),
      };
    } catch (error) {
      console.error('Error in getClient:', error);
      return undefined;
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
          street,
          city,
          zip_code as "zipCode",
          type,
          status,
          notes,
          labels,
          source,
          agent_id as "agentId",
          linked_client_id as "linkedClientId",
          birthday,
          anniversary,
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
        street: row.street ? String(row.street) : null,
        city: row.city ? String(row.city) : null,
        zipCode: row.zipCode ? String(row.zipCode) : null,
        type: Array.isArray(row.type) ? row.type : [String(row.type).replace(/[{}]/g, '')],
        status: String(row.status),
        notes: row.notes ? String(row.notes) : null,
        labels: Array.isArray(row.labels) ? row.labels : [],
        source: row.source ? String(row.source) : null,
        agentId: Number(row.agentId),
        linkedClientId: row.linkedClientId ? Number(row.linkedClientId) : null,
        birthday: row.birthday ? String(row.birthday) : null,
        anniversary: row.anniversary ? String(row.anniversary) : null,
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
      const activeCheck = await db.execute(sql`
        SELECT id, street_name FROM transactions
        WHERE (client_id = ${clientId} OR secondary_client_id = ${clientId})
          AND status NOT IN ('closed', 'cancelled', 'withdrawn', 'expired')
        LIMIT 5
      `);
      if (activeCheck.rows.length > 0) {
        const txNames = activeCheck.rows.map((r: Record<string, unknown>) => String(r.street_name || `#${r.id}`)).join(', ');
        const err = Object.assign(new Error(`Cannot delete client: assigned to active transaction(s): ${txNames}`), { statusCode: 409 });
        throw err;
      }
      await db.execute(sql`UPDATE clients SET linked_client_id = NULL WHERE linked_client_id = ${clientId}`);
      await db.delete(clients).where(sql`id = ${clientId}`);
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) throw error;
      console.error('Error in deleteClient:', error);
      throw error;
    }
  }

  async linkClients(clientId: number, linkedClientId: number): Promise<void> {
    try {
      await db.execute(sql`UPDATE clients SET linked_client_id = ${linkedClientId}, updated_at = CURRENT_TIMESTAMP WHERE id = ${clientId}`);
      await db.execute(sql`UPDATE clients SET linked_client_id = ${clientId}, updated_at = CURRENT_TIMESTAMP WHERE id = ${linkedClientId}`);
    } catch (error) {
      console.error('Error in linkClients:', error);
      throw error;
    }
  }

  async unlinkClients(clientId: number): Promise<void> {
    try {
      const client = await this.getClient(clientId);
      if (client?.linkedClientId) {
        await db.execute(sql`UPDATE clients SET linked_client_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ${client.linkedClientId}`);
      }
      await db.execute(sql`UPDATE clients SET linked_client_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ${clientId}`);
    } catch (error) {
      console.error('Error in unlinkClients:', error);
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
        source: (client as any).source ? String((client as any).source) : null,
        agentId: Number(client.agentId),
        linkedClientId: client.linkedClientId ? Number(client.linkedClientId) : null,
        birthday: client.birthday ? String(client.birthday) : null,
        anniversary: client.anniversary ? String(client.anniversary) : null,
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
          client_id as "clientId",
          signing_url as "signingUrl",
          signing_platform as "signingPlatform",
          docusign_envelope_id as "docusignEnvelopeId",
          signnow_document_id as "signnowDocumentId"
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
        clientId: doc.clientId ? Number(doc.clientId) : null,
        signingUrl: doc.signingUrl ? String(doc.signingUrl) : null,
        signingPlatform: doc.signingPlatform ? String(doc.signingPlatform) : null,
        docusignEnvelopeId: doc.docusignEnvelopeId ? String(doc.docusignEnvelopeId) : null,
        signnowDocumentId: doc.signnowDocumentId ? String(doc.signnowDocumentId) : null
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
      if (data.transactionId !== undefined) updateData.transactionId = Number(data.transactionId);
      if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
      if (data.deadlineTime !== undefined) updateData.deadlineTime = data.deadlineTime;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.clientId !== undefined) updateData.clientId = data.clientId ? Number(data.clientId) : null;
      if ((data as any).signingUrl !== undefined) updateData.signingUrl = (data as any).signingUrl || null;
      if ((data as any).signingPlatform !== undefined) updateData.signingPlatform = (data as any).signingPlatform || null;
      if ((data as any).manuallyMoved !== undefined) updateData.manuallyMoved = Boolean((data as any).manuallyMoved);
      updateData.updatedAt = new Date();

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
        clientId: doc.clientId ? Number(doc.clientId) : null,
        signingUrl: (doc as any).signingUrl || null,
        signingPlatform: (doc as any).signingPlatform || null
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
      await db.transaction(async (tx) => {
        await tx.execute(sql`DELETE FROM bids WHERE bid_request_id IN (SELECT id FROM bid_requests WHERE transaction_id = ${id})`);
        await tx.execute(sql`DELETE FROM bid_requests WHERE transaction_id = ${id}`);
        await tx.execute(sql`DELETE FROM inspection_items WHERE transaction_id = ${id}`);
        await tx.execute(sql`DELETE FROM inspection_pdfs WHERE transaction_id = ${id}`);
        await tx.execute(sql`DELETE FROM documents WHERE transaction_id = ${id}`);
        await tx.execute(sql`DELETE FROM checklists WHERE transaction_id = ${id}`);
        await tx.execute(sql`DELETE FROM messages WHERE transaction_id = ${id}`);
        await tx.execute(sql`DELETE FROM contacts WHERE transaction_id = ${id}`);
        await tx.execute(sql`DELETE FROM feedback_requests WHERE transaction_id = ${id}`);
        await tx.execute(sql`DELETE FROM scanned_documents WHERE transaction_id = ${id}`);
        await tx.execute(sql`DELETE FROM agent_reviews WHERE transaction_id = ${id}`);
        await tx.execute(sql`DELETE FROM commission_entries WHERE transaction_id = ${id}`);
        await tx.execute(sql`DELETE FROM vendor_ratings WHERE transaction_id = ${id}`);
        await tx.execute(sql`DELETE FROM tasks WHERE transaction_id = ${id}`);
        await tx.execute(sql`UPDATE open_houses SET transaction_id = NULL WHERE transaction_id = ${id}`);
        await tx.execute(sql`UPDATE homeowner_homes SET transaction_id = NULL WHERE transaction_id = ${id}`);
        await tx.execute(sql`DELETE FROM transactions WHERE id = ${id}`);
      });
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
        clientId: doc.client_id ? Number(doc.client_id) : null,
        signingUrl: doc.signing_url ? String(doc.signing_url) : null,
        signingPlatform: doc.signing_platform ? String(doc.signing_platform) as Document['signingPlatform'] : null,
        signnowDocumentId: doc.signnow_document_id ? String(doc.signnow_document_id) : null,
        docusignEnvelopeId: doc.docusign_envelope_id ? String(doc.docusign_envelope_id) : null,
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
        clientId: doc.client_id ? Number(doc.client_id) : null,
        signingUrl: doc.signing_url ? String(doc.signing_url) : null,
        signingPlatform: doc.signing_platform ? String(doc.signing_platform) : null,
        docusignEnvelopeId: doc.docusign_envelope_id ? String(doc.docusign_envelope_id) : null,
        signnowDocumentId: doc.signnow_document_id ? String(doc.signnow_document_id) : null
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
      if (data.transactionId !== undefined) updateData.transactionId = Number(data.transactionId);
      if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
      if (data.deadlineTime !== undefined) updateData.deadlineTime = data.deadlineTime;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.clientId !== undefined) updateData.clientId = data.clientId ? Number(data.clientId) : null;
      if ((data as any).signingUrl !== undefined) updateData.signingUrl = (data as any).signingUrl || null;
      if ((data as any).signingPlatform !== undefined) updateData.signingPlatform = (data as any).signingPlatform || null;
      if ((data as any).manuallyMoved !== undefined) updateData.manuallyMoved = Boolean((data as any).manuallyMoved);
      updateData.updatedAt = new Date();

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
        clientId: doc.clientId ? Number(doc.clientId) : null,
        signingUrl: (doc as any).signingUrl || null,
        signingPlatform: (doc as any).signingPlatform || null
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

      // Special handling for type array
      if ('type' in sanitizedData) {
        const typeArray = Array.isArray(sanitizedData.type) 
          ? sanitizedData.type.filter(t => typeof t === 'string' && t.trim().length > 0)
          : [String(sanitizedData.type)];
        
        await db.execute(sql`
          UPDATE clients 
          SET type = array[${sql.join(typeArray, sql`, `)}]::text[]
          WHERE id = ${id}
        `);
        delete sanitizedData.type;
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
          street,
          city,
          zip_code as "zipCode",
          type,
          status,
          notes,
          labels,
          source,
          agent_id as "agentId",
          linked_client_id as "linkedClientId",
          birthday,
          anniversary,
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
        street: row.street,
        city: row.city,
        zipCode: row.zipCode,
        type: Array.isArray(row.type) ? row.type : [String(row.type).replace(/[{}]/g, '')],
        status: String(row.status),
        notes: row.notes,
        labels: Array.isArray(row.labels) ? row.labels : [],
        source: row.source || null,
        agentId: Number(row.agentId),
        linkedClientId: row.linkedClientId ? Number(row.linkedClientId) : null,
        birthday: row.birthday || null,
        anniversary: row.anniversary || null,
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
          street,
          city,
          zip_code as "zipCode",
          type,
          status,
          notes,
          labels,
          source,
          agent_id as "agentId",
          linked_client_id as "linkedClientId",
          birthday,
          anniversary,
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
        street: row.street ? String(row.street) : null,
        city: row.city ? String(row.city) : null,
        zipCode: row.zipCode ? String(row.zipCode) : null,
        type: Array.isArray(row.type) ? row.type : [String(row.type).replace(/[{}]/g, '')],
        status: String(row.status),
        notes: row.notes ? String(row.notes) : null,
        labels: Array.isArray(row.labels) ? row.labels : [],
        source: row.source ? String(row.source) : null,
        agentId: Number(row.agentId),
        linkedClientId: row.linkedClientId ? Number(row.linkedClientId) : null,
        birthday: row.birthday ? String(row.birthday) : null,
        anniversary: row.anniversary ? String(row.anniversary) : null,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      }));
    } catch (error) {
      console.error('Error in getClientsByAgent:', error);
      return [];
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
        source: (client as any).source ? String((client as any).source) : null,
        agentId: Number(client.agentId),
        linkedClientId: client.linkedClientId ? Number(client.linkedClientId) : null,
        birthday: client.birthday ? String(client.birthday) : null,
        anniversary: client.anniversary ? String(client.anniversary) : null,
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
          client_id as "clientId",
          signing_url as "signingUrl",
          signing_platform as "signingPlatform",
          docusign_envelope_id as "docusignEnvelopeId",
          signnow_document_id as "signnowDocumentId"
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
        clientId: doc.clientId ? Number(doc.clientId) : null,
        signingUrl: doc.signingUrl ? String(doc.signingUrl) : null,
        signingPlatform: doc.signingPlatform ? String(doc.signingPlatform) : null,
        docusignEnvelopeId: doc.docusignEnvelopeId ? String(doc.docusignEnvelopeId) : null,
        signnowDocumentId: doc.signnowDocumentId ? String(doc.signnowDocumentId) : null
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
      if (data.transactionId !== undefined) updateData.transactionId = Number(data.transactionId);
      if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
      if (data.deadlineTime !== undefined) updateData.deadlineTime = data.deadlineTime;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.clientId !== undefined) updateData.clientId = data.clientId ? Number(data.clientId) : null;
      if ((data as any).signingUrl !== undefined) updateData.signingUrl = (data as any).signingUrl || null;
      if ((data as any).signingPlatform !== undefined) updateData.signingPlatform = (data as any).signingPlatform || null;
      if ((data as any).manuallyMoved !== undefined) updateData.manuallyMoved = Boolean((data as any).manuallyMoved);
      updateData.updatedAt = new Date();

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
        clientId: doc.clientId ? Number(doc.clientId) : null,
        signingUrl: (doc as any).signingUrl || null,
        signingPlatform: (doc as any).signingPlatform || null
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

      const user = result.rows[0] as any;
      return {
        id: Number(user.id),
        email: String(user.email),
        password: String(user.password),
        firstName: String(user.first_name),
        lastName: String(user.last_name),
        role: String(user.role),
        agentId: user.agent_id ? Number(user.agent_id) : null,
        clientRecordId: user.client_record_id ? Number(user.client_record_id) : null,
        claimedTransactionId: user.claimed_transaction_id ? Number(user.claimed_transaction_id) : null,
        claimedAccessCode: user.claimed_access_code ? String(user.claimed_access_code) : null,
        stripeCustomerId: user.stripe_customer_id ? String(user.stripe_customer_id) : null,
        stripeSubscriptionId: user.stripe_subscription_id ? String(user.stripe_subscription_id) : null,
        dashboardPreferences: user.dashboard_preferences ?? null,
        emailVerified: user.email_verified ?? false,
        emailVerificationToken: user.email_verification_token ?? null,
        emailVerificationExpires: user.email_verification_expires ?? null,
        registrationIp: user.registration_ip ?? null,
        brokerageId: user.brokerage_id ? Number(user.brokerage_id) : null,
        accountStatus: user.account_status ?? "active",
      };
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  }

  // Contractor methods
  async getContractors(agentId: number): Promise<Contractor[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM contractors WHERE agent_id = ${agentId} ORDER BY name
      `);
      return result.rows.map((row: any) => this.mapContractorRow(row));
    } catch (error) {
      console.error('Error in getContractors:', error);
      throw error;
    }
  }

  async getAllContractors(): Promise<Contractor[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM contractors WHERE created_by_user_id IS NULL AND vendor_user_id IS NOT NULL ORDER BY name
      `);
      return result.rows.map((row: any) => this.mapContractorRow(row));
    } catch (error) {
      console.error('Error in getAllContractors:', error);
      throw error;
    }
  }

  async getContractor(id: number): Promise<Contractor | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM contractors WHERE id = ${id}
      `);
      if (!result.rows[0]) return undefined;
      return this.mapContractorRow(result.rows[0] as any);
    } catch (error) {
      console.error('Error in getContractor:', error);
      throw error;
    }
  }

  async createContractor(contractor: InsertContractor): Promise<Contractor> {
    try {
      const result = await db.execute(sql`
        INSERT INTO contractors (
          name, category, phone, email, website, address, city, state, zip_code,
          description, google_maps_url, yelp_url, bbb_url, agent_id, agent_rating, agent_notes, vendor_user_id, created_by_user_id
        ) VALUES (
          ${contractor.name}, ${contractor.category}, ${contractor.phone || null},
          ${contractor.email || null}, ${contractor.website || null}, ${contractor.address || null},
          ${contractor.city || null}, ${contractor.state || null}, ${contractor.zipCode || null},
          ${contractor.description || null}, ${contractor.googleMapsUrl || null},
          ${contractor.yelpUrl || null}, ${contractor.bbbUrl || null},
          ${contractor.agentId}, ${contractor.agentRating || null}, ${contractor.agentNotes || null},
          ${contractor.vendorUserId || null}, ${contractor.createdByUserId || null}
        )
        RETURNING *
      `);
      return this.mapContractorRow(result.rows[0] as any);
    } catch (error) {
      console.error('Error in createContractor:', error);
      throw error;
    }
  }

  async updateContractor(id: number, data: Partial<Contractor>): Promise<Contractor> {
    try {
      const columns = Object.entries(data)
        .filter(([key, value]) => value !== undefined && key !== 'id')
        .map(([key, value]) => {
          const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          return sql`${sql.identifier([snakeKey])} = ${value}`;
        });

      if (columns.length === 0) {
        const existing = await this.getContractor(id);
        if (!existing) throw new Error('Contractor not found');
        return existing;
      }

      const result = await db.execute(sql`
        UPDATE contractors
        SET ${sql.join(columns, sql`, `)}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);

      if (!result.rows[0]) {
        throw new Error('Failed to update contractor');
      }

      return this.mapContractorRow(result.rows[0] as any);
    } catch (error) {
      console.error('Error in updateContractor:', error);
      throw error;
    }
  }

  async deleteContractor(id: number): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`UPDATE bids SET contractor_id = NULL WHERE contractor_id = ${id}`);
        await tx.execute(sql`UPDATE bid_requests SET contractor_id = NULL WHERE contractor_id = ${id}`);
        await tx.execute(sql`DELETE FROM contractor_reviews WHERE contractor_id = ${id}`);
        await tx.execute(sql`DELETE FROM contractors WHERE id = ${id}`);
      });
    } catch (error) {
      console.error('Error in deleteContractor:', error);
      throw error;
    }
  }

  async getContractorReviews(contractorId: number): Promise<ContractorReview[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM contractor_reviews WHERE contractor_id = ${contractorId} ORDER BY created_at DESC
      `);
      return result.rows.map((row: any) => ({
        id: Number(row.id),
        contractorId: Number(row.contractor_id),
        reviewerName: String(row.reviewer_name),
        rating: Number(row.rating),
        comment: row.comment ? String(row.comment) : null,
        createdAt: row.created_at ? new Date(row.created_at) : null
      }));
    } catch (error) {
      console.error('Error in getContractorReviews:', error);
      throw error;
    }
  }

  async createContractorReview(review: InsertContractorReview): Promise<ContractorReview> {
    try {
      const result = await db.execute(sql`
        INSERT INTO contractor_reviews (contractor_id, reviewer_name, rating, comment)
        VALUES (${review.contractorId}, ${review.reviewerName}, ${review.rating}, ${review.comment || null})
        RETURNING *
      `);
      const row = result.rows[0] as any;
      return {
        id: Number(row.id),
        contractorId: Number(row.contractor_id),
        reviewerName: String(row.reviewer_name),
        rating: Number(row.rating),
        comment: row.comment ? String(row.comment) : null,
        createdAt: row.created_at ? new Date(row.created_at) : null
      };
    } catch (error) {
      console.error('Error in createContractorReview:', error);
      throw error;
    }
  }

  async deleteContractorReview(id: number): Promise<void> {
    try {
      await db.execute(sql`DELETE FROM contractor_reviews WHERE id = ${id}`);
    } catch (error) {
      console.error('Error in deleteContractorReview:', error);
      throw error;
    }
  }

  private mapContractorRow(row: any): Contractor {
    return {
      id: Number(row.id),
      name: String(row.name),
      category: String(row.category),
      phone: row.phone ? String(row.phone) : null,
      email: row.email ? String(row.email) : null,
      website: row.website ? String(row.website) : null,
      address: row.address ? String(row.address) : null,
      city: row.city ? String(row.city) : null,
      state: row.state ? String(row.state) : null,
      zipCode: row.zip_code ? String(row.zip_code) : null,
      description: row.description ? String(row.description) : null,
      googleMapsUrl: row.google_maps_url ? String(row.google_maps_url) : null,
      yelpUrl: row.yelp_url ? String(row.yelp_url) : null,
      bbbUrl: row.bbb_url ? String(row.bbb_url) : null,
      vendorUserId: row.vendor_user_id ? Number(row.vendor_user_id) : null,
      agentId: Number(row.agent_id),
      agentRating: row.agent_rating ? Number(row.agent_rating) : null,
      agentNotes: row.agent_notes ? String(row.agent_notes) : null,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
      createdByUserId: row.created_by_user_id ? Number(row.created_by_user_id) : null,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null
    };
  }

  // Contractor recommendation methods
  async getContractorRecommendations(contractorId: number): Promise<{ agentId: number; agentName: string }[]> {
    try {
      const result = await db.execute(sql`
        SELECT cr.agent_id, u.first_name, u.last_name 
        FROM contractor_recommendations cr 
        JOIN users u ON cr.agent_id = u.id 
        WHERE cr.contractor_id = ${contractorId}
      `);
      return result.rows.map((row: any) => ({
        agentId: Number(row.agent_id),
        agentName: `${row.first_name} ${row.last_name}`
      }));
    } catch (error) {
      console.error('Error in getContractorRecommendations:', error);
      throw error;
    }
  }

  async getContractorRecommendationCount(contractorId: number): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count FROM contractor_recommendations WHERE contractor_id = ${contractorId}
      `);
      return Number((result.rows[0] as any)?.count || 0);
    } catch (error) {
      console.error('Error in getContractorRecommendationCount:', error);
      throw error;
    }
  }

  async hasAgentRecommended(contractorId: number, agentId: number): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT 1 FROM contractor_recommendations WHERE contractor_id = ${contractorId} AND agent_id = ${agentId}
      `);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in hasAgentRecommended:', error);
      throw error;
    }
  }

  async addContractorRecommendation(contractorId: number, agentId: number): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO contractor_recommendations (contractor_id, agent_id) 
        VALUES (${contractorId}, ${agentId}) 
        ON CONFLICT DO NOTHING
      `);
    } catch (error) {
      console.error('Error in addContractorRecommendation:', error);
      throw error;
    }
  }

  async removeContractorRecommendation(contractorId: number, agentId: number): Promise<void> {
    try {
      await db.execute(sql`
        DELETE FROM contractor_recommendations WHERE contractor_id = ${contractorId} AND agent_id = ${agentId}
      `);
    } catch (error) {
      console.error('Error in removeContractorRecommendation:', error);
      throw error;
    }
  }

  // Property Viewing Methods
  async getViewingsByAgent(agentId: number): Promise<PropertyViewing[]> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM property_viewings WHERE agent_id = ${agentId} ORDER BY created_at DESC`
      );
      return (result.rows as any[]).map(this.mapViewingRow);
    } catch (error) {
      console.error('Error in getViewingsByAgent:', error);
      throw error;
    }
  }

  async getViewingsByClient(clientId: number): Promise<PropertyViewing[]> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM property_viewings WHERE client_id = ${clientId} ORDER BY created_at DESC`
      );
      return (result.rows as any[]).map(this.mapViewingRow);
    } catch (error) {
      console.error('Error in getViewingsByClient:', error);
      throw error;
    }
  }

  async getViewing(id: number): Promise<PropertyViewing | undefined> {
    try {
      const result = await db.execute(sql`SELECT * FROM property_viewings WHERE id = ${id}`);
      if (result.rows.length === 0) return undefined;
      return this.mapViewingRow(result.rows[0]);
    } catch (error) {
      console.error('Error in getViewing:', error);
      throw error;
    }
  }

  async createViewing(viewing: InsertPropertyViewing): Promise<PropertyViewing> {
    try {
      const result = await db.execute(sql`
        INSERT INTO property_viewings (agent_id, client_id, address, city, state, zip_code, latitude, longitude, status, scheduled_date, notes)
        VALUES (${viewing.agentId}, ${viewing.clientId}, ${viewing.address}, ${viewing.city}, ${viewing.state}, ${viewing.zipCode || null}, ${viewing.latitude || null}, ${viewing.longitude || null}, ${viewing.status || 'scheduled'}, ${viewing.scheduledDate || null}, ${viewing.notes || null})
        RETURNING *
      `);
      return this.mapViewingRow(result.rows[0]);
    } catch (error) {
      console.error('Error in createViewing:', error);
      throw error;
    }
  }

  async updateViewing(id: number, data: Partial<PropertyViewing>): Promise<PropertyViewing> {
    try {
      const existing = await this.getViewing(id);
      if (!existing) throw new Error('Viewing not found');
      
      const updates: string[] = [];
      const values: any[] = [];
      
      if (data.address !== undefined) { updates.push('address'); values.push(data.address); }
      if (data.city !== undefined) { updates.push('city'); values.push(data.city); }
      if (data.state !== undefined) { updates.push('state'); values.push(data.state); }
      if (data.zipCode !== undefined) { updates.push('zip_code'); values.push(data.zipCode); }
      if (data.latitude !== undefined) { updates.push('latitude'); values.push(data.latitude); }
      if (data.longitude !== undefined) { updates.push('longitude'); values.push(data.longitude); }
      if (data.status !== undefined) { updates.push('status'); values.push(data.status); }
      if (data.scheduledDate !== undefined) { updates.push('scheduled_date'); values.push(data.scheduledDate); }
      if (data.notes !== undefined) { updates.push('notes'); values.push(data.notes); }
      
      if (updates.length === 0) return existing;
      
      const setClause = updates.map((col, i) => `${col} = $${i + 2}`).join(', ');
      const query = `UPDATE property_viewings SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
      const result = await db.execute(sql.raw(query, [id, ...values]));
      return this.mapViewingRow(result.rows[0]);
    } catch (error) {
      console.error('Error in updateViewing:', error);
      throw error;
    }
  }

  async deleteViewing(id: number): Promise<void> {
    try {
      await db.execute(sql`DELETE FROM property_feedback WHERE viewing_id = ${id}`);
      await db.execute(sql`DELETE FROM property_viewings WHERE id = ${id}`);
    } catch (error) {
      console.error('Error in deleteViewing:', error);
      throw error;
    }
  }

  // Property Feedback Methods
  async getFeedbackByViewing(viewingId: number): Promise<PropertyFeedback[]> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM property_feedback WHERE viewing_id = ${viewingId} ORDER BY created_at DESC`
      );
      return (result.rows as any[]).map(this.mapFeedbackRow);
    } catch (error) {
      console.error('Error in getFeedbackByViewing:', error);
      throw error;
    }
  }

  async getFeedbackByClient(clientId: number): Promise<PropertyFeedback[]> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM property_feedback WHERE client_id = ${clientId} ORDER BY created_at DESC`
      );
      return (result.rows as any[]).map(this.mapFeedbackRow);
    } catch (error) {
      console.error('Error in getFeedbackByClient:', error);
      throw error;
    }
  }

  async getFeedback(id: number): Promise<PropertyFeedback | undefined> {
    try {
      const result = await db.execute(sql`SELECT * FROM property_feedback WHERE id = ${id}`);
      if (result.rows.length === 0) return undefined;
      return this.mapFeedbackRow(result.rows[0]);
    } catch (error) {
      console.error('Error in getFeedback:', error);
      throw error;
    }
  }

  async createFeedback(feedback: InsertPropertyFeedback): Promise<PropertyFeedback> {
    try {
      const result = await db.execute(sql`
        INSERT INTO property_feedback (viewing_id, client_id, rating, liked, disliked, overall_impression, would_purchase)
        VALUES (${feedback.viewingId}, ${feedback.clientId}, ${feedback.rating}, ${feedback.liked || null}, ${feedback.disliked || null}, ${feedback.overallImpression || null}, ${feedback.wouldPurchase ?? null})
        RETURNING *
      `);
      return this.mapFeedbackRow(result.rows[0]);
    } catch (error) {
      console.error('Error in createFeedback:', error);
      throw error;
    }
  }

  async updateFeedback(id: number, data: Partial<PropertyFeedback>): Promise<PropertyFeedback> {
    try {
      const result = await db.execute(sql`
        UPDATE property_feedback
        SET rating = COALESCE(${data.rating ?? null}, rating),
            liked = COALESCE(${data.liked ?? null}, liked),
            disliked = COALESCE(${data.disliked ?? null}, disliked),
            overall_impression = COALESCE(${data.overallImpression ?? null}, overall_impression),
            would_purchase = COALESCE(${data.wouldPurchase ?? null}, would_purchase),
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      if (result.rows.length === 0) throw new Error('Feedback not found');
      return this.mapFeedbackRow(result.rows[0]);
    } catch (error) {
      console.error('Error in updateFeedback:', error);
      throw error;
    }
  }

  async deleteFeedback(id: number): Promise<void> {
    try {
      await db.execute(sql`DELETE FROM property_feedback WHERE id = ${id}`);
    } catch (error) {
      console.error('Error in deleteFeedback:', error);
      throw error;
    }
  }

  // Map data operations
  async getTransactionsWithCoordinates(agentId: number): Promise<Transaction[]> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM transactions WHERE agent_id = ${agentId} AND latitude IS NOT NULL AND longitude IS NOT NULL`
      );
      return (result.rows as any[]).map(this.mapTransactionRow.bind(this));
    } catch (error) {
      console.error('Error in getTransactionsWithCoordinates:', error);
      throw error;
    }
  }

  async updateTransactionCoordinates(id: number, lat: number, lon: number): Promise<void> {
    try {
      await db.execute(sql`UPDATE transactions SET latitude = ${lat}, longitude = ${lon} WHERE id = ${id}`);
    } catch (error) {
      console.error('Error in updateTransactionCoordinates:', error);
      throw error;
    }
  }

  // Showing request operations
  async getShowingRequestsByUser(userId: number, clientRecordId?: number | null): Promise<ShowingRequest[]> {
    try {
      let query;
      if (clientRecordId) {
        query = sql`SELECT * FROM showing_requests WHERE requester_id = ${userId} OR recipient_id = ${userId} OR requester_id = ${clientRecordId} OR recipient_id = ${clientRecordId} ORDER BY created_at DESC`;
      } else {
        query = sql`SELECT * FROM showing_requests WHERE requester_id = ${userId} OR recipient_id = ${userId} ORDER BY created_at DESC`;
      }
      const result = await db.execute(query);
      return (result.rows as any[]).map(this.mapShowingRequestRow.bind(this));
    } catch (error) {
      console.error('Error in getShowingRequestsByUser:', error);
      throw error;
    }
  }

  async getShowingRequest(id: number): Promise<ShowingRequest | undefined> {
    try {
      const result = await db.execute(sql`SELECT * FROM showing_requests WHERE id = ${id}`);
      if (result.rows.length === 0) return undefined;
      return this.mapShowingRequestRow(result.rows[0]);
    } catch (error) {
      console.error('Error in getShowingRequest:', error);
      throw error;
    }
  }

  async createShowingRequest(request: InsertShowingRequest): Promise<ShowingRequest> {
    try {
      const result = await db.execute(sql`
        INSERT INTO showing_requests (viewing_id, requester_id, recipient_id, requested_date, status, notes)
        VALUES (${request.viewingId}, ${request.requesterId}, ${request.recipientId}, ${request.requestedDate}, ${request.status || 'pending'}, ${request.notes || null})
        RETURNING *
      `);
      return this.mapShowingRequestRow(result.rows[0]);
    } catch (error) {
      console.error('Error in createShowingRequest:', error);
      throw error;
    }
  }

  async updateShowingRequest(id: number, data: Partial<ShowingRequest>): Promise<ShowingRequest> {
    try {
      const updates: string[] = [];
      if (data.status !== undefined) updates.push(`status = '${data.status}'`);
      if (data.responseNotes !== undefined) updates.push(`response_notes = '${data.responseNotes}'`);
      if (data.requestedDate !== undefined) updates.push(`requested_date = '${data.requestedDate}'`);
      updates.push(`updated_at = NOW()`);

      const result = await db.execute(sql`
        UPDATE showing_requests SET ${sql.raw(updates.join(', '))} WHERE id = ${id} RETURNING *
      `);
      return this.mapShowingRequestRow(result.rows[0]);
    } catch (error) {
      console.error('Error in updateShowingRequest:', error);
      throw error;
    }
  }

  async deleteShowingRequest(id: number): Promise<void> {
    try {
      await db.execute(sql`DELETE FROM showing_requests WHERE id = ${id}`);
    } catch (error) {
      console.error('Error in deleteShowingRequest:', error);
      throw error;
    }
  }

  private mapShowingRequestRow(row: any): ShowingRequest {
    return {
      id: Number(row.id),
      viewingId: Number(row.viewing_id),
      requesterId: Number(row.requester_id),
      recipientId: Number(row.recipient_id),
      requestedDate: new Date(row.requested_date),
      status: String(row.status),
      notes: row.notes ? String(row.notes) : null,
      responseNotes: row.response_notes ? String(row.response_notes) : null,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null
    };
  }

  private mapViewingRow(row: any): PropertyViewing {
    return {
      id: Number(row.id),
      agentId: Number(row.agent_id),
      clientId: Number(row.client_id),
      address: String(row.address),
      city: String(row.city),
      state: String(row.state),
      zipCode: row.zip_code ? String(row.zip_code) : null,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
      status: String(row.status),
      scheduledDate: row.scheduled_date ? new Date(row.scheduled_date) : null,
      notes: row.notes ? String(row.notes) : null,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null
    };
  }

  private mapFeedbackRow(row: any): PropertyFeedback {
    return {
      id: Number(row.id),
      viewingId: Number(row.viewing_id),
      clientId: Number(row.client_id),
      rating: Number(row.rating),
      liked: row.liked ? String(row.liked) : null,
      disliked: row.disliked ? String(row.disliked) : null,
      overallImpression: row.overall_impression ? String(row.overall_impression) : null,
      wouldPurchase: row.would_purchase !== null ? Boolean(row.would_purchase) : null,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null
    };
  }

  async getSavedPropertiesByUser(userId: number): Promise<SavedProperty[]> {
    try {
      const result = await db.execute(sql`
        SELECT id, user_id as "userId", url, source, 
               street_address as "streetAddress", city, state, 
               zip_code as "zipCode", notes, showing_requested as "showingRequested",
               created_at as "createdAt"
        FROM saved_properties
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `);
      return result.rows.map(row => ({
        id: Number(row.id),
        userId: Number(row.userId),
        url: String(row.url),
        source: String(row.source),
        streetAddress: row.streetAddress ? String(row.streetAddress) : null,
        city: row.city ? String(row.city) : null,
        state: row.state ? String(row.state) : null,
        zipCode: row.zipCode ? String(row.zipCode) : null,
        notes: row.notes ? String(row.notes) : null,
        showingRequested: Boolean(row.showingRequested),
        createdAt: row.createdAt ? new Date(row.createdAt) : null,
      }));
    } catch (error) {
      console.error('Error in getSavedPropertiesByUser:', error);
      return [];
    }
  }

  async createSavedProperty(property: InsertSavedProperty): Promise<SavedProperty> {
    try {
      const [saved] = await db
        .insert(savedProperties)
        .values({
          userId: property.userId,
          url: property.url,
          source: property.source,
          streetAddress: property.streetAddress || null,
          city: property.city || null,
          state: property.state || null,
          zipCode: property.zipCode || null,
          notes: property.notes || null,
          createdAt: new Date(),
        })
        .returning();

      if (!saved) throw new Error('Failed to save property');

      return {
        id: Number(saved.id),
        userId: Number(saved.userId),
        url: String(saved.url),
        source: String(saved.source),
        streetAddress: saved.streetAddress ? String(saved.streetAddress) : null,
        city: saved.city ? String(saved.city) : null,
        state: saved.state ? String(saved.state) : null,
        zipCode: saved.zipCode ? String(saved.zipCode) : null,
        notes: saved.notes ? String(saved.notes) : null,
        showingRequested: Boolean(saved.showingRequested),
        createdAt: saved.createdAt ? new Date(saved.createdAt) : null,
      };
    } catch (error) {
      console.error('Error in createSavedProperty:', error);
      throw error;
    }
  }

  async getShowingRequestedProperties(agentId: number): Promise<(SavedProperty & { clientName?: string })[]> {
    try {
      const result = await db.execute(sql`
        SELECT sp.id, sp.user_id as "userId", sp.url, sp.source,
               sp.street_address as "streetAddress", sp.city, sp.state,
               sp.zip_code as "zipCode", sp.notes, sp.showing_requested as "showingRequested",
               sp.created_at as "createdAt",
               u.first_name || ' ' || u.last_name as "clientName"
        FROM saved_properties sp
        JOIN users u ON sp.user_id = u.id
        WHERE u.agent_id = ${agentId} AND sp.showing_requested = true
        ORDER BY sp.created_at DESC
      `);
      return result.rows.map(row => ({
        id: Number(row.id),
        userId: Number(row.userId),
        url: String(row.url),
        source: String(row.source),
        streetAddress: row.streetAddress ? String(row.streetAddress) : null,
        city: row.city ? String(row.city) : null,
        state: row.state ? String(row.state) : null,
        zipCode: row.zipCode ? String(row.zipCode) : null,
        notes: row.notes ? String(row.notes) : null,
        showingRequested: Boolean(row.showingRequested),
        createdAt: row.createdAt ? new Date(row.createdAt as string) : null,
        clientName: row.clientName ? String(row.clientName) : undefined,
      }));
    } catch (error) {
      console.error('Error in getShowingRequestedProperties:', error);
      return [];
    }
  }

  async updateSavedPropertyShowing(id: number, userId: number, showingRequested: boolean): Promise<void> {
    const result = await db.execute(sql`
      UPDATE saved_properties SET showing_requested = ${showingRequested}
      WHERE id = ${id} AND user_id = ${userId}
    `);
    if (result.rowCount === 0) {
      throw new Error('Property not found or access denied');
    }
  }

  async deleteSavedProperty(id: number, userId: number): Promise<void> {
    try {
      const result = await db.execute(sql`
        DELETE FROM saved_properties WHERE id = ${id} AND user_id = ${userId}
      `);
      if (result.rowCount === 0) {
        throw new Error('Property not found or access denied');
      }
    } catch (error) {
      console.error('Error in deleteSavedProperty:', error);
      throw error;
    }
  }

  async getCommunicationsByClient(clientId: number, agentId: number): Promise<Communication[]> {
    try {
      const result = await db.execute(sql`
        SELECT id, client_id as "clientId", agent_id as "agentId", type, subject, content,
               status, external_id as "externalId", created_at as "createdAt"
        FROM communications
        WHERE client_id = ${clientId} AND agent_id = ${agentId}
        ORDER BY created_at DESC
        LIMIT 50
      `);
      return result.rows.map(row => ({
        id: Number(row.id),
        clientId: Number(row.clientId),
        agentId: Number(row.agentId),
        type: String(row.type),
        subject: row.subject ? String(row.subject) : null,
        content: row.content ? String(row.content) : null,
        status: String(row.status),
        externalId: row.externalId ? String(row.externalId) : null,
        createdAt: row.createdAt ? new Date(row.createdAt as string) : null,
      }));
    } catch (error) {
      console.error('Error in getCommunicationsByClient:', error);
      return [];
    }
  }

  async createCommunication(comm: InsertCommunication): Promise<Communication> {
    const [created] = await db
      .insert(communications)
      .values({
        clientId: comm.clientId,
        agentId: comm.agentId,
        type: comm.type,
        subject: comm.subject || null,
        content: comm.content || null,
        status: comm.status || "sent",
        externalId: comm.externalId || null,
        createdAt: new Date(),
      })
      .returning();
    if (!created) throw new Error('Failed to create communication record');
    return {
      id: Number(created.id),
      clientId: Number(created.clientId),
      agentId: Number(created.agentId),
      type: String(created.type),
      subject: created.subject ? String(created.subject) : null,
      content: created.content ? String(created.content) : null,
      status: String(created.status),
      externalId: created.externalId ? String(created.externalId) : null,
      createdAt: created.createdAt ? new Date(created.createdAt) : null,
    };
  }

  async isPhoneOptedOut(phoneNumber: string): Promise<boolean> {
    try {
      const normalized = this.normalizePhone(phoneNumber);
      const result = await db.execute(
        sql`SELECT id FROM sms_opt_outs WHERE phone_number = ${normalized} LIMIT 1`
      );
      return (result.rows?.length ?? 0) > 0;
    } catch (error) {
      console.error('Error checking opt-out status:', error);
      return false;
    }
  }

  async addOptOut(phoneNumber: string): Promise<void> {
    try {
      const normalized = this.normalizePhone(phoneNumber);
      await db.execute(
        sql`INSERT INTO sms_opt_outs (phone_number) VALUES (${normalized}) ON CONFLICT (phone_number) DO NOTHING`
      );
      console.log(`Phone ${normalized} added to opt-out list`);
    } catch (error) {
      console.error('Error adding opt-out:', error);
    }
  }

  async removeOptOut(phoneNumber: string): Promise<void> {
    try {
      const normalized = this.normalizePhone(phoneNumber);
      await db.execute(
        sql`DELETE FROM sms_opt_outs WHERE phone_number = ${normalized}`
      );
      console.log(`Phone ${normalized} removed from opt-out list`);
    } catch (error) {
      console.error('Error removing opt-out:', error);
    }
  }

  async getSmsSentCountToday(agentId: number): Promise<number> {
    try {
      const result = await db.execute(
        sql`SELECT COUNT(*) as count FROM communications WHERE agent_id = ${agentId} AND type = 'sms' AND status = 'sent' AND created_at >= CURRENT_DATE`
      );
      return Number(result.rows?.[0]?.count ?? 0);
    } catch (error) {
      console.error('Error getting SMS count:', error);
      return 0;
    }
  }

  async getUniqueRecipientsToday(agentId: number): Promise<number> {
    try {
      const result = await db.execute(
        sql`SELECT COUNT(DISTINCT client_id) as count FROM communications WHERE agent_id = ${agentId} AND type = 'sms' AND status = 'sent' AND created_at >= CURRENT_DATE`
      );
      return Number(result.rows?.[0]?.count ?? 0);
    } catch (error) {
      console.error('Error getting unique recipients:', error);
      return 0;
    }
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return `+${digits}`;
  }

  async getAgentPhoneNumber(userId: number): Promise<AgentPhoneNumber | null> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM agent_phone_numbers WHERE user_id = ${userId} LIMIT 1`
      );
      if (!result.rows?.length) return null;
      const row = result.rows[0] as any;
      return {
        id: Number(row.id),
        userId: Number(row.user_id),
        phoneNumber: String(row.phone_number),
        twilioSid: String(row.twilio_sid),
        areaCode: row.area_code ? String(row.area_code) : null,
        friendlyName: row.friendly_name ? String(row.friendly_name) : null,
        createdAt: row.created_at ? new Date(row.created_at) : null,
      };
    } catch (error) {
      console.error('Error getting agent phone number:', error);
      return null;
    }
  }

  async saveAgentPhoneNumber(data: { userId: number; phoneNumber: string; twilioSid: string; areaCode?: string; friendlyName?: string }): Promise<AgentPhoneNumber> {
    const result = await db.execute(
      sql`INSERT INTO agent_phone_numbers (user_id, phone_number, twilio_sid, area_code, friendly_name)
          VALUES (${data.userId}, ${data.phoneNumber}, ${data.twilioSid}, ${data.areaCode || null}, ${data.friendlyName || null})
          ON CONFLICT (user_id) DO UPDATE SET
            phone_number = ${data.phoneNumber},
            twilio_sid = ${data.twilioSid},
            area_code = ${data.areaCode || null},
            friendly_name = ${data.friendlyName || null}
          RETURNING *`
    );
    const row = result.rows[0] as any;
    return {
      id: Number(row.id),
      userId: Number(row.user_id),
      phoneNumber: String(row.phone_number),
      twilioSid: String(row.twilio_sid),
      areaCode: row.area_code ? String(row.area_code) : null,
      friendlyName: row.friendly_name ? String(row.friendly_name) : null,
      createdAt: row.created_at ? new Date(row.created_at) : null,
    };
  }

  async deleteAgentPhoneNumber(userId: number): Promise<void> {
    await db.execute(sql`DELETE FROM agent_phone_numbers WHERE user_id = ${userId}`);
  }

  async getAgentByPhoneNumber(phoneNumber: string): Promise<AgentPhoneNumber | null> {
    try {
      const normalized = this.normalizePhone(phoneNumber);
      const result = await db.execute(
        sql`SELECT * FROM agent_phone_numbers WHERE phone_number = ${normalized} LIMIT 1`
      );
      if (!result.rows?.length) return null;
      const row = result.rows[0] as any;
      return {
        id: Number(row.id),
        userId: Number(row.user_id),
        phoneNumber: String(row.phone_number),
        twilioSid: String(row.twilio_sid),
        areaCode: row.area_code ? String(row.area_code) : null,
        friendlyName: row.friendly_name ? String(row.friendly_name) : null,
        createdAt: row.created_at ? new Date(row.created_at) : null,
      };
    } catch (error) {
      console.error('Error getting agent by phone number:', error);
      return null;
    }
  }

  // Email snippets
  async getSnippetsByUser(userId: number): Promise<EmailSnippet[]> {
    const result = await db.execute(
      sql`SELECT * FROM email_snippets WHERE user_id = ${userId} ORDER BY updated_at DESC`
    );
    return (result.rows || []).map((row: any) => ({
      id: Number(row.id),
      userId: Number(row.user_id),
      title: String(row.title),
      body: String(row.body),
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    }));
  }

  async getSnippet(id: number): Promise<EmailSnippet | undefined> {
    const result = await db.execute(
      sql`SELECT * FROM email_snippets WHERE id = ${id} LIMIT 1`
    );
    if (!result.rows?.length) return undefined;
    const row = result.rows[0] as any;
    return {
      id: Number(row.id),
      userId: Number(row.user_id),
      title: String(row.title),
      body: String(row.body),
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    };
  }

  async createSnippet(snippet: InsertEmailSnippet): Promise<EmailSnippet> {
    const result = await db.execute(
      sql`INSERT INTO email_snippets (user_id, title, body) VALUES (${snippet.userId}, ${snippet.title}, ${snippet.body}) RETURNING *`
    );
    const row = result.rows[0] as any;
    return {
      id: Number(row.id),
      userId: Number(row.user_id),
      title: String(row.title),
      body: String(row.body),
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    };
  }

  async updateSnippet(id: number, data: Partial<EmailSnippet>): Promise<EmailSnippet> {
    const sets: string[] = [];
    const values: any[] = [];
    if (data.title !== undefined) { sets.push("title"); values.push(data.title); }
    if (data.body !== undefined) { sets.push("body"); values.push(data.body); }
    await db.execute(
      sql`UPDATE email_snippets SET title = COALESCE(${data.title ?? null}, title), body = COALESCE(${data.body ?? null}, body), updated_at = NOW() WHERE id = ${id}`
    );
    const result = await db.execute(sql`SELECT * FROM email_snippets WHERE id = ${id} LIMIT 1`);
    const row = result.rows[0] as any;
    return {
      id: Number(row.id),
      userId: Number(row.user_id),
      title: String(row.title),
      body: String(row.body),
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    };
  }

  async deleteSnippet(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM email_snippets WHERE id = ${id}`);
  }

  // Email tracking
  async createEmailTracking(tracking: InsertEmailTracking): Promise<EmailTracking> {
    const result = await db.execute(
      sql`INSERT INTO email_tracking (tracking_id, user_id, gmail_message_id, recipient_email, subject)
          VALUES (${tracking.trackingId}, ${tracking.userId}, ${tracking.gmailMessageId ?? null}, ${tracking.recipientEmail}, ${tracking.subject})
          RETURNING *`
    );
    const row = result.rows[0] as any;
    return this.mapEmailTrackingRow(row);
  }

  async getEmailTracking(trackingId: string): Promise<EmailTracking | undefined> {
    const result = await db.execute(
      sql`SELECT * FROM email_tracking WHERE tracking_id = ${trackingId} LIMIT 1`
    );
    if (!result.rows?.length) return undefined;
    return this.mapEmailTrackingRow(result.rows[0] as any);
  }

  async recordEmailOpen(trackingId: string): Promise<void> {
    await db.execute(sql`
      UPDATE email_tracking
      SET open_count = open_count + 1,
          last_opened_at = NOW(),
          first_opened_at = COALESCE(first_opened_at, NOW())
      WHERE tracking_id = ${trackingId}
    `);
  }

  async getEmailTrackingByUser(userId: number): Promise<EmailTracking[]> {
    const result = await db.execute(
      sql`SELECT * FROM email_tracking WHERE user_id = ${userId} ORDER BY sent_at DESC LIMIT 100`
    );
    return (result.rows || []).map((row: any) => this.mapEmailTrackingRow(row));
  }

  async updateEmailTrackingMessageId(trackingId: string, gmailMessageId: string): Promise<void> {
    await db.execute(
      sql`UPDATE email_tracking SET gmail_message_id = ${gmailMessageId} WHERE tracking_id = ${trackingId}`
    );
  }

  private mapEmailTrackingRow(row: any): EmailTracking {
    return {
      id: Number(row.id),
      trackingId: String(row.tracking_id),
      userId: Number(row.user_id),
      gmailMessageId: row.gmail_message_id ? String(row.gmail_message_id) : null,
      recipientEmail: String(row.recipient_email),
      subject: String(row.subject),
      sentAt: row.sent_at ? new Date(row.sent_at) : null,
      firstOpenedAt: row.first_opened_at ? new Date(row.first_opened_at) : null,
      lastOpenedAt: row.last_opened_at ? new Date(row.last_opened_at) : null,
      openCount: Number(row.open_count),
    };
  }

  private mapTransactionRow(row: any): Transaction {
    return {
      id: Number(row.id),
      streetName: String(row.street_name),
      city: String(row.city),
      state: String(row.state),
      zipCode: String(row.zip_code),
      accessCode: String(row.access_code),
      status: String(row.status),
      type: String(row.type).replace(/[{}]/g, ''),
      agentId: Number(row.agent_id),
      clientId: row.client_id ? Number(row.client_id) : null,
      secondaryClientId: row.secondary_client_id ? Number(row.secondary_client_id) : null,
      participants: row.participants || [],
      contractPrice: row.contract_price ? Number(row.contract_price) : null,
      optionPeriodExpiration: row.option_period_expiration ? new Date(row.option_period_expiration) : null,
      optionFee: row.option_fee ? Number(row.option_fee) : null,
      earnestMoney: row.earnest_money ? Number(row.earnest_money) : null,
      downPayment: row.down_payment ? Number(row.down_payment) : null,
      sellerConcessions: row.seller_concessions ? Number(row.seller_concessions) : null,
      listDate: row.list_date ? new Date(row.list_date) : null,
      closingDate: row.closing_date ? new Date(row.closing_date) : null,
      contractExecutionDate: row.contract_execution_date ? new Date(row.contract_execution_date) : null,
      mlsNumber: row.mls_number ? String(row.mls_number) : null,
      financing: row.financing ? String(row.financing) : null,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null
    };
  }

  private mapInspectionItemRow(row: any): InspectionItem {
    return {
      id: Number(row.id),
      transactionId: Number(row.transaction_id),
      category: String(row.category),
      description: String(row.description),
      severity: String(row.severity),
      location: row.location ? String(row.location) : null,
      status: String(row.status),
      notes: row.notes ? String(row.notes) : null,
      pageNumber: row.page_number ? Number(row.page_number) : null,
      hasPhoto: row.has_photo ?? false,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      repairRequested: row.repair_requested ?? false,
      repairStatus: row.repair_status ?? 'not_requested',
      repairNotes: row.repair_notes ?? null,
      creditAmount: row.credit_amount ?? null,
    };
  }

  private mapBidRequestRow(row: any): BidRequest {
    return {
      id: Number(row.id),
      transactionId: Number(row.transaction_id),
      inspectionItemId: Number(row.inspection_item_id),
      contractorId: Number(row.contractor_id),
      status: String(row.status),
      sentAt: row.sent_at ? new Date(row.sent_at) : null,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      notes: row.notes ? String(row.notes) : null,
    };
  }

  private mapBidRow(row: any): Bid {
    return {
      id: Number(row.id),
      bidRequestId: Number(row.bid_request_id),
      contractorId: Number(row.contractor_id),
      amount: Number(row.amount),
      estimatedDays: row.estimated_days ? Number(row.estimated_days) : null,
      description: row.description ? String(row.description) : null,
      warranty: row.warranty ? String(row.warranty) : null,
      status: String(row.status),
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    };
  }

  async createInspectionItem(item: InsertInspectionItem): Promise<InspectionItem> {
    try {
      const result = await db.execute(sql`
        INSERT INTO inspection_items (transaction_id, category, description, severity, location, status, notes, page_number, has_photo)
        VALUES (${item.transactionId}, ${item.category}, ${item.description}, ${item.severity}, ${item.location || null}, ${item.status || 'pending_review'}, ${item.notes || null}, ${item.pageNumber || null}, ${item.hasPhoto ?? false})
        RETURNING *
      `);
      return this.mapInspectionItemRow(result.rows[0]);
    } catch (error) {
      console.error('Error in createInspectionItem:', error);
      throw error;
    }
  }

  async getInspectionItemsByTransaction(transactionId: number): Promise<InspectionItem[]> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM inspection_items WHERE transaction_id = ${transactionId} ORDER BY created_at DESC`
      );
      return (result.rows as any[]).map(row => this.mapInspectionItemRow(row));
    } catch (error) {
      console.error('Error in getInspectionItemsByTransaction:', error);
      return [];
    }
  }

  async updateInspectionItem(id: number, data: Partial<InspectionItem>): Promise<InspectionItem> {
    try {
      const updateParts: any[] = [];
      if (data.category !== undefined) updateParts.push(sql`category = ${data.category}`);
      if (data.description !== undefined) updateParts.push(sql`description = ${data.description}`);
      if (data.severity !== undefined) updateParts.push(sql`severity = ${data.severity}`);
      if (data.location !== undefined) updateParts.push(sql`location = ${data.location}`);
      if (data.status !== undefined) updateParts.push(sql`status = ${data.status}`);
      if (data.notes !== undefined) updateParts.push(sql`notes = ${data.notes}`);
      if (data.repairRequested !== undefined) updateParts.push(sql`repair_requested = ${data.repairRequested}`);
      if (data.repairStatus !== undefined) updateParts.push(sql`repair_status = ${data.repairStatus}`);
      if (data.repairNotes !== undefined) updateParts.push(sql`repair_notes = ${data.repairNotes}`);
      if (data.creditAmount !== undefined) updateParts.push(sql`credit_amount = ${data.creditAmount}`);

      if (updateParts.length === 0) {
        const result = await db.execute(sql`SELECT * FROM inspection_items WHERE id = ${id}`);
        if (!result.rows[0]) throw new Error('Inspection item not found');
        return this.mapInspectionItemRow(result.rows[0]);
      }

      const result = await db.execute(sql`
        UPDATE inspection_items
        SET ${sql.join(updateParts, sql`, `)}
        WHERE id = ${id}
        RETURNING *
      `);
      if (!result.rows[0]) throw new Error('Inspection item not found');
      return this.mapInspectionItemRow(result.rows[0]);
    } catch (error) {
      console.error('Error in updateInspectionItem:', error);
      throw error;
    }
  }

  async deleteInspectionItem(id: number): Promise<void> {
    try {
      await db.execute(sql`DELETE FROM bid_requests WHERE inspection_item_id = ${id}`);
      await db.execute(sql`DELETE FROM inspection_items WHERE id = ${id}`);
    } catch (error) {
      console.error('Error in deleteInspectionItem:', error);
      throw error;
    }
  }

  async saveInspectionPdf(transactionId: number, fileName: string, filePath: string): Promise<void> {
    try {
      await db.execute(sql`DELETE FROM inspection_pdfs WHERE transaction_id = ${transactionId}`);
      await db.execute(sql`
        INSERT INTO inspection_pdfs (transaction_id, file_name, file_path)
        VALUES (${transactionId}, ${fileName}, ${filePath})
      `);
    } catch (error) {
      console.error('Error in saveInspectionPdf:', error);
      throw error;
    }
  }

  async getInspectionPdf(transactionId: number): Promise<{ fileName: string; filePath: string } | undefined> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM inspection_pdfs WHERE transaction_id = ${transactionId} LIMIT 1`
      );
      if (!result.rows[0]) return undefined;
      const row = result.rows[0] as any;
      return { fileName: String(row.file_name), filePath: String(row.file_path) };
    } catch (error) {
      console.error('Error in getInspectionPdf:', error);
      return undefined;
    }
  }

  async createBidRequest(request: InsertBidRequest): Promise<BidRequest> {
    try {
      const result = await db.execute(sql`
        INSERT INTO bid_requests (transaction_id, inspection_item_id, contractor_id, status, expires_at, notes)
        VALUES (${request.transactionId}, ${request.inspectionItemId}, ${request.contractorId}, ${request.status || 'pending'}, ${request.expiresAt || null}, ${request.notes || null})
        RETURNING *
      `);
      return this.mapBidRequestRow(result.rows[0]);
    } catch (error) {
      console.error('Error in createBidRequest:', error);
      throw error;
    }
  }

  async getBidRequestsByTransaction(transactionId: number): Promise<BidRequest[]> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM bid_requests WHERE transaction_id = ${transactionId} ORDER BY sent_at DESC`
      );
      return (result.rows as any[]).map(row => this.mapBidRequestRow(row));
    } catch (error) {
      console.error('Error in getBidRequestsByTransaction:', error);
      return [];
    }
  }

  async getBidRequestsByContractor(contractorId: number): Promise<BidRequest[]> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM bid_requests WHERE contractor_id = ${contractorId} ORDER BY sent_at DESC`
      );
      return (result.rows as any[]).map(row => this.mapBidRequestRow(row));
    } catch (error) {
      console.error('Error in getBidRequestsByContractor:', error);
      return [];
    }
  }

  async updateBidRequest(id: number, data: Partial<BidRequest>): Promise<BidRequest> {
    try {
      const updateParts: any[] = [];
      if (data.status !== undefined) updateParts.push(sql`status = ${data.status}`);
      if (data.expiresAt !== undefined) updateParts.push(sql`expires_at = ${data.expiresAt}`);
      if (data.notes !== undefined) updateParts.push(sql`notes = ${data.notes}`);

      if (updateParts.length === 0) {
        const result = await db.execute(sql`SELECT * FROM bid_requests WHERE id = ${id}`);
        if (!result.rows[0]) throw new Error('Bid request not found');
        return this.mapBidRequestRow(result.rows[0]);
      }

      const result = await db.execute(sql`
        UPDATE bid_requests
        SET ${sql.join(updateParts, sql`, `)}
        WHERE id = ${id}
        RETURNING *
      `);
      if (!result.rows[0]) throw new Error('Bid request not found');
      return this.mapBidRequestRow(result.rows[0]);
    } catch (error) {
      console.error('Error in updateBidRequest:', error);
      throw error;
    }
  }

  async createBid(bid: InsertBid): Promise<Bid> {
    try {
      const result = await db.execute(sql`
        INSERT INTO bids (bid_request_id, contractor_id, amount, estimated_days, description, warranty, status)
        VALUES (${bid.bidRequestId}, ${bid.contractorId}, ${bid.amount}, ${bid.estimatedDays || null}, ${bid.description || null}, ${bid.warranty || null}, ${bid.status || 'submitted'})
        RETURNING *
      `);
      return this.mapBidRow(result.rows[0]);
    } catch (error) {
      console.error('Error in createBid:', error);
      throw error;
    }
  }

  async getBidsByBidRequest(bidRequestId: number): Promise<Bid[]> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM bids WHERE bid_request_id = ${bidRequestId} ORDER BY created_at DESC`
      );
      return (result.rows as any[]).map(row => this.mapBidRow(row));
    } catch (error) {
      console.error('Error in getBidsByBidRequest:', error);
      return [];
    }
  }

  async getBidsByContractor(contractorId: number): Promise<Bid[]> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM bids WHERE contractor_id = ${contractorId} ORDER BY created_at DESC`
      );
      return (result.rows as any[]).map(row => this.mapBidRow(row));
    } catch (error) {
      console.error('Error in getBidsByContractor:', error);
      return [];
    }
  }

  async updateBid(id: number, data: Partial<Bid>): Promise<Bid> {
    try {
      const updateParts: any[] = [];
      if (data.amount !== undefined) updateParts.push(sql`amount = ${data.amount}`);
      if (data.estimatedDays !== undefined) updateParts.push(sql`estimated_days = ${data.estimatedDays}`);
      if (data.description !== undefined) updateParts.push(sql`description = ${data.description}`);
      if (data.warranty !== undefined) updateParts.push(sql`warranty = ${data.warranty}`);
      if (data.status !== undefined) updateParts.push(sql`status = ${data.status}`);
      updateParts.push(sql`updated_at = NOW()`);

      const result = await db.execute(sql`
        UPDATE bids
        SET ${sql.join(updateParts, sql`, `)}
        WHERE id = ${id}
        RETURNING *
      `);
      if (!result.rows[0]) throw new Error('Bid not found');
      return this.mapBidRow(result.rows[0]);
    } catch (error) {
      console.error('Error in updateBid:', error);
      throw error;
    }
  }

  async getContractorByVendorUserId(vendorUserId: number): Promise<Contractor | undefined> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM contractors WHERE vendor_user_id = ${vendorUserId} LIMIT 1`
      );
      if (!result.rows?.length) return undefined;
      return this.mapContractorRow(result.rows[0]);
    } catch (error) {
      console.error('Error in getContractorByVendorUserId:', error);
      return undefined;
    }
  }

  async createVendorProfile(data: { name: string; category: string; phone?: string; email?: string; website?: string; address?: string; city?: string; state?: string; zipCode?: string; description?: string; googleMapsUrl?: string; yelpUrl?: string; bbbUrl?: string; vendorUserId: number }): Promise<Contractor> {
    try {
      const result = await db.execute(sql`
        INSERT INTO contractors (name, category, phone, email, website, address, city, state, zip_code, description, google_maps_url, yelp_url, bbb_url, vendor_user_id)
        VALUES (${data.name}, ${data.category}, ${data.phone || null}, ${data.email || null}, ${data.website || null}, ${data.address || null}, ${data.city || null}, ${data.state || null}, ${data.zipCode || null}, ${data.description || null}, ${data.googleMapsUrl || null}, ${data.yelpUrl || null}, ${data.bbbUrl || null}, ${data.vendorUserId})
        RETURNING *
      `);
      return this.mapContractorRow(result.rows[0]);
    } catch (error) {
      console.error('Error in createVendorProfile:', error);
      throw error;
    }
  }

  async createVendorTeamRequest(data: { vendorContractorId: number; agentId: number; category: string; message?: string }): Promise<VendorTeamRequest> {
    const result = await db.execute(sql`
      INSERT INTO vendor_team_requests (vendor_contractor_id, agent_id, category, message)
      VALUES (${data.vendorContractorId}, ${data.agentId}, ${data.category}, ${data.message || null})
      RETURNING *
    `);
    const row = result.rows[0] as any;
    return { id: row.id, vendorContractorId: row.vendor_contractor_id, agentId: row.agent_id, category: row.category, message: row.message, status: row.status, createdAt: row.created_at };
  }

  async getTeamRequestsByVendor(vendorContractorId: number): Promise<VendorTeamRequest[]> {
    const result = await db.execute(sql`
      SELECT vtr.*, u.username as agent_username, u.full_name as agent_full_name
      FROM vendor_team_requests vtr
      LEFT JOIN users u ON u.id = vtr.agent_id
      WHERE vtr.vendor_contractor_id = ${vendorContractorId}
      ORDER BY vtr.created_at DESC
    `);
    return (result.rows as any[]).map(row => ({
      id: row.id, vendorContractorId: row.vendor_contractor_id, agentId: row.agent_id,
      category: row.category, message: row.message, status: row.status, createdAt: row.created_at,
      agentName: row.agent_full_name || row.agent_username
    }));
  }

  async getTeamRequestsByAgent(agentId: number): Promise<(VendorTeamRequest & { vendorName?: string; vendorCategory?: string })[]> {
    const result = await db.execute(sql`
      SELECT vtr.*, c.name as vendor_name, c.category as vendor_category
      FROM vendor_team_requests vtr
      LEFT JOIN contractors c ON c.id = vtr.vendor_contractor_id
      WHERE vtr.agent_id = ${agentId} AND vtr.status = 'pending'
      ORDER BY vtr.created_at DESC
    `);
    return (result.rows as any[]).map(row => ({
      id: row.id, vendorContractorId: row.vendor_contractor_id, agentId: row.agent_id,
      category: row.category, message: row.message, status: row.status, createdAt: row.created_at,
      vendorName: row.vendor_name, vendorCategory: row.vendor_category
    }));
  }

  async updateTeamRequestStatus(id: number, status: string): Promise<VendorTeamRequest> {
    const result = await db.execute(sql`
      UPDATE vendor_team_requests SET status = ${status} WHERE id = ${id} RETURNING *
    `);
    const row = result.rows[0] as any;
    if (!row) throw new Error('Team request not found');
    return { id: row.id, vendorContractorId: row.vendor_contractor_id, agentId: row.agent_id, category: row.category, message: row.message, status: row.status, createdAt: row.created_at };
  }

  async getAgentsWithoutCategoryVendor(category: string): Promise<{ id: number; username: string; fullName: string; teamSize: number }[]> {
    const result = await db.execute(sql`
      SELECT u.id, u.username, u.full_name,
        (SELECT COUNT(*)::int FROM home_team_members WHERE user_id = u.id) as team_size
      FROM users u
      WHERE u.role IN ('agent', 'broker')
        AND NOT EXISTS (
          SELECT 1 FROM home_team_members htm
          WHERE htm.user_id = u.id AND htm.category = ${category}
        )
      ORDER BY u.full_name, u.username
    `);
    return (result.rows as any[]).map(row => ({
      id: row.id,
      username: row.username,
      fullName: row.full_name || row.username,
      teamSize: row.team_size || 0
    }));
  }

  async addHomeTeamMember(data: InsertHomeTeamMember): Promise<HomeTeamMember> {
    const result = await db.execute(sql`
      INSERT INTO home_team_members (user_id, contractor_id, category, notes)
      VALUES (${data.userId}, ${data.contractorId}, ${data.category}, ${data.notes || null})
      RETURNING *
    `);
    const row = result.rows[0] as any;
    return { id: row.id, userId: row.user_id, contractorId: row.contractor_id, category: row.category, notes: row.notes, addedAt: row.added_at };
  }

  async removeHomeTeamMember(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM home_team_members WHERE id = ${id}`);
  }

  async getHomeTeamByUser(userId: number): Promise<HomeTeamMember[]> {
    const result = await db.execute(sql`
      SELECT * FROM home_team_members WHERE user_id = ${userId} ORDER BY added_at DESC
    `);
    return (result.rows as any[]).map(row => ({
      id: row.id, userId: row.user_id, contractorId: row.contractor_id, category: row.category, notes: row.notes, addedAt: row.added_at
    }));
  }

  async getHomeTeamMember(id: number): Promise<HomeTeamMember | undefined> {
    const result = await db.execute(sql`SELECT * FROM home_team_members WHERE id = ${id}`);
    if (!result.rows?.length) return undefined;
    const row = result.rows[0] as any;
    return { id: row.id, userId: row.user_id, contractorId: row.contractor_id, category: row.category, notes: row.notes, addedAt: row.added_at };
  }

  async createHome(data: InsertHomeownerHome): Promise<HomeownerHome> {
    const result = await db.execute(sql`
      INSERT INTO homeowner_homes (user_id, address, city, state, zip_code, purchase_date, purchase_price, transaction_id, notes)
      VALUES (${data.userId}, ${data.address}, ${data.city || null}, ${data.state || null}, ${data.zipCode || null}, ${data.purchaseDate || null}, ${data.purchasePrice || null}, ${data.transactionId || null}, ${data.notes || null})
      RETURNING *
    `);
    const row = result.rows[0] as any;
    return { id: row.id, userId: row.user_id, address: row.address, city: row.city, state: row.state, zipCode: row.zip_code, purchaseDate: row.purchase_date, purchasePrice: row.purchase_price, transactionId: row.transaction_id, notes: row.notes, createdAt: row.created_at };
  }

  async getHomesByUser(userId: number): Promise<HomeownerHome[]> {
    const result = await db.execute(sql`SELECT * FROM homeowner_homes WHERE user_id = ${userId} ORDER BY created_at DESC`);
    return (result.rows as any[]).map(row => ({
      id: row.id, userId: row.user_id, address: row.address, city: row.city, state: row.state, zipCode: row.zip_code, purchaseDate: row.purchase_date, purchasePrice: row.purchase_price, transactionId: row.transaction_id, notes: row.notes, createdAt: row.created_at
    }));
  }

  async getHome(id: number): Promise<HomeownerHome | undefined> {
    const result = await db.execute(sql`SELECT * FROM homeowner_homes WHERE id = ${id}`);
    if (!result.rows?.length) return undefined;
    const row = result.rows[0] as any;
    return { id: row.id, userId: row.user_id, address: row.address, city: row.city, state: row.state, zipCode: row.zip_code, purchaseDate: row.purchase_date, purchasePrice: row.purchase_price, transactionId: row.transaction_id, notes: row.notes, createdAt: row.created_at };
  }

  async updateHome(id: number, data: Partial<HomeownerHome>): Promise<HomeownerHome> {
    const parts: any[] = [];
    if (data.address !== undefined) parts.push(sql`address = ${data.address}`);
    if (data.city !== undefined) parts.push(sql`city = ${data.city}`);
    if (data.state !== undefined) parts.push(sql`state = ${data.state}`);
    if (data.zipCode !== undefined) parts.push(sql`zip_code = ${data.zipCode}`);
    if (data.purchaseDate !== undefined) parts.push(sql`purchase_date = ${data.purchaseDate}`);
    if (data.purchasePrice !== undefined) parts.push(sql`purchase_price = ${data.purchasePrice}`);
    if (data.notes !== undefined) parts.push(sql`notes = ${data.notes}`);
    if (parts.length === 0) {
      const existing = await this.getHome(id);
      if (!existing) throw new Error('Home not found');
      return existing;
    }
    const result = await db.execute(sql`UPDATE homeowner_homes SET ${sql.join(parts, sql`, `)} WHERE id = ${id} RETURNING *`);
    if (!result.rows[0]) throw new Error('Home not found');
    const row = result.rows[0] as any;
    return { id: row.id, userId: row.user_id, address: row.address, city: row.city, state: row.state, zipCode: row.zip_code, purchaseDate: row.purchase_date, purchasePrice: row.purchase_price, transactionId: row.transaction_id, notes: row.notes, createdAt: row.created_at };
  }

  async deleteHome(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM home_maintenance_records WHERE home_id = ${id}`);
    await db.execute(sql`DELETE FROM homeowner_homes WHERE id = ${id}`);
  }

  async createMaintenanceRecord(data: InsertMaintenanceRecord): Promise<MaintenanceRecord> {
    const result = await db.execute(sql`
      INSERT INTO home_maintenance_records (home_id, contractor_id, category, description, service_date, cost, notes)
      VALUES (${data.homeId}, ${data.contractorId || null}, ${data.category}, ${data.description}, ${data.serviceDate || null}, ${data.cost || null}, ${data.notes || null})
      RETURNING *
    `);
    const row = result.rows[0] as any;
    return { id: row.id, homeId: row.home_id, contractorId: row.contractor_id, category: row.category, description: row.description, serviceDate: row.service_date, cost: row.cost, notes: row.notes, createdAt: row.created_at };
  }

  async getMaintenanceByHome(homeId: number): Promise<MaintenanceRecord[]> {
    const result = await db.execute(sql`SELECT * FROM home_maintenance_records WHERE home_id = ${homeId} ORDER BY service_date DESC, created_at DESC`);
    return (result.rows as any[]).map(row => ({
      id: row.id, homeId: row.home_id, contractorId: row.contractor_id, category: row.category, description: row.description, serviceDate: row.service_date, cost: row.cost, notes: row.notes, createdAt: row.created_at
    }));
  }

  async updateMaintenanceRecord(id: number, data: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
    const parts: any[] = [];
    if (data.category !== undefined) parts.push(sql`category = ${data.category}`);
    if (data.description !== undefined) parts.push(sql`description = ${data.description}`);
    if (data.serviceDate !== undefined) parts.push(sql`service_date = ${data.serviceDate}`);
    if (data.cost !== undefined) parts.push(sql`cost = ${data.cost}`);
    if (data.notes !== undefined) parts.push(sql`notes = ${data.notes}`);
    if (data.contractorId !== undefined) parts.push(sql`contractor_id = ${data.contractorId}`);
    const result = await db.execute(sql`UPDATE home_maintenance_records SET ${sql.join(parts, sql`, `)} WHERE id = ${id} RETURNING *`);
    if (!result.rows[0]) throw new Error('Maintenance record not found');
    const row = result.rows[0] as any;
    return { id: row.id, homeId: row.home_id, contractorId: row.contractor_id, category: row.category, description: row.description, serviceDate: row.service_date, cost: row.cost, notes: row.notes, createdAt: row.created_at };
  }

  async deleteMaintenanceRecord(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM home_maintenance_records WHERE id = ${id}`);
  }

  async createReferralCode(data: InsertReferralCode): Promise<ReferralCode> {
    const result = await db.execute(sql`
      INSERT INTO referral_codes (agent_user_id, code) VALUES (${data.agentUserId}, ${data.code}) RETURNING *
    `);
    const row = result.rows[0] as any;
    return { id: row.id, agentUserId: row.agent_user_id, code: row.code, createdAt: row.created_at };
  }

  async getReferralCodeByAgent(agentUserId: number): Promise<ReferralCode | undefined> {
    const result = await db.execute(sql`SELECT * FROM referral_codes WHERE agent_user_id = ${agentUserId} LIMIT 1`);
    if (!result.rows?.length) return undefined;
    const row = result.rows[0] as any;
    return { id: row.id, agentUserId: row.agent_user_id, code: row.code, createdAt: row.created_at };
  }

  async getReferralCodeByCode(code: string): Promise<ReferralCode | undefined> {
    const result = await db.execute(sql`SELECT * FROM referral_codes WHERE code = ${code} LIMIT 1`);
    if (!result.rows?.length) return undefined;
    const row = result.rows[0] as any;
    return { id: row.id, agentUserId: row.agent_user_id, code: row.code, createdAt: row.created_at };
  }

  async createVendorInviteToken(data: InsertVendorInviteToken): Promise<VendorInviteToken> {
    const result = await db.execute(sql`
      INSERT INTO vendor_invite_tokens (token, invited_by_user_id, referral_code_id, contractor_id, contractor_name)
      VALUES (${data.token}, ${data.invitedByUserId}, ${data.referralCodeId || null}, ${data.contractorId || null}, ${data.contractorName || null})
      RETURNING *
    `);
    const row = result.rows[0] as any;
    return { id: row.id, token: row.token, invitedByUserId: row.invited_by_user_id, referralCodeId: row.referral_code_id, contractorId: row.contractor_id, contractorName: row.contractor_name, createdAt: row.created_at };
  }

  async getVendorInviteTokenByToken(token: string): Promise<VendorInviteToken | undefined> {
    const result = await db.execute(sql`SELECT * FROM vendor_invite_tokens WHERE token = ${token} LIMIT 1`);
    if (!result.rows?.length) return undefined;
    const row = result.rows[0] as any;
    return { id: row.id, token: row.token, invitedByUserId: row.invited_by_user_id, referralCodeId: row.referral_code_id, contractorId: row.contractor_id, contractorName: row.contractor_name, createdAt: row.created_at };
  }

  async createReferralCredit(data: InsertReferralCredit): Promise<ReferralCredit> {
    const result = await db.execute(sql`
      INSERT INTO referral_credits (user_id, type, referral_code_id, referred_user_id, status)
      VALUES (${data.userId}, ${data.type}, ${data.referralCodeId}, ${data.referredUserId || null}, ${data.status || 'pending'})
      RETURNING *
    `);
    const row = result.rows[0] as any;
    return { id: row.id, userId: row.user_id, type: row.type, referralCodeId: row.referral_code_id, referredUserId: row.referred_user_id, status: row.status, createdAt: row.created_at, appliedAt: row.applied_at };
  }

  async getReferralCreditsByUser(userId: number): Promise<ReferralCredit[]> {
    const result = await db.execute(sql`SELECT * FROM referral_credits WHERE user_id = ${userId} ORDER BY created_at DESC`);
    return (result.rows as any[]).map(row => ({
      id: row.id, userId: row.user_id, type: row.type, referralCodeId: row.referral_code_id, referredUserId: row.referred_user_id, status: row.status, createdAt: row.created_at, appliedAt: row.applied_at
    }));
  }

  async getReferralCreditsByReferralCode(referralCodeId: number): Promise<ReferralCredit[]> {
    const result = await db.execute(sql`SELECT * FROM referral_credits WHERE referral_code_id = ${referralCodeId} ORDER BY created_at DESC`);
    return (result.rows as any[]).map(row => ({
      id: row.id, userId: row.user_id, type: row.type, referralCodeId: row.referral_code_id, referredUserId: row.referred_user_id, status: row.status, createdAt: row.created_at, appliedAt: row.applied_at
    }));
  }

  async applyReferralCredit(id: number): Promise<ReferralCredit> {
    const result = await db.execute(sql`
      UPDATE referral_credits SET status = 'applied', applied_at = NOW() WHERE id = ${id} RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Credit not found');
    const row = result.rows[0] as any;
    return { id: row.id, userId: row.user_id, type: row.type, referralCodeId: row.referral_code_id, referredUserId: row.referred_user_id, status: row.status, createdAt: row.created_at, appliedAt: row.applied_at };
  }

  async getMarketplaceContractors(filters?: { category?: string; search?: string; limit?: number; offset?: number }): Promise<Contractor[]> {
    const conditions: any[] = [sql`vendor_user_id IS NOT NULL`];
    if (filters?.category) conditions.push(sql`category = ${filters.category}`);
    if (filters?.search) conditions.push(sql`LOWER(name) LIKE LOWER(${'%' + filters.search + '%'})`);
    const whereClause = sql`WHERE ${sql.join(conditions, sql` AND `)}`;
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const result = await db.execute(sql`SELECT * FROM contractors ${whereClause} ORDER BY name ASC LIMIT ${limit} OFFSET ${offset}`);
    return (result.rows as any[]).map(row => this.mapContractorRow(row));
  }

  async getMarketplaceContractorCount(filters?: { category?: string; search?: string }): Promise<number> {
    const conditions: any[] = [sql`vendor_user_id IS NOT NULL`];
    if (filters?.category) conditions.push(sql`category = ${filters.category}`);
    if (filters?.search) conditions.push(sql`LOWER(name) LIKE LOWER(${'%' + filters.search + '%'})`);
    const whereClause = sql`WHERE ${sql.join(conditions, sql` AND `)}`;
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM contractors ${whereClause}`);
    return Number((result.rows[0] as any)?.count || 0);
  }

  private mapCampaignRow(row: any): DripCampaign {
    return {
      id: Number(row.id),
      agentId: Number(row.agent_id),
      name: String(row.name),
      description: row.description ? String(row.description) : null,
      type: String(row.type),
      status: String(row.status),
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    };
  }

  private mapStepRow(row: any): DripStep {
    return {
      id: Number(row.id),
      campaignId: Number(row.campaign_id),
      stepOrder: Number(row.step_order),
      delayDays: Number(row.delay_days),
      method: String(row.method),
      subject: row.subject ? String(row.subject) : null,
      content: String(row.content),
      createdAt: row.created_at ? new Date(row.created_at) : null,
    };
  }

  private mapEnrollmentRow(row: any): DripEnrollment {
    return {
      id: Number(row.id),
      campaignId: Number(row.campaign_id),
      clientId: Number(row.client_id),
      agentId: Number(row.agent_id),
      status: String(row.status),
      currentStepIndex: Number(row.current_step_index),
      enrolledAt: row.enrolled_at ? new Date(row.enrolled_at) : null,
      lastActionAt: row.last_action_at ? new Date(row.last_action_at) : null,
      nextActionAt: row.next_action_at ? new Date(row.next_action_at) : null,
    };
  }

  private mapSpecialDateRow(row: any): ClientSpecialDate {
    return {
      id: Number(row.id),
      clientId: Number(row.client_id),
      agentId: Number(row.agent_id),
      dateType: String(row.date_type),
      dateValue: String(row.date_value),
      year: row.year ? Number(row.year) : null,
      label: row.label ? String(row.label) : null,
      createdAt: row.created_at ? new Date(row.created_at) : null,
    };
  }

  async createDripCampaign(data: InsertDripCampaign): Promise<DripCampaign> {
    const result = await db.execute(sql`
      INSERT INTO drip_campaigns (agent_id, name, description, type, status)
      VALUES (${data.agentId}, ${data.name}, ${data.description || null}, ${data.type || 'custom'}, ${data.status || 'active'})
      RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Failed to create drip campaign');
    return this.mapCampaignRow(result.rows[0]);
  }

  async getDripCampaign(id: number): Promise<DripCampaign | undefined> {
    const result = await db.execute(sql`SELECT * FROM drip_campaigns WHERE id = ${id} LIMIT 1`);
    if (!result.rows[0]) return undefined;
    return this.mapCampaignRow(result.rows[0]);
  }

  async getDripCampaignsByAgent(agentId: number): Promise<DripCampaign[]> {
    const result = await db.execute(sql`SELECT * FROM drip_campaigns WHERE agent_id = ${agentId} ORDER BY created_at DESC`);
    return (result.rows as any[]).map(row => this.mapCampaignRow(row));
  }

  async updateDripCampaign(id: number, data: Partial<DripCampaign>): Promise<DripCampaign> {
    const parts: any[] = [];
    if (data.name !== undefined) parts.push(sql`name = ${data.name}`);
    if (data.description !== undefined) parts.push(sql`description = ${data.description}`);
    if (data.type !== undefined) parts.push(sql`type = ${data.type}`);
    if (data.status !== undefined) parts.push(sql`status = ${data.status}`);
    parts.push(sql`updated_at = NOW()`);
    const result = await db.execute(sql`UPDATE drip_campaigns SET ${sql.join(parts, sql`, `)} WHERE id = ${id} RETURNING *`);
    if (!result.rows[0]) throw new Error('Campaign not found');
    return this.mapCampaignRow(result.rows[0]);
  }

  async deleteDripCampaign(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM drip_enrollments WHERE campaign_id = ${id}`);
    await db.execute(sql`DELETE FROM drip_steps WHERE campaign_id = ${id}`);
    await db.execute(sql`DELETE FROM drip_campaigns WHERE id = ${id}`);
  }

  async createDripStep(data: InsertDripStep): Promise<DripStep> {
    const result = await db.execute(sql`
      INSERT INTO drip_steps (campaign_id, step_order, delay_days, method, subject, content)
      VALUES (${data.campaignId}, ${data.stepOrder}, ${data.delayDays || 1}, ${data.method || 'email'}, ${data.subject || null}, ${data.content})
      RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Failed to create drip step');
    return this.mapStepRow(result.rows[0]);
  }

  async getDripStepsByCampaign(campaignId: number): Promise<DripStep[]> {
    const result = await db.execute(sql`SELECT * FROM drip_steps WHERE campaign_id = ${campaignId} ORDER BY step_order ASC`);
    return (result.rows as any[]).map(row => this.mapStepRow(row));
  }

  async updateDripStep(id: number, data: Partial<DripStep>): Promise<DripStep> {
    const parts: any[] = [];
    if (data.stepOrder !== undefined) parts.push(sql`step_order = ${data.stepOrder}`);
    if (data.delayDays !== undefined) parts.push(sql`delay_days = ${data.delayDays}`);
    if (data.method !== undefined) parts.push(sql`method = ${data.method}`);
    if (data.subject !== undefined) parts.push(sql`subject = ${data.subject}`);
    if (data.content !== undefined) parts.push(sql`content = ${data.content}`);
    if (parts.length === 0) throw new Error('No fields to update');
    const result = await db.execute(sql`UPDATE drip_steps SET ${sql.join(parts, sql`, `)} WHERE id = ${id} RETURNING *`);
    if (!result.rows[0]) throw new Error('Step not found');
    return this.mapStepRow(result.rows[0]);
  }

  async deleteDripStep(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM drip_steps WHERE id = ${id}`);
  }

  async reorderDripSteps(campaignId: number, stepIds: number[]): Promise<DripStep[]> {
    for (let i = 0; i < stepIds.length; i++) {
      await db.execute(sql`UPDATE drip_steps SET step_order = ${i + 1} WHERE id = ${stepIds[i]} AND campaign_id = ${campaignId}`);
    }
    return this.getDripStepsByCampaign(campaignId);
  }

  async createDripEnrollment(data: InsertDripEnrollment): Promise<DripEnrollment> {
    const result = await db.execute(sql`
      INSERT INTO drip_enrollments (campaign_id, client_id, agent_id, status, current_step_index, next_action_at)
      VALUES (${data.campaignId}, ${data.clientId}, ${data.agentId}, ${data.status || 'active'}, ${data.currentStepIndex || 0}, ${data.nextActionAt || null})
      RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Failed to create enrollment');
    return this.mapEnrollmentRow(result.rows[0]);
  }

  async getDripEnrollment(id: number): Promise<DripEnrollment | undefined> {
    const result = await db.execute(sql`SELECT * FROM drip_enrollments WHERE id = ${id} LIMIT 1`);
    if (!result.rows[0]) return undefined;
    return this.mapEnrollmentRow(result.rows[0]);
  }

  async getDripEnrollmentsByAgent(agentId: number): Promise<DripEnrollment[]> {
    const result = await db.execute(sql`SELECT * FROM drip_enrollments WHERE agent_id = ${agentId} ORDER BY enrolled_at DESC`);
    return (result.rows as any[]).map(row => this.mapEnrollmentRow(row));
  }

  async getDripEnrollmentsByClient(clientId: number): Promise<DripEnrollment[]> {
    const result = await db.execute(sql`SELECT * FROM drip_enrollments WHERE client_id = ${clientId} ORDER BY enrolled_at DESC`);
    return (result.rows as any[]).map(row => this.mapEnrollmentRow(row));
  }

  async getDripEnrollmentsByCampaign(campaignId: number): Promise<DripEnrollment[]> {
    const result = await db.execute(sql`SELECT * FROM drip_enrollments WHERE campaign_id = ${campaignId} ORDER BY enrolled_at DESC`);
    return (result.rows as any[]).map(row => this.mapEnrollmentRow(row));
  }

  async updateDripEnrollmentStatus(id: number, status: string): Promise<DripEnrollment> {
    const result = await db.execute(sql`UPDATE drip_enrollments SET status = ${status} WHERE id = ${id} RETURNING *`);
    if (!result.rows[0]) throw new Error('Enrollment not found');
    return this.mapEnrollmentRow(result.rows[0]);
  }

  async advanceDripEnrollmentStep(id: number, nextActionAt: Date | null): Promise<DripEnrollment> {
    const result = await db.execute(sql`
      UPDATE drip_enrollments 
      SET current_step_index = current_step_index + 1, 
          last_action_at = NOW(), 
          next_action_at = ${nextActionAt}
      WHERE id = ${id} 
      RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Enrollment not found');
    return this.mapEnrollmentRow(result.rows[0]);
  }

  async getDueEnrollments(): Promise<DripEnrollment[]> {
    const result = await db.execute(sql`
      SELECT * FROM drip_enrollments 
      WHERE status = 'active' AND next_action_at <= NOW()
      ORDER BY next_action_at ASC
    `);
    return (result.rows as any[]).map(row => this.mapEnrollmentRow(row));
  }

  async createClientSpecialDate(data: InsertClientSpecialDate): Promise<ClientSpecialDate> {
    const result = await db.execute(sql`
      INSERT INTO client_special_dates (client_id, agent_id, date_type, date_value, year, label)
      VALUES (${data.clientId}, ${data.agentId}, ${data.dateType}, ${data.dateValue}, ${data.year || null}, ${data.label || null})
      RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Failed to create special date');
    return this.mapSpecialDateRow(result.rows[0]);
  }

  async getClientSpecialDate(id: number): Promise<ClientSpecialDate | undefined> {
    const result = await db.execute(sql`SELECT * FROM client_special_dates WHERE id = ${id} LIMIT 1`);
    if (!result.rows[0]) return undefined;
    return this.mapSpecialDateRow(result.rows[0]);
  }

  async getClientSpecialDatesByClient(clientId: number): Promise<ClientSpecialDate[]> {
    const result = await db.execute(sql`SELECT * FROM client_special_dates WHERE client_id = ${clientId} ORDER BY date_value ASC`);
    return (result.rows as any[]).map(row => this.mapSpecialDateRow(row));
  }

  async getClientSpecialDatesByAgent(agentId: number): Promise<ClientSpecialDate[]> {
    const result = await db.execute(sql`SELECT * FROM client_special_dates WHERE agent_id = ${agentId} ORDER BY date_value ASC`);
    return (result.rows as any[]).map(row => this.mapSpecialDateRow(row));
  }

  async updateClientSpecialDate(id: number, data: Partial<ClientSpecialDate>): Promise<ClientSpecialDate> {
    const parts: any[] = [];
    if (data.dateType !== undefined) parts.push(sql`date_type = ${data.dateType}`);
    if (data.dateValue !== undefined) parts.push(sql`date_value = ${data.dateValue}`);
    if (data.year !== undefined) parts.push(sql`year = ${data.year}`);
    if (data.label !== undefined) parts.push(sql`label = ${data.label}`);
    if (parts.length === 0) throw new Error('No fields to update');
    const result = await db.execute(sql`UPDATE client_special_dates SET ${sql.join(parts, sql`, `)} WHERE id = ${id} RETURNING *`);
    if (!result.rows[0]) throw new Error('Special date not found');
    return this.mapSpecialDateRow(result.rows[0]);
  }

  async deleteClientSpecialDate(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM client_special_dates WHERE id = ${id}`);
  }

  async getUpcomingSpecialDates(agentId: number, withinDays: number): Promise<ClientSpecialDate[]> {
    const today = new Date();
    const dates: ClientSpecialDate[] = [];
    const allDates = await this.getClientSpecialDatesByAgent(agentId);
    
    for (const sd of allDates) {
      const [month, day] = sd.dateValue.split('-').map(Number);
      if (!month || !day) continue;
      
      const thisYear = today.getFullYear();
      let nextOccurrence = new Date(thisYear, month - 1, day);
      if (nextOccurrence < today) {
        nextOccurrence = new Date(thisYear + 1, month - 1, day);
      }
      
      const diffMs = nextOccurrence.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays <= withinDays) {
        dates.push(sd);
      }
    }
    
    return dates;
  }

  private mapLeadZipCodeRow(row: any): LeadZipCode {
    return {
      id: Number(row.id),
      agentId: Number(row.agent_id),
      zipCode: String(row.zip_code),
      isActive: row.is_active === true || row.is_active === 't',
      monthlyRate: row.monthly_rate ? Number(row.monthly_rate) : 0,
      createdAt: row.created_at ? new Date(row.created_at) : null,
    };
  }

  private mapLeadRow(row: any): Lead {
    return {
      id: Number(row.id),
      zipCode: String(row.zip_code),
      firstName: String(row.first_name),
      lastName: String(row.last_name),
      email: String(row.email),
      phone: row.phone ? String(row.phone) : null,
      type: String(row.type) as any,
      message: row.message ? String(row.message) : null,
      budget: row.budget ? String(row.budget) : null,
      timeframe: row.timeframe ? String(row.timeframe) : null,
      source: row.source ? String(row.source) : null,
      status: String(row.status) as any,
      assignedAgentId: row.assigned_agent_id ? Number(row.assigned_agent_id) : null,
      assignedAt: row.assigned_at ? new Date(row.assigned_at) : null,
      respondedAt: row.responded_at ? new Date(row.responded_at) : null,
      contactedAt: row.contacted_at ? new Date(row.contacted_at) : null,
      connectedAt: row.connected_at ? new Date(row.connected_at) : null,
      exclusiveUntil: row.exclusive_until ? new Date(row.exclusive_until) : null,
      createdAt: row.created_at ? new Date(row.created_at) : null,
    };
  }

  private mapLeadRotationRow(row: any): LeadRotation {
    return {
      id: Number(row.id),
      zipCode: String(row.zip_code),
      lastAgentId: row.last_agent_id ? Number(row.last_agent_id) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    };
  }

  private mapAgentReviewRow(row: any): AgentReview {
    return {
      id: Number(row.id),
      agentId: Number(row.agent_id),
      reviewerId: Number(row.reviewer_id),
      rating: Number(row.rating),
      title: row.title ? String(row.title) : null,
      comment: String(row.comment),
      transactionId: row.transaction_id ? Number(row.transaction_id) : null,
      isPublic: row.is_public === true || row.is_public === 't',
      createdAt: row.created_at ? new Date(row.created_at) : null,
    };
  }

  async claimZipCode(data: InsertLeadZipCode): Promise<LeadZipCode> {
    const result = await db.execute(sql`
      INSERT INTO lead_zip_codes (agent_id, zip_code, is_active, monthly_rate)
      VALUES (${data.agentId}, ${data.zipCode}, ${data.isActive ?? true}, ${data.monthlyRate ?? 0})
      RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Failed to claim zip code');
    return this.mapLeadZipCodeRow(result.rows[0]);
  }

  async unclaimZipCode(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM lead_zip_codes WHERE id = ${id}`);
  }

  async getAgentZipCodes(agentId: number): Promise<LeadZipCode[]> {
    const result = await db.execute(sql`SELECT * FROM lead_zip_codes WHERE agent_id = ${agentId} ORDER BY created_at DESC`);
    return (result.rows as any[]).map(row => this.mapLeadZipCodeRow(row));
  }

  async getAgentsForZipCode(zipCode: string): Promise<LeadZipCode[]> {
    const result = await db.execute(sql`SELECT * FROM lead_zip_codes WHERE zip_code = ${zipCode} AND is_active = true`);
    return (result.rows as any[]).map(row => this.mapLeadZipCodeRow(row));
  }

  async isZipCodeClaimed(agentId: number, zipCode: string): Promise<boolean> {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM lead_zip_codes WHERE agent_id = ${agentId} AND zip_code = ${zipCode}`);
    return Number(result.rows[0]?.count) > 0;
  }

  async getAvailableZipCodes(): Promise<string[]> {
    const result = await db.execute(sql`SELECT DISTINCT zip_code FROM lead_zip_codes WHERE is_active = true ORDER BY zip_code`);
    return (result.rows as any[]).map(row => String(row.zip_code));
  }

  async getAgentCountForZipCode(zipCode: string): Promise<number> {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM lead_zip_codes WHERE zip_code = ${zipCode} AND is_active = true`);
    return Number(result.rows[0]?.count ?? 0);
  }

  async countAgentZipCodes(agentId: number): Promise<number> {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM lead_zip_codes WHERE agent_id = ${agentId}`);
    return Number(result.rows[0]?.count ?? 0);
  }

  async countAgentFreeZipCodes(agentId: number): Promise<number> {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM lead_zip_codes WHERE agent_id = ${agentId} AND monthly_rate = 0`);
    return Number(result.rows[0]?.count ?? 0);
  }

  async updateZipCodeBudget(id: number, monthlyRate: number): Promise<void> {
    await db.execute(sql`UPDATE lead_zip_codes SET monthly_rate = ${monthlyRate} WHERE id = ${id}`);
  }

  async getLeadCountForZip(zipCode: string, days: number): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM leads WHERE zip_code = ${zipCode} AND created_at >= ${since}`);
    return Number(result.rows[0]?.count ?? 0);
  }

  async getLenderLeadCountForZip(zipCode: string, days: number): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM lender_leads WHERE zip_code = ${zipCode} AND created_at >= ${since}`);
    return Number(result.rows[0]?.count ?? 0);
  }

  async getVendorLeadCountForZip(zipCode: string, category: string, days: number): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM vendor_leads WHERE zip_code = ${zipCode} AND category = ${category} AND created_at >= ${since}`);
    return Number(result.rows[0]?.count ?? 0);
  }

  async createLead(data: InsertLead): Promise<Lead> {
    const assignedAt = data.assignedAgentId ? new Date() : null;
    const exclusiveUntil = data.exclusiveUntil || (data.assignedAgentId ? new Date(Date.now() + 15 * 60 * 1000) : null);
    const result = await db.execute(sql`
      INSERT INTO leads (zip_code, first_name, last_name, email, phone, type, message, budget, timeframe, source, status, assigned_agent_id, assigned_at, exclusive_until)
      VALUES (${data.zipCode}, ${data.firstName}, ${data.lastName}, ${data.email}, ${data.phone || null}, ${data.type}, ${data.message || null}, ${data.budget || null}, ${data.timeframe || null}, ${data.source || null}, ${data.status || 'new'}, ${data.assignedAgentId || null}, ${assignedAt}, ${exclusiveUntil})
      RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Failed to create lead');
    return this.mapLeadRow(result.rows[0]);
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const result = await db.execute(sql`SELECT * FROM leads WHERE id = ${id} LIMIT 1`);
    if (!result.rows[0]) return undefined;
    return this.mapLeadRow(result.rows[0]);
  }

  async getLeadsByAgent(agentId: number): Promise<Lead[]> {
    const result = await db.execute(sql`SELECT * FROM leads WHERE assigned_agent_id = ${agentId} ORDER BY created_at DESC`);
    return (result.rows as any[]).map(row => this.mapLeadRow(row));
  }

  async getLeadsByZipCode(zipCode: string): Promise<Lead[]> {
    const result = await db.execute(sql`SELECT * FROM leads WHERE zip_code = ${zipCode} ORDER BY created_at DESC`);
    return (result.rows as any[]).map(row => this.mapLeadRow(row));
  }

  async updateLeadStatus(id: number, status: string, agentId?: number): Promise<Lead> {
    let result;
    const isResponse = status === 'accepted' || status === 'rejected';
    if (agentId !== undefined && isResponse) {
      result = await db.execute(sql`UPDATE leads SET status = ${status}, assigned_agent_id = ${agentId}, responded_at = NOW() WHERE id = ${id} RETURNING *`);
    } else if (agentId !== undefined) {
      result = await db.execute(sql`UPDATE leads SET status = ${status}, assigned_agent_id = ${agentId} WHERE id = ${id} RETURNING *`);
    } else if (isResponse) {
      result = await db.execute(sql`UPDATE leads SET status = ${status}, responded_at = NOW() WHERE id = ${id} RETURNING *`);
    } else {
      result = await db.execute(sql`UPDATE leads SET status = ${status} WHERE id = ${id} RETURNING *`);
    }
    if (!result.rows[0]) throw new Error('Lead not found');
    return this.mapLeadRow(result.rows[0]);
  }

  async getNewLeadsByZipCode(zipCode: string): Promise<Lead[]> {
    const result = await db.execute(sql`SELECT * FROM leads WHERE zip_code = ${zipCode} AND status = 'new' ORDER BY created_at ASC`);
    return (result.rows as any[]).map(row => this.mapLeadRow(row));
  }

  async getLeadRotation(zipCode: string): Promise<LeadRotation | undefined> {
    const result = await db.execute(sql`SELECT * FROM lead_rotations WHERE zip_code = ${zipCode} LIMIT 1`);
    if (!result.rows[0]) return undefined;
    return this.mapLeadRotationRow(result.rows[0]);
  }

  async upsertLeadRotation(zipCode: string, lastAgentId: number): Promise<LeadRotation> {
    const result = await db.execute(sql`
      INSERT INTO lead_rotations (zip_code, last_agent_id, updated_at)
      VALUES (${zipCode}, ${lastAgentId}, NOW())
      ON CONFLICT (zip_code) DO UPDATE SET last_agent_id = ${lastAgentId}, updated_at = NOW()
      RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Failed to upsert lead rotation');
    return this.mapLeadRotationRow(result.rows[0]);
  }

  async createAgentReview(data: InsertAgentReview): Promise<AgentReview> {
    const result = await db.execute(sql`
      INSERT INTO agent_reviews (agent_id, reviewer_id, rating, title, comment, transaction_id, is_public)
      VALUES (${data.agentId}, ${data.reviewerId}, ${data.rating}, ${data.title || null}, ${data.comment}, ${data.transactionId || null}, ${data.isPublic ?? true})
      RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Failed to create agent review');
    return this.mapAgentReviewRow(result.rows[0]);
  }

  async getAgentReviews(agentId: number): Promise<AgentReview[]> {
    const result = await db.execute(sql`SELECT * FROM agent_reviews WHERE agent_id = ${agentId} AND is_public = true ORDER BY created_at DESC`);
    return (result.rows as any[]).map(row => this.mapAgentReviewRow(row));
  }

  async getAgentAverageRating(agentId: number): Promise<{ avg: number; count: number }> {
    const result = await db.execute(sql`
      SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as review_count
      FROM agent_reviews WHERE agent_id = ${agentId} AND is_public = true
    `);
    const row = result.rows[0];
    return {
      avg: row ? Number(Number(row.avg_rating).toFixed(1)) : 0,
      count: row ? Number(row.review_count) : 0,
    };
  }

  async getReviewsByReviewer(reviewerId: number): Promise<AgentReview[]> {
    const result = await db.execute(sql`SELECT * FROM agent_reviews WHERE reviewer_id = ${reviewerId} ORDER BY created_at DESC`);
    return (result.rows as any[]).map(row => this.mapAgentReviewRow(row));
  }

  async deleteAgentReview(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM agent_reviews WHERE id = ${id}`);
  }

  async getAgentReview(id: number): Promise<AgentReview | undefined> {
    const result = await db.execute(sql`SELECT * FROM agent_reviews WHERE id = ${id} LIMIT 1`);
    if (!result.rows[0]) return undefined;
    return this.mapAgentReviewRow(result.rows[0]);
  }

  async getPublicAgentProfile(agentId: number): Promise<{ user: User; avgRating: number; reviewCount: number } | undefined> {
    const user = await this.getUser(agentId);
    if (!user) return undefined;
    const { avg, count } = await this.getAgentAverageRating(agentId);
    return { user, avgRating: avg, reviewCount: count };
  }

  async getTopAgents(limit: number): Promise<{ user: User; avgRating: number; reviewCount: number }[]> {
    const result = await db.execute(sql`
      SELECT u.id, u.email, u.password, u.first_name as "firstName", u.last_name as "lastName",
             u.role, u.agent_id as "agentId", u.client_record_id as "clientRecordId",
             u.claimed_transaction_id as "claimedTransactionId", u.claimed_access_code as "claimedAccessCode",
             COALESCE(AVG(ar.rating), 0) as avg_rating,
             COUNT(ar.id) as review_count
      FROM users u
      INNER JOIN agent_reviews ar ON ar.agent_id = u.id AND ar.is_public = true
      WHERE u.role = 'agent'
      GROUP BY u.id
      HAVING COUNT(ar.id) > 0
      ORDER BY AVG(ar.rating) DESC, COUNT(ar.id) DESC
      LIMIT ${limit}
    `);
    return (result.rows as any[]).map(row => ({
      user: {
        id: Number(row.id),
        email: String(row.email),
        password: String(row.password),
        firstName: String(row.firstName),
        lastName: String(row.lastName),
        role: String(row.role),
        agentId: row.agentId ? Number(row.agentId) : null,
        clientRecordId: row.clientRecordId ? Number(row.clientRecordId) : null,
        claimedTransactionId: row.claimedTransactionId ? Number(row.claimedTransactionId) : null,
        claimedAccessCode: row.claimedAccessCode ? String(row.claimedAccessCode) : null,
      },
      avgRating: Number(Number(row.avg_rating).toFixed(1)),
      reviewCount: Number(row.review_count),
    }));
  }

  private mapVendorRatingRow(row: any): VendorRating {
    return {
      id: Number(row.id),
      contractorId: Number(row.contractor_id),
      agentId: Number(row.agent_id),
      overallRating: Number(row.overall_rating),
      qualityRating: row.quality_rating != null ? Number(row.quality_rating) : null,
      communicationRating: row.communication_rating != null ? Number(row.communication_rating) : null,
      timelinessRating: row.timelines_rating != null ? Number(row.timelines_rating) : null,
      valueRating: row.value_rating != null ? Number(row.value_rating) : null,
      title: row.title ? String(row.title) : null,
      comment: String(row.comment),
      transactionId: row.transaction_id ? Number(row.transaction_id) : null,
      bidId: row.bid_id ? Number(row.bid_id) : null,
      wouldRecommend: row.would_recommend === true || row.would_recommend === 't',
      createdAt: row.created_at ? new Date(row.created_at) : null,
    };
  }

  async createVendorRating(data: InsertVendorRating): Promise<VendorRating> {
    const result = await db.execute(sql`
      INSERT INTO vendor_ratings (contractor_id, agent_id, overall_rating, quality_rating, communication_rating, timelines_rating, value_rating, title, comment, transaction_id, bid_id, would_recommend)
      VALUES (${data.contractorId}, ${data.agentId}, ${data.overallRating}, ${data.qualityRating ?? null}, ${data.communicationRating ?? null}, ${data.timelinessRating ?? null}, ${data.valueRating ?? null}, ${data.title || null}, ${data.comment}, ${data.transactionId || null}, ${data.bidId || null}, ${data.wouldRecommend ?? true})
      RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Failed to create vendor rating');
    return this.mapVendorRatingRow(result.rows[0]);
  }

  async getVendorRatings(contractorId: number): Promise<VendorRating[]> {
    const result = await db.execute(sql`SELECT * FROM vendor_ratings WHERE contractor_id = ${contractorId} ORDER BY created_at DESC`);
    return (result.rows as any[]).map(row => this.mapVendorRatingRow(row));
  }

  async getVendorRating(id: number): Promise<VendorRating | undefined> {
    const result = await db.execute(sql`SELECT * FROM vendor_ratings WHERE id = ${id} LIMIT 1`);
    if (!result.rows[0]) return undefined;
    return this.mapVendorRatingRow(result.rows[0]);
  }

  async getVendorRatingsByAgent(agentId: number): Promise<VendorRating[]> {
    const result = await db.execute(sql`SELECT * FROM vendor_ratings WHERE agent_id = ${agentId} ORDER BY created_at DESC`);
    return (result.rows as any[]).map(row => this.mapVendorRatingRow(row));
  }

  async deleteVendorRating(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM vendor_ratings WHERE id = ${id}`);
  }

  async getVendorPerformanceStats(contractorId: number): Promise<{ avgOverall: number; avgQuality: number; avgCommunication: number; avgTimeliness: number; avgValue: number; totalRatings: number; recommendRate: number }> {
    const result = await db.execute(sql`
      SELECT
        COALESCE(AVG(overall_rating), 0) as avg_overall,
        COALESCE(AVG(quality_rating), 0) as avg_quality,
        COALESCE(AVG(communication_rating), 0) as avg_communication,
        COALESCE(AVG(timelines_rating), 0) as avg_timeliness,
        COALESCE(AVG(value_rating), 0) as avg_value,
        COUNT(*) as total_ratings,
        COALESCE(AVG(CASE WHEN would_recommend = true THEN 100.0 ELSE 0.0 END), 0) as recommend_rate
      FROM vendor_ratings
      WHERE contractor_id = ${contractorId}
    `);
    const row = result.rows[0];
    return {
      avgOverall: row ? Number(Number(row.avg_overall).toFixed(1)) : 0,
      avgQuality: row ? Number(Number(row.avg_quality).toFixed(1)) : 0,
      avgCommunication: row ? Number(Number(row.avg_communication).toFixed(1)) : 0,
      avgTimeliness: row ? Number(Number(row.avg_timeliness).toFixed(1)) : 0,
      avgValue: row ? Number(Number(row.avg_value).toFixed(1)) : 0,
      totalRatings: row ? Number(row.total_ratings) : 0,
      recommendRate: row ? Number(Number(row.recommend_rate).toFixed(1)) : 0,
    };
  }

  async getContractorTeamCount(contractorId: number): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id) as count FROM home_team_members WHERE contractor_id = ${contractorId}
    `);
    return Number((result.rows[0] as any)?.count || 0);
  }

  async getContractorTrustedByAgentCount(contractorId: number): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT agent_id) as count FROM vendor_ratings WHERE contractor_id = ${contractorId} AND would_recommend = true
    `);
    return Number((result.rows[0] as any)?.count || 0);
  }

  async createWebAuthnCredential(credential: { id: string; userId: number; publicKey: string; counter: number; deviceType?: string; backedUp?: boolean; transports?: string }): Promise<WebAuthnCredential> {
    const result = await db.execute(sql`
      INSERT INTO webauthn_credentials (id, user_id, public_key, counter, device_type, backed_up, transports)
      VALUES (${credential.id}, ${credential.userId}, ${credential.publicKey}, ${credential.counter}, ${credential.deviceType || null}, ${credential.backedUp || false}, ${credential.transports || null})
      RETURNING *
    `);
    const row = result.rows[0] as any;
    return {
      id: row.id,
      userId: row.user_id,
      publicKey: row.public_key,
      counter: row.counter,
      deviceType: row.device_type,
      backedUp: row.backed_up,
      transports: row.transports,
      createdAt: row.created_at,
    };
  }

  async getWebAuthnCredentialsByUser(userId: number): Promise<WebAuthnCredential[]> {
    const result = await db.execute(sql`SELECT * FROM webauthn_credentials WHERE user_id = ${userId}`);
    return result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      publicKey: row.public_key,
      counter: row.counter,
      deviceType: row.device_type,
      backedUp: row.backed_up,
      transports: row.transports,
      createdAt: row.created_at,
    }));
  }

  async getWebAuthnCredential(id: string): Promise<WebAuthnCredential | undefined> {
    const result = await db.execute(sql`SELECT * FROM webauthn_credentials WHERE id = ${id}`);
    const row = result.rows[0] as any;
    if (!row) return undefined;
    return {
      id: row.id,
      userId: row.user_id,
      publicKey: row.public_key,
      counter: row.counter,
      deviceType: row.device_type,
      backedUp: row.backed_up,
      transports: row.transports,
      createdAt: row.created_at,
    };
  }

  async updateWebAuthnCredentialCounter(id: string, counter: number): Promise<void> {
    await db.execute(sql`UPDATE webauthn_credentials SET counter = ${counter} WHERE id = ${id}`);
  }

  async deleteWebAuthnCredential(id: string): Promise<void> {
    await db.execute(sql`DELETE FROM webauthn_credentials WHERE id = ${id}`);
  }

  async savePushSubscription(sub: InsertPushSubscription): Promise<PushSubscription> {
    await db.execute(sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`);
    const [result] = await db.insert(pushSubscriptions).values(sub).returning();
    return result;
  }

  async getPushSubscriptionsByUser(userId: number): Promise<PushSubscription[]> {
    return await db.select().from(pushSubscriptions).where(sql`${pushSubscriptions.userId} = ${userId}`);
  }

  async deletePushSubscription(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM push_subscriptions WHERE id = ${id}`);
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
    await db.execute(sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`);
  }

  async deletePushSubscriptionByUserAndEndpoint(userId: number, endpoint: string): Promise<void> {
    await db.execute(sql`DELETE FROM push_subscriptions WHERE user_id = ${userId} AND endpoint = ${endpoint}`);
  }

  private mapVendorZipCodeRow(row: any): VendorZipCode {
    return {
      id: Number(row.id),
      vendorId: Number(row.vendor_id),
      zipCode: String(row.zip_code),
      category: String(row.category),
      isActive: row.is_active !== false,
      monthlyRate: row.monthly_rate ? Number(row.monthly_rate) : 0,
      createdAt: row.created_at ? new Date(row.created_at) : null,
    };
  }

  private mapVendorLeadRow(row: any): VendorLead {
    return {
      id: Number(row.id),
      zipCode: String(row.zip_code),
      category: String(row.category),
      firstName: String(row.first_name),
      lastName: String(row.last_name),
      email: String(row.email),
      phone: row.phone ? String(row.phone) : null,
      description: row.description ? String(row.description) : null,
      urgency: String(row.urgency) as any,
      status: String(row.status) as any,
      assignedVendorId: row.assigned_vendor_id ? Number(row.assigned_vendor_id) : null,
      assignedAt: row.assigned_at ? new Date(row.assigned_at) : null,
      respondedAt: row.responded_at ? new Date(row.responded_at) : null,
      createdAt: row.created_at ? new Date(row.created_at) : null,
    };
  }

  private mapVendorLeadRotationRow(row: any): VendorLeadRotation {
    return {
      id: Number(row.id),
      zipCode: String(row.zip_code),
      category: String(row.category),
      lastVendorId: row.last_vendor_id ? Number(row.last_vendor_id) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    };
  }

  async getVendorZipCodes(vendorId: number): Promise<VendorZipCode[]> {
    const result = await db.execute(sql`SELECT * FROM vendor_zip_codes WHERE vendor_id = ${vendorId} ORDER BY created_at DESC`);
    return (result.rows as any[]).map(row => this.mapVendorZipCodeRow(row));
  }

  async claimVendorZipCode(data: InsertVendorZipCode): Promise<VendorZipCode> {
    const result = await db.execute(sql`
      INSERT INTO vendor_zip_codes (vendor_id, zip_code, category, is_active, monthly_rate)
      VALUES (${data.vendorId}, ${data.zipCode}, ${data.category}, ${data.isActive ?? true}, ${data.monthlyRate ?? 0})
      RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Failed to claim vendor zip code');
    return this.mapVendorZipCodeRow(result.rows[0]);
  }

  async releaseVendorZipCode(id: number, vendorId: number): Promise<void> {
    await db.execute(sql`DELETE FROM vendor_zip_codes WHERE id = ${id} AND vendor_id = ${vendorId}`);
  }

  async getVendorZipCodesByZip(zipCode: string, category?: string): Promise<VendorZipCode[]> {
    if (category) {
      const result = await db.execute(sql`SELECT * FROM vendor_zip_codes WHERE zip_code = ${zipCode} AND category = ${category} AND is_active = true`);
      return (result.rows as any[]).map(row => this.mapVendorZipCodeRow(row));
    }
    const result = await db.execute(sql`SELECT * FROM vendor_zip_codes WHERE zip_code = ${zipCode} AND is_active = true`);
    return (result.rows as any[]).map(row => this.mapVendorZipCodeRow(row));
  }

  async getVendorCountForZipCategory(zipCode: string, category: string): Promise<number> {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM vendor_zip_codes WHERE zip_code = ${zipCode} AND category = ${category} AND is_active = true`);
    return Number(result.rows[0]?.count ?? 0);
  }

  async countVendorZipCodes(vendorId: number): Promise<number> {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM vendor_zip_codes WHERE vendor_id = ${vendorId}`);
    return Number(result.rows[0]?.count ?? 0);
  }

  async countVendorFreeZipCodes(vendorId: number): Promise<number> {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM vendor_zip_codes WHERE vendor_id = ${vendorId} AND monthly_rate = 0`);
    return Number(result.rows[0]?.count ?? 0);
  }

  async isVendorZipClaimed(vendorId: number, zipCode: string, category: string): Promise<boolean> {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM vendor_zip_codes WHERE vendor_id = ${vendorId} AND zip_code = ${zipCode} AND category = ${category}`);
    return Number(result.rows[0]?.count ?? 0) > 0;
  }

  async createVendorLead(data: InsertVendorLead): Promise<VendorLead> {
    const assignedAt = data.assignedVendorId ? new Date() : null;
    const result = await db.execute(sql`
      INSERT INTO vendor_leads (zip_code, category, first_name, last_name, email, phone, description, urgency, status, assigned_vendor_id, assigned_at)
      VALUES (${data.zipCode}, ${data.category}, ${data.firstName}, ${data.lastName}, ${data.email}, ${data.phone || null}, ${data.description || null}, ${data.urgency || 'medium'}, ${data.status || 'new'}, ${data.assignedVendorId || null}, ${assignedAt})
      RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Failed to create vendor lead');
    return this.mapVendorLeadRow(result.rows[0]);
  }

  async getVendorLead(id: number): Promise<VendorLead | undefined> {
    const result = await db.execute(sql`SELECT * FROM vendor_leads WHERE id = ${id} LIMIT 1`);
    if (!result.rows[0]) return undefined;
    return this.mapVendorLeadRow(result.rows[0]);
  }

  async getVendorLeadsByVendor(vendorId: number): Promise<VendorLead[]> {
    const result = await db.execute(sql`SELECT * FROM vendor_leads WHERE assigned_vendor_id = ${vendorId} ORDER BY created_at DESC`);
    return (result.rows as any[]).map(row => this.mapVendorLeadRow(row));
  }

  async updateVendorLeadStatus(id: number, status: string, vendorId?: number): Promise<VendorLead> {
    let result;
    const isResponse = status === 'accepted' || status === 'rejected';
    if (vendorId !== undefined && isResponse) {
      result = await db.execute(sql`UPDATE vendor_leads SET status = ${status}, assigned_vendor_id = ${vendorId}, responded_at = NOW() WHERE id = ${id} RETURNING *`);
    } else if (vendorId !== undefined) {
      result = await db.execute(sql`UPDATE vendor_leads SET status = ${status}, assigned_vendor_id = ${vendorId} WHERE id = ${id} RETURNING *`);
    } else if (isResponse) {
      result = await db.execute(sql`UPDATE vendor_leads SET status = ${status}, responded_at = NOW() WHERE id = ${id} RETURNING *`);
    } else {
      result = await db.execute(sql`UPDATE vendor_leads SET status = ${status} WHERE id = ${id} RETURNING *`);
    }
    if (!result.rows[0]) throw new Error('Vendor lead not found');
    return this.mapVendorLeadRow(result.rows[0]);
  }

  async getVendorLeadStats(vendorId: number): Promise<{ total: number; new: number; accepted: number; rejected: number; converted: number }> {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('new', 'assigned')) as new,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'converted') as converted
      FROM vendor_leads WHERE assigned_vendor_id = ${vendorId}
    `);
    const row = result.rows[0] as any;
    return {
      total: Number(row?.total ?? 0),
      new: Number(row?.new ?? 0),
      accepted: Number(row?.accepted ?? 0),
      rejected: Number(row?.rejected ?? 0),
      converted: Number(row?.converted ?? 0),
    };
  }

  async getVendorLeadRotation(zipCode: string, category: string): Promise<VendorLeadRotation | undefined> {
    const result = await db.execute(sql`SELECT * FROM vendor_lead_rotations WHERE zip_code = ${zipCode} AND category = ${category} LIMIT 1`);
    if (!result.rows[0]) return undefined;
    return this.mapVendorLeadRotationRow(result.rows[0]);
  }

  async upsertVendorLeadRotation(zipCode: string, category: string, lastVendorId: number): Promise<VendorLeadRotation> {
    const existing = await this.getVendorLeadRotation(zipCode, category);
    if (existing) {
      const result = await db.execute(sql`UPDATE vendor_lead_rotations SET last_vendor_id = ${lastVendorId}, updated_at = NOW() WHERE id = ${existing.id} RETURNING *`);
      if (!result.rows[0]) throw new Error('Failed to update vendor lead rotation');
      return this.mapVendorLeadRotationRow(result.rows[0]);
    }
    const result = await db.execute(sql`
      INSERT INTO vendor_lead_rotations (zip_code, category, last_vendor_id, updated_at)
      VALUES (${zipCode}, ${category}, ${lastVendorId}, NOW())
      RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Failed to create vendor lead rotation');
    return this.mapVendorLeadRotationRow(result.rows[0]);
  }

  private mapLenderZipCodeRow(row: any): LenderZipCode {
    return {
      id: Number(row.id),
      lenderId: Number(row.lender_id),
      zipCode: String(row.zip_code),
      isActive: row.is_active ?? true,
      monthlyRate: Number(row.monthly_rate ?? 0),
      createdAt: row.created_at ? new Date(row.created_at) : null,
    };
  }

  private mapLenderLeadRow(row: any): LenderLead {
    return {
      id: Number(row.id),
      zipCode: String(row.zip_code),
      firstName: String(row.first_name),
      lastName: String(row.last_name),
      email: String(row.email),
      phone: row.phone || null,
      loanType: row.loan_type || 'conventional',
      purchasePrice: row.purchase_price || null,
      downPayment: row.down_payment || null,
      creditScore: row.credit_score || null,
      message: row.message || null,
      status: row.status || 'new',
      assignedLenderId: row.assigned_lender_id ? Number(row.assigned_lender_id) : null,
      assignedAt: row.assigned_at ? new Date(row.assigned_at) : null,
      respondedAt: row.responded_at ? new Date(row.responded_at) : null,
      createdAt: row.created_at ? new Date(row.created_at) : null,
    };
  }

  private mapLenderLeadRotationRow(row: any): LenderLeadRotation {
    return {
      id: Number(row.id),
      zipCode: String(row.zip_code),
      lastLenderId: row.last_lender_id ? Number(row.last_lender_id) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    };
  }

  async claimLenderZipCode(data: InsertLenderZipCode): Promise<LenderZipCode> {
    const result = await db.execute(sql`
      INSERT INTO lender_zip_codes (lender_id, zip_code, is_active, monthly_rate)
      SELECT ${data.lenderId}, ${data.zipCode}, ${data.isActive ?? true}, ${data.monthlyRate ?? 0}
      WHERE (SELECT COUNT(*) FROM lender_zip_codes WHERE zip_code = ${data.zipCode} AND is_active = true) < 5
      RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Zip code is full — max 5 lenders reached');
    return this.mapLenderZipCodeRow(result.rows[0]);
  }

  async releaseLenderZipCode(id: number, lenderId: number): Promise<void> {
    await db.execute(sql`DELETE FROM lender_zip_codes WHERE id = ${id} AND lender_id = ${lenderId}`);
  }

  async getLenderZipCodes(lenderId: number): Promise<LenderZipCode[]> {
    const result = await db.execute(sql`SELECT * FROM lender_zip_codes WHERE lender_id = ${lenderId} ORDER BY created_at DESC`);
    return (result.rows as any[]).map(row => this.mapLenderZipCodeRow(row));
  }

  async getLendersForZipCode(zipCode: string): Promise<LenderZipCode[]> {
    const result = await db.execute(sql`SELECT * FROM lender_zip_codes WHERE zip_code = ${zipCode} AND is_active = true ORDER BY created_at ASC, id ASC`);
    return (result.rows as any[]).map(row => this.mapLenderZipCodeRow(row));
  }

  async isLenderZipClaimed(lenderId: number, zipCode: string): Promise<boolean> {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM lender_zip_codes WHERE lender_id = ${lenderId} AND zip_code = ${zipCode}`);
    return Number(result.rows[0]?.count) > 0;
  }

  async getLenderCountForZipCode(zipCode: string): Promise<number> {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM lender_zip_codes WHERE zip_code = ${zipCode} AND is_active = true`);
    return Number(result.rows[0]?.count ?? 0);
  }

  async countLenderZipCodes(lenderId: number): Promise<number> {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM lender_zip_codes WHERE lender_id = ${lenderId}`);
    return Number(result.rows[0]?.count ?? 0);
  }

  async updateLenderZipCodeRate(id: number, monthlyRate: number): Promise<void> {
    await db.execute(sql`UPDATE lender_zip_codes SET monthly_rate = ${monthlyRate} WHERE id = ${id}`);
  }

  async createLenderLead(data: InsertLenderLead): Promise<LenderLead> {
    const assignedAt = data.assignedLenderId ? new Date() : null;
    const result = await db.execute(sql`
      INSERT INTO lender_leads (zip_code, first_name, last_name, email, phone, loan_type, purchase_price, down_payment, credit_score, message, status, assigned_lender_id, assigned_at)
      VALUES (${data.zipCode}, ${data.firstName}, ${data.lastName}, ${data.email}, ${data.phone || null}, ${data.loanType || 'conventional'}, ${data.purchasePrice || null}, ${data.downPayment || null}, ${data.creditScore || null}, ${data.message || null}, ${data.status || 'new'}, ${data.assignedLenderId || null}, ${assignedAt})
      RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Failed to create lender lead');
    return this.mapLenderLeadRow(result.rows[0]);
  }

  async getLenderLead(id: number): Promise<LenderLead | undefined> {
    const result = await db.execute(sql`SELECT * FROM lender_leads WHERE id = ${id}`);
    if (!result.rows[0]) return undefined;
    return this.mapLenderLeadRow(result.rows[0]);
  }

  async getLenderLeadsByLender(lenderId: number): Promise<LenderLead[]> {
    const result = await db.execute(sql`SELECT * FROM lender_leads WHERE assigned_lender_id = ${lenderId} ORDER BY created_at DESC`);
    return (result.rows as any[]).map(row => this.mapLenderLeadRow(row));
  }

  async updateLenderLeadStatus(id: number, status: string, lenderId?: number): Promise<LenderLead> {
    let result;
    const isResponse = status === 'accepted' || status === 'rejected';
    if (lenderId !== undefined && isResponse) {
      result = await db.execute(sql`UPDATE lender_leads SET status = ${status}, assigned_lender_id = ${lenderId}, responded_at = NOW() WHERE id = ${id} RETURNING *`);
    } else if (lenderId !== undefined) {
      result = await db.execute(sql`UPDATE lender_leads SET status = ${status}, assigned_lender_id = ${lenderId} WHERE id = ${id} RETURNING *`);
    } else if (isResponse) {
      result = await db.execute(sql`UPDATE lender_leads SET status = ${status}, responded_at = NOW() WHERE id = ${id} RETURNING *`);
    } else {
      result = await db.execute(sql`UPDATE lender_leads SET status = ${status} WHERE id = ${id} RETURNING *`);
    }
    if (!result.rows[0]) throw new Error('Lender lead not found');
    return this.mapLenderLeadRow(result.rows[0]);
  }

  async getLenderLeadRotation(zipCode: string): Promise<LenderLeadRotation | undefined> {
    const result = await db.execute(sql`SELECT * FROM lender_lead_rotations WHERE zip_code = ${zipCode} LIMIT 1`);
    if (!result.rows[0]) return undefined;
    return this.mapLenderLeadRotationRow(result.rows[0]);
  }

  async upsertLenderLeadRotation(zipCode: string, lastLenderId: number): Promise<LenderLeadRotation> {
    const existing = await this.getLenderLeadRotation(zipCode);
    if (existing) {
      const result = await db.execute(sql`UPDATE lender_lead_rotations SET last_lender_id = ${lastLenderId}, updated_at = NOW() WHERE id = ${existing.id} RETURNING *`);
      if (!result.rows[0]) throw new Error('Failed to update lender lead rotation');
      return this.mapLenderLeadRotationRow(result.rows[0]);
    }
    const result = await db.execute(sql`
      INSERT INTO lender_lead_rotations (zip_code, last_lender_id, updated_at)
      VALUES (${zipCode}, ${lastLenderId}, NOW())
      RETURNING *
    `);
    if (!result.rows[0]) throw new Error('Failed to create lender lead rotation');
    return this.mapLenderLeadRotationRow(result.rows[0]);
  }

  async getAgentResponseMetrics(agentId: number): Promise<{ avgResponseMs: number; fastestMs: number; slowestMs: number; totalResponded: number; responseRate: number }> {
    const result = await db.execute(sql`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (responded_at - assigned_at)) * 1000) as avg_ms,
        MIN(EXTRACT(EPOCH FROM (responded_at - assigned_at)) * 1000) as min_ms,
        MAX(EXTRACT(EPOCH FROM (responded_at - assigned_at)) * 1000) as max_ms,
        COUNT(*) FILTER (WHERE responded_at IS NOT NULL) as responded,
        COUNT(*) FILTER (WHERE assigned_at IS NOT NULL) as total_assigned
      FROM leads WHERE assigned_agent_id = ${agentId} AND assigned_at IS NOT NULL
    `);
    const row = result.rows[0] as any;
    const totalAssigned = Number(row?.total_assigned ?? 0);
    const totalResponded = Number(row?.responded ?? 0);
    return {
      avgResponseMs: Number(row?.avg_ms ?? 0),
      fastestMs: Number(row?.min_ms ?? 0),
      slowestMs: Number(row?.max_ms ?? 0),
      totalResponded,
      responseRate: totalAssigned > 0 ? (totalResponded / totalAssigned) * 100 : 0,
    };
  }

  async getVendorResponseMetrics(vendorId: number): Promise<{ avgResponseMs: number; fastestMs: number; slowestMs: number; totalResponded: number; responseRate: number }> {
    const result = await db.execute(sql`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (responded_at - assigned_at)) * 1000) as avg_ms,
        MIN(EXTRACT(EPOCH FROM (responded_at - assigned_at)) * 1000) as min_ms,
        MAX(EXTRACT(EPOCH FROM (responded_at - assigned_at)) * 1000) as max_ms,
        COUNT(*) FILTER (WHERE responded_at IS NOT NULL) as responded,
        COUNT(*) FILTER (WHERE assigned_at IS NOT NULL) as total_assigned
      FROM vendor_leads WHERE assigned_vendor_id = ${vendorId} AND assigned_at IS NOT NULL
    `);
    const row = result.rows[0] as any;
    const totalAssigned = Number(row?.total_assigned ?? 0);
    const totalResponded = Number(row?.responded ?? 0);
    return {
      avgResponseMs: Number(row?.avg_ms ?? 0),
      fastestMs: Number(row?.min_ms ?? 0),
      slowestMs: Number(row?.max_ms ?? 0),
      totalResponded,
      responseRate: totalAssigned > 0 ? (totalResponded / totalAssigned) * 100 : 0,
    };
  }

  private LENDER_CHECKLIST_ITEMS: ChecklistItem[] = [
    { id: "l-inv-1", text: "Pre-qualification letter issued", completed: false, phase: "Invited / Pre-Contract" },
    { id: "l-inv-2", text: "Initial application started", completed: false, phase: "Invited / Pre-Contract" },
    { id: "l-inv-3", text: "Credit report pulled", completed: false, phase: "Invited / Pre-Contract" },
    { id: "l-inv-4", text: "Income documents requested", completed: false, phase: "Invited / Pre-Contract" },

    { id: "l-uc-1", text: "Purchase contract received", completed: false, phase: "Under Contract" },
    { id: "l-uc-2", text: "Full application (1003/URLA) submitted", completed: false, phase: "Under Contract" },
    { id: "l-uc-3", text: "Disclosures sent", completed: false, phase: "Under Contract" },
    { id: "l-uc-4", text: "Processing fee collected", completed: false, phase: "Under Contract" },

    { id: "l-proc-1", text: "Income verification (VoE) completed", completed: false, phase: "Processing" },
    { id: "l-proc-2", text: "Bank statements verified", completed: false, phase: "Processing" },
    { id: "l-proc-3", text: "Appraisal ordered", completed: false, phase: "Processing" },
    { id: "l-proc-4", text: "Title search ordered", completed: false, phase: "Processing" },
    { id: "l-proc-5", text: "Insurance binder requested", completed: false, phase: "Processing" },
    { id: "l-proc-6", text: "Tax transcripts ordered", completed: false, phase: "Processing" },

    { id: "l-uw-1", text: "File submitted to underwriter", completed: false, phase: "Underwriting" },
    { id: "l-uw-2", text: "Credit/capacity/collateral analysis complete", completed: false, phase: "Underwriting" },
    { id: "l-uw-3", text: "Conditional approval issued", completed: false, phase: "Underwriting" },
    { id: "l-uw-4", text: "Conditions list sent to borrower", completed: false, phase: "Underwriting" },

    { id: "l-cc-1", text: "Conditions documents received", completed: false, phase: "Conditions Clearing" },
    { id: "l-cc-2", text: "Updated paystub/bank statement received", completed: false, phase: "Conditions Clearing" },
    { id: "l-cc-3", text: "Explanation letters received", completed: false, phase: "Conditions Clearing" },
    { id: "l-cc-4", text: "Final review submitted", completed: false, phase: "Conditions Clearing" },
    { id: "l-cc-5", text: "Clear-to-close issued", completed: false, phase: "Conditions Clearing" },

    { id: "l-ctc-1", text: "Closing disclosure prepared", completed: false, phase: "Clear to Close" },
    { id: "l-ctc-2", text: "CD sent to borrower (3-day waiting period)", completed: false, phase: "Clear to Close" },
    { id: "l-ctc-3", text: "Wire instructions confirmed", completed: false, phase: "Clear to Close" },
    { id: "l-ctc-4", text: "Closing date confirmed with title", completed: false, phase: "Clear to Close" },
    { id: "l-ctc-5", text: "Final walkthrough confirmed", completed: false, phase: "Clear to Close" },

    { id: "l-cl-1", text: "Loan funded", completed: false, phase: "Closed" },
    { id: "l-cl-2", text: "Closing documents recorded", completed: false, phase: "Closed" },
    { id: "l-cl-3", text: "First payment date set", completed: false, phase: "Closed" },
    { id: "l-cl-4", text: "File archived", completed: false, phase: "Closed" },
  ];

  async createLenderTransaction(data: InsertLenderTransaction): Promise<LenderTransaction> {
    const result = await db.execute(sql`
      INSERT INTO lender_transactions (lender_id, borrower_name, borrower_email, borrower_phone, property_address, loan_amount, loan_type, interest_rate, status, notes, agent_id, agent_transaction_id)
      VALUES (${data.lenderId}, ${data.borrowerName}, ${data.borrowerEmail ?? null}, ${data.borrowerPhone ?? null}, ${data.propertyAddress ?? null}, ${data.loanAmount ?? null}, ${data.loanType ?? 'conventional'}, ${data.interestRate ?? null}, ${data.status ?? 'invited'}, ${data.notes ?? null}, ${data.agentId ?? null}, ${data.agentTransactionId ?? null})
      RETURNING *
    `);
    return result.rows[0] as LenderTransaction;
  }

  async getLenderTransaction(id: number): Promise<LenderTransaction | undefined> {
    const result = await db.execute(sql`SELECT * FROM lender_transactions WHERE id = ${id}`);
    return result.rows[0] as LenderTransaction | undefined;
  }

  async getLenderTransactionsByLender(lenderId: number): Promise<LenderTransaction[]> {
    const result = await db.execute(sql`SELECT * FROM lender_transactions WHERE lender_id = ${lenderId} ORDER BY updated_at DESC`);
    return result.rows as LenderTransaction[];
  }

  async getLenderTransactionByAgentTransaction(agentTransactionId: number): Promise<LenderTransaction | undefined> {
    const result = await db.execute(sql`SELECT * FROM lender_transactions WHERE agent_transaction_id = ${agentTransactionId} LIMIT 1`);
    return result.rows[0] as LenderTransaction | undefined;
  }

  async updateLenderTransaction(id: number, data: Partial<LenderTransaction>): Promise<LenderTransaction> {
    if (data.borrowerName !== undefined) await db.execute(sql`UPDATE lender_transactions SET borrower_name = ${data.borrowerName} WHERE id = ${id}`);
    if (data.borrowerEmail !== undefined) await db.execute(sql`UPDATE lender_transactions SET borrower_email = ${data.borrowerEmail} WHERE id = ${id}`);
    if (data.borrowerPhone !== undefined) await db.execute(sql`UPDATE lender_transactions SET borrower_phone = ${data.borrowerPhone} WHERE id = ${id}`);
    if (data.propertyAddress !== undefined) await db.execute(sql`UPDATE lender_transactions SET property_address = ${data.propertyAddress} WHERE id = ${id}`);
    if (data.loanAmount !== undefined) await db.execute(sql`UPDATE lender_transactions SET loan_amount = ${data.loanAmount} WHERE id = ${id}`);
    if (data.loanType !== undefined) await db.execute(sql`UPDATE lender_transactions SET loan_type = ${data.loanType} WHERE id = ${id}`);
    if (data.interestRate !== undefined) await db.execute(sql`UPDATE lender_transactions SET interest_rate = ${data.interestRate} WHERE id = ${id}`);
    if (data.status !== undefined) await db.execute(sql`UPDATE lender_transactions SET status = ${data.status} WHERE id = ${id}`);
    if (data.notes !== undefined) await db.execute(sql`UPDATE lender_transactions SET notes = ${data.notes} WHERE id = ${id}`);
    if (data.agentId !== undefined) await db.execute(sql`UPDATE lender_transactions SET agent_id = ${data.agentId} WHERE id = ${id}`);
    if (data.agentTransactionId !== undefined) await db.execute(sql`UPDATE lender_transactions SET agent_transaction_id = ${data.agentTransactionId} WHERE id = ${id}`);
    await db.execute(sql`UPDATE lender_transactions SET updated_at = NOW() WHERE id = ${id}`);
    const result = await db.execute(sql`SELECT * FROM lender_transactions WHERE id = ${id}`);
    return result.rows[0] as LenderTransaction;
  }

  async deleteLenderTransaction(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM lender_checklist_mappings WHERE lender_transaction_id = ${id}`);
    await db.execute(sql`DELETE FROM lender_checklists WHERE lender_transaction_id = ${id}`);
    await db.execute(sql`DELETE FROM lender_transactions WHERE id = ${id}`);
  }

  async createLenderChecklist(data: InsertLenderChecklist): Promise<LenderChecklist> {
    const items = (data.items && Array.isArray(data.items) && data.items.length > 0) ? data.items : this.LENDER_CHECKLIST_ITEMS;
    const itemsJson = JSON.stringify(items);
    const result = await db.execute(sql`
      INSERT INTO lender_checklists (lender_transaction_id, items)
      VALUES (${data.lenderTransactionId}, ${itemsJson}::json)
      RETURNING *
    `);
    return result.rows[0] as LenderChecklist;
  }

  async getLenderChecklist(lenderTransactionId: number): Promise<LenderChecklist | undefined> {
    const result = await db.execute(sql`SELECT * FROM lender_checklists WHERE lender_transaction_id = ${lenderTransactionId}`);
    return result.rows[0] as LenderChecklist | undefined;
  }

  async updateLenderChecklist(id: number, items: any[]): Promise<LenderChecklist> {
    const itemsJson = JSON.stringify(items);
    const result = await db.execute(sql`
      UPDATE lender_checklists SET items = ${itemsJson}::json WHERE id = ${id} RETURNING *
    `);
    return result.rows[0] as LenderChecklist;
  }

  async getLenderChecklistMappings(lenderTransactionId: number): Promise<LenderChecklistMapping[]> {
    const result = await db.execute(sql`SELECT * FROM lender_checklist_mappings WHERE lender_transaction_id = ${lenderTransactionId}`);
    return result.rows as LenderChecklistMapping[];
  }

  async createLenderChecklistMapping(data: InsertLenderChecklistMapping): Promise<LenderChecklistMapping> {
    const result = await db.execute(sql`
      INSERT INTO lender_checklist_mappings (lender_transaction_id, lender_checklist_item_id, agent_transaction_id, agent_checklist_item_id)
      VALUES (${data.lenderTransactionId}, ${data.lenderChecklistItemId}, ${data.agentTransactionId}, ${data.agentChecklistItemId})
      RETURNING *
    `);
    return result.rows[0] as LenderChecklistMapping;
  }

  async getLenderProfiles(agentId: number): Promise<LenderProfile[]> {
    const result = await db.execute(sql`SELECT * FROM lender_profiles WHERE agent_id = ${agentId} ORDER BY created_at DESC`);
    return result.rows as LenderProfile[];
  }

  async getLenderProfile(id: number): Promise<LenderProfile | undefined> {
    const result = await db.execute(sql`SELECT * FROM lender_profiles WHERE id = ${id}`);
    return result.rows[0] as LenderProfile | undefined;
  }

  async createLenderProfile(data: InsertLenderProfile): Promise<LenderProfile> {
    const result = await db.execute(sql`
      INSERT INTO lender_profiles (agent_id, name, company, nmls, phone, email, photo_url, conventional_rate, fha_rate, va_rate, usda_rate, closing_costs_pct, min_credit_score, min_down_payment_pct, specialties, notes)
      VALUES (${data.agentId}, ${data.name}, ${data.company}, ${data.nmls || null}, ${data.phone || null}, ${data.email || null}, ${data.photoUrl || null}, ${data.conventionalRate || null}, ${data.fhaRate || null}, ${data.vaRate || null}, ${data.usdaRate || null}, ${data.closingCostsPct || null}, ${data.minCreditScore || null}, ${data.minDownPaymentPct || null}, ${data.specialties || null}, ${data.notes || null})
      RETURNING *
    `);
    return result.rows[0] as LenderProfile;
  }

  async updateLenderProfile(id: number, data: Partial<LenderProfile>): Promise<LenderProfile> {
    const existing = await this.getLenderProfile(id);
    if (!existing) throw new Error("Lender profile not found");
    const merged = { ...existing, ...data };
    const result = await db.execute(sql`
      UPDATE lender_profiles SET
        name = ${merged.name}, company = ${merged.company}, nmls = ${merged.nmls},
        phone = ${merged.phone}, email = ${merged.email}, photo_url = ${merged.photoUrl},
        conventional_rate = ${merged.conventionalRate}, fha_rate = ${merged.fhaRate},
        va_rate = ${merged.vaRate}, usda_rate = ${merged.usdaRate},
        closing_costs_pct = ${merged.closingCostsPct}, min_credit_score = ${merged.minCreditScore},
        min_down_payment_pct = ${merged.minDownPaymentPct}, specialties = ${merged.specialties},
        notes = ${merged.notes}
      WHERE id = ${id} RETURNING *
    `);
    return result.rows[0] as LenderProfile;
  }

  async deleteLenderProfile(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM lender_profiles WHERE id = ${id}`);
  }

  async createClientInvitation(data: InsertClientInvitation): Promise<ClientInvitation> {
    const result = await db.execute(sql`
      INSERT INTO client_invitations (agent_id, email, first_name, last_name, token, status, client_record_id, expires_at)
      VALUES (${data.agentId}, ${data.email}, ${data.firstName || null}, ${data.lastName || null}, ${data.token}, ${data.status || 'pending'}, ${data.clientRecordId || null}, ${data.expiresAt})
      RETURNING *
    `);
    return result.rows[0] as ClientInvitation;
  }

  async getClientInvitationsByAgent(agentId: number): Promise<ClientInvitation[]> {
    const result = await db.execute(sql`SELECT * FROM client_invitations WHERE agent_id = ${agentId} ORDER BY created_at DESC`);
    return result.rows as ClientInvitation[];
  }

  async getClientInvitationByToken(token: string): Promise<ClientInvitation | undefined> {
    const result = await db.execute(sql`SELECT * FROM client_invitations WHERE token = ${token} LIMIT 1`);
    return result.rows[0] as ClientInvitation | undefined;
  }

  async getClientInvitationsByEmail(email: string): Promise<ClientInvitation[]> {
    const result = await db.execute(sql`SELECT * FROM client_invitations WHERE email = ${email} AND status = 'pending' ORDER BY created_at DESC`);
    return result.rows as ClientInvitation[];
  }

  async updateClientInvitationStatus(id: number, status: string, clientRecordId?: number): Promise<ClientInvitation> {
    if (clientRecordId !== undefined) {
      await db.execute(sql`UPDATE client_invitations SET status = ${status}, client_record_id = ${clientRecordId} WHERE id = ${id}`);
    } else {
      await db.execute(sql`UPDATE client_invitations SET status = ${status} WHERE id = ${id}`);
    }
    const result = await db.execute(sql`SELECT * FROM client_invitations WHERE id = ${id}`);
    return result.rows[0] as ClientInvitation;
  }

  async getBrokerageAgents(brokerageId: number): Promise<User[]> {
    const result = await db.execute(sql`SELECT * FROM users WHERE brokerage_id = ${brokerageId} AND role = 'agent'`);
    return result.rows as User[];
  }

  async getBrokerMetrics(brokerageId: number): Promise<any> {
    const agentsResult = await db.execute(sql`SELECT id FROM users WHERE brokerage_id = ${brokerageId} AND role = 'agent'`);
    const agentIds = (agentsResult.rows as any[]).map(r => r.id);

    if (agentIds.length === 0) {
      return {
        totalAgents: 0,
        activeDeals: 0,
        pipelineValue: 0,
        totalClients: 0,
        conversionRate: 0,
        dealsTrend: 0,
        pipelineTrend: 0,
        clientsTrend: 0,
        conversionTrend: 0,
        dailyActivity: [],
      };
    }

    const activeStatuses = ['prospect', 'listing_prep', 'live_listing', 'under_contract'];
    const txResult = await db.execute(sql`SELECT COUNT(*) as count, COALESCE(SUM(contract_price), 0) as pipeline FROM transactions WHERE agent_id = ANY(${agentIds}) AND status = ANY(${activeStatuses})`);
    const totalTxResult = await db.execute(sql`SELECT COUNT(*) as count FROM transactions WHERE agent_id = ANY(${agentIds})`);
    const clientResult = await db.execute(sql`SELECT COUNT(*) as count FROM clients WHERE agent_id = ANY(${agentIds})`);
    const closedResult = await db.execute(sql`SELECT COUNT(*) as count FROM transactions WHERE agent_id = ANY(${agentIds}) AND status = 'closed'`);

    const totalTx = Number((totalTxResult.rows[0] as any).count) || 0;
    const closedTx = Number((closedResult.rows[0] as any).count) || 0;
    const conversionRate = totalTx > 0 ? Math.round((closedTx / totalTx) * 100) : 0;

    const prevMonthTx = await db.execute(sql`SELECT COUNT(*) as count, COALESCE(SUM(contract_price), 0) as pipeline FROM transactions WHERE agent_id = ANY(${agentIds}) AND status = ANY(${activeStatuses}) AND updated_at < NOW() - INTERVAL '30 days'`);
    const prevClients = await db.execute(sql`SELECT COUNT(*) as count FROM clients WHERE agent_id = ANY(${agentIds}) AND created_at < NOW() - INTERVAL '30 days'`);
    const prevActiveDeals = Number((prevMonthTx.rows[0] as any).count) || 0;
    const currentActiveDeals = Number((txResult.rows[0] as any).count) || 0;
    const currentPipeline = Number((txResult.rows[0] as any).pipeline) || 0;
    const prevPipeline = Number((prevMonthTx.rows[0] as any).pipeline) || 0;
    const currentClients = Number((clientResult.rows[0] as any).count) || 0;
    const prevClientsCount = Number((prevClients.rows[0] as any).count) || 0;

    const dealsTrend = prevActiveDeals > 0 ? Math.round(((currentActiveDeals - prevActiveDeals) / prevActiveDeals) * 100) : 0;
    const pipelineTrend = prevPipeline > 0 ? Math.round(((currentPipeline - prevPipeline) / prevPipeline) * 100) : 0;
    const clientsTrend = prevClientsCount > 0 ? Math.round(((currentClients - prevClientsCount) / prevClientsCount) * 100) : 0;

    const dailyResult = await db.execute(sql`
      SELECT 
        to_char(created_at, 'Dy') as day,
        type,
        COUNT(*) as count
      FROM communications 
      WHERE agent_id = ANY(${agentIds})
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY to_char(created_at, 'Dy'), type
      ORDER BY MIN(created_at)
    `);

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyMap: Record<string, any> = {};
    for (const d of dayNames) {
      dailyMap[d] = { day: d, calls: 0, emails: 0, texts: 0 };
    }
    for (const row of dailyResult.rows as any[]) {
      const d = row.day?.trim();
      if (dailyMap[d]) {
        if (row.type === 'call') dailyMap[d].calls = Number(row.count);
        if (row.type === 'email') dailyMap[d].emails = Number(row.count);
        if (row.type === 'sms') dailyMap[d].texts = Number(row.count);
      }
    }

    return {
      totalAgents: agentIds.length,
      activeDeals: currentActiveDeals,
      pipelineValue: currentPipeline,
      totalClients: currentClients,
      conversionRate,
      dealsTrend,
      pipelineTrend,
      clientsTrend,
      conversionTrend: 0,
      dailyActivity: Object.values(dailyMap),
    };
  }

  async getAgentMetrics(agentId: number): Promise<any> {
    const txResult = await db.execute(sql`SELECT COUNT(*) as count, COALESCE(SUM(contract_price), 0) as pipeline FROM transactions WHERE agent_id = ${agentId}`);
    const clientResult = await db.execute(sql`SELECT COUNT(*) as count FROM clients WHERE agent_id = ${agentId}`);
    const callsResult = await db.execute(sql`SELECT COUNT(*) as count FROM communications WHERE agent_id = ${agentId} AND type = 'call'`);
    const emailsResult = await db.execute(sql`SELECT COUNT(*) as count FROM communications WHERE agent_id = ${agentId} AND type = 'email'`);
    const textsResult = await db.execute(sql`SELECT COUNT(*) as count FROM communications WHERE agent_id = ${agentId} AND type = 'sms'`);
    const closedResult = await db.execute(sql`SELECT COUNT(*) as count FROM transactions WHERE agent_id = ${agentId} AND status = 'closed'`);
    const totalTx = Number((txResult.rows[0] as any).count) || 0;
    const closedTx = Number((closedResult.rows[0] as any).count) || 0;

    return {
      totalTransactions: totalTx,
      pipelineValue: Number((txResult.rows[0] as any).pipeline) || 0,
      totalClients: Number((clientResult.rows[0] as any).count) || 0,
      calls: Number((callsResult.rows[0] as any).count) || 0,
      emails: Number((emailsResult.rows[0] as any).count) || 0,
      texts: Number((textsResult.rows[0] as any).count) || 0,
      closedDeals: closedTx,
      conversionRate: totalTx > 0 ? Math.round((closedTx / totalTx) * 100) : 0,
      totalActivity: Number((callsResult.rows[0] as any).count) + Number((emailsResult.rows[0] as any).count) + Number((textsResult.rows[0] as any).count),
      commissions: Number((txResult.rows[0] as any).pipeline) * 0.03,
    };
  }

  async createBrokerNotification(data: InsertBrokerNotification): Promise<BrokerNotification> {
    const result = await db.execute(sql`
      INSERT INTO broker_notifications (broker_id, title, message, priority)
      VALUES (${data.brokerId}, ${data.title}, ${data.message}, ${data.priority || 'normal'})
      RETURNING *
    `);
    return result.rows[0] as BrokerNotification;
  }

  async getBrokerNotifications(brokerId: number): Promise<(BrokerNotification & { readCount: number })[]> {
    const result = await db.execute(sql`
      SELECT bn.*, COALESCE(reads.read_count, 0) as read_count
      FROM broker_notifications bn
      LEFT JOIN (
        SELECT notification_id, COUNT(*) as read_count
        FROM broker_notification_reads
        GROUP BY notification_id
      ) reads ON reads.notification_id = bn.id
      WHERE bn.broker_id = ${brokerId}
      ORDER BY bn.created_at DESC
    `);
    return (result.rows as any[]).map(r => ({
      ...r,
      readCount: Number(r.read_count) || 0,
    }));
  }

  async getAgentNotifications(agentId: number): Promise<BrokerNotification[]> {
    const userResult = await db.execute(sql`SELECT brokerage_id FROM users WHERE id = ${agentId}`);
    const user = userResult.rows[0] as any;
    if (!user?.brokerage_id) return [];

    const brokerResult = await db.execute(sql`SELECT id FROM users WHERE id = ${user.brokerage_id} AND role = 'broker'`);
    if (brokerResult.rows.length === 0) {
      const result = await db.execute(sql`
        SELECT bn.* FROM broker_notifications bn
        JOIN users u ON u.brokerage_id = (SELECT brokerage_id FROM users WHERE id = ${agentId})
        WHERE bn.broker_id = u.id AND u.role = 'broker'
        AND bn.id NOT IN (SELECT notification_id FROM broker_notification_reads WHERE agent_id = ${agentId})
        ORDER BY bn.created_at DESC
      `);
      return result.rows as BrokerNotification[];
    }

    const brokerId = (brokerResult.rows[0] as any).id;
    const result = await db.execute(sql`
      SELECT * FROM broker_notifications
      WHERE broker_id IN (SELECT id FROM users WHERE role = 'broker' AND id = ${user.brokerage_id})
      AND id NOT IN (SELECT notification_id FROM broker_notification_reads WHERE agent_id = ${agentId})
      ORDER BY created_at DESC
    `);

    if (result.rows.length === 0) {
      const allResult = await db.execute(sql`
        SELECT bn.* FROM broker_notifications bn
        WHERE bn.broker_id IN (
          SELECT u2.id FROM users u2 
          WHERE u2.role = 'broker' 
          AND u2.id = (SELECT brokerage_id FROM users WHERE id = ${agentId})
        )
        AND bn.id NOT IN (SELECT notification_id FROM broker_notification_reads WHERE agent_id = ${agentId})
        ORDER BY bn.created_at DESC
      `);
      return allResult.rows as BrokerNotification[];
    }

    return result.rows as BrokerNotification[];
  }

  async markBrokerNotificationRead(notificationId: number, agentId: number): Promise<BrokerNotificationRead> {
    const existing = await db.execute(sql`
      SELECT * FROM broker_notification_reads WHERE notification_id = ${notificationId} AND agent_id = ${agentId}
    `);
    if (existing.rows.length > 0) {
      return existing.rows[0] as BrokerNotificationRead;
    }
    const result = await db.execute(sql`
      INSERT INTO broker_notification_reads (notification_id, agent_id)
      VALUES (${notificationId}, ${agentId})
      RETURNING *
    `);
    return result.rows[0] as BrokerNotificationRead;
  }

  async createSalesCompetition(data: InsertSalesCompetition): Promise<SalesCompetition> {
    const result = await db.execute(sql`
      INSERT INTO sales_competitions (broker_id, name, description, start_date, end_date, metric, prize, status)
      VALUES (${data.brokerId}, ${data.name}, ${data.description || null}, ${data.startDate}, ${data.endDate}, ${data.metric}, ${data.prize || null}, ${data.status || 'upcoming'})
      RETURNING *
    `);
    return result.rows[0] as SalesCompetition;
  }

  async getSalesCompetitions(brokerId: number): Promise<SalesCompetition[]> {
    const result = await db.execute(sql`
      SELECT * FROM sales_competitions WHERE broker_id = ${brokerId} ORDER BY created_at DESC
    `);
    return result.rows as SalesCompetition[];
  }

  async getCompetitionLeaderboard(competitionId: number, metric: string, brokerageId: number): Promise<any[]> {
    const compResult = await db.execute(sql`SELECT start_date, end_date FROM sales_competitions WHERE id = ${competitionId}`);
    if (compResult.rows.length === 0) return [];
    const { start_date: startDate, end_date: endDate } = compResult.rows[0] as any;

    const agentsResult = await db.execute(sql`SELECT id, first_name, last_name, email FROM users WHERE brokerage_id = ${brokerageId} AND role = 'agent'`);
    const agents = agentsResult.rows as any[];

    const leaderboard = [];
    for (const agent of agents) {
      let score = 0;
      if (metric === 'calls' || metric === 'emails' || metric === 'texts' || metric === 'total_activity') {
        const typeFilter = metric === 'calls' ? 'call' : metric === 'emails' ? 'email' : metric === 'texts' ? 'sms' : null;
        if (typeFilter) {
          const r = await db.execute(sql`SELECT COUNT(*) as count FROM communications WHERE agent_id = ${agent.id} AND type = ${typeFilter} AND created_at >= ${startDate} AND created_at <= ${endDate}`);
          score = Number((r.rows[0] as any).count) || 0;
        } else {
          const r = await db.execute(sql`SELECT COUNT(*) as count FROM communications WHERE agent_id = ${agent.id} AND created_at >= ${startDate} AND created_at <= ${endDate}`);
          score = Number((r.rows[0] as any).count) || 0;
        }
      } else if (metric === 'conversions') {
        const r = await db.execute(sql`SELECT COUNT(*) as count FROM transactions WHERE agent_id = ${agent.id} AND status = 'closed' AND updated_at >= ${startDate} AND updated_at <= ${endDate}`);
        score = Number((r.rows[0] as any).count) || 0;
      } else if (metric === 'commissions') {
        const r = await db.execute(sql`SELECT COALESCE(SUM(contract_price), 0) as total FROM transactions WHERE agent_id = ${agent.id} AND status = 'closed' AND updated_at >= ${startDate} AND updated_at <= ${endDate}`);
        score = Math.round(Number((r.rows[0] as any).total) * 0.03) || 0;
      }
      leaderboard.push({
        agentId: agent.id,
        firstName: agent.first_name,
        lastName: agent.last_name,
        email: agent.email,
        score,
      });
    }

    leaderboard.sort((a, b) => b.score - a.score);
    return leaderboard.map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  async getBrokerageLeads(brokerageId: number): Promise<any[]> {
    const agentsResult = await db.execute(sql`SELECT id FROM users WHERE brokerage_id = ${brokerageId} AND role = 'agent'`);
    const agentIds = (agentsResult.rows as any[]).map(r => r.id);
    agentIds.push(brokerageId);

    if (agentIds.length === 0) return [];

    const result = await db.execute(sql`
      SELECT l.*, 
        u.first_name as agent_first_name, 
        u.last_name as agent_last_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_agent_id = u.id
      WHERE l.assigned_agent_id = ANY(${agentIds})
         OR (l.assigned_agent_id IS NULL AND l.zip_code IN (
           SELECT zip_code FROM lead_zip_codes WHERE agent_id = ANY(${agentIds})
         ))
      ORDER BY l.created_at DESC
    `);
    return result.rows as any[];
  }

  async reassignLead(leadId: number, newAgentId: number): Promise<any> {
    const result = await db.execute(sql`
      UPDATE leads 
      SET assigned_agent_id = ${newAgentId}, 
          assigned_at = NOW(),
          status = 'assigned'
      WHERE id = ${leadId}
      RETURNING *
    `);
    return result.rows[0];
  }

  async createFeedbackRequest(data: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO feedback_requests (transaction_id, agent_id, client_id, token, status)
      VALUES (${data.transactionId}, ${data.agentId}, ${data.clientId}, ${data.token}, 'pending')
      RETURNING *
    `);
    return result.rows[0];
  }

  async getFeedbackRequestByToken(token: string): Promise<any> {
    const result = await db.execute(sql`
      SELECT fr.*,
        t.street_name, t.city, t.state, t.zip_code, t.type as transaction_type,
        u.first_name as agent_first_name, u.last_name as agent_last_name,
        c.first_name as client_first_name, c.last_name as client_last_name
      FROM feedback_requests fr
      JOIN transactions t ON fr.transaction_id = t.id
      JOIN users u ON fr.agent_id = u.id
      JOIN clients c ON fr.client_id = c.id
      WHERE fr.token = ${token}
    `);
    return result.rows[0] || null;
  }

  async getFeedbackRequestsByAgent(agentId: number): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT fr.*,
        t.street_name, t.city, t.state, t.zip_code,
        c.first_name as client_first_name, c.last_name as client_last_name, c.email as client_email
      FROM feedback_requests fr
      JOIN transactions t ON fr.transaction_id = t.id
      JOIN clients c ON fr.client_id = c.id
      WHERE fr.agent_id = ${agentId}
      ORDER BY fr.sent_at DESC
    `);
    return result.rows as any[];
  }

  async completeFeedbackRequest(id: number, reviewId: number): Promise<any> {
    const result = await db.execute(sql`
      UPDATE feedback_requests
      SET status = 'completed', completed_at = NOW(), review_id = ${reviewId}
      WHERE id = ${id}
      RETURNING *
    `);
    return result.rows[0];
  }

  async getFeedbackRequestByTransaction(transactionId: number, clientId: number): Promise<any> {
    const result = await db.execute(sql`
      SELECT * FROM feedback_requests
      WHERE transaction_id = ${transactionId} AND client_id = ${clientId}
      LIMIT 1
    `);
    return result.rows[0] || null;
  }

  async createTransactionTemplate(data: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO transaction_templates (agent_id, name, type, checklist_items, documents, notes, is_default)
      VALUES (${data.agentId}, ${data.name}, ${data.type || 'buy'}, ${JSON.stringify(data.checklistItems || null)}, ${JSON.stringify(data.documents || null)}, ${data.notes || null}, ${data.isDefault || false})
      RETURNING *
    `);
    return result.rows[0];
  }

  async getTransactionTemplatesByAgent(agentId: number): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT * FROM transaction_templates WHERE agent_id = ${agentId} ORDER BY created_at DESC
    `);
    return result.rows as any[];
  }

  async getTransactionTemplate(id: number): Promise<any> {
    const result = await db.execute(sql`
      SELECT * FROM transaction_templates WHERE id = ${id} LIMIT 1
    `);
    return result.rows[0] || null;
  }

  async updateTransactionTemplate(id: number, data: any): Promise<any> {
    const sets: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { sets.push('name'); values.push(data.name); }
    if (data.type !== undefined) { sets.push('type'); values.push(data.type); }
    if (data.checklistItems !== undefined) { sets.push('checklist_items'); values.push(JSON.stringify(data.checklistItems)); }
    if (data.documents !== undefined) { sets.push('documents'); values.push(JSON.stringify(data.documents)); }
    if (data.notes !== undefined) { sets.push('notes'); values.push(data.notes); }
    if (data.isDefault !== undefined) { sets.push('is_default'); values.push(data.isDefault); }

    const result = await db.execute(sql`
      UPDATE transaction_templates
      SET name = COALESCE(${data.name}, name),
          type = COALESCE(${data.type}, type),
          checklist_items = COALESCE(${data.checklistItems ? JSON.stringify(data.checklistItems) : null}::json, checklist_items),
          documents = COALESCE(${data.documents ? JSON.stringify(data.documents) : null}::json, documents),
          notes = COALESCE(${data.notes}, notes),
          is_default = COALESCE(${data.isDefault}, is_default)
      WHERE id = ${id}
      RETURNING *
    `);
    return result.rows[0];
  }

  async deleteTransactionTemplate(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM transaction_templates WHERE id = ${id}`);
  }

  async createCommissionEntry(data: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO commission_entries (transaction_id, agent_id, commission_rate, commission_amount, brokerage_split_percent, referral_fee_percent, expenses, notes, status, paid_date)
      VALUES (${data.transactionId}, ${data.agentId}, ${data.commissionRate ?? null}, ${data.commissionAmount ?? null}, ${data.brokerageSplitPercent ?? null}, ${data.referralFeePercent ?? null}, ${data.expenses ? JSON.stringify(data.expenses) : null}, ${data.notes || null}, ${data.status || 'pending'}, ${data.paidDate || null})
      RETURNING *
    `);
    return result.rows[0];
  }

  async getCommissionEntriesByAgent(agentId: number): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT ce.*, t.street_name, t.city, t.state, t.contract_price, t.status as transaction_status, t.closing_date,
        c.first_name as client_first_name, c.last_name as client_last_name
      FROM commission_entries ce
      JOIN transactions t ON ce.transaction_id = t.id
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE ce.agent_id = ${agentId}
      ORDER BY ce.created_at DESC
    `);
    return result.rows as any[];
  }

  async getCommissionEntry(id: number): Promise<any> {
    const result = await db.execute(sql`
      SELECT * FROM commission_entries WHERE id = ${id} LIMIT 1
    `);
    return result.rows[0] || null;
  }

  async getCommissionEntryByTransaction(transactionId: number, agentId: number): Promise<any> {
    const result = await db.execute(sql`
      SELECT * FROM commission_entries WHERE transaction_id = ${transactionId} AND agent_id = ${agentId} LIMIT 1
    `);
    return result.rows[0] || null;
  }

  async updateCommissionEntry(id: number, data: any): Promise<any> {
    const rate = data.commissionRate !== undefined ? data.commissionRate : null;
    const amount = data.commissionAmount !== undefined ? data.commissionAmount : null;
    const brokSplit = data.brokerageSplitPercent !== undefined ? data.brokerageSplitPercent : null;
    const refFee = data.referralFeePercent !== undefined ? data.referralFeePercent : null;
    const result = await db.execute(sql`
      UPDATE commission_entries
      SET commission_rate = COALESCE(${rate}, commission_rate),
          commission_amount = COALESCE(${amount}, commission_amount),
          brokerage_split_percent = COALESCE(${brokSplit}, brokerage_split_percent),
          referral_fee_percent = COALESCE(${refFee}, referral_fee_percent),
          expenses = COALESCE(${data.expenses ? JSON.stringify(data.expenses) : null}::json, expenses),
          notes = COALESCE(${data.notes}, notes),
          status = COALESCE(${data.status}, status),
          paid_date = ${data.paidDate ?? null}
      WHERE id = ${id}
      RETURNING *
    `);
    return result.rows[0];
  }

  async deleteCommissionEntry(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM commission_entries WHERE id = ${id}`);
  }

  async getCommissionSummary(agentId: number): Promise<any> {
    const result = await db.execute(sql`
      SELECT
        COUNT(*)::int as total_deals,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0)::int as total_earned,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0)::int as total_pending,
        COALESCE(AVG(commission_amount) FILTER (WHERE commission_amount > 0), 0)::int as avg_per_deal,
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW()))::int as ytd_deals,
        COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW()) AND status = 'paid' THEN commission_amount ELSE 0 END), 0)::int as ytd_earned,
        COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW()) AND status = 'pending' THEN commission_amount ELSE 0 END), 0)::int as ytd_pending
      FROM commission_entries
      WHERE agent_id = ${agentId}
    `);
    const monthlyResult = await db.execute(sql`
      SELECT
        EXTRACT(MONTH FROM created_at)::int as month,
        EXTRACT(YEAR FROM created_at)::int as year,
        COALESCE(SUM(commission_amount), 0)::int as total,
        COUNT(*)::int as deals
      FROM commission_entries
      WHERE agent_id = ${agentId} AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
      ORDER BY year, month
    `);
    return { ...result.rows[0], monthly: monthlyResult.rows };
  }

  async createOpenHouse(data: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO open_houses (agent_id, transaction_id, address, city, state, zip_code, date, start_time, end_time, notes, status, slug)
      VALUES (${data.agentId}, ${data.transactionId || null}, ${data.address}, ${data.city || null}, ${data.state || null}, ${data.zipCode || null}, ${data.date}, ${data.startTime}, ${data.endTime}, ${data.notes || null}, ${data.status || 'scheduled'}, ${data.slug})
      RETURNING *
    `);
    return result.rows[0];
  }

  async getOpenHousesByAgent(agentId: number): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT oh.*, COUNT(ohv.id)::int as visitor_count
      FROM open_houses oh
      LEFT JOIN open_house_visitors ohv ON oh.id = ohv.open_house_id
      WHERE oh.agent_id = ${agentId}
      GROUP BY oh.id
      ORDER BY oh.date DESC
    `);
    return result.rows as any[];
  }

  async getOpenHouse(id: number): Promise<any> {
    const result = await db.execute(sql`
      SELECT * FROM open_houses WHERE id = ${id} LIMIT 1
    `);
    return result.rows[0] || null;
  }

  async getOpenHouseBySlug(slug: string): Promise<any> {
    const result = await db.execute(sql`
      SELECT oh.*, u.first_name as agent_first_name, u.last_name as agent_last_name
      FROM open_houses oh
      JOIN users u ON oh.agent_id = u.id
      WHERE oh.slug = ${slug}
      LIMIT 1
    `);
    return result.rows[0] || null;
  }

  async updateOpenHouse(id: number, data: any): Promise<any> {
    const result = await db.execute(sql`
      UPDATE open_houses
      SET address = COALESCE(${data.address}, address),
          city = COALESCE(${data.city}, city),
          state = COALESCE(${data.state}, state),
          zip_code = COALESCE(${data.zipCode}, zip_code),
          date = COALESCE(${data.date}, date),
          start_time = COALESCE(${data.startTime}, start_time),
          end_time = COALESCE(${data.endTime}, end_time),
          notes = COALESCE(${data.notes}, notes),
          status = COALESCE(${data.status}, status),
          transaction_id = COALESCE(${data.transactionId}, transaction_id)
      WHERE id = ${id}
      RETURNING *
    `);
    return result.rows[0];
  }

  async deleteOpenHouse(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM open_house_visitors WHERE open_house_id = ${id}`);
    await db.execute(sql`DELETE FROM open_houses WHERE id = ${id}`);
  }

  async createOpenHouseVisitor(data: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO open_house_visitors (open_house_id, first_name, last_name, email, phone, interested_level, notes, pre_approved, working_with_agent)
      VALUES (${data.openHouseId}, ${data.firstName}, ${data.lastName || null}, ${data.email || null}, ${data.phone || null}, ${data.interestedLevel || null}, ${data.notes || null}, ${data.preApproved || false}, ${data.workingWithAgent || false})
      RETURNING *
    `);
    return result.rows[0];
  }

  async getOpenHouseVisitors(openHouseId: number): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT * FROM open_house_visitors WHERE open_house_id = ${openHouseId} ORDER BY created_at DESC
    `);
    return result.rows as any[];
  }

  async createClientReminder(data: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO client_reminders (agent_id, client_id, type, title, message, reminder_date, recurring, channels, is_active)
      VALUES (${data.agentId}, ${data.clientId}, ${data.type || 'custom'}, ${data.title}, ${data.message || null}, ${data.reminderDate}, ${data.recurring || false}, ${data.channels ? JSON.stringify(data.channels) : '["sms","email","message"]'}, ${data.isActive !== false})
      RETURNING *
    `);
    return result.rows[0];
  }

  async getClientRemindersByAgent(agentId: number): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT cr.*, c.first_name as client_first_name, c.last_name as client_last_name, c.email as client_email, c.phone as client_phone
      FROM client_reminders cr
      JOIN clients c ON cr.client_id = c.id
      WHERE cr.agent_id = ${agentId}
      ORDER BY cr.reminder_date ASC
    `);
    return result.rows as any[];
  }

  async getClientReminder(id: number): Promise<any> {
    const result = await db.execute(sql`
      SELECT * FROM client_reminders WHERE id = ${id} LIMIT 1
    `);
    return result.rows[0] || null;
  }

  async updateClientReminder(id: number, data: any): Promise<any> {
    const result = await db.execute(sql`
      UPDATE client_reminders
      SET title = COALESCE(${data.title}, title),
          message = COALESCE(${data.message}, message),
          reminder_date = COALESCE(${data.reminderDate}, reminder_date),
          recurring = COALESCE(${data.recurring}, recurring),
          channels = COALESCE(${data.channels ? JSON.stringify(data.channels) : null}::json, channels),
          is_active = COALESCE(${data.isActive}, is_active),
          type = COALESCE(${data.type}, type)
      WHERE id = ${id}
      RETURNING *
    `);
    return result.rows[0];
  }

  async deleteClientReminder(id: number): Promise<void> {
    await db.execute(sql`DELETE FROM client_reminders WHERE id = ${id}`);
  }

  async getDueReminders(): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT cr.*, c.first_name as client_first_name, c.last_name as client_last_name, c.email as client_email, c.phone as client_phone,
        u.first_name as agent_first_name, u.last_name as agent_last_name
      FROM client_reminders cr
      JOIN clients c ON cr.client_id = c.id
      JOIN users u ON cr.agent_id = u.id
      WHERE cr.is_active = true
        AND cr.reminder_date <= NOW()
        AND (cr.last_sent_at IS NULL OR cr.last_sent_at < cr.reminder_date)
      ORDER BY cr.reminder_date ASC
    `);
    return result.rows as any[];
  }

  async markReminderSent(id: number): Promise<void> {
    await db.execute(sql`
      UPDATE client_reminders SET last_sent_at = NOW() WHERE id = ${id}
    `);
  }

  async createNotification(data: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
      VALUES (${data.userId}, ${data.type}, ${data.title}, ${data.message}, ${data.relatedId || null}, ${data.relatedType || null})
      RETURNING *
    `);
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      relatedId: row.related_id,
      relatedType: row.related_type,
      read: row.read,
      createdAt: row.created_at,
    };
  }

  async getNotificationsByUser(userId: number, limit = 50, offset = 0): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT * FROM notifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      relatedId: row.related_id,
      relatedType: row.related_type,
      read: row.read,
      createdAt: row.created_at,
    }));
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ${userId} AND read = false
    `);
    return Number(result.rows[0].count);
  }

  async markNotificationRead(id: number, userId?: number): Promise<boolean> {
    const result = userId
      ? await db.execute(sql`UPDATE notifications SET read = true WHERE id = ${id} AND user_id = ${userId} RETURNING id`)
      : await db.execute(sql`UPDATE notifications SET read = true WHERE id = ${id} RETURNING id`);
    return result.rows.length > 0;
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.execute(sql`
      UPDATE notifications SET read = true WHERE user_id = ${userId} AND read = false
    `);
  }

  async createScannedDocument(doc: InsertScannedDocument): Promise<ScannedDocument> {
    const [result] = await db.insert(scannedDocuments).values(doc).returning();
    return result;
  }

  async getScannedDocuments(userId: number, transactionId?: number, clientId?: number): Promise<ScannedDocument[]> {
    const conditions = [eq(scannedDocuments.userId, userId)];
    if (transactionId) conditions.push(eq(scannedDocuments.transactionId, transactionId));
    if (clientId) conditions.push(eq(scannedDocuments.clientId, clientId));
    return db.select({
      id: scannedDocuments.id,
      userId: scannedDocuments.userId,
      transactionId: scannedDocuments.transactionId,
      clientId: scannedDocuments.clientId,
      name: scannedDocuments.name,
      category: scannedDocuments.category,
      fileData: sql<string>`''`.as('fileData'),
      mimeType: scannedDocuments.mimeType,
      fileSize: scannedDocuments.fileSize,
      notes: scannedDocuments.notes,
      createdAt: scannedDocuments.createdAt,
    }).from(scannedDocuments).where(and(...conditions)).orderBy(desc(scannedDocuments.createdAt));
  }

  async getScannedDocument(id: number): Promise<ScannedDocument | undefined> {
    const [result] = await db.select().from(scannedDocuments).where(eq(scannedDocuments.id, id));
    return result;
  }

  async deleteScannedDocument(id: number): Promise<void> {
    await db.delete(scannedDocuments).where(eq(scannedDocuments.id, id));
  }

  async createApiKey(data: InsertApiKey): Promise<ApiKey> {
    const [result] = await db.insert(apiKeys).values(data).returning();
    return result;
  }

  async getApiKeys(userId: number): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(and(eq(apiKeys.userId, userId), eq(apiKeys.isActive, true)));
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [result] = await db.select().from(apiKeys).where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)));
    return result;
  }

  async deleteApiKey(id: number, userId: number): Promise<void> {
    await db.update(apiKeys).set({ isActive: false }).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
  }

  async updateApiKeyLastUsed(id: number): Promise<void> {
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
  }

  async createWebhook(data: InsertWebhook): Promise<Webhook> {
    const [result] = await db.insert(webhooks).values(data).returning();
    return result;
  }

  async getWebhooks(userId: number): Promise<Webhook[]> {
    return await db.select().from(webhooks).where(and(eq(webhooks.userId, userId), eq(webhooks.isActive, true)));
  }

  async getWebhooksByEvent(event: string): Promise<Webhook[]> {
    return await db.select().from(webhooks).where(and(eq(webhooks.event, event), eq(webhooks.isActive, true)));
  }

  async deleteWebhook(id: number, userId: number): Promise<void> {
    await db.update(webhooks).set({ isActive: false }).where(and(eq(webhooks.id, id), eq(webhooks.userId, userId)));
  }

}

export const storage = new DatabaseStorage();