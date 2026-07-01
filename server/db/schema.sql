-- AYNX v3.0 Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users Table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_id       TEXT UNIQUE,
  email           TEXT UNIQUE NOT NULL,
  name            TEXT,
  avatar_url      TEXT,
  plan            TEXT NOT NULL DEFAULT 'Free' CHECK (plan IN ('Free', 'Plus', 'Pro')),
  trial_used      BOOLEAN NOT NULL DEFAULT FALSE,
  trial_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Subscriptions Table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                TEXT NOT NULL CHECK (plan IN ('Free', 'Plus', 'Pro')),
  billing_period      TEXT CHECK (billing_period IN ('monthly', 'yearly')),
  starts_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ,
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature  TEXT,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  amount_paise        INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── License Keys Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS license_keys (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key             TEXT UNIQUE NOT NULL,
  plan            TEXT NOT NULL CHECK (plan IN ('Plus', 'Pro')),
  activated_by    UUID REFERENCES users(id),
  activated_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes           TEXT
);

-- ─── User Settings Sync Table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  settings    JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Telemetry Table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telemetry (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  machine_id  TEXT,
  event       TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── App Versions Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_versions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version       TEXT NOT NULL,
  download_url  TEXT NOT NULL,
  changelog     TEXT,
  is_latest     BOOLEAN NOT NULL DEFAULT FALSE,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Announcements Table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'promo')),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Seed: Initial version ────────────────────────────────────────────────────
INSERT INTO app_versions (version, download_url, changelog, is_latest)
VALUES (
  '2.6.2',
  'https://drive.google.com/file/d/1-uk8TGzGYUnpfCSpC9wwAhtKA_IP4azi/view?usp=sharing',
  'v2.6.2 - Added close tray dialog option prompt, fixed spawn EBUSY updater bugs, single instance process lock',
  true
)
ON CONFLICT DO NOTHING;

-- ─── Disable RLS so backend service queries are never blocked ─────────────────
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE license_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;

-- ─── Seed: Initial License Keys ───────────────────────────────────────────────
INSERT INTO license_keys (key, plan, notes)
VALUES 
  ('AYNX-PLUS-PLAN-2026', 'Plus', 'Default VIP Plus Plan'),
  ('AYNX-PRO-PLAN-2026', 'Pro', 'Default VIP Pro Plan'),
  ('AYNX-PLUS-VIP-0001', 'Plus', 'VIP 1'),
  ('AYNX-PRO-VIP-0001', 'Pro', 'VIP 1')
ON CONFLICT DO NOTHING;

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_key ON license_keys(key);
CREATE INDEX IF NOT EXISTS idx_telemetry_user_id ON telemetry(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON telemetry(created_at);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
