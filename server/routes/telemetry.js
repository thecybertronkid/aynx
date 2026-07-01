const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { optionalAuth } = require('../middleware/auth');

// POST /telemetry/heartbeat (legacy: /api/telemetry/heartbeat)
router.post('/heartbeat', optionalAuth, async (req, res) => {
  try {
    const { machineId, displayName, plan, activeDownloads, statusText } = req.body;
    const userId = req.user?.id;

    if (supabase && userId) {
      // Log heartbeat
      await supabase.from('telemetry').insert({
        user_id: userId,
        machine_id: machineId,
        event: 'heartbeat',
        metadata: { activeDownloads: activeDownloads || 0, statusText: statusText || 'Idle' }
      });

      // Get fresh plan from DB
      const { data: user } = await supabase.from('users').select('plan, trial_expires_at, name').eq('id', userId).single();
      if (user) {
        // Check expiry
        if (user.plan !== 'Free' && user.trial_expires_at && new Date() > new Date(user.trial_expires_at)) {
          await supabase.from('users').update({ plan: 'Free' }).eq('id', userId);
          user.plan = 'Free';
        }
        return res.json({ success: true, plan: user.plan, expiresAt: user.trial_expires_at });
      }
    }

    res.json({ success: true, plan: plan || 'Free' });
  } catch (err) {
    res.json({ success: true, plan: 'Free' });
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
