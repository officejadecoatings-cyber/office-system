with open('Scripts.html', 'r', encoding='utf-8') as f:
    code = f.read()

# -----------------------------------------------------------------------------
# FIX 4: QUOTATION SEARCHABLE & SELECTIVE DATALIST COMBO
# -----------------------------------------------------------------------------
start_quot = code.find('function renderQuotLines() {')
end_quot = code.find('function addQuotLine() {', start_quot)

if start_quot != -1 and end_quot != -1:
    new_quot_lines = """function renderQuotLines() {
    const container = document.getElementById('quotLinesContainer');
    if (!container) return;

    // Global Datalist of all stock products for instant selective + type search
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
        (ln.ItemCode && it.SKU && String(it.SKU).trim().toLowerCase() === String(ln.ItemCode).trim().toLowerCase()) ||
        (ln.Description && it.Name && String(it.Name).trim().toLowerCase() === String(ln.Description).trim().toLowerCase())
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
    updateQuotTotals();
  }

  function pickQuotItem(idx, itemId) {
    onQuotItemSelect(idx, itemId);
  }

  """
    code = code[:start_quot] + new_quot_lines + code[end_quot:]
    print("Fix 4 applied successfully!")
else:
    print("Warning: Quot lines boundaries not found!")

# -----------------------------------------------------------------------------
# FIX 6: ATTENDANCE FINGERPRINT DEVICE INTEGRATION VIEW
# -----------------------------------------------------------------------------
start_att = code.find("} else if (tab === 'attendance') {")
end_att = code.find("} else if (tab === 'leave') {", start_att)

if start_att != -1 and end_att != -1:
    new_att_body = """} else if (tab === 'attendance') {
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
                    <td>${a.ClockOut ? `<span class="badge badge-info">${esc(a.ClockOut)}</span>` : '<span class="badge badge-warning">Active</span>'}</td>
                    <td><b>${esc(duration)}</b></td>
                    <td>${statusBadge(a.Status || 'Present')}</td>
                  </tr>
                `;
              }).join('') || '<tr><td colspan="8" style="color:var(--muted); text-align:center;">No attendance records found.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    """
    code = code[:start_att] + new_att_body + code[end_att:]
    print("Fix 6 applied successfully!")
else:
    print("Warning: Attendance boundaries not found!")

with open('Scripts.html', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated Scripts.html with all fixes!")
