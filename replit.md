# replit.md

## Overview
Home-Base is a real estate transaction management platform designed for agents and their clients. It provides tools for managing property transactions, client relationships, document tracking, checklists, and communication. Key features include a Kanban board for transaction workflows, client management with labels, a contractor directory, and calendar/scheduling. The platform aims to streamline the buying/selling process for real estate professionals, offering features like a client portal, inspection bid system, vendor marketplace, post-close homeowner hub, lead generation for agents and vendors, and an affiliate referral program. It supports various user roles including agents, clients, vendors, and lenders, providing tailored dashboards and functionalities for each.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite)
- **Styling**: Tailwind CSS, Radix UI, shadcn/ui, Material UI (for scheduler)
- **State Management**: React Query (server state), React hooks (local state)
- **Form Handling**: React Hook Form with Zod
- **Routing**: Client-side routing
- **PWA & Mobile**: Progressive Web App with service worker, mobile bottom navigation, and biometric login (WebAuthn). Icons are configured for PWA compliance.

### Backend
- **Runtime**: Node.js with Express (TypeScript)
- **API Design**: RESTful for CRUD operations
- **Authentication**: Passport.js (local strategy, session-based)
- **Password Security**: scrypt hashing

### Data Storage
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Key Models**: Comprehensive models for users, transactions, clients, documents, checklists, contractors, messages, leads, referrals, drip campaigns, and specific entities for vendor, lender, and homeowner functionalities.

### Key Features
- **Transaction & Document Management**: Contract upload with data extraction, document signing link tracking, transaction timeline with risk alerts, and a client portal for progress visibility.
- **Vendor & Contractor Ecosystem**: Inspection bid system with PDF parsing, a vendor portal for bid management, contractor verification badges, and a "HomeBase Pros" marketplace for discovering and assembling a "MyHomeTeam."
- **Communication Tools**: SMS via Twilio with agent-specific numbers, and email integration via Google OAuth for managing Gmail communications, including templates and tracking.
- **Post-Close Engagement**: "MyHome" hub for homeowners to track properties and maintenance records.
- **Growth & Lead Generation**:
    - **Affiliate Referral System**: Unique codes for earning credits.
    - **Drip Campaigns**: Automated client nurturing with customizable sequences and variable interpolation.
    - **Zip Code Lead Generation (Agents & Vendors)**: Tiered pricing for claiming zip codes, round-robin lead assignment, public lead submission forms, and performance dashboards.
- **Specialized Portals**:
    - **Lender Portal**: Kanban board for loan pipelines, checklist synchronization with agent transactions, and RESPA compliance.
- **Billing**: Stripe integration for subscriptions and payment management, with a dedicated billing portal.
- **Encrypted Private Messaging**: 1-on-1 encrypted messaging between all users (agents, clients, vendors, lenders). Messages encrypted at rest using AES-256-GCM with server-managed keys (derived from SESSION_SECRET via scrypt). Each message gets a unique random IV. Encryption/decryption handled entirely server-side — plaintext never stored in DB. Chat UI with conversation list sidebar, real-time polling (3-5s), unread counts, and encryption badges. Start new conversations with any platform user. Auto-marks messages as read when conversation is opened. Mobile-responsive with back-navigation. Conversation list shows decrypted message previews (server decrypts before returning). Messages grouped by date (Today/Yesterday/date labels). Read receipts: single check (sent) vs double blue check (read) on own messages. Role badges shown next to sender names in chat bubbles. DB table: `private_messages` (with `encrypted` and `iv` columns). Key files: `client/src/pages/messages-page.tsx`, `server/encryption.ts`.
- **Communication Metrics Dashboard**: Toggleable stats panel on Messages page showing SMS sent (today/week/month), emails sent, private messages sent, unique contacts/recipients, and all-time totals. Filterable by contact via dropdown (default "All Contacts / Total"); email card hidden in contact-filtered view. Hourly activity bar chart (today) included. Per-contact activity chart available in individual chat views via Activity button in chat header. API: `GET /api/communications/metrics?contactId=N`. Queries `communications`, `email_tracking`, and `private_messages` tables with date-range filters. Available for agent, vendor, and lender roles. Key files: `server/storage.ts` (`getCommunicationMetrics`), `server/routes.ts`, `client/src/pages/messages-page.tsx`.
- **Dark Mode**: Toggle available in mobile More menu and on Transactions page. Persisted in `localStorage('theme')`. Pre-hydration script in `client/index.html` applies saved theme on load. Falls back to system preference if not set.
- **Lender-to-Contact Auto-Linking**: When an agent invites a lender to a transaction, the lender is automatically added as a "Lender" contact on that transaction (visible in the TransactionContacts component). Duplicate-checked by email to prevent double-adds.
- **Customizable Dashboard**: Role-aware landing page with widget-based layout. Agents see: active deals, pipeline value, client count, unread messages, deal pipeline bar, leads overview, 24h activity chart (Recharts), upcoming deadlines, recent activity feed, and quick actions. Vendors see: bid stats, leads, quick actions. Lenders see: loan pipeline stages. Clients see: transaction status, pending documents. Users can toggle widgets on/off via a Customize dialog; preferences stored in `users.dashboard_preferences` (jsonb). API: `GET /api/dashboard` (aggregated metrics), `GET/PATCH /api/dashboard/preferences`. Key files: `client/src/pages/dashboard-page.tsx`, `server/storage.ts` (`getDashboardData`), `server/routes.ts`.
- **Notifications**: Real-time SMS and Web Push notifications for new leads.

## External Dependencies

- **Neon PostgreSQL**: Serverless database solution.
- **Stripe**: Payment processing, subscription management, and billing.
- **Twilio**: SMS communication services.
- **Google OAuth**: For Gmail integration and authentication.
- **RentCast API**: Property listing data and search.
- **iCal Generator**: For creating calendar events.
- **Leaflet & leaflet-draw**: Mapping functionalities.
- **pdf-parse**: PDF text extraction.
- **Nominatim/OSM**: Geocoding services.