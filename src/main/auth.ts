// AYNX Auth Module — Electron Main Process
// Handles Google OAuth popup, JWT storage, and token refresh

import { BrowserWindow, shell, ipcMain, app } from 'electron';
import * as path from 'path';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

let authWindow: BrowserWindow | null = null;
let _store: any = null;

async function getStore() {
  if (_store) return _store;
  const { default: Store } = await import('electron-store');
  _store = new Store({ name: 'aynx_auth' });
  return _store;
}

// ─── Store JWT securely ───────────────────────────────────────────────────────
export async function storeAuthData(data: {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    plan: string;
    trial: boolean;
    trialExpiry: string;
  };
}) {
  const store = await getStore();
  store.set('auth', data);
}

export async function getStoredAuth(): Promise<any | null> {
  const store = await getStore();
  return store.get('auth') || null;
}

export async function clearAuth() {
  const store = await getStore();
  store.delete('auth');
}

// ─── Verify token with backend ────────────────────────────────────────────────
export async function verifyTokenOnline(token: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (res.ok) return await res.json();
  } catch (_) {}
  return null;
}

// ─── Refresh token ────────────────────────────────────────────────────────────
export async function refreshToken(refreshTokenStr: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshTokenStr })
    });
    if (res.ok) {
      const data = await res.json();
      return data.token || null;
    }
  } catch (_) {}
  return null;
}

// ─── Open Google OAuth popup ──────────────────────────────────────────────────
export function openGoogleAuthWindow(mainWindow: BrowserWindow): Promise<any> {
  return new Promise((resolve, reject) => {
    // Close any existing auth window
    if (authWindow && !authWindow.isDestroyed()) {
      authWindow.close();
    }

    authWindow = new BrowserWindow({
      width: 500,
      height: 650,
      title: 'Sign in with Google — AYNX',
      parent: mainWindow,
      modal: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      },
      backgroundColor: '#1e1f22'
    });

    authWindow.setMenu(null);
    authWindow.loadURL(`${API_BASE_URL}/auth/google`);

    // Handle deep link response (for when callback comes back via custom protocol)
    const handleOAuthResult = (result: any) => {
      if (authWindow && !authWindow.isDestroyed()) {
        authWindow.close();
        authWindow = null;
      }
      resolve(result);
    };

    // Listen for redirect to aynx:// (handled in main process)
    // This event fires when the window tries to navigate to aynx:// URL
    authWindow.webContents.on('will-redirect', (event, url) => {
      if (url.startsWith('aynx://')) {
        event.preventDefault();
        const parsed = new URL(url);
        
        if (parsed.searchParams.get('error')) {
          handleOAuthResult({ error: parsed.searchParams.get('error') });
          return;
        }

        const authData = {
          token: parsed.searchParams.get('token') || '',
          refreshToken: parsed.searchParams.get('refresh') || '',
          user: {
            id: '',
            name: parsed.searchParams.get('name') || '',
            email: parsed.searchParams.get('email') || '',
            avatar: parsed.searchParams.get('avatar') || '',
            plan: parsed.searchParams.get('plan') || 'Free',
            trial: parsed.searchParams.get('trial') === 'true',
            trialExpiry: parsed.searchParams.get('trialExpiry') || ''
          }
        };
        handleOAuthResult(authData);
      }
    });

    // Also handle will-navigate
    authWindow.webContents.on('will-navigate', (event, url) => {
      if (url.startsWith('aynx://')) {
        event.preventDefault();
        const parsed = new URL(url);
        
        if (parsed.searchParams.get('error')) {
          handleOAuthResult({ error: parsed.searchParams.get('error') });
          return;
        }

        const authData = {
          token: parsed.searchParams.get('token') || '',
          refreshToken: parsed.searchParams.get('refresh') || '',
          user: {
            id: '',
            name: parsed.searchParams.get('name') || '',
            email: parsed.searchParams.get('email') || '',
            avatar: parsed.searchParams.get('avatar') || '',
            plan: parsed.searchParams.get('plan') || 'Free',
            trial: parsed.searchParams.get('trial') === 'true',
            trialExpiry: parsed.searchParams.get('trialExpiry') || ''
          }
        };
        handleOAuthResult(authData);
      }
    });

    authWindow.on('closed', () => {
      authWindow = null;
      // If window closed without auth, reject
      reject(new Error('Auth window closed by user'));
    });
  });
}

// ─── Open Razorpay payment window ─────────────────────────────────────────────
export function openRazorpayWindow(mainWindow: BrowserWindow, orderData: {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  userEmail: string;
  userName: string;
  planId: string;
}): Promise<any> {
  return new Promise((resolve, reject) => {
    const paymentWindow = new BrowserWindow({
      width: 520,
      height: 700,
      title: 'AYNX — Secure Payment',
      parent: mainWindow,
      modal: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: false, // Needed for Razorpay checkout.js
        webSecurity: true
      },
      backgroundColor: '#ffffff'
    });

    paymentWindow.setMenu(null);

    const razorpayHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AYNX Payment</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body { margin: 0; background: #1e1f22; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: -apple-system, sans-serif; color: white; }
    .loading { text-align: center; }
    .loading h2 { font-size: 16px; color: #b5bac1; }
    .loading .spinner { width: 36px; height: 36px; border: 3px solid #404249; border-top-color: #5865f2; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 16px auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <h2>Opening secure payment...</h2>
  </div>
  <script>
    window.onload = function() {
      const options = {
        key: ${JSON.stringify(orderData.keyId)},
        amount: ${orderData.amount},
        currency: ${JSON.stringify(orderData.currency)},
        order_id: ${JSON.stringify(orderData.orderId)},
        name: 'AYNX Universal Media Downloader',
        description: 'AYNX Premium Subscription',
        prefill: {
          email: ${JSON.stringify(orderData.userEmail)},
          name: ${JSON.stringify(orderData.userName)}
        },
        theme: { color: '#5865f2' },
        modal: { backdropclose: false },
        handler: function(response) {
          window.location.href = 'aynx://payment?status=success&orderId=' + 
            encodeURIComponent(response.razorpay_order_id) + '&paymentId=' + 
            encodeURIComponent(response.razorpay_payment_id) + '&signature=' + 
            encodeURIComponent(response.razorpay_signature) + '&planId=' +
            encodeURIComponent(${JSON.stringify(orderData.planId)});
        }
      };
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function(response) {
        window.location.href = 'aynx://payment?status=failed&error=' + encodeURIComponent(response.error.description);
      });
      rzp.open();
    };
  </script>
</body>
</html>`;

    paymentWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(razorpayHTML)}`);

    const handlePaymentResult = (result: any) => {
      if (!paymentWindow.isDestroyed()) paymentWindow.close();
      resolve(result);
    };

    paymentWindow.webContents.on('will-navigate', (event, url) => {
      if (url.startsWith('aynx://payment')) {
        event.preventDefault();
        const parsed = new URL(url);
        const status = parsed.searchParams.get('status');
        if (status === 'success') {
          handlePaymentResult({
            success: true,
            orderId: parsed.searchParams.get('orderId'),
            paymentId: parsed.searchParams.get('paymentId'),
            signature: parsed.searchParams.get('signature'),
            planId: parsed.searchParams.get('planId')
          });
        } else {
          handlePaymentResult({ success: false, error: parsed.searchParams.get('error') });
        }
      }
    });

    paymentWindow.on('closed', () => {
      reject(new Error('Payment window closed'));
    });
  });
}
