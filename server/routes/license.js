const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { supabase } = require('../db/supabase');
const { signToken } = require('../middleware/auth');

// POST /license/activate (and legacy /api/license/activate)
router.post('/activate', optionalAuth, async (req, res) => {
  try {
    const { key, machineId, email, displayName } = req.body;

    if (!email && !req.user) {
      return res.status(400).json({ error: 'Email or authentication token required.' });
    }

    const userEmail = email || req.user?.email;

    // Handle TRIAL request (new user without license key)
    if (!key || key === 'TRIAL') {
      if (!supabase) {
        return res.json({ success: true, key: 'TRIAL', plan: 'Plus', expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() });
      }

      const { data: user } = await supabase.from('users').select('*').eq('email', userEmail).single();

      if (user) {
        // Check existing trial
        if (user.trial_expires_at && new Date() < new Date(user.trial_expires_at)) {
          return res.json({ success: true, plan: user.plan, expiresAt: user.trial_expires_at });
        }
        if (user.trial_used && (!user.trial_expires_at || new Date() >= new Date(user.trial_expires_at))) {
          return res.status(400).json({ error: 'Your 1-month free trial has expired. Please purchase a plan.' });
        }
      }

      return res.json({ success: true, plan: 'Plus', message: 'Use Google Sign-in to activate your free trial.' });
    }

    // Handle regular license key
    if (!supabase) {
      return res.json({ success: true, key, plan: 'Plus', expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() });
    }

    const { data: license, error: licErr } = await supabase
      .from('license_keys')
      .select('*')
      .eq('key', key)
      .single();

    if (licErr || !license) {
      return res.status(400).json({ error: 'Invalid license key. Please check and try again.' });
    }

    if (license.expires_at && new Date() > new Date(license.expires_at)) {
      return res.status(400).json({ error: 'This license key has expired.' });
    }

    if (license.activated_by && license.activated_by !== req.user?.id) {
      // Check if it's the same email
      const { data: activatedUser } = await supabase.from('users').select('email').eq('id', license.activated_by).single();
      if (activatedUser?.email !== userEmail) {
        return res.status(400).json({ error: 'License key already activated by another account.' });
      }
    }

    // Find or create user
    let userId = req.user?.id;
    if (!userId && userEmail) {
      const { data: user } = await supabase.from('users').select('id').eq('email', userEmail).single();
      userId = user?.id;
    }

    const expiresAt = license.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Activate license
    await supabase.from('license_keys').update({
      activated_by: userId,
      activated_at: new Date().toISOString(),
      expires_at: expiresAt
    }).eq('key', key);

    // Update user plan
    if (userId) {
      await supabase.from('users').update({
        plan: license.plan,
        trial_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }).eq('id', userId);

      // Add subscription record
      await supabase.from('subscriptions').upsert({
        user_id: userId,
        plan: license.plan,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
        status: 'active',
        amount_paise: 0
      });
    }

    // Generate new token if user is authenticated
    let newToken = null;
    if (req.user && userId) {
      const { data: updatedUser } = await supabase.from('users').select('*').eq('id', userId).single();
      if (updatedUser) newToken = signToken(updatedUser);
    }

    res.json({
      success: true,
      key: license.key,
      plan: license.plan,
      expiresAt,
      token: newToken
    });
  } catch (err) {
    console.error('[License] Activate error:', err);
    res.status(500).json({ error: err.message || 'License activation failed.' });
  }
});

// POST /license/verify
router.post('/verify', optionalAuth, async (req, res) => {
  try {
    const { key, email } = req.body;
    if (!supabase) return res.json({ valid: true, plan: 'Plus' });

    const userEmail = email || req.user?.email;
    if (!userEmail && !key) return res.status(400).json({ error: 'Key or email required.' });

    if (key && key !== 'TRIAL') {
      const { data: license } = await supabase.from('license_keys').select('*').eq('key', key).single();
      if (!license) return res.status(404).json({ error: 'License key not found.' });
      if (license.expires_at && new Date() > new Date(license.expires_at)) {
        return res.json({ valid: false, expired: true, plan: 'Free', error: 'License expired.' });
      }
      return res.json({ valid: true, plan: license.plan, expiresAt: license.expires_at });
    }

    // Verify by email
    if (userEmail) {
      const { data: user } = await supabase.from('users').select('plan, trial_expires_at').eq('email', userEmail).single();
      if (!user) return res.json({ valid: false, plan: 'Free' });
      if (user.plan !== 'Free' && user.trial_expires_at && new Date() > new Date(user.trial_expires_at)) {
        return res.json({ valid: false, expired: true, plan: 'Free' });
      }
      return res.json({ valid: true, plan: user.plan, expiresAt: user.trial_expires_at });
    }

    res.json({ valid: false, plan: 'Free' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
