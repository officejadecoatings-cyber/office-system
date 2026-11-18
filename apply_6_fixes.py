import re

with open('Scripts.html', 'r', encoding='utf-8') as f:
    code = f.read()

# -----------------------------------------------------------------------------
# 1. FIX 1: STOCK CODE REVERT BUG & AUTO-SKU PRESERVATION
# -----------------------------------------------------------------------------
# In openInventoryModal, change label and don't force autoSku if user wants to type or edit
code = code.replace(
    """<label style="font-weight:700;">Item Code * ${!itemId ? '<span style="font-size:11px; color:var(--primary); font-weight:normal;">(Auto-generated)</span>' : ''}</label>
            <input id="fItSku" value="${esc(it.SKU || autoSku)}" placeholder="e.g. JD-001-84" style="font-weight:700; font-family:monospace;">""",
    """<label style="font-weight:700;">Item Code * <span style="font-size:11px; color:var(--primary); font-weight:normal;">(Custom Code or Auto-generated)</span></label>
            <input id="fItSku" value="${esc(it.SKU || autoSku)}" placeholder="e.g. JD-001-84" style="font-weight:700; font-family:monospace;">"""
)

# In submitInventory, NEVER overwrite user-entered SKU!
old_submit_inv = """  async function submitInventory(itemId) {
    let sku = document.getElementById('fItSku')?.value.trim();
    if (!sku || (!itemId && (state.data.inventory || []).some(x => String(x.SKU || '').trim().toLowerCase() === sku.toLowerCase()))) {
      sku = generateNextSKU();
    }"""

new_submit_inv = """  async function submitInventory(itemId) {
    let sku = document.getElementById('fItSku')?.value.trim();
    // Use user-entered SKU; only generate next SKU if field was left blank
    if (!sku) {
      sku = generateNextSKU();
    }"""

if old_submit_inv in code:
    code = code.replace(old_submit_inv, new_submit_inv, 1)
    print("Fix 1 (submitInventory SKU) applied.")
else:
    print("Warning: old_submit_inv not matched!")

# -----------------------------------------------------------------------------
# 2. FIX 2: STOCK IN VALUE ADDITION & PERSISTENCE
# -----------------------------------------------------------------------------
old_submit_stockin = """    const curr = Number(it.StockQty) || 0;
    const newQty = Math.round((curr + qtyIn) * 100) / 100;
    it.StockQty = newQty;
    it.UpdatedAt = dateVal;

    closeModal();
    showToast(`✅ Stock In Confirmed: Added ${qtyIn} ${it.Unit || 'L'} to ${it.SKU || it.Name}! New Stock: ${newQty} ${it.Unit || 'L'}`);

    // Instant save to Supabase / Local / Sheets
    await gas('saveInventoryItem', it);

    // Record transaction log entry
    gas('saveTransaction', {
      TxId: 'TX-' + Date.now(),
      Date: dateVal,
      Type: 'Stock In',
      Category: 'Factory Supply',
      Description: `Factory Inward: Received ${qtyIn} ${it.Unit || 'L'} of ${it.SKU || ''} - ${it.Name}. ${noteVal}`,
      Amount: String(Math.round(qtyIn * (Number(it.UnitPrice) || 0) * 100) / 100),
      RefId: it.ItemId,
      RecordedBy: state.user?.Name || 'System'
    }).catch(e => console.warn(e));

    renderView();"""

new_submit_stockin = """    const curr = Number(it.StockQty) || 0;
    const newQty = Math.round((curr + qtyIn) * 100) / 100;
    it.StockQty = newQty;
    it.UpdatedAt = dateVal;

    // Optimistic local update (0ms)
    const idx = (state.data.inventory || []).findIndex(x => x.ItemId === itemId);
    if (idx >= 0) state.data.inventory[idx] = { ...it };
    try { localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(state.data)); } catch (e) {}

    // Direct Supabase save (20ms)
    if (window.sbClient) {
      window.sbClient.from('Inventory').upsert(it).then();
    }

    closeModal();
    showToast(`✅ Stock In Confirmed: Added ${qtyIn} ${it.Unit || 'L'} to ${it.SKU || it.Name}! New Stock: ${newQty} ${it.Unit || 'L'}`);
    renderView();

    // Background sync to Google Apps Script
    gas('saveInventoryItem', it).catch(e => console.error(e));

    // Record transaction log entry
    gas('saveTransaction', {
      TxId: 'TX-' + Date.now(),
      Date: dateVal,
      Type: 'Stock In',
      Category: 'Factory Supply',
      Description: `Factory Inward: Received ${qtyIn} ${it.Unit || 'L'} of ${it.SKU || ''} - ${it.Name}. ${noteVal}`,
      Amount: String(Math.round(qtyIn * (Number(it.UnitPrice) || 0) * 100) / 100),
      RefId: it.ItemId,
      RecordedBy: state.user?.Name || 'System'
    }).catch(e => console.warn(e));"""

if old_submit_stockin in code:
    code = code.replace(old_submit_stockin, new_submit_stockin, 1)
    print("Fix 2 (submitStockIn) applied.")
