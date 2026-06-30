import { BrowserWindow, shell, ipcMain } from 'electron';
import * as path from 'path';

let browserWindow: BrowserWindow | null = null;

export function createBrowserWindow(parentWindow: BrowserWindow) {
  if (browserWindow) {
    if (browserWindow.isMinimized()) browserWindow.restore();
    browserWindow.focus();
    return browserWindow;
  }

  browserWindow = new BrowserWindow({
    title: 'AYNX Built-in Browser',
    width: 1280,
    height: 850,
    minWidth: 800,
    minHeight: 600,
    show: false,
    parent: parentWindow,
    autoHideMenuBar: true,
    backgroundColor: '#1e1f22',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true // Allow webviews inside the browser window
    }
  });

  // Enable/disable DevTools or menu in development
  if (process.env.NODE_ENV === 'development') {
    browserWindow.loadURL('http://localhost:5173/#/browser');
    browserWindow.webContents.openDevTools();
  } else {
    browserWindow.setMenu(null);
    browserWindow.loadURL(`file://${path.join(__dirname, '../renderer/index.html')}#/browser`);
  }

  browserWindow.once('ready-to-show', () => {
    if (browserWindow) browserWindow.show();
  });

  browserWindow.on('closed', () => {
    browserWindow = null;
  });

  // Prevent default download managers inside the browser webviews.
  // We want to capture ALL downloads initiated by webviews in AYNX.
  browserWindow.webContents.session.on('will-download', (event, item) => {
    event.preventDefault(); // Intercept Chromium's default download manager
    const url = item.getURL();
    const filename = item.getFilename();
    const totalBytes = item.getTotalBytes();
    
    // Send it to the main window to be added to the AYNX Download Queue!
    if (parentWindow && !parentWindow.isDestroyed()) {
      parentWindow.webContents.send('browser:download-intercepted', {
        url,
        filename,
        totalBytes
      });
    }
  });

  return browserWindow;
}

export function getBrowserWindow() {
  return browserWindow;
}
