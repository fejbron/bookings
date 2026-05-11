-- ─────────────────────────────────────────────────────────────────────────────
-- BookSlot — canonical schema
--
-- Idempotent. Run on a fresh Supabase project, or re-run on an existing one.
-- Replaces:
--   supabase-multitenant.sql, team-members.sql, presentation-scores.sql,
--   supabase-rls-fix.sql, backfill-user-ids.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Tables ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lecturer_profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  username     text,
  email        text NOT NULL,
  name         text NOT NULL,
  title        text,
  description  text,
  class_group  text,
  account_type text NOT NULL DEFAULT 'professional',  -- 'lecturer' | 'professional'
  is_public    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendar_types (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  color           text NOT NULL DEFAULT 'blue',
  description     text,
  is_presentation boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS slots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date          date NOT NULL,
  time          time NOT NULL,
  duration      int  NOT NULL,
  calendar_type text NOT NULL DEFAULT 'General',
  class_group   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS slot_configs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date       date NOT NULL,
  end_date         date NOT NULL,
  start_time       time NOT NULL,
  end_time         time NOT NULL,
  duration         int  NOT NULL,
  break_between    int  NOT NULL DEFAULT 0,
  exclude_weekends boolean NOT NULL DEFAULT true,
  calendar_type    text NOT NULL DEFAULT 'General',
  class_group      text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id             uuid REFERENCES slots(id) ON DELETE SET NULL,
  host_user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  date                date NOT NULL,
  time                time NOT NULL,
  duration            int  NOT NULL,
  student_name        text NOT NULL,
  student_email       text NOT NULL,
  presentation_topic  text NOT NULL,
  notes               text NOT NULL DEFAULT '',
  status              text NOT NULL DEFAULT 'pending',
  admin_comment       text NOT NULL DEFAULT '',
  cancellation_reason text NOT NULL DEFAULT '',
  students            jsonb NOT NULL DEFAULT '[]',
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_settings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  welcome_message    text NOT NULL DEFAULT '',
  allow_self_cancel  boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_email   text NOT NULL,
  member_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role           text NOT NULL DEFAULT 'manager',
  status         text NOT NULL DEFAULT 'active',
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(host_user_id, member_email)
);

-- Backfill columns that may be missing on legacy installations ─────────────────

ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS username     text;
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS title        text;
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS description  text;
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS class_group  text;
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'professional';
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS is_public    boolean NOT NULL DEFAULT true;

ALTER TABLE calendar_types ADD COLUMN IF NOT EXISTS user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE calendar_types ADD COLUMN IF NOT EXISTS is_presentation boolean NOT NULL DEFAULT false;

ALTER TABLE slots          ADD COLUMN IF NOT EXISTS user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE slot_configs   ADD COLUMN IF NOT EXISTS user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE bookings       ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE bookings       ADD COLUMN IF NOT EXISTS students     jsonb NOT NULL DEFAULT '[]';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop legacy single-tenant unique constraints
ALTER TABLE calendar_types DROP CONSTRAINT IF EXISTS calendar_types_name_key;

-- Indices ──────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_lp_username   ON lecturer_profiles(username) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_lp_user_id    ON lecturer_profiles(user_id)  WHERE user_id  IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ct_name_user  ON calendar_types(name, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_as_user_id    ON admin_settings(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX        IF NOT EXISTS idx_slots_user_date    ON slots(user_id, date);
CREATE INDEX        IF NOT EXISTS idx_bookings_slot      ON bookings(slot_id);
CREATE INDEX        IF NOT EXISTS idx_bookings_host      ON bookings(host_user_id);
CREATE INDEX        IF NOT EXISTS idx_bookings_email     ON bookings(student_email);
CREATE INDEX        IF NOT EXISTS idx_tm_member_email    ON team_members(member_email);
CREATE INDEX        IF NOT EXISTS idx_tm_host_user       ON team_members(host_user_id);

-- RLS ──────────────────────────────────────────────────────────────────────────

-- lecturer_profiles
ALTER TABLE lecturer_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lp_read"   ON lecturer_profiles;
DROP POLICY IF EXISTS "lp_insert" ON lecturer_profiles;
DROP POLICY IF EXISTS "lp_update" ON lecturer_profiles;
DROP POLICY IF EXISTS "lp_delete" ON lecturer_profiles;
CREATE POLICY "lp_read" ON lecturer_profiles FOR SELECT USING (
  is_public
  OR auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members
    WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);
CREATE POLICY "lp_insert" ON lecturer_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Allow claiming orphan profiles (user_id IS NULL = legacy data)
CREATE POLICY "lp_update" ON lecturer_profiles FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "lp_delete" ON lecturer_profiles FOR DELETE USING (auth.uid() = user_id);

-- slots: public read for the booking pages; owner manages
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "slots_read"   ON slots;
DROP POLICY IF EXISTS "slots_insert" ON slots;
DROP POLICY IF EXISTS "slots_update" ON slots;
DROP POLICY IF EXISTS "slots_delete" ON slots;
CREATE POLICY "slots_read"   ON slots FOR SELECT USING (true);
CREATE POLICY "slots_insert" ON slots FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);
CREATE POLICY "slots_update" ON slots FOR UPDATE USING (
  auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);
CREATE POLICY "slots_delete" ON slots FOR DELETE USING (
  auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);

-- slot_configs: owner + team members
ALTER TABLE slot_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sc_read"   ON slot_configs;
DROP POLICY IF EXISTS "sc_insert" ON slot_configs;
DROP POLICY IF EXISTS "sc_update" ON slot_configs;
DROP POLICY IF EXISTS "sc_delete" ON slot_configs;
CREATE POLICY "sc_read"   ON slot_configs FOR SELECT USING (
  auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);
CREATE POLICY "sc_insert" ON slot_configs FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);
CREATE POLICY "sc_update" ON slot_configs FOR UPDATE USING (
  auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);
