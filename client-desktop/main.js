const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 650,
    title: 'Office System - Jade Coatings',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false,
    backgroundColor: '#f8fafc'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  createAppMenu();
}

function createAppMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: '🔌 Connect to Server (Change IP)...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('open-server-settings');
          }
        },
        { type: 'separator' },
        {
          label: '🖨️ Print Document...',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) mainWindow.webContents.print({ silent: false, printBackground: true });
          }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Exit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'forceReload', label: 'Force Reload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Full Screen' },
        {
          label: 'Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Office System',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Office System',
              message: 'Office System Desktop Client',
              detail: 'Version 1.0.0 (Local Network Edition)\nBuilt for Jade Coatings\nConnected to Dedicated Local SQLite Server.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ---------------------------------------------------------------------------
// Native A4 Printing IPC Handlers (Clean A4 print without browser dialog popups)
// ---------------------------------------------------------------------------

ipcMain.handle('print-native', async (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return new Promise((resolve) => {
    const printOptions = {
      silent: options.silent || false,
      printBackground: true,
      color: true,
      margins: { marginType: 'none' },
      landscape: options.landscape || false,
      pageSize: 'A4',
      ...options
    };

    win.webContents.print(printOptions, (success, failureReason) => {
      resolve({ success, failureReason });
    });
  });
});

ipcMain.handle('print-to-pdf', async (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const pdfOptions = {
    marginsType: 0,
    printBackground: true,
    printSelectionOnly: false,
    landscape: options.landscape || false,
    pageSize: 'A4',
    ...options
  };

  try {
    const data = await win.webContents.printToPDF(pdfOptions);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
