import urllib.request
import json
import os
import csv
import pandas as pd

GAS_URL = 'https://script.google.com/macros/s/AKfycbzp7Cx1LsYEgR9vo6tqP-b8tpcL1fJR0pMUnSdmpboFRX_eK0MoLwX3LNNx05zUo3M_6A/exec'
SUPABASE_URL = 'https://ftucnvtpmkftjzoobrfq.supabase.co'
SUPABASE_KEY = 'sb_publishable_T4O1XsAawck_ix9z_acpdA_EWcNkJtR'

MIGRATION_DIR = os.path.abspath('migration_data')
os.makedirs(MIGRATION_DIR, exist_ok=True)

print('========================================================')
print('      Live Data Exporter & Migration Pipeline           ')
print('========================================================')
print(f'Target Directory: {MIGRATION_DIR}\n')

# 1. Fetch from Google Apps Script
print('[1/4] Fetching all live tables from Google Apps Script / Sheets...')
payload = json.dumps({'action': 'getAppData', 'args': []}).encode('utf-8')
req = urllib.request.Request(GAS_URL, data=payload, headers={'Content-Type': 'text/plain;charset=utf-8'})

gas_data = {}
try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        if res.get('ok'):
            gas_data = res.get('result') or res.get('data') or {}
            print('  ✓ Successfully fetched data from Google Apps Script!')
        else:
            print('  ! GAS response error:', res.get('error'))
except Exception as e:
    print('  ! Error fetching from GAS:', e)

# 2. Fetch from Supabase for any supplemental records
print('\n[2/4] Checking Supabase for supplemental records...')
sb_headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}'
}

sb_tables = ['Customers', 'Inventory', 'Invoices', 'InvoiceItems', 'Quotations', 'OrderForms', 'Creditors', 'Employees', 'Settings', 'Users', 'Suppliers', 'PettyCash', 'CallReports', 'ProjectReports', 'Tasks']

sb_data = {}
for tbl in sb_tables:
    try:
        url = f'{SUPABASE_URL}/rest/v1/{tbl}?select=*'
        r = urllib.request.Request(url, headers=sb_headers)
        with urllib.request.urlopen(r, timeout=15) as resp:
            rows = json.loads(resp.read().decode('utf-8'))
            if rows:
                sb_data[tbl.lower()] = rows
                print(f'  ✓ Supabase {tbl}: {len(rows)} records')
    except Exception:
        pass

# 3. Merge Datasets (GAS primary, deduplicate with Supabase)
print('\n[3/4] Merging and organizing tables...')
unified = {}

# Map table names
table_mapping = {
    'settings': 'Settings',
    'users': 'Users',
    'customers': 'Customers',
    'suppliers': 'Suppliers',
    'inventory': 'Inventory',
    'invoices': 'Invoices',
    'invoiceItems': 'InvoiceItems',
    'companyProfiles': 'CompanyProfiles',
    'quotations': 'Quotations',
    'orderForms': 'OrderForms',
    'orderFormItems': 'OrderFormItems',
    'creditors': 'Creditors',
    'pettyCash': 'PettyCash',
    'callReports': 'CallReports',
    'projectReports': 'ProjectReports',
    'painterQuotations': 'PainterQuotations',
    'painterBillBalances': 'PainterBillBalances',
    'painterParticipants': 'PainterParticipants',
    'employees': 'Employees',
    'customTabs': 'CustomTabs',
    'customTabRows': 'CustomTabRows',
    'transactions': 'Transactions',
    'attendance': 'Attendance',
    'leaves': 'Leaves',
    'tasks': 'Tasks',
    'savedReports': 'SavedReports'
}

