# replit.md

## Overview

Home-Base is a real estate transaction management platform designed for agents and their clients. It provides tools for managing property transactions, client relationships, document tracking, checklists, and communication. Key features include a Kanban board for transaction workflows, client management with labels, a contractor directory, and calendar/scheduling. The platform aims to streamline the buying/selling process for real estate professionals.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite)
- **Styling**: Tailwind CSS, Radix UI, shadcn/ui, Material UI (for scheduler)
- **State Management**: React Query (server state), React hooks (local state)
- **Form Handling**: React Hook Form with Zod
- **Routing**: Client-side routing

### Backend
- **Runtime**: Node.js with Express (TypeScript)
- **API Design**: RESTful for CRUD operations
- **Authentication**: Passport.js (local strategy, session-based)
- **Password Security**: scrypt hashing

### Data Storage
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Key Models**: Users (agent/client/vendor roles), Transactions, Clients, Documents, Checklists, Contractors, Messages, Saved Properties, Communications, Agent Phone Numbers, Email Snippets, Email Tracking, Inspection Items, Bid Requests, Bids, Home Team Members, Homeowner Homes, Home Maintenance Records, Referral Codes, Referral Credits, Drip Campaigns, Drip Steps, Drip Enrollments, Client Special Dates, Lead Zip Codes, Leads, Lead Rotations, Agent Reviews, Vendor Ratings.

### Key Features
- **Contract Upload**: Extracts data from PDF contracts (e.g., purchase price, dates, contacts) using `pdf-parse` and regex. Documents are processed in-memory for privacy.
- **Document Signing Links**: Allows agents to attach external signing platform URLs (DocuSign, etc.) to documents, with Kanban-style status tracking. Only URLs are stored, not actual documents.
- **Property Search**: Integrates with RentCast API for property listings, including map-based search with Leaflet. Features caching and rate limiting.
- **Showing Requests**: Clients can request showings for saved properties, which agents view on a map.
- **Transaction Timeline & Risk Alerts**: Analyzes transaction dates and document statuses to generate proactive deadline alerts. Color-coded risk levels (green/yellow/orange/red). Dashboard-level alert summary across all active transactions.
- **Client Portal**: Clients see a read-only "My Transaction" view with status progress, key dates, financial summary, document statuses with signing links, and timeline events.
- **Inspection Bid System**: Agents upload inspection report PDFs, which are parsed (rule-based, no AI) to extract repair items by category and severity. Agents review/edit/approve items, then send selected items to relevant vendors for competitive bids. Includes bid comparison view with accept/reject per vendor. PDFs are stored on disk (`uploads/inspections/`) with DB references (`inspection_pdfs` table). Page numbers are tracked per item and linked to an in-app PDF viewer (iframe-based).
- **Vendor Portal**: Vendors register with a dedicated role and get their own dashboard showing incoming bid requests (enriched with inspection item details, severity badges, and PDF page references), bid submission forms, profile management (with Google/Yelp/BBB verification links), and reviews. Vendors can view the relevant inspection report PDF pages directly from bid request cards.
- **Contractor Verification Badges**: Contractors display "Google Listed", "Yelp Listed", and "BBB Accredited" badges linking to their external profiles for third-party trust signals.
- **Client Communications**:
    - **SMS**: Via Twilio, with agent-specific phone numbers, opt-out handling, rate limiting, and content filtering.
    - **Email**: Via agent's linked Gmail account (Google OAuth), including full inbox view, compose, reply, forward, email snippets/templates, read receipts (tracking pixel), and Gmail-like bulk actions (checkbox selection with archive, delete, mark read/unread, star, label).