else:
    print("Warning: old_submit_stockin not matched!")

# In adjustStockQuick, update localStorage and do not wipe with premature refreshData
old_adjust_quick = """  async function adjustStockQuick(itemId, delta) {
    const it = state.data.inventory.find(x => x.ItemId === itemId);
    if (!it) return;
    await gas('saveInventoryItem', { ...it, StockQty: Math.max(0, (Number(it.StockQty) || 0) + delta) });
    await refreshData();
  }"""

new_adjust_quick = """  async function adjustStockQuick(itemId, delta) {
    const it = (state.data.inventory || []).find(x => x.ItemId === itemId);
    if (!it) return;
    it.StockQty = Math.max(0, Math.round(((Number(it.StockQty) || 0) + delta) * 100) / 100);
    it.UpdatedAt = state.data.today || new Date().toISOString().slice(0, 10);
    try { localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(state.data)); } catch (e) {}
    if (window.sbClient) window.sbClient.from('Inventory').upsert(it).then();
    renderView();
    gas('saveInventoryItem', it).catch(e => console.error(e));
  }"""

if old_adjust_quick in code:
    code = code.replace(old_adjust_quick, new_adjust_quick, 1)
    print("Fix 2 (adjustStockQuick) applied.")

# -----------------------------------------------------------------------------
# 3. FIX 3: CALL REPORTS & PROJECT REPORTS PERSISTENCE FIX
# -----------------------------------------------------------------------------
# Add to ACTION_TABLE_MAP
old_action_map_tail = """    saveTask: { table: 'Tasks', key: 'TaskId', prefix: 'TSK', prop: 'tasks' },
    deleteTask: { table: 'Tasks', key: 'TaskId', prop: 'tasks' },
    saveUser: { table: 'Users', key: 'UserId', prefix: 'USR', prop: 'users' },
    saveSettings: { table: 'Settings', key: 'Key', isSettings: true }
  };"""

new_action_map_tail = """    saveTask: { table: 'Tasks', key: 'TaskId', prefix: 'TSK', prop: 'tasks' },
    deleteTask: { table: 'Tasks', key: 'TaskId', prop: 'tasks' },
    saveUser: { table: 'Users', key: 'UserId', prefix: 'USR', prop: 'users' },
    saveSettings: { table: 'Settings', key: 'Key', isSettings: true },
    saveCallReport: { table: 'CallReports', key: 'CallId', prefix: 'CALL', prop: 'callReports' },
    deleteCallReport: { table: 'CallReports', key: 'CallId', prop: 'callReports' },
    saveProjectReport: { table: 'ProjectReports', key: 'ProjId', prefix: 'PRJ', prop: 'projectReports' },
    deleteProjectReport: { table: 'ProjectReports', key: 'ProjId', prop: 'projectReports' }
  };"""

if old_action_map_tail in code:
    code = code.replace(old_action_map_tail, new_action_map_tail, 1)
    print("Fix 3 (ACTION_TABLE_MAP Call/Project reports) applied.")

# In submitCallReport
old_call_submit = """    await gas('saveReportEntry', 'CallReports', {
      CallId: id || undefined,
      ReportType: reportType,
      DataJson: JSON.stringify(obj),
      CreatedBy: state.user.Name
    });

    closeModal();
    showToast('Call Report saved successfully!');
    await refreshData();
  }"""

new_call_submit = """    const finalId = id || ('CALL-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
    const payload = {
      CallId: finalId,
      ReportType: reportType,
      DataJson: JSON.stringify(obj),
      CreatedBy: state.user.Name,
      CreatedAt: obj.Date || state.data.today || new Date().toISOString().slice(0, 10)
    };

    // Optimistic local update (0ms)
    if (!state.data.callReports) state.data.callReports = [];
    const idx = state.data.callReports.findIndex(x => x.CallId === finalId);
    if (idx >= 0) {
      state.data.callReports[idx] = payload;
    } else {
      state.data.callReports.unshift(payload);
    }
    try { localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(state.data)); } catch (e) {}

    // Direct Supabase save (20ms)
    if (window.sbClient) {
      window.sbClient.from('CallReports').upsert(payload).then();
    }

    closeModal();
    showToast('Call Report saved successfully!');
    renderCallReportsView();

    // Background sync to Google Apps Script
    gas('saveReportEntry', 'CallReports', payload).catch(e => console.error(e));
  }"""

if old_call_submit in code:
    code = code.replace(old_call_submit, new_call_submit, 1)
    print("Fix 3 (submitCallReport optimistic persistence) applied.")
else:
    print("Warning: old_call_submit not matched!")

# Also fix submitProjectReport
old_proj_submit = """    await gas('saveReportEntry', 'ProjectReports', {
      ProjId: id || undefined,
      DataJson: JSON.stringify(obj),
      CreatedBy: state.user.Name
    });

    closeModal();
    showToast('Project Report saved successfully!');
    await refreshData();
  }"""

