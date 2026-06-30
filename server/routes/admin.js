const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const { supabase } = require('../db/supabase');
const path = require('path');

// Serve admin portal HTML
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// GET /admin/dashboard — full admin data
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    if (!supabase) return res.json({ users: [], subscriptions: [], licenses: [], telemetry: [], versions: [] });

    const [users, subscriptions, licenses, telemetry, versions, announcements] = await Promise.all([
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('license_keys').select('*').order('created_at', { ascending: false }),
      supabase.from('telemetry').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('app_versions').select('*').order('published_at', { ascending: false }),
      supabase.from('announcements').select('*').order('created_at', { ascending: false })
    ]);

    // Compute stats
    const now = new Date();
    const activeUsers = users.data?.filter(u => {
      const lastSeen = u.updated_at ? new Date(u.updated_at) : null;
      return lastSeen && (now - lastSeen) < 5 * 60 * 1000; // Active in last 5 min
    }).length || 0;

    const totalDownloads = telemetry.data?.filter(t => t.event === 'download').length || 0;
    const plusUsers = users.data?.filter(u => u.plan === 'Plus').length || 0;
    const proUsers = users.data?.filter(u => u.plan === 'Pro').length || 0;

    res.json({
      users: users.data || [],
      subscriptions: subscriptions.data || [],
      licenses: licenses.data || [],
      telemetry: telemetry.data || [],
      versions: versions.data || [],
      announcements: announcements.data || [],
      stats: { activeUsers, totalDownloads, plusUsers, proUsers, totalUsers: users.data?.length || 0 }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/update-user-plan
router.post('/update-user-plan', requireAdmin, async (req, res) => {
  try {
    const { userId, plan } = req.body;
    if (!['Free', 'Plus', 'Pro'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan.' });
    }
    if (!supabase) return res.json({ success: true });

    const expiresAt = plan === 'Free'
      ? new Date(Date.now() - 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

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

    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/generate-key
router.post('/generate-key', requireAdmin, async (req, res) => {
  try {
    const { plan, notes } = req.body;
    if (!['Plus', 'Pro'].includes(plan)) return res.status(400).json({ error: 'Invalid plan.' });
    if (!supabase) return res.json({ success: true, key: `AYNX-${plan.toUpperCase()}-TEST-0001` });

    const randHex = () => Math.random().toString(16).substring(2, 6).toUpperCase();
    const key = `AYNX-${plan.toUpperCase()}-${randHex()}-${randHex()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('license_keys').insert({ key, plan, expires_at: expiresAt, notes: notes || null });
    if (error) {
      console.error('[Admin Generate Key Error]', error);
      return res.status(500).json({ error: 'Database Insert Failed: ' + error.message });
    }
    res.json({ success: true, key, plan, expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/publish-version
router.post('/publish-version', requireAdmin, async (req, res) => {
  try {
    const { version, downloadUrl, changelog } = req.body;
    if (!supabase) return res.json({ success: true });

    await supabase.from('app_versions').update({ is_latest: false }).eq('is_latest', true);
    await supabase.from('app_versions').insert({ version, download_url: downloadUrl, changelog, is_latest: true });

    res.json({ success: true, version, downloadUrl, changelog });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/announcement
router.post('/announcement', requireAdmin, async (req, res) => {
  try {
    const { title, body, type, active } = req.body;
    if (!supabase) return res.json({ success: true });
    await supabase.from('announcements').insert({ title, body, type: type || 'info', active: active !== false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy compatibility
router.get('/dashboard', requireAdmin, async (req, res) => {
  // handled above
});

module.exports = router;
