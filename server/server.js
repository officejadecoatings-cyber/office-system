const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');
require('dotenv').config();

const { db, dbPath, fetchAllAppData, upsert, deleteRow } = require('./db');
const { runBackupNow, scheduleBackups, getLastBackupInfo, backupDir } = require('./backup');
const { runMigration } = require('./migrate_data');

const app = express();
const PORT = process.env.PORT || 3000;
const startTime = Date.now();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper: Get local network IPv4 addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses.length > 0 ? addresses : ['127.0.0.1'];
}

// ---------------------------------------------------------------------------
// Health & Diagnostic Endpoints
// ---------------------------------------------------------------------------

app.get('/api/ping', (req, res) => {
  res.json({
    ok: true,
    server: 'OfficeSystemServer',
    version: '1.0.0',
    timestamp: Date.now()
  });
});

app.get('/api/status', (req, res) => {
  let dbSize = 0;
  try {
    const stat = fs.statSync(dbPath);
    dbSize = stat.size;
  } catch (e) {}

  res.json({
    ok: true,
    status: 'running',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    port: PORT,
    localIps: getLocalIpAddresses(),
    database: {
      path: dbPath,
      sizeBytes: dbSize,
      journalMode: 'WAL'
    },
    backup: getLastBackupInfo()
  });
});

