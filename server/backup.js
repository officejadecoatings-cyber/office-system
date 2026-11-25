const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const XLSX = require('xlsx');
const { db, backupDatabase, fetchAllAppData } = require('./db');

// Backup directory: C:\OfficeSystem_Backups (or fallback to local ./backups if permission denied)
let backupDir = 'C:\\OfficeSystem_Backups';
try {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
} catch (err) {
  console.warn(`[BACKUP] Cannot create ${backupDir}, falling back to ./backups:`, err.message);
  backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
}

let lastBackupTime = null;
let lastBackupFiles = [];

function getTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function runBackupNow() {
  const ts = getTimestamp();
  const sqliteFile = path.join(backupDir, `office_system_${ts}.db`);
  const excelFile = path.join(backupDir, `office_system_${ts}.xlsx`);

  console.log(`[BACKUP] Starting automated backup at ${new Date().toISOString()}...`);

  // 1. Safe SQLite snapshot
  await backupDatabase(sqliteFile);
  const sqliteStat = fs.statSync(sqliteFile);
  console.log(`[BACKUP] SQLite snapshot created: ${sqliteFile} (${(sqliteStat.size / 1024).toFixed(1)} KB)`);

  // 2. Full Multi-Sheet Excel Workbook
  const allData = fetchAllAppData();
  const wb = XLSX.utils.book_new();

  for (const [key, rows] of Object.entries(allData)) {
    if (key === 'today') continue;
    let sheetData = [];
    if (key === 'settings') {
      sheetData = Object.entries(rows).map(([k, v]) => ({ Key: k, Value: v }));
    } else if (Array.isArray(rows)) {
      sheetData = rows;
    }

    if (sheetData.length > 0) {
      const ws = XLSX.utils.json_to_sheet(sheetData);
      // Sheet names in Excel cannot exceed 31 chars
      const sheetName = key.slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  }

  XLSX.writeFile(wb, excelFile);
  const excelStat = fs.statSync(excelFile);
  console.log(`[BACKUP] Excel workbook created: ${excelFile} (${(excelStat.size / 1024).toFixed(1)} KB)`);

  // 3. Prune backups older than 30 days
  pruneOldBackups(30);

  lastBackupTime = new Date().toISOString();
  lastBackupFiles = [
    { file: sqliteFile, size: sqliteStat.size },
    { file: excelFile, size: excelStat.size }
  ];

  return {
    success: true,
    timestamp: lastBackupTime,
    files: lastBackupFiles,
    backupDir
  };
}

function pruneOldBackups(retentionDays = 30) {
  try {
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    for (const f of files) {
      if (!f.startsWith('office_system_')) continue;
      const fullPath = path.join(backupDir, f);
      const stat = fs.statSync(fullPath);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(fullPath);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      console.log(`[BACKUP] Pruned ${deletedCount} backup files older than ${retentionDays} days.`);
    }
  } catch (err) {
    console.warn('[BACKUP] Error pruning old backups:', err.message);
  }
}

// Schedule automatic backups twice daily: 12:30 PM & 4:45 PM
function scheduleBackups() {
  // 12:30 PM
  cron.schedule('30 12 * * *', async () => {
    console.log('[BACKUP] Running scheduled Mid-Day Backup (12:30 PM)...');
    try {
      await runBackupNow();
    } catch (e) {
      console.error('[BACKUP] Mid-Day backup failed:', e);
    }
  });

  // 4:45 PM (End of day)
  cron.schedule('45 16 * * *', async () => {
    console.log('[BACKUP] Running scheduled End-of-Day Backup (4:45 PM)...');
    try {
      await runBackupNow();
    } catch (e) {
      console.error('[BACKUP] End-of-Day backup failed:', e);
    }
  });

  console.log('[BACKUP] Automated Backup Scheduler registered for 12:30 PM and 4:45 PM daily.');
}

module.exports = {
  backupDir,
  runBackupNow,
  scheduleBackups,
  getLastBackupInfo: () => ({
    lastBackupTime,
    lastBackupFiles,
    backupDir
  })
};
