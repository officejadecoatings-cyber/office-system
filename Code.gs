/**
 * Office System - Google Apps Script Backend
 * Lightweight 4-user Office Management System backed by Google Sheets & Google Drive.
 */

const DB_NAME = 'Office System Database';
const DRIVE_FOLDER_NAME = 'Office System Files';

const SCHEMA = {
  Settings: ['Key', 'Value'],
  Users: ['UserId', 'Name', 'Email', 'Role', 'Pin', 'Status', 'AllowedTabs', 'Avatar', 'NIC'],
  Customers: ['CustomerId', 'CustomerCode', 'Name', 'BusinessIdentifier', 'BillingAddress', 'DeliveryAddress', 'Email', 'Phone', 'CreditLimit', 'SalesOfficerId', 'SalesOfficerName', 'Notes', 'CreatedAt'],
  Inventory: ['ItemId', 'SKU', 'Name', 'Category', 'UnitPrice', 'StockQty', 'ReorderLevel', 'Unit', 'UpdatedAt'],
  Invoices: ['InvoiceId', 'InvoiceNo', 'CustomerId', 'CustomerName', 'Date', 'DueDate', 'Status', 'Subtotal', 'Discount', 'TaxAmount', 'Total', 'PaidAmount', 'Notes', 'CreatedBy', 'QuoteNo', 'SalesPerson', 'CustomerAddress', 'CustomerPhone', 'BankDetails', 'CompanyId', 'ChequeNo', 'ChequeBank', 'ChequeDate', 'ChequeAmount', 'RealisedDate', 'RealizedMonth', 'ReceiptNo', 'PaymentStatus', 'TokenAmount', 'ReturnAmount', 'DispatchStatus', 'DispatchedDate', 'DispatchedBy', 'PaymentsJson'],
  InvoiceItems: ['LineId', 'InvoiceId', 'ItemId', 'ItemName', 'Qty', 'UnitPrice', 'LineTotal', 'ItemCode', 'DiscountPercent'],
  CompanyProfiles: ['CompanyId', 'CompanyName', 'Address', 'Phone', 'Email', 'Website', 'BankName', 'Branch', 'AccountNo', 'Logo', 'IsDefault', 'InvoicePrefix', 'NextInvoiceNo', 'QuotePrefix', 'NextQuoteNo', 'CreatedAt'],
  Quotations: ['QuotationId', 'QuotationNo', 'Date', 'CustomerId', 'CustomerName', 'BillingAddress', 'Description', 'TotalAmount', 'Status', 'DataJson', 'CompanyId', 'CreatedBy', 'CreatedAt'],
  Creditors: ['CreditorId', 'SupplierName', 'BillNo', 'Date', 'DueDate', 'TotalAmount', 'PaidAmount', 'Status', 'Notes'],
  PettyCash: ['PcId', 'VoucherNo', 'Date', 'Type', 'Category', 'Description', 'PaidTo', 'ReceiptNo', 'Amount', 'RecordedBy'],
  CallReports: ['CallId', 'ReportType', 'DataJson', 'CreatedBy', 'CreatedAt'],
  ProjectReports: ['ProjId', 'DataJson', 'CreatedBy', 'CreatedAt'],
  PainterQuotations: ['QuotationId', 'QuotationNo', 'Date', 'Title', 'QuotationFor', 'Supplier', 'Receivers', 'Place', 'Time', 'TotalAmount', 'AdvanceAmount', 'RemainingAmount', 'ItemsJson', 'Status', 'CreatedBy', 'CreatedAt'],
  PainterBillBalances: ['BalanceId', 'ProgramName', 'Date', 'Description', 'Withdrawal', 'Deposit', 'Balance', 'CreatedBy', 'CreatedAt'],
  PainterParticipants: ['ParticipantId', 'ProgramName', 'Date', 'Name', 'Address', 'NIC', 'Phone', 'CreatedBy', 'CreatedAt'],
  Employees: ['EmpId', 'Name', 'UserName', 'Designation', 'Address', 'NIC', 'EpfEtfNo', 'DOB', 'Gender', 'Position', 'Email', 'Phone', 'EmergencyContactName', 'EmergencyContactPhone', 'JoinDate', 'Status', 'BankName', 'BankBranch', 'BankAccountNo', 'BiometricId'],
  CustomTabs: ['TabId', 'Name', 'Icon', 'ColumnsJson', 'CreatedBy', 'UpdatedAt'],
  CustomTabRows: ['RowId', 'TabId', 'DataJson', 'CreatedBy', 'CreatedAt'],
  Transactions: ['TxId', 'Date', 'Type', 'Category', 'Description', 'Amount', 'RefId', 'RecordedBy'],
  Attendance: ['AttId', 'UserId', 'UserName', 'Date', 'ClockIn', 'ClockOut', 'Status', 'Notes'],
  Leaves: ['LeaveId', 'UserId', 'UserName', 'Type', 'StartDate', 'EndDate', 'Days', 'Reason', 'Status', 'ApprovedBy'],
  Tasks: ['TaskId', 'Title', 'Project', 'AssigneeId', 'AssigneeName', 'DueDate', 'Priority', 'Status', 'Notes', 'CreatedAt'],
  SavedReports: ['ReportId', 'Name', 'Source', 'ConfigJson', 'CreatedBy', 'UpdatedAt']
};

/**
 * Serves the Web App HTML.
 */
function doGet(e) {
  ensureDatabase_();
  if (e && e.parameter && e.parameter.api === '1') {
    return ContentService.createTextOutput(JSON.stringify({ ok: true, status: 'Office System API Ready' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Office System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * JSON API endpoint for standalone / GitHub Pages frontend (solves Google multi-account issues permanently).
 */
function doPost(e) {
  try {
    ensureDatabase_();
    const payload = JSON.parse(e.postData.contents || '{}');
    const action = payload.action;
    const args = payload.args || [];
    const allowed = {
      getLoginUsers, authenticateUser, getAppData,
      saveCustomer, deleteCustomer,
      saveCompanyProfile, deleteCompanyProfile,
      saveQuotation, deleteQuotation,
      saveInventoryItem, deleteInventoryItem,
      saveInvoice, deleteInvoice, updateInvoicePayment, dispatchInvoice,
      saveCreditor, deleteCreditor,
      savePettyCash, deletePettyCash,
      saveReportEntry, deleteReportEntry, importReportEntries, clearReportEntries, saveCallReport, deleteCallReport,
      savePainterQuotation, deletePainterQuotation,
      savePainterBillBalance, deletePainterBillBalance, importPainterBillBalances,
      savePainterParticipant, deletePainterParticipant,
      saveEmployee, deleteEmployee,
      saveCustomTab, deleteCustomTab, saveCustomTabRow, deleteCustomTabRow, importCustomTabRows,
      saveTransaction, deleteTransaction,
      clockInUser, clockOutUser, saveLeaveRequest, updateLeaveStatus, deleteLeaveRequest,
      saveTask, deleteTask,
      saveSettings, saveUser,
      importRecords,
      saveCustomReport, deleteCustomReport, saveReportToDrive,
      setupAutoSyncTrigger, autoSyncDriveBackup,
      setupMidnightBackupTrigger, midnightDriveBackup
    };
    if (!allowed[action]) {
      throw new Error('Unknown API action: ' + action);
    }
    const result = allowed[action].apply(null, args);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, result: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message || String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Includes partial HTML files (Styles.html, Scripts.html).
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Manual setup entry point (optional, also runs automatically on first load).
 */
function setupDatabase() {
  const ss = ensureDatabase_();
  return 'Database ready: ' + ss.getUrl();
}

let _cachedSS = null;
let _dbEnsured = false;

/**
 * Gets or creates the bound/Drive Spreadsheet and Drive folder, and seeds initial data.
 */
function getSpreadsheet_() {
  if (_cachedSS) return _cachedSS;
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    _cachedSS = active;
    return _cachedSS;
  }

  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('SPREADSHEET_ID');
  if (savedId) {
    try {
      _cachedSS = SpreadsheetApp.openById(savedId);
      return _cachedSS;
    } catch (e) {
      // Fallback to search/create if deleted
    }
  }

  const files = DriveApp.getFilesByName(DB_NAME);
  if (files.hasNext()) {
    const file = files.next();
    props.setProperty('SPREADSHEET_ID', file.getId());
    _cachedSS = SpreadsheetApp.openById(file.getId());
    return _cachedSS;
  }

  const ss = SpreadsheetApp.create(DB_NAME);
  props.setProperty('SPREADSHEET_ID', ss.getId());
  _cachedSS = ss;
  return _cachedSS;
}

function getOrCreateDriveFolder_() {
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty('DRIVE_FOLDER_ID');
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {}
  }
  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) {
    const f = folders.next();
    props.setProperty('DRIVE_FOLDER_ID', f.getId());
    return f;
  }
  const created = DriveApp.createFolder(DRIVE_FOLDER_NAME);
  props.setProperty('DRIVE_FOLDER_ID', created.getId());
  return created;
}

function ensureDatabase_() {
  const ss = getSpreadsheet_();
  if (_dbEnsured) return ss;
  const existingSheets = {};
  ss.getSheets().forEach(s => { existingSheets[s.getName()] = s; });

  Object.keys(SCHEMA).forEach(name => {
    let sheet = existingSheets[name];
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]).setFontWeight('bold');
      sheet.setFrozenRows(1);
    } else {
      // Sync headers with current schema (especially for Employees & CustomTabs)
      const currentHeaders = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
      if (currentHeaders.length !== SCHEMA[name].length || !SCHEMA[name].every((h, idx) => currentHeaders[idx] === h)) {
        sheet.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]).setFontWeight('bold');
        sheet.setFrozenRows(1);
      }
    }
  });

  // Remove default empty Sheet1 if present and other sheets exist
  if (existingSheets['Sheet1'] && ss.getSheets().length > 1) {
    try { ss.deleteSheet(existingSheets['Sheet1']); } catch (e) {}
  }

  // Seed Settings if empty
  const settingsSheet = ss.getSheetByName('Settings');
  if (settingsSheet && settingsSheet.getLastRow() <= 1) {
    const folder = getOrCreateDriveFolder_();
    settingsSheet.getRange(2, 1, 7, 2).setValues([
      ['CompanyName', 'Jade Coatings (Pvt) Ltd'],
      ['Address', 'No. 321, Colombo Road, Negombo'],
      ['Phone', '+94 11 234 5678'],
      ['Email', 'info@jadecoatings.lk'],
      ['Currency', 'LKR'],
      ['TaxRate', '0'],
      ['DriveFolderUrl', folder.getUrl()]
    ]);
  }

  // Seed default CompanyProfile if empty
  const compSheet = ss.getSheetByName('CompanyProfiles');
  if (compSheet && compSheet.getLastRow() <= 1) {
    compSheet.getRange(2, 1, 1, 16).setValues([[
      'COMP-001',
      'Paint Zone (Pvt) Ltd',
      '424/1/B Kottunna Rd, Biyagama, Sri Lanka, (10350)',
      '(M): +(94)768760609 / (T): +(94)112468883',
      'info@colourmax.lk',
      'www.colourmax.lk',
      'COMMERCIAL BANK',
      'BATTARAMULLA',
      '1000982266',
      '',
      'Yes',
      'INV-',
      '1001',
      'QT-',
      '754',
      todayStr_()
    ]]);
  }

  // Seed 4 default users if empty
  const usersSheet = ss.getSheetByName('Users');
  if (usersSheet && usersSheet.getLastRow() <= 1) {
    usersSheet.getRange(2, 1, 4, 8).setValues([
      ['U-001', 'Admin User', 'admin@office.local', 'Admin', '1234', 'Active', 'all', ''],
      ['U-002', 'Staff Member 1', 'staff1@office.local', 'Staff', '1111', 'Active', 'dashboard,invoices,quotation,outstanding,settings', ''],
      ['U-003', 'Rashini Fernando', 'staff2@office.local', 'Staff', '2222', 'Active', 'callreport,projectreport,pettycash,settings', ''],
      ['U-004', 'Staff Member 3', 'staff3@office.local', 'Staff', '3333', 'Active', 'dashboard,invoices,quotation,outstanding,settings', '']
    ]);
  }

  _dbEnsured = true;
  return ss;
}

/* ============================================================================
 * Generic Sheet Helpers
 * ========================================================================== */

function readSheetObjects_(sheetName) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row.every(cell => cell === '' || cell === null)) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      let val = row[idx];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Colombo', 'yyyy-MM-dd');
      }
      obj[h] = val;
    });
    rows.push(obj);
  }
  return rows;
}

function appendRowObject_(sheetName, obj) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    ensureDatabase_();
    sheet = ss.getSheetByName(sheetName);
  }
  let headers = sheet.getDataRange().getValues()[0] || SCHEMA[sheetName];
  if (SCHEMA[sheetName]) {
    const missing = SCHEMA[sheetName].filter(h => headers.indexOf(h) === -1);
    if (missing.length > 0) {
      if (sheet.getMaxColumns() < headers.length + missing.length) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), (headers.length + missing.length) - sheet.getMaxColumns());
      }
      sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
      headers = sheet.getDataRange().getValues()[0];
    }
  }
  const row = headers.map(h => (obj[h] !== undefined && obj[h] !== null ? obj[h] : ''));
  sheet.appendRow(row);
  return obj;
}

function updateRowByKey_(sheetName, keyField, keyValue, updates) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    ensureDatabase_();
    sheet = ss.getSheetByName(sheetName);
  }
  let data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;
  let headers = data[0];

  // Auto-expand sheet headers if updates or SCHEMA defines columns missing from the sheet
  if (SCHEMA[sheetName]) {
    const missing = SCHEMA[sheetName].filter(h => headers.indexOf(h) === -1);
    if (missing.length > 0) {
      if (sheet.getMaxColumns() < headers.length + missing.length) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), (headers.length + missing.length) - sheet.getMaxColumns());
      }
      sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
      data = sheet.getDataRange().getValues();
      headers = data[0];
    }
  }

  const keyIdx = headers.indexOf(keyField);
  if (keyIdx === -1) return false;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][keyIdx]) === String(keyValue)) {
      const updatedRow = headers.map((h, idx) =>
        updates[h] !== undefined ? updates[h] : data[i][idx]
      );
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([updatedRow]);
      return true;
    }
  }
  return false;
}

function deleteRowByKey_(sheetName, keyField, keyValue) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;
  const headers = data[0];
  const keyIdx = headers.indexOf(keyField);
  if (keyIdx === -1) return false;

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][keyIdx]) === String(keyValue)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function upsertRowByKey_(sheetName, keyField, keyValue, record, fallbackPrefix) {
  if (keyValue) {
    const updated = updateRowByKey_(sheetName, keyField, keyValue, record);
    if (updated) return record;
  }
  if (!record[keyField]) {
    record[keyField] = nextId_(fallbackPrefix);
  }
  return appendRowObject_(sheetName, record);
}

function nextId_(prefix) {
  return prefix + '-' + Utilities.formatDate(new Date(), 'Asia/Colombo', 'yyMMddHHmmss') + '-' + Math.floor(100 + Math.random() * 900);
}

function todayStr_() {
  return Utilities.formatDate(new Date(), 'Asia/Colombo', 'yyyy-MM-dd');
}

function nowTimeStr_() {
  return Utilities.formatDate(new Date(), 'Asia/Colombo', 'HH:mm');
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* ============================================================================
 * Auth & Initial Load
 * ========================================================================== */

function getLoginUsers() {
  ensureDatabase_();
  const users = readSheetObjects_('Users').filter(u => u.Status === 'Active');
  return users.map(u => ({
    UserId: u.UserId,
    Name: ((u.Email === 'staff2@office.local' || u.UserId === 'U-003') && (!u.Name || u.Name === 'Staff Member 2')) ? 'Rashini Fernando' : u.Name,
    Email: u.Email,
    Role: u.Role
  }));
}

function authenticateUser(userId, pin) {
  const users = readSheetObjects_('Users');
  const user = users.find(u => u.UserId === userId && u.Status === 'Active');
  if (!user) throw new Error('User not found or inactive.');
  if (String(user.Pin) !== String(pin)) throw new Error('Invalid PIN.');

  let name = user.Name;
  if ((user.Email === 'staff2@office.local' || user.UserId === 'U-003') && (!name || name === 'Staff Member 2')) {
    name = 'Rashini Fernando';
  }
  let allowed = user.AllowedTabs || '';
  if (user.Email === 'staff2@office.local' && !allowed) {
    allowed = 'callreport,projectreport,pettycash,settings';
  } else if (allowed && !allowed.toLowerCase().includes('settings')) {
    allowed += ',settings';
  }

  return {
    user: {
      UserId: user.UserId,
      Name: name,
      Email: user.Email,
      Role: user.Role,
      AllowedTabs: allowed,
      Avatar: user.Avatar || '',
      NIC: user.NIC || ''
    },
    data: getAppData()
  };
}

function getAppData() {
  ensureDatabase_();
  const ss = getSpreadsheet_();
  const allSheets = ss.getSheets();
  const sheetsMap = {};
  allSheets.forEach(s => { sheetsMap[s.getName()] = s; });

  const tz = Session.getScriptTimeZone() || 'Asia/Colombo';

  function readFromSheet(sheetName) {
    const sheet = sheetsMap[sheetName];
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    if (!data || data.length <= 1) return [];
    const headers = data[0];
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.every(cell => cell === '' || cell === null)) continue;
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        let val = row[j];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
        }
        obj[headers[j]] = val;
      }
      rows.push(obj);
    }
    return rows;
  }

  function dedupeRows_(rows, keyField) {
    if (!Array.isArray(rows)) return [];
    const seen = new Set();
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const k = (r[keyField] || '').toString().trim().toLowerCase();
      if (k) {
        if (seen.has(k)) continue;
        seen.add(k);
      }
      out.push(r);
    }
    return out;
  }

  const settingsRows = readFromSheet('Settings');
  const settings = {};
  settingsRows.forEach(r => { settings[r.Key] = r.Value; });
  if (!settings['SupabaseUrl']) {
    settings['SupabaseUrl'] = 'https://ftucnvtpmkftjzoobrfq.supabase.co';
    settings['SupabaseKey'] = 'sb_publishable_T4O1XsAawck_ix9z_acpdA_EWcNkJtR';
    settings['UseSupabase'] = 'Yes';
  }

  return {
    settings: settings,
    users: dedupeRows_(readFromSheet('Users').map(u => {
      let name = u.Name;
      if ((u.Email === 'staff2@office.local' || u.UserId === 'U-003') && (!name || name === 'Staff Member 2')) {
        name = 'Rashini Fernando';
      }
      let allowed = u.AllowedTabs || '';
      if (u.Email === 'staff2@office.local' && !allowed) {
        allowed = 'callreport,projectreport,pettycash,settings';
      } else if (allowed && !allowed.toLowerCase().includes('settings')) {
        allowed += ',settings';
      }
      return {
        UserId: u.UserId,
        Name: name,
        Email: u.Email,
        Role: u.Role,
        Status: u.Status,
        AllowedTabs: allowed,
        Avatar: u.Avatar || '',
        NIC: u.NIC || ''
      };
    }), 'Email'),
    customers: dedupeRows_(readFromSheet('Customers'), 'CustomerId'),
    inventory: dedupeRows_(readFromSheet('Inventory'), 'ItemId'),
    invoices: dedupeRows_(readFromSheet('Invoices'), 'InvoiceId'),
    invoiceItems: readFromSheet('InvoiceItems'),
    creditors: readFromSheet('Creditors'),
    pettyCash: readFromSheet('PettyCash'),
    callReports: readFromSheet('CallReports'),
    projectReports: readFromSheet('ProjectReports'),
    painterQuotations: readFromSheet('PainterQuotations'),
    painterBillBalances: readFromSheet('PainterBillBalances'),
    painterParticipants: dedupeRows_(readFromSheet('PainterParticipants'), 'ParticipantId'),
    employees: dedupeRows_(readFromSheet('Employees'), 'EmployeeId'),
    customTabs: readFromSheet('CustomTabs'),
    customTabRows: readFromSheet('CustomTabRows'),
    transactions: readFromSheet('Transactions'),
    attendance: readFromSheet('Attendance'),
    leaves: readFromSheet('Leaves'),
    tasks: readFromSheet('Tasks'),
    savedReports: readFromSheet('SavedReports'),
    companyProfiles: dedupeRows_(readFromSheet('CompanyProfiles'), 'CompanyId'),
    quotations: dedupeRows_(readFromSheet('Quotations'), 'QuotationId'),
    today: todayStr_()
  };
}

/* ============================================================================
 * Customers (CRM)
 * ========================================================================== */

function saveCustomer(customer) {
  return withLock_(() => {
    customer.CreditLimit = Number(customer.CreditLimit) || 0;
    customer.CustomerCode = customer.CustomerCode || ('C-' + Math.floor(1000 + Math.random() * 9000));
    customer.CreatedAt = customer.CreatedAt || todayStr_();
    return upsertRowByKey_('Customers', 'CustomerId', customer.CustomerId, customer, 'CUS');
  });
}

function deleteCustomer(customerId) {
  return withLock_(() => deleteRowByKey_('Customers', 'CustomerId', customerId));
}

/* ============================================================================
 * Inventory & Stock
 * ========================================================================== */

function saveInventoryItem(item) {
  return withLock_(() => {
    item.UnitPrice = Number(item.UnitPrice) || 0;
    item.StockQty = Number(item.StockQty) || 0;
    item.ReorderLevel = Number(item.ReorderLevel) || 0;
    item.UpdatedAt = todayStr_();
    return upsertRowByKey_('Inventory', 'ItemId', item.ItemId, item, 'ITM');
  });
}

function deleteInventoryItem(itemId) {
  return withLock_(() => deleteRowByKey_('Inventory', 'ItemId', itemId));
}

/* ============================================================================
 * Invoicing, Orders & Stock Adjustment
 * ========================================================================== */

function saveInvoice(payload) {
  return withLock_(() => {
    const invoice = payload.invoice;
    const items = payload.items || [];
    const existing = readSheetObjects_('Invoices');
    const isExisting = invoice.InvoiceId && existing.some(i => String(i.InvoiceId).trim() === String(invoice.InvoiceId).trim());
    const isNew = !isExisting;

    if (isNew) {
      if (!invoice.InvoiceId || !invoice.InvoiceId.startsWith('INV-') || invoice.InvoiceId.length > 25) {
        invoice.InvoiceId = nextId_('INV');
      }
      invoice.InvoiceNo = invoice.InvoiceNo || ('INV-' + String(existing.length + 1001));
    } else {
      // Restore stock from old items if old invoice wasn't Draft/Cancelled
      const oldInv = existing.find(i => String(i.InvoiceId).trim() === String(invoice.InvoiceId).trim());
      const oldItems = readSheetObjects_('InvoiceItems').filter(li => String(li.InvoiceId).trim() === String(invoice.InvoiceId).trim());
      // If old invoice was dispatched, refund stock before re-evaluating
      if (oldInv && oldInv.Status !== 'Draft' && oldInv.Status !== 'Cancelled' && oldInv.DispatchStatus !== 'Not Dispatched') {
        adjustInventoryStock_(oldItems, +1);
      }
      // Delete old line items
      const ss = getSpreadsheet_();
      const liSheet = ss.getSheetByName('InvoiceItems');
      const liData = liSheet.getDataRange().getValues();
      for (let i = liData.length - 1; i >= 1; i--) {
        if (String(liData[i][1]) === String(invoice.InvoiceId)) {
          liSheet.deleteRow(i + 1);
        }
      }
    }

    // Default DispatchStatus to 'Dispatched' if not set, respecting [DISPATCH:Not Dispatched] in Notes
    if (!invoice.DispatchStatus) {
      if (invoice.Notes && invoice.Notes.includes('[DISPATCH:Not Dispatched]')) {
        invoice.DispatchStatus = 'Not Dispatched';
      } else {
        invoice.DispatchStatus = 'Dispatched';
      }
    } else if (invoice.Notes && invoice.Notes.includes('[DISPATCH:Not Dispatched]')) {
      invoice.DispatchStatus = 'Not Dispatched';
    }
    if (invoice.DispatchStatus === 'Dispatched' && !invoice.DispatchedDate) {
      invoice.DispatchedDate = invoice.Date || todayStr_();
    }

    // Save invoice header
    if (isNew) {
      appendRowObject_('Invoices', invoice);
    } else {
      updateRowByKey_('Invoices', 'InvoiceId', invoice.InvoiceId, invoice);
    }

    // Save line items
    items.forEach(li => {
      li.LineId = nextId_('LN');
      li.InvoiceId = invoice.InvoiceId;
      li.Qty = Number(li.Qty) || 0;
      li.UnitPrice = Number(li.UnitPrice) || 0;
      li.DiscountPercent = Number(li.DiscountPercent) || 0;
      const sub = li.Qty * li.UnitPrice;
      li.LineTotal = Math.round((sub - (sub * (li.DiscountPercent / 100))) * 100) / 100;
      li.ItemCode = li.ItemCode || '';
      appendRowObject_('InvoiceItems', li);
    });

    // Deduct stock ONLY if active AND DispatchStatus is Dispatched
    if (invoice.Status !== 'Draft' && invoice.Status !== 'Cancelled' && invoice.DispatchStatus !== 'Not Dispatched') {
      adjustInventoryStock_(items, -1);
    }

    // Auto-record Income transaction when Paid (if not already recorded)
    if (invoice.Status === 'Paid') {
      const txs = readSheetObjects_('Transactions');
      const alreadyRecorded = txs.some(t => t.RefId === invoice.InvoiceId);
      if (!alreadyRecorded) {
        appendRowObject_('Transactions', {
          TxId: nextId_('TX'),
          Date: todayStr_(),
          Type: 'Income',
          Category: 'Sales / Invoice',
          Description: 'Payment for ' + invoice.InvoiceNo + ' (' + (invoice.CustomerName || 'Customer') + ')',
          Amount: Number(invoice.Total) || 0,
          RefId: invoice.InvoiceId,
          RecordedBy: invoice.CreatedBy || 'System'
        });
      }
    }

    return invoice;
  });
}

function adjustInventoryStock_(items, multiplier) {
  const inventory = readSheetObjects_('Inventory');
  items.forEach(li => {
    let invItem = null;
    const lnDesc = String(li.ItemName || li.Description || '').trim().toLowerCase();
    const lnCode = String(li.ItemCode || li.SKU || '').trim().toLowerCase();
    const lnId = String(li.ItemId || '').trim();

    if (lnId) {
      invItem = inventory.find(x => String(x.ItemId).trim() === lnId);
    }
    if (!invItem && lnDesc && lnCode) {
      invItem = inventory.find(x => 
        String(x.Name || '').trim().toLowerCase() === lnDesc &&
        String(x.SKU || '').trim().toLowerCase() === lnCode
      );
    }
    if (!invItem && lnDesc) {
      invItem = inventory.find(x => String(x.Name || '').trim().toLowerCase() === lnDesc);
    }
    if (!invItem && lnCode) {
      invItem = inventory.find(x => String(x.SKU || '').trim().toLowerCase() === lnCode);
    }
    if (invItem) {
      const newQty = Math.max(0, (Number(invItem.StockQty) || 0) + (multiplier * (Number(li.Qty) || 0)));
      invItem.StockQty = newQty;
      updateRowByKey_('Inventory', 'ItemId', invItem.ItemId, {
        StockQty: newQty,
        UpdatedAt: todayStr_()
      });
    }
  });
}

function updateInvoicePayment(payload) {
  return withLock_(() => {
    const invId = payload.InvoiceId;
    if (!invId) throw new Error('InvoiceId required');
    const updates = {
      ChequeNo: payload.ChequeNo || '',
      ChequeBank: payload.ChequeBank || '',
      ChequeDate: payload.ChequeDate || '',
      ChequeAmount: Number(payload.ChequeAmount) || 0,
      PaidAmount: Number(payload.RealisedAmount) || Number(payload.PaidAmount) || 0,
      RealisedDate: payload.RealisedDate || '',
      RealizedMonth: payload.RealizedMonth || '',
      ReceiptNo: payload.ReceiptNo || '',
      PaymentStatus: payload.PaymentStatus || 'Unpaid'
    };
    if (payload.TokenAmount !== undefined) updates.TokenAmount = Number(payload.TokenAmount) || 0;
    if (payload.ReturnAmount !== undefined) updates.ReturnAmount = Number(payload.ReturnAmount) || 0;
    if (payload.Status) updates.Status = payload.Status;
    if (payload.Total !== undefined) updates.Total = Number(payload.Total) || 0;
    if (payload.PaymentsJson) {
      updates.PaymentsJson = typeof payload.PaymentsJson === 'string' ? payload.PaymentsJson : JSON.stringify(payload.PaymentsJson);
    }
    updateRowByKey_('Invoices', 'InvoiceId', invId, updates);
    return updates;
  });
}

function dispatchInvoice(invoiceId, dispatchedDate, dispatchedBy, notes) {
  return withLock_(() => {
    const inv = readSheetObjects_('Invoices').find(i => i.InvoiceId === invoiceId);
    if (!inv) throw new Error('Invoice not found: ' + invoiceId);
    if (inv.DispatchStatus === 'Dispatched') return inv;

    const items = readSheetObjects_('InvoiceItems').filter(li => String(li.InvoiceId).trim() === String(invoiceId).trim());
    adjustInventoryStock_(items, -1);

    const cleanedNotes = (inv.Notes || '').replace(/\[DISPATCH:Not Dispatched\]/g, '').trim();
    const updates = {
      DispatchStatus: 'Dispatched',
      DispatchedDate: dispatchedDate || todayStr_(),
      DispatchedBy: dispatchedBy || '',
      Notes: [cleanedNotes, notes ? 'Dispatch: ' + notes : ''].filter(Boolean).join(' | ')
    };
    updateRowByKey_('Invoices', 'InvoiceId', invoiceId, updates);
    return Object.assign({}, inv, updates);
  });
}

function deleteInvoice(invoiceId) {
  return withLock_(() => {
    const oldInv = readSheetObjects_('Invoices').find(i => i.InvoiceId === invoiceId);
    const oldItems = readSheetObjects_('InvoiceItems').filter(li => li.InvoiceId === invoiceId);
    if (oldInv && oldInv.Status !== 'Draft' && oldInv.Status !== 'Cancelled' && oldInv.DispatchStatus !== 'Not Dispatched') {
      adjustInventoryStock_(oldItems, +1);
    }
    const ss = getSpreadsheet_();
    const liSheet = ss.getSheetByName('InvoiceItems');
    const liData = liSheet.getDataRange().getValues();
    for (let i = liData.length - 1; i >= 1; i--) {
      if (String(liData[i][1]) === String(invoiceId)) {
        liSheet.deleteRow(i + 1);
      }
    }
    return deleteRowByKey_('Invoices', 'InvoiceId', invoiceId);
  });
}

/* ============================================================================
 * Creditors (Payables) & Petty Cash & Employees & Template Reports
 * ========================================================================== */

function saveCreditor(cred) {
  return withLock_(() => {
    cred.TotalAmount = Number(cred.TotalAmount) || 0;
    cred.PaidAmount = Number(cred.PaidAmount) || 0;
    cred.Status = cred.PaidAmount >= cred.TotalAmount ? 'Paid' : (cred.PaidAmount > 0 ? 'Partial' : 'Pending');
    return upsertRowByKey_('Creditors', 'CreditorId', cred.CreditorId, cred, 'CRD');
  });
}

function deleteCreditor(id) {
  return withLock_(() => deleteRowByKey_('Creditors', 'CreditorId', id));
}

function savePettyCash(pc) {
  return withLock_(() => {
    pc.Amount = Number(pc.Amount) || 0;
    pc.Date = pc.Date || todayStr_();
    if (!pc.VoucherNo) {
      const existing = readSheetObjects_('PettyCash');
      pc.VoucherNo = 'PCV-' + String(existing.length + 1001);
    }
    return upsertRowByKey_('PettyCash', 'PcId', pc.PcId, pc, 'PC');
  });
}

function deletePettyCash(id) {
  return withLock_(() => deleteRowByKey_('PettyCash', 'PcId', id));
}

function saveEmployee(emp) {
  return withLock_(() => {
    emp.Status = emp.Status || 'Active';
    emp.Gender = emp.Gender || 'Male';
    emp.Position = emp.Position || 'Office Staff';
    emp.UserName = emp.UserName || '';
    return upsertRowByKey_('Employees', 'EmpId', emp.EmpId, emp, 'EMP');
  });
}

function deleteEmployee(id) {
  return withLock_(() => deleteRowByKey_('Employees', 'EmpId', id));
}

function saveCallReport(entry) {
  return saveReportEntry('CallReports', entry);
}

function deleteCallReport(id) {
  return deleteReportEntry('CallReports', id);
}

function saveReportEntry(sheetName, entry) {
  const keyField = sheetName === 'CallReports' ? 'CallId' : 'ProjId';
  const prefix = sheetName === 'CallReports' ? 'CALL' : 'PRJ';
  return withLock_(() => {
    entry.CreatedAt = entry.CreatedAt || todayStr_();
    return upsertRowByKey_(sheetName, keyField, entry[keyField], entry, prefix);
  });
}

function deleteReportEntry(sheetName, id) {
  const keyField = sheetName === 'CallReports' ? 'CallId' : 'ProjId';
  return withLock_(() => deleteRowByKey_(sheetName, keyField, id));
}

function clearReportEntries(sheetName) {
  return withLock_(() => {
    const ss = getSpreadsheet_();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { cleared: 0 };
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
    return { cleared: lastRow > 1 ? lastRow - 1 : 0 };
  });
}

function importReportEntries(sheetName, rows, createdBy, reportType) {
  const keyField = sheetName === 'CallReports' ? 'CallId' : 'ProjId';
  const prefix = sheetName === 'CallReports' ? 'CALL' : 'PRJ';
  return withLock_(() => {
    const ss = getSpreadsheet_();
    const sheet = ss.getSheetByName(sheetName);
    const today = todayStr_();
    const stamp = Utilities.formatDate(new Date(), 'Asia/Colombo', 'yyMMddHHmmss');
    const headers = SCHEMA[sheetName];
    const values = rows.map((r, idx) => {
      const obj = {
        [keyField]: prefix + '-' + stamp + '-' + (idx + 1),
        ReportType: reportType || r.ReportType || '',
        DataJson: JSON.stringify(r),
        CreatedBy: createdBy || 'System',
        CreatedAt: today
      };
      return headers.map(h => (obj[h] !== undefined && obj[h] !== null ? obj[h] : ''));
    });
    if (values.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
    }
    return { imported: values.length };
  });
}

function savePainterQuotation(entry) {
  return withLock_(() => {
    entry.CreatedAt = entry.CreatedAt || todayStr_();
    const res = upsertRowByKey_('PainterQuotations', 'QuotationId', entry.QuotationId, entry, 'PTQ');
    if (!res.QuotationNo) res.QuotationNo = res.QuotationId;
    return res;
  });
}

function deletePainterQuotation(id) {
  return withLock_(() => deleteRowByKey_('PainterQuotations', 'QuotationId', id));
}

function savePainterBillBalance(entry) {
  return withLock_(() => {
    entry.CreatedAt = entry.CreatedAt || todayStr_();
    return upsertRowByKey_('PainterBillBalances', 'BalanceId', entry.BalanceId, entry, 'PBB');
  });
}

function deletePainterBillBalance(id) {
  return withLock_(() => deleteRowByKey_('PainterBillBalances', 'BalanceId', id));
}

function savePainterParticipant(entry) {
  return withLock_(() => {
    const existing = readSheetRows_('PainterParticipants');
    const isExisting = entry.ParticipantId && existing.some(p => String(p.ParticipantId) === String(entry.ParticipantId));
    if (isExisting) {
      updateRowByKey_('PainterParticipants', 'ParticipantId', entry.ParticipantId, entry);
      return entry;
    }
    entry.ParticipantId = entry.ParticipantId || nextId_('PTP');
    entry.CreatedAt = entry.CreatedAt || todayStr_();
    return appendRowObject_('PainterParticipants', entry);
  });
}

function deletePainterParticipant(id) {
  return withLock_(() => deleteRowByKey_('PainterParticipants', 'ParticipantId', id));
}

function importPainterBillBalances(rows, createdBy) {
  return withLock_(() => {
    const ss = getSpreadsheet_();
    const sheet = ss.getSheetByName('PainterBillBalances');
    const today = todayStr_();
    const stamp = Utilities.formatDate(new Date(), 'Asia/Colombo', 'yyMMddHHmmss');
    const headers = SCHEMA.PainterBillBalances;
    const values = rows.map((r, idx) => {
      const obj = {
        BalanceId: 'PBB-' + stamp + '-' + (idx + 1),
        ProgramName: r.ProgramName || '',
        Date: r.Date || today,
        Description: r.Description || '',
        Withdrawal: Number(r.Withdrawal || 0),
        Deposit: Number(r.Deposit || 0),
        Balance: Number(r.Balance || 0),
        CreatedBy: createdBy || 'System',
        CreatedAt: today
      };
      return headers.map(h => (obj[h] !== undefined && obj[h] !== null ? obj[h] : ''));
    });
    if (values.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
    }
    return { imported: values.length };
  });
}

function saveCustomTab(tab) {
  return withLock_(() => {
    tab.UpdatedAt = todayStr_();
    tab.Icon = tab.Icon || '📋';
    return upsertRowByKey_('CustomTabs', 'TabId', tab.TabId, tab, 'TAB');
  });
}

function deleteCustomTab(tabId) {
  return withLock_(() => {
    const ss = getSpreadsheet_();
    const rowSheet = ss.getSheetByName('CustomTabRows');
    const data = rowSheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][1]) === String(tabId)) {
        rowSheet.deleteRow(i + 1);
      }
    }
    return deleteRowByKey_('CustomTabs', 'TabId', tabId);
  });
}

function saveCustomTabRow(row) {
  return withLock_(() => {
    row.CreatedAt = row.CreatedAt || todayStr_();
    return upsertRowByKey_('CustomTabRows', 'RowId', row.RowId, row, 'CTR');
  });
}

function deleteCustomTabRow(rowId) {
  return withLock_(() => deleteRowByKey_('CustomTabRows', 'RowId', rowId));
}

function importCustomTabRows(tabId, rows, createdBy) {
  return withLock_(() => {
    const ss = getSpreadsheet_();
    const sheet = ss.getSheetByName('CustomTabRows');
    const today = todayStr_();
    const stamp = Utilities.formatDate(new Date(), 'Asia/Colombo', 'yyMMddHHmmss');
    const values = rows.map((r, idx) => [
      'CTR-' + stamp + '-' + (idx + 1),
      tabId,
      JSON.stringify(r),
      createdBy || 'System',
      today
    ]);
    if (values.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, values.length, 5).setValues(values);
    }
    return { imported: values.length };
  });
}

/* ============================================================================
 * Accounts (Income & Expenses)
 * ========================================================================== */

function saveTransaction(tx) {
  return withLock_(() => {
    tx.Amount = Number(tx.Amount) || 0;
    tx.Date = tx.Date || todayStr_();
    return upsertRowByKey_('Transactions', 'TxId', tx.TxId, tx, 'TX');
  });
}

function deleteTransaction(txId) {
  return withLock_(() => deleteRowByKey_('Transactions', 'TxId', txId));
}

/* ============================================================================
 * Attendance & Leave
 * ========================================================================== */

function clockInUser(userId, userName) {
  return withLock_(() => {
    const today = todayStr_();
    const existing = readSheetObjects_('Attendance').find(a => a.UserId === userId && a.Date === today);
    if (existing) return existing;

    const now = nowTimeStr_();
    const status = now > '09:15' ? 'Late' : 'Present';
    return appendRowObject_('Attendance', {
      AttId: nextId_('ATT'),
      UserId: userId,
      UserName: userName,
      Date: today,
      ClockIn: now,
      ClockOut: '',
      Status: status,
      Notes: ''
    });
  });
}

function clockOutUser(userId) {
  return withLock_(() => {
    const today = todayStr_();
    const existing = readSheetObjects_('Attendance').find(a => a.UserId === userId && a.Date === today);
    if (!existing) throw new Error('No clock-in record found for today.');
    const now = nowTimeStr_();
    updateRowByKey_('Attendance', 'AttId', existing.AttId, { ClockOut: now });
    existing.ClockOut = now;
    return existing;
  });
}

function saveLeaveRequest(leave) {
  return withLock_(() => {
    leave.Days = Number(leave.Days) || 1;
    leave.Status = 'Approved';
    leave.ApprovedBy = leave.ApprovedBy || 'System';
    return upsertRowByKey_('Leaves', 'LeaveId', leave.LeaveId, leave, 'LV');
  });
}

function updateLeaveStatus(leaveId, status, approvedBy) {
  return withLock_(() => {
    return updateRowByKey_('Leaves', 'LeaveId', leaveId, {
      Status: status,
      ApprovedBy: approvedBy
    });
  });
}

function deleteLeaveRequest(leaveId) {
  return withLock_(() => deleteRowByKey_('Leaves', 'LeaveId', leaveId));
}

/* ============================================================================
 * Tasks & Projects
 * ========================================================================== */

function saveTask(task) {
  return withLock_(() => {
    task.CreatedAt = task.CreatedAt || todayStr_();
    return upsertRowByKey_('Tasks', 'TaskId', task.TaskId, task, 'TSK');
  });
}

function deleteTask(taskId) {
  return withLock_(() => deleteRowByKey_('Tasks', 'TaskId', taskId));
}

/* ============================================================================
 * Settings & Users (4-User Management)
 * ========================================================================== */

function saveSettings(settingsObj) {
  return withLock_(() => {
    Object.keys(settingsObj).forEach(key => {
      const updated = updateRowByKey_('Settings', 'Key', key, { Value: settingsObj[key] });
      if (!updated) {
        appendRowObject_('Settings', { Key: key, Value: settingsObj[key] });
      }
    });
    return true;
  });
}

function saveUser(user) {
  return withLock_(() => {
    const existing = readSheetObjects_('Users');
    const isExisting = user.UserId && existing.some(u => String(u.UserId).trim() === String(user.UserId).trim());
    if (isExisting) {
      const updates = {
        Name: user.Name,
        Email: user.Email,
        Role: user.Role,
        Status: user.Status
      };
      if (user.Pin !== undefined && user.Pin !== '') updates.Pin = user.Pin;
      if (user.AllowedTabs !== undefined) updates.AllowedTabs = user.AllowedTabs;
      if (user.Avatar !== undefined) updates.Avatar = user.Avatar;
      if (user.NIC !== undefined) updates.NIC = user.NIC;
      updateRowByKey_('Users', 'UserId', user.UserId, updates);
      return user;
    }
    // New user or client user not yet in sheet
    user.UserId = user.UserId || nextId_('U');
    user.Pin = user.Pin || '1234';
    user.Status = user.Status || 'Active';
    user.AllowedTabs = user.AllowedTabs || '';
    user.Avatar = user.Avatar || '';
    user.NIC = user.NIC || '';
    return appendRowObject_('Users', user);
  });
}

/* ============================================================================
 * Bulk Excel / CSV Import
 * ========================================================================== */

function importRecords(tableName, rows) {
  const allowed = {
    Customers: { prefix: 'CUS', dateField: 'CreatedAt' },
    Inventory: { prefix: 'ITM', dateField: 'UpdatedAt' },
    Employees: { prefix: 'EMP', dateField: 'JoinDate' },
    Transactions: { prefix: 'TX', dateField: null },
    Invoices: { prefix: 'INV', dateField: null },
    PettyCash: { prefix: 'PC', dateField: null },
    Attendance: { prefix: 'ATT', dateField: null },
    Tasks: { prefix: 'TSK', dateField: 'CreatedAt' }
  };

  const cfg = allowed[tableName];
  if (!cfg) throw new Error('Unsupported import table: ' + tableName);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('No rows to import.');

  return withLock_(() => {
    const ss = getSpreadsheet_();
    const sheet = ss.getSheetByName(tableName);
    const headers = SCHEMA[tableName];
    const idField = headers[0];
    const today = todayStr_();
    const stamp = Utilities.formatDate(new Date(), 'Asia/Colombo', 'yyMMddHHmmss');

    const values = rows.map((r, idx) => {
      const obj = Object.assign({}, r);
      if (!obj[idField]) {
        obj[idField] = cfg.prefix + '-' + stamp + '-' + (idx + 1);
      }
      if (cfg.dateField && !obj[cfg.dateField]) {
        obj[cfg.dateField] = today;
      }
      if (tableName === 'Inventory') {
        obj.UnitPrice = Number(obj.UnitPrice) || 0;
        obj.StockQty = Number(obj.StockQty) || 0;
        obj.ReorderLevel = Number(obj.ReorderLevel) || 5;
        obj.Unit = obj.Unit || 'pcs';
      } else if (tableName === 'Transactions') {
        obj.Date = obj.Date || today;
        obj.Type = obj.Type || 'Expense';
        obj.Amount = Number(obj.Amount) || 0;
      } else if (tableName === 'Invoices') {
        obj.InvoiceNo = obj.InvoiceNo || ('IMP-' + (idx + 1001));
        obj.Date = obj.Date || today;
        obj.Status = obj.Status || 'Paid';
        obj.Total = Number(obj.Total) || 0;
        obj.Subtotal = Number(obj.Subtotal) || obj.Total;
        obj.TaxAmount = Number(obj.TaxAmount) || 0;
      } else if (tableName === 'Tasks') {
        obj.Priority = obj.Priority || 'Medium';
        obj.Status = obj.Status || 'To Do';
      }
      return headers.map(h => (obj[h] !== undefined && obj[h] !== null ? obj[h] : ''));
    });

    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, values.length, headers.length).setValues(values);
    return { imported: values.length };
  });
}

/* ============================================================================
 * Custom Reports & 5-Minute Google Drive Auto-Sync
 * ========================================================================== */

function saveCustomReport(report) {
  return withLock_(() => {
    report.UpdatedAt = todayStr_();
    if (report.ReportId) {
      updateRowByKey_('SavedReports', 'ReportId', report.ReportId, report);
      return report;
    }
    report.ReportId = nextId_('RPT');
    return appendRowObject_('SavedReports', report);
  });
}

function deleteCustomReport(reportId) {
  return withLock_(() => deleteRowByKey_('SavedReports', 'ReportId', reportId));
}

function saveReportToDrive(filename, csvContent) {
  const folder = getOrCreateDriveFolder_();
  const file = folder.createFile(filename, csvContent, MimeType.CSV);
  return { name: file.getName(), url: file.getUrl() };
}

/**
 * Installs a 5-minute time-based trigger to auto-sync backups to Google Drive.
 * Run once from Apps Script editor or via Settings > Enable 5-Min Drive Auto-Sync.
 */
function saveCompanyProfile(comp) {
  return withLock_(() => {
    const existing = readSheetObjects_('CompanyProfiles');
    const isExisting = comp.CompanyId && existing.some(c => String(c.CompanyId).trim() === String(comp.CompanyId).trim());
    if (isExisting) {
      if (comp.IsDefault === 'Yes') {
        existing.forEach(c => {
          if (String(c.CompanyId).trim() !== String(comp.CompanyId).trim() && c.IsDefault === 'Yes') {
            c.IsDefault = 'No';
            updateRowByKey_('CompanyProfiles', 'CompanyId', c.CompanyId, c);
          }
        });
      }
      updateRowByKey_('CompanyProfiles', 'CompanyId', comp.CompanyId, comp);
      return comp;
    }
    // New company profile or client-seeded ID
    if (!comp.CompanyId || comp.CompanyId.length > 20) {
      comp.CompanyId = nextId_('COMP');
    }
    comp.CreatedAt = comp.CreatedAt || todayStr_();
    if (existing.length === 0 || comp.IsDefault === 'Yes') {
      comp.IsDefault = 'Yes';
      existing.forEach(c => {
        if (c.IsDefault === 'Yes') {
          c.IsDefault = 'No';
          updateRowByKey_('CompanyProfiles', 'CompanyId', c.CompanyId, c);
        }
      });
    } else {
      comp.IsDefault = comp.IsDefault || 'No';
    }
    appendRowObject_('CompanyProfiles', comp);
    return comp;
  });
}

function deleteCompanyProfile(id) {
  return withLock_(() => {
    return deleteRowByKey_('CompanyProfiles', 'CompanyId', id);
  });
}

function saveQuotation(q) {
  return withLock_(() => {
    q.Date = q.Date || todayStr_();
    q.CreatedAt = q.CreatedAt || todayStr_();
    if (!q.QuotationNo) {
      const existing = readSheetObjects_('Quotations');
      const nums = existing.map(x => {
        const m = String(x.QuotationNo || '').match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
      }).filter(n => !isNaN(n) && n > 0);
      const nextNum = nums.length ? Math.max(...nums) + 1 : (existing.length + 754);
      q.QuotationNo = String(nextNum);
    }
    return upsertRowByKey_('Quotations', 'QuotationId', q.QuotationId, q, 'QUOT');
  });
}

function deleteQuotation(id) {
  return withLock_(() => {
    return deleteRowByKey_('Quotations', 'QuotationId', id);
  });
}

function setupMidnightBackupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'midnightDriveBackup') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('midnightDriveBackup')
    .timeBased()
    .atHour(0)
    .everyDays(1)
    .inTimezone(Session.getScriptTimeZone() || 'Asia/Colombo')
    .create();
  return 'Daily Midnight 12:00 AM Google Drive backup trigger enabled.';
}

function midnightDriveBackup() {
  ensureDatabase_();
  const folder = getOrCreateDriveFolder_();
  const snapshot = getAppData();
  const content = JSON.stringify(snapshot, null, 2);
  const dateStr = Utilities.formatDate(new Date(), 'Asia/Colombo', 'yyyy-MM-dd');
  const backupName = 'Office_System_Backup_' + dateStr + '.json';
  folder.createFile(backupName, content, MimeType.PLAIN_TEXT);

  // Also update latest snapshot
  const latestFiles = folder.getFilesByName('Office_System_AutoSync_Backup.json');
  if (latestFiles.hasNext()) {
    latestFiles.next().setContent(content);
  } else {
    folder.createFile('Office_System_AutoSync_Backup.json', content, MimeType.PLAIN_TEXT);
  }

  const syncTime = Utilities.formatDate(new Date(), 'Asia/Colombo', 'yyyy-MM-dd HH:mm:ss');
  saveSettings({ LastDriveBackup: syncTime });
  return syncTime;
}

function setupAutoSyncTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'autoSyncDriveBackup') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('autoSyncDriveBackup')
    .timeBased()
    .everyMinutes(5)
    .create();
  return '5-minute Google Drive Auto-Sync trigger enabled.';
}

/**
 * Runs every 5 minutes to sync a JSON snapshot of all office data into Google Drive.
 */
function autoSyncDriveBackup() {
  ensureDatabase_();
  const folder = getOrCreateDriveFolder_();
  const snapshot = getAppData();
  const content = JSON.stringify(snapshot, null, 2);
  const backupName = 'Office_System_AutoSync_Backup.json';

  const existing = folder.getFilesByName(backupName);
  if (existing.hasNext()) {
    const file = existing.next();
    file.setContent(content);
  } else {
    folder.createFile(backupName, content, MimeType.PLAIN_TEXT);
  }

  const syncTime = Utilities.formatDate(new Date(), 'Asia/Colombo', 'yyyy-MM-dd HH:mm:ss');
  saveSettings({ LastDriveSync: syncTime });
  return syncTime;
}
