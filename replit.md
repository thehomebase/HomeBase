# replit.md

## Overview
Home-Base is a real estate transaction management platform designed to streamline the buying/selling process for agents, clients, and other stakeholders. It offers comprehensive tools for managing property transactions, client relationships, document tracking, checklists, and communication. The platform supports various user roles with tailored dashboards and functionalities, aiming to enhance efficiency and collaboration within the real estate ecosystem. Key ambitions include providing a client portal, an inspection bid system, a vendor marketplace, post-close homeowner engagement, lead generation, and an affiliate referral program.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite)
- **Styling**: Tailwind CSS, Radix UI, shadcn/ui, Material UI
- **State Management**: React Query (server state), React hooks (local state)
- **Form Handling**: React Hook Form with Zod
- **Routing**: Client-side routing
- **PWA & Mobile**: Progressive Web App with service worker, mobile navigation, and biometric login (WebAuthn). Dark mode is available.
- **UI/UX**: Customizable role-aware dashboards with widgets, interactive onboarding tutorial, always-full-width sidebar on desktop, unified Settings page with sub-sections, profile photo thumbnail with name/role in sidebar footer.

### Backend
- **Runtime**: Node.js with Express (TypeScript)
- **API Design**: RESTful for CRUD operations
- **Authentication**: Passport.js (local strategy, session-based)
- **Security**: Tiered IP-based rate limiting, email verification, ownership checks on all transaction-bound CRUD routes, scrypt password hashing, reCAPTCHA v3 on login/register, optional TOTP MFA, CSRF double-submit cookie protection, mass assignment prevention, file upload magic byte validation, sanitized error messages, tightened DOMPurify config.
- **Session Storage**: PostgreSQL-backed sessions.

### Data Storage
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Key Models**: Users, transactions (with buyer_agent_compensation and home_warranty fields), clients, documents, checklists, contractors, messages, leads, referrals, drip campaigns, authorized_users, and specific entities for vendor, lender, broker, and homeowner functionalities.

