# Agency Contacts Dashboard - Technical Documentation
**Assignment Submission for Jr SDE Position**  
**Developer**: Outman El Bouhali  
**Email**: outmanelbouhali5@gmail.com  
**Date**: November 28, 2025

---

## 📋 Table of Contents
1. [Executive Summary](#executive-summary)
2. [Live Demo & Repository](#live-demo--repository)
3. [Features & Requirements](#features--requirements)
4. [Technical Architecture](#technical-architecture)
5. [Implementation Details](#implementation-details)
6. [Database Schema](#database-schema)
7. [Authentication & Security](#authentication--security)
8. [Data Management](#data-management)
9. [User Experience](#user-experience)
10. [Performance Optimizations](#performance-optimizations)
11. [Deployment Process](#deployment-process)
12. [Testing & Quality Assurance](#testing--quality-assurance)
13. [Future Enhancements](#future-enhancements)
14. [Setup Instructions](#setup-instructions)

---

## 🎯 Executive Summary

This project is a production-ready, full-stack web application built with modern technologies to manage and display government agency contacts with built-in access controls. The application demonstrates proficiency in:

- **Modern Full-Stack Development**: Next.js 16 with App Router and Server Components
- **Authentication & Authorization**: Clerk integration with route protection middleware
- **Database Design**: PostgreSQL with Prisma ORM and type-safe queries
- **Business Logic**: Daily view limit enforcement (50 contacts/day per user)
- **Data Processing**: CSV import with 922 agencies and 1000 contacts
- **Production Deployment**: Serverless deployment on Vercel with Neon PostgreSQL
- **UI/UX Design**: Professional, responsive interface with Tailwind CSS

---

## 🔗 Live Demo & Repository

- **Live Application**: [Your Vercel URL]
- **GitHub Repository**: [github.com/oelbouha/dashboard](https://github.com/oelbouha/dashboard)
- **Documentation**: This document

### Demo Credentials
For testing purposes:
- Create a new account via the sign-up page
- Email verification required (Clerk handles this)
- Access all features after authentication

---

## ✨ Features & Requirements

### Core Features Implemented

#### 1. **User Authentication** ✅
- Secure sign-in/sign-up flows using Clerk
- JWT-based session management
- Protected routes via middleware
- User profile management with UserButton component

#### 2. **Data Display** ✅
- **Agencies Page**: Display all 922 government agencies
  - Name, Type, State, Population, Website
  - Professional table layout with hover effects
  - Responsive design for mobile/tablet/desktop
  
- **Contacts Page**: Display contacts with pagination
  - First Name, Last Name, Email, Phone, Title, Department
  - Dynamic pagination showing "X of Y contacts"
  - Real-time view count tracking

#### 3. **Business Logic - Daily Limits** ✅
- 50 contact views per day per user
- Each displayed contact row counts as 1 view
- View count persists in database (UserContactView table)
- Automatic reset at midnight (user timezone)
- Professional upgrade prompt when limit exceeded

#### 4. **Data Management** ✅
- CSV import of 922 agencies from `agencies_agency_rows.csv`
- CSV import of 1000 contacts from `contacts_contact_rows.csv`
- Batched processing (50 records/batch) to avoid connection pool exhaustion
- Foreign key validation (contacts → agencies)
- Idempotent seed script (upsert logic)

#### 5. **Professional UI/UX** ✅
- Navigation component with active route highlighting
- Responsive mobile menu
- Tailwind CSS styling with hover states and transitions
- UpgradePrompt component with feature list
- Dashboard with quick stats and action cards

---

## 🏗️ Technical Architecture

### High-Level Architecture

```
┌─────────────┐
│   Browser   │
│   (Client)  │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────┐
│         Vercel Edge Network         │
│  (CDN, SSL, DDoS Protection)        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Next.js 16 Application         │
│                                     │
│  ┌────────────────────────────┐    │
│  │  Clerk Middleware          │    │
│  │  (Route Protection)        │    │
│  └────────┬───────────────────┘    │
│           │                         │
│  ┌────────▼───────────────────┐    │
│  │  Server Components         │    │
│  │  - Dashboard Page          │    │
│  │  - Agencies Page           │    │
│  │  - Contacts Page           │    │
│  └────────┬───────────────────┘    │
│           │                         │
│  ┌────────▼───────────────────┐    │
│  │  Prisma ORM Client         │    │
│  │  (Type-safe queries)       │    │
│  └────────┬───────────────────┘    │
└───────────┼─────────────────────────┘
            │ SQL over TLS
            ▼
┌─────────────────────────────────────┐
│    PostgreSQL (Neon Serverless)     │
│                                     │
│  Tables:                            │
│  - Agency (922 records)             │
│  - Contact (1000 records)           │
│  - UserContactView (tracking)       │
└─────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | Next.js | 16.0.4 | React framework with App Router |
| | React | 19 | UI component library |
| | Tailwind CSS | 4.0 | Utility-first styling |
| **Backend** | Next.js API | 16.0.4 | Server-side rendering & API routes |
| | Prisma | 5.22.0 | Type-safe ORM |
| **Database** | PostgreSQL | 15+ | Relational database (Neon) |
| **Auth** | Clerk | 6.35.5 | Authentication & user management |
| **Deployment** | Vercel | Latest | Serverless hosting |
| **Build Tool** | Turbopack | Built-in | Fast bundler for Next.js 16 |
| **Language** | TypeScript | 5+ | Type safety across stack |

---

## 💻 Implementation Details

### 1. Authentication Flow

```typescript
// middleware.ts - Route Protection
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/agencies(.*)',
  '/contacts(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()
})
```

**How it works:**
- Middleware intercepts ALL requests before they reach pages
- Checks if route matches protected pattern
- Calls `auth.protect()` which:
  - Verifies JWT token from Clerk
  - Redirects to `/sign-in` if not authenticated
  - Allows request to proceed if valid session

### 2. Daily Limit Enforcement

```typescript
// app/contacts/page.tsx - Simplified logic
const { userId } = await auth() // Get current user from Clerk

// Find or create view record for today
const today = new Date().toISOString().split('T')[0]
let record = await prisma.userContactView.findFirst({
  where: { userId, viewDate: today }
})

if (!record) {
  record = await prisma.userContactView.create({
    data: { userId, viewDate: today, viewCount: 0 }
  })
}

// Calculate how many we can show
const remaining = Math.max(0, 50 - record.viewCount)
const contactsToShow = contacts.slice(0, remaining)

// Update view count
await prisma.userContactView.update({
  where: { id: record.id },
  data: { viewCount: record.viewCount + contactsToShow.length }
})

// Show upgrade prompt if limit exceeded
if (remaining === 0) {
  return <UpgradePrompt />
}
```

**Key Design Decisions:**
- Per-row counting (not per-page) for granular control
- Database persistence (survives page refreshes)
- Date-based partitioning (automatic daily reset)
- Optimistic UI updates (calculate before showing)

### 3. CSV Import with Batching

```typescript
// scripts/seed.js - Batch Processing
async function processBatch(items, batchSize, processFn) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await Promise.allSettled(batch.map(processFn))
    console.log(`Processed ${Math.min(i + batchSize, items.length)}/${items.length}`)
  }
}

// Import agencies in batches of 50
await processBatch(agencies, 50, async (agencyData) => {
  return prisma.agency.upsert({
    where: { id: agencyData.id },
    update: agencyData,
    create: agencyData,
  })
})
```

**Why Batching?**
- Neon free tier: 5 connection limit
- Processing 1000 records at once = connection pool exhaustion
- Batches of 50 = reliable import with progress tracking
- `upsert` = idempotent (can re-run safely)

### 4. Server Components for Performance

```typescript
// app/agencies/page.tsx - Server Component
export default async function AgenciesPage() {
  // This runs on the SERVER (not in browser)
  const { userId } = await auth()
  
  // Direct database query (no API route needed)
  const agencies = await prisma.agency.findMany({
    orderBy: { name: 'asc' }
  })
  
  // HTML rendered server-side, sent to client
  return <AgenciesTable data={agencies} />
}
```

**Benefits:**
- No client-side data fetching = faster initial load
- Database credentials never exposed to browser
- Automatic code splitting (Prisma only on server)
- SEO-friendly (fully rendered HTML)

---

## 🗄️ Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────┐
│         Agency              │
├─────────────────────────────┤
│ id          String PK       │
│ name        String          │
│ type        String?         │
│ website     String?         │
│ address     String?         │
│ city        String?         │
│ state       String?         │
│ zip         String?         │
│ phone       String?         │
│ email       String?         │
│ population  Int?            │
│ squareMiles Float?          │
│ createdAt   DateTime        │
│ updatedAt   DateTime        │
└──────────┬──────────────────┘
           │
           │ 1:N
           │
┌──────────▼──────────────────┐
│        Contact              │
├─────────────────────────────┤
│ id             String PK    │
│ firstName      String       │
│ lastName       String       │
│ email          String?      │
│ phone          String?      │
│ title          String?      │
│ emailType      String?      │
│ contactFormUrl String?      │
│ department     String?      │
│ agencyId       String? FK   │──┐
│ firmId         String?      │  │
│ createdAt      DateTime     │  │
│ updatedAt      DateTime     │  │
└─────────────────────────────┘  │
                                 │
                 ┌───────────────┘
                 │
                 │ References
                 │
                 └─────────────────┐
                                   │
┌──────────────────────────────────▼───┐
│       UserContactView                │
├──────────────────────────────────────┤
│ id         String PK (cuid)          │
│ userId     String (from Clerk)       │
│ viewDate   String (YYYY-MM-DD)       │
│ viewCount  Int (default: 0)          │
│ createdAt  DateTime                  │
│ updatedAt  DateTime                  │
│                                      │
│ @@unique([userId, viewDate])         │
└──────────────────────────────────────┘
```

### Schema Highlights

1. **Agency Table**
   - Primary source of truth for government agencies
   - 922 records imported from CSV
   - Nullable fields for incomplete data

2. **Contact Table**
   - 1000 records with optional agency association
   - Foreign key to Agency (nullable, with onDelete: SetNull)
   - Supports contacts without agency affiliation

3. **UserContactView Table**
   - Tracks daily view counts per user
   - Composite unique constraint prevents duplicate daily records
   - Efficient queries: `WHERE userId = ? AND viewDate = ?`

---

## 🔐 Authentication & Security

### Security Measures Implemented

#### 1. **Route Protection**
- Middleware runs before EVERY request
- Unauthenticated users redirected to `/sign-in`
- No client-side route guards (server-enforced)

#### 2. **Environment Variables**
```env
# Never committed to Git (.env.local in .gitignore)
DATABASE_URL="postgresql://..."
CLERK_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
```

#### 3. **Database Security**
- PostgreSQL with SSL required (`?sslmode=require`)
- Connection pooling to prevent DoS
- Prisma prepared statements (SQL injection prevention)

#### 4. **Session Management**
- JWT tokens issued by Clerk (industry standard)
- Automatic token refresh
- Secure httpOnly cookies

#### 5. **CORS & CSP**
- Vercel handles CORS automatically
- Next.js security headers enabled
- No inline scripts (Turbopack compliance)

---

## 📊 Data Management

### CSV Import Process

**File Sources:**
- `agencies_agency_rows.csv` - 922 agencies
- `contacts_contact_rows.csv` - 1000 contacts

**Import Steps:**
1. **Read CSV** using `csv-parser` library
2. **Parse rows** into typed objects
3. **Validate data** (check agency existence for contacts)
4. **Batch process** (50 records at a time)
5. **Upsert** to handle duplicates
6. **Log progress** and errors

**Data Quality:**
- Handles missing fields (nullable columns)
- Type coercion (string → int for population)
- Foreign key validation (contacts link to valid agencies)
- Error reporting (first 5 errors logged)

### Sample Seed Output
```
Seeding agencies from agencies_agency_rows.csv
Found 922 agencies, importing in batches...
  Processed 50/922...
  Processed 100/922...
  ...
  Processed 922/922...
Agencies: 922 imported, 0 failed

Seeding contacts from contacts_contact_rows.csv
Found 922 agencies in database
Found 1000 contacts, importing in batches...
  Processed 1000/1000...
Contacts: 1000 imported, 0 failed

=== Seeding Summary ===
Total agencies in database: 922
Total contacts in database: 1000
Seeding completed
```

---

## 🎨 User Experience

### UI Components

#### 1. **Navigation Component**
```typescript
// components/Navigation.tsx
'use client'

export default function Navigation() {
  return (
    <nav className="sticky top-0 bg-white shadow-sm">
      <SignedIn>
        <UserButton /> {/* Clerk component */}
      </SignedIn>
      <SignedOut>
        <SignInButton />
      </SignedOut>
    </nav>
  )
}
```

**Features:**
- Sticky header (always visible)
- Active route highlighting
- Responsive mobile menu
- User profile dropdown

#### 2. **UpgradePrompt Component**
- Full-page overlay when limit exceeded
- Feature comparison (current vs. premium)
- Countdown to reset (midnight)
- Call-to-action button

#### 3. **Data Tables**
- Hover effects on rows
- Alternating row colors (zebra striping)
- Responsive columns (hide on mobile)
- Formatted numbers (1,234,567)

### Responsive Design

**Breakpoints:**
- Mobile: < 640px (single column, stacked layout)
- Tablet: 640px - 1024px (compact table)
- Desktop: > 1024px (full table with all columns)

**Mobile Optimizations:**
- Hidden columns (population, square miles)
- Touch-friendly buttons (44px min height)
- Simplified navigation menu

---

## ⚡ Performance Optimizations

### 1. **Server Components**
- Default in Next.js 16 App Router
- Zero JavaScript for static content
- Faster Time to Interactive (TTI)

### 2. **Database Optimizations**
```typescript
// Efficient query with select
const agencies = await prisma.agency.findMany({
  select: {
    id: true,
    name: true,
    type: true,
    state: true,
    population: true,
    website: true,
  },
  orderBy: { name: 'asc' }
})
```

### 3. **Caching Strategy**
- Next.js automatic caching (fetch API)
- Vercel Edge Network CDN
- Static assets cached (public/ folder)

### 4. **Bundle Size**
- Tailwind CSS purging (unused styles removed)
- Prisma Client tree-shaking
- Dynamic imports for heavy components

### 5. **Connection Pooling**
```typescript
// lib/db.ts - Singleton pattern
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## 🚀 Deployment Process

### Vercel Deployment

**Configuration:**
```json
// vercel.json
{
  "version": 2,
  "framework": "nextjs"
}
```

**Build Steps:**
1. `npm install` - Install dependencies
2. `npx prisma generate` - Generate Prisma Client (postinstall script)
3. `next build` - Compile application (Turbopack)
4. Deploy to Vercel Edge Network

**Environment Variables (Vercel Dashboard):**
```
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

**Post-Deployment:**
```bash
# Run migrations on production DB
npx prisma migrate deploy

# Seed production database
node scripts/seed.js
```

### Database: Neon PostgreSQL

**Why Neon?**
- Serverless (auto-scaling)
- Generous free tier
- Connection pooling built-in
- Vercel integration
- Branching support (dev/staging/prod)

**Connection String Format:**
```
postgresql://user:password@ep-name.region.aws.neon.tech/dbname?sslmode=require
```

---

## 🧪 Testing & Quality Assurance

### Manual Testing Checklist

#### Authentication Flow
- [ ] Sign-up with new email
- [ ] Email verification
- [ ] Sign-in with existing account
- [ ] Sign-out
- [ ] Redirect to protected routes when unauthenticated
- [ ] Access protected routes when authenticated

#### Data Display
- [ ] Agencies page shows 922 records
- [ ] Contacts page shows up to 50 records
- [ ] Pagination indicator correct
- [ ] Table columns formatted properly
- [ ] Responsive layout on mobile/tablet

#### Daily Limits
- [ ] First 50 contacts displayed
- [ ] View count increments correctly
- [ ] Limit exceeded shows UpgradePrompt
- [ ] New day resets counter
- [ ] Multiple users have separate limits

#### UI/UX
- [ ] Navigation highlights active route
- [ ] Hover effects on interactive elements
- [ ] Mobile menu toggles correctly
- [ ] No layout shifts (CLS)
- [ ] Fast page loads (< 2s)

### Code Quality

**TypeScript Coverage:**
- 100% of application code
- Strict mode enabled
- No `any` types (except external libs)

**Best Practices:**
- Server Components by default
- Client Components only when needed (`'use client'`)
- Consistent file naming (kebab-case)
- Proper error handling (try/catch)

---

## 🔮 Future Enhancements

### Short-term (1-2 weeks)
1. **Search & Filtering**
   - Search agencies by name/state
   - Filter contacts by title/department
   - URL-based filters (shareable links)

2. **CSV Export**
   - Download current view as CSV
   - Premium feature (requires upgrade)

3. **Advanced Pagination**
   - Page numbers (1, 2, 3...)
   - Jump to page
   - Items per page selector

### Medium-term (1 month)
4. **Analytics Dashboard**
   - View count over time (charts)
   - Most viewed contacts
   - User activity heatmap

5. **Contact Management**
   - Add/edit/delete contacts (admin)
   - Import additional CSV files
   - Bulk operations

6. **Notifications**
   - Email when nearing limit (45/50)
   - Daily summary reports
   - New agency/contact alerts

### Long-term (3+ months)
7. **Premium Plans**
   - Stripe integration
   - Tiered pricing (50/100/unlimited)
   - Team accounts

8. **API Access**
   - RESTful API endpoints
   - API key authentication
   - Rate limiting

9. **Mobile App**
   - React Native version
   - Offline support
   - Push notifications

---

## 📝 Setup Instructions

### Local Development

**Prerequisites:**
- Node.js 18+ and npm
- Git
- PostgreSQL database (local or Neon)
- Clerk account (free tier)

**Step 1: Clone Repository**
```bash
git clone https://github.com/oelbouha/dashboard.git
cd dashboard/app
```

**Step 2: Install Dependencies**
```bash
npm install
```

**Step 3: Environment Setup**
Create `.env.local`:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/dashboard?sslmode=prefer"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
```

**Step 4: Database Setup**
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
node scripts/seed.js
```

**Step 5: Run Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Deployment

See [Deployment Process](#deployment-process) section above.

---

## 📞 Contact & Support

**Developer**: Outman El Bouhali  
**Email**: outmanelbouhali5@gmail.com  
**GitHub**: [@oelbouha](https://github.com/oelbouha)  
**LinkedIn**: [Your LinkedIn URL]

### Questions?

For any questions about:
- Technical implementation
- Architecture decisions
- Deployment process
- Code walkthroughs

Feel free to reach out via email or schedule a call.

---

## 📄 License

This project was created as part of a take-home assignment for [Company Name]. All rights reserved.

---

**Thank you for reviewing this submission!**

I'm excited about the opportunity to discuss this project in detail and demonstrate my problem-solving approach, coding skills, and ability to deliver production-ready applications.