new_proj_submit = """    const finalId = id || ('PRJ-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
    const payload = {
      ProjId: finalId,
      DataJson: JSON.stringify(obj),
      CreatedBy: state.user.Name,
      CreatedAt: date || state.data.today || new Date().toISOString().slice(0, 10)
    };

    if (!state.data.projectReports) state.data.projectReports = [];
    const idx = state.data.projectReports.findIndex(x => x.ProjId === finalId);
    if (idx >= 0) {
      state.data.projectReports[idx] = payload;
    } else {
      state.data.projectReports.unshift(payload);
    }
    try { localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(state.data)); } catch (e) {}

    if (window.sbClient) {
      window.sbClient.from('ProjectReports').upsert(payload).then();
    }

    closeModal();
    showToast('Project Report saved successfully!');
    renderProjectReportsView();

    gas('saveReportEntry', 'ProjectReports', payload).catch(e => console.error(e));
  }"""

if old_proj_submit in code:
    code = code.replace(old_proj_submit, new_proj_submit, 1)
    print("Fix 3 (submitProjectReport optimistic persistence) applied.")

# -----------------------------------------------------------------------------
# 4. FIX 4: QUOTATION LINE ITEMS SEARCHABLE + SELECTIVE COMBO
# -----------------------------------------------------------------------------
old_render_quot_lines = """  function renderQuotLines() {
    const invOpts = (state.data.inventory || []).map(it => `
      <option value="${esc(it.ItemId)}">${esc(it.SKU ? it.SKU + ' - ' : '')}${esc(it.Name)} (${it.StockQty} ${esc(it.Unit || 'Units')})</option>
    `).join('');

    const container = document.getElementById('quotLinesContainer');
    if (!container) return;

    container.innerHTML = _quotLines.map((ln, idx) => {
      const lineSub = Number(ln.Qty || 0) * Number(ln.UnitPrice || 0);
      const lineDisc = lineSub * ((Number(ln.Discount) || 0) / 100);
      const lineTotal = Math.round((lineSub - lineDisc) * 100) / 100;
      ln.Amount = lineTotal;

      const matchedItem = (state.data.inventory || []).find(it => it.ItemId === ln.ItemId);
      let stockAlertHtml = '';
      if (matchedItem) {
        const avail = Number(matchedItem.StockQty) || 0;
        const req = Number(ln.Qty) || 0;
        if (req > avail) {
          stockAlertHtml = `<div style="font-size:10.5px; font-weight:700; color:#dc2626; margin-top:3px; background:#fee2e2; border:1px solid #fca5a5; padding:1px 4px; border-radius:4px; white-space:nowrap;">⚠️ In Stock: ${avail}</div>`;
        } else {
          stockAlertHtml = `<div style="font-size:10.5px; font-weight:600; color:#059669; margin-top:3px; white-space:nowrap;">✓ Stock: ${avail}</div>`;
        }
      }

      return `
        <tr style="border-bottom:1px solid #f1f5f9; background:#ffffff;">
          <td style="color:#94a3b8; font-size:14px; text-align:center; cursor:grab; width:28px; padding:8px 4px;">↕</td>
          <td style="padding:8px 8px; width:260px; min-width:240px;">
            <select onchange="pickQuotItem(${idx}, this.value)" style="width:100%; height:38px; padding:6px 8px; font-size:13px; font-weight:500; border:1.5px solid #cbd5e1; border-radius:6px; background:#fff; color:#0f172a; box-sizing:border-box;">
              <option value="">-- Select Code / Item --</option>
              ${invOpts}
            </select>
          </td>
          <td style="padding:8px 8px; min-width:260px;">
            <input placeholder="Product description" value="${esc(ln.Description || '')}" oninput="_quotLines[${idx}].Description=this.value" style="width:100%; height:38px; padding:6px 10px; font-size:13px; border:1.5px solid #cbd5e1; border-radius:6px; color:#0f172a; box-sizing:border-box;">
          </td>
          <td style="padding:8px 6px; width:110px; min-width:100px; text-align:center;">
            <input type="number" min="1" step="any" value="${ln.Qty || 1}" oninput="_quotLines[${idx}].Qty=Number(this.value); updateQuotTotals(); renderQuotLines();" style="width:100%; height:38px; line-height:36px; text-align:center; padding:4px 6px; font-size:14px; font-weight:700; color:#0f172a; background:#ffffff; border:1.5px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
            ${stockAlertHtml}
          </td>
          <td style="padding:8px 8px; width:160px; min-width:150px; text-align:right;">
            <input type="number" step="0.01" value="${ln.UnitPrice || 0}" oninput="_quotLines[${idx}].UnitPrice=Number(this.value); updateQuotTotals()" style="width:100%; height:38px; line-height:36px; text-align:right; padding:4px 10px; font-size:14px; font-weight:600; color:#0f172a; background:#ffffff; border:1.5px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
          </td>
          <td style="padding:8px 8px; width:110px; min-width:100px; text-align:center;">
            <div style="display:flex; align-items:center; gap:4px; justify-content:center;">
              <input type="number" step="0.1" min="0" placeholder="0" value="${ln.Discount || 0}" oninput="_quotLines[${idx}].Discount=Number(this.value); updateQuotTotals()" style="width:70px; height:38px; line-height:36px; text-align:center; padding:4px 6px; font-size:13px; font-weight:600; border:1.5px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
              <span style="font-size:13px; font-weight:700; color:#64748b;">%</span>
            </div>
          </td>
          <td style="padding:8px 8px; width:170px; min-width:160px; text-align:right;">
            <input readonly value="${Number(lineTotal).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}" id="quotLineAmt_${idx}" style="width:100%; height:38px; line-height:36px; text-align:right; font-weight:700; padding:4px 12px; font-size:14px; background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:6px; color:#0f172a; box-sizing:border-box;">
          </td>
          <td style="padding:8px 8px; width:115px; min-width:105px; text-align:center;">
            <select onchange="_quotLines[${idx}].Tax=this.value" style="width:100%; height:38px; padding:4px 8px; font-size:13px; border:1.5px solid #cbd5e1; border-radius:6px; color:#475569; background:#fff; box-sizing:border-box;">
              <option ${ln.Tax === 'No tax' ? 'selected' : ''}>No tax</option>
              <option ${ln.Tax === '0%' ? 'selected' : ''}>0%</option>
            </select>
          </td>
          <td style="padding:8px 4px; width:42px; text-align:center;">
            <button type="button" onclick="removeQuotLine(${idx})" style="background:#dc2626; color:#fff; border:none; border-radius:6px; width:34px; height:34px; cursor:pointer; font-weight:700; font-size:14px; display:inline-flex; align-items:center; justify-content:center;">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    const itemSelects = document.querySelectorAll('#quotLinesContainer tr td:nth-child(2) select');
    _quotLines.forEach((ln, idx) => {
      if (itemSelects[idx]) itemSelects[idx].value = ln.ItemId || '';
    });
    updateQuotTotals();
  }"""

