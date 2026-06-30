const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { signToken, signRefreshToken } = require('../middleware/auth');

// ─── Google OAuth ─────────────────────────────────────────────────────────────
// Step 1: Redirect to Google
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
}));

// Step 2: Google callback → issue JWT → redirect to Electron deep link
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/failure' }),
  (req, res) => {
    const user = req.user;
    const token = signToken(user);
    const refreshToken = signRefreshToken(user);

    // Redirect to Electron via custom protocol
    // aynx://oauth?token=JWT&refresh=REFRESH&name=NAME&email=EMAIL&avatar=AVATAR&plan=PLAN&trial=BOOL&trialExpiry=DATE
    const params = new URLSearchParams({
      token,
      refresh: refreshToken,
      name: user.name || '',
      email: user.email || '',
      avatar: user.avatar_url || '',
      plan: user.plan || 'Free',
      trial: user.isTrial ? 'true' : 'false',
      trialExpiry: user.trial_expires_at || ''
    });

    res.redirect(`aynx://oauth?${params.toString()}`);
  }
);

// Failure route
router.get('/failure', (req, res) => {
  res.redirect('aynx://oauth?error=auth_failed');
});

// ─── Refresh Token ────────────────────────────────────────────────────────────
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required.' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'aynx_dev_secret');
    if (decoded.type !== 'refresh') throw new Error('Invalid token type');

    const { supabase } = require('../db/supabase');
    supabase.from('users').select('*').eq('id', decoded.id).single()
      .then(({ data: user, error }) => {
        if (error || !user) return res.status(401).json({ error: 'User not found.' });
        const newToken = signToken(user);
        res.json({ token: newToken, plan: user.plan });
      });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

// ─── Verify Token (for app startup) ──────────────────────────────────────────
router.post('/verify', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aynx_dev_secret');
    // Also fetch fresh plan from DB
    const { supabase } = require('../db/supabase');
    if (supabase) {
      supabase.from('users').select('plan, trial_expires_at, name, email, avatar_url').eq('id', decoded.id).single()
        .then(({ data: user }) => {
          if (!user) return res.json({ valid: true, ...decoded });
          // Check trial expiry
          if (user.plan !== 'Free' && user.trial_expires_at) {
            if (new Date() > new Date(user.trial_expires_at)) {
              supabase.from('users').update({ plan: 'Free' }).eq('id', decoded.id);
              user.plan = 'Free';
            }
          }
          res.json({ valid: true, id: decoded.id, ...user });
        });
    } else {
      res.json({ valid: true, ...decoded });
    }
  } catch (err) {
    res.status(401).json({ valid: false, error: 'Token invalid or expired.' });
  }
});

module.exports = router;
