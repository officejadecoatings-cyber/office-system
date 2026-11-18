import re

with open('Scripts.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update GAS_URL and CURRENT_GAS_URL
target_gas_url = 'https://script.google.com/macros/s/AKfycbw5SxusRaa1lrByPmcysKqRUGjTfuKmziJho0SUFCL0BDo1R1W7NbwAX41VNqwHquKU8g/exec'

content = re.sub(
    r"const GAS_URL = 'https://script\.google\.com/macros/s/[^']+/exec';",
    f"const GAS_URL = '{target_gas_url}';",
    content
)
content = re.sub(
    r"const CURRENT_GAS_URL = 'https://script\.google\.com/macros/s/[^']+/exec';",
    f"const CURRENT_GAS_URL = '{target_gas_url}';",
    content
)

# 2. Update OfficeSupabase.handleAction for mapping.isInvoice
old_sb_invoice = """      if (mapping.isInvoice) {
        const inv = payload.invoice || payload;
        inv.InvoiceId = inv.InvoiceId || (mapping.prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
        await this.upsert('Invoices', inv);

        if (payload.items && Array.isArray(payload.items) && payload.items.length > 0) {
          const items = payload.items.map(it => ({
            ...it,
            LineId: it.LineId || ('LINE-' + Date.now() + '-' + Math.floor(Math.random() * 1000)),
            InvoiceId: inv.InvoiceId
          }));
          await this.upsert('InvoiceItems', items);
          if (state && state.data) {
            state.data.invoiceItems = (state.data.invoiceItems || []).filter(x => x.InvoiceId !== inv.InvoiceId).concat(items);
          }
        }

        if (state && state.data) {
          state.data.invoices = state.data.invoices || [];
          const idx = state.data.invoices.findIndex(x => x.InvoiceId === inv.InvoiceId);
          if (idx !== -1) state.data.invoices[idx] = inv;
          else state.data.invoices.unshift(inv);
          try { localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(state.data)); } catch (e) {}
        }
        return inv;
      }"""

new_sb_invoice = """      if (mapping.isInvoice) {
        const inv = payload.invoice || payload;
        inv.InvoiceId = inv.InvoiceId || (mapping.prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
        await this.upsert('Invoices', inv);

        if (payload.items && Array.isArray(payload.items)) {
          try {
            await this.delete('InvoiceItems', 'InvoiceId', inv.InvoiceId);
          } catch (e) {}
          const items = payload.items.map(it => ({
            ...it,
            LineId: it.LineId || ('LINE-' + Date.now() + '-' + Math.floor(Math.random() * 1000)),
            InvoiceId: inv.InvoiceId
          }));
          if (items.length > 0) {
            await this.upsert('InvoiceItems', items);
          }
          if (state && state.data) {
            state.data.invoiceItems = (state.data.invoiceItems || []).filter(x => x.InvoiceId !== inv.InvoiceId).concat(items);
          }
        }

        if (state && state.data) {
          state.data.invoices = state.data.invoices || [];
          const idx = state.data.invoices.findIndex(x => x.InvoiceId === inv.InvoiceId);
          if (idx !== -1) state.data.invoices[idx] = inv;
          else state.data.invoices.unshift(inv);
          try { localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(state.data)); } catch (e) {}
        }
        return inv;
      }"""

if old_sb_invoice in content:
    content = content.replace(old_sb_invoice, new_sb_invoice, 1)
    print("Updated OfficeSupabase.handleAction for isInvoice")
else:
    print("Warning: old_sb_invoice not matched exactly")

# 3. Update submitInvoice
old_submit_start = "  async function submitInvoice(invoiceId) {"
old_remove_start = "  async function removeInvoice(id) {"

start_pos = content.find(old_submit_start)
end_pos = content.find(old_remove_start, start_pos)

if start_pos != -1 and end_pos != -1:
    new_submit_invoice = """  async function submitInvoice(invoiceId) {
    const custId = document.getElementById('fInvCustId')?.value || document.getElementById('fInvCust')?.value || '';
    const custName = document.getElementById('fInvCustInput')?.value || '';
    const spVal = document.getElementById('fInvSPInput')?.value || document.getElementById('fInvSP')?.value || '';
    const status = document.getElementById('fInvStatus').value;

    if (status !== 'Free Issue' && status !== 'Draft' && status !== 'Cancelled' && !spVal.trim()) {
      showToast('Please select a registered Sales Person (S.P) for this invoice.');
      document.getElementById('fInvSPInput')?.focus();
      return;
    }

    // Customer overdue check (exclude invoice currently being edited)
    if (custId && status !== 'Draft' && status !== 'Cancelled' && status !== 'Free Issue') {
      const unpaidOther = (state.data.invoices || []).filter(i =>
        i.CustomerId === custId &&
        i.InvoiceId !== invoiceId &&
        i.Status !== 'Paid' && i.Status !== 'Cancelled' && i.Status !== 'Draft' && i.Status !== 'Free Issue' &&
        (Number(i.Total || 0) - Number(i.PaidAmount || 0)) > 0 &&
        daysBetween(i.DueDate || i.Date, state.data.today) > 0
      );
      if (unpaidOther.length > 0) {
        const pin = document.getElementById('fInvOverridePin')?.value.trim() || '';
        const errEl = document.getElementById('fInvOverridePinError');
        if (!pin) {
          if (errEl) errEl.textContent = 'Login PIN is required to issue invoice for an overdue customer.';
          showToast('Blocked: Customer has unpaid invoices past Due Date. Enter Login PIN to issue!');
          document.getElementById('fInvOverridePin')?.focus();
          return;
        }
        try {
          await gas('authenticateUser', state.user.UserId, pin);
        } catch (e) {
          if (errEl) errEl.textContent = 'Invalid Login PIN / Password. Invoice blocked.';
          showToast('Invalid Login PIN! Override blocked.');
          return;
        }
      }
    }

    const cust = state.data.customers.find(c => c.CustomerId === custId);
    const { sub, disc, tax, total, paid } = updateInvTotals();
    const existing = invoiceId ? state.data.invoices.find(i => i.InvoiceId === invoiceId) : null;
    const finalPaid = status === 'Paid' ? total : (status === 'Free Issue' ? 0 : paid);

    const dispatchVal = document.getElementById('fInvDispatch')?.value || 'Yes';
    const dispatchedBy = document.getElementById('fInvDispatchedBy')?.value.trim() || '';
    let dispatchStatus = (dispatchVal === 'No') ? 'Not Dispatched' : 'Dispatched';

    const companyId = document.getElementById('fInvCompany')?.value || (state.data.companyProfiles || [])[0]?.CompanyId || '';
    let assignedInvNo = document.getElementById('fInvNo')?.value.trim();
    if (!assignedInvNo) {
      assignedInvNo = existing ? existing.InvoiceNo : generateNextInvoiceNo(companyId);
    }
    const finalInvId = invoiceId || ('INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000));

    const payload = {
      invoice: {
        InvoiceId: finalInvId,
        InvoiceNo: assignedInvNo,
        CompanyId: companyId,
        CustomerId: custId,
        CustomerName: custName || (cust ? cust.Name : (custId ? 'Customer' : 'Walk-in Customer')),
        CustomerAddress: document.getElementById('fInvCustAddr')?.value || (cust ? (cust.BillingAddress || cust.DeliveryAddress || '') : ''),
        CustomerPhone: document.getElementById('fInvCustPhone')?.value || (cust ? (cust.Phone || '') : ''),
        QuoteNo: document.getElementById('fInvQuote')?.value || '',
        SalesPerson: (status === 'Free Issue') ? '' : spVal,
        BankDetails: document.getElementById('fInvBank')?.value || '',
        Date: document.getElementById('fInvDate')?.value || state.data.today,
        DueDate: document.getElementById('fInvDue')?.value || state.data.today,
        Status: status,
        Subtotal: sub,
        Discount: disc,
        TaxAmount: tax,
        Total: total,
        PaidAmount: finalPaid,
        Notes: document.getElementById('fInvNotes')?.value || '',
        DispatchStatus: dispatchStatus,
        DispatchedDate: (dispatchStatus === 'Not Dispatched') ? '' : (document.getElementById('fInvDate')?.value || state.data.today),
        DispatchedBy: dispatchedBy,
        CreatedBy: state.user.Name
      },
      items: _invLines.filter(l => (l.ItemName || '').trim() !== '').map((l, idx) => ({
        LineId: l.LineId || ('LN-' + Date.now() + '-' + idx),
        InvoiceId: finalInvId,
        ItemId: l.ItemId || '',
        ItemCode: l.ItemCode || '',
        ItemName: l.ItemName || '',
        Qty: Number(l.Qty) || 0,
        UnitPrice: Number(l.UnitPrice) || 0,
        DiscountPercent: Number(l.DiscountPercent) || 0,
        LineTotal: Number(l.LineTotal) || 0
      }))
    };

    // 1. Stock Availability Check
    if (dispatchStatus === 'Dispatched' && status !== 'Draft' && status !== 'Cancelled') {
      const existingItems = invoiceId ? (state.data.invoiceItems || []).filter(li => li.InvoiceId === invoiceId) : [];
      let insufficientStock = false;
      let insufficientMsg = '';

      for (const li of payload.items) {
        const invItem = state.data.inventory.find(x => 
          (li.ItemId && x.ItemId === li.ItemId) ||
          (li.ItemCode && x.SKU && String(x.SKU).trim().toLowerCase() === String(li.ItemCode).trim().toLowerCase()) ||
          (li.ItemName && x.Name && String(x.Name).trim().toLowerCase() === String(li.ItemName).trim().toLowerCase())
        );
        const avail = invItem ? (Number(invItem.StockQty) || 0) : 0;
        let oldQty = 0;
        if (existing && existing.DispatchStatus === 'Dispatched') {
          const oldLi = existingItems.find(x => 
            (li.ItemId && x.ItemId === li.ItemId) ||
            (li.ItemCode && x.ItemCode && String(x.ItemCode).trim().toLowerCase() === String(li.ItemCode).trim().toLowerCase()) ||
            (li.ItemName && x.ItemName && String(x.ItemName).trim().toLowerCase() === String(li.ItemName).trim().toLowerCase())
          );
          oldQty = oldLi ? (Number(oldLi.Qty) || 0) : 0;
        }
        const effectiveAvail = avail + oldQty;
        const req = Number(li.Qty) || 0;
        if (req > effectiveAvail) {
          insufficientStock = true;
          insufficientMsg = `Insufficient warehouse stock for "${li.ItemName || li.ItemCode}"!\\nAvailable: ${avail} ${invItem ? (invItem.Unit || '') : ''}\\nRequested on Invoice: ${req}`;
          break;
        }
      }

      if (insufficientStock) {
        const proceedNotDispatched = confirm(`${insufficientMsg}\\n\\nWould you like to save this order as "Not Dispatched" (Pending Dispatch from Factory)?\\n\\nClick OK to save as Not Dispatched, or Cancel to adjust quantity.`);
        if (!proceedNotDispatched) return;
        dispatchStatus = 'Not Dispatched';
        payload.invoice.DispatchStatus = 'Not Dispatched';
        payload.invoice.DispatchedDate = '';
      }
    }

    // 2. Incremental Stock Deduction for Dispatched Invoices
    if (dispatchStatus === 'Dispatched' && status !== 'Draft' && status !== 'Cancelled') {
      const existingItems = invoiceId ? (state.data.invoiceItems || []).filter(li => li.InvoiceId === invoiceId) : [];
      payload.items.forEach(li => {
        const invItem = state.data.inventory.find(x => 
          (li.ItemId && x.ItemId === li.ItemId) ||
          (li.ItemCode && x.SKU && String(x.SKU).trim().toLowerCase() === String(li.ItemCode).trim().toLowerCase()) ||
          (li.ItemName && x.Name && String(x.Name).trim().toLowerCase() === String(li.ItemName).trim().toLowerCase())
        );
        let oldQty = 0;
        if (existing && existing.DispatchStatus === 'Dispatched') {
          const oldLi = existingItems.find(x => 
            (li.ItemId && x.ItemId === li.ItemId) ||
            (li.ItemCode && x.ItemCode && String(x.ItemCode).trim().toLowerCase() === String(li.ItemCode).trim().toLowerCase()) ||
            (li.ItemName && x.ItemName && String(x.ItemName).trim().toLowerCase() === String(li.ItemName).trim().toLowerCase())
          );
          oldQty = oldLi ? (Number(oldLi.Qty) || 0) : 0;
        }
        const delta = (Number(li.Qty) || 0) - oldQty;
        if (invItem && delta !== 0) {
          invItem.StockQty = Math.max(0, (Number(invItem.StockQty) || 0) - delta);
          invItem.UpdatedAt = state.data.today;
          if (window.sbClient) window.sbClient.from('Inventory').upsert(invItem).then();
        }
      });
    }

    // 3. Increment Next Invoice No in Company Profile & Settings
    const comp = (state.data.companyProfiles || []).find(c => c.CompanyId === payload.invoice.CompanyId) || (state.data.companyProfiles || [])[0];
    const savedInvNum = extractLastNumber(payload.invoice.InvoiceNo);
    if (savedInvNum > 0) {
      if (comp) {
        comp.NextInvoiceNo = String(savedInvNum + 1);
        if (window.sbClient && comp.CompanyId) {
          window.sbClient.from('CompanyProfiles').upsert(comp).then();
        }
        gas('saveCompanyProfile', comp).catch(e => console.error(e));
      }
      if (state.data.settings) {
        state.data.settings.NextInvoiceNo = String(savedInvNum + 1);
      }
    }

    // 4. Instant Optimistic Update (0ms)
    if (invoiceId) {
      const idx = (state.data.invoices || []).findIndex(i => i.InvoiceId === invoiceId);
      if (idx !== -1) state.data.invoices[idx] = { ...payload.invoice };
      else (state.data.invoices = state.data.invoices || []).unshift({ ...payload.invoice });
    } else {
      (state.data.invoices = state.data.invoices || []).unshift({ ...payload.invoice });
    }
    state.data.invoiceItems = (state.data.invoiceItems || []).filter(li => li.InvoiceId !== finalInvId).concat(payload.items);

    try { localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(state.data)); } catch (e) {}

    closeModal();
    renderView();
    showToast(invoiceId ? 'Sales Invoice updated successfully!' : 'Sales Invoice issued successfully!');

    // 5. Asynchronous Server Persistence (Supabase + Google Apps Script)
    try {
      const saved = await gas('saveInvoice', payload);
      if (saved && saved.InvoiceId) {
        const idx = (state.data.invoices || []).findIndex(i => i.InvoiceId === finalInvId || i.InvoiceId === saved.InvoiceId);
        if (idx !== -1) {
          state.data.invoices[idx] = { ...state.data.invoices[idx], ...saved };
        }
        try { localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(state.data)); } catch (e) {}
        renderView();
      }
    } catch (err) {
      console.error('saveInvoice sync error:', err);
    }
  }

"""
    content = content[:start_pos] + new_submit_invoice + content[end_pos:]
    print("Updated submitInvoice successfully!")
else:
    print("Could not find start/end of submitInvoice")

with open('Scripts.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Scripts.html updated successfully!")