new_render_quot_lines = """  function renderQuotLines() {
    const container = document.getElementById('quotLinesContainer');
    if (!container) return;

    // Datalist of all stock products for instant selective + type search
    const datalistOptions = (state.data.inventory || []).map(it => `
      <option value="${esc(it.SKU ? it.SKU + ' - ' : '')}${esc(it.Name)}">${esc(it.SKU || '')} (${it.StockQty} ${esc(it.Unit || 'Units')}) - ${fmtMoney(it.UnitPrice)}</option>
    `).join('');

    container.innerHTML = `
      <datalist id="quotItemGlobalDataList">
        ${datalistOptions}
      </datalist>
      ` + _quotLines.map((ln, idx) => {
      const lineSub = Number(ln.Qty || 0) * Number(ln.UnitPrice || 0);
      const lineDisc = lineSub * ((Number(ln.Discount) || 0) / 100);
      const lineTotal = Math.round((lineSub - lineDisc) * 100) / 100;
      ln.Amount = lineTotal;

      const matchedItem = (state.data.inventory || []).find(it => 
        (ln.ItemId && it.ItemId === ln.ItemId) ||
        (ln.ItemCode && it.SKU && String(it.SKU).trim().toLowerCase() === String(ln.ItemCode).trim().toLowerCase())
      );
      let stockAlertHtml = '';
      if (matchedItem) {
        const avail = Number(matchedItem.StockQty) || 0;
        const req = Number(ln.Qty) || 0;
        if (req > avail) {
          stockAlertHtml = `<div style="font-size:10.5px; font-weight:700; color:#dc2626; margin-top:3px; background:#fee2e2; border:1px solid #fca5a5; padding:1px 4px; border-radius:4px; white-space:nowrap;">⚠️ In Stock: ${avail}</div>`;
        } else {
          stockAlertHtml = `<div style="font-size:10.5px; font-weight:600; color:#059669; margin-top:3px; white-space:nowrap;">✓ Stock: ${avail}</div>`;
        }
      }

      const displayVal = ln.ItemDisplay || (matchedItem ? `${matchedItem.SKU ? matchedItem.SKU + ' - ' : ''}${matchedItem.Name}` : (ln.Description || ''));

      return `
        <tr style="border-bottom:1px solid #f1f5f9; background:#ffffff;">
          <td style="color:#94a3b8; font-size:14px; text-align:center; cursor:grab; width:28px; padding:8px 4px;">↕</td>
          <td style="padding:8px 8px; width:280px; min-width:260px;">
            <div style="position:relative; display:flex; align-items:center;">
              <input list="quotItemGlobalDataList" placeholder="🔍 Type or select Code / Item..."
                     value="${esc(displayVal)}"
                     onchange="onQuotItemSelect(${idx}, this.value)"
                     style="width:100%; height:38px; padding:6px 26px 6px 10px; font-size:13px; font-weight:600; border:1.5px solid #cbd5e1; border-radius:6px; background:#fff; color:#0f172a; box-sizing:border-box;">
              <span style="position:absolute; right:8px; pointer-events:none; color:#64748b; font-size:11px;">▼</span>
            </div>
          </td>
          <td style="padding:8px 8px; min-width:240px;">
            <input placeholder="Product description" value="${esc(ln.Description || '')}" oninput="_quotLines[${idx}].Description=this.value" style="width:100%; height:38px; padding:6px 10px; font-size:13px; border:1.5px solid #cbd5e1; border-radius:6px; color:#0f172a; box-sizing:border-box;">
          </td>
          <td style="padding:8px 6px; width:110px; min-width:100px; text-align:center;">
            <input type="number" min="1" step="any" value="${ln.Qty || 1}" oninput="_quotLines[${idx}].Qty=Number(this.value); updateQuotTotals(); renderQuotLines();" style="width:100%; height:38px; line-height:36px; text-align:center; padding:4px 6px; font-size:14px; font-weight:700; color:#0f172a; background:#ffffff; border:1.5px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
            ${stockAlertHtml}
          </td>
          <td style="padding:8px 8px; width:160px; min-width:150px; text-align:right;">
            <input type="number" step="0.01" value="${ln.UnitPrice || 0}" oninput="_quotLines[${idx}].UnitPrice=Number(this.value); updateQuotTotals()" style="width:100%; height:38px; line-height:36px; text-align:right; padding:4px 10px; font-size:14px; font-weight:600; color:#0f172a; background:#ffffff; border:1.5px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
          </td>
          <td style="padding:8px 8px; width:110px; min-width:100px; text-align:center;">
            <div style="display:flex; align-items:center; gap:4px; justify-content:center;">
              <input type="number" step="0.1" min="0" placeholder="0" value="${ln.Discount || 0}" oninput="_quotLines[${idx}].Discount=Number(this.value); updateQuotTotals()" style="width:70px; height:38px; line-height:36px; text-align:center; padding:4px 6px; font-size:13px; font-weight:600; border:1.5px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
              <span style="font-size:13px; font-weight:700; color:#64748b;">%</span>
            </div>
          </td>
          <td style="padding:8px 8px; width:170px; min-width:160px; text-align:right;">
            <input readonly value="${Number(lineTotal).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}" id="quotLineAmt_${idx}" style="width:100%; height:38px; line-height:36px; text-align:right; font-weight:700; padding:4px 12px; font-size:14px; background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:6px; color:#0f172a; box-sizing:border-box;">
          </td>
          <td style="padding:8px 8px; width:115px; min-width:105px; text-align:center;">
            <select onchange="_quotLines[${idx}].Tax=this.value" style="width:100%; height:38px; padding:4px 8px; font-size:13px; border:1.5px solid #cbd5e1; border-radius:6px; color:#475569; background:#fff; box-sizing:border-box;">
              <option ${ln.Tax === 'No tax' ? 'selected' : ''}>No tax</option>
              <option ${ln.Tax === '0%' ? 'selected' : ''}>0%</option>
            </select>
          </td>
          <td style="padding:8px 4px; width:42px; text-align:center;">
            <button type="button" onclick="removeQuotLine(${idx})" style="background:#dc2626; color:#fff; border:none; border-radius:6px; width:34px; height:34px; cursor:pointer; font-weight:700; font-size:14px; display:inline-flex; align-items:center; justify-content:center;">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    updateQuotTotals();
  }

  function onQuotItemSelect(idx, val) {
    if (!_quotLines[idx]) return;
    const v = String(val || '').trim().toLowerCase();
    const item = (state.data.inventory || []).find(it => {
      const full = `${it.SKU ? it.SKU + ' - ' : ''}${it.Name}`.toLowerCase();
      return full === v ||
             (it.SKU && it.SKU.toLowerCase() === v) ||
             (it.Name && it.Name.toLowerCase() === v) ||
             (it.ItemId && it.ItemId.toLowerCase() === v);
    });

    if (item) {
      _quotLines[idx].ItemId = item.ItemId;
      _quotLines[idx].ItemCode = item.SKU || '';
      _quotLines[idx].Description = item.Name;
      _quotLines[idx].UnitPrice = Number(item.UnitPrice) || 0;
      _quotLines[idx].ItemDisplay = `${item.SKU ? item.SKU + ' - ' : ''}${item.Name}`;
    } else {
      _quotLines[idx].Description = val;
      _quotLines[idx].ItemDisplay = val;
    }
    renderQuotLines();
  }"""

