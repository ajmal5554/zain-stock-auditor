# Zain Stock Auditor

Fast, mobile-first physical stock audit tool for **Zain Gents Palace** — independent Indian menswear retail.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS + Lucide React icons
- **Database:** PostgreSQL on Neon (Serverless)
- **ORM:** Prisma with connection pooling
- **Validation:** React Hook Form + Zod
- **Export:** SheetJS (xlsx) + PapaParse

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Database

Create a `.env` file with your Neon database credentials:

```env
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@host/db?sslmode=require"
```

### 3. Initialize Database

```bash
npx prisma generate
npx prisma db push
```

### 4. (Optional) Seed Categories

```bash
npx prisma db seed
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Screens

| Route | Purpose |
|-------|---------|
| `/audit` | Mobile rapid audit entry — one-hand usable |
| `/inventory` | Live inventory table with search & inline editing |
| `/export` | Export to Excel (.xlsx) or CSV with preview |

## Deployment

Deploy to Vercel — zero config. Just set the `DATABASE_URL` and `DIRECT_URL` environment variables.