- **HomeBase Pros (Marketplace)**: A home services marketplace accessible to all authenticated users. Browse contractors by category with search, filtering, and pagination. View contractor profiles with reviews and verification badges. Add contractors to your team directly from the marketplace. Categories include plumbing, electrical, HVAC, roofing, painting, landscaping, pest control, pool maintenance, windows, and many more.
- **MyHome (Post-Close Hub)**: Homeowners track their properties after closing. Add multiple homes with purchase details. Maintain a service/maintenance log with category, description, cost, and contractor links. Quick access to marketplace and team. DB tables: `homeowner_homes`, `home_maintenance_records`.
- **MyHomeTeam**: Users assemble a team of preferred vendors for all home-related needs. Grid layout organized by service category. Add contractors from the marketplace, remove as needed. Available to all roles (agents, clients, vendors). DB table: `home_team_members`.
- **Affiliate Referral System**: Agents generate unique referral codes (`HB-{userId}-{random}`). Share via link or code. When a new agent or vendor registers with a referral code, both parties receive a pending credit for a free month. Credits only activate after the referred user adds a payment method (anti-abuse measure). Credits tracked in `referral_credits` table with status (pending/applied/expired). Referral code input field on registration form with auto-detection from URL `?ref=` parameter.
- **Drip Campaigns & Lead Nurturing**: Automated follow-up system for client nurturing. Agents create campaigns with sequenced steps (email/SMS/in-app reminder), each with configurable delays. Premade templates for "New Lead Nurture", "Post-Close Follow-Up", and "Birthday & Anniversary". Variable interpolation ({{firstName}}, {{agentName}}, etc.). Client enrollment with automatic step advancement. Special date tracking (birthdays, anniversaries, home purchase dates) with upcoming reminders. Background scheduler runs every 5 minutes to process due actions. DB tables: `drip_campaigns`, `drip_steps`, `drip_enrollments`, `client_special_dates`. Key files: `server/drip-scheduler.ts`, `client/src/pages/drip-campaigns-page.tsx`.
- **Zip Code Lead Generation**: Agents claim zip codes to receive leads from potential buyers/sellers. **Tiered pricing model**: 3 free zip codes included with Agent Plan ($49/mo), additional zips have tiered pricing starting at $10/mo and increasing by $5 for each agent already in that zip (e.g., $10, $15, $20, $25, $30). Max 5 agents per zip code. Pricing preview shows competition level and cost before claiming. Public-facing lead submission form at `/find-agent` with a 3-step wizard: Step 1 (zip + type), Step 2 (budget/timeframe/message — all optional), Step 3 (choose contact method: create a free HomeBase account for in-app messaging, or share direct contact info). Multi-step design reduces friction. Round-robin lead assignment when multiple agents cover the same zip. Agents accept/reject leads with auto-client-record creation on accept. Stats dashboard with conversion tracking. Free slots only available for zips with 3+ open spots (low competition); competitive zips always require paid tier. Free slot tracking uses `monthly_rate = 0` as source of truth. DB tables: `lead_zip_codes`, `leads`, `lead_rotations`. Key files: `client/src/pages/lead-generation-page.tsx`, `client/src/pages/lead-submit-page.tsx`.
- **Vendor Performance Ratings**: Agents rate vendors on overall quality, communication, timeliness, and value (1-5 stars each). Vendors get a performance dashboard showing aggregated metrics, recommendation rate, and individual reviews. Public performance stats visible in marketplace. Duplicate prevention per agent+contractor+transaction. DB table: `vendor_ratings`. Key files: `client/src/pages/vendor-ratings-page.tsx`.
- **Agent Reviews & Testimonials**: Clients and other users can leave star ratings (1-5) and written reviews for agents. Public agent profiles showing average rating and all reviews. "Top Agents" discovery page ranks agents by rating. Self-review prevention and ownership-based delete. DB table: `agent_reviews`. Key files: `client/src/pages/agent-reviews-page.tsx`.
- **Stripe Billing & Subscriptions**: Stripe integration for payment processing. Agent Plan ($49/mo) and Vendor Plan ($29/mo) subscription products. Stripe Checkout for subscriptions and payment method setup. Billing portal for subscription management. Stripe schema auto-managed by `stripe-replit-sync`. Webhook route registered before `express.json()`. Key files: `server/stripeClient.ts`, `server/webhookHandlers.ts`, `server/seed-products.ts`, `client/src/pages/billing-page.tsx`.

### PWA & Mobile App Experience
- **Progressive Web App**: Manifest, service worker, and meta tags configured for installability on iOS and Android. App launches in standalone mode without browser chrome.
- **Mobile Bottom Navigation**: On mobile screens (below 768px), the sidebar is hidden and replaced with a fixed bottom tab bar. Role-based tabs (4 primary + "More" drawer with remaining links). Located in `client/src/components/mobile-bottom-nav.tsx`.
- **Touch Behavior**: Tap highlight disabled, overscroll/bounce prevention, safe area handling for iPhone notch/home indicator, scoped user-select prevention on interactive elements only.
- **Service Worker**: Cache-first for static assets, network-only for API calls, SPA navigation fallback to `/` for offline deep links. Only registered in production.
- **Biometric Login (WebAuthn)**: Face ID / fingerprint authentication via Web Authentication API. Users register biometric credentials after logging in (sidebar or mobile "More" menu navigates to `/settings/biometric` page). Login page shows "Sign in with Face ID / Biometrics" button when device supports it. Session-scoped challenges with 2-minute TTL. DB table: `webauthn_credentials`. Key files: `client/src/pages/biometric-settings-page.tsx`, `client/src/components/biometric-setup.tsx`, `client/src/components/login-form.tsx`.
- **Icons**: 192x192 and 512x512 square PNG icons in `client/public/` for PWA compliance.

## External Dependencies

- **Neon PostgreSQL**: Serverless database.
- **Stripe**: Payment processing, subscription management, and billing. Handles PCI compliance. Products/prices synced to `stripe` schema via `stripe-replit-sync`.
- **Twilio**: For SMS communication, handling message sending, receiving, and phone number management.
- **Google OAuth**: For agent Gmail integration, allowing agents to send and manage emails directly from their linked Gmail accounts.
- **RentCast API**: For property listing search and data.
- **iCal Generator**: For calendar event exports.
- **Leaflet & leaflet-draw**: For map-based property search and drawing functionalities.
- **pdf-parse**: For extracting text from PDF contract documents.
- **Nominatim/OSM**: For geocoding and reverse-geocoding in map features.
