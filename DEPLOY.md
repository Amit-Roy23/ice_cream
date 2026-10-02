# 🚀 FrostBite Logistics - Vercel & Neon PostgreSQL Deployment Guide

This guide provides step-by-step instructions to deploy the FrostBite Ice Cream Distribution & Fast Billing system to **Vercel** with a **Neon Serverless PostgreSQL** database.

---

## 📋 Overview of Deployment Architecture

```mermaid
graph LR
    User[Client Browser] -->|HTTPS| Vercel[Vercel Serverless (iad1/cle1)]
    Vercel -->|DATABASE_URL (Pooled + PgBouncer)| NeonPooler[Neon Connection Pooler]
    NeonPooler --> NeonDB[(Neon PostgreSQL DB)]
    VercelBuild[Build Time & Migrations] -->|DIRECT_URL| NeonDB
```

---

## 🔑 Demo Credentials

| Role | Name | Email | Password | Allowed Access |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN (Owner)** | Rajesh Singhania | `admin@demo.com` | `Demo@123` | Full Access: Analytics, Margin %, Purchase Inwards, User Management, Reports |
| **MANAGER (Ops)** | Vikram Mehta | `manager@demo.com` | `Demo@123` | Fast Billing (POS), Order Management, Customer Ledgers, Stock Tracking |
| **STAFF (Field 1)** | Ramesh Kumar | `staff1@demo.com` | `Demo@123` | Mobile Order Entry & Order Tracking only |
| **STAFF (Field 2)** | Suresh Patel | `staff2@demo.com` | `Demo@123` | Mobile Order Entry & Order Tracking only |

---

## 🛠️ Step 1: Configure Neon Database & Connection Strings

