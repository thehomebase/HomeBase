# replit.md

## Overview
Home-Base is a real estate transaction management platform designed to streamline the buying/selling process for agents, clients, and other stakeholders. It offers comprehensive tools for managing property transactions, client relationships, document tracking, checklists, and communication. The platform supports various user roles (agents, clients, vendors, lenders, brokers) with tailored dashboards and functionalities, aiming to enhance efficiency and collaboration within the real estate ecosystem. Key ambitions include providing a client portal, an inspection bid system, a vendor marketplace, post-close homeowner engagement, lead generation, and an affiliate referral program.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite)
- **Styling**: Tailwind CSS, Radix UI, shadcn/ui, Material UI (for scheduler)
- **State Management**: React Query (server state), React hooks (local state)
- **Form Handling**: React Hook Form with Zod
- **Routing**: Client-side routing
- **PWA & Mobile**: Progressive Web App with service worker, mobile bottom navigation, and biometric login (WebAuthn). Dark mode is available and persisted.

### Backend
- **Runtime**: Node.js with Express (TypeScript)
- **API Design**: RESTful for CRUD operations
- **Authentication**: Passport.js (local strategy, session-based)
- **Password Security**: scrypt hashing
- **Security**: IP-based rate limiting for registration, email verification with SHA-256 hashed codes, server-side middleware for unverified users, ownership checks on client/transaction/document CRUD routes.
- **Session Storage**: PostgreSQL-backed sessions via `connect-pg-simple` (persistent across restarts).

### Data Storage
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Key Models**: Comprehensive models for users, transactions, clients, documents, checklists, contractors, messages, leads, referrals, drip campaigns, and specific entities for vendor, lender, broker, and homeowner functionalities.

### Key Features
- **Transaction & Document Management**: Contract upload with data extraction, document signing link tracking, transaction timeline with risk alerts, client portal for progress visibility, and transaction templates. Document Scanner (`/scanner`) for quick upload/categorization of physical documents (drag-and-drop, camera capture) with base64 storage, preview, download, and Gmail email-out.
- **Client Management**: Client invitation system, automated feedback requests upon transaction closure, smart reminders for anniversaries and birthdays with multi-channel delivery, and client linking (spouse/partner) with bidirectional linking and shared transaction/communication visibility. Birthday and anniversary fields on client records auto-sync from drip campaign special dates.
- **HomeBase Pros (Unified Vendor/Contractor Hub)**: Single page (`/marketplace`) merging former "Contractors" and "HomeBase Pros" pages. Card and table view toggle, category icon buttons for visual browsing, proximity/zip code search, "Add to My Team", CRUD for agents/brokers, "Trusted by X agents" and "On X teams" social proof badges, verified vendor badges, Google/Yelp/BBB links, multi-category vendor ratings (quality, communication, timeliness, value) with performance stats, inspection bid system with PDF parsing, and vendor portal for bid management. The `/contractors` route redirects to `/marketplace`.
- **Communication Tools**: Encrypted private messaging (AES-256-GCM, server-side encryption/decryption) with real-time polling, SMS via Twilio, email integration via Google OAuth, and communication metrics dashboard. Call logging functionality is also available. Dedicated Phone & SMS page (`/phone`) for sending SMS and logging calls. Gmail connect button on mail page.
- **Post-Close Engagement**: "MyHome" hub for homeowners to track properties and maintenance.
- **Growth & Lead Generation**: Affiliate referral system, drip campaigns, zip code-based lead generation with tiered pricing, Zillow-style interactive map for browsing/claiming ZIPs with market metrics and polygon highlight on click, enhanced Active ZIPs table with competition data, public lead submission forms, lead source tagging (website, open house, referral, etc.), connection rate tracking (contacted/connected timestamps), timed exclusive lead routing (15-min exclusive window before rotation to next agent), and lead source breakdown analytics on data page. Open House Manager for digital sign-ins and lead capture. Home values sourced from Census Bureau ACS API (5-year estimates, B25077_001E) with 24h cache, 5-min negative cache, and static 3-digit prefix fallback (`server/zip-home-values.ts`). API endpoints: `GET /api/leads/zip-metrics/:zipCode`, `GET /api/leads/all-zip-data`, `PATCH /api/leads/:id/contact`, `POST /api/leads/:id/rotate`.
- **Specialized Portals**:
    - **Lender Portal**: Kanban board for loan pipelines, checklist synchronization, RESPA compliance.
    - **Broker Portal**: Comprehensive management for brokerage, including agent oversight, notifications, sales competitions with leaderboards, and lead routing.
- **Billing**: Stripe integration for subscriptions and payment management with a dedicated portal.
- **Notifications**: Real-time SMS and Web Push notifications for new leads, with iOS PWA guidance. WebSocket-based in-app notification system (`/ws`) with notification bell, unread count, toast alerts, and activity feed on dashboard. Triggers: new leads, private messages, bids, transaction status changes. Server: `server/websocket.ts`, `server/notification-helper.ts`. Frontend: `use-websocket.ts`, `use-notifications.ts`, `notification-bell.tsx`.
- **Customizable Dashboard**: Role-aware, widget-based layout for agents, vendors, lenders, and clients, with user preferences stored.
- **Commission Tracker**: Per-transaction commission tracking with rates, splits, and summary dashboards.
- **Public Landing Page**: Marketing page for unauthenticated users highlighting features, roles, and pricing.
- **Onboarding Tutorial**: Interactive guided tour for new agents/brokers, auto-triggered on first login. 18-step walkthrough covering all key features with page navigation, progress tracking, and per-user completion state in localStorage. Restartable from sidebar "Tutorial" button.
- **Sidebar**: Always full-width (220px) on desktop, hidden on mobile (bottom nav). Collapsible groups: Deals & Clients, Marketing & Growth, Communication, Tools & Services. No compact/icon-only mode.

## External Dependencies

- **Neon PostgreSQL**: Serverless database.
- **Stripe**: Payment processing and subscriptions.
- **Twilio**: SMS communication.
- **Google OAuth**: Gmail integration and authentication.
- **RentCast API**: Property listing data.
- **iCal Generator**: Calendar event creation.
- **Leaflet & leaflet-draw**: Mapping functionalities.
- **pdf-parse**: PDF text extraction.
- **Nominatim/OSM**: Geocoding services.
- **Census Bureau ACS API**: Median home values by ZIP code (free, no key).