# replit.md

## Overview

Home-Base is a real estate transaction management platform designed for agents and their clients. The application provides tools for managing property transactions, client relationships, document tracking, checklists, and communication throughout the buying/selling process. It features a Kanban board for transaction workflows, client management with labels, contractor directory with reviews, and calendar/scheduling functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **UI Components**: Radix UI primitives with shadcn/ui component patterns
- **Additional UI Libraries**: Material UI for scheduler component, dnd-kit for drag-and-drop functionality
- **State Management**: React Query for server state, React hooks for local state
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: Client-side routing (wouter or similar based on the structure)
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (compiled via esbuild for production)
- **API Design**: RESTful endpoints handling CRUD operations for transactions, clients, documents, contractors, and user management
- **Authentication**: Passport.js with local strategy, session-based authentication using express-session
- **Password Security**: scrypt hashing with salts

### Data Storage
- **Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Session Storage**: MemoryStore for development (should be replaced with persistent store in production)

### Key Data Models
- **Users**: Agents and clients with role-based access
- **Transactions**: Real estate deals with status tracking, linked to clients and agents
- **Clients**: Contact management with labels, types, and status
- **Documents**: Transaction-related documents with status tracking
- **Checklists**: Buyer/seller workflow checklists with phase-based items
- **Contractors**: Service provider directory with reviews
- **Messages**: In-app messaging between users
- **Saved Properties**: User-saved property listings with URL-based address parsing

### Contract Upload Feature
- **Location**: `server/contract-parser.ts` (backend), `client/src/components/contract-upload.tsx` (frontend)
- **Purpose**: Agents upload real estate contract PDFs to extract key data (purchase price, earnest money, dates, etc.)
- **Privacy**: Documents processed in-memory only — never written to disk or persistent storage. Buffer cleared immediately after parsing.
- **Technology**: `pdf-parse` library for text extraction, regex pattern matching for field identification
- **Extracted Fields**: contractPrice, earnestMoney, optionFee, downPayment, sellerConcessions, closingDate, optionPeriodExpiration, contractExecutionDate, financing, mlsNumber, buyerName, sellerName
- **Contact Extraction**: Parses BROKER INFORMATION section to extract buyer agent, listing agent, buyer, and seller names/emails/phones/brokerages. Extracted contacts are shown in the review dialog and can be selectively added to the transaction's Contacts tab via `POST /api/contacts`.
- **TREC Form Parsing**: Uses page-based footer block extraction strategy — TREC forms rendered through DocuSign/zipForm have filled form field values in separate blocks at the end of each page (after `TXR 1601` footer line), not inline with labels.
- **Workflow**: Upload PDF → extract text → pattern match → review extracted data + contacts → agent selects fields/contacts to apply → update transaction + create contacts
- **Access**: Agents only, scoped to their own transactions
- **API Endpoint**: `POST /api/transactions/:id/parse-contract` (multipart form, field name: "contract")

### Document Signing Links
- **Location**: `client/src/components/document-checklist.tsx`
- **Purpose**: Agents can attach signing platform URLs (DocuSign, zipForms, Dotloop, etc.) to any document in the Documents tab
- **How it works**: Click a document card → select a signing platform → paste the signing URL → the document shows a link icon that opens the signing platform in a new tab
- **Status Tracking**: Agents drag document cards between Kanban columns (Not Applicable → Waiting Signatures → Signed → Waiting Others → Complete) to track signing progress
- **Privacy**: No documents are stored on the platform — only the external signing URL is saved. All signing/legal handling is done by the third-party platform
- **Database Fields**: `signing_url` and `signing_platform` columns on the `documents` table

### Build and Development
- **Development**: `npm run dev` runs tsx for hot-reloading TypeScript
- **Production Build**: Vite builds frontend to `dist/public`, esbuild bundles server to `dist/index.js`
- **Database Migrations**: `npm run db:push` using drizzle-kit

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless Postgres database accessed via `@neondatabase/serverless`
- **Connection**: Requires `DATABASE_URL` environment variable

