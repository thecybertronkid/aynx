import { ipcMain, shell, app } from 'electron';
import { openGoogleAuthWindow, openRazorpayWindow, storeAuthData, getStoredAuth, clearAuth, verifyTokenOnline, refreshToken as refreshJWT } from './auth';
import * as os from 'os';
import { 
  getDownloads, deleteDownload, toggleFavorite, 
  getSettings, saveSetting, getAccounts, saveAccount, deleteAccount,
  clearDownloads, getStorageStats,
  addActivity, getActivities, getAchievements, unlockAchievement,
  getScheduledDownloads, saveScheduledDownload, deleteScheduledDownload
} from './database';
import { 
  analyzeUrl, queueDownload, pauseDownload, resumeDownload, cancelDownload, 
  getActiveDownloads, setProgressCallback 
} from './download-engine';
import { createBrowserWindow } from './browser';
import * as path from 'path';

export function setupIpcListeners(mainWindow: any) {
  // ─── Database handlers ──────────────────────────────────────────────────────
  ipcMain.handle('db:get-downloads', async () => {
    return await getDownloads();
  });

  ipcMain.handle('db:delete-download', async (_, id: string) => {
    await deleteDownload(id);
    return true;
  });

  ipcMain.handle('db:toggle-favorite', async (_, id: string) => {
    await toggleFavorite(id);
    return true;
  });

  ipcMain.handle('db:get-settings', async () => {
    return await getSettings();
  });

  ipcMain.handle('db:save-setting', async (_, key: string, value: string) => {
    await saveSetting(key, value);
    return true;
  });

  ipcMain.handle('db:get-accounts', async () => {
    return await getAccounts();
  });

  ipcMain.handle('db:save-account', async (_, acc: any) => {
    await saveAccount(acc);
    return true;
  });

  ipcMain.handle('db:delete-account', async (_, platform: string) => {
    await deleteAccount(platform);
    return true;
  });

  ipcMain.handle('db:clear-history', async () => {
    await clearDownloads();
    return true;
  });

  ipcMain.handle('db:export-history', async () => {
    const downloads = await getDownloads();
    return JSON.stringify(downloads, null, 2);
  });

  ipcMain.handle('db:get-storage-stats', async () => {
    return await getStorageStats();
  });

  // ─── Activity Log ───────────────────────────────────────────────────────────
  ipcMain.handle('db:add-activity', async (_, activity: any) => {
    await addActivity(activity);
    return true;
  });

  ipcMain.handle('db:get-activity', async () => {
    return await getActivities();
  });

  // ─── Achievements ───────────────────────────────────────────────────────────
  ipcMain.handle('db:get-achievements', async () => {
    return await getAchievements();
  });

  ipcMain.handle('db:unlock-achievement', async (_, id: string) => {
    await unlockAchievement(id);
    return true;
  });

  // ─── System Information ─────────────────────────────────────────────────────
  ipcMain.handle('sys:get-info', async () => {
    let ffmpegVersion = '—';
    let ytdlpVersion = '—';

    try {
      const { execSync } = await import('child_process');
      try {
        const out = execSync('ffmpeg -version', { encoding: 'utf8', timeout: 3000 });
        const m = out.match(/ffmpeg version\s+(\S+)/);
        if (m) ffmpegVersion = m[1];
      } catch {}
      try {
        const out = execSync('yt-dlp --version', { encoding: 'utf8', timeout: 3000 });
        ytdlpVersion = out.trim();
      } catch {}
    } catch {}

    return {
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron || '—',
      nodeVersion: process.versions.node || '—',
      platform: process.platform,
      windowsRelease: os.release(),
      installDir: path.dirname(app.getPath('exe')),
      userDataDir: app.getPath('userData'),
      ffmpegVersion,
      ytdlpVersion,
    };
  });

  // ─── Disk Information ───────────────────────────────────────────────────────
  ipcMain.handle('sys:get-disk-info', async (_, drivePath: string) => {
    try {
      const { execSync } = await import('child_process');
      if (process.platform === 'win32') {
        const drive = (drivePath || 'C:\\').slice(0, 2);
        const out = execSync(
          `wmic logicaldisk where "DeviceID='${drive}'" get Size,FreeSpace /format:csv`,
          { encoding: 'utf8', timeout: 3000 }
        );
        const lines = out.trim().split('\n').filter((l: string) => l.trim() && !l.startsWith('Node'));
        if (lines.length > 0) {
          const parts = lines[0].split(',');
          if (parts.length >= 3) {
            const freeBytes = parseInt(parts[1].trim()) || 0;
            const totalBytes = parseInt(parts[2].trim()) || 0;
            return { totalBytes, freeBytes, usedBytes: totalBytes - freeBytes };
          }
        }
      }
    } catch {}
    return { totalBytes: 0, freeBytes: 0, usedBytes: 0 };
  });

  // ─── Path opener ────────────────────────────────────────────────────────────
  ipcMain.handle('sys:open-path', async (_, folderPath: string) => {
    if (folderPath) {
      const err = await shell.openPath(folderPath);
      return !err;
    }
    return false;
  });

  // ─── Download Engine handlers ────────────────────────────────────────────────
  ipcMain.handle('engine:analyze-url', async (_, url: string) => {
    return await analyzeUrl(url);
  });

  ipcMain.handle('engine:queue-download', async (_, options: any) => {
    return await queueDownload(options);
  });

  ipcMain.handle('engine:pause-download', (_, id: string) => {
    pauseDownload(id);
    return true;
  });

  ipcMain.handle('engine:resume-download', (_, id: string) => {
    resumeDownload(id);
    return true;
  });

  ipcMain.handle('engine:cancel-download', (_, id: string) => {
    cancelDownload(id);
    return true;
  });

  ipcMain.handle('engine:get-active', () => {
    return getActiveDownloads();
  });

  // ─── System shell handlers ────────────────────────────────────────────────
  ipcMain.handle('shell:open-file', async (_, filePath: string) => {
    if (filePath) {
      const err = await shell.openPath(filePath);
      return !err;
    }
    return false;
  });

  ipcMain.handle('shell:open-folder', async (_, folderPath: string) => {
    if (folderPath) {
      const err = await shell.openPath(folderPath);
      return !err;
    }
    return false;
  });

  ipcMain.handle('shell:show-item-in-folder', (_, filePath: string) => {
    if (filePath) {
      shell.showItemInFolder(filePath);
      return true;
    }
    return false;
  });

  ipcMain.handle('shell:open-url', async (_, url: string) => {
    if (url) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });

  // ─── Browser Floating Window ───────────────────────────────────────────────
  ipcMain.handle('browser:open', () => {
    createBrowserWindow(mainWindow);
    return true;
  });

  // ─── Scheduler Operations ──────────────────────────────────────────────────
  ipcMain.handle('scheduler:get', async () => {
    return await getScheduledDownloads();
  });

  ipcMain.handle('scheduler:save', async (_, record: any) => {
    await saveScheduledDownload(record);
    return true;
  });

  ipcMain.handle('scheduler:delete', async (_, id: string) => {
    await deleteScheduledDownload(id);
    return true;
  });

  ipcMain.handle('app:install-update', async (event, downloadUrl: string) => {
    const fs = require('fs');
    const path = require('path');
    const { spawn } = require('child_process');

    const tempDir = app.getPath('temp');
    const tempPath = path.join(tempDir, 'aynx_setup_update.exe');

    console.log(`[AYNX AutoUpdater] Starting update download: ${downloadUrl}`);
    
    try {
      if (downloadUrl.startsWith('file:///')) {
        const sourcePath = decodeURIComponent(downloadUrl.replace('file:///', ''));
        event.sender.send('update-download-progress', { progress: 30 });
        fs.copyFileSync(sourcePath, tempPath);
        event.sender.send('update-download-progress', { progress: 100 });
      } else {
        const res = await fetch(downloadUrl);
        if (!res.ok) throw new Error(`Server returned status ${res.status}`);

        const fileStream = fs.createWriteStream(tempPath);
        const reader = res.body!.getReader();

        let totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
        let downloadedBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          fileStream.write(Buffer.from(value));
          downloadedBytes += value.length;

          const progress = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 50;
          event.sender.send('update-download-progress', { progress });
        }
        fileStream.end();
      }

      console.log(`[AYNX AutoUpdater] Launching silent setup: ${tempPath}`);

      // NSIS silent flag: /S
      const installer = spawn(tempPath, ['/S'], {
        detached: true,
        stdio: 'ignore'
      });
      installer.unref();
      
      // Delay exit slightly to let process detach
      setTimeout(() => {
        app.exit(0);
      }, 1000);

      return { success: true };
    } catch (err: any) {
      console.error(`[AYNX AutoUpdater] Installation failed:`, err);
      return { success: false, error: err.message };
    }
  });

  // Set callback to push progress updates to the renderer
  setProgressCallback((id, data) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress', { id, ...data });
    }
  });

  // ─── Auth IPC Handlers ───────────────────────────────────────────────────────
  ipcMain.handle('auth:login-google', async () => {
    try {
      const authData = await openGoogleAuthWindow(mainWindow);
      if (authData.error) return { success: false, error: authData.error };
      await storeAuthData(authData);
      // Also update settings store with user data
      const { saveSetting } = await import('./database');
      if (authData.user) {
        if (authData.user.name) await saveSetting('displayName', authData.user.name);
        if (authData.user.email) await saveSetting('email', authData.user.email);
        if (authData.user.avatar) await saveSetting('avatarImage', authData.user.avatar);
        if (authData.user.plan) await saveSetting('plan', authData.user.plan);
        if (authData.token) await saveSetting('authToken', authData.token);
        if (authData.user.trialExpiry) await saveSetting('expiresAt', authData.user.trialExpiry);
      }
      mainWindow.webContents.send('auth:state-changed', { loggedIn: true, user: authData.user });
      return { success: true, ...authData };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('auth:get-stored', async () => {
    return await getStoredAuth();
  });

  ipcMain.handle('auth:logout', async () => {
    await clearAuth();
    const { saveSetting } = await import('./database');
    await saveSetting('authToken', '');
    await saveSetting('plan', 'Free');
    mainWindow.webContents.send('auth:state-changed', { loggedIn: false, user: null });
    return { success: true };
  });

  ipcMain.handle('auth:verify-token', async (_, token: string) => {
    return await verifyTokenOnline(token);
  });

  ipcMain.handle('auth:refresh-token', async (_, token: string) => {
    const newToken = await refreshJWT(token);
    if (newToken) {
      const { saveSetting } = await import('./database');
      await saveSetting('authToken', newToken);
    }
    return newToken;
  });

  // ─── Payment IPC Handlers ─────────────────────────────────────────────────────
  ipcMain.handle('payment:create-order', async (_, data: any) => {
    try {
      const { saveSetting } = await import('./database');
      const settings = await import('./database').then(m => m.getSettings());
      const token = settings.authToken;
      const apiBase = process.env.API_BASE_URL || 'http://localhost:5000';

      const res = await fetch(`${apiBase}/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ planId: data.planId })
      });
      if (!res.ok) {
        const err = await res.json();
        return { success: false, error: err.error };
      }
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('payment:open-checkout', async (_, orderData: any) => {
    try {
      const result = await openRazorpayWindow(mainWindow, orderData);
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('payment:verify', async (_, data: any) => {
    try {
      const settings = await import('./database').then(m => m.getSettings());
      const token = settings.authToken;
      const apiBase = process.env.API_BASE_URL || 'http://localhost:5000';

      const res = await fetch(`${apiBase}/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        return { success: false, error: err.error };
      }
      const result = await res.json();
      if (result.plan) {
        const { saveSetting } = await import('./database');
        await saveSetting('plan', result.plan);
        if (result.expiresAt) await saveSetting('expiresAt', result.expiresAt);
        if (result.token) await saveSetting('authToken', result.token);
        mainWindow.webContents.send('settings-updated');
      }
      return { success: true, ...result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
