import { app, BrowserWindow, protocol, net, Tray, Menu, shell } from 'electron';
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
let tray: Tray | null = null;
let isQuitting = false;

function handleJumpListArg(commandLine: string[]) {
  const actionArg = commandLine.find(arg => arg.startsWith('--action='));
  if (actionArg && mainWindow) {
    const action = actionArg.split('=')[1];
    mainWindow.webContents.send('jump-list-action', action);
  }
}

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

  mainWindow.webContents.on('did-finish-load', () => {
    handleJumpListArg(process.argv);
  });

  mainWindow.on('close', async (e) => {
    if (!isQuitting) {
      try {
        const { getSettings } = require('./database');
        const settings = await getSettings();
        if (settings.closeToTray === 'false') {
          isQuitting = true;
          app.quit();
          return;
        }
      } catch (err) {
        console.error('Failed to query closeToTray settings:', err);
      }
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../../resources/icon.png');
  tray = new Tray(iconPath);
  tray.setToolTip('AYNX \u2013 Download Manager');

  const updateMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open AYNX',
        click: () => {
          if (!mainWindow) return;
          mainWindow.show();
          mainWindow.focus();
        }
      },
      { type: 'separator' },
      {
        label: 'Quick Download (Paste URL)',
        click: () => {
          if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
          mainWindow?.webContents.send('jump-list-action', 'paste-url');
        }
      },
      {
        label: 'Open Built-in Browser',
        click: () => {
          if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
          mainWindow?.webContents.send('jump-list-action', 'open-browser');
        }
      },
      {
        label: 'Recent Downloads',
        click: () => {
          if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
          mainWindow?.webContents.send('jump-list-action', 'recent-downloads');
        }
      },
      {
        label: 'Settings',
        click: () => {
          if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
          mainWindow?.webContents.send('jump-list-action', 'open-settings');
        }
      },
      { type: 'separator' },
      {
        label: 'Quit AYNX',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);
    tray?.setContextMenu(contextMenu);
  };

  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  updateMenu();
}

function setupJumpList() {
  app.setJumpList([
    {
      type: 'tasks',
      items: [
        {
          type: 'task',
          title: 'Quick Download (Paste URL)',
          description: 'Paste a URL and start downloading immediately',
          program: process.execPath,
          args: '--action=paste-url',
          iconPath: process.execPath,
          iconIndex: 0
        },
        {
          type: 'task',
          title: 'Open Built-in Browser',
          description: 'Launch the AYNX built-in browser',
          program: process.execPath,
          args: '--action=open-browser',
          iconPath: process.execPath,
          iconIndex: 0
        },
        {
          type: 'task',
          title: 'Recent Downloads',
          description: 'View your recent downloads',
          program: process.execPath,
          args: '--action=recent-downloads',
          iconPath: process.execPath,
          iconIndex: 0
        },
        {
          type: 'task',
          title: 'Open Settings',
          description: 'Configure AYNX preferences',
          program: process.execPath,
          args: '--action=open-settings',
          iconPath: process.execPath,
          iconIndex: 0
        }
      ]
    }
  ]);
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


  const userDataPath = app.getPath('userData');
  await initDatabase(userDataPath);

  createWindow();
  createTray();
  setupJumpList();

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
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
  // Handle deep links
  const deepLink = commandLine.find(arg => arg.startsWith('aynx://'));
  if (deepLink) {
    mainWindow?.webContents.send('deep-link', deepLink);
  }
  // Handle jump list actions
  handleJumpListArg(commandLine);
});

// Handle aynx:// deep link on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  mainWindow?.webContents.send('deep-link', url);
});

app.on('window-all-closed', () => {
  // When tray is active we don't quit on close — tray keeps the app alive.
  if (isQuitting || process.platform === 'darwin') {
    tray?.destroy();
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});
