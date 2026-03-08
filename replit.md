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