# replit.md

## Overview
Home-Base is a real estate transaction management platform designed to streamline the buying/selling process for agents, clients, and other stakeholders. It offers tools for managing property transactions, client relationships, document tracking, checklists, and communication, aiming to enhance efficiency and collaboration. Future ambitions include a client portal, inspection bid system, vendor marketplace, post-close homeowner engagement, lead generation, and an affiliate referral program.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite)
- **Styling**: Tailwind CSS, Radix UI, shadcn/ui, Material UI
- **State Management**: React Query (server state), React hooks (local state)
- **Form Handling**: React Hook Form with Zod
- **UI/UX**: Customizable role-aware dashboards, interactive onboarding, always-full-width desktop sidebar, unified settings, PWA with mobile navigation and biometric login, dark mode.

### Backend
- **Runtime**: Node.js with Express (TypeScript)
- **API Design**: RESTful
- **Authentication**: Passport.js (local, session-based)
- **Security**: Tiered IP-based rate limiting, email verification, ownership checks, scrypt hashing, reCAPTCHA v3, optional TOTP MFA, CSRF protection, mass assignment prevention, file upload validation, sanitized errors, tightened DOMPurify, account lockout (5 failures → 15 min lock), encrypted API tokens at rest (AES-256-GCM for Google/SignNow tokens), masked PII in logs.
- **Session Storage**: PostgreSQL-backed sessions.

### Data Storage
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Key Models**: Users, transactions, clients, documents, checklists, contractors, messages, leads, referrals, drip campaigns, authorized_users, and specialized entities for vendor, lender, broker, homeowner functionalities.

