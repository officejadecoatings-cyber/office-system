# Office System (Google Apps Script + Google Drive)

A lightweight, 4-user Office Management System built with **Google Apps Script**, using **Google Sheets** & **Google Drive** as the database. No external server or hosting fees required.

## Included Modules
1. **Dashboard** – Net balance, pending invoices, low-stock alerts, open tasks, and today's attendance summary.
2. **Invoicing, Orders & Accounts** – Create/edit invoices with line items linked to Inventory, auto-deduct stock, printable PDF view, and Income/Expense ledger (auto-records Income when an invoice is marked `Paid`).
3. **Inventory & Stock** – Track SKUs, prices, stock quantities, and low-stock reorder alerts.
4. **Customers (CRM)** – Customer directory with contact info, notes, and order count.
5. **Attendance & Leave** – One-click Clock In / Clock Out from the top bar, daily attendance log, and Leave Request / Admin Approval workflow.
6. **Tasks & Projects** – 3-column Kanban board (`To Do`, `In Progress`, `Done`) with assignees, due dates, and priorities.
7. **Settings & Users** – Company profile, currency/tax settings, Google Drive folder link, and 4-user PIN-based access (`Admin` & `Staff` roles).

---

## How to Deploy in Google Drive (5 Minutes)

1. **Create a Google Sheet** in your Google Drive (e.g., name it `Office System Database`).
2. In the Google Sheet menu, click **Extensions → Apps Script**.
3. In the Apps Script editor:
   - Replace the contents of `Code.gs` with [Code.gs](Code.gs).
   - Click **+** next to **Files → HTML** to create three HTML files (exact names, case-sensitive):
     - `Index` (paste [Index.html](Index.html))
     - `Styles` (paste [Styles.html](Styles.html))
     - `Scripts` (paste [Scripts.html](Scripts.html))
   - *(Optional)* Click **Project Settings (⚙️)** → check **"Show `appsscript.json` manifest file in editor"**, then replace its content with [appsscript.json](appsscript.json).
4. **Initialize the Database**:
   - In the Apps Script toolbar, select `setupDatabase` from the function dropdown and click **Run**.
   - Grant the requested Google Sheets & Google Drive permissions.
   - This automatically creates all 10 database tabs (`Settings`, `Users`, `Customers`, `Inventory`, `Invoices`, `InvoiceItems`, `Transactions`, `Attendance`, `Leaves`, `Tasks`) and a `Office System Files` folder in your Google Drive.
5. **Deploy as a Web App**:
   - Click **Deploy → New deployment**.
   - Select type: **Web app**.
   - **Execute as**: `Me`
   - **Who has access**: `Anyone` (access inside the app is protected by each user's PIN).
   - Click **Deploy** and copy the **Web app URL**.
6. **Share the URL** with your 4 team members!

## Default Login
- **Admin User**: Select `Admin User (Admin)` → PIN: `1234`
- **Staff 1–3**: Select `Staff Member 1/2/3` → PINs: `1111`, `2222`, `3333`
- Go to **Settings & Users** after logging in to update company details, user names, emails, and PINs.
