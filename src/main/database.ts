// Using electron-store for persistent storage.
// This replaces better-sqlite3 / node:sqlite to avoid native module issues.
// electron-store is pure JavaScript — no native compilation required.

import * as path from 'path';

// electron-store is an ESM-only package from v8+. We use dynamic import.
let _store: any = null;

async function getStore() {
  if (_store) return _store;
  const { default: Store } = await import('electron-store');
  _store = new Store({
    name: 'universal_downloader',
    defaults: {
      settings: {
        theme: 'dark',
        displayName: 'Local Service',
        username: 'local_user',
        plan: 'Free',
        licenseKey: 'AYNX-FREE-PLAN-2026',
        accentColor: '#5865f2',
        avatarColor: '#5865f2',
        downloadFolder: path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads'),
        defaultQuality: 'Best Available',
        defaultFormat: 'MP4',
        parallelLimit: '3',
        maxBandwidth: '0',
        proxy: '',
        language: 'en',
        notifications: 'true',
        autoStart: 'false',
        autoUpdates: 'true',
        ffmpegPath: '',
        hwAcceleration: 'false',
        bgProcessing: 'true',
        autoResume: 'true',
        onboardingCompleted: 'false',
        closeToTray: 'true'
      },
      downloads: [] as DownloadRecord[],
      accounts: [] as AccountRecord[],
      activities: [] as ActivityRecord[],
      achievements: {
        firstDownload: false,
        downloads10: false,
        downloads50: false,
        downloads100: false,
        downloads500: false,
        profileComplete: false,
        platforms3: false,
        storage1gb: false,
        storage10gb: false,
        batchDownload: false,
        proUpgrade: false,
        nightOwl: false,
        aestheticStylist: false
      } as Record<string, boolean>,
      scheduledDownloads: [] as ScheduledDownloadRecord[]
    }
  });
  return _store;
}

export async function verifyLicenseOnline(key: string, machineId: string, email?: string): Promise<any> {
  const store = await getStore();
  const settings = store.get('settings') as Record<string, string>;
  const token = settings.authToken;
  const apiBase = process.env.API_BASE_URL || 'https://aynx-api.onrender.com';

  try {
    const res = await fetch(`${apiBase}/license/verify`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ key, machineId, email })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[License Online] Verification server offline, using local cache.');
  }
  return null;
}

export async function initDatabase(_userDataPath: string) {
  const store = await getStore();
  const settings = store.get('settings') as Record<string, string>;
  const apiBase = process.env.API_BASE_URL || 'https://aynx-api.onrender.com';
  
  // Ensure unique machine ID
  if (!settings.machineId) {
    settings.machineId = 'AYNX-ID-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    store.set('settings', settings);
  }

  console.log('Database (electron-store) initialized successfully.');

  // Verify/Activate license online on startup
  if (settings.email) {
    const token = settings.authToken;
    if (!settings.activatedOnline || settings.activatedOnline === 'false') {
      try {
        console.log(`[AYNX First Launch] Activating license key '${settings.licenseKey}' online for ${settings.email}...`);
        const res = await fetch(`${apiBase}/license/activate`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            key: settings.licenseKey || 'TRIAL',
            machineId: settings.machineId,
            email: settings.email,
            displayName: settings.displayName || 'Anonymous User'
          })
        });

        if (res.ok) {
          const actData = await res.json();
          settings.licenseKey = actData.key;
          settings.plan = actData.plan;
          settings.expiresAt = actData.expiresAt;
          settings.activatedOnline = 'true';
          if (actData.token) settings.authToken = actData.token;
          store.set('settings', settings);
          console.log(`[AYNX Online Activation] Success! Active Plan: ${actData.plan}. Key: ${actData.key}. Expires: ${actData.expiresAt}`);
        } else {
          const errData = await res.json();
          console.error(`[AYNX Online Activation] Failed: ${errData.error}`);
        }
      } catch (e) {
        console.error('[AYNX Online Activation] Server unreachable:', e);
      }
    } else {
      // Already activated once, let's verify if the key is still active/valid (checks expiration)
      try {
        const verifyData = await verifyLicenseOnline(settings.licenseKey || 'TRIAL', settings.machineId, settings.email);
        if (verifyData) {
          if (verifyData.expired) {
            settings.plan = 'Free';
            console.log('[AYNX License] Current license has expired! Reverted to Free plan.');
          } else {
            settings.plan = verifyData.plan;
            if (verifyData.key) settings.licenseKey = verifyData.key;
          }
          store.set('settings', settings);
        }
      } catch (e) {
        console.warn('[AYNX License] Verify check server unreachable, trusting cached plan.');
        
        // Offline grace period check (72 hours grace)
        if (settings.expiresAt) {
          const now = Date.now();
          const expTime = new Date(settings.expiresAt).getTime();
          const graceLimit = expTime + 72 * 60 * 60 * 1000; // +72h grace
          if (now > graceLimit) {
            settings.plan = 'Free';
            store.set('settings', settings);
            console.warn('[AYNX Offline Grace] Grace period ended. Downgraded to Free plan.');
          } else if (now > expTime) {
            console.log('[AYNX Offline Grace] Plan expired but within 72h grace period.');
          }
        }
      }
    }
  }

  // Start telemetry heartbeat reporting
  startTelemetryHeartbeat();
}

