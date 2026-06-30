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
    res.json({ latestVersion: '2.5.4', downloadUrl: '', changelog: '' });
  } catch (err) {
    res.json({ latestVersion: '2.5.4', downloadUrl: '', changelog: '' });
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

// Setup Installer File Upload Endpoint
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${base}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 } // 150MB limit
});

router.post('/upload', (req, res, next) => {
  const adminSecret = req.headers['x-admin-secret'] || req.query.secret || req.body.adminSecret;
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}, upload.single('setupFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const serverUrl = `${req.protocol}://${req.get('host')}`;
  const downloadUrl = `${serverUrl}/uploads/${req.file.filename}`;

  res.json({
    success: true,
    fileName: req.file.filename,
    downloadUrl
  });
});

module.exports = router;