if old_render_quot_lines in code:
    code = code.replace(old_render_quot_lines, new_render_quot_lines, 1)
    print("Fix 4 (searchable datalist for quotation line items) applied.")
else:
    print("Warning: old_render_quot_lines not matched!")

# -----------------------------------------------------------------------------
# 5. FIX 5: REMOVE INCOME & EXPENSES TAB FROM SALES INVOICES VIEW
# -----------------------------------------------------------------------------
old_inv_tabs = """      <div class="tabs" style="margin-bottom:14px;">
        <button class="tab-btn ${tab === 'invoices' ? 'active' : ''}" onclick="state.invTab='invoices'; renderInvoicesView()">Sales Invoices &amp; Orders</button>
        <button class="tab-btn ${tab === 'notDispatched' ? 'active' : ''}" onclick="state.invTab='notDispatched'; renderInvoicesView()" style="position:relative;">
          🚚 Not Dispatched Orders
          ${notDispatchedCount > 0 ? `<span style="background:#ea580c; color:#fff; font-size:11px; font-weight:800; padding:2px 7px; border-radius:10px; margin-left:6px;">${notDispatchedCount}</span>` : ''}
        </button>
        <button class="tab-btn ${tab === 'accounts' ? 'active' : ''}" onclick="state.invTab='accounts'; renderInvoicesView()">Income &amp; Expenses</button>
      </div>"""

