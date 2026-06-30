require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
    'app://.',
    'file://'
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(passport.initialize());

// ─── Passport Google OAuth ────────────────────────────────────────────────────
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { supabase } = require('./db/supabase');
const { signToken } = require('./middleware/auth');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
  proxy: true
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    const googleId = profile.id;
    const name = profile.displayName;
    const avatar = profile.photos?.[0]?.value;

    if (!email) return done(new Error('No email from Google'), null);

    // Upsert user
    let { data: user, error } = await supabase
      .from('users')
      .upsert({
        google_id: googleId,
        email,
        name,
        avatar_url: avatar,
        updated_at: new Date().toISOString()
      }, { onConflict: 'google_id', returning: 'representation' })
      .select()
      .single();

    if (error) {
      // Try by email
      const { data: existingUser, error: fetchErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (fetchErr || !existingUser) {
        return done(new Error('Failed to create user: ' + (error.message || fetchErr?.message)), null);
      }

      // Update google_id if missing
      if (!existingUser.google_id) {
        await supabase.from('users').update({ google_id: googleId, avatar_url: avatar, name }).eq('id', existingUser.id);
      }
      user = existingUser;
    }

    // Auto-activate 30-day Plus trial for new users
    if (!user.trial_used) {
      const trialExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('users').update({
        plan: 'Plus',
        trial_used: true,
        trial_expires_at: trialExpiry,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);

      // Create subscription record
      await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan: 'Plus',
        billing_period: null,
        starts_at: new Date().toISOString(),
        expires_at: trialExpiry,
        status: 'active',
        amount_paise: 0
      });

      user.plan = 'Plus';
      user.trial_used = true;
      user.trial_expires_at = trialExpiry;
      user.isTrial = true;
    } else {
      // Check if trial/subscription expired
      if (user.plan !== 'Free' && user.trial_expires_at) {
        const now = new Date();
        const expiry = new Date(user.trial_expires_at);
        if (now > expiry) {
          await supabase.from('users').update({
            plan: 'Free',
            updated_at: new Date().toISOString()
          }).eq('id', user.id);
          user.plan = 'Free';
        }
      }
      user.isTrial = false;
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth',         require('./routes/auth'));
app.use('/user',         require('./routes/user'));
app.use('/subscription', require('./routes/subscription'));
app.use('/license',      require('./routes/license'));
app.use('/payment',      require('./routes/payment'));
app.use('/version',      require('./routes/version'));
app.use('/telemetry',    require('./routes/telemetry'));
app.use('/admin',        require('./routes/admin'));

// ─── Legacy compatibility routes (keep old clients working) ───────────────────
app.use('/api/license',   require('./routes/license'));
app.use('/api/telemetry', require('./routes/telemetry'));
app.use('/api/version',   require('./routes/version'));
app.use('/api/admin',     require('./routes/admin'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0', timestamp: new Date().toISOString() });
});

// ─── Static Uploads serving ───────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ─── Admin Portal Static Files ────────────────────────────────────────────────
app.use('/admin-portal', express.static(path.join(__dirname, 'public')));
app.get('/admin-portal*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
// Legacy admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[AYNX Server Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[AYNX Server] v3.0.0 running at http://localhost:${PORT}`);
  console.log(`[AYNX Server] Admin Portal: http://localhost:${PORT}/admin`);
  console.log(`[AYNX Server] Google OAuth: http://localhost:${PORT}/auth/google`);
  console.log(`[AYNX Server] Health Check: http://localhost:${PORT}/health`);
});

module.exports = app;
