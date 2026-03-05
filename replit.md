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
- **Key Models**: Users, Transactions, Clients, Documents, Checklists, Contractors, Messages, Saved Properties, Communications, Agent Phone Numbers, Email Snippets, Email Tracking.

### Key Features
- **Contract Upload**: Extracts data from PDF contracts (e.g., purchase price, dates, contacts) using `pdf-parse` and regex. Documents are processed in-memory for privacy.
- **Document Signing Links**: Allows agents to attach external signing platform URLs (DocuSign, etc.) to documents, with Kanban-style status tracking. Only URLs are stored, not actual documents.
- **Property Search**: Integrates with RentCast API for property listings, including map-based search with Leaflet. Features caching and rate limiting.
- **Showing Requests**: Clients can request showings for saved properties, which agents view on a map.
- **Client Communications**:
    - **SMS**: Via Twilio, with agent-specific phone numbers, opt-out handling, rate limiting, and content filtering.
    - **Email**: Via agent's linked Gmail account (Google OAuth), including full inbox view, compose, reply, forward, email snippets/templates, read receipts (tracking pixel), and Gmail-like bulk actions (checkbox selection with archive, delete, mark read/unread, star, label).

## External Dependencies

- **Neon PostgreSQL**: Serverless database.
- **Twilio**: For SMS communication, handling message sending, receiving, and phone number management.
- **Google OAuth**: For agent Gmail integration, allowing agents to send and manage emails directly from their linked Gmail accounts.
- **RentCast API**: For property listing search and data.
- **iCal Generator**: For calendar event exports.
- **Leaflet & leaflet-draw**: For map-based property search and drawing functionalities.
- **pdf-parse**: For extracting text from PDF contract documents.
- **Nominatim/OSM**: For geocoding and reverse-geocoding in map features.