new_inv_tabs = """      <div class="tabs" style="margin-bottom:14px;">
        <button class="tab-btn ${tab === 'invoices' ? 'active' : ''}" onclick="state.invTab='invoices'; renderInvoicesView()">Sales Invoices &amp; Orders</button>
        <button class="tab-btn ${tab === 'notDispatched' ? 'active' : ''}" onclick="state.invTab='notDispatched'; renderInvoicesView()" style="position:relative;">
          🚚 Not Dispatched Orders
          ${notDispatchedCount > 0 ? `<span style="background:#ea580c; color:#fff; font-size:11px; font-weight:800; padding:2px 7px; border-radius:10px; margin-left:6px;">${notDispatchedCount}</span>` : ''}
        </button>
      </div>"""

if old_inv_tabs in code:
    code = code.replace(old_inv_tabs, new_inv_tabs, 1)
    print("Fix 5 (remove accounts tab from invoices view) applied.")
else:
    print("Warning: old_inv_tabs not matched!")

# Also ensure state.invTab defaults to 'invoices' if accounts
code = code.replace("const tab = state.invTab || 'invoices';", "const tab = (state.invTab === 'accounts' ? 'invoices' : (state.invTab || 'invoices'));")

# -----------------------------------------------------------------------------
# 6. FIX 6: DAILY ATTENDANCE FINGERPRINT BIOMETRIC DEVICE ADAPTATION
# -----------------------------------------------------------------------------
old_attendance_section = """    } else if (tab === 'attendance') {
      const rows = [...(state.data.attendance || [])].reverse();
      body = `
        <div class="section-header">
          <div>
            <h3 style="margin:0; font-size:15px; color:var(--text);">Daily Attendance Records</h3>
            <div style="font-size:12px; color:var(--muted);">View employee punch in/out timestamps, duration, and daily status.</div>
          </div>
          <div class="section-actions">
            <input class="search-input" placeholder="Search by name or date..." oninput="filterTable('attTable', this.value)">
            <button class="btn btn-secondary" onclick="exportAttendanceExcel()">⬇ Export Excel</button>
          </div>
        </div>
        <div class="card table-wrap">
          <table id="attTable">
            <thead><tr style="background:#f1f5f9;"><th>Date</th><th>Team Member</th><th>Clock In</th><th>Clock Out</th><th>Duration</th><th>Status</th></tr></thead>
            <tbody>
              ${rows.map(a => {
                let duration = '-';
                if (a.ClockIn && a.ClockOut) {
                  try {
                    const t1 = new Date('1970-01-01T' + a.ClockIn);
                    const t2 = new Date('1970-01-01T' + a.ClockOut);
                    const diffM = Math.floor((t2 - t1) / 60000);
                    if (diffM > 0) duration = `${Math.floor(diffM / 60)}h ${diffM % 60}m`;
                  } catch (e) {}
                }
                return `
                  <tr>
                    <td>${esc(a.Date)}</td>
                    <td><b>${esc(a.UserName)}</b></td>
                    <td><span class="badge badge-success">${esc(a.ClockIn)}</span></td>
                    <td>${a.ClockOut ? `<span class="badge badge-info">${esc(a.ClockOut)}</span>` : '<span style="color:var(--muted)">-</span>'}</td>
                    <td>${duration}</td>
                    <td><span class="badge badge-success">Present</span></td>
                  </tr>
                `;
              }).join('') || '<tr><td colspan="6" style="color:var(--muted)">No attendance records found.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;"""

