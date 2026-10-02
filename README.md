# 🍦 FrostBite Logistics - Ice Cream Distribution & Fast Billing System

> **Client Demo Web Application** tailored for Indian multi-brand ice cream distributors representing top brands: **Amul, Kwality Wall's, Vadilal, Mother Dairy, and Havmor**.

---

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router, Server Components & Route Handlers)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom Dark/Light Theme Engine + Print Media CSS
- **Theme Support**: Seamless **Dark Mode & Light Mode** toggle in the navigation bar with `localStorage` persistence
- **Database & ORM**: SQLite (`file:./dev.db`) + Prisma ORM (Zero-setup portable database)
- **Authentication**: JWT Cookie Session (`jose` + `bcryptjs`) with strict role-based access control (RBAC)
- **Localization**:
  - Currency: Indian Rupee (**₹**) with Indian number formatting (`₹1,25,000.00`)
  - Date & Time: Indian standard `DD/MM/YYYY hh:mm A`
  - Invoice: Indian Number-to-Words converter ("*Five Thousand Four Hundred Rupees Only*")
- **Print Formats**:
  - Full **A4 Standard Tax Invoice / Wholesale Bill**
  - **80mm Compact POS Thermal Receipt** layout for thermal roll printers

---

## 👥 Demo Roles & Credentials

All demo accounts are pre-seeded with password: **`Demo@123`**

| Role | Name & Email | Permissions & Scope |
| :--- | :--- | :--- |
| **👑 ADMIN (Owner)** | `admin@demo.com` | **Full access**: Dashboard with profit margins, purchase inward entries with company commission discounts, inventory adjustment, user management, and business reports. |
| **⚡ MANAGER** | `manager@demo.com` | **Billing & Operations**: Fast billing terminal, order management, stock availability check, customer ledger & payments. *(Purchase inward and cost prices are strictly hidden & forbidden).* |
| **🛵 STAFF 1** | `staff1@demo.com` | **Field Sales (Ramesh)**: Field order taking for retail shops, views own orders only. |
| **🛵 STAFF 2** | `staff2@demo.com` | **Field Sales (Suresh)**: Field order taking for retail shops, views own orders only. |

> 💡 **Pro-Tip**: Use the **"Role Switcher"** button in the top navigation header to test different user roles instantly with a single click without logging out!

---

## ⚡ Quick Setup & Running Locally

### 1. Install dependencies
```bash
npm install
```

### 2. Push Prisma Schema to SQLite Database
```bash
npx prisma db push
```

### 3. Seed Demo Data
```bash
npm run seed
```
*Seeds 5 companies with commission rates (Amul 22%, Kwality 25%, Vadilal 20%, Mother Dairy 18.5%, Havmor 24%), 35+ realistic Indian ice cream products, 15 retailer stores, initial purchases, field orders, and bills.*

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎬 5-Minute Client Demo Walkthrough Script

### Step 1: Admin Bulk Purchase Inward (Stock Inward)
1. Log in as **`admin@demo.com`** (or click **"👑 Owner (Admin)"** on the login screen).
2. Go to **Purchase Entry** in the sidebar.
3. Click **"+ New Bulk Purchase"**:
   - Select **Amul (GCMMF)** *(Auto-populates 22% brand commission)*.
   - Enter Brand Invoice # `PUR-AMUL-901` and add 100 units of *Vanilla Magic Cup* and 50 units of *Choco Almond Cone*.
   - Notice the auto-calculated Subtotal, Brand Commission Discount, and Net Payable.
   - Click **"Inward Stock & Save Purchase"**.
4. Check **Stock & Inventory**: Live stock increases immediately via the transactional `StockLedger`.

### Step 2: Field Staff Order Taking (Mobile/Tablet Simulation)
1. Switch role to **`staff1@demo.com`** (Ramesh Kumar - Field Sales).
2. Notice the simplified navigation: Staff only sees **Order Entry** (no dashboard, no purchase costs, no billing).
3. Click **"+ New Field Order"**:
   - Select Retailer: *Sharma General Store*.
   - Select Delivery Date: **"⚡ Today (Urgent)"**.
   - Add items: 20 units of *Cornetto Double Chocolate* and 10 units of *Magnum Almond Bar*.
   - Click **"Confirm & Save Order"**.

### Step 3: Manager High-Speed Billing (Fast POS Terminal)
1. Switch role to **`manager@demo.com`** (Vikram Mehta - Operations Manager).
2. Go to **Orders** and locate the order placed by Ramesh for *Sharma General Store*.
3. Click **"Bill Now"** (1-click Order-to-Bill conversion):
   - Opens the **Fast Billing Terminal** with customer and all items pre-filled!
   - Shows live multi-brand subtotals (Kwality Wall's + Amul breakdown).
   - Select Payment Mode: **"CASH"** or **"UPI"**.
   - Click **"Save & Print Invoice"**.
4. The **Invoice Modal** opens instantly:
   - Toggle between **Standard A4 Tax Invoice** and **80mm Thermal Receipt**.
   - Review retailer details, item breakdown, GST, and previous outstanding balance.

### Step 4: Admin Executive Analytics & Export Reports
1. Switch back to **`admin@demo.com`**.
2. Go to **Dashboard**:
   - Review the **Estimated Profit & Company Margin Performance** card.
   - View brand-wise gross profit calculations using Amul, Kwality, Vadilal commission percentages.
3. Go to **Business Reports**:
   - View Sales, Purchases, Stock Valuation, and Market Outstanding Receivables.
   - Click **"Export CSV Spreadsheet"** for instant Excel-compatible reports.

---

## 🔒 Security & Data Model

- **Prisma Transactions**: All stock deductions (sales) and additions (purchases & adjustments) pass through `StockLedger` within atomic database transactions.
- **Sanitized APIs**: Non-admin users (`MANAGER`, `STAFF`) have `purchasePrice` and company margin structures stripped at the API layer before JSON responses are dispatched.
- **Role Guards**: Centralized `requireRole(["ADMIN"])` enforcement in API endpoints prevents unauthorized tampering.
