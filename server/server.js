const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// File paths
const LICENSES_FILE = path.join(DATA_DIR, 'licenses.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TELEMETRY_FILE = path.join(DATA_DIR, 'telemetry.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Helper to read JSON file safely
function readJSON(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
  }
  return defaultValue;
}

// Helper to write JSON file safely
function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e);
  }
}

// Seed Initial Data
if (!fs.existsSync(LICENSES_FILE)) {
  const initialLicenses = [
    { key: 'AYNX-FREE-PLAN-2026', plan: 'Free', activated: false, machineId: null, activatedAt: null },
    { key: 'AYNX-PLUS-PLAN-2026', plan: 'Plus', activated: false, machineId: null, activatedAt: null },
    { key: 'AYNX-PRO-PLAN-2026', plan: 'Pro', activated: false, machineId: null, activatedAt: null },
    { key: 'AYNX-PRO-9999-ONLINE', plan: 'Pro', activated: false, machineId: null, activatedAt: null },
    { key: 'AYNX-PLUS-8888-ONLINE', plan: 'Plus', activated: false, machineId: null, activatedAt: null }
  ];
  writeJSON(LICENSES_FILE, initialLicenses);
}

if (!fs.existsSync(SETTINGS_FILE)) {
  const initialSettings = {
    latestVersion: '2.3.6',
    downloadUrl: 'file:///e:/SABLE%202.0/release/AYNX%20Setup%202.3.6.exe',
    changelog: 'v2.3.6 Release Notes:\n- Added customizable UI dashboard modules gating\n- Fixed YouTube speed throttling issues\n- Added fallback Spotify embed metadata lookup scraper\n- Added Instagram session cookies import assistance'
  };
  writeJSON(SETTINGS_FILE, initialSettings);
}