### Authentication
- **Session Secret**: Uses `REPL_ID` environment variable in Replit environment

### Third-Party Integrations
- **Google Cloud Local Auth**: Package present for potential Google OAuth integration
- **iCal Generator**: For calendar event export functionality
- **RentCast API**: Property listing search for active sales. Uses `RENTCAST_API_KEY` env var.

### RentCast Property Search
- **Location**: `server/routes.ts` (backend endpoints), `client/src/pages/property-search-page.tsx` (frontend)
- **API Endpoints**: `GET /api/rentcast/listings` (search with filters), `GET /api/rentcast/status` (usage stats)
- **Caching**: In-memory cache with 24-hour TTL per unique search query to minimize API calls
- **Rate Limiting**: Soft limit of 45 calls/month (buffer under 50 plan limit). Counter resets monthly.
- **Filters**: city, state, zipCode, minPrice, maxPrice, bedrooms, bathrooms, propertyType, status
- **Frontend**: Tabbed UI with "Listing Search" (RentCast) and "Zillow Search" tabs. Results shown inline with property details, agent info, and "View on Zillow" links.

### Showing Request from Saved Properties
- **Location**: `client/src/pages/property-search-page.tsx` (toggle button), `client/src/pages/map-page.tsx` (map display), `server/routes.ts` (API), `server/storage.ts` (storage)
- **Purpose**: Clients can mark saved properties as "Request Showing" — these appear as gold markers on the map page for both the client and their agent
- **Database**: `showing_requested` boolean column on `saved_properties` table
- **API Endpoints**: `PATCH /api/saved-properties/:id/showing` (toggle), `GET /api/saved-properties/showing-requests` (agent view — returns all showing-requested properties from their clients)
- **Map Integration**: "Saved" filter tab on map page with geocoded markers (Nominatim/OSM), localStorage caching for coordinates
- **Workflow**: Client saves property → clicks "Request Showing" → property appears on map under "Saved" tab → agent sees it with client name attribution

### Client Communications (SMS/Email via Twilio + SendGrid)
- **Location**: `server/twilio-service.ts`, `server/sendgrid-service.ts`, `client/src/components/client-contact-dialog.tsx`, `client/src/pages/clients-page.tsx`
- **Purpose**: Agents can send SMS and email to clients directly from the platform, with all message delivery handled by third-party services (Twilio for SMS, SendGrid for email) to offload legal/compliance responsibility
- **Database**: `communications` table logs message metadata (type, status, externalId) — content is stored for history but delivery/compliance is managed by Twilio/SendGrid
- **API Endpoints**: `GET /api/communications/status` (check integration availability), `GET /api/communications/:clientId` (history), `POST /api/communications/sms` (send SMS), `POST /api/communications/email` (send email)
- **Integrations Required**: Twilio connector (SMS/voice), SendGrid connector (email) — both available as Replit integrations
- **Frontend**: Contact dialog accessible from Client Details panel → "Contact" button → tabbed dialog with SMS, Email, and History tabs
- **Privacy**: Platform only stores metadata/logs. Message delivery, opt-outs, and compliance are handled entirely by Twilio/SendGrid

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string (required)
- `REPL_ID`: Used as session secret in Replit environment
- `RENTCAST_API_KEY`: RentCast API key for property listing search
- `TWILIO_ACCOUNT_SID`: Twilio account SID (for SMS)
- `TWILIO_AUTH_TOKEN`: Twilio auth token (for SMS)
- `TWILIO_PHONE_NUMBER`: Twilio phone number to send SMS from
- `SENDGRID_API_KEY`: SendGrid API key (for email)
- `SENDGRID_FROM_EMAIL`: Email address to send from (optional, defaults to noreply@homebase.app)
- `PORT`: Server port (defaults to 3000 in development, 80 in production on Replit)
- `NODE_ENV`: Environment mode (development/production)

### Integration Notes
- **Twilio** (SMS): Connected — credentials stored as secrets (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`). SMS sending is fully operational.
- **SendGrid** (email): NOT yet connected. Email feature is built but won't send until `SENDGRID_API_KEY` is provided.