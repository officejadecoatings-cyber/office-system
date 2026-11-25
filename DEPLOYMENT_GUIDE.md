# Office System — Local Network (LAN) Dual-Installer Deployment Guide
**Self-Hosted Client-Server Desktop System for Jade Coatings**

---

## 1. System Overview & Architecture

This system converts the office web application from Google Apps Script / Cloud into a **100% self-hosted, offline-capable Local Area Network (LAN) system** packaged into two Windows applications:

```
+-----------------------------------------------------------------------------------+
|                           OFFICE SERVER PC (Windows)                              |
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   | Office System Background Service (Port 3000)                              |   |
|   | - Node.js Express API Engine (Universal RPC + REST)                       |   |
|   | - SQLite 3 Database (better-sqlite3) with WAL Mode                        |   |
|   | - Automated Backup Scheduler (12:30 PM & 4:45 PM Daily)                   |   |
|   +---------------------------------------------------------------------------+   |
|                                         ▲                                         |
|                  SQLite Database File   |   Automated Snapshots                   |
|                  C:\...\office_system.db|   C:\OfficeSystem_Backups\*.db & *.xlsx |
+-----------------------------------------|-----------------------------------------+
                                          | Local Network (LAN / Wi-Fi)
                     +--------------------+--------------------+
                     |                                         |
                     ▼                                         ▼
+------------------------------------------+ +------------------------------------------+
|          STAFF PC 1 (Desktop)            | |          STAFF PC 2 (Desktop)            |
| OfficeSystem-Client-Setup.exe (Electron) | | OfficeSystem-Client-Setup.exe (Electron) |
| Connects to: http://192.168.1.100:3000   | | Connects to: http://192.168.1.100:3000   |
| Native A4 Printing, Offline Cache, SheetJS| | Native A4 Printing, Offline Cache, SheetJS|
+------------------------------------------+ +------------------------------------------+
```

---

## 2. Directory Structure

- **/server**
  - `server.js` — Node.js Express API & Web Console (Port 3000).
  - `db.js` — SQLite database manager with WAL (`Write-Ahead Logging`) concurrency mode and 26 relational schemas.
  - `backup.js` — Automated backup engine creating SQLite `.backup()` snapshots and `.xlsx` multi-sheet workbooks.
  - `migrate_data.js` — Data migration script to import historical Google Sheets/Supabase data.
  - `tray-control.ps1` / `ServerControl.bat` — Windows Server Control Console showing Server IP, Service Status, and manual backup trigger.
  - `install-service.bat` — One-click Windows Service and Firewall rule installer.
  - `uninstall-service.bat` — Clean removal script.
  - `server-installer.iss` — Inno Setup script to compile `OfficeSystem-Server-Setup.exe`.
- **/client-desktop**
  - `main.js` — Electron application main process with native windowing and borderless A4 printing support.
  - `preload.js` — Secure context bridge.
  - `renderer/index.html` — Bundled frontend with dynamic LAN Server IP configuration and native print triggers.
  - `assets/` — Application icons (`icon.ico` and `icon.png`).
- **/migration_data**
  - Staging folder for historical `.xlsx`, `.csv`, or `.json` exports.
- **/installers**
  - Output folder where the built setup packages reside.

---

## 3. Phase 1: Migrating Existing Cloud Data

To bring your current Google Sheets or Supabase records into the local SQLite database:

1. In your existing web application or Google Spreadsheet, export your sheets to Excel (`.xlsx`), CSV files, or JSON.
2. Copy the exported files into the `migration_data/` folder in this workspace.
   - Supported filenames: `Customers.csv`, `Suppliers.csv`, `Invoices.xlsx`, `Quotations.xlsx`, `Inventory.csv`, `Employees.xlsx`, etc.
3. Open a terminal / command prompt in `/server` and run:
   ```cmd
   cd server
   node migrate_data.js
   ```
   Or click **"Run Data Migration"** directly from the **Server Control Console**!
4. The migration script will:
   - Import all historical records into their respective SQLite tables.
   - Automatically recalculate sequence numbers (`NextCustomerSeq`, `NextSupplierSeq`, `NextInvoiceNo`, `NextQuoteNo`) so new transactions seamlessly continue without ID collisions.

---

## 4. Phase 2: Building the Windows Installers