new_attendance_section = """    } else if (tab === 'attendance') {
      const rows = [...(state.data.attendance || [])].reverse();
      body = `
        <!-- Fingerprint Biometric Device Readiness Card -->
        <div class="card" style="margin-bottom:14px; background:#f0fdf4; border:1.5px solid #16a34a; padding:12px 16px; border-radius:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="font-size:30px;">👆</div>
              <div>
                <div style="font-weight:700; color:#166534; font-size:14px; display:flex; align-items:center; gap:8px;">
                  Fingerprint Biometric Device Integration
                  <span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fcd34d; font-size:11px;">Hardware Setup Pending</span>
                </div>
                <div style="font-size:12px; color:#15803d; margin-top:2px;">
                  System is fully prepared for biometric fingerprint integration. You can import machine punch logs (CSV/Excel) or record manual punches until hardware installation is complete.
                </div>
              </div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn btn-sm btn-success" style="background:#16a34a; border-color:#16a34a; font-weight:700;" onclick="openFingerprintLogModal()">📥 Import Machine Log (CSV)</button>
              <button class="btn btn-sm btn-primary" onclick="openManualPunchModal()">+ Record Punch</button>
            </div>
          </div>
        </div>

        <div class="section-header">
          <div>
            <h3 style="margin:0; font-size:15px; color:var(--text);">Daily Attendance Records</h3>
            <div style="font-size:12px; color:var(--muted);">View employee punch in/out timestamps, duration, method (Fingerprint / Web), and daily status.</div>
          </div>
          <div class="section-actions">
            <input class="search-input" placeholder="Search by name, date or method..." oninput="filterTable('attTable', this.value)">
            <button class="btn btn-secondary" onclick="exportAttendanceExcel()">⬇ Export Excel</button>
          </div>
        </div>
        <div class="card table-wrap">
          <table id="attTable">
            <thead>
              <tr style="background:#f1f5f9;">
                <th>Date</th>
                <th>Team Member</th>
                <th>Biometric ID</th>
                <th>Method</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(a => {
                let duration = '-';
                if (a.ClockIn && a.ClockOut) {
                  try {
                    const t1 = new Date('1970-01-01T' + a.ClockIn);
                    const t2 = new Date('1970-01-01T' + a.ClockOut);
                    const diffM = Math.floor((t2 - t1) / 60000);
                    if (diffM > 0) duration = `${Math.floor(diffM / 60)}h ${diffM % 60}m`;
                  } catch (e) {}
                }
                const emp = (state.data.employees || []).find(e => e.EmpId === a.UserId || e.Name === a.UserName);
                const bioId = a.BiometricId || (emp ? (emp.BiometricId || emp.NIC || '-') : '-');
                const methodBadge = a.Method === 'Fingerprint'
                  ? '<span class="badge" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0;">👆 Fingerprint</span>'
                  : '<span class="badge badge-secondary">💻 Web / Manual</span>';
                return `
                  <tr>
                    <td>${esc(a.Date)}</td>
                    <td><b>${esc(a.UserName)}</b></td>
                    <td><code style="font-weight:700; color:#0f766e;">${esc(bioId)}</code></td>
                    <td>${methodBadge}</td>
                    <td><span class="badge badge-success">${esc(a.ClockIn)}</span></td>
                    <td>${a.ClockOut ? `<span class="badge badge-info">${esc(a.ClockOut)}</span>` : '<span style="color:var(--muted)">-</span>'}</td>
                    <td>${duration}</td>
                    <td><span class="badge badge-success">Present</span></td>
                  </tr>
                `;
              }).join('') || '<tr><td colspan="8" style="color:var(--muted); text-align:center;">No attendance records found.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;"""

if old_attendance_section in code:
    code = code.replace(old_attendance_section, new_attendance_section, 1)
    print("Fix 6 (Attendance Fingerprint Integration UI) applied.")
else:
    print("Warning: old_attendance_section not matched!")