### Key Features
- **Transaction & Document Management**: AI-powered data extraction from PDFs (Gemini Flash, TREC regex fallback) for contracts and inspection reports, document signing link tracking, transaction timelines with risk alerts, client portal, templates, Kanban pipelines, document scanning, WebSocket-based optimistic locking. Exhibit A document generator with smart page cropping for repair requests.
- **Client Management**: Client invitation, automated feedback with agent-controlled review requests, smart reminders, client linking, opt-in transaction status notifications (in-app, email, SMS, push).
- **HomeBase Pros (Unified Vendor/Contractor Hub)**: Public marketplace for verified vendors, private contractor management, inspection bid system, vendor self-registration, referral-linked invites, and vendor-to-user matching with sync prompts and rating/review system.
- **Communication Tools**: Encrypted private messaging, SMS via Twilio, Google OAuth email integration, call logging, communication metrics, snippet management.
- **e-Signatures**: Embedded Firma (built-in signing), and integrations with SignNow and DocuSign via OAuth2.
- **Forms Library**: Template system for agents/brokers to upload, organize, and reuse PDF forms with categories, state tagging, broker sharing, and a visual field placement editor for role-based assignment.
- **Listing Video Creator**: AI-powered tool for agents/brokers to transform property photos into cinematic walkthrough-style videos. Gemini Flash vision analyzes each photo to determine room type, optimal motion path (pan, zoom), caption, and walkthrough ordering. Browser-based Canvas renderer with Ken Burns effects, crossfade transitions, text overlays, agent branding, multiple aspect ratios (landscape, portrait/Reels, square), and WebM export via MediaRecorder API. **Text Overlay Templates**: 5 selectable templates (Classic, Bold Cinematic, Modern Minimal, Elegant, No Text) controlling how property info, keywords, captions, and branding render on each scene. Bold template: staggered line-by-line fade-in with "JUST LISTED" header and bottom detail bar. Minimal: left-aligned with vertical accent bar. Elegant: serif font with gradient overlay. Classic: centered dark overlay pill. Each template has eased animations (slide-in, fade). **Agent Branding**: Toggleable fields (name, email, phone, brokerage) auto-populated from user profile, with optional closing slide (4-second end card with agent info and role text). **Background Music**: 5 procedural Web Audio API synthesized tracks (Elegant Piano, Modern Ambient, Upbeat, Cinematic, Acoustic) with reverb — plays during preview and is mixed into exported video via MediaRecorder audio stream. File: `client/src/lib/music-synthesizer.ts`. **3D Parallax**: DepthFlow-style Parallax Occlusion Mapping (POM) shader using depth maps from fal.ai Depth Anything V2 — ray-marches through depth in fragment shader for smooth 2.5D effect with zero edge artifacts, runs entirely in-browser via Three.js. **AI Video**: Uses **fal.ai Minimax Hailuo 2.3 Fast** image-to-video API (`FAL_KEY` secret required) to generate cinematic 6s video clips per photo in ~55 seconds. All clips fire in parallel (4 concurrent). Per-photo camera motion maps to Hailuo bracket-notation directives. Images auto-resized to 1920x1920 max via sharp. Per-clip preview, re-animate, keyword overlays, drag-reorder. Export at 20Mbps bitrate. Falls back to browser-based 2D Ken Burns if no clips/depth generated. Server endpoints: `POST /api/listing-videos/generate-3d-clip`, `POST /api/listing-videos/generate-depth`. Files: `client/src/lib/depth-estimator.ts`, `client/src/lib/three-renderer.ts`. Table: `listing_videos`.
- **Team Access / Authorized Users**: Agents/brokers can add other agents/brokers with configurable permissions and account switching.
- **Client Portal**: Mobile-first "My Transaction" page with stage tracker, countdown, action items, key dates, document hub, financial details, and team info.
- **Post-Close Engagement (MyHome Hub)**: Maintenance history, home expense tracker (with AI receipt/invoice scanner), maintenance reminders, equity tracker (amortization, rate feed, valuation), market insights, warranty tracker, home improvements log, and Dropbox Document Vault integration.
- **Growth & Lead Generation**: Affiliate referral system, drip campaigns, zip code-based lead generation with interactive map, Open House Manager, lead source tagging, timed exclusive lead routing, RESPA-compliant lead generation.
- **Lead Metrics Dashboard**: Analytics for lead performance, conversion, and source breakdown.
- **Listing & Price Alerts**: Saved search alerts with multi-channel notifications based on RentCast API data.
- **Specialized Portals**: Lender Portal (loan pipelines, checklist sync), Broker Portal (agent oversight, sales competitions, lead routing).
- **Feedback Board**: Feature request and bug report system with upvoting, roadmap view (Planned/In Progress/Complete), screenshot paste/upload on bug reports, admin status management and notes. Tables: `feedback_posts`, `feedback_votes`.
- **Zapier Integration**: API key authentication, webhook triggers, public REST API.
- **Financial Calculators**: Mortgage, Affordability, Refinance, Rent vs Buy, Financing Guide, Lender Comparison.
- **Lender Rate Quote Comparison**: Buyers request non-binding rate quotes from lenders in service areas; system provides weighted ranking comparison.
- **Billing**: Stripe integration for subscriptions and sponsored ads, including a 7-day free trial.
- **Sponsored Ads**: Ad creation with image upload, live preview, admin review, and multiple ad types.
- **Admin Dashboard**: Analytics (Recharts), user/revenue/lead tracking, management tabs for users, verifications, reports, ads, financials, leads, geo data, messages, and audit log.
- **Notifications**: Real-time SMS, Web Push for leads, WebSocket-based in-app notifications.
- **Agent/Broker Verification**: Multi-level verification with feature gating.
- **Profile Pages**: Customizable agent/broker profiles with confirmed info, bio, contact details, social media, reviews, MLS-verified listings (from RentCast), service areas, contact form, and Schema.org JSON-LD for SEO.
- **FAQ & Contact Page**: Categorized FAQs, CRM comparison, and platform contact form.
- **Verified Listings**: Auto-discovered from RentCast API, with detail pages for marketing materials.
- **Broker Seat Licensing**: Brokers can purchase per-seat plans ($39/seat/month vs $49 individual) for their agents. "Team Seats" tab in Broker Portal with seat management, agent assignment/removal, and usage analytics. Agents on broker seats see "Covered by [Broker Name]" on billing page. Tables: `broker_seat_plans`, `broker_seat_assignments`.
- **Vendor Premium Placement**: Vendors can purchase Featured ($39/mo) or Spotlight ($79/mo) placement in the HomeBase Pros marketplace. Premium vendors appear at the top of search results with a gold "Featured" badge and highlighted card. Performance analytics (impressions, clicks). Table: `vendor_premium_listings`. UI on billing page for vendors.

## External Dependencies

- **Neon PostgreSQL**: Serverless database.
- **Stripe**: Payment processing and subscriptions.
- **Twilio**: SMS communication and account verification.
- **SendGrid**: Transactional email services.
- **Google OAuth**: Gmail integration and authentication.
- **Google Gemini Flash (via Replit AI Integrations)**: AI-powered document parsing.
- **RentCast API**: Property listing data, property valuation.
- **iCal Generator**: Calendar event creation.
- **Leaflet & leaflet-draw**: Mapping functionalities.
- **pdf-parse**: PDF text extraction.
- **Nominatim/OSM**: Geocoding services.
- **Census Bureau ACS API**: Median home values by ZIP code.
- **@imgly/background-removal-node**: Local AI-based background removal for profile photos.
- **Dropbox API**: Cloud file integration.
- **Firma API**: Embedded e-signature service.
- **SignNow API**: OAuth2-based e-signature integration.
- **DocuSign API**: OAuth2-based e-signature integration.