CREATE POLICY "sc_delete" ON slot_configs FOR DELETE USING (
  auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);

-- calendar_types: public read; owner + team write
ALTER TABLE calendar_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ct_read"   ON calendar_types;
DROP POLICY IF EXISTS "ct_insert" ON calendar_types;
DROP POLICY IF EXISTS "ct_update" ON calendar_types;
DROP POLICY IF EXISTS "ct_delete" ON calendar_types;
CREATE POLICY "ct_read"   ON calendar_types FOR SELECT USING (true);
CREATE POLICY "ct_insert" ON calendar_types FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);
CREATE POLICY "ct_update" ON calendar_types FOR UPDATE USING (
  auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);
CREATE POLICY "ct_delete" ON calendar_types FOR DELETE USING (
  auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);

-- bookings: anyone can create (anon students); host + team can manage
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bk_read"   ON bookings;
DROP POLICY IF EXISTS "bk_insert" ON bookings;
DROP POLICY IF EXISTS "bk_update" ON bookings;
CREATE POLICY "bk_read"   ON bookings FOR SELECT USING (true);
CREATE POLICY "bk_insert" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bk_update" ON bookings FOR UPDATE USING (true);

-- admin_settings: owner + team
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "as_read"   ON admin_settings;
DROP POLICY IF EXISTS "as_insert" ON admin_settings;
DROP POLICY IF EXISTS "as_update" ON admin_settings;
CREATE POLICY "as_read"   ON admin_settings FOR SELECT USING (
  user_id IS NULL
  OR auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);
CREATE POLICY "as_insert" ON admin_settings FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);
CREATE POLICY "as_update" ON admin_settings FOR UPDATE USING (
  auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);

-- team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_host_select"   ON team_members;
DROP POLICY IF EXISTS "tm_host_insert"   ON team_members;
DROP POLICY IF EXISTS "tm_host_delete"   ON team_members;
DROP POLICY IF EXISTS "tm_member_select" ON team_members;
DROP POLICY IF EXISTS "tm_member_update" ON team_members;
CREATE POLICY "tm_host_select"   ON team_members FOR SELECT USING (auth.uid() = host_user_id);
CREATE POLICY "tm_host_insert"   ON team_members FOR INSERT WITH CHECK (auth.uid() = host_user_id);
CREATE POLICY "tm_host_delete"   ON team_members FOR DELETE USING (auth.uid() = host_user_id);
CREATE POLICY "tm_member_select" ON team_members FOR SELECT USING (auth.jwt()->>'email' = member_email);
CREATE POLICY "tm_member_update" ON team_members FOR UPDATE USING (auth.uid() = host_user_id OR auth.jwt()->>'email' = member_email);

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper function: claim_orphan_data()
-- Run after first profile setup to assign legacy single-tenant rows to a user.
-- Safe to call multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION claim_orphan_data()
RETURNS TABLE (slots int, slot_configs int, calendar_types int, admin_settings int, bookings int)
LANGUAGE plpgsql AS $$
DECLARE
  target_user_id uuid;
  s int := 0; c int := 0; t int := 0; a int := 0; b int := 0;
BEGIN
  SELECT user_id INTO target_user_id
  FROM lecturer_profiles
  WHERE user_id IS NOT NULL
  ORDER BY created_at LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE NOTICE 'No claimed profile yet. Complete setup first.';
    RETURN QUERY SELECT 0, 0, 0, 0, 0;
    RETURN;
  END IF;

  DELETE FROM calendar_types WHERE user_id IS NULL
    AND name IN (SELECT name FROM calendar_types WHERE user_id = target_user_id);
  DELETE FROM admin_settings WHERE user_id IS NULL
    AND EXISTS (SELECT 1 FROM admin_settings WHERE user_id = target_user_id);

  UPDATE slots          SET user_id      = target_user_id WHERE user_id      IS NULL; GET DIAGNOSTICS s = ROW_COUNT;
  UPDATE slot_configs   SET user_id      = target_user_id WHERE user_id      IS NULL; GET DIAGNOSTICS c = ROW_COUNT;
  UPDATE calendar_types SET user_id      = target_user_id WHERE user_id      IS NULL; GET DIAGNOSTICS t = ROW_COUNT;
  UPDATE admin_settings SET user_id      = target_user_id WHERE user_id      IS NULL; GET DIAGNOSTICS a = ROW_COUNT;
  UPDATE bookings       SET host_user_id = target_user_id WHERE host_user_id IS NULL; GET DIAGNOSTICS b = ROW_COUNT;

  RETURN QUERY SELECT s, c, t, a, b;
END $$;
