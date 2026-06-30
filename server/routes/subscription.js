const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { supabase } = require('../db/supabase');

// GET /subscription/status
router.get('/status', requireAuth, async (req, res) => {
  try {
    if (!supabase) return res.json({ plan: req.user.plan || 'Free', status: 'active' });

    const { data: user } = await supabase
      .from('users')
      .select('plan, trial_used, trial_expires_at')
      .eq('id', req.user.id)
      .single();

    if (!user) return res.json({ plan: 'Free', status: 'not_found' });

    // Auto-expire check
    if (user.plan !== 'Free' && user.trial_expires_at && new Date() > new Date(user.trial_expires_at)) {
      await supabase.from('users').update({ plan: 'Free' }).eq('id', req.user.id);
      user.plan = 'Free';
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Days remaining
    let daysRemaining = null;
    if (user.trial_expires_at && user.plan !== 'Free') {
      const msRemaining = new Date(user.trial_expires_at) - new Date();
      daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    }

    res.json({
      plan: user.plan,
      trialUsed: user.trial_used,
      trialExpiresAt: user.trial_expires_at,
      daysRemaining,
      subscription: subscription || null,
      status: user.plan === 'Free' ? (user.trial_used ? 'expired' : 'free') : 'active'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