// Route handlers
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  // Static files server for Admin Portal
  if (req.method === 'GET' && (pathname === '/admin' || pathname === '/admin/' || pathname.startsWith('/admin/'))) {
    let targetFile = pathname === '/admin' || pathname === '/admin/' ? 'admin.html' : pathname.replace('/admin/', '');
    const filePath = path.join(PUBLIC_DIR, targetFile);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      let contentType = 'text/html';
      if (filePath.endsWith('.css')) contentType = 'text/css';
      if (filePath.endsWith('.js')) contentType = 'text/javascript';
      if (filePath.endsWith('.json')) contentType = 'application/json';

      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Admin file not found.');
      return;
    }
  }

  // Helper to read request body
  const getBody = () => {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({});
        }
      });
    });
  };

  // API Routes
  if (pathname === '/api/license/verify' && req.method === 'POST') {
    getBody().then(data => {
      const { key, machineId, email } = data;
      const licenses = readJSON(LICENSES_FILE);

      // Handle Trial request
      if (key === 'TRIAL' || !key) {
        const users = readJSON(USERS_FILE);
        const user = users.find(u => u.email === email);
        if (user) {
          const now = Date.now();
          const expTime = new Date(user.expiresAt).getTime();
          if (now > expTime) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ key: 'TRIAL', plan: 'Free', expired: true, error: 'Free Plus trial has expired.' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ key: user.licenseKey, plan: user.plan, expiresAt: user.expiresAt }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ key: 'TRIAL', plan: 'Free' }));
        return;
      }

      const lic = licenses.find(l => l.key === key);
      if (!lic) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'License key not found.' }));
        return;
      }

      // Check Expiration
      if (lic.expiresAt) {
        const now = Date.now();
        const expTime = new Date(lic.expiresAt).getTime();
        if (now > expTime) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ key: lic.key, plan: 'Free', expired: true, error: 'License key has expired.' }));
          return;
        }
      }

      // If already activated on another machine, reject
      if (lic.activated && lic.machineId !== machineId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'License key already activated on another device.' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ key: lic.key, plan: lic.plan, activated: lic.activated, expiresAt: lic.expiresAt }));
    });
  }

  else if (pathname === '/api/license/activate' && req.method === 'POST') {
    getBody().then(data => {
      const { key, machineId, email, displayName } = data;
      const licenses = readJSON(LICENSES_FILE);
      const users = readJSON(USERS_FILE);

      if (!email) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Email Address is required.' }));
        return;
      }

      // 1. Handle Trial Request (new user, 1-month Plus trial)
      if (key === 'TRIAL' || !key) {
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
          const now = Date.now();
          const expTime = new Date(existingUser.expiresAt).getTime();
          if (now > expTime) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Your 1-month free trial has expired. Please enter a valid license key.' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, key: existingUser.licenseKey, plan: existingUser.plan, expiresAt: existingUser.expiresAt }));
          return;
        }

        // Generate trial key and activate
        const randHex = () => Math.random().toString(16).substring(2, 6).toUpperCase();
        const trialKey = `AYNX-TRIAL-${randHex()}-${randHex()}`;
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

        const trialLic = {
          key: trialKey,
          plan: 'Plus',
          activated: true,
          machineId,
          email,
          activatedAt: new Date().toISOString(),
          expiresAt
        };
        licenses.push(trialLic);
        writeJSON(LICENSES_FILE, licenses);

        const newUser = {
          machineId,
          displayName: displayName || 'Trial User',
          email,
          plan: 'Plus',
          licenseKey: trialKey,
          lastSeen: new Date().toISOString(),
          expiresAt,
          trialUsed: true
        };
        users.push(newUser);
        writeJSON(USERS_FILE, users);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, key: trialKey, plan: 'Plus', expiresAt }));
        return;
      }

      // 2. Handle Regular License Key Activation
      const licIndex = licenses.findIndex(l => l.key === key);
      if (licIndex === -1) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid license key.' }));
        return;
      }

      const lic = licenses[licIndex];

      // Check if key already activated by someone else
      if (lic.activated && lic.email !== email) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'This license key is already activated by another email address.' }));
        return;
      }



      // Activate key online for 1 month
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 1 month validity
      lic.activated = true;
      lic.machineId = machineId;
      lic.email = email;
      lic.activatedAt = new Date().toISOString();
      lic.expiresAt = expiresAt;
      licenses[licIndex] = lic;
      writeJSON(LICENSES_FILE, licenses);

      // Register or update user record
      const userIndex = users.findIndex(u => u.machineId === machineId || u.email === email);
      const userObj = {
        machineId,
        displayName: displayName || 'Anonymous User',
        email,
        plan: lic.plan,
        licenseKey: key,
        lastSeen: new Date().toISOString(),
        expiresAt,
        activeDownloads: 0
      };

      if (userIndex === -1) {
        users.push(userObj);
      } else {
        users[userIndex] = { ...users[userIndex], ...userObj };
      }
      writeJSON(USERS_FILE, users);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, key: lic.key, plan: lic.plan, expiresAt }));
    });
  }

  else if (pathname === '/api/telemetry/report' && req.method === 'POST') {
    getBody().then(data => {
      const { machineId, platform, contentType, title, status, sizeBytes } = data;
      const telemetry = readJSON(TELEMETRY_FILE);

      const log = {
        id: Math.random().toString(36).substring(2, 11),
        machineId,
        platform,
        contentType,
        title,
        status,
        sizeBytes: sizeBytes || 0,
        timestamp: new Date().toISOString()
      };

      telemetry.push(log);
      writeJSON(TELEMETRY_FILE, telemetry);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
  }

  else if (pathname === '/api/telemetry/heartbeat' && req.method === 'POST') {
    getBody().then(data => {
      const { machineId, displayName, plan, activeDownloads, statusText } = data;
      const users = readJSON(USERS_FILE);
      const userIndex = users.findIndex(u => u.machineId === machineId);

      let finalPlan = plan || 'Free';
      let licenseKey = 'TRIAL';
      let expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (userIndex !== -1) {
        // Retain plan set by admin / server database
        finalPlan = users[userIndex].plan || finalPlan;
        licenseKey = users[userIndex].licenseKey || licenseKey;
        expiresAt = users[userIndex].expiresAt || expiresAt;

        users[userIndex].displayName = displayName || users[userIndex].displayName || 'Anonymous User';
        users[userIndex].lastSeen = new Date().toISOString();
        users[userIndex].activeDownloads = activeDownloads || 0;
        users[userIndex].statusText = statusText || 'Idle';
      } else {
        // Register new user pings
        const newUser = {
          machineId,
          displayName: displayName || 'Anonymous User',
          plan: finalPlan,
          licenseKey,
          lastSeen: new Date().toISOString(),
          expiresAt,
          activeDownloads: activeDownloads || 0,
          statusText: statusText || 'Idle'
        };
        users.push(newUser);
      }
      writeJSON(USERS_FILE, users);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        plan: finalPlan,
        licenseKey,
        expiresAt
      }));
    });
  }

  else if (pathname === '/api/version/check' && req.method === 'GET') {
    const settings = readJSON(SETTINGS_FILE, {});
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(settings));
  }

  else if (pathname === '/api/version/set' && req.method === 'POST') {
    getBody().then(data => {
      const { latestVersion, downloadUrl, changelog } = data;
      const settings = readJSON(SETTINGS_FILE, {});

      settings.latestVersion = latestVersion || settings.latestVersion;
      settings.downloadUrl = downloadUrl || settings.downloadUrl;
      settings.changelog = changelog || settings.changelog;

      writeJSON(SETTINGS_FILE, settings);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, settings }));
    });
  }

  // Admin routes for fetching data dashboard
  else if (pathname === '/api/admin/dashboard' && req.method === 'GET') {
    const licenses = readJSON(LICENSES_FILE);
    const users = readJSON(USERS_FILE);
    const telemetry = readJSON(TELEMETRY_FILE);
    const settings = readJSON(SETTINGS_FILE, {});

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      licenses,
      users,
      telemetry,
      settings
    }));
  }

  else if (pathname === '/api/admin/generate-key' && req.method === 'POST') {
    getBody().then(data => {
      const { plan } = data;
      if (plan !== 'Plus' && plan !== 'Pro') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid plan type.' }));
        return;
      }

      const licenses = readJSON(LICENSES_FILE);
      // Generate key like AYNX-PRO-XXXX-XXXX
      const randHex = () => Math.random().toString(16).substring(2, 6).toUpperCase();
      const newKey = `AYNX-${plan.toUpperCase()}-${randHex()}-${randHex()}`;

      licenses.push({
        key: newKey,
        plan,
        activated: false,
        machineId: null,
        activatedAt: null,
        email: null
      });

      writeJSON(LICENSES_FILE, licenses);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, key: newKey }));
    });
  }

  else if (pathname === '/api/admin/update-user-plan' && req.method === 'POST') {
    getBody().then(data => {
      const { machineId, plan } = data;
      if (plan !== 'Free' && plan !== 'Plus' && plan !== 'Pro') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid plan type.' }));
        return;
      }

      const users = readJSON(USERS_FILE);
      const userIndex = users.findIndex(u => u.machineId === machineId);
      if (userIndex === -1) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'User machine not found.' }));
        return;
      }

      const user = users[userIndex];
      const licenses = readJSON(LICENSES_FILE);

      user.plan = plan;

      if (plan === 'Free') {
        // Expire license
        user.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
        // Also find their key in licenses and expire it
        const lic = licenses.find(l => l.key === user.licenseKey);
        if (lic) {
          lic.expiresAt = user.expiresAt;
        }
      } else {
        // Upgrade plan for 30 days
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        user.expiresAt = expiresAt;

        // If user does not have a real key or has a trial key, generate a fresh active key
        if (!user.licenseKey || user.licenseKey === 'TRIAL' || user.licenseKey.startsWith('AYNX-TRIAL-')) {
          const randHex = () => Math.random().toString(16).substring(2, 6).toUpperCase();
          const newKey = `AYNX-${plan.toUpperCase()}-${randHex()}-${randHex()}`;
          user.licenseKey = newKey;

          licenses.push({
            key: newKey,
            plan,
            activated: true,
            machineId: user.machineId,
            email: user.email || 'backend-admin-upgrade@aynx.com',
            activatedAt: new Date().toISOString(),
            expiresAt
          });
        } else {
          // Update existing key validation in licenses
          const lic = licenses.find(l => l.key === user.licenseKey);
          if (lic) {
            lic.plan = plan;
            lic.expiresAt = expiresAt;
          } else {
            licenses.push({
              key: user.licenseKey,
              plan,
              activated: true,
              machineId: user.machineId,
              email: user.email || 'backend-admin-upgrade@aynx.com',
              activatedAt: new Date().toISOString(),
              expiresAt
            });
          }
        }
      }

      writeJSON(USERS_FILE, users);
      writeJSON(LICENSES_FILE, licenses);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, user }));
    });
  }

  else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`[AYNX Server] Online backend API running at http://localhost:${PORT}`);
  console.log(`[AYNX Server] Admin Dashboard Portal available at http://localhost:${PORT}/admin`);
});
