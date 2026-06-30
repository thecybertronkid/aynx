const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { supabase } = require('../db/supabase');

// GET /user/profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    if (!supabase) return res.json({ id: req.user.id, ...req.user });

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, avatar_url, plan, trial_used, trial_expires_at, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found.' });

    // Check trial expiry
    if (user.plan !== 'Free' && user.trial_expires_at) {
      if (new Date() > new Date(user.trial_expires_at)) {
        await supabase.from('users').update({ plan: 'Free' }).eq('id', user.id);
        user.plan = 'Free';
      }
    }

    // Get active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({ ...user, subscription: subscription || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /user/settings — sync settings to cloud
router.put('/settings', requireAuth, async (req, res) => {
  try {
    if (!supabase) return res.json({ success: true });

    const { settings } = req.body;
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: req.user.id,
        settings: settings || {},
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /user/settings — fetch cloud settings
router.get('/settings', requireAuth, async (req, res) => {
  try {
    if (!supabase) return res.json({ settings: {} });

    const { data, error } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', req.user.id)
      .single();

    res.json({ settings: data?.settings || {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