pk_mapping = {
    'Settings': 'Key',
    'Users': 'UserId',
    'Customers': 'CustomerId',
    'Suppliers': 'SupplierId',
    'Inventory': 'ItemId',
    'Invoices': 'InvoiceId',
    'InvoiceItems': 'LineId',
    'CompanyProfiles': 'CompanyId',
    'Quotations': 'QuotationId',
    'OrderForms': 'OrderId',
    'OrderFormItems': 'LineId',
    'Creditors': 'CreditorId',
    'PettyCash': 'PcId',
    'CallReports': 'CallId',
    'ProjectReports': 'ProjId',
    'PainterQuotations': 'QuoteId',
    'PainterBillBalances': 'BillId',
    'PainterParticipants': 'ParticipantId',
    'Employees': 'EmpId',
    'CustomTabs': 'TabId',
    'CustomTabRows': 'RowId',
    'Transactions': 'TxId',
    'Attendance': 'AttId',
    'Leaves': 'LeaveId',
    'Tasks': 'TaskId',
    'SavedReports': 'ReportId'
}

for prop, tbl_name in table_mapping.items():
    gas_rows = gas_data.get(prop) or []
    if prop == 'settings' and isinstance(gas_rows, dict):
        gas_rows = [{'Key': k, 'Value': str(v)} for k, v in gas_rows.items()]

    sb_rows = sb_data.get(prop.lower()) or sb_data.get(tbl_name.lower()) or []
    if prop == 'settings' and isinstance(sb_rows, list):
        # Already list
        pass

    # Merge and dedupe by PK
    pk = pk_mapping.get(tbl_name)
    merged_map = {}
    
    # Add Supabase first
    for r in sb_rows:
        if isinstance(r, dict):
            k = str(r.get(pk) or '').strip()
            if k:
                merged_map[k] = r

    # Overlay GAS (most authoritative)
    for r in gas_rows:
        if isinstance(r, dict):
            k = str(r.get(pk) or '').strip()
            if k:
                merged_map[k] = r
            else:
                # If no pk, add
                merged_map[f'_row_{len(merged_map)}'] = r

    final_list = list(merged_map.values())
    unified[tbl_name] = final_list
    print(f'  Table "{tbl_name}": {len(final_list)} records')

# 4. Save to files in migration_data
print('\n[4/4] Writing files to /migration_data...')

# 4a. Master JSON
json_file = os.path.join(MIGRATION_DIR, 'live_office_system_export.json')
with open(json_file, 'w', encoding='utf-8') as f:
    json.dump(unified, f, indent=2, ensure_ascii=False)
print(f'  ✓ Saved Master JSON: {json_file} ({os.path.getsize(json_file)/1024:.1f} KB)')

# 4b. Multi-sheet Excel (.xlsx)
excel_file = os.path.join(MIGRATION_DIR, 'live_office_system_export.xlsx')
with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
    for tbl_name, rows in unified.items():
        if rows:
            # Flatten any nested dicts/lists to JSON string for Excel
            clean_rows = []
            for r in rows:
                c = {}
                for k, v in r.items():
                    if isinstance(v, (dict, list)):
                        c[k] = json.dumps(v, ensure_ascii=False)
                    else:
                        c[k] = v
                clean_rows.append(c)
            df = pd.DataFrame(clean_rows)
            sheet_name = tbl_name[:31]
            df.to_excel(writer, sheet_name=sheet_name, index=False)

print(f'  ✓ Saved Master Excel Workbook: {excel_file} ({os.path.getsize(excel_file)/1024:.1f} KB)')

# 4c. Individual CSV files for key operational tables
csv_tables = ['Customers', 'Inventory', 'Employees', 'Invoices', 'InvoiceItems', 'PettyCash', 'CallReports', 'ProjectReports', 'Tasks', 'Settings', 'Users', 'CompanyProfiles', 'Transactions']

for tbl_name in csv_tables:
    rows = unified.get(tbl_name) or []
    if rows:
        csv_file = os.path.join(MIGRATION_DIR, f'{tbl_name}.csv')
        clean_rows = []
        for r in rows:
            c = {}
            for k, v in r.items():
                if isinstance(v, (dict, list)):
                    c[k] = json.dumps(v, ensure_ascii=False)
                else:
                    c[k] = v
            clean_rows.append(c)
        df = pd.DataFrame(clean_rows)
        df.to_csv(csv_file, index=False, encoding='utf-8')
        print(f'  ✓ Saved CSV: {tbl_name}.csv ({len(rows)} rows)')

print('\nExport completed successfully into /migration_data!')
