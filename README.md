# Agency Contacts Dashboard

Professional Next.js 16 dashboard with Clerk authentication, Prisma + PostgreSQL (Neon), and daily contact view limits. Deployed on Vercel.

## Features
- 🔐 **Authentication**: Clerk with protected routes via middleware
- 📊 **Data Management**: 922 agencies, 1000 contacts from CSV import
- ⏱️ **Daily Limits**: 50 contact views/day per user with upgrade prompt
- 🎨 **Professional UI**: Navigation, tables with pagination, responsive design
- 🗄️ **Database**: PostgreSQL (Neon) with Prisma ORM

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon recommended)
- Clerk account for authentication

### Installation
```bash
npm install
```

### Environment Setup
Create `.env.local` with:
```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
```

### Database Setup
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (agencies + contacts)
node scripts/seed.js
```

### Development
```bash
npm run dev
# Open http://localhost:3000
```

### Build
```bash
npm run build
```

## Daily Limit Behavior
- Each contact row displayed = 1 view
- 50 views per day per user
- UpgradePrompt shown when limit reached
- Resets at midnight (user's timezone)

## System Architecture
```mermaid
flowchart LR
	U[User] -- Sign In/Out --> Clerk
	Clerk -- JWT/Session --> NextJS[Next.js App Router]
	NextJS -- Middleware Protects Routes --> MW[Clerk Middleware]
	NextJS -- ORM Queries --> Prisma
	Prisma -- PostgreSQL --> DB[(Neon Database)]
	NextJS -- UI Components --> Pages[Dashboard/Agencies/Contacts]
	Pages -- View Count Tracking --> UCV[UserContactView]
	CSVs[(CSV: agencies, contacts)] -- Seed Script --> Prisma
```

Rendered diagram:

![System Diagram](./public/diagram.svg)

## Project Structure
```
app/
├── middleware.ts           # Clerk route protection
├── app/
│   ├── layout.tsx         # ClerkProvider, global styles
│   ├── page.tsx           # Landing page
│   ├── dashboard/         # Dashboard overview
│   ├── agencies/          # Agency listing (922 rows)
│   ├── contacts/          # Contact listing with pagination
│   ├── sign-in/           # Clerk sign-in
│   └── sign-up/           # Clerk sign-up
├── components/
│   ├── Navigation.tsx     # Header with auth UI
│   └── UpgradePrompt.tsx  # Limit exceeded UI
├── lib/
│   └── db.ts             # Prisma Client singleton
├── prisma/
│   ├── schema.prisma     # Database models
│   └── migrations/       # PostgreSQL migrations
└── scripts/
    └── seed.js           # CSV import script
```

## Deployment (Vercel)

### 1. Database Setup
- Create PostgreSQL database on [Neon](https://neon.tech)
- Copy connection string (use pooled connection)

### 2. Environment Variables
Add to Vercel Project Settings → Environment Variables:
```
DATABASE_URL=postgresql://...?sslmode=require
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### 3. Deploy
```bash
git push origin main
# Vercel auto-deploys
```

### 4. Post-Deploy
```bash
# Run migrations on production DB
npx prisma migrate deploy

# Seed production database
node scripts/seed.js
```

## Tech Stack
- **Framework**: Next.js 16.0.4 (App Router, Turbopack)
- **Authentication**: Clerk 6.35.5
- **Database**: PostgreSQL (Neon) + Prisma 5.22.0
- **Styling**: Tailwind CSS 4
- **Deployment**: Vercel
- **CSV Parsing**: csv-parser

## Troubleshooting

### Clerk Middleware Error
Ensure `middleware.ts` exists at project root (not inside `app/app/`).

### Database Connection Issues
- Use pooled connection string from Neon
- Ensure `?sslmode=require` parameter is present
- Check connection limits (5 for free tier)

### Build Errors
```bash
# Regenerate Prisma Client
npx prisma generate

# Check for TypeScript errors
npm run build
```

## License
MIT




