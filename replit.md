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
- **Frontend**: Tabbed UI with "Text Search" and "Map Search" tabs. Text search uses city/state/ZIP input. Map Search allows drawing a polygon/rectangle on a Leaflet map to search for listings within a custom area.
- **Map Draw Search**: `client/src/components/map-draw-search.tsx` — uses Leaflet + leaflet-draw for polygon/rectangle drawing tools. Reverse-geocodes sample points within the drawn area via Nominatim to discover ZIP codes, then queries RentCast for each ZIP code. Results are filtered client-side using point-in-polygon algorithm to only show listings within the drawn boundary. Listings appear as map markers with popups and in a scrollable list below. Includes price/beds/type filters and save-to-favorites functionality.
- **Dependencies**: `leaflet-draw`, `@types/leaflet-draw`

### Showing Request from Saved Properties
- **Location**: `client/src/pages/property-search-page.tsx` (toggle button), `client/src/pages/map-page.tsx` (map display), `server/routes.ts` (API), `server/storage.ts` (storage)
- **Purpose**: Clients can mark saved properties as "Request Showing" — these appear as gold markers on the map page for both the client and their agent
- **Database**: `showing_requested` boolean column on `saved_properties` table
- **API Endpoints**: `PATCH /api/saved-properties/:id/showing` (toggle), `GET /api/saved-properties/showing-requests` (agent view — returns all showing-requested properties from their clients)
- **Map Integration**: "Saved" filter tab on map page with geocoded markers (Nominatim/OSM), localStorage caching for coordinates
- **Workflow**: Client saves property → clicks "Request Showing" → property appears on map under "Saved" tab → agent sees it with client name attribution

### Client Communications (SMS via Twilio + Email via Gmail OAuth)
- **Location**: `server/twilio-service.ts`, `server/gmail-service.ts`, `client/src/components/client-contact-dialog.tsx`, `client/src/pages/clients-page.tsx`
- **Purpose**: Agents can send SMS and email to clients directly from the platform. SMS goes through the platform's Twilio account (shared). Email goes through each agent's own linked Gmail account via Google OAuth.
- **Database**: `communications` table logs message metadata (type, status, externalId). `google_tokens` table stores per-agent OAuth tokens (access_token, refresh_token, token_expiry, linked email). `sms_opt_outs` table stores phone numbers that have opted out via STOP keyword.
- **SMS Model**: Platform-level Twilio account — agents can request a dedicated phone number (auto-purchased via Twilio API), limited to one per agent. If no dedicated number, falls back to the platform's default number. Numbers are purchased and released via the Twilio API through the platform's account.
- **Agent Phone Numbers**: `agent_phone_numbers` table tracks purchased numbers (user_id UNIQUE, phone_number, twilio_sid, area_code, friendly_name). API endpoints: `GET /api/phone-number` (get assigned number), `GET /api/phone-number/search?areaCode=` (search available), `POST /api/phone-number/purchase` (buy and assign), `POST /api/phone-number/release` (release back to Twilio).
- **SMS Compliance & Safety**:
  - **Opt-out handling**: When a recipient replies STOP/UNSUBSCRIBE/CANCEL/END/QUIT, their number is added to the opt-out list. Agents cannot send SMS to opted-out numbers. Replying START/YES/UNSTOP re-subscribes.
  - **Rate limiting**: 200 messages per agent per day, 50 unique recipients per agent per day. Agents can still message contacts they've already texted today even after hitting the unique recipient limit.
  - **Content filtering**: Messages are scanned for threatening/dangerous language before sending. Blocked messages show an error.
  - **Blocked numbers**: Emergency numbers (911, etc.) and short codes cannot be messaged.
  - **Webhook**: `POST /api/twilio/webhook` receives incoming SMS from Twilio, processes opt-out/opt-in keywords automatically. Validates request signatures using platform auth token.
  - **Frontend**: SMS tab shows compose form with daily usage counters (messages sent / limit, unique contacts / limit). Shows unavailable message if Twilio env vars are not set.
- **API Endpoints**:
  - `GET /api/communications/status` — check Twilio + Gmail connection status
  - `GET /api/communications/:clientId` — platform activity history
  - `POST /api/communications/sms` — send SMS via platform Twilio (checks opt-out + rate limits)
  - `POST /api/communications/email` — send email via agent's Gmail
  - `GET /api/sms/limits` — get current agent's daily SMS usage and limits
  - `POST /api/twilio/webhook` — Twilio incoming SMS webhook (handles STOP/START)
  - `GET /api/gmail/auth-url` — get Google OAuth consent URL
  - `GET /api/gmail/callback` — handle OAuth callback, store tokens
  - `POST /api/gmail/disconnect` — remove linked Gmail
  - `GET /api/gmail/messages/:clientId` — fetch Gmail conversation history with a client
- **Gmail OAuth Flow**: Agent clicks "Connect Gmail" → redirected to Google consent → tokens stored → emails sent from agent's own address
- **Frontend**: Contact dialog with SMS, Email (Gmail), and History tabs. History shows both platform activity logs and real Gmail conversation threads.
- **Mail Page**: Dedicated sidebar page (`/mail`) showing agent's full Gmail inbox with pagination (25 per page), search, sent/received filters, and click-to-read full email content. Uses DOMPurify for safe HTML rendering. Includes compose, reply, and forward functionality — agents can send emails to anyone directly from the platform. API: `GET /api/gmail/inbox` (paginated list), `GET /api/gmail/message/:messageId` (full message detail with HTML body), `POST /api/gmail/send` (compose/send with To, Cc, Subject, Body).
- **Privacy**: SMS delivery handled by platform Twilio account. Emails sent through agent's own Gmail — platform only stores metadata logs, not message content.

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string (required)
- `REPL_ID`: Used as session secret in Replit environment
- `RENTCAST_API_KEY`: RentCast API key for property listing search
- `TWILIO_ACCOUNT_SID`: Twilio account SID (for SMS)
- `TWILIO_AUTH_TOKEN`: Twilio auth token (for SMS)
- `TWILIO_PHONE_NUMBER`: Twilio phone number to send SMS from
- `GOOGLE_CLIENT_ID`: Google OAuth client ID (for Gmail integration)
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret (for Gmail integration)
- `PORT`: Server port (defaults to 3000 in development, 80 in production on Replit)
- `NODE_ENV`: Environment mode (development/production)

### Integration Notes
- **Twilio** (SMS): Connected — credentials stored as secrets (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`). SMS sending is fully operational.
- **Gmail** (email): Connected — Google OAuth credentials stored as secrets (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). Each agent links their own Gmail account. While the Google Cloud project is in "Testing" mode, agent Gmail addresses must be added as test users in the Google Cloud Console consent screen settings.
- **SendGrid**: Removed — replaced by Gmail OAuth for agent-level email.