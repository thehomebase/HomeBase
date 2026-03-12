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
- **UI/UX**: Customizable role-aware dashboards with widgets, Omostate-inspired profile pages, interactive onboarding tutorial, always-full-width sidebar on desktop.

### Backend
- **Runtime**: Node.js with Express (TypeScript)
- **API Design**: RESTful for CRUD operations
- **Authentication**: Passport.js (local strategy, session-based)
- **Security**: IP-based rate limiting, email verification, ownership checks, scrypt password hashing.
- **Session Storage**: PostgreSQL-backed sessions.

### Data Storage
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Key Models**: Users, transactions, clients, documents, checklists, contractors, messages, leads, referrals, drip campaigns, and specific entities for vendor, lender, broker, and homeowner functionalities.

### Key Features
- **Transaction & Document Management**: Contract upload with data extraction, document signing link tracking, transaction timelines with risk alerts, client portal, transaction templates, Kanban pipelines for buyers and sellers, document scanning.
- **Client Management**: Client invitation, automated feedback, smart reminders (anniversaries/birthdays), client linking.
- **HomeBase Pros (Unified Vendor/Contractor Hub)**: Centralized marketplace for vendors with search, team management, ratings, inspection bid system, and vendor self-registration with agent team request functionality.
- **Communication Tools**: Encrypted private messaging (AES-256-GCM), SMS via Twilio, email integration via Google OAuth, call logging, communication metrics dashboard, and snippet management.
- **Post-Close Engagement**: "MyHome" hub for homeowners.
- **Growth & Lead Generation**: Affiliate referral system, drip campaigns, zip code-based lead generation with interactive map, Open House Manager, lead source tagging, connection rate tracking, timed exclusive lead routing, RESPA-compliant lead generation for agents (spend-based share of voice, min $25/mo) and lenders (occupancy-tiered pricing: 1-2 free, 3@$25, 4@$50, 5@$100 per zip).
- **Listing & Price Alerts**: Saved search alerts with daily cron jobs checking for new listings and price changes from RentCast API, with multi-channel notifications.
- **Specialized Portals**: Lender Portal (loan pipelines, checklist sync), Broker Portal (agent oversight, sales competitions, lead routing).
- **Zapier Integration**: API key authentication, webhook triggers for key events, public REST API for data access.
- **Financial Calculators**: Mortgage, Affordability, Refinance, Rent vs Buy, Financing Guide, and Lender Comparison with profile management and email results functionality.
- **Billing**: Stripe integration for subscriptions.
- **Notifications**: Real-time SMS and Web Push for new leads, WebSocket-based in-app notifications (bell, unread count, toasts, activity feed).
- **Agent/Broker Verification**: Multi-level verification process (license, Stripe name cross-check, manual broker/admin verification) with feature gating and verification history.
- **Profile Pages**: Customizable agent/broker profiles with confirmed information, bio, contact details, social media, reviews, and active listings with photo management.

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
- **Census Bureau ACS API**: Median home values by ZIP code.
- **@imgly/background-removal-node**: Local AI-based background removal for profile photos.