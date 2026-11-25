import os
import re

def build_client():
    with open('Index.html', 'r', encoding='utf-8') as f:
        idx = f.read()
    with open('Styles.html', 'r', encoding='utf-8') as f:
        styles = f.read().strip()
    with open('Scripts.html', 'r', encoding='utf-8') as f:
        scripts = f.read().strip()

    # 1. Inject Server Badge into Topbar
    topbar_target = '<div class="topbar-user"'
    topbar_badge = '''
      <div id="serverConnBadge" onclick="openServerConnectModal(true)" style="display:inline-flex; align-items:center; gap:6px; background:#ecfdf5; border:1px solid #10b981; border-radius:20px; padding:4px 12px; font-size:12px; font-weight:700; color:#065f46; cursor:pointer; margin-right:12px;" title="Click to change Office Server IP">
        <span style="font-size:10px; color:#10b981;">●</span> LAN Server: <span id="lblCurrentServerIp">Connecting...</span> ⚙️
      </div>
      <div class="topbar-user"'''
    idx = idx.replace(topbar_target, topbar_badge)

    # 2. Inject Change IP link in Login Screen
    login_target = '</form>'
    login_ip_link = '''</form>
      <div style="margin-top:14px; text-align:center;">
        <a href="javascript:void(0)" onclick="openServerConnectModal(true)" style="font-size:11.5px; color:#059669; font-weight:600; text-decoration:none;">
          🔌 Server Address: <span id="lblLoginServerIp">http://localhost:3000</span> (Change)
        </a>
      </div>'''
    idx = idx.replace(login_target, login_ip_link)

    # 3. Inject Server Connect Modal before closing body
    server_modal_html = '''
  <!-- Server Connection Modal -->
  <div id="serverConnectModal" class="modal-backdrop hidden" style="z-index:999999;">
    <div class="modal" style="max-width:460px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2);">
      <div class="modal-header" style="border-bottom:1px solid #e2e8f0; padding:14px 18px;">
        <h3 style="margin:0; font-size:16px; color:#0f172a; display:flex; align-items:center; gap:8px;">
          <span>🔌</span> Connect to Office Server
        </h3>
        <button class="btn btn-sm btn-secondary close-btn" onclick="closeServerConnectModal()">✕</button>
      </div>
      <div class="modal-body" style="padding:18px;">
        <p style="font-size:13px; color:#64748b; margin-top:0; line-height:1.5;">
          Enter the IP address of the main office Server PC (e.g. <code>192.168.1.11</code>):
        </p>
        <div class="form-group" style="margin-bottom:14px;">
          <label style="font-weight:700; display:block; margin-bottom:6px; font-size:13px; color:#1e293b;">Server IP / URL</label>
          <input id="txtServerIpInput" placeholder="192.168.1.11 or localhost" 
                 style="width:100%; box-sizing:border-box; font-family:monospace; font-size:14px; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-weight:600; color:#0f766e;" 
                 value="http://localhost:3000">
          <div style="font-size:11.5px; color:#94a3b8; margin-top:4px;">Type the Server PC's IP, e.g. <code>192.168.1.11</code> or <code>localhost</code></div>
        </div>
        <div id="serverTestStatus" style="font-size:12.5px; margin-bottom:14px; min-height:22px; font-weight:600; word-break:break-all;"></div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary" style="flex:1;" onclick="testServerConnection()">🔍 Test Connection</button>
          <button class="btn btn-primary" style="flex:1;" onclick="saveServerConnection()">💾 Save & Connect</button>
        </div>
      </div>
    </div>
  </div>
'''
    idx = idx.replace('</body>', server_modal_html + '\n</body>')

    # 4. Define LAN Server Communication Bridge
    server_client_js = '''
  /* ==========================================================================
   * Desktop Client - LAN Server Communication Bridge
   * ======================================================================== */
  function normalizeServerUrl(input) {
    let url = String(input || '').trim().replace(/\\/+$/, '');
    if (!url) return 'http://localhost:3000';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }
    const cleanHost = url.replace(/^https?:\\/\\//, '').split('/')[0];
    if (!cleanHost.includes(':')) {
      url = url.replace(cleanHost, cleanHost + ':3000');
    }
    return url;
  }

  function getServerBaseUrl() {
    let url = localStorage.getItem('OFFICE_SERVER_IP');
    if (!url) {
      url = 'http://localhost:3000';
      localStorage.setItem('OFFICE_SERVER_IP', url);
    }
    return normalizeServerUrl(url);
  }

  function updateServerDisplayBadges() {
    const url = getServerBaseUrl();
    const lblCurrent = document.getElementById('lblCurrentServerIp');
    const lblLogin = document.getElementById('lblLoginServerIp');
    if (lblCurrent) lblCurrent.textContent = url.replace(/^https?:\\/\\//, '');
    if (lblLogin) lblLogin.textContent = url;
  }

  function openServerConnectModal(force) {
    const modal = document.getElementById('serverConnectModal');
    const input = document.getElementById('txtServerIpInput');
    const status = document.getElementById('serverTestStatus');
    if (input) input.value = getServerBaseUrl();
    if (status) { status.textContent = ''; status.className = ''; }
    if (modal) modal.classList.remove('hidden');
  }

  function closeServerConnectModal() {
    const modal = document.getElementById('serverConnectModal');
    if (modal) modal.classList.add('hidden');
  }

  async function testServerConnection() {
    const input = document.getElementById('txtServerIpInput');
    const status = document.getElementById('serverTestStatus');
    let raw = (input ? input.value : '').trim();
    if (!raw) {
      if (status) {
        status.textContent = 'Please enter a server IP (e.g. 192.168.1.11)';
        status.style.color = '#ef4444';
      }
      return;
    }
    const target = normalizeServerUrl(raw);
    if (input) input.value = target;

    if (status) {
      status.textContent = 'Testing connection to ' + target + '...';
      status.style.color = '#0284c7';
    }

    const t0 = Date.now();
    try {
      const res = await fetch(target + '/api/ping', { method: 'GET', cache: 'no-store' });
      const data = await res.json();
      const latency = Date.now() - t0;
      if (data && data.ok) {
        if (status) {
          status.textContent = `✓ Connected! Server online (${latency}ms latency)`;
          status.style.color = '#059669';
        }
      } else {
        if (status) {
          status.textContent = '✗ Server responded with an invalid response';
          status.style.color = '#ef4444';
        }
      }
    } catch (err) {
      if (status) {
        status.textContent = '✗ Connection failed to ' + target + ' (Check if Server is running and Firewall Port 3000 is open)';
        status.style.color = '#ef4444';
      }
    }
  }

  async function saveServerConnection() {
    const input = document.getElementById('txtServerIpInput');
    const status = document.getElementById('serverTestStatus');
    let raw = (input ? input.value : '').trim();
    if (!raw) return;
    const target = normalizeServerUrl(raw);
    
    if (status) {
      status.textContent = 'Connecting to ' + target + '...';
      status.style.color = '#0284c7';
    }

    try {
      const res = await fetch(target + '/api/ping', { method: 'GET', cache: 'no-store' });
      const data = await res.json();
      if (!data || !data.ok) throw new Error('Invalid response');
      
      localStorage.setItem('OFFICE_SERVER_IP', target);
      updateServerDisplayBadges();
      closeServerConnectModal();
      showToast('Connected to Server: ' + target);

      // Reload Login Users immediately
      loadLoginUsersNow();
      
      // Re-fetch data from the new server address if logged in
      if (typeof fetchAppData === 'function') {
        fetchAppData();
      }
    } catch (err) {
      if (status) {
        status.textContent = '✗ Could not connect to ' + target + '. Please check server IP and Firewall.';
        status.style.color = '#ef4444';
      }
      showToast('Connection failed: ' + target);
    }
  }

  function loadLoginUsersNow() {
    const sel = document.getElementById('loginUser');
    if (sel) sel.innerHTML = '<option value="">Connecting & loading users...</option>';
    gas('getLoginUsers').then(users => {
      if (sel && Array.isArray(users) && users.length) {
        sel.innerHTML = users.map(u => `<option value="${esc(u.UserId)}">${esc(u.Name)} (${esc(u.Role)})</option>`).join('');
        try { localStorage.setItem('cached_login_users_v1', JSON.stringify(users)); } catch (e) {}
      } else if (sel) {
        sel.innerHTML = '<option value="">No users found in database</option>';
      }
    }).catch(err => {
      console.warn('Failed to load login users:', err);
      if (sel) {
        sel.innerHTML = '<option value="">⚠️ Server not reached (Click Server Address below)</option>';
      }
    });
  }

  // Intercept window.print for Electron native printing
  if (window.electronAPI && typeof window.electronAPI.printNative === 'function') {
    const origPrint = window.print;
    window.print = function() {
      window.electronAPI.printNative({ silent: false, printBackground: true });
    };
  }

  if (window.electronAPI && typeof window.electronAPI.onOpenServerSettings === 'function') {
    window.electronAPI.onOpenServerSettings(() => {
      openServerConnectModal(true);
    });
  }

  // Check server connection on startup
  window.addEventListener('DOMContentLoaded', () => {
    updateServerDisplayBadges();
    loadLoginUsersNow();
    setTimeout(() => {
      const serverUrl = getServerBaseUrl();
      fetch(serverUrl + '/api/ping', { method: 'GET', cache: 'no-store' })
        .then(r => r.json())
        .then(d => {
          if (!d || !d.ok) openServerConnectModal(true);
        })
        .catch(() => {
          openServerConnectModal(true);
        });
    }, 1500);
  });
'''

    # Direct replacement of callGasDirect & gas in Scripts
    lan_gas_functions = '''function callGasDirect(fnName, args) {
    document.getElementById('loadingBar')?.classList.remove('hidden');
    return new Promise((resolve, reject) => {
      const serverUrl = getServerBaseUrl();
      fetch(serverUrl + '/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: fnName, args: args })
      })
      .then(r => r.json())
      .then(res => {
        document.getElementById('loadingBar')?.classList.add('hidden');
        if (res && res.ok) {
          resolve(res.result !== undefined ? res.result : res.data);
        } else {
          const msg = res && res.error ? res.error : 'Unknown backend error';
          showToast('Error: ' + msg);
          reject(new Error(msg));
        }
      })
      .catch(err => {
        document.getElementById('loadingBar')?.classList.add('hidden');
        console.warn('LAN Server RPC failed:', err);
        showToast('Server connection failed: ' + err.message);
        reject(err);
      });
    });
  }

  function gas(fnName, ...args) {
    return callGasDirect(fnName, args);
  }'''

    # Replace from 'function callGasDirect(' up to 'function showToast('
    pos_callGas = scripts.find('function callGasDirect(')
    pos_showToast = scripts.find('function showToast(', pos_callGas)
    if pos_callGas != -1 and pos_showToast != -1:
        scripts = scripts[:pos_callGas] + lan_gas_functions + '\n\n  ' + scripts[pos_showToast:]
    else:
        print('Warning: could not locate callGasDirect and showToast in Scripts.html!')

    # Append server_client_js to scripts
    scripts = scripts.replace('</script>', server_client_js + '\n</script>')

    # Replace includes
    out = idx.replace("<?!= include('Styles'); ?>", styles)
    out = out.replace("<?!= include('Scripts'); ?>", scripts)

    out_file = 'client-desktop/renderer/index.html'
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(out)

    print(f'Successfully built {out_file} ({len(out)} bytes, {out.count(chr(10))} lines)')

if __name__ == '__main__':
    build_client()
