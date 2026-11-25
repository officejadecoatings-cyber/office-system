import sqlite3
import csv
import re

db_path = 'server/data/office_system.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

# 1. Read canonical customers from migration_data/Customers.csv
with open('migration_data/Customers.csv', 'r', encoding='utf-8') as f:
    csv_rows = list(csv.DictReader(f))

seen_names = set()
ordered_unique = []

for r in csv_rows:
    name = r['Name'].strip()
    if name.startswith('263\t'):
        name = 'Siyara Soliwood'
    norm = re.sub(r'\s+', ' ', name.lower())
    if norm in seen_names:
        continue
    seen_names.add(norm)
    r['Name'] = name
    ordered_unique.append(r)

print('Canonical unique customers count:', len(ordered_unique))

# 2. Clear Customers table and re-insert 193 unique customers
c.execute('DELETE FROM Customers')
for idx, r in enumerate(ordered_unique, 1):
    new_id = f'CUS-{idx:04d}'
    c.execute('''
        INSERT INTO Customers (
            CustomerId, CustomerCode, Name, BusinessIdentifier, BillingAddress,
            DeliveryAddress, Email, Phone, CreditLimit, SalesOfficerId,
            SalesOfficerName, Notes, CreatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        new_id, new_id, r['Name'], r.get('BusinessIdentifier', '').strip(),
        r.get('BillingAddress', '').strip(), r.get('DeliveryAddress', '').strip(),
        r.get('Email', '').strip(), r.get('Phone', '').strip(),
        float(r.get('CreditLimit') or 0), r.get('SalesOfficerId', '').strip(),
        r.get('SalesOfficerName', '').strip(), r.get('Notes', '').strip(),
        r.get('CreatedAt') or '2026-11-25'
    ))

c.execute("INSERT OR REPLACE INTO Settings (Key, Value) VALUES ('NextCustomerSeq', '194')")
conn.commit()

count = c.execute('SELECT COUNT(*) FROM Customers').fetchone()[0]
print('New total in Customers table:', count)
sample = c.execute('SELECT CustomerId, CustomerCode, Name FROM Customers LIMIT 5').fetchall()
print('First 5 customers in DB:', sample)
sample_last = c.execute('SELECT CustomerId, CustomerCode, Name FROM Customers ORDER BY CustomerId DESC LIMIT 5').fetchall()
print('Last 5 customers in DB:', sample_last)
conn.close()
