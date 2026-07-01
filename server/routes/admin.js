const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'aynx_dev_secret';
const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// JSON Helpers
function readDataFile(filename, defaultValue = []) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error(`Error reading ${filename}:`, e);
  }
  return defaultValue;
}

function writeDataFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error writing ${filename}:`, e);
  }
}

// Seed Feature Flags with plan levels and migrate legacy booleans
const FLAGS_FILE = 'feature_flags.json';
const defaultFlags = {
  built_in_browser: 'Plus',
  scheduler: 'Pro',
  clipboard_monitor: 'Free',
  cloud_sync: 'Pro',
  themes: 'Plus',
  dashboard_widgets: 'Free',
  ai_assistant: 'Plus',
  browser_extension: 'Plus',
  media_converter: 'Pro',
  favorites: 'Plus'
};

let currentFlags = {};
if (fs.existsSync(path.join(DATA_DIR, FLAGS_FILE))) {
  currentFlags = readDataFile(FLAGS_FILE, {});
  let migrated = false;
  Object.keys(defaultFlags).forEach(flag => {
    if (typeof currentFlags[flag] === 'boolean' || currentFlags[flag] === undefined) {
      if (currentFlags[flag] === false) {
        currentFlags[flag] = 'Disabled';
      } else {
        currentFlags[flag] = defaultFlags[flag];
      }
      migrated = true;
    }
  });
  if (migrated) {
    writeDataFile(FLAGS_FILE, currentFlags);
  }
} else {
  writeDataFile(FLAGS_FILE, defaultFlags);
}

// Seed Support Tickets if not present
const TICKETS_FILE = 'support_tickets.json';
if (!fs.existsSync(path.join(DATA_DIR, TICKETS_FILE))) {
  const initialTickets = [
    {
      id: 'TKT-1001',
      userId: 'user_01',
      userName: 'John Doe',
      type: 'Bug Report',
      title: 'Built-in Browser crashes on specific media streams',
      priority: 'High',
      status: 'Open',
      label: 'Browser',
      assignee: 'Unassigned',
      messages: [
        { sender: 'user', text: 'Hey, when playing twitch clips, the player window freezes entirely. Running 2.6.2.', time: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString() }
      ],
      created_at: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'TKT-1002',
      userId: 'user_02',
      userName: 'Sarah Connor',
      type: 'Feature Request',
      title: 'Support for dark-mode toggle shortcut keybinds',
      priority: 'Low',
      status: 'Resolved',
      label: 'UI/UX',
      assignee: 'Ayan Kashyap',
      messages: [
        { sender: 'user', text: 'It would be cool if Ctrl+Shift+T toggles the interface mode.', time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
        { sender: 'admin', text: 'Added in version 2.6.2 under Advanced Preferences panel shortcut key mappings.', time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() }
      ],
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  writeDataFile(TICKETS_FILE, initialTickets);
}

// Seed Admin Credentials (hashed for security)
const ADMINS_FILE = 'admins.json';
const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

if (!fs.existsSync(path.join(DATA_DIR, ADMINS_FILE))) {
  const initialAdmins = [
    { username: 'ayankashyap', passwordHash: sha256('ayan'), role: 'Super Admin' },
    { username: 'manager', passwordHash: sha256('manager'), role: 'Manager' },
    { username: 'analytics', passwordHash: sha256('analytics'), role: 'Analytics' }
  ];
  writeDataFile(ADMINS_FILE, initialAdmins);
}

// Audit Logger Helper
function logAudit(adminUser, action, resource, req) {
  const logs = readDataFile('audit_logs.json', []);
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  
  logs.unshift({
    id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    administrator: adminUser?.username || 'System',
    role: adminUser?.role || 'System',
    action,
    affectedResource: resource,
    ipAddress: ip
  });
  
  // Cap at 500 audit logs to save space
  writeDataFile('audit_logs.json', logs.slice(0, 500));
}

// Middleware: Authenticate Admin JWT
function requireAdminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.headers.authorization?.split(' ')[1];
  if (!token) {
    // Check legacy x-admin-secret for backwards compatibility
    const secret = req.headers['x-admin-secret'] || req.query.secret;
    if (secret && secret === process.env.ADMIN_SECRET) {
      req.adminUser = { username: 'ayankashyap', role: 'Super Admin' };
      return next();
    }
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.adminUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid token.' });
  }
}

// Middleware: RBAC validator
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.adminUser) return res.status(401).json({ error: 'Unauthorized.' });
    if (allowedRoles.includes(req.adminUser.role)) {
      return next();
    }
    return res.status(403).json({ error: 'Access denied: Insufficient privileges.' });
  };
}

// Serve admin portal HTML
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// POST /login — Admin Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }

  const admins = readDataFile(ADMINS_FILE, []);
  const passHash = sha256(password);
  const matched = admins.find(a => a.username === username && a.passwordHash === passHash);

  if (!matched) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Generate Admin JWT
  const token = jwt.sign(
    { username: matched.username, role: matched.role, isAdmin: true },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  res.json({ success: true, token, role: matched.role, username: matched.username });
});

// GET /verify — Verify Token
router.get('/verify', requireAdminAuth, (req, res) => {
  res.json({ success: true, username: req.adminUser.username, role: req.adminUser.role });
});

// Helper: Query tables safely with local JSON file fallback
async function safeGetTable(tableName, orderField, ascending, localFilename, defaultValue = []) {
  try {
    if (!supabase) return readDataFile(localFilename, defaultValue);
    
    let query = supabase.from(tableName).select('*');
    if (orderField) {
      query = query.order(orderField, { ascending });
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn(`[Supabase Fallback] Query to ${tableName} failed, falling back to local file. Error:`, err.message);
    return readDataFile(localFilename, defaultValue);
  }
}

// GET /dashboard — Extended Dashboard Data
router.get('/dashboard', requireAdminAuth, async (req, res) => {
  try {
    const [users, subscriptions, licenses, telemetry, versions, announcements] = await Promise.all([
      safeGetTable('users', 'created_at', false, 'users.json'),
      safeGetTable('subscriptions', 'created_at', false, 'subscriptions.json'),
      safeGetTable('license_keys', 'created_at', false, 'license_keys.json'),
      safeGetTable('telemetry', 'created_at', false, 'telemetry.json'),
      safeGetTable('app_versions', 'published_at', false, 'app_versions.json', [
        { version: '2.7.1', is_latest: true, published_at: new Date().toISOString(), download_url: 'https://drive.usercontent.com/download?id=1dGqW-BhAk9fJc37JKXB6QeAU6_FlLjR8&export=download&confirm=t', changelog: 'v2.7.1-stable' }
      ]),
      safeGetTable('announcements', 'created_at', false, 'announcements.json')
    ]);

    // Fetch Local Fallback lists
    const devicesList = readDataFile('devices.json', []);
    const auditLogs = readDataFile('audit_logs.json', []);
    const featureFlags = readDataFile('feature_flags.json', {});
    const supportTickets = readDataFile('support_tickets.json', []);

    // Active users count (active within 5 min)
    const now = new Date();
    const activeDevicesCount = devicesList.filter(d => {
      const lastSeen = d.lastSeen ? new Date(d.lastSeen) : null;
      return lastSeen && (now - lastSeen) < 5 * 60 * 1000;
    }).length;

    // Plan count aggregation
    const plusUsers = users.filter(u => u.plan === 'Plus').length || 0;
    const proUsers = users.filter(u => u.plan === 'Pro').length || 0;
    const freeUsers = users.filter(u => !u.plan || u.plan === 'Free').length || 0;

    // Revenue calculations
    let monthlyRev = 0;
    let annualRev = 0;
    if (subscriptions) {
      subscriptions.forEach(sub => {
        if (sub.status === 'active' && sub.amount_paise) {
          const amount = sub.amount_paise / 100;
          if (sub.billing_period === 'yearly') {
            annualRev += amount;
          } else {
            monthlyRev += amount;
          }
        }
      });
    }

    // Website traffic stats
    const websiteAnalytics = {
      views: { total: 0, hero: 0, features: 0, compare: 0, pricing: 0 },
      logins: 0,
      downloads: 0
    };

    const webEvents = telemetry.filter(t => t.event && t.event.startsWith('website_')) || [];
    webEvents.forEach(evt => {
      if (evt.event === 'website_view') {
        websiteAnalytics.views.total++;
        const section = evt.metadata?.section;
        if (section && websiteAnalytics.views.hasOwnProperty(section)) {
          websiteAnalytics.views[section]++;
        }
      } else if (evt.event === 'website_login') {
        websiteAnalytics.logins++;
      } else if (evt.event === 'website_download_click') {
        websiteAnalytics.downloads++;
      }
    });

    res.json({
      users,
      subscriptions,
      licenses,
      telemetry,
      versions,
      announcements,
      devices: devicesList,
      auditLogs,
      featureFlags,
      supportTickets,
      revenue: { monthly: monthlyRev, annual: annualRev },
      stats: {
        activeUsers: activeDevicesCount,
        totalDownloads: telemetry.filter(t => t.event === 'download' || t.event === 'download_completed').length || 0,
        plusUsers,
        proUsers,
        freeUsers,
        totalUsers: users.length || 0
      },
      websiteAnalytics
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/sub-admins — Get all sub admins (Super Admin only)
router.get('/sub-admins', requireAdminAuth, requireRole(['Super Admin']), (req, res) => {
  const admins = readDataFile(ADMINS_FILE, []);
  // Remove password hashes for safety
  const list = admins.map(a => ({ username: a.username, role: a.role }));
  res.json({ success: true, admins: list });
});

// POST /admin/sub-admins/create — Add new sub admin (Super Admin only)
router.post('/sub-admins/create', requireAdminAuth, requireRole(['Super Admin']), (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role required.' });
  }
  if (!['Manager', 'Analytics'].includes(role)) {
    return res.status(400).json({ error: 'Invalid sub-admin role.' });
  }

  const admins = readDataFile(ADMINS_FILE, []);
  const exists = admins.some(a => a.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Sub-admin username already exists.' });
  }

  admins.push({
    username,
    passwordHash: sha256(password),
    role
  });
  writeDataFile(ADMINS_FILE, admins);

  logAudit(req.adminUser, `Created sub-admin account: ${username}`, `Role: ${role}`, req);
  res.json({ success: true, message: 'Sub-admin created successfully.' });
});

// POST /admin/sub-admins/delete — Remove a sub admin (Super Admin only)
router.post('/sub-admins/delete', requireAdminAuth, requireRole(['Super Admin']), (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required.' });

  if (username.toLowerCase() === 'ayankashyap') {
    return res.status(400).json({ error: 'Cannot delete primary Super Administrator.' });
  }

  const admins = readDataFile(ADMINS_FILE, []);
  const filtered = admins.filter(a => a.username.toLowerCase() !== username.toLowerCase());
  
  if (admins.length === filtered.length) {
    return res.status(404).json({ error: 'Sub-admin not found.' });
  }

  writeDataFile(ADMINS_FILE, filtered);
  logAudit(req.adminUser, `Deleted sub-admin account: ${username}`, 'Credentials Registry', req);
  res.json({ success: true, message: 'Sub-admin deleted successfully.' });
});

// POST /admin/sub-admins/reset-password — Reset password (Super Admin only)
router.post('/sub-admins/reset-password', requireAdminAuth, requireRole(['Super Admin']), (req, res) => {
  const { username, newPassword } = req.body;
  if (!username || !newPassword) {
    return res.status(400).json({ error: 'Username and new password required.' });
  }

  const admins = readDataFile(ADMINS_FILE, []);
  const admin = admins.find(a => a.username.toLowerCase() === username.toLowerCase());
  if (!admin) return res.status(404).json({ error: 'Sub-admin not found.' });

  admin.passwordHash = sha256(newPassword);
  writeDataFile(ADMINS_FILE, admins);

  logAudit(req.adminUser, `Reset password for sub-admin: ${username}`, 'Credentials Registry', req);
  res.json({ success: true, message: 'Password reset successfully.' });
});

// POST /update-user-plan — Change subscription tier
router.post('/update-user-plan', requireAdminAuth, requireRole(['Super Admin', 'Manager']), async (req, res) => {
  try {
    const { userId, plan } = req.body;
    if (!['Free', 'Plus', 'Pro'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan.' });
    }

    const expiresAt = plan === 'Free'
      ? new Date(Date.now() - 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    try {
      if (supabase) {
        await supabase.from('users').update({
          plan,
          trial_expires_at: expiresAt,
          updated_at: new Date().toISOString()
        }).eq('id', userId);

        if (plan !== 'Free') {
          await supabase.from('subscriptions').insert({
            user_id: userId,
            plan,
            starts_at: new Date().toISOString(),
            expires_at: expiresAt,
            status: 'active',
            amount_paise: 0
          });
        }
      }
    } catch (dbErr) {
      console.warn('[Supabase Fallback] Update user plan failed:', dbErr.message);
    }

    // Mirror to local JSON
    const localUsers = readDataFile('users.json', []);
    const uIdx = localUsers.findIndex(u => u.id === userId);
    if (uIdx !== -1) {
      localUsers[uIdx].plan = plan;
      localUsers[uIdx].trial_expires_at = expiresAt;
      localUsers[uIdx].updated_at = new Date().toISOString();
      writeDataFile('users.json', localUsers);
    }

    logAudit(req.adminUser, `Updated plan to ${plan}`, `User ID: ${userId}`, req);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /suspend-user — Suspend client plan & block access
router.post('/suspend-user', requireAdminAuth, requireRole(['Super Admin']), async (req, res) => {
  try {
    const { userId } = req.body;
    try {
      if (supabase) {
        await supabase.from('users').update({ plan: 'Free', trial_expires_at: new Date().toISOString() }).eq('id', userId);
      }
    } catch (dbErr) {
      console.warn('[Supabase Fallback] Suspend user failed:', dbErr.message);
    }

    const localUsers = readDataFile('users.json', []);
    const uIdx = localUsers.findIndex(u => u.id === userId);
    if (uIdx !== -1) {
      localUsers[uIdx].plan = 'Free';
      localUsers[uIdx].trial_expires_at = new Date().toISOString();
      writeDataFile('users.json', localUsers);
    }

    logAudit(req.adminUser, 'Suspended User Accounts', `User ID: ${userId}`, req);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /delete-user — Hard Delete user (Super Admin only)
router.post('/delete-user', requireAdminAuth, requireRole(['Super Admin']), async (req, res) => {
  try {
    const { userId } = req.body;
    try {
      if (supabase) {
        await supabase.from('users').delete().eq('id', userId);
        await supabase.from('subscriptions').delete().eq('user_id', userId);
        await supabase.from('telemetry').delete().eq('user_id', userId);
      }
    } catch (dbErr) {
      console.warn('[Supabase Fallback] Delete user failed:', dbErr.message);
    }

    const localUsers = readDataFile('users.json', []);
    writeDataFile('users.json', localUsers.filter(u => u.id !== userId));

    logAudit(req.adminUser, 'Hard Deleted User Account', `User ID: ${userId}`, req);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /force-logout — Send remote command force logout
router.post('/force-logout', requireAdminAuth, requireRole(['Super Admin']), (req, res) => {
  const { machineId } = req.body;
  const commandQueue = readDataFile('command_queue.json', []);
  commandQueue.push({ machineId, command: 'force_logout', created_at: new Date().toISOString() });
  writeDataFile('command_queue.json', commandQueue);

  logAudit(req.adminUser, 'Issued force logout command', `Device: ${machineId}`, req);
  res.json({ success: true });
});

// POST /device-action — Queue remote administrative action
router.post('/device-action', requireAdminAuth, requireRole(['Super Admin']), (req, res) => {
  const { machineId, action } = req.body; // revalidate_license, clear_cache, check_updates, upload_logs
  const commandQueue = readDataFile('command_queue.json', []);
  commandQueue.push({ machineId, command: action, created_at: new Date().toISOString() });
  writeDataFile('command_queue.json', commandQueue);

  logAudit(req.adminUser, `Issued remote action ${action}`, `Device: ${machineId}`, req);
  res.json({ success: true });
});

// POST /disconnect-device — Disconnect device
router.post('/disconnect-device', requireAdminAuth, requireRole(['Super Admin']), (req, res) => {
  const { machineId } = req.body;
  const devices = readDataFile('devices.json', []);
  const filtered = devices.filter(d => d.machineId !== machineId);
  writeDataFile('devices.json', filtered);

  logAudit(req.adminUser, 'Disconnected Device', `Device: ${machineId}`, req);
  res.json({ success: true });
});

// POST /generate-key — Generate keys
router.post('/generate-key', requireAdminAuth, requireRole(['Super Admin', 'Manager']), async (req, res) => {
  try {
    const { plan, limit = 1, notes } = req.body;
    if (!['Plus', 'Pro'].includes(plan)) return res.status(400).json({ error: 'Invalid plan.' });

    const generated = [];
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const localLicenses = readDataFile('license_keys.json', []);

    for (let i = 0; i < limit; i++) {
      const randHex = () => Math.random().toString(16).substring(2, 6).toUpperCase();
      const key = `AYNX-${plan.toUpperCase()}-${randHex()}-${randHex()}`;
      
      const licObj = {
        key,
        plan,
        expires_at: expiresAt,
        notes: notes || null,
        activated_by: null,
        activated_at: null,
        created_at: new Date().toISOString()
      };

      try {
        if (supabase) {
          await supabase.from('license_keys').insert(licObj);
        }
      } catch (dbErr) {
        console.warn('[Supabase Fallback] Insert license key failed:', dbErr.message);
      }

      localLicenses.unshift(licObj);
      generated.push(key);
    }

    writeDataFile('license_keys.json', localLicenses);
    logAudit(req.adminUser, `Generated ${limit} license key(s) (${plan})`, notes || 'Standard Generation', req);
    res.json({ success: true, key: generated[0], keys: generated, plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /feature-flags/toggle — Toggle Feature slider
router.post('/feature-flags/toggle', requireAdminAuth, requireRole(['Super Admin']), (req, res) => {
  const { flag, value } = req.body; // value is now plan string like "Free", "Plus", "Pro", "Disabled"
  const flags = readDataFile('feature_flags.json', {});
  flags[flag] = value;
  writeDataFile('feature_flags.json', flags);

  logAudit(req.adminUser, `Changed feature plan mapping of "${flag}" to ${value}`, 'Global Features', req);
  res.json({ success: true, flags });
});

// POST /ticket/reply — Support replies
router.post('/ticket/reply', requireAdminAuth, requireRole(['Super Admin', 'Manager']), (req, res) => {
  const { ticketId, replyText, status } = req.body;
  const tickets = readDataFile('support_tickets.json', []);
  const ticket = tickets.find(t => t.id === ticketId);
  
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  ticket.messages.push({
    sender: 'admin',
    text: replyText,
    time: new Date().toISOString()
  });

  if (status) ticket.status = status;
  ticket.assignee = req.adminUser.username;
  writeDataFile('support_tickets.json', tickets);

  logAudit(req.adminUser, `Replied to ticket ${ticketId}`, `Status changed to ${ticket.status}`, req);
  res.json({ success: true, ticket });
});

// POST /ticket/update-status — Update support ticket status
router.post('/ticket/update-status', requireAdminAuth, requireRole(['Super Admin', 'Manager']), (req, res) => {
  const { ticketId, status, priority, label, assignee } = req.body;
  const tickets = readDataFile('support_tickets.json', []);
  const ticket = tickets.find(t => t.id === ticketId);
  
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  if (status) ticket.status = status;
  if (priority) ticket.priority = priority;
  if (label) ticket.label = label;
  if (assignee) ticket.assignee = assignee;

  writeDataFile('support_tickets.json', tickets);
  logAudit(req.adminUser, `Updated ticket attributes on ${ticketId}`, `Status: ${ticket.status}`, req);
  res.json({ success: true, ticket });
});

// POST /backup/create — Export system tables backup
router.post('/backup/create', requireAdminAuth, requireRole(['Super Admin']), (req, res) => {
  const backupId = `BKP-${Date.now()}`;
  const files = ['users.json', 'subscriptions.json', 'license_keys.json', 'telemetry.json', 'feature_flags.json', 'support_tickets.json', 'devices.json', 'audit_logs.json', 'admins.json', 'announcements.json'];
  const data = {};

  files.forEach(f => {
    data[f] = readDataFile(f, null);
  });

  const backupDir = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  fs.writeFileSync(path.join(backupDir, `${backupId}.json`), JSON.stringify(data, null, 2));

  logAudit(req.adminUser, 'Created Database System Backup', `Backup ID: ${backupId}`, req);
  res.json({ success: true, backupId });
});

// POST /backup/restore — Restore database system backup
router.post('/backup/restore', requireAdminAuth, requireRole(['Super Admin']), (req, res) => {
  const { backupId } = req.body;
  const backupFile = path.join(DATA_DIR, 'backups', `${backupId}.json`);

  if (!fs.existsSync(backupFile)) {
    return res.status(404).json({ error: 'Backup file not found.' });
  }

  const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  Object.keys(data).forEach(filename => {
    if (data[filename] !== null) {
      writeDataFile(filename, data[filename]);
    }
  });

  logAudit(req.adminUser, 'Restored Database System Backup', `Backup ID: ${backupId}`, req);
  res.json({ success: true, message: 'Backup restored successfully.' });
});

// GET /backups — Get back list
router.get('/backups', requireAdminAuth, requireRole(['Super Admin']), (req, res) => {
  const backupDir = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(backupDir)) return res.json({ backups: [] });
  
  const files = fs.readdirSync(backupDir);
  const backups = files.map(f => {
    const stats = fs.statSync(path.join(backupDir, f));
    return {
      backupId: f.replace('.json', ''),
      size: `${(stats.size / 1024).toFixed(1)} KB`,
      created_at: stats.mtime.toISOString()
    };
  });

  res.json({ backups });
});

// POST /announcement — Create global notice
router.post('/announcement', requireAdminAuth, requireRole(['Super Admin', 'Manager']), async (req, res) => {
  try {
    const { title, body, type, active } = req.body;
    const annObj = {
      id: `ANN-${Date.now()}`,
      title,
      body,
      type: type || 'info',
      active: active !== false,
      created_at: new Date().toISOString()
    };

    try {
      if (supabase) {
        await supabase.from('announcements').insert(annObj);
      }
    } catch (err) {
      console.warn('[Supabase Fallback] Insert announcement failed:', err.message);
    }

    const localAnns = readDataFile('announcements.json', []);
    localAnns.unshift(annObj);
    writeDataFile('announcements.json', localAnns);

    logAudit(req.adminUser, 'Published Announcement', title, req);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /send-notification — Remote notification triggers
router.post('/send-notification', requireAdminAuth, requireRole(['Super Admin', 'Manager']), (req, res) => {
  const { target, title, text, image, link } = req.body; // target: everyone, Free, Plus, Pro, user:id, device:id
  const notifications = readDataFile('remote_notifications.json', []);
  
  notifications.unshift({
    id: `NTF-${Date.now()}`,
    target,
    title,
    text,
    image: image || null,
    link: link || null,
    created_at: new Date().toISOString()
  });

  writeDataFile('remote_notifications.json', notifications.slice(0, 100)); // cap at 100

  logAudit(req.adminUser, 'Sent Remote Notification', title, req);
  res.json({ success: true });
});

// POST /publish-version — Stable/Beta Release Rollouts
router.post('/publish-version', requireAdminAuth, requireRole(['Super Admin', 'Manager']), async (req, res) => {
  try {
    const { version, downloadUrl, changelog, channel = 'Stable' } = req.body;
    try {
      if (supabase) {
        await supabase.from('app_versions').update({ is_latest: false }).eq('is_latest', true);
        await supabase.from('app_versions').insert({ version, download_url: downloadUrl, changelog, is_latest: true, metadata: { channel } });
      }
    } catch (dbErr) {
      console.warn('[Supabase Fallback] Publish version failed:', dbErr.message);
    }
    
    // Save locally
    const settings = readDataFile('settings.json', {});
    settings.latestVersion = version;
    settings.downloadUrl = downloadUrl;
    settings.changelog = changelog;
    writeDataFile('settings.json', settings);

    // Save to versions list locally
    const localVersions = readDataFile('app_versions.json', []);
    localVersions.forEach(v => v.is_latest = false);
    localVersions.unshift({
      version,
      download_url: downloadUrl,
      changelog,
      is_latest: true,
      published_at: new Date().toISOString(),
      metadata: { channel }
    });
    writeDataFile('app_versions.json', localVersions);

    logAudit(req.adminUser, `Published App Release version ${version} (${channel})`, `Installer URL: ${downloadUrl}`, req);
    res.json({ success: true, version, downloadUrl, changelog });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
