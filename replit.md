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
- **Workflow**: Upload PDF → extract text → pattern match → review extracted data → agent selects fields to apply → update transaction
- **Access**: Agents only, scoped to their own transactions
- **API Endpoint**: `POST /api/transactions/:id/parse-contract` (multipart form, field name: "contract")

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

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string (required)
- `REPL_ID`: Used as session secret in Replit environment
- `PORT`: Server port (defaults to 3000 in development, 80 in production on Replit)
- `NODE_ENV`: Environment mode (development/production)