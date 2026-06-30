const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');

// GET /version/check (legacy: /api/version/check)
router.get('/check', async (req, res) => {
  try {
    if (supabase) {
      const { data } = await supabase
        .from('app_versions')
        .select('*')
        .eq('is_latest', true)
        .single();

      if (data) {
        return res.json({
          latestVersion: data.version,
          downloadUrl: data.download_url,
          changelog: data.changelog,
          publishedAt: data.published_at
        });
      }
    }

    // Fallback
    res.json({ latestVersion: '2.5.1', downloadUrl: '', changelog: '' });
  } catch (err) {
    res.json({ latestVersion: '2.5.1', downloadUrl: '', changelog: '' });
  }
});

// POST /version/set (legacy: /api/version/set) — admin only
router.post('/set', async (req, res) => {
  const adminSecret = req.headers['x-admin-secret'] || req.body.adminSecret;
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  try {
    const { latestVersion, downloadUrl, changelog } = req.body;

    if (supabase) {
      // Clear previous latest
      await supabase.from('app_versions').update({ is_latest: false }).eq('is_latest', true);

      // Insert new version
      await supabase.from('app_versions').insert({
        version: latestVersion,
        download_url: downloadUrl,
        changelog,
        is_latest: true
      });
    }

    res.json({ success: true, latestVersion, downloadUrl, changelog });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
