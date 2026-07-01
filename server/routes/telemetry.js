const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { optionalAuth } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// JSON Helpers
function readJSON(filename, defaultValue = []) {
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

function writeJSON(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error writing ${filename}:`, e);
  }
}

// POST /telemetry/heartbeat (legacy: /api/telemetry/heartbeat)
router.post('/heartbeat', optionalAuth, async (req, res) => {
  try {
    const { 
      machineId, displayName, plan, activeDownloads, statusText,
      cpu, ram, gpu, storage, windowsVersion, ffmpegVersion, deviceName, appVersion
    } = req.body;
    const userId = req.user?.id;

    // 1. Device Registration & Telemetry Update
    if (machineId) {
      const devices = readJSON('devices.json', []);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const country = req.headers['cf-ipcountry'] || 'US'; // Cloudflare country header fallback

      const existingIndex = devices.findIndex(d => d.machineId === machineId);
      const devDetails = {
        machineId,
        userId: userId || null,
        name: deviceName || 'Unknown Device',
        osVersion: windowsVersion || 'Windows',
        appVersion: appVersion || '2.6.2',
        cpu: cpu || 'Unknown CPU',
        ram: ram || '—',
        gpu: gpu || '—',
        storage: storage || '—',
        ffmpegVersion: ffmpegVersion || '—',
        status: activeDownloads > 0 ? 'Downloading' : 'Online',
        lastSeen: new Date().toISOString(),
        ipAddress: ip,
        country
      };

      if (existingIndex >= 0) {
        devices[existingIndex] = { ...devices[existingIndex], ...devDetails };
      } else {
        devices.push(devDetails);
      }
      writeJSON('devices.json', devices);
    }

    // 2. Log heartbeat event in telemetry
    if (supabase && userId) {
      await supabase.from('telemetry').insert({
        user_id: userId,
        machine_id: machineId,
        event: 'heartbeat',
        metadata: { activeDownloads: activeDownloads || 0, statusText: statusText || 'Idle' }
      });
    }

    // 3. Retrieve fresh plan & subscription details
    let currentPlan = plan || 'Free';
    let trialExpiresAt = null;

    if (supabase && userId) {
      const { data: user } = await supabase.from('users').select('plan, trial_expires_at').eq('id', userId).single();
      if (user) {
        // Check expiry
        if (user.plan !== 'Free' && user.trial_expires_at && new Date() > new Date(user.trial_expires_at)) {
          await supabase.from('users').update({ plan: 'Free' }).eq('id', userId);
          user.plan = 'Free';
        }
        currentPlan = user.plan;
        trialExpiresAt = user.trial_expires_at;
      }
    }

    // 4. Load announcements
    let announcements = [];
    try {
      if (supabase) {
        const { data: dbAnnouncements } = await supabase
          .from('announcements')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false });
        if (dbAnnouncements) {
          announcements = dbAnnouncements;
        }
      }
    } catch (e) {
      console.warn('[Supabase Fallback] Heartbeat load announcements failed:', e.message);
    }
    
    // Fallback if announcements empty or query failed
    if (announcements.length === 0) {
      const localAnns = readJSON('announcements.json', []);
      announcements = localAnns.filter(a => a.active);
    }

    // 5. Load feature flags mapping & compute for user plan
    const RANKS = { 'Free': 0, 'Plus': 1, 'Pro': 2 };
    const rawFlags = readJSON('feature_flags.json', {
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
    });

    const userRank = RANKS[currentPlan] || 0;
    const computedFlags = {};
    Object.keys(rawFlags).forEach(flag => {
      const requiredPlan = rawFlags[flag];
      if (requiredPlan === 'Disabled') {
        computedFlags[flag] = false;
      } else {
        const requiredRank = RANKS[requiredPlan] !== undefined ? RANKS[requiredPlan] : 0;
        computedFlags[flag] = userRank >= requiredRank;
      }
    });

    // 6. Check for remote commands queued for this machine
    let commands = [];
    if (machineId) {
      const commandQueue = readJSON('command_queue.json', []);
      const pending = commandQueue.filter(cmd => cmd.machineId === machineId);
      
      if (pending.length > 0) {
        commands = pending.map(c => c.command);
        // Clear consumed commands
        const remaining = commandQueue.filter(cmd => cmd.machineId !== machineId);
        writeJSON('command_queue.json', remaining);
      }
    }

    // 7. Check for remote notifications
    const remoteNotifications = readJSON('remote_notifications.json', []);
    const userNotifications = remoteNotifications.filter(notif => {
      if (notif.target === 'everyone') return true;
      if (notif.target === currentPlan) return true;
      if (notif.target === `user:${userId}`) return true;
      if (notif.target === `device:${machineId}`) return true;
      return false;
    });

    res.json({
      success: true,
      plan: currentPlan,
      expiresAt: trialExpiresAt,
      featureFlags: computedFlags,
      announcements,
      commands,
      notifications: userNotifications
    });
  } catch (err) {
    console.error('[Heartbeat Error]:', err);
    res.json({ success: true, plan: plan || 'Free', featureFlags: {}, announcements: [], commands: [], notifications: [] });
  }
});

// POST /telemetry/report (legacy: /api/telemetry/report)
router.post('/report', optionalAuth, async (req, res) => {
  try {
    const { event, machineId, platform, contentType, title, status, sizeBytes, metadata } = req.body;
    const userId = req.user?.id;

    if (supabase) {
      await supabase.from('telemetry').insert({
        user_id: userId || null,
        machine_id: machineId || null,
        event: event || 'download',
        metadata: metadata || { platform, contentType, title, status, sizeBytes: sizeBytes || 0 }
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.json({ success: true });
  }
});

module.exports = router;
