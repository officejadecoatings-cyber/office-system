/**
 * Office System - Google Apps Script Backend
 * Lightweight 4-user Office Management System backed by Google Sheets & Google Drive.
 */

const DB_NAME = 'Office System Database';
const DRIVE_FOLDER_NAME = 'Office System Files';

const SCHEMA = {
  Settings: ['Key', 'Value'],
  Users: ['UserId', 'Name', 'Email', 'Role', 'Pin', 'Status'],
  Customers: ['CustomerId', 'CustomerCode', 'Name', 'BusinessIdentifier', 'BillingAddress', 'DeliveryAddress', 'Email', 'Phone', 'CreditLimit', 'SalesOfficerId', 'SalesOfficerName', 'Notes', 'CreatedAt'],
  Inventory: ['ItemId', 'SKU', 'Name', 'Category', 'UnitPrice', 'StockQty', 'ReorderLevel', 'Unit', 'UpdatedAt'],
  Invoices: ['InvoiceId', 'InvoiceNo', 'CustomerId', 'CustomerName', 'Date', 'DueDate', 'Status', 'Subtotal', 'Discount', 'TaxAmount', 'Total', 'PaidAmount', 'Notes', 'CreatedBy'],
  InvoiceItems: ['LineId', 'InvoiceId', 'ItemId', 'ItemName', 'Qty', 'UnitPrice', 'LineTotal'],
  Creditors: ['CreditorId', 'SupplierName', 'BillNo', 'Date', 'DueDate', 'TotalAmount', 'PaidAmount', 'Status', 'Notes'],
  PettyCash: ['PcId', 'VoucherNo', 'Date', 'Type', 'Category', 'Description', 'PaidTo', 'ReceiptNo', 'Amount', 'RecordedBy'],
  CallReports: ['CallId', 'ReportType', 'DataJson', 'CreatedBy', 'CreatedAt'],
  ProjectReports: ['ProjId', 'DataJson', 'CreatedBy', 'CreatedAt'],
  PainterQuotations: ['QuotationId', 'QuotationNo', 'Date', 'Title', 'QuotationFor', 'Supplier', 'Receivers', 'Place', 'Time', 'TotalAmount', 'AdvanceAmount', 'RemainingAmount', 'ItemsJson', 'Status', 'CreatedBy', 'CreatedAt'],
  PainterBillBalances: ['BalanceId', 'ProgramName', 'Date', 'Description', 'Withdrawal', 'Deposit', 'Balance', 'CreatedBy', 'CreatedAt'],
  Employees: ['EmpId', 'Name', 'Designation', 'Address', 'NIC', 'EpfEtfNo', 'DOB', 'Gender', 'Position', 'Email', 'Phone', 'EmergencyContactName', 'EmergencyContactPhone', 'JoinDate', 'Status'],
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
    const payload = JSON.parse(e.postData.contents || '{}');
    const action = payload.action;
    const args = payload.args || [];
    const allowed = {
      getLoginUsers, authenticateUser, getAppData,
      saveCustomer, deleteCustomer,
      saveInventoryItem, deleteInventoryItem,
      saveInvoice, deleteInvoice,
      saveCreditor, deleteCreditor,
      savePettyCash, deletePettyCash,
      saveReportEntry, deleteReportEntry, importReportEntries, clearReportEntries,
      savePainterQuotation, deletePainterQuotation,
      savePainterBillBalance, deletePainterBillBalance, importPainterBillBalances,
      saveEmployee, deleteEmployee,
      saveCustomTab, deleteCustomTab, saveCustomTabRow, deleteCustomTabRow, importCustomTabRows,
      saveTransaction, deleteTransaction,
      clockInUser, clockOutUser, saveLeaveRequest, updateLeaveStatus,
      saveTask, deleteTask,
      saveSettings, saveUser,
      importRecords,
      saveCustomReport, deleteCustomReport, saveReportToDrive,
      setupAutoSyncTrigger, autoSyncDriveBackup
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

/**
 * Gets or creates the bound/Drive Spreadsheet and Drive folder, and seeds initial data.
 */
function getSpreadsheet_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('SPREADSHEET_ID');
  if (savedId) {
    try {
      return SpreadsheetApp.openById(savedId);
    } catch (e) {
      // Fallback to search/create if deleted
    }
  }

  const files = DriveApp.getFilesByName(DB_NAME);
  if (files.hasNext()) {
    const file = files.next();
    props.setProperty('SPREADSHEET_ID', file.getId());
    return SpreadsheetApp.openById(file.getId());
  }

  const ss = SpreadsheetApp.create(DB_NAME);
  props.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
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
  if (settingsSheet.getLastRow() <= 1) {
    const folder = getOrCreateDriveFolder_();
    settingsSheet.getRange(2, 1, 7, 2).setValues([
      ['CompanyName', 'My Office Pvt Ltd'],
      ['Address', 'Colombo, Sri Lanka'],
      ['Phone', '+94 11 234 5678'],
      ['Email', 'info@myoffice.lk'],
      ['Currency', 'LKR'],
      ['TaxRate', '0'],
      ['DriveFolderUrl', folder.getUrl()]
    ]);
  }

  // Seed 4 default users if empty
  const usersSheet = ss.getSheetByName('Users');
  if (usersSheet.getLastRow() <= 1) {
    usersSheet.getRange(2, 1, 4, 6).setValues([
      ['U-001', 'Admin User', 'admin@office.local', 'Admin', '1234', 'Active'],
      ['U-002', 'Staff Member 1', 'staff1@office.local', 'Staff', '1111', 'Active'],
      ['U-003', 'Staff Member 2', 'staff2@office.local', 'Staff', '2222', 'Active'],
      ['U-004', 'Staff Member 3', 'staff3@office.local', 'Staff', '3333', 'Active']
    ]);
  }

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
  const headers = SCHEMA[sheetName];
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
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;
  const headers = data[0];
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
    Name: u.Name,
    Email: u.Email,
    Role: u.Role
  }));
}