app.post('/api/backup', async (req, res) => {
  try {
    const result = await runBackupNow();
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/migrate', (req, res) => {
  try {
    runMigration();
    res.json({ ok: true, message: 'Migration completed' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Main RPC Handler (100% compatible with existing frontend gas() calls)
// ---------------------------------------------------------------------------

const RPC_HANDLERS = {
  getAppData: () => fetchAllAppData(),

  getLoginUsers: () => {
    return db.prepare("SELECT UserId, Name, Email, Role, Pin, Status, AllowedTabs, Avatar FROM Users WHERE Status != 'Inactive'").all();
  },

  authenticateUser: (userId, pin) => {
    let user;
    if (pin === undefined) {
      user = db.prepare("SELECT * FROM Users WHERE Pin = ? AND Status != 'Inactive'").get(String(userId || '').trim());
      if (!user) throw new Error('Invalid PIN.');
    } else {
      user = db.prepare("SELECT * FROM Users WHERE (UserId = ? OR Email = ?) AND Status != 'Inactive'").get(String(userId || '').trim(), String(userId || '').trim());
      if (!user) throw new Error('User not found or inactive.');
      if (String(user.Pin).trim() !== String(pin).trim()) throw new Error('Invalid PIN.');
    }

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
      data: fetchAllAppData()
    };
  },

  saveCustomer: (customer) => {
    const custName = String(customer.Name || '').trim();
    if (!customer.CustomerId || !/^CUS-\d+$/i.test(customer.CustomerId)) {
      // Check if a customer with the same name already exists to prevent duplication
      const existing = db.prepare("SELECT CustomerId, CustomerCode FROM Customers WHERE LOWER(TRIM(Name)) = LOWER(TRIM(?))").get(custName);
      if (existing) {
        customer.CustomerId = existing.CustomerId;
        customer.CustomerCode = existing.CustomerCode || existing.CustomerId;
      } else {
        const nextSeqRow = db.prepare("SELECT Value FROM Settings WHERE Key = 'NextCustomerSeq'").get();
        let nextSeq = parseInt(nextSeqRow ? nextSeqRow.Value : '194', 10) || 194;
        customer.CustomerId = 'CUS-' + String(nextSeq).padStart(4, '0');
        customer.CustomerCode = customer.CustomerId;
        db.prepare("INSERT OR REPLACE INTO Settings (Key, Value) VALUES ('NextCustomerSeq', ?)").run(String(nextSeq + 1));
      }
    }
    customer.CustomerCode = customer.CustomerCode || customer.CustomerId;
    customer.CreditLimit = Number(customer.CreditLimit) || 0;
    customer.CreatedAt = customer.CreatedAt || new Date().toISOString().slice(0, 10);
    upsert('Customers', customer, 'CustomerId');
    return customer;
  },

  deleteCustomer: (custId) => {
    deleteRow('Customers', 'CustomerId', custId);
    return true;
  },

  saveSupplier: (supplier) => {
    supplier.SupplierId = supplier.SupplierId || ('SUP-' + Date.now());
    supplier.CreatedAt = supplier.CreatedAt || new Date().toISOString().slice(0, 10);
    upsert('Suppliers', supplier, 'SupplierId');
    return supplier;
  },

  deleteSupplier: (supId) => {
    deleteRow('Suppliers', 'SupplierId', supId);
    return true;
  },

  saveInventoryItem: (item) => {
    item.ItemId = item.ItemId || ('ITEM-' + Date.now());
    item.UnitPrice = Number(item.UnitPrice) || 0;
    item.StockQty = Number(item.StockQty) || 0;
    item.ReorderLevel = Number(item.ReorderLevel) || 0;
    item.UpdatedAt = new Date().toISOString().slice(0, 10);
    upsert('Inventory', item, 'ItemId');
    return item;
  },

  deleteInventoryItem: (itemId) => {
    deleteRow('Inventory', 'ItemId', itemId);
    return true;
  },

  saveInvoice: (payload) => {
    const inv = payload.invoice || payload;
    inv.InvoiceId = inv.InvoiceId || ('INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
    inv.Total = Number(inv.Total) || 0;
    inv.PaidAmount = Number(inv.PaidAmount) || 0;
    inv.Subtotal = Number(inv.Subtotal) || 0;
    inv.Discount = Number(inv.Discount) || 0;
    inv.TaxAmount = Number(inv.TaxAmount) || 0;
    inv.ChequeAmount = Number(inv.ChequeAmount) || 0;
    inv.TokenAmount = Number(inv.TokenAmount) || 0;
    inv.ReturnAmount = Number(inv.ReturnAmount) || 0;
    if (inv.PaymentsJson && typeof inv.PaymentsJson === 'object') {
      inv.PaymentsJson = JSON.stringify(inv.PaymentsJson);
    }

    upsert('Invoices', inv, 'InvoiceId');

    if (payload.items && Array.isArray(payload.items)) {
      deleteRow('InvoiceItems', 'InvoiceId', inv.InvoiceId);
      const items = payload.items.map(it => ({
        LineId: it.LineId || ('LINE-' + Date.now() + '-' + Math.floor(Math.random() * 1000)),
        InvoiceId: inv.InvoiceId,
        ItemId: it.ItemId || '',
        ItemName: it.ItemName || '',
        Qty: Number(it.Qty) || 1,
        UnitPrice: Number(it.UnitPrice) || 0,
        LineTotal: Number(it.LineTotal) || 0,
        ItemCode: it.ItemCode || '',
        DiscountPercent: Number(it.DiscountPercent) || 0
      }));
      if (items.length > 0) {
        upsert('InvoiceItems', items, 'LineId');
      }
    }
    return inv;
  },

  deleteInvoice: (invId) => {
    deleteRow('Invoices', 'InvoiceId', invId);
    deleteRow('InvoiceItems', 'InvoiceId', invId);
    return true;
  },

  updateInvoicePayment: (payload) => {
    const invId = payload.InvoiceId;
    if (!invId) return false;
    const existing = db.prepare('SELECT * FROM Invoices WHERE InvoiceId = ?').get(invId);
    if (!existing) return false;

    const updates = { ...existing };
    if (payload.PaidAmount !== undefined) updates.PaidAmount = Number(payload.PaidAmount) || 0;
    if (payload.ChequeNo !== undefined) updates.ChequeNo = payload.ChequeNo;
    if (payload.ChequeBank !== undefined) updates.ChequeBank = payload.ChequeBank;
    if (payload.ChequeDate !== undefined) updates.ChequeDate = payload.ChequeDate;
    if (payload.ReceiptNo !== undefined) updates.ReceiptNo = payload.ReceiptNo;
    if (payload.PaymentStatus !== undefined) updates.PaymentStatus = payload.PaymentStatus;
    if (payload.TokenAmount !== undefined) updates.TokenAmount = Number(payload.TokenAmount) || 0;
    if (payload.ReturnAmount !== undefined) updates.ReturnAmount = Number(payload.ReturnAmount) || 0;
    if (payload.Status !== undefined) updates.Status = payload.Status;
    if (payload.Total !== undefined) updates.Total = Number(payload.Total) || 0;
    if (payload.PaymentsJson !== undefined) {
      updates.PaymentsJson = typeof payload.PaymentsJson === 'object' ? JSON.stringify(payload.PaymentsJson) : payload.PaymentsJson;
    }

    upsert('Invoices', updates, 'InvoiceId');
    return updates;
  },

  dispatchInvoice: (invId, dDate, dBy, dNotes) => {
    const existing = db.prepare('SELECT * FROM Invoices WHERE InvoiceId = ?').get(invId);
    if (!existing) return false;

    let finalNotes = (existing.Notes || '').replace(/\[DISPATCH:Not Dispatched\]/g, '').trim();
    if (dNotes) finalNotes = [finalNotes, 'Dispatch: ' + dNotes].filter(Boolean).join(' | ');

    const updates = {
      ...existing,
      DispatchStatus: 'Dispatched',
      DispatchedDate: dDate || new Date().toISOString().slice(0, 10),
      DispatchedBy: dBy || '',
      Notes: finalNotes
    };
    upsert('Invoices', updates, 'InvoiceId');
    return updates;
  },

  saveQuotation: (payload) => {
    const q = payload.quotation || payload;
    q.QuotationId = q.QuotationId || ('QT-' + Date.now());
    q.Date = q.Date || new Date().toISOString().slice(0, 10);
    q.Total = Number(q.Total) || 0;
    if (q.ItemsJson && typeof q.ItemsJson === 'object') {
      q.ItemsJson = JSON.stringify(q.ItemsJson);
    }
    upsert('Quotations', q, 'QuotationId');
    return q;
  },

  deleteQuotation: (qId) => {
    deleteRow('Quotations', 'QuotationId', qId);
    return true;
  },

  saveOrderForm: (payload) => {
    const o = payload.order || payload;
    o.OrderId = o.OrderId || ('ORD-' + Date.now());
    o.OrderDate = o.OrderDate || new Date().toISOString().slice(0, 10);
    o.Total = Number(o.Total) || 0;
    if (o.ItemsJson && typeof o.ItemsJson === 'object') {
      o.ItemsJson = JSON.stringify(o.ItemsJson);
    }
    upsert('OrderForms', o, 'OrderId');
    return o;
  },

  deleteOrderForm: (oId) => {
    deleteRow('OrderForms', 'OrderId', oId);
    deleteRow('OrderFormItems', 'OrderId', oId);
    return true;
  },

  saveCreditor: (cred) => {
    cred.CreditorId = cred.CreditorId || ('CRED-' + Date.now());
    cred.Amount = Number(cred.Amount) || 0;
    cred.PaidAmount = Number(cred.PaidAmount) || 0;
    if (cred.PaymentsJson && typeof cred.PaymentsJson === 'object') {
      cred.PaymentsJson = JSON.stringify(cred.PaymentsJson);
    }
    upsert('Creditors', cred, 'CreditorId');
    return cred;
  },

  deleteCreditor: (cId) => {
    deleteRow('Creditors', 'CreditorId', cId);
    return true;
  },

  savePettyCash: (pc) => {
    pc.PcId = pc.PcId || ('PC-' + Date.now());
    pc.Amount = Number(pc.Amount) || 0;
    upsert('PettyCash', pc, 'PcId');
    return pc;
  },

  deletePettyCash: (pcId) => {
    deleteRow('PettyCash', 'PcId', pcId);
    return true;
  },

  saveCallReport: (cr) => {
    cr.CallId = cr.CallId || ('CALL-' + Date.now());
    upsert('CallReports', cr, 'CallId');
    return cr;
  },

  deleteCallReport: (callId) => {
    deleteRow('CallReports', 'CallId', callId);
    return true;
  },

  saveProjectReport: (pr) => {
    pr.ProjId = pr.ProjId || ('PROJ-' + Date.now());
    upsert('ProjectReports', pr, 'ProjId');
    return pr;
  },

  deleteProjectReport: (projId) => {
    deleteRow('ProjectReports', 'ProjId', projId);
    return true;
  },

  clearReportEntries: (sheetName) => {
    const table = sheetName === 'ProjectReports' ? 'ProjectReports' : 'CallReports';
    db.prepare(`DELETE FROM "${table}"`).run();
    return true;
  },

  saveEmployee: (emp) => {
    emp.EmpId = emp.EmpId || ('EMP-' + Date.now());
    emp.BasicSalary = Number(emp.BasicSalary) || 0;
    emp.SalesTarget = Number(emp.SalesTarget) || 0;
    upsert('Employees', emp, 'EmpId');
    return emp;
  },

  deleteEmployee: (empId) => {
    deleteRow('Employees', 'EmpId', empId);
    return true;
  },

  saveCompanyProfile: (cp) => {
    cp.CompanyId = cp.CompanyId || ('COMP-' + Date.now());
    upsert('CompanyProfiles', cp, 'CompanyId');
    return cp;
  },

  deleteCompanyProfile: (cId) => {
    deleteRow('CompanyProfiles', 'CompanyId', cId);
    return true;
  },

  saveSettings: (payload) => {
    if (payload.Key !== undefined && payload.Value !== undefined) {
      upsert('Settings', { Key: payload.Key, Value: String(payload.Value) }, 'Key');
    } else if (typeof payload === 'object') {
      const rows = Object.entries(payload).map(([Key, Value]) => ({ Key, Value: String(Value) }));
      upsert('Settings', rows, 'Key');
    }
    return true;
  },

  saveUser: (user) => {
    user.UserId = user.UserId || ('U-' + Date.now());
    upsert('Users', user, 'UserId');
    return user;
  },

  saveTransaction: (tx) => {
    tx.TxId = tx.TxId || ('TX-' + Date.now());
    tx.Amount = Number(tx.Amount) || 0;
    upsert('Transactions', tx, 'TxId');
    return tx;
  },

  deleteTransaction: (txId) => {
    deleteRow('Transactions', 'TxId', txId);
    return true;
  },

  saveTask: (task) => {
    task.TaskId = task.TaskId || ('TASK-' + Date.now());
    upsert('Tasks', task, 'TaskId');
    return task;
  },

  deleteTask: (taskId) => {
    deleteRow('Tasks', 'TaskId', taskId);
    return true;
  },

  savePainterQuotation: (pq) => {
    pq.QuoteId = pq.QuoteId || ('PQ-' + Date.now());
    pq.TotalAmount = Number(pq.TotalAmount) || 0;
    if (pq.ItemsJson && typeof pq.ItemsJson === 'object') {
      pq.ItemsJson = JSON.stringify(pq.ItemsJson);
    }
    upsert('PainterQuotations', pq, 'QuoteId');
    return pq;
  },

  deletePainterQuotation: (qId) => {
    deleteRow('PainterQuotations', 'QuoteId', qId);
    return true;
  },

  savePainterBillBalance: (pbb) => {
    pbb.BillId = pbb.BillId || ('PBB-' + Date.now());
    pbb.BillAmount = Number(pbb.BillAmount) || 0;
    pbb.PaidAmount = Number(pbb.PaidAmount) || 0;
    pbb.BalanceAmount = Number(pbb.BalanceAmount) || 0;
    upsert('PainterBillBalances', pbb, 'BillId');
    return pbb;
  },

  deletePainterBillBalance: (billId) => {
    deleteRow('PainterBillBalances', 'BillId', billId);
    return true;
  },

  savePainterParticipant: (part) => {
    part.ParticipantId = part.ParticipantId || ('PART-' + Date.now());
    part.ExperienceYears = Number(part.ExperienceYears) || 0;
    upsert('PainterParticipants', part, 'ParticipantId');
    return part;
  },

  deletePainterParticipant: (partId) => {
    deleteRow('PainterParticipants', 'ParticipantId', partId);
    return true;
  },

  clockInUser: (userId, userName, clockInTime) => {
    const today = new Date().toISOString().slice(0, 10);
    const attId = `ATT-${today}-${userId}`;
    const row = {
      AttId: attId,
      Date: today,
      UserId: userId,
      UserName: userName,
      ClockIn: clockInTime || new Date().toLocaleTimeString('en-US', { hour12: false }),
      Status: 'Present'
    };
    upsert('Attendance', row, 'AttId');
    return row;
  },

  clockOutUser: (userId, clockOutTime) => {
    const today = new Date().toISOString().slice(0, 10);
    const attId = `ATT-${today}-${userId}`;
    const existing = db.prepare('SELECT * FROM Attendance WHERE AttId = ?').get(attId);
    if (!existing) return null;

    const cOut = clockOutTime || new Date().toLocaleTimeString('en-US', { hour12: false });
    const cIn = existing.ClockIn;
    let hours = 0;
    if (cIn && cOut) {
      const [h1, m1] = cIn.split(':').map(Number);
      const [h2, m2] = cOut.split(':').map(Number);
      hours = Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
    }
    const updates = {
      ...existing,
      ClockOut: cOut,
      TotalHours: Number(hours.toFixed(2))
    };
    upsert('Attendance', updates, 'AttId');
    return updates;
  },

  saveLeaveRequest: (req) => {
    req.LeaveId = req.LeaveId || ('LV-' + Date.now());
    req.DaysCount = Number(req.DaysCount) || 1;
    req.CreatedAt = req.CreatedAt || new Date().toISOString().slice(0, 10);
    upsert('Leaves', req, 'LeaveId');
    return req;
  },

  updateLeaveStatus: (leaveId, status, approvedBy) => {
    const existing = db.prepare('SELECT * FROM Leaves WHERE LeaveId = ?').get(leaveId);
    if (!existing) return null;
    const updates = {
      ...existing,
      Status: status,
      ApprovedBy: approvedBy || ''
    };
    upsert('Leaves', updates, 'LeaveId');
    return updates;
  },

  deleteLeaveRequest: (leaveId) => {
    deleteRow('Leaves', 'LeaveId', leaveId);
    return true;
  }
};

// Universal RPC endpoint
app.post('/api/rpc', (req, res) => {
  const { action, args } = req.body;
  if (!action) {
    return res.status(400).json({ ok: false, error: 'Missing action parameter' });
  }

  const handler = RPC_HANDLERS[action];
  if (!handler) {
    console.warn(`[RPC] Unknown action requested: ${action}`);
    return res.status(404).json({ ok: false, error: `Action '${action}' not supported` });
  }

  try {
    const result = handler(...(args || []));
    res.json({ ok: true, result });
  } catch (err) {
    console.error(`[RPC] Error executing action '${action}':`, err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Server Control & Status Dashboard (Web UI for Server PC)
// ---------------------------------------------------------------------------

app.get(['/', '/status', '/admin'], (req, res) => {
  const localIps = getLocalIpAddresses();
  const primaryIp = localIps[0] || 'localhost';
  const lastBackup = getLastBackupInfo();

  let dbStat = { size: 0, mtime: '-' };
  try {
    const s = fs.statSync(dbPath);
    dbStat.size = (s.size / 1024).toFixed(1);
    dbStat.mtime = s.mtime.toLocaleString();
  } catch (e) {}

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Office System - Server Console</title>
      <style>
        :root {
          --primary: #059669;
          --primary-dark: #047857;
          --bg: #f8fafc;
          --card: #ffffff;
          --text: #0f172a;
          --muted: #64748b;
          --border: #e2e8f0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: var(--bg);
          color: var(--text);
          margin: 0;
          padding: 30px 20px;
          display: flex;
          justify-content: center;
        }
        .container {
          max-width: 800px;
          width: 100%;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
        }
        .status-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        h1 { margin: 0; font-size: 24px; font-weight: 700; color: #0f172a; }
        .sub { color: var(--muted); font-size: 14px; margin-top: 4px; }
        .card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .ip-box {
          background: #ecfdf5;
          border: 2px dashed #059669;
          border-radius: 10px;
          padding: 16px 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .ip-val {
          font-family: monospace;
          font-size: 20px;
          font-weight: 700;
          color: #065f46;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }
        .metric {
          background: #f1f5f9;
          padding: 14px 16px;
          border-radius: 8px;
        }
        .metric-title { font-size: 12px; text-transform: uppercase; color: var(--muted); font-weight: 700; }
        .metric-val { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 4px; word-break: break-all; }
        .btn {
          background: var(--primary);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn:hover { background: var(--primary-dark); }
        .btn-outline {
          background: #fff;
          color: #334155;
          border: 1px solid #cbd5e1;
        }
        .btn-outline:hover { background: #f8fafc; }
        .actions { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
        .toast {
          margin-top: 14px;
          padding: 10px 14px;
          border-radius: 6px;
          display: none;
          font-size: 13.5px;
        }
        .toast.success { background: #dcfce7; color: #166534; display: block; }
        .toast.error { background: #fee2e2; color: #991b1b; display: block; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="status-dot"></div>
          <div>
            <h1>Office System Server Console</h1>
            <div class="sub">Local Network (LAN) Dedicated Server • Running on Port ${PORT}</div>
          </div>
        </div>

        <div class="ip-box">
          <div>
            <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:#047857;">Client Connect URL</div>
            <div class="ip-val" id="serverUrl">http://${primaryIp}:${PORT}</div>
            <div style="font-size:12px; color:#065f46; margin-top:2px;">Enter this address in the Client Desktop App on staff PCs</div>
          </div>
          <button class="btn btn-outline" onclick="copyIp()">📋 Copy IP</button>
        </div>

        <div class="card">
          <h3 style="margin-top:0; margin-bottom:14px; font-size:16px;">Server Status & Diagnostics</h3>
          <div class="grid">
            <div class="metric">
              <div class="metric-title">Service Status</div>
              <div class="metric-val" style="color:#059669;">● ACTIVE (Running)</div>
            </div>
            <div class="metric">
              <div class="metric-title">Local Network IP(s)</div>
              <div class="metric-val">${localIps.join(', ')}</div>
            </div>
            <div class="metric">
              <div class="metric-title">SQLite Database Size</div>
              <div class="metric-val">${dbStat.size} KB (WAL Mode)</div>
            </div>
            <div class="metric">
              <div class="metric-title">Backup Schedule</div>
              <div class="metric-val">12:30 PM & 4:45 PM Daily</div>
            </div>
          </div>

          <div class="actions">
            <button class="btn" onclick="triggerBackup()">💾 Backup Database Now</button>
            <button class="btn btn-outline" onclick="triggerMigrate()">📥 Run Data Migration</button>
            <button class="btn btn-outline" onclick="location.reload()">🔄 Refresh Status</button>
          </div>

          <div id="msgBox" class="toast"></div>
        </div>

        <div class="card" style="font-size:13.5px; color:var(--muted); line-height:1.6;">
          <h4 style="margin:0 0 8px 0; color:var(--text);">How to connect staff PCs:</h4>
          <ol style="margin:0; padding-left:20px;">
            <li>Ensure the staff PC is connected to the same office Wi-Fi or router LAN.</li>
            <li>Launch <b>OfficeSystem-Client-Setup.exe</b> on the staff PC.</li>
            <li>When prompted for <b>Server IP</b>, enter: <code>http://${primaryIp}:${PORT}</code></li>
            <li>Click <b>Test Connection</b> and <b>Save & Connect</b>. The client app will now stay connected automatically!</li>
          </ol>
        </div>
      </div>

      <script>
        function copyIp() {
          const txt = document.getElementById('serverUrl').innerText;
          navigator.clipboard.writeText(txt).then(() => {
            showMsg('Server URL copied to clipboard!', 'success');
          });
        }

        async function triggerBackup() {
          showMsg('Running SQLite snapshot and Excel export...', 'success');
          try {
            const res = await fetch('/api/backup', { method: 'POST' });
            const data = await res.json();
            if (data.ok) {
              showMsg('Backup completed! Files saved into C:\\\\OfficeSystem_Backups', 'success');
            } else {
              showMsg('Backup error: ' + data.error, 'error');
            }
          } catch (e) {
            showMsg('Error triggering backup: ' + e.message, 'error');
          }
        }

        async function triggerMigrate() {
          showMsg('Running migration from /migration_data folder...', 'success');
          try {
            const res = await fetch('/api/migrate', { method: 'POST' });
            const data = await res.json();
            if (data.ok) {
              showMsg('Data migration completed successfully!', 'success');
            } else {
              showMsg('Migration error: ' + data.error, 'error');
            }
          } catch (e) {
            showMsg('Error triggering migration: ' + e.message, 'error');
          }
        }

        function showMsg(text, type) {
          const el = document.getElementById('msgBox');
          el.innerText = text;
          el.className = 'toast ' + type;
        }
      </script>
    </body>
    </html>
  `;
  res.send(html);
});

// ---------------------------------------------------------------------------
// Server Startup & Graceful Shutdown
// ---------------------------------------------------------------------------

const server = app.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log('========================================================');
  console.log(`  Office System Server is running on port ${PORT}`);
  console.log(`  Local URL:        http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(`  Network LAN URL:  http://${ip}:${PORT}`);
  });
  console.log(`  Database File:    ${dbPath}`);
  console.log(`  Backups Folder:   ${backupDir}`);
  console.log('========================================================');

  // Start backup scheduler
  scheduleBackups();
});

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\n[SERVER] Received ${signal}. Closing SQLite database and shutting down gracefully...`);
  server.close(() => {
    try {
      db.close();
      console.log('[SERVER] SQLite database closed successfully.');
    } catch (e) {
      console.error('[SERVER] Error closing database:', e);
    }
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = app;
