with open('Scripts.html', 'r', encoding='utf-8') as f:
    code = f.read()

start_att = code.find("} else if (tab === 'attendance') {")
end_att = code.find("} else {", start_att)

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
    with open('Scripts.html', 'w', encoding='utf-8') as f:
        f.write(code)
else:
    print("Warning: Attendance boundaries not found!")
