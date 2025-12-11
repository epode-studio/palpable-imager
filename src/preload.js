const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('palpable', {
  // Authentication (Browser OAuth)
  getAuthState: () => ipcRenderer.invoke('get-auth-state'),
  startAuth: () => ipcRenderer.invoke('start-auth'),
  logout: () => ipcRenderer.invoke('logout'),
  onAuthSuccess: (callback) => {
    ipcRenderer.on('auth-success', (event, data) => callback(data))
  },
  onAuthLogout: (callback) => {
    ipcRenderer.on('auth-logout', () => callback())
  },
  onReauthRequired: (callback) => {
    ipcRenderer.on('reauth-required', (event, data) => callback(data))
  },
  
  // Pairing Code Auth (Alternative to Browser OAuth)
  validatePairingCode: (pairingCode) => ipcRenderer.invoke('validate-pairing-code', { pairingCode }),
  authWithPairingCode: (pairingCode) => ipcRenderer.invoke('auth-with-pairing-code', { pairingCode }),
  getPairingState: () => ipcRenderer.invoke('get-pairing-state'),
  clearPairing: () => ipcRenderer.invoke('clear-pairing'),
  onPairingSuccess: (callback) => {
    ipcRenderer.on('pairing-success', (event, data) => callback(data))
  },
  
  // Drive management
  listDrives: () => ipcRenderer.invoke('list-drives'),
  
  // Download
  downloadImage: () => ipcRenderer.invoke('download-image'),
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, data) => callback(data))
  },
  
  // Flashing
  flashImage: (options) => ipcRenderer.invoke('flash-image', options),
  onFlashProgress: (callback) => {
    ipcRenderer.on('flash-progress', (event, data) => callback(data))
  },
  
  // Device registration
  getDevices: () => ipcRenderer.invoke('get-devices'),
  registerDevice: (options) => ipcRenderer.invoke('register-device', options),
  updateDevice: (options) => ipcRenderer.invoke('update-device', options),
  deleteDevice: (options) => ipcRenderer.invoke('delete-device', options),
  
  // WiFi networks
  getWifiNetworks: () => ipcRenderer.invoke('get-wifi-networks'),

  // Auto-update
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, data) => callback(data))
  },
  onUpdateDownloading: (callback) => {
    ipcRenderer.on('update-downloading', () => callback())
  },
  onUpdateDownloadProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (event, data) => callback(data))
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, data) => callback(data))
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, data) => callback(data))
  },
  onUpdateNotAvailable: (callback) => {
    ipcRenderer.on('update-not-available', (event, data) => callback(data))
  },
  restartAndInstall: () => ipcRenderer.invoke('restart-and-install'),

  // Platform info
  platform: process.platform,
  getPlatform: () => Promise.resolve(process.platform)
})