### Key Features
- **Transaction & Document Management**: Contract and document upload with AI-powered data extraction (Gemini Flash primary, TREC regex fallback). PDFs are sent directly to Gemini for multimodal analysis (text + layout + images). Inspection report parsing also AI-primary with regex fallback; AI detects photos of deficiencies and marks items with `hasPhoto`. Document signing link tracking, transaction timelines with risk alerts, client portal, transaction templates, Kanban pipelines, document scanning. WebSocket-based optimistic locking for transactions.
- **Client Management**: Client invitation, automated feedback with agent-controlled review requests (toggle per transaction), smart reminders, client linking. Opt-in client transaction status notifications with per-channel control (in-app, email, SMS, push). Table: `client_notification_preferences`. API: `GET/PUT /api/client-notification-preferences`. UI: Settings > Notifications (client role only).
- **HomeBase Pros (Unified Vendor/Contractor Hub)**: Public marketplace for verified vendors, "My Team" page for all users with private contractor management, inspection bid system, vendor self-registration. Any user can add their own vendors via the "Add Vendor" form on their My Team page — these are private and only visible to the creator. Private contractor cards show an "Invite to HomeBase" CTA that generates a unique invite token (`vendor_invite_tokens` table). For agents/brokers, the invite link is backend-linked to their referral code via an `hb_referral` cookie (30-day expiry) — when the invited vendor signs up, the referrer automatically gets credit. Non-agent/broker users get a plain invite link without referral tracking. Invite landing page: `/invite/:token`. Vendor-to-private-contractor matching: when a vendor registers, the system checks for matching private contractors and home team members across ALL user types (agents, homeowners, clients) by email, phone (10-digit), or fuzzy business name and notifies them with a sync prompt. Users can accept/dismiss via `/vendor-sync/:id` page. Syncing adds the vendor to the user's home team, automatically boosting the vendor's "On X teams" reputation count in the marketplace. After syncing, users are prompted to leave a star rating (1-5) and written review that appears on the vendor's marketplace profile.
- **Communication Tools**: Encrypted private messaging (AES-256-GCM), SMS via Twilio, email integration via Google OAuth, call logging, communication metrics dashboard, snippet management.
- **e-Signatures**: Firma (embedded, built-in signing), SignNow and DocuSign integrations via OAuth2 for sending and managing signing requests. Firma is the primary embedded option — no user accounts needed; signing happens inside the app. Transaction detail page has a "Signatures" tab powered by Firma.
- **Forms Library**: Template system for agents/brokers to upload, organize, and reuse PDF forms. Supports categories (contract, addendum, disclosure, etc.), US state tagging, broker sharing, and direct integration with Firma signing. Visual field placement editor lets users drag-and-drop signature/text/date/checkbox/initials fields onto PDF pages with role-based assignment (Buyer, Seller, Agent, Co-Agent). "Use for Signing" flow auto-fills recipients from linked transaction data. Table: `form_templates`. Page: `/forms-library`. Components: `client/src/pages/forms-library-page.tsx`, `client/src/components/template-field-editor.tsx`.
- **Team Access / Authorized Users**: Agents/brokers can add other agents/brokers with configurable permission levels, account switcher, and extended transaction access.
- **Client Portal**: Mobile-first "My Transaction" page with stage tracker, closing countdown, "Action Required" cards, key dates grid, interactive document hub, financial details, "Your Team" section, and multi-transaction support.
- **Post-Close Engagement**: "MyHome" hub for homeowners with tab-based navigation: Overview (maintenance history), Home Expense Tracker (recurring costs by category with monthly totals), Maintenance Reminders (seasonal checklists, overdue/upcoming views, push/SMS notifications, auto-advancing recurring schedules), Equity Tracker (amortization calculator, Freddie Mac PMMS rate feed, refinance opportunity alerts, HELOC estimates, on-demand RentCast property valuation), Market Insights (Census ZIP median + RentCast property estimate), Warranty Tracker (expiration alerts), Home Improvements log (project tracking with materials/costs), and Dropbox Document Vault integration. **AI Receipt/Invoice Scanner**: each tab (Expenses, Warranty, Projects, Overview) has a "Scan" button — users photograph or upload a receipt/invoice/bill, Gemini Flash extracts vendor info, amounts, dates, categories, warranty details, and pre-fills the relevant form. If a vendor is detected, prompts user to find them in the HomeBase Pros marketplace to add to their team. API: `POST /api/my-homes/:id/scan-receipt`. Parser: `server/ai-document-parser.ts` (`parseHomeReceiptWithAI`). Tables: `home_expenses`, `home_maintenance_reminders`, `home_equity_profiles`, `home_warranty_items`, `home_improvements`. Routes namespaced as `/api/my-homes/:id/*` and `/api/home-reminders/:id` (to avoid conflict with client reminders at `/api/reminders/:id`).
- **Growth & Lead Generation**: Affiliate referral system, drip campaigns, zip code-based lead generation with interactive map, Open House Manager, lead source tagging, timed exclusive lead routing, RESPA-compliant lead generation for agents and lenders. "No Leads, No Charge" guarantee. Agents must have license info + payment-verified identity (Stripe cardholder name match) before claiming zip codes. Lenders must have payment-verified identity.
- **Lead Metrics Dashboard**: Centralized analytics page for lead performance, including summary stats, volume trends, conversion funnel, source breakdown, and Zapier setup guide.
- **Listing & Price Alerts**: Saved search alerts with daily cron jobs checking for new listings and price changes from RentCast API, with multi-channel notifications.
- **Specialized Portals**: Lender Portal (loan pipelines, checklist sync), Broker Portal (agent oversight, sales competitions, lead routing).
- **Zapier Integration**: API key authentication, webhook triggers for key events, public REST API for data access.
- **Financial Calculators**: Mortgage, Affordability, Refinance, Rent vs Buy, Financing Guide, and Lender Comparison. Mortgage and Affordability calculators include CTAs linking to the lender comparison page.
- **Lender Estimate Comparison**: Buyers request loan estimates by property details (price, down payment, loan type, credit range, zip code). Lenders in matching service areas receive requests and submit standardized estimates. Weighted ranking algorithm (subscription_tier 25%, response_rate 25%, avg_rating 25%, recency 25%). Side-by-side comparison with 5yr/7yr total cost calculations. Manual entry for outside lenders. RESPA-compliant (subscription fee, not per-referral). Tables: `lender_service_areas`, `estimate_requests`, `lender_estimates`, `lender_ranking_stats`, `lender_estimate_ratings`. Page: `/compare-lenders`. Lender UI: "Estimate Requests" tab in Lender Portal. CTA on client portal and calculators.
- **Billing**: Stripe integration for subscriptions and sponsored ad billing. 7-day free trial via Stripe's native `trial_period_days` on first checkout (credit card required upfront, auto-converts after 7 days). Local `trial_ends_at` fallback on users table. Trial status shown on billing and settings pages. Feature gating recognizes both Stripe `trialing` status and local trial.
- **Sponsored Ads**: Ad creation with image upload, live preview, admin review, and various ad types (marketplace, sidebar, banner).
- **Admin Dashboard**: Redesigned with Recharts for analytics (users, revenue, leads, API usage), stat cards, recent signups feed, and tabbed management for users, verifications, reports, ads, financial, leads, geographic data, messages, and audit log.
- **Notifications**: Real-time SMS and Web Push for new leads, WebSocket-based in-app notifications.
- **Agent/Broker Verification**: Multi-level verification process with feature gating and history.
- **Profile Pages**: Customizable agent/broker profiles with confirmed information, bio, contact details, social media, reviews, MLS-verified active listings auto-discovered from RentCast, service areas (derived from transaction history), and a contact form for non-owners. Schema.org JSON-LD structured data (`RealEstateAgent`/`Person`) injected for SEO.
- **SEO Schema Markup**: `client/src/lib/schema-markup.tsx` provides reusable hooks (`useAgentProfileSchema`, `useVendorSchema`, `useSchemaMarkup`) that inject JSON-LD structured data into the page head. Profile pages emit `RealEstateAgent` (or `Person`+`FinancialService` for lenders) with ratings, credentials, service areas. Marketplace vendor detail emits category-mapped `LocalBusiness` subtypes (Plumber, Electrician, RoofingContractor, etc.) with address, ratings, and external links.
- **FAQ & Contact Page**: Combined page at `/faq` and `/contact` with categorized FAQs, CRM comparison table, and platform contact form. Inquiries stored in `platform_inquiries` table with admin notification.
- **Verified Listings**: Auto-discovered from RentCast API, with detail pages supporting marketing materials (videos, 3D tours, floorplans, photos, descriptions).

