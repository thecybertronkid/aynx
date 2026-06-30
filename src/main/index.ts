import { app, BrowserWindow, protocol, net } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load root .env variables in development mode
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { initDatabase } from './database';
import { setupIpcListeners } from './ipc';
import { startScheduler } from './scheduler-runner';

// Register custom protocols before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { bypassCSP: true, secure: true, stream: true, supportFetchAPI: true } },
  { scheme: 'aynx',  privileges: { bypassCSP: true, secure: true, standard: true } }
]);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'AYNX',
    icon: path.join(__dirname, '../../resources/icon.png'),
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    titleBarStyle: 'default',
    backgroundColor: '#1e1f22',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.setMenu(null);
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER CONSOLE] (${level}) ${message} [${sourceId}:${line}]`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Register as default handler for aynx:// protocol (OAuth deep link)
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('aynx', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('aynx');
  }

  // Handle custom media protocol
  protocol.handle('media', (request) => {
    let filePart = request.url.slice('media://'.length);
    const decodedPath = decodeURIComponent(filePart);
    return net.fetch(`file://${decodedPath}`);
  });

  // Read installer registry values (legacy support)
  if (process.platform === 'win32') {
    try {
      const { execSync } = await import('child_process');
      const { saveSetting, getSettings } = await import('./database');
      const currentSettings = await getSettings();

      try {
        const regName = execSync('reg query "HKCU\\Software\\AYNX" /v DisplayName', { encoding: 'utf8', timeout: 2000 });
        const matchName = regName.match(/DisplayName\s+REG_SZ\s+(.+)/);
        if (matchName?.[1]) {
          const installerName = matchName[1].trim();
          if (installerName && installerName !== 'Local Service') {
            if (!currentSettings.displayName || currentSettings.displayName === 'Local Service') {
              await saveSetting('displayName', installerName);
            }
          }
        }
      } catch (_) {}

      try {
        const regEmail = execSync('reg query "HKCU\\Software\\AYNX" /v Email', { encoding: 'utf8', timeout: 2000 });
        const matchEmail = regEmail.match(/Email\s+REG_SZ\s+(.+)/);
        if (matchEmail?.[1]) {
          await saveSetting('email', matchEmail[1].trim());
        }
      } catch (_) {}

      try {
        const regKey = execSync('reg query "HKCU\\Software\\AYNX" /v LicenseKey', { encoding: 'utf8', timeout: 2000 });
        const matchKey = regKey.match(/LicenseKey\s+REG_SZ\s+(.+)/);
        if (matchKey?.[1]) {
          await saveSetting('licenseKey', matchKey[1].trim());
        }
      } catch (_) {}
    } catch (_) {}
  }

  const userDataPath = app.getPath('userData');
  await initDatabase(userDataPath);

  createWindow();

  if (mainWindow) {
    setupIpcListeners(mainWindow);
  }

  startScheduler();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle aynx:// deep link on Windows (second-instance)
app.on('second-instance', (_event, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  // commandLine last arg is the deep link URL
  const deepLink = commandLine.find(arg => arg.startsWith('aynx://'));
  if (deepLink) {
    mainWindow?.webContents.send('deep-link', deepLink);
  }
});

// Handle aynx:// deep link on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  mainWindow?.webContents.send('deep-link', url);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