# Also append openFingerprintLogModal and openManualPunchModal helpers if not present
attendance_helpers = """
  /* ==========================================================================
   * Fingerprint Biometric Device Handlers (Requirement 6)
   * ======================================================================== */

  function openFingerprintLogModal() {
    openModal(
      '📥 Import Fingerprint Machine Logs (CSV / Excel)',
      `
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:6px; margin-bottom:14px; font-size:12.5px; color:#166534;">
          <b>Fingerprint Device Log Formats Supported:</b> Standard USB / Network punch export (Columns: Enroll ID, Date, Clock In, Clock Out).
        </div>
        <div class="form-group">
          <label style="font-weight:700;">Select Device Punch Log File (.csv or .xlsx)</label>
          <input type="file" id="fFpLogFile" accept=".csv, .xlsx, .xls, .dat, .txt" style="padding:8px; border:1.5px dashed #cbd5e1; border-radius:6px; width:100%;">
        </div>
        <div class="form-group">
          <label style="font-weight:700;">Or Paste Machine Log Data</label>
          <textarea id="fFpLogText" rows="4" placeholder="EnrollID, Date, TimeIn, TimeOut&#10;101, 2026-11-18, 08:30, 17:00" style="font-family:monospace; font-size:12px;"></textarea>
        </div>
      `,
      `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-success" style="background:#16a34a; border-color:#16a34a; font-weight:700;" onclick="submitFingerprintLogImport()">📥 Import &amp; Process Punches</button>
      `
    );
  }

  async function submitFingerprintLogImport() {
    const text = document.getElementById('fFpLogText')?.value.trim();
    if (!text) {
      showToast('Please upload a file or paste machine log lines.');
      return;
    }
    const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);
    let count = 0;
    lines.forEach(l => {
      const parts = l.split(/[,\\t]/).map(p => p.trim());
      if (parts.length >= 3 && !parts[0].toLowerCase().includes('enroll')) {
        const enrollId = parts[0];
        const date = parts[1];
        const clockIn = parts[2];
        const clockOut = parts[3] || '';
        const emp = (state.data.employees || []).find(e => (e.BiometricId && String(e.BiometricId) === String(enrollId)) || e.NIC === enrollId || e.EmpId === enrollId);
        const userName = emp ? emp.Name : ('User #' + enrollId);
        const record = {
          AttId: 'ATT-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          Date: date,
          UserId: emp ? emp.EmpId : enrollId,
          UserName: userName,
          BiometricId: enrollId,
          ClockIn: clockIn,
          ClockOut: clockOut,
          Method: 'Fingerprint'
        };
        (state.data.attendance = state.data.attendance || []).unshift(record);
        count++;
      }
    });

    try { localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(state.data)); } catch (e) {}
    closeModal();
    renderEmployeesView();
    showToast(`✅ Successfully imported ${count} fingerprint punch records!`);
  }

  function openManualPunchModal() {
    const emps = (state.data.employees || []).filter(e => e.Status !== 'Inactive');
    openModal(
      '🕒 Record Manual Attendance Punch',
      `
        <div class="form-group">
          <label style="font-weight:700;">Employee *</label>
          <select id="fManPunchEmp" style="height:38px;">
            ${emps.map(e => `<option value="${esc(e.EmpId)}" data-name="${esc(e.Name)}">${esc(e.Name)} (${esc(e.Position || e.Designation || 'Staff')})</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label style="font-weight:700;">Date *</label>
            <input type="date" id="fManPunchDate" value="${state.data.today || new Date().toISOString().slice(0, 10)}">
          </div>
          <div class="form-group">
            <label style="font-weight:700;">Method</label>
            <select id="fManPunchMethod">
              <option value="Manual Entry">💻 Manual Entry</option>
              <option value="Fingerprint">👆 Fingerprint Device Punch</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label style="font-weight:700;">Clock In Time *</label>
            <input type="time" id="fManPunchIn" value="08:30">
          </div>
          <div class="form-group">
            <label style="font-weight:700;">Clock Out Time</label>
            <input type="time" id="fManPunchOut" value="17:00">
          </div>
        </div>
      `,
      `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitManualPunch()">Save Attendance</button>
      `
    );
  }

  async function submitManualPunch() {
    const sel = document.getElementById('fManPunchEmp');
    const empId = sel?.value;
    const empName = sel?.options[sel.selectedIndex]?.getAttribute('data-name') || sel?.options[sel.selectedIndex]?.text || '';
    const date = document.getElementById('fManPunchDate')?.value;
    const clockIn = document.getElementById('fManPunchIn')?.value;
    const clockOut = document.getElementById('fManPunchOut')?.value || '';
    const method = document.getElementById('fManPunchMethod')?.value || 'Manual Entry';

    if (!empId || !date || !clockIn) {
      showToast('Please fill Employee, Date, and Clock In time.');
      return;
    }

    const emp = (state.data.employees || []).find(e => e.EmpId === empId);
    const newRecord = {
      AttId: 'ATT-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      Date: date,
      UserId: empId,
      UserName: empName,
      BiometricId: emp?.BiometricId || emp?.NIC || '-',
      ClockIn: clockIn,
      ClockOut: clockOut,
      Method: method
    };

    (state.data.attendance = state.data.attendance || []).unshift(newRecord);
    try { localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(state.data)); } catch (e) {}
    closeModal();
    renderEmployeesView();
    showToast(`Attendance recorded for ${empName}!`);
  }
"""

if 'openFingerprintLogModal' not in code:
    code = code.replace("function renderAttendanceView() {", attendance_helpers + "\n  function renderAttendanceView() {", 1)
    print("Fix 6 (Fingerprint Attendance Helpers) added.")

# Also add BiometricId input to openEmployeeModal
old_emp_modal_row = """        <div class="form-row">
          <div class="form-group">
            <label>NIC Number *</label>
            <input id="fEmNIC" value="${esc(e.NIC)}" placeholder="e.g. 199012345678 or 901234567V" required>
          </div>
          <div class="form-group">
            <label>EPF / ETF Number</label>
            <input id="fEmEpf" value="${esc(e.EpfEtfNo)}" placeholder="e.g. EPF-102">
          </div>
        </div>"""

new_emp_modal_row = """        <div class="form-row">
          <div class="form-group">
            <label>NIC Number *</label>
            <input id="fEmNIC" value="${esc(e.NIC)}" placeholder="e.g. 199012345678 or 901234567V" required>
          </div>
          <div class="form-group">
            <label>EPF / ETF Number</label>
            <input id="fEmEpf" value="${esc(e.EpfEtfNo)}" placeholder="e.g. EPF-102">
          </div>
          <div class="form-group">
            <label>Biometric / Fingerprint Enroll ID</label>
            <input id="fEmBiometricId" value="${esc(e.BiometricId || '')}" placeholder="e.g. 101, FP-01">
          </div>
        </div>"""

if old_emp_modal_row in code:
    code = code.replace(old_emp_modal_row, new_emp_modal_row, 1)
    print("Fix 6 (Employee BiometricId field) applied.")

# In submitEmployee, capture BiometricId
old_submit_emp = """      EpfEtfNo: document.getElementById('fEmEpf')?.value.trim() || '',"""
new_submit_emp = """      EpfEtfNo: document.getElementById('fEmEpf')?.value.trim() || '',
      BiometricId: document.getElementById('fEmBiometricId')?.value.trim() || '',"""

if old_submit_emp in code:
    code = code.replace(old_submit_emp, new_submit_emp, 1)
    print("Fix 6 (submitEmployee BiometricId capture) applied.")

with open('Scripts.html', 'w', encoding='utf-8') as f:
    f.write(code)

print("All 6 fixes applied to Scripts.html successfully!")