### 1. Building the Server Installer (`OfficeSystem-Server-Setup.exe`):
Run the batch file in the root directory:
```cmd
build-server-installer.bat
```
- This automatically bundles `node.exe` into `/server` so target Server PCs do **not** need Node.js pre-installed.
- If **Inno Setup 6** is installed, it compiles `installers\OfficeSystem-Server-Setup.exe`.
- If Inno Setup is not installed, it creates `installers\OfficeSystem-Server-Standalone.zip`, which can be unzipped directly onto the Server PC.

### 2. Building the Client Desktop Installer (`OfficeSystem-Client-Setup.exe`):
Run the client build batch file:
```cmd
build-client-installer.bat
```
- Bundles the latest frontend HTML/CSS/JavaScript with the Electron LAN bridge.
- Runs `electron-builder` to output `installers\OfficeSystem-Client-Setup.exe`.

---

## 5. Phase 3: Setting Up the Main Server PC

1. **Assign a Static IP to the Server PC (Recommended):**
   - On the Server PC, open **Windows Settings -> Network & Internet -> Properties**.
   - Under IP Assignment, set a manual static IP (e.g. `192.168.1.100`), or configure a DHCP reservation on your office Wi-Fi router.
2. **Install the Server:**
   - Run `OfficeSystem-Server-Setup.exe` (or extract `OfficeSystem-Server-Standalone.zip` to `C:\OfficeSystemServer`).
   - Run `install-service.bat` as Administrator.
   - This automatically:
     - Adds a Windows Firewall rule allowing incoming TCP traffic on Port `3000`.
     - Registers `OfficeSystemServer` as a Windows startup service so it starts automatically in the background when the computer boots up.
3. **Verify Service & IP Address:**
   - Double-click **Office System Server Manager** (`ServerControl.bat`) on the Desktop.
   - Confirm that the status is **ONLINE (Port 3000 Active)** and note the displayed IP address (e.g., `http://192.168.1.100:3000`).
   - Click **"Open Web Console"** or browse to `http://localhost:3000` to inspect diagnostics.

---

## 6. Phase 4: Deploying on Staff Desktop PCs

1. Copy `OfficeSystem-Client-Setup.exe` to staff computers via USB flash drive or local network share.
2. Run `OfficeSystem-Client-Setup.exe` to install the desktop app. It will create **Desktop** and **Start Menu** shortcuts.
3. Launch **Office System**.
4. On first launch, the **Connect to Office Server** window will appear:
   - Enter the Server PC address (e.g., `http://192.168.1.100:3000`).
   - Click **Test Connection**. Once you see `✓ Connected!`, click **Save & Connect**.
5. The application will connect immediately, display the Team Member login screen, and synchronize all company data.
6. **Changing Server IP Later:**
   - If the router IP ever changes, staff can simply click the **LAN Server ⚙️** badge in the top navigation bar or go to `File -> Connect to Server...` (`Ctrl + Shift + S`) to update the IP address in 5 seconds.

---

## 7. Phase 5: Automated Backups & Disaster Recovery

### Automatic Backups:
- The server runs two scheduled backups every business day:
  - **12:30 PM** (Mid-Day Backup)
  - **4:45 PM** (End-of-Day Backup)
- Backups are stored in `C:\OfficeSystem_Backups\`:
  - `office_system_YYYYMMDD_HHMMSS.db` — Safe, live SQLite database snapshot.
  - `office_system_YYYYMMDD_HHMMSS.xlsx` — Full multi-sheet Excel workbook containing all 26 tables.
- **Retention:** Backups older than 30 days are pruned automatically.

### Manual On-Demand Backup:
- In the Server Control window on the Server PC, click **"💾 Backup Database Now"**.
- Or send an HTTP POST request to `http://<SERVER_IP>:3000/api/backup`.

### Disaster Recovery:
If the main Server PC suffers hardware failure:
1. Copy the latest `.db` or `.xlsx` file from `C:\OfficeSystem_Backups\` to a replacement computer.
2. Install the server on the replacement PC.
3. Place the `.db` file into `server/data/office_system.db` (or run `migrate_data.js` on the `.xlsx` file).
4. Point the client desktop apps to the new Server PC IP address. All historical records, balances, invoices, and customer codes will be fully restored!
