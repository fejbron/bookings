-- BookSlot — Multi-Tenant Migration
-- Run this entire script in your Supabase SQL Editor

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Drop old single-tenant constraints that break multi-tenant
-- ─────────────────────────────────────────────────────────────────────────────

-- calendar_types had a unique constraint on name alone; replace with (name, user_id)
ALTER TABLE calendar_types DROP CONSTRAINT IF EXISTS calendar_types_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ct_name_user ON calendar_types(name, user_id) WHERE user_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Schema changes
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE lecturer_profiles
  ADD COLUMN IF NOT EXISTS user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS username  text,
  ADD COLUMN IF NOT EXISTS title     text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lp_username ON lecturer_profiles(username) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_lp_user_id  ON lecturer_profiles(user_id)  WHERE user_id  IS NOT NULL;

ALTER TABLE slots        ADD COLUMN IF NOT EXISTS user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE slot_configs ADD COLUMN IF NOT EXISTS user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE calendar_types ADD COLUMN IF NOT EXISTS user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE bookings     ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES auth.users(id);
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_as_user_id ON admin_settings(user_id) WHERE user_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

-- lecturer_profiles: public reads is_public rows; owner manages their own
ALTER TABLE lecturer_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read"   ON lecturer_profiles;
DROP POLICY IF EXISTS "public_insert" ON lecturer_profiles;
DROP POLICY IF EXISTS "public_update" ON lecturer_profiles;
DROP POLICY IF EXISTS "public_delete" ON lecturer_profiles;
DROP POLICY IF EXISTS "lp_read"       ON lecturer_profiles;
DROP POLICY IF EXISTS "lp_insert"     ON lecturer_profiles;
DROP POLICY IF EXISTS "lp_update"     ON lecturer_profiles;
DROP POLICY IF EXISTS "lp_delete"     ON lecturer_profiles;
CREATE POLICY "lp_read"   ON lecturer_profiles FOR SELECT USING (is_public OR auth.uid() = user_id);
CREATE POLICY "lp_insert" ON lecturer_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Allow updating rows where user_id IS NULL so existing profiles can be claimed by a new auth user
CREATE POLICY "lp_update" ON lecturer_profiles FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "lp_delete" ON lecturer_profiles FOR DELETE USING (auth.uid() = user_id);

-- slots: public can read (needed for booking pages); owner manages their own
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read"   ON slots;
DROP POLICY IF EXISTS "public_insert" ON slots;
DROP POLICY IF EXISTS "public_update" ON slots;
DROP POLICY IF EXISTS "public_delete" ON slots;
DROP POLICY IF EXISTS "slots_read"    ON slots;
DROP POLICY IF EXISTS "slots_insert"  ON slots;
DROP POLICY IF EXISTS "slots_update"  ON slots;
DROP POLICY IF EXISTS "slots_delete"  ON slots;
CREATE POLICY "slots_read"   ON slots FOR SELECT USING (true);
CREATE POLICY "slots_insert" ON slots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "slots_update" ON slots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "slots_delete" ON slots FOR DELETE USING (auth.uid() = user_id);

-- slot_configs: private — only the owner can see/manage
ALTER TABLE slot_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read"   ON slot_configs;
DROP POLICY IF EXISTS "public_insert" ON slot_configs;
DROP POLICY IF EXISTS "public_update" ON slot_configs;
DROP POLICY IF EXISTS "public_delete" ON slot_configs;
DROP POLICY IF EXISTS "sc_read"       ON slot_configs;
DROP POLICY IF EXISTS "sc_insert"     ON slot_configs;
DROP POLICY IF EXISTS "sc_update"     ON slot_configs;
DROP POLICY IF EXISTS "sc_delete"     ON slot_configs;
CREATE POLICY "sc_read"   ON slot_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sc_insert" ON slot_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sc_update" ON slot_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sc_delete" ON slot_configs FOR DELETE USING (auth.uid() = user_id);

-- calendar_types: public can read (needed for booking pages); owner manages their own
ALTER TABLE calendar_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read"   ON calendar_types;
DROP POLICY IF EXISTS "public_insert" ON calendar_types;
DROP POLICY IF EXISTS "public_update" ON calendar_types;
DROP POLICY IF EXISTS "public_delete" ON calendar_types;
DROP POLICY IF EXISTS "ct_read"       ON calendar_types;
DROP POLICY IF EXISTS "ct_insert"     ON calendar_types;
DROP POLICY IF EXISTS "ct_update"     ON calendar_types;
DROP POLICY IF EXISTS "ct_delete"     ON calendar_types;
CREATE POLICY "ct_read"   ON calendar_types FOR SELECT USING (true);
CREATE POLICY "ct_insert" ON calendar_types FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ct_update" ON calendar_types FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ct_delete" ON calendar_types FOR DELETE USING (auth.uid() = user_id);

-- bookings: public read/insert for student self-service; host can update (confirm/cancel)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read"   ON bookings;
DROP POLICY IF EXISTS "public_insert" ON bookings;
DROP POLICY IF EXISTS "public_update" ON bookings;
DROP POLICY IF EXISTS "bookings_read"   ON bookings;
DROP POLICY IF EXISTS "bookings_insert" ON bookings;
DROP POLICY IF EXISTS "bookings_update" ON bookings;
CREATE POLICY "bookings_read"   ON bookings FOR SELECT USING (true);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_update" ON bookings FOR UPDATE USING (true);

-- admin_settings (now per-user settings)
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read"   ON admin_settings;
DROP POLICY IF EXISTS "public_upsert" ON admin_settings;
DROP POLICY IF EXISTS "public_update" ON admin_settings;
DROP POLICY IF EXISTS "as_read"       ON admin_settings;
DROP POLICY IF EXISTS "as_insert"     ON admin_settings;
DROP POLICY IF EXISTS "as_update"     ON admin_settings;
CREATE POLICY "as_read"   ON admin_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "as_insert" ON admin_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "as_update" ON admin_settings FOR UPDATE USING (auth.uid() = user_id);
