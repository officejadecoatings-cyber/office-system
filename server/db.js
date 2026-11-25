const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Resolve database directory
const defaultDataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(defaultDataDir)) {
  fs.mkdirSync(defaultDataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(defaultDataDir, 'office_system.db');
console.log(`[DB] Opening SQLite database at: ${dbPath}`);

const db = new Database(dbPath);

// Enable WAL mode for high concurrency multi-user performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS Settings (
      Key TEXT PRIMARY KEY,
      Value TEXT
    );

    CREATE TABLE IF NOT EXISTS Users (
      UserId TEXT PRIMARY KEY,
      Name TEXT NOT NULL,
      Email TEXT NOT NULL,
      Role TEXT NOT NULL,
      Pin TEXT NOT NULL,
      Status TEXT NOT NULL DEFAULT 'Active',
      AllowedTabs TEXT,
      Avatar TEXT,
      NIC TEXT
    );

    CREATE TABLE IF NOT EXISTS Customers (
      CustomerId TEXT PRIMARY KEY,
      CustomerCode TEXT,
      Name TEXT NOT NULL,
      BusinessIdentifier TEXT,
      BillingAddress TEXT,
      DeliveryAddress TEXT,
      Email TEXT,
      Phone TEXT,
      CreditLimit NUMERIC DEFAULT 0,
      SalesOfficerId TEXT,
      SalesOfficerName TEXT,
      Notes TEXT,
      CreatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS Suppliers (
      SupplierId TEXT PRIMARY KEY,
      Name TEXT NOT NULL,
      BrNumber TEXT,
      Address TEXT,
      Phone TEXT,
      Email TEXT,
      CreatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS Inventory (
      ItemId TEXT PRIMARY KEY,
      SKU TEXT NOT NULL,
      Name TEXT NOT NULL,
      Category TEXT NOT NULL,
      UnitPrice NUMERIC NOT NULL DEFAULT 0,
      StockQty NUMERIC NOT NULL DEFAULT 0,
      ReorderLevel NUMERIC DEFAULT 0,
      Unit TEXT DEFAULT 'Units',
      UpdatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS Invoices (
      InvoiceId TEXT PRIMARY KEY,
      InvoiceNo TEXT NOT NULL,
      CustomerId TEXT,
      CustomerName TEXT,
      Date TEXT NOT NULL,
      DueDate TEXT,
      Status TEXT NOT NULL DEFAULT 'Pending',
      Subtotal NUMERIC DEFAULT 0,
      Discount NUMERIC DEFAULT 0,
      TaxAmount NUMERIC DEFAULT 0,
      Total NUMERIC DEFAULT 0,
      PaidAmount NUMERIC DEFAULT 0,
      Notes TEXT,
      CreatedBy TEXT,
      QuoteNo TEXT,
      SalesPerson TEXT,
      CustomerAddress TEXT,
      CustomerPhone TEXT,
      BankDetails TEXT,
      CompanyId TEXT,
      ChequeNo TEXT,
      ChequeBank TEXT,
      ChequeDate TEXT,
      ChequeAmount NUMERIC DEFAULT 0,
      RealisedDate TEXT,
      RealizedMonth TEXT,
      ReceiptNo TEXT,
      PaymentStatus TEXT,
      TokenAmount NUMERIC DEFAULT 0,
      ReturnAmount NUMERIC DEFAULT 0,
      DispatchStatus TEXT DEFAULT 'Not Dispatched',
      DispatchedDate TEXT,
      DispatchedBy TEXT,
      PaymentsJson TEXT
    );

    CREATE TABLE IF NOT EXISTS InvoiceItems (
      LineId TEXT PRIMARY KEY,
      InvoiceId TEXT NOT NULL,
      ItemId TEXT,
      ItemName TEXT NOT NULL,
      Qty NUMERIC NOT NULL DEFAULT 1,
      UnitPrice NUMERIC NOT NULL DEFAULT 0,
      LineTotal NUMERIC NOT NULL DEFAULT 0,
      ItemCode TEXT,
      DiscountPercent NUMERIC DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS CompanyProfiles (
      CompanyId TEXT PRIMARY KEY,
      CompanyName TEXT NOT NULL,
      Address TEXT,
      Phone TEXT,
      Email TEXT,
      Website TEXT,
      BankName TEXT,
      Branch TEXT,
      AccountNo TEXT,
      Logo TEXT,
      IsDefault TEXT DEFAULT 'No',
      InvoicePrefix TEXT DEFAULT 'INV-',
      NextInvoiceNo TEXT DEFAULT '1001',
      QuotePrefix TEXT DEFAULT 'QT-',
      NextQuoteNo TEXT DEFAULT '754',
      CreatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS Quotations (
      QuotationId TEXT PRIMARY KEY,
      QuotationNo TEXT NOT NULL,
      Date TEXT NOT NULL,
      CustomerId TEXT,
      CustomerName TEXT NOT NULL,
      BillingAddress TEXT,
      Description TEXT,
      SalesPerson TEXT,
      PreparedBy TEXT,
      PaymentTerms TEXT,
      Status TEXT DEFAULT 'Draft',
      Subtotal NUMERIC DEFAULT 0,
      Discount NUMERIC DEFAULT 0,
      TaxAmount NUMERIC DEFAULT 0,
      Total NUMERIC DEFAULT 0,
      Notes TEXT,
      DeliveryAddress TEXT,
      Phone TEXT,
      Email TEXT,
      ItemsJson TEXT
    );

    CREATE TABLE IF NOT EXISTS OrderForms (
      OrderId TEXT PRIMARY KEY,
      OrderNo TEXT NOT NULL,
      CustomerId TEXT,
      CustomerName TEXT NOT NULL,
      CustomerPhone TEXT,
      CustomerAddress TEXT,
      SalesOfficerId TEXT,
      SalesOfficerName TEXT,
      OrderDate TEXT NOT NULL,
      RequiredDate TEXT,
      Status TEXT DEFAULT 'Pending',
      Subtotal NUMERIC DEFAULT 0,
      Discount NUMERIC DEFAULT 0,
      TaxAmount NUMERIC DEFAULT 0,
      Total NUMERIC DEFAULT 0,
      Notes TEXT,
      AdvancePayment NUMERIC DEFAULT 0,
      BalanceDue NUMERIC DEFAULT 0,
      CreatedAt TEXT,
      ItemsJson TEXT
    );

    CREATE TABLE IF NOT EXISTS OrderFormItems (
      LineId TEXT PRIMARY KEY,
      OrderId TEXT NOT NULL,
      ItemId TEXT,
      ItemName TEXT NOT NULL,
      Qty NUMERIC NOT NULL DEFAULT 1,
      UnitPrice NUMERIC NOT NULL DEFAULT 0,
      LineTotal NUMERIC NOT NULL DEFAULT 0,
      DiscountPercent NUMERIC DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS Creditors (
      CreditorId TEXT PRIMARY KEY,
      CreditorName TEXT NOT NULL,
      SupplierId TEXT,
      BillNo TEXT NOT NULL,
      BillDate TEXT NOT NULL,
      DueDate TEXT,
      Amount NUMERIC NOT NULL DEFAULT 0,
      PaidAmount NUMERIC DEFAULT 0,
      Status TEXT DEFAULT 'Pending',
      Notes TEXT,
      CreatedAt TEXT,
      PaymentsJson TEXT
    );

    CREATE TABLE IF NOT EXISTS PettyCash (
      PcId TEXT PRIMARY KEY,
      VoucherNo TEXT NOT NULL,
      Date TEXT NOT NULL,
      Payee TEXT NOT NULL,
      Description TEXT,
      Category TEXT NOT NULL,
      Amount NUMERIC NOT NULL DEFAULT 0,
      ApprovedBy TEXT,
      Status TEXT DEFAULT 'Approved',
      Notes TEXT,
      CreatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS CallReports (
      CallId TEXT PRIMARY KEY,
      Date TEXT NOT NULL,
      CustomerName TEXT NOT NULL,
      ContactPerson TEXT,
      Phone TEXT,
      Purpose TEXT,
      Discussion TEXT,
      NextAction TEXT,
      FollowUpDate TEXT,
      Status TEXT DEFAULT 'Open',
      SalesOfficerId TEXT,
      SalesOfficerName TEXT,
      CreatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS ProjectReports (
      ProjId TEXT PRIMARY KEY,
      Date TEXT NOT NULL,
      ProjectName TEXT NOT NULL,
      Location TEXT,
      ClientName TEXT,
      ContactPerson TEXT,
      Phone TEXT,
      ScopeOfWork TEXT,
      ProgressPercent NUMERIC DEFAULT 0,
      Status TEXT DEFAULT 'In Progress',
      EstimatedValue NUMERIC DEFAULT 0,
      SalesOfficerId TEXT,
      SalesOfficerName TEXT,
      Notes TEXT,
      CreatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS PainterQuotations (
      QuoteId TEXT PRIMARY KEY,
      QuoteNo TEXT NOT NULL,
      Date TEXT NOT NULL,
      PainterName TEXT NOT NULL,
      NIC TEXT,
      Phone TEXT,
      Address TEXT,
      ProjectName TEXT,
      Location TEXT,
      TotalAmount NUMERIC DEFAULT 0,
      Status TEXT DEFAULT 'Draft',
      Notes TEXT,
      CreatedAt TEXT,
      ItemsJson TEXT
    );

    CREATE TABLE IF NOT EXISTS PainterBillBalances (
      BillId TEXT PRIMARY KEY,
      BillNo TEXT NOT NULL,
      Date TEXT NOT NULL,
      PainterName TEXT NOT NULL,
      NIC TEXT,
      Phone TEXT,
      InvoiceNo TEXT,
      BillAmount NUMERIC DEFAULT 0,
      PaidAmount NUMERIC DEFAULT 0,
      BalanceAmount NUMERIC DEFAULT 0,
      Status TEXT DEFAULT 'Pending',
      Notes TEXT,
      CreatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS PainterParticipants (
      ParticipantId TEXT PRIMARY KEY,
      ProgramDate TEXT NOT NULL,
      ProgramTitle TEXT NOT NULL,
      Location TEXT,
      PainterName TEXT NOT NULL,
      NIC TEXT,
      Phone TEXT,
      Address TEXT,
      ExperienceYears NUMERIC DEFAULT 0,
      Status TEXT DEFAULT 'Attended',
      Notes TEXT,
      CreatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS Employees (
      EmpId TEXT PRIMARY KEY,
      EmpNo TEXT NOT NULL,
      Name TEXT NOT NULL,
      NIC TEXT,
      Designation TEXT,
      Position TEXT,
      Department TEXT,
      Phone TEXT,
      Email TEXT,
      BasicSalary NUMERIC DEFAULT 0,
      SalesTarget NUMERIC DEFAULT 0,
      Status TEXT DEFAULT 'Active',
      JoinDate TEXT,
      Notes TEXT
    );

    CREATE TABLE IF NOT EXISTS CustomTabs (
      TabId TEXT PRIMARY KEY,
      Title TEXT NOT NULL,
      Icon TEXT,
      ColumnsJson TEXT,
      CreatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS CustomTabRows (
      RowId TEXT PRIMARY KEY,
      TabId TEXT NOT NULL,
      DataJson TEXT,
      CreatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS Transactions (
      TxId TEXT PRIMARY KEY,
      Date TEXT NOT NULL,
      Type TEXT NOT NULL,
      Category TEXT NOT NULL,
      Amount NUMERIC NOT NULL DEFAULT 0,
      ReferenceNo TEXT,
      Description TEXT,
      Account TEXT,
      CreatedBy TEXT,
      CreatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS Attendance (
      AttId TEXT PRIMARY KEY,
      Date TEXT NOT NULL,
      UserId TEXT NOT NULL,
      UserName TEXT NOT NULL,
      ClockIn TEXT,
      ClockOut TEXT,
      TotalHours NUMERIC DEFAULT 0,
      Status TEXT DEFAULT 'Present',
      Notes TEXT
    );

    CREATE TABLE IF NOT EXISTS Leaves (
      LeaveId TEXT PRIMARY KEY,
      UserId TEXT NOT NULL,
      UserName TEXT NOT NULL,
      LeaveType TEXT NOT NULL,
      StartDate TEXT NOT NULL,
      EndDate TEXT NOT NULL,
      DaysCount NUMERIC DEFAULT 1,
      Reason TEXT,
      Status TEXT DEFAULT 'Pending',
      ApprovedBy TEXT,
      CreatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS Tasks (
      TaskId TEXT PRIMARY KEY,
      Title TEXT NOT NULL,
      Description TEXT,
      AssignedTo TEXT,
      AssignedToName TEXT,
      DueDate TEXT,
      Priority TEXT DEFAULT 'Medium',
      Status TEXT DEFAULT 'Pending',
      CreatedBy TEXT,
      CreatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS SavedReports (
      ReportId TEXT PRIMARY KEY,
      Title TEXT NOT NULL,
      ReportType TEXT NOT NULL,
      ParamsJson TEXT,
      ResultsJson TEXT,
      CreatedBy TEXT,
      CreatedAt TEXT
    );
  `;

  db.exec(schemaSQL);
  seedDefaults();
}

function seedDefaults() {
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM Users').get().cnt;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO Users (UserId, Name, Email, Role, Pin, Status, AllowedTabs)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertUser.run('U-001', 'Admin User', 'admin@office.local', 'Admin', '1234', 'Active', '*');
    insertUser.run('U-002', 'Manager User', 'manager@office.local', 'Manager', '2345', 'Active', '*');
    insertUser.run('U-003', 'Staff User', 'staff@office.local', 'Staff', '3456', 'Active', 'invoices,customers,quotations,orderform');
    console.log('[DB] Seeded initial Users (Admin: PIN 1234)');
  }

  const defaultSettings = [
    ['CompanyName', 'Jade Coatings'],
    ['NextCustomerSeq', '1'],
    ['NextSupplierSeq', '1'],
    ['NextInvoiceNo', '1001'],
    ['InvoicePrefix', 'INV-'],
    ['NextQuoteNo', '754'],
    ['QuotePrefix', 'QT-'],
    ['NextPettyCashNo', '1'],
    ['Currency', 'LKR'],
    ['AnnualLeaveQuota', '14'],
    ['CasualLeaveQuota', '7'],
    ['SickLeaveQuota', '7']
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO Settings (Key, Value) VALUES (?, ?)
  `);
  const setMany = db.transaction((rows) => {
    for (const [k, v] of rows) insertSetting.run(k, v);
  });
  setMany(defaultSettings);

  const compCount = db.prepare('SELECT COUNT(*) as cnt FROM CompanyProfiles').get().cnt;
  if (compCount === 0) {
    db.prepare(`
      INSERT INTO CompanyProfiles (CompanyId, CompanyName, Address, Phone, Email, Website, BankName, Branch, AccountNo, IsDefault, InvoicePrefix, NextInvoiceNo, QuotePrefix, NextQuoteNo, CreatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'COMP-001',
      'Jade Coatings (Pvt) Ltd',
      'Colombo, Sri Lanka',
      '+94 11 234 5678',
      'info@jadecoatings.com',
      'www.jadecoatings.com',
      'Commercial Bank',
      'Main Branch',
      '1000982266',
      'Yes',
      'INV-',
      '1001',
      'QT-',
      '754',
      new Date().toISOString().slice(0, 10)
    );
  }
}

// Fetch all application data into memory object (matching state.data)
function fetchAllAppData() {
  const tables = {
    users: 'Users',
    customers: 'Customers',
    suppliers: 'Suppliers',
    inventory: 'Inventory',
    invoices: 'Invoices',
    invoiceItems: 'InvoiceItems',
    companyProfiles: 'CompanyProfiles',
    quotations: 'Quotations',
    orderForms: 'OrderForms',
    orderFormItems: 'OrderFormItems',
    creditors: 'Creditors',
    pettyCash: 'PettyCash',
    callReports: 'CallReports',
    projectReports: 'ProjectReports',
    painterQuotations: 'PainterQuotations',
    painterBillBalances: 'PainterBillBalances',
    painterParticipants: 'PainterParticipants',
    employees: 'Employees',
    customTabs: 'CustomTabs',
    customTabRows: 'CustomTabRows',
    transactions: 'Transactions',
    attendance: 'Attendance',
    leaves: 'Leaves',
    tasks: 'Tasks',
    savedReports: 'SavedReports'
  };

  const data = {};
  for (const [prop, tableName] of Object.entries(tables)) {
    try {
      data[prop] = db.prepare(`SELECT * FROM ${tableName}`).all();
    } catch (err) {
      console.warn(`[DB] Error fetching table ${tableName}:`, err.message);
      data[prop] = [];
    }
  }

  // Parse Settings into key-value map
  const sRows = db.prepare('SELECT Key, Value FROM Settings').all();
  data.settings = {};
  sRows.forEach(r => {
    data.settings[r.Key] = r.Value;
  });

  data.today = new Date().toISOString().slice(0, 10);
  return data;
}

// Generic Upsert Helper
function upsert(table, rowOrRows, primaryKey) {
  const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
  if (rows.length === 0) return true;

  const sample = rows[0];
  const keys = Object.keys(sample);
  const placeholders = keys.map(() => '?').join(', ');
  const updateCols = keys
    .filter(k => k !== primaryKey)
    .map(k => `"${k}" = excluded."${k}"`)
    .join(', ');

  const sql = `
    INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(', ')})
    VALUES (${placeholders})
    ON CONFLICT("${primaryKey}") DO UPDATE SET ${updateCols || `"${primaryKey}" = "${primaryKey}"`}
  `;

  const stmt = db.prepare(sql);
  const runBatch = db.transaction((items) => {
    for (const item of items) {
      const values = keys.map(k => {
        const val = item[k];
        if (val !== undefined && typeof val === 'object' && val !== null) {
          return JSON.stringify(val);
        }
        return val === undefined ? null : val;
      });
      stmt.run(...values);
    }
  });

  runBatch(rows);
  return true;
}

// Generic Delete Helper
function deleteRow(table, primaryKey, idValue) {
  const stmt = db.prepare(`DELETE FROM "${table}" WHERE "${primaryKey}" = ?`);
  return stmt.run(idValue);
}

// Backup Database
async function backupDatabase(destPath) {
  const targetDir = path.dirname(destPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return db.backup(destPath);
}

// Initialize on require
initSchema();

module.exports = {
  db,
  dbPath,
  initSchema,
  fetchAllAppData,
  upsert,
  deleteRow,
  backupDatabase
};