function startTelemetryHeartbeat() {
  setInterval(async () => {
    try {
      const store = await getStore();
      const settings = store.get('settings') as Record<string, string>;
      const machineId = settings.machineId || '';
      const displayName = settings.displayName || 'Anonymous User';
      const plan = settings.plan || 'Free';
      const token = settings.authToken;
      const apiBase = process.env.API_BASE_URL || 'https://aynx-api.onrender.com';
      
      let activeCount = 0;
      try {
        const { getActiveDownloads } = require('./download-engine');
        activeCount = getActiveDownloads().length;
      } catch (deErr) {}

      const res = await fetch(`${apiBase}/telemetry/heartbeat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          machineId,
          displayName,
          plan,
          activeDownloads: activeCount,
          statusText: activeCount > 0 ? 'Downloading' : 'Idle'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.plan && data.plan !== settings.plan) {
          settings.plan = data.plan;
          if (data.expiresAt) settings.expiresAt = data.expiresAt;
          store.set('settings', settings);
          // Notify renderer about settings update
          const { BrowserWindow } = require('electron');
          BrowserWindow.getAllWindows().forEach((win: any) => {
            win.webContents.send('settings-updated');
          });
        }
      }
    } catch (e) {
      // Ignore heartbeat transmission failures when server is offline
    }
  }, 5000); // 5 seconds interval for snappy live admin tracking
}

// Settings methods
export async function getSettings(): Promise<Record<string, string>> {
  const store = await getStore();
  return store.get('settings') as Record<string, string>;
}

export async function saveSetting(key: string, value: string) {
  const store = await getStore();
  const settings = store.get('settings') as Record<string, string>;
  settings[key] = value;
  store.set('settings', settings);
}

// Downloads
export interface DownloadRecord {
  id: string;
  title: string;
  channel?: string;
  platform: string;
  contentType: string;
  filePath?: string;
  fileSize?: number;
  duration?: number;
  thumbnailUrl?: string;
  status: string;
  downloadedAt: string;
  favorite?: number;
}

export async function addOrUpdateDownload(record: DownloadRecord) {
  const store = await getStore();
  const downloads = store.get('downloads') as DownloadRecord[];
  const idx = downloads.findIndex((d: DownloadRecord) => d.id === record.id);
  if (idx >= 0) {
    record.favorite = record.favorite ?? downloads[idx].favorite ?? 0;
    downloads[idx] = record;
  } else {
    record.favorite = record.favorite ?? 0;
    downloads.push(record);
  }
  downloads.sort((a: DownloadRecord, b: DownloadRecord) =>
    new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
  );
  store.set('downloads', downloads);
}

export async function getDownloads(): Promise<DownloadRecord[]> {
  const store = await getStore();
  return store.get('downloads') as DownloadRecord[];
}

export async function deleteDownload(id: string) {
  const store = await getStore();
  const downloads = (store.get('downloads') as DownloadRecord[]).filter(
    (d: DownloadRecord) => d.id !== id
  );
  store.set('downloads', downloads);
}

export async function clearDownloads() {
  const store = await getStore();
  store.set('downloads', []);
}

export async function toggleFavorite(id: string) {
  const store = await getStore();
  const downloads = store.get('downloads') as DownloadRecord[];
  const idx = downloads.findIndex((d: DownloadRecord) => d.id === id);
  if (idx >= 0) {
    downloads[idx].favorite = downloads[idx].favorite === 1 ? 0 : 1;
    store.set('downloads', downloads);
  }
}

export async function getStorageStats() {
  const downloads = await getDownloads();
  const completed = downloads.filter(d => d.status === 'completed');
  let videos = 0, audio = 0, images = 0, other = 0, totalBytes = 0;
  const platformCounts: Record<string, number> = {};

  for (const d of completed) {
    const size = d.fileSize || 0;
    totalBytes += size;
    if (d.contentType === 'video') videos++;
    else if (d.contentType === 'audio') audio++;
    else if (d.contentType === 'image') images++;
    else other++;
    platformCounts[d.platform] = (platformCounts[d.platform] || 0) + 1;
  }

  const today = new Date().toDateString();
  const todayCount = completed.filter(d =>
    new Date(d.downloadedAt).toDateString() === today
  ).length;

  const favPlatform = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  const largest = completed.reduce(
    (max: DownloadRecord | undefined, d: DownloadRecord) =>
      ((d.fileSize || 0) > ((max?.fileSize) || 0) ? d : max),
    undefined as DownloadRecord | undefined
  );

  return {
    total: completed.length,
    videos, audio, images, other,
    totalBytes,
    todayCount,
    favPlatform,
    largestTitle: largest?.title || '—',
    largestSize: largest?.fileSize || 0,
    platformCounts
  };
}

// Account authentication methods
export interface AccountRecord {
  platform: string;
  username?: string;
  cookies?: string;
  status?: string;
  updatedAt?: string;
}

export async function saveAccount(acc: AccountRecord) {
  const store = await getStore();
  const accounts = store.get('accounts') as AccountRecord[];
  const idx = accounts.findIndex((a: AccountRecord) => a.platform === acc.platform);
  const record: AccountRecord = {
    ...acc,
    status: acc.status || 'authenticated',
    updatedAt: new Date().toISOString()
  };
  if (idx >= 0) {
    accounts[idx] = record;
  } else {
    accounts.push(record);
  }
  store.set('accounts', accounts);
}

export async function getAccounts(): Promise<AccountRecord[]> {
  const store = await getStore();
  return store.get('accounts') as AccountRecord[];
}

export async function deleteAccount(platform: string) {
  const store = await getStore();
  const accounts = (store.get('accounts') as AccountRecord[]).filter(
    (a: AccountRecord) => a.platform !== platform
  );
  store.set('accounts', accounts);
}

// Activity Log
export interface ActivityRecord {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  icon?: string;
}

export async function addActivity(activity: ActivityRecord) {
  const store = await getStore();
  const activities = (store.get('activities') as ActivityRecord[]) || [];
  activities.unshift(activity);
  if (activities.length > 50) activities.splice(50);
  store.set('activities', activities);
}

export async function getActivities(): Promise<ActivityRecord[]> {
  const store = await getStore();
  return (store.get('activities') as ActivityRecord[]) || [];
}

// Achievements
export async function getAchievements(): Promise<Record<string, boolean>> {
  const store = await getStore();
  return (store.get('achievements') as Record<string, boolean>) || {};
}

export async function unlockAchievement(id: string) {
  const store = await getStore();
  const achievements = (store.get('achievements') as Record<string, boolean>) || {};
  achievements[id] = true;
  store.set('achievements', achievements);
}

// ─── Scheduled Downloads ───────────────────────────────────────────────────
export interface ScheduledDownloadRecord {
  id: string;
  url: string;
  title: string;
  platform: string;
  contentType: string;
  quality: string;
  format: string;
  scheduledTime: string; // ISO String or time string
  repeatMode: 'once' | 'daily' | 'weekly' | 'monthly' | 'idle' | 'ac' | 'wifi';
  status: 'active' | 'paused' | 'completed' | 'failed';
  postAction?: 'none' | 'shutdown' | 'sleep' | 'hibernate' | 'lock' | 'close' | 'sound' | 'folder' | 'player';
  createdAt: string;
}

export async function getScheduledDownloads(): Promise<ScheduledDownloadRecord[]> {
  const store = await getStore();
  return (store.get('scheduledDownloads') as ScheduledDownloadRecord[]) || [];
}

export async function saveScheduledDownload(record: ScheduledDownloadRecord) {
  const store = await getStore();
  const scheduled = (store.get('scheduledDownloads') as ScheduledDownloadRecord[]) || [];
  const idx = scheduled.findIndex((s: ScheduledDownloadRecord) => s.id === record.id);
  if (idx >= 0) {
    scheduled[idx] = record;
  } else {
    scheduled.push(record);
  }
  store.set('scheduledDownloads', scheduled);
}

export async function deleteScheduledDownload(id: string) {
  const store = await getStore();
  const scheduled = (store.get('scheduledDownloads') as ScheduledDownloadRecord[]) || [];
  const filtered = scheduled.filter((s: ScheduledDownloadRecord) => s.id !== id);
  store.set('scheduledDownloads', filtered);
}

