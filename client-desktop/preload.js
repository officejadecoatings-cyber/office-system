const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  printNative: (options) => ipcRenderer.invoke('print-native', options),
  printToPDF: (options) => ipcRenderer.invoke('print-to-pdf', options),
  onOpenServerSettings: (callback) => ipcRenderer.on('open-server-settings', () => callback())
});
