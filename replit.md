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
- **Key Models**: Users (agent/client/vendor roles), Transactions, Clients, Documents, Checklists, Contractors, Messages, Saved Properties, Communications, Agent Phone Numbers, Email Snippets, Email Tracking, Inspection Items, Bid Requests, Bids, Home Team Members, Homeowner Homes, Home Maintenance Records, Referral Codes, Referral Credits.

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
- **Affiliate Referral System**: Agents generate unique referral codes (`HB-{userId}-{random}`). Share via link or code. When a new agent registers with a referral code, both the referrer and referred agent receive a pending credit for a free month. Credits tracked in `referral_credits` table with status (pending/applied/expired). Referral code input field on registration form with auto-detection from URL `?ref=` parameter.

## External Dependencies

- **Neon PostgreSQL**: Serverless database.
- **Twilio**: For SMS communication, handling message sending, receiving, and phone number management.
- **Google OAuth**: For agent Gmail integration, allowing agents to send and manage emails directly from their linked Gmail accounts.
- **RentCast API**: For property listing search and data.
- **iCal Generator**: For calendar event exports.
- **Leaflet & leaflet-draw**: For map-based property search and drawing functionalities.
- **pdf-parse**: For extracting text from PDF contract documents.
- **Nominatim/OSM**: For geocoding and reverse-geocoding in map features.