1. Go to your [Neon Console](https://console.neon.tech/) and navigate to your project database.
2. In the **Connection Details** widget:
   - **Pooled connection string (`DATABASE_URL`)**: Select **"Pooled connection"**. Ensure the hostname contains `-pooler` (e.g. `ep-...-pooler.c-6.us-east-2.aws.neon.tech`) and the query parameter contains `?sslmode=require&pgbouncer=true`.
   - **Direct connection string (`DIRECT_URL`)**: Toggle off pooling to get the direct connection URL (e.g. `ep-...c-6.us-east-2.aws.neon.tech`) with `?sslmode=require`.
   - **Important**: If the connection string contains `&channel_binding=require`, remove it as standard Node.js PostgreSQL drivers do not require channel binding.

Example formatted URLs:
```env
DATABASE_URL="postgresql://neondb_owner:password@ep-soft-lab-b4upyh1a-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://neondb_owner:password@ep-soft-lab-b4upyh1a.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

---

## 💻 Step 2: Local Database Migration & Seeding

1. Copy `.env.example` to `.env` if not already present:
   ```bash
   cp .env.example .env
   ```
2. Populate `.env` with your Neon URLs and generate an `AUTH_SECRET`:
   ```env
   DATABASE_URL="your-neon-pooled-url"
   DIRECT_URL="your-neon-direct-url"
   AUTH_SECRET="a4f3b890123456789abcdef0123456789abcdef0123456789abcdef012345678"
   NODE_ENV="development"
   NEXTAUTH_URL="http://localhost:3000"
   ```
3. Deploy migrations and seed demo data:
   ```bash
   npx prisma migrate deploy
   npm run seed
   ```

---

## 🌐 Step 3: Push to GitHub & Import into Vercel

1. Commit your codebase to a GitHub repository:
   ```bash
   git add .
   git commit -m "feat: configure Next.js and Prisma for Neon and Vercel"
   git push origin main
   ```
   *(Note: `.env` is ignored by `.gitignore` and will never be committed).*

2. Log in to [Vercel Dashboard](https://vercel.com/) and click **"Add New..."** > **"Project"**.
3. Import your GitHub repository.
4. Framework Preset: **Next.js** (automatically detected).
5. Root Directory: `./`

---

## 🔐 Step 4: Configure Environment Variables in Vercel

In the **Environment Variables** section of the Vercel project import screen, add the following variables:

| Variable Name | Environment | Value Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Production, Preview, Development | Neon **Pooled connection string** (with `-pooler` and `&pgbouncer=true`) |
| `DIRECT_URL` | Production, Preview, Development | Neon **Direct connection string** (without `-pooler`) |
| `AUTH_SECRET` | Production, Preview, Development | 32+ character random string for signing JWT tokens |
| `NEXTAUTH_URL` | Production, Preview, Development | Production domain (e.g. `https://your-app.vercel.app`) |

---

## 🚀 Step 5: Deploy & Verify

1. Click **Deploy**. Vercel will automatically run:
   - `prisma generate` (via `postinstall`)
   - `prisma migrate deploy && next build` (via `build`)
2. Once deployed, verify database connectivity:
   - Open `https://your-app.vercel.app/api/health` in your browser.
   - Expected response: `{"status":"ok","database":"connected","latencyMs":...,"environment":"production"}`
3. Open `https://your-app.vercel.app/login` and test logging in with the demo accounts.

---

## ⚡ 5-Minute Demo Walkthrough

1. **Owner / Admin View (`admin@demo.com` / `Demo@123`)**:
   - **Executive Dashboard**: View real-time sales KPIs, collection, total retailer outstanding, 7-day trend chart, and profit margin analysis with company-wise breakdowns (Amul, Kwality Wall's, Vadilal, Mother Dairy, Havmor).
   - **Stock Inward / Purchases (`/purchases`)**: Record batch inwards from ice cream manufacturers with company commission discounts (e.g., 22% Amul margin).
   - **Reports (`/reports`)**: Download CSV / tabular reports for Sales, Purchase Inwards, Inventory Stock Valuation (at cost & sale), and Outstanding Dues.

2. **Manager / Operations View (`manager@demo.com` / `Demo@123`)**:
   - **High-Speed Billing POS (`/billing`)**:
     - Fast search retailer (e.g., *Krishna Dairy*).
     - Select multi-brand products with keyboard shortcuts.
     - Live stock availability verification with warning badges.
     - Auto-calculates 5% GST, item subtotals, round-off, and cash/UPI/credit payment modes.
     - Generates printable tax invoice.
   - **Customer Ledger Statement (`/customers`)**:
     - View real-time running balance (debits vs credits).

3. **Field Sales Staff View (`staff1@demo.com` / `Demo@123`)**:
   - **Field Order Entry (`/orders`)**:
     - Simplified order booking interface for retail visits.
     - View assigned shop orders and delivery schedules.
     - Cost prices and company margins are strictly hidden.

---

## 🔧 Troubleshooting & FAQ

### 1. `prepared statement "s0" already exists` or `pgbouncer errors`
- **Cause**: Serverless connections through PgBouncer transaction mode clash with Prisma prepared statements.
- **Fix**: Ensure your `DATABASE_URL` contains `?sslmode=require&pgbouncer=true`. When `pgbouncer=true` is present, Prisma automatically switches to non-prepared statement queries.

### 2. Migration timeouts during build (`P1001: Can't reach database server`)
- **Cause**: Migrations executed against the pooled connection string.
- **Fix**: Ensure `directUrl = env("DIRECT_URL")` is defined in `prisma/schema.prisma` and `DIRECT_URL` is configured in Vercel environment variables.

### 3. `@prisma/client did not initialize yet`
- **Cause**: Prisma Client was not generated before the Next.js build.
- **Fix**: The repository includes `"postinstall": "prisma generate"` in `package.json` to guarantee generation on every deployment.

### 4. Cold Start & Latency Optimization
- `vercel.json` is pre-configured with regions `["iad1", "cle1"]` which are physically adjacent to Neon's AWS `us-east-2` data centers.