## External Dependencies

- **Neon PostgreSQL**: Serverless database.
- **Stripe**: Payment processing and subscriptions.
- **Twilio**: SMS communication and SMS-based account verification. Service: `server/twilio-service.ts`. Env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
- **SendGrid**: Transactional email (welcome emails after account verification). Service: `server/email-service.ts`. Env vars: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`.
- **Google OAuth**: Gmail integration and authentication.
- **Google Gemini Flash (via Replit AI Integrations)**: AI-powered document parsing fallback for non-TREC real estate documents. Service: `server/ai-document-parser.ts`. PII stripped before sending. Env vars: `AI_INTEGRATIONS_GEMINI_BASE_URL`, `AI_INTEGRATIONS_GEMINI_API_KEY`.
- **RentCast API**: Property listing data. Database-backed cache (`rentcast_cache` table) with 24h TTL for listings and 72h TTL for property details. Shared cache service (`server/rentcast-cache.ts`) used by both API routes and listing alert scheduler. In-memory cache layer on top for hot reads (capped at remaining DB TTL or 2h).
- **iCal Generator**: Calendar event creation.
- **Leaflet & leaflet-draw**: Mapping functionalities.
- **pdf-parse**: PDF text extraction.
- **Nominatim/OSM**: Geocoding services.
- **Census Bureau ACS API**: Median home values by ZIP code.
- **@imgly/background-removal-node**: Local AI-based background removal for profile photos.
- **Dropbox API**: OAuth2-based cloud file integration for file browsing, search, and download into transaction checklists.
- **Firma API**: Embedded e-signature API (pay-per-envelope). Service: `server/firma-service.ts`. Component: `client/src/components/firma-editor.tsx`. Env vars: `FIRMA_API_KEY`. Editor JS loaded from `api.firma.dev`. JWT-based embedded editor for signing request creation and management.
- **SignNow API**: OAuth2-based e-signature integration.
- **DocuSign API**: OAuth2-based e-signature integration for sending and managing signing processes.