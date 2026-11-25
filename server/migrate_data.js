const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { db, upsert } = require('./db');

const migrationDir = path.resolve(__dirname, '../migration_data');

const TABLE_KEYS = {
  Settings: 'Key',
  Users: 'UserId',
  Customers: 'CustomerId',
  Suppliers: 'SupplierId',
  Inventory: 'ItemId',
  Invoices: 'InvoiceId',
  InvoiceItems: 'LineId',
  CompanyProfiles: 'CompanyId',
  Quotations: 'QuotationId',
  OrderForms: 'OrderId',
  OrderFormItems: 'LineId',
  Creditors: 'CreditorId',
  PettyCash: 'PcId',
  CallReports: 'CallId',
  ProjectReports: 'ProjId',
  PainterQuotations: 'QuoteId',
  PainterBillBalances: 'BillId',
  PainterParticipants: 'ParticipantId',
  Employees: 'EmpId',
  CustomTabs: 'TabId',
  CustomTabRows: 'RowId',
  Transactions: 'TxId',
  Attendance: 'AttId',
  Leaves: 'LeaveId',
  Tasks: 'TaskId',
  SavedReports: 'ReportId'
};

function runMigration() {
  console.log('========================================================');
  console.log('        Office System - Data Migration Engine          ');
  console.log('========================================================');
  console.log(`Scanning migration directory: ${migrationDir}\n`);

  if (!fs.existsSync(migrationDir)) {
    console.log(`Directory ${migrationDir} does not exist. Creating it now.`);
    fs.mkdirSync(migrationDir, { recursive: true });
    console.log('Place your exported .xlsx, .csv, or .json files into /migration_data and run again.');
    return;
  }

  const files = fs.readdirSync(migrationDir);
  if (files.length === 0) {
    console.log('No data files found in /migration_data.');
    console.log('Supported formats:');
    console.log('  1. Excel workbook (.xlsx / .xls) with sheets matching table names.');
    console.log('  2. JSON files (e.g., export_all.json or TableName.json).');
    console.log('  3. CSV files (e.g., Customers.csv, Invoices.csv).\n');
    return;
  }

  const results = {};

  for (const f of files) {
    const fullPath = path.join(migrationDir, f);
    const ext = path.extname(f).toLowerCase();

    if (ext === '.xlsx' || ext === '.xls') {
      console.log(`Reading Excel file: ${f}...`);
      const wb = XLSX.readFile(fullPath);
      for (const sheetName of wb.SheetNames) {
        const matchedTable = findMatchingTable(sheetName);
        if (matchedTable) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
          if (rows.length > 0) {
            importRows(matchedTable, rows);
            results[matchedTable] = (results[matchedTable] || 0) + rows.length;
          }
        }
      }
    } else if (ext === '.json') {
      console.log(`Reading JSON file: ${f}...`);
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (Array.isArray(content)) {
          const baseName = path.basename(f, ext);
          const matchedTable = findMatchingTable(baseName);
          if (matchedTable) {
            importRows(matchedTable, content);
            results[matchedTable] = (results[matchedTable] || 0) + content.length;
          }
        } else if (typeof content === 'object') {
          for (const [key, rows] of Object.entries(content)) {
            const matchedTable = findMatchingTable(key);
            if (matchedTable && Array.isArray(rows)) {
              importRows(matchedTable, rows);
              results[matchedTable] = (results[matchedTable] || 0) + rows.length;
            }
          }
        }
      } catch (e) {
        console.error(`Error parsing JSON file ${f}:`, e.message);
      }
    } else if (ext === '.csv') {
      console.log(`Reading CSV file: ${f}...`);
      const baseName = path.basename(f, ext);
      const matchedTable = findMatchingTable(baseName);
      if (matchedTable) {
        const wb = XLSX.readFile(fullPath);
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        if (rows.length > 0) {
          importRows(matchedTable, rows);
          results[matchedTable] = (results[matchedTable] || 0) + rows.length;
        }
      }
    }
  }

  // Recalculate auto-sequences from imported data
  recalculateSequences();

  console.log('\nMigration Summary:');
  console.table(Object.entries(results).map(([table, count]) => ({ Table: table, ImportedRows: count })));
  console.log('Migration completed successfully!\n');
}

function findMatchingTable(name) {
  const clean = name.trim().toLowerCase();
  for (const t of Object.keys(TABLE_KEYS)) {
    if (t.toLowerCase() === clean) return t;
    if (t.toLowerCase() + 's' === clean) return t;
    if (t.toLowerCase() === clean + 's') return t;
  }
  return null;
}

function importRows(tableName, rows) {
  const pk = TABLE_KEYS[tableName];
  if (!pk) return;
  try {
    upsert(tableName, rows, pk);
    console.log(`  ✓ Imported ${rows.length} records into "${tableName}"`);
  } catch (err) {
    console.error(`  ✗ Failed to import into "${tableName}":`, err.message);
  }
}

function recalculateSequences() {
  console.log('\nRecalculating auto-number sequences...');
  try {
    // 1. NextCustomerSeq
    const customers = db.prepare('SELECT CustomerId FROM Customers').all();
    let maxCust = 0;
    for (const c of customers) {
      const m = String(c.CustomerId || '').match(/^CUS-(\d+)$/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxCust) maxCust = n;
      }
    }
    const nextCustSeq = maxCust + 1;
    db.prepare('INSERT OR REPLACE INTO Settings (Key, Value) VALUES (?, ?)').run('NextCustomerSeq', String(nextCustSeq));
    console.log(`  ✓ NextCustomerSeq updated to: ${nextCustSeq}`);

    // 2. NextSupplierSeq
    const suppliers = db.prepare('SELECT SupplierId FROM Suppliers').all();
    let maxSup = 0;
    for (const s of suppliers) {
      const m = String(s.SupplierId || '').match(/^SUP-(\d+)$/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxSup) maxSup = n;
      }
    }
    const nextSupSeq = maxSup + 1;
    db.prepare('INSERT OR REPLACE INTO Settings (Key, Value) VALUES (?, ?)').run('NextSupplierSeq', String(nextSupSeq));
    console.log(`  ✓ NextSupplierSeq updated to: ${nextSupSeq}`);

    // 3. NextInvoiceNo
    const invoices = db.prepare('SELECT InvoiceNo FROM Invoices').all();
    let maxInv = 1000;
    for (const inv of invoices) {
      const m = String(inv.InvoiceNo || '').match(/\d+/);
      if (m) {
        const n = parseInt(m[0], 10);
        if (n > maxInv) maxInv = n;
      }
    }
    const nextInvNo = maxInv + 1;
    db.prepare('INSERT OR REPLACE INTO Settings (Key, Value) VALUES (?, ?)').run('NextInvoiceNo', String(nextInvNo));
    console.log(`  ✓ NextInvoiceNo updated to: ${nextInvNo}`);

    // 4. NextQuoteNo
    const quotes = db.prepare('SELECT QuotationNo FROM Quotations').all();
    let maxQuote = 753;
    for (const q of quotes) {
      const m = String(q.QuotationNo || '').match(/\d+/);
      if (m) {
        const n = parseInt(m[0], 10);
        if (n > maxQuote) maxQuote = n;
      }
    }
    const nextQuoteNo = maxQuote + 1;
    db.prepare('INSERT OR REPLACE INTO Settings (Key, Value) VALUES (?, ?)').run('NextQuoteNo', String(nextQuoteNo));
    console.log(`  ✓ NextQuoteNo updated to: ${nextQuoteNo}`);
  } catch (err) {
    console.warn('  ✗ Error recalculating sequences:', err.message);
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = {
  runMigration
};
