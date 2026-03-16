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
- **Key Models**: Users, transactions, clients, documents, checklists, contractors, messages, leads, referrals, drip campaigns, authorized_users, and specific entities for vendor, lender, broker, and homeowner functionalities.

### Key Features
- **Transaction & Document Management**: Contract and document upload with AI-powered data extraction (Gemini Flash primary, TREC regex fallback). Inspection report parsing also AI-primary with regex fallback. AI parser strips PII (SSNs, emails, phones, account numbers, license IDs, DOBs) before processing. Document signing link tracking, transaction timelines with risk alerts, client portal, transaction templates, Kanban pipelines, document scanning. WebSocket-based optimistic locking for transactions.
- **Client Management**: Client invitation, automated feedback, smart reminders, client linking.
- **HomeBase Pros (Unified Vendor/Contractor Hub)**: Public marketplace for verified vendors, agent/broker "My Team" tab for private contractors, inspection bid system, vendor self-registration.
- **Communication Tools**: Encrypted private messaging (AES-256-GCM), SMS via Twilio, email integration via Google OAuth, call logging, communication metrics dashboard, snippet management.
- **e-Signatures**: SignNow and DocuSign integrations via OAuth2 for sending and managing signing requests.
- **Team Access / Authorized Users**: Agents/brokers can add other agents/brokers with configurable permission levels, account switcher, and extended transaction access.
- **Client Portal**: Mobile-first "My Transaction" page with stage tracker, closing countdown, "Action Required" cards, key dates grid, interactive document hub, financial details, "Your Team" section, and multi-transaction support.
- **Post-Close Engagement**: "MyHome" hub for homeowners.
- **Growth & Lead Generation**: Affiliate referral system, drip campaigns, zip code-based lead generation with interactive map, Open House Manager, lead source tagging, timed exclusive lead routing, RESPA-compliant lead generation for agents and lenders. "No Leads, No Charge" guarantee.
- **Lead Metrics Dashboard**: Centralized analytics page for lead performance, including summary stats, volume trends, conversion funnel, source breakdown, and Zapier setup guide.
- **Listing & Price Alerts**: Saved search alerts with daily cron jobs checking for new listings and price changes from RentCast API, with multi-channel notifications.
- **Specialized Portals**: Lender Portal (loan pipelines, checklist sync), Broker Portal (agent oversight, sales competitions, lead routing).
- **Zapier Integration**: API key authentication, webhook triggers for key events, public REST API for data access.
- **Financial Calculators**: Mortgage, Affordability, Refinance, Rent vs Buy, Financing Guide, and Lender Comparison.
- **Billing**: Stripe integration for subscriptions and sponsored ad billing.
- **Sponsored Ads**: Ad creation with image upload, live preview, admin review, and various ad types (marketplace, sidebar, banner).
- **Admin Dashboard**: Redesigned with Recharts for analytics (users, revenue, leads, API usage), stat cards, recent signups feed, and tabbed management for users, verifications, reports, ads, financial, leads, geographic data, messages, and audit log.
- **Notifications**: Real-time SMS and Web Push for new leads, WebSocket-based in-app notifications.
- **Agent/Broker Verification**: Multi-level verification process with feature gating and history.
- **Profile Pages**: Customizable agent/broker profiles with confirmed information, bio, contact details, social media, reviews, and MLS-verified active listings auto-discovered from RentCast.
- **Verified Listings**: Auto-discovered from RentCast API, with detail pages supporting marketing materials (videos, 3D tours, floorplans, photos, descriptions).

## External Dependencies

- **Neon PostgreSQL**: Serverless database.
- **Stripe**: Payment processing and subscriptions.
- **Twilio**: SMS communication.
- **Google OAuth**: Gmail integration and authentication.
- **Google Gemini Flash (via Replit AI Integrations)**: AI-powered document parsing fallback for non-TREC real estate documents. Service: `server/ai-document-parser.ts`. PII stripped before sending. Env vars: `AI_INTEGRATIONS_GEMINI_BASE_URL`, `AI_INTEGRATIONS_GEMINI_API_KEY`.
- **RentCast API**: Property listing data.
- **iCal Generator**: Calendar event creation.
- **Leaflet & leaflet-draw**: Mapping functionalities.
- **pdf-parse**: PDF text extraction.
- **Nominatim/OSM**: Geocoding services.
- **Census Bureau ACS API**: Median home values by ZIP code.
- **@imgly/background-removal-node**: Local AI-based background removal for profile photos.
- **Dropbox API**: OAuth2-based cloud file integration for file browsing, search, and download into transaction checklists.
- **SignNow API**: OAuth2-based e-signature integration.
- **DocuSign API**: OAuth2-based e-signature integration for sending and managing signing processes.