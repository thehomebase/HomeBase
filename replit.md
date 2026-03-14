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
- **UI/UX**: Customizable role-aware dashboards with widgets, Omostate-inspired profile pages, interactive onboarding tutorial, always-full-width sidebar on desktop, unified Settings page (`/settings`) with sub-sections (Profile, Security, Billing, API Keys & Integrations, Notifications), profile photo thumbnail with name/role in sidebar footer.

### Backend
- **Runtime**: Node.js with Express (TypeScript)
- **API Design**: RESTful for CRUD operations
- **Authentication**: Passport.js (local strategy, session-based)
- **Security**: Tiered IP-based rate limiting (general API: 120/min, auth: 15/15min, RentCast: 5/min, sensitive APIs: 30/min), email verification, ownership checks via `verifyTransactionAccess()` on all transaction-bound CRUD routes (checklists, documents, contacts, messages, calendar), scrypt password hashing, reCAPTCHA v3 on login/register (action-bound, fail-closed, `RECAPTCHA_SECRET_KEY` + `VITE_RECAPTCHA_SITE_KEY`), optional TOTP MFA via authenticator app (`otplib`/`qrcode` — setup/verify/disable routes at `/api/mfa/*`, 5-attempt brute-force limit per MFA token), CSRF double-submit cookie protection (`cookie-parser`, `X-CSRF-Token` header, global fetch interceptor), mass assignment prevention (field whitelists on all PATCH/POST endpoints for clients, contacts, transactions), file upload magic byte validation (PNG/JPEG/GIF/WebP/Excel), sanitized error messages (no `error.message`/stack traces in API responses), tightened DOMPurify config (FORBID_ATTR for event handlers, ALLOW_UNKNOWN_PROTOCOLS=false).
- **Session Storage**: PostgreSQL-backed sessions.

### Data Storage
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Key Models**: Users, transactions, clients, documents, checklists, contractors, messages, leads, referrals, drip campaigns, and specific entities for vendor, lender, broker, and homeowner functionalities.

### Key Features
- **Transaction & Document Management**: Contract upload with data extraction, document signing link tracking, transaction timelines with risk alerts, client portal, transaction templates, Kanban pipelines for buyers and sellers, document scanning.
- **Client Management**: Client invitation, automated feedback, smart reminders (anniversaries/birthdays), client linking.
- **HomeBase Pros (Unified Vendor/Contractor Hub)**: Public marketplace shows only verified vendor profiles (those with `vendorUserId`). Agents/brokers have a "My Team" tab for privately-added contractors with edit/delete/invite capabilities. Invite flow generates referral links for vendors to sign up. Marketplace features: search, proximity search, category filters, team management, ratings, inspection bid system, and vendor self-registration with agent team request functionality.
- **Communication Tools**: Encrypted private messaging (AES-256-GCM), SMS via Twilio, email integration via Google OAuth, call logging, communication metrics dashboard, and snippet management.
- **e-Signatures**: SignNow and DocuSign integrations via OAuth2 — agents/brokers connect their own accounts to upload documents and send signing invites from the document checklist. Settings page cards for connect/disconnect. Routes role-gated to agent/broker. Audit logging for all actions.
- **Post-Close Engagement**: "MyHome" hub for homeowners.
- **Growth & Lead Generation**: Affiliate referral system, drip campaigns, zip code-based lead generation with interactive map, Open House Manager, lead source tagging, connection rate tracking, timed exclusive lead routing, RESPA-compliant lead generation for agents (spend-based share of voice, min $25/mo) and lenders (occupancy-tiered pricing: 1-2 free, 3@$25, 4@$50, 5@$100 per zip). Lead activity preview (30/60/90 day counts) shown before claiming zip codes. "No Leads, No Charge" guarantee: agents, lenders, and vendors are not charged for billing cycles with zero leads.
- **Lead Metrics Dashboard** (`/lead-metrics`): Centralized analytics page for lead performance across all sources. Includes summary stat cards (total leads, this month, acceptance rate, avg response time), 12-month volume trend chart, conversion funnel visualization, leads-by-source pie chart, source performance breakdown table (conversion rate + avg response per source), monthly conversions bar chart, and lead status overview. Features an expandable Zapier setup guide with step-by-step instructions, webhook endpoint, API key header, JSON body schema, and popular integration quick-links. Styled to match the Data page aesthetic. Backend: `GET /api/leads/metrics`.
- **Listing & Price Alerts**: Saved search alerts with daily cron jobs checking for new listings and price changes from RentCast API, with multi-channel notifications.
- **Specialized Portals**: Lender Portal (loan pipelines, checklist sync), Broker Portal (agent oversight, sales competitions, lead routing).
- **Zapier Integration**: API key authentication, webhook triggers for key events, public REST API for data access.
- **Financial Calculators**: Mortgage, Affordability, Refinance, Rent vs Buy, Financing Guide, and Lender Comparison with profile management and email results functionality.
- **Billing**: Stripe integration for subscriptions.
- **Notifications**: Real-time SMS and Web Push for new leads, WebSocket-based in-app notifications (bell, unread count, toasts, activity feed).
- **Agent/Broker Verification**: Multi-level verification process (license, Stripe name cross-check, manual broker/admin verification) with feature gating and verification history.
- **Profile Pages**: Customizable agent/broker profiles with confirmed information, bio, contact details, social media, reviews, and MLS-verified active listings auto-discovered from RentCast.
- **Verified Listings**: Auto-discovered from RentCast API by fuzzy-matching the listing agent name against the verified agent's name. Listings refresh when a user visits the profile (24hr cache). Each verified listing has its own detail page (`/listing/:id`) with marketing material support: YouTube video tours, Matterport 3D tours, PDF floorplans, agent-uploaded photos, and custom descriptions. Report button for flagging inappropriate listings. DB tables: `verified_listings`, `listing_marketing`, `listing_marketing_photos`, `listing_reports`. Documents table has `manually_moved` flag to prevent DocuSign sync from overriding manual drag-and-drop status changes.

## External Dependencies

- **Neon PostgreSQL**: Serverless database.
- **Stripe**: Payment processing and subscriptions.
- **Twilio**: SMS communication.
- **Google OAuth**: Gmail integration and authentication.
- **RentCast API**: Property listing data. **Development safety**: All live RentCast API calls are automatically blocked in development mode (non-production). Existing cached/DB data is returned instead. Set env var `RENTCAST_ALLOW_DEV=true` to temporarily allow live calls during development. In production, calls are allowed normally with a monthly cap of 45.
- **iCal Generator**: Calendar event creation.
- **Leaflet & leaflet-draw**: Mapping functionalities.
- **pdf-parse**: PDF text extraction.
- **Nominatim/OSM**: Geocoding services.
- **Census Bureau ACS API**: Median home values by ZIP code.
- **@imgly/background-removal-node**: Local AI-based background removal for profile photos.
- **Dropbox API**: OAuth2-based cloud file integration (DROPBOX_APP_KEY, DROPBOX_APP_SECRET env vars). Service: `server/dropbox-service.ts`. DB table: `dropbox_tokens`. Per-user OAuth2 connection with token refresh. File browsing, search, and download. Files can be imported into transaction document checklists from a file browser in the document checklist. Settings page card for connect/disconnect. Frontend: `DropboxFileBrowser` component in `document-checklist.tsx`.
- **SignNow API**: OAuth2-based e-signature integration (SIGNNOW_CLIENT_ID, SIGNNOW_CLIENT_SECRET env vars). Service: `server/signnow-service.ts`.
- **DocuSign API**: OAuth2-based e-signature integration (DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_SECRET_KEY env vars, plus DOCUSIGN_USER_ID, DOCUSIGN_ACCOUNT_ID, DOCUSIGN_BASE_URL). Service: `server/docusign-service.ts`. DB table: `docusign_tokens`. Audit reuses `signnow_audit_log` with `docusign_` action prefix. Supports embedded sending (draft envelope + sender view URL) for full document preparation in DocuSign's editor, plus quick send with auto-placed signature fields. Documents table has `docusign_envelope_id` column; send/prepare routes auto-update documents with envelope ID, signing URL, and advance status to `waiting_signatures`. Status sync endpoint (`POST /api/docusign/sync-status`) polls DocuSign for envelope completion and auto-advances documents to `signed`.