function authenticateUser(userId, pin) {
  const users = readSheetObjects_('Users');
  const user = users.find(u => u.UserId === userId && u.Status === 'Active');
  if (!user) throw new Error('User not found or inactive.');
  if (String(user.Pin) !== String(pin)) throw new Error('Invalid PIN.');
  return {
    UserId: user.UserId,
    Name: user.Name,
    Email: user.Email,
    Role: user.Role
  };
}

function getAppData() {
  ensureDatabase_();
  const settingsRows = readSheetObjects_('Settings');
  const settings = {};
  settingsRows.forEach(r => { settings[r.Key] = r.Value; });

  return {
    settings: settings,
    users: readSheetObjects_('Users').map(u => ({
      UserId: u.UserId,
      Name: u.Name,
      Email: u.Email,
      Role: u.Role,
      Status: u.Status
    })),
    customers: readSheetObjects_('Customers'),
    inventory: readSheetObjects_('Inventory'),
    invoices: readSheetObjects_('Invoices'),
    invoiceItems: readSheetObjects_('InvoiceItems'),
    creditors: readSheetObjects_('Creditors'),
    pettyCash: readSheetObjects_('PettyCash'),
    callReports: readSheetObjects_('CallReports'),
    projectReports: readSheetObjects_('ProjectReports'),
    painterQuotations: readSheetObjects_('PainterQuotations'),
    painterBillBalances: readSheetObjects_('PainterBillBalances'),
    employees: readSheetObjects_('Employees'),
    customTabs: readSheetObjects_('CustomTabs'),
    customTabRows: readSheetObjects_('CustomTabRows'),
    transactions: readSheetObjects_('Transactions'),
    attendance: readSheetObjects_('Attendance'),
    leaves: readSheetObjects_('Leaves'),
    tasks: readSheetObjects_('Tasks'),
    savedReports: readSheetObjects_('SavedReports'),
    today: todayStr_()
  };
}

/* ============================================================================
 * Customers (CRM)
 * ========================================================================== */

function saveCustomer(customer) {
  return withLock_(() => {
    customer.CreditLimit = Number(customer.CreditLimit) || 0;
    if (customer.CustomerId) {
      updateRowByKey_('Customers', 'CustomerId', customer.CustomerId, customer);
      return customer;
    }
    customer.CustomerId = nextId_('CUS');
    customer.CustomerCode = customer.CustomerCode || ('C-' + Math.floor(1000 + Math.random() * 9000));
    customer.CreatedAt = todayStr_();
    return appendRowObject_('Customers', customer);
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
    if (item.ItemId) {
      updateRowByKey_('Inventory', 'ItemId', item.ItemId, item);
      return item;
    }
    item.ItemId = nextId_('ITM');
    return appendRowObject_('Inventory', item);
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
    const isNew = !invoice.InvoiceId;

    if (isNew) {
      invoice.InvoiceId = nextId_('INV');
      const existing = readSheetObjects_('Invoices');
      invoice.InvoiceNo = invoice.InvoiceNo || ('INV-' + String(existing.length + 1001));
    } else {
      // Restore stock from old items if old invoice wasn't Draft/Cancelled
      const oldInv = readSheetObjects_('Invoices').find(i => i.InvoiceId === invoice.InvoiceId);
      const oldItems = readSheetObjects_('InvoiceItems').filter(li => li.InvoiceId === invoice.InvoiceId);
      if (oldInv && oldInv.Status !== 'Draft' && oldInv.Status !== 'Cancelled') {
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
      li.LineTotal = li.Qty * li.UnitPrice;
      appendRowObject_('InvoiceItems', li);
    });

    // Deduct stock if active order/invoice
    if (invoice.Status !== 'Draft' && invoice.Status !== 'Cancelled') {
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
          Description: 'Payment for ' + invoice.InvoiceNo + ' (' + invoice.CustomerName + ')',
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
    if (!li.ItemId) return;
    const invItem = inventory.find(x => x.ItemId === li.ItemId);
    if (invItem) {
      const newQty = (Number(invItem.StockQty) || 0) + (multiplier * (Number(li.Qty) || 0));
      invItem.StockQty = newQty;
      updateRowByKey_('Inventory', 'ItemId', invItem.ItemId, {
        StockQty: newQty,
        UpdatedAt: todayStr_()
      });
    }
  });
}

function deleteInvoice(invoiceId) {
  return withLock_(() => {
    const oldInv = readSheetObjects_('Invoices').find(i => i.InvoiceId === invoiceId);
    const oldItems = readSheetObjects_('InvoiceItems').filter(li => li.InvoiceId === invoiceId);
    if (oldInv && oldInv.Status !== 'Draft' && oldInv.Status !== 'Cancelled') {
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
    if (cred.CreditorId) {
      updateRowByKey_('Creditors', 'CreditorId', cred.CreditorId, cred);
      return cred;
    }
    cred.CreditorId = nextId_('CRD');
    return appendRowObject_('Creditors', cred);
  });
}

function deleteCreditor(id) {
  return withLock_(() => deleteRowByKey_('Creditors', 'CreditorId', id));
}

function savePettyCash(pc) {
  return withLock_(() => {
    pc.Amount = Number(pc.Amount) || 0;
    if (pc.PcId) {
      updateRowByKey_('PettyCash', 'PcId', pc.PcId, pc);
      return pc;
    }
    const existing = readSheetObjects_('PettyCash');
    pc.PcId = nextId_('PC');
    pc.VoucherNo = pc.VoucherNo || ('PCV-' + String(existing.length + 1001));
    pc.Date = pc.Date || todayStr_();
    return appendRowObject_('PettyCash', pc);
  });
}

function deletePettyCash(id) {
  return withLock_(() => deleteRowByKey_('PettyCash', 'PcId', id));
}

function saveEmployee(emp) {
  return withLock_(() => {
    if (emp.EmpId) {
      updateRowByKey_('Employees', 'EmpId', emp.EmpId, emp);
      return emp;
    }
    emp.EmpId = nextId_('EMP');
    emp.Status = emp.Status || 'Active';
    emp.Gender = emp.Gender || 'Male';
    emp.Position = emp.Position || 'Office Staff';
    return appendRowObject_('Employees', emp);
  });
}

function deleteEmployee(id) {
  return withLock_(() => deleteRowByKey_('Employees', 'EmpId', id));
}

function saveReportEntry(sheetName, entry) {
  const keyField = sheetName === 'CallReports' ? 'CallId' : 'ProjId';
  const prefix = sheetName === 'CallReports' ? 'CALL' : 'PRJ';
  return withLock_(() => {
    if (entry[keyField]) {
      updateRowByKey_(sheetName, keyField, entry[keyField], entry);
      return entry;
    }
    entry[keyField] = nextId_(prefix);
    entry.CreatedAt = todayStr_();
    return appendRowObject_(sheetName, entry);
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
    if (entry.QuotationId) {
      updateRowByKey_('PainterQuotations', 'QuotationId', entry.QuotationId, entry);
      return entry;
    }
    entry.QuotationId = nextId_('PTQ');
    if (!entry.QuotationNo) entry.QuotationNo = entry.QuotationId;
    entry.CreatedAt = todayStr_();
    return appendRowObject_('PainterQuotations', entry);
  });
}

function deletePainterQuotation(id) {
  return withLock_(() => deleteRowByKey_('PainterQuotations', 'QuotationId', id));
}

function savePainterBillBalance(entry) {
  return withLock_(() => {
    if (entry.BalanceId) {
      updateRowByKey_('PainterBillBalances', 'BalanceId', entry.BalanceId, entry);
      return entry;
    }
    entry.BalanceId = nextId_('PBB');
    entry.CreatedAt = todayStr_();
    return appendRowObject_('PainterBillBalances', entry);
  });
}

function deletePainterBillBalance(id) {
  return withLock_(() => deleteRowByKey_('PainterBillBalances', 'BalanceId', id));
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
    if (tab.TabId) {
      updateRowByKey_('CustomTabs', 'TabId', tab.TabId, tab);
      return tab;
    }
    tab.TabId = nextId_('TAB');
    tab.Icon = tab.Icon || '📋';
    return appendRowObject_('CustomTabs', tab);
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
    if (row.RowId) {
      updateRowByKey_('CustomTabRows', 'RowId', row.RowId, row);
      return row;
    }
    row.RowId = nextId_('CTR');
    row.CreatedAt = todayStr_();
    return appendRowObject_('CustomTabRows', row);
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
    if (tx.TxId) {
      updateRowByKey_('Transactions', 'TxId', tx.TxId, tx);
      return tx;
    }
    tx.TxId = nextId_('TX');
    tx.Date = tx.Date || todayStr_();
    return appendRowObject_('Transactions', tx);
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
    if (leave.LeaveId) {
      updateRowByKey_('Leaves', 'LeaveId', leave.LeaveId, leave);
      return leave;
    }
    leave.LeaveId = nextId_('LV');
    leave.Status = 'Pending';
    return appendRowObject_('Leaves', leave);
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

/* ============================================================================
 * Tasks & Projects
 * ========================================================================== */

function saveTask(task) {
  return withLock_(() => {
    if (task.TaskId) {
      updateRowByKey_('Tasks', 'TaskId', task.TaskId, task);
      return task;
    }
    task.TaskId = nextId_('TSK');
    task.CreatedAt = todayStr_();
    return appendRowObject_('Tasks', task);
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
    if (user.UserId) {
      const updates = {
        Name: user.Name,
        Email: user.Email,
        Role: user.Role,
        Status: user.Status
      };
      if (user.Pin) updates.Pin = user.Pin;
      updateRowByKey_('Users', 'UserId', user.UserId, updates);
      return user;
    }
    const existing = readSheetObjects_('Users');
    if (existing.length >= 10) throw new Error('User limit reached.');
    user.UserId = nextId_('U');
    user.Pin = user.Pin || '1234';
    user.Status = user.Status || 'Active';
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
