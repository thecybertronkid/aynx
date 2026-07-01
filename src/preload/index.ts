import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // ─── Database handlers ──────────────────────────────────────────────────────
  getDownloads: () => ipcRenderer.invoke('db:get-downloads'),
  deleteDownload: (id: string) => ipcRenderer.invoke('db:delete-download', id),
  toggleFavorite: (id: string) => ipcRenderer.invoke('db:toggle-favorite', id),

  getSettings: () => ipcRenderer.invoke('db:get-settings'),
  getFeatureFlags: () => ipcRenderer.invoke('db:get-feature-flags'),
  getAnnouncements: () => ipcRenderer.invoke('db:get-announcements'),
  saveSetting: (key: string, value: string) => ipcRenderer.invoke('db:save-setting', key, value),

  onFeatureFlagsUpdated: (callback: (event: any, flags: any) => void) => {
    ipcRenderer.on('feature-flags-updated', callback);
    return () => {
      ipcRenderer.removeListener('feature-flags-updated', callback);
    };
  },

  onAnnouncementsUpdated: (callback: (event: any, list: any) => void) => {
    ipcRenderer.on('announcements-updated', callback);
    return () => {
      ipcRenderer.removeListener('announcements-updated', callback);
    };
  },

  onRemoteNotification: (callback: (event: any, notification: any) => void) => {
    ipcRenderer.on('remote-notification', callback);
    return () => {
      ipcRenderer.removeListener('remote-notification', callback);
    };
  },

  onAuthLogout: (callback: () => void) => {
    ipcRenderer.on('auth-logout', callback);
    return () => {
      ipcRenderer.removeListener('auth-logout', callback);
    };
  },

  onAuthRefresh: (callback: () => void) => {
    ipcRenderer.on('auth-refresh', callback);
    return () => {
      ipcRenderer.removeListener('auth-refresh', callback);
    };
  },

  onUploadLogsRequest: (callback: (event: any, machineId: string) => void) => {
    ipcRenderer.on('upload-logs-request', callback);
    return () => {
      ipcRenderer.removeListener('upload-logs-request', callback);
    };
  },

  getAccounts: () => ipcRenderer.invoke('db:get-accounts'),
  saveAccount: (acc: any) => ipcRenderer.invoke('db:save-account', acc),
  deleteAccount: (platform: string) => ipcRenderer.invoke('db:delete-account', platform),

  clearHistory: () => ipcRenderer.invoke('db:clear-history'),
  exportHistory: () => ipcRenderer.invoke('db:export-history'),
  getStorageStats: () => ipcRenderer.invoke('db:get-storage-stats'),

  // ─── Activity Log ───────────────────────────────────────────────────────────
  addActivity: (activity: any) => ipcRenderer.invoke('db:add-activity', activity),
  getActivity: () => ipcRenderer.invoke('db:get-activity'),

  // ─── Achievements ───────────────────────────────────────────────────────────
  getAchievements: () => ipcRenderer.invoke('db:get-achievements'),
  unlockAchievement: (id: string) => ipcRenderer.invoke('db:unlock-achievement', id),

  // ─── System Information ─────────────────────────────────────────────────────
  getSystemInfo: () => ipcRenderer.invoke('sys:get-info'),
  getDiskInfo: (drivePath: string) => ipcRenderer.invoke('sys:get-disk-info', drivePath),
  openSystemPath: (folderPath: string) => ipcRenderer.invoke('sys:open-path', folderPath),

  // ─── Download Engine handlers ─────────────────────────────────────────────
  analyzeUrl: (url: string) => ipcRenderer.invoke('engine:analyze-url', url),
  queueDownload: (options: any) => ipcRenderer.invoke('engine:queue-download', options),
  pauseDownload: (id: string) => ipcRenderer.invoke('engine:pause-download', id),
  resumeDownload: (id: string) => ipcRenderer.invoke('engine:resume-download', id),
  cancelDownload: (id: string) => ipcRenderer.invoke('engine:cancel-download', id),
  getActiveDownloads: () => ipcRenderer.invoke('engine:get-active'),

  // ─── Browser floating window ──────────────────────────────────────────────
  openBrowser: () => ipcRenderer.invoke('browser:open'),
  onBrowserDownload: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('browser:download-intercepted', callback);
    return () => {
      ipcRenderer.removeListener('browser:download-intercepted', callback);
    };
  },

  // ─── Scheduler ────────────────────────────────────────────────────────────
  getScheduledDownloads: () => ipcRenderer.invoke('scheduler:get'),
  saveScheduledDownload: (record: any) => ipcRenderer.invoke('scheduler:save', record),
  deleteScheduledDownload: (id: string) => ipcRenderer.invoke('scheduler:delete', id),

  // ─── Shell integration ────────────────────────────────────────────────────
  openFile: (filePath: string) => ipcRenderer.invoke('shell:open-file', filePath),
  openFolder: (folderPath: string) => ipcRenderer.invoke('shell:open-folder', folderPath),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:show-item-in-folder', filePath),
  openSystemUrl: (url: string) => ipcRenderer.invoke('shell:open-url', url),

  // ─── Progress updates ─────────────────────────────────────────────────────
  onProgress: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('download-progress', callback);
    return () => {
      ipcRenderer.removeListener('download-progress', callback);
    };
  },

  onSettingsUpdated: (callback: () => void) => {
    ipcRenderer.on('settings-updated', callback);
    return () => {
      ipcRenderer.removeListener('settings-updated', callback);
    };
  },

  installUpdate: (downloadUrl: string) => ipcRenderer.invoke('app:install-update', downloadUrl),
  onUpdateProgress: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('update-download-progress', callback);
    return () => {
      ipcRenderer.removeListener('update-download-progress', callback);
    };
  },

  // ─── Google Auth ─────────────────────────────────────────────────────────────
  loginWithGoogle: () => ipcRenderer.invoke('auth:login-google'),
  getStoredAuth: () => ipcRenderer.invoke('auth:get-stored'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  verifyToken: (token: string) => ipcRenderer.invoke('auth:verify-token', token),
  refreshToken: (token: string) => ipcRenderer.invoke('auth:refresh-token', token),

  onAuthStateChanged: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('auth:state-changed', callback);
    return () => {
      ipcRenderer.removeListener('auth:state-changed', callback);
    };
  },

  // ─── Razorpay Payments ────────────────────────────────────────────────────────
  createPaymentOrder: (data: { planId: string }) => ipcRenderer.invoke('payment:create-order', data),
  openPaymentCheckout: (orderData: any) => ipcRenderer.invoke('payment:open-checkout', orderData),
  verifyPayment: (data: any) => ipcRenderer.invoke('payment:verify', data),

  // ─── Deep Link ────────────────────────────────────────────────────────────────
  onDeepLink: (callback: (event: any, url: string) => void) => {
    ipcRenderer.on('deep-link', callback);
    return () => {
      ipcRenderer.removeListener('deep-link', callback);
    };
  },

  // ─── Jump List / Tray Actions ─────────────────────────────────────────────────
  onJumpListAction: (callback: (event: any, action: string) => void) => {
    ipcRenderer.on('jump-list-action', callback);
    return () => {
      ipcRenderer.removeListener('jump-list-action', callback);
    };
  },

  // ─── Native Dialog ───────────────────────────────────────────────────────────
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),

  // ─── Support Tickets ──────────────────────────────────────────────────────────
  submitSupportTicket: (data: any) => ipcRenderer.invoke('ticket:create', data),
  getUserTickets: (email: string) => ipcRenderer.invoke('ticket:get-list', email)
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;

