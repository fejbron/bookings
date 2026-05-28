-- ─────────────────────────────────────────────────────────────────────────────
-- BookSlot — canonical schema
--
-- Idempotent. Run on a fresh Supabase project, or re-run on an existing one.
-- Replaces:
--   supabase-multitenant.sql, team-members.sql, presentation-scores.sql,
--   supabase-rls-fix.sql, backfill-user-ids.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Required extensions ──────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- Tables ───────────────────────────────────────────────────────────────────────

-- Lecturers (academic accounts). Was previously a unified `lecturer_profiles`
-- table with an `account_type` discriminator; professional accounts now live
-- in `professional_profiles` (below).
CREATE TABLE IF NOT EXISTS lecturer_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  username        text,
  email           text NOT NULL,
  name            text NOT NULL,
  title           text,
  description     text,
  class_group     text,
  is_public       boolean NOT NULL DEFAULT true,
  -- lecturer-specific
  institution     text,
  department      text,
  office_location text,
  office_hours    text,
  courses         text[] NOT NULL DEFAULT '{}',
  academic_rank   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Professionals (non-academic: consultants, designers, advisors, etc.)
CREATE TABLE IF NOT EXISTS professional_profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  username     text,
  email        text NOT NULL,
  name         text NOT NULL,
  title        text,
  description  text,
  is_public    boolean NOT NULL DEFAULT true,
  -- professional-specific
  company      text,
  industry     text,
  job_title    text,
  services     text,
  location     text,
  website      text,
  linkedin_url text,
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

ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS username        text;
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS title           text;
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS description     text;
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS class_group     text;
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS is_public       boolean NOT NULL DEFAULT true;
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS institution     text;
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS department      text;
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS office_location text;
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS office_hours    text;
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS courses         text[] NOT NULL DEFAULT '{}';
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS academic_rank   text;

-- One-time migration: move professional accounts out of lecturer_profiles
-- into their own table, then drop the now-redundant account_type column.
-- Guarded on column existence so re-runs are safe no-ops.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lecturer_profiles'
      AND column_name = 'account_type'
  ) THEN
    INSERT INTO professional_profiles
      (id, user_id, username, email, name, title, description, is_public, created_at)
    SELECT id, user_id, username, email, name, title, description, is_public, created_at
    FROM lecturer_profiles
    WHERE account_type = 'professional'
    ON CONFLICT (id) DO NOTHING;

    DELETE FROM lecturer_profiles WHERE account_type = 'professional';
    ALTER TABLE lecturer_profiles DROP COLUMN account_type;
  END IF;
END $$;

ALTER TABLE calendar_types ADD COLUMN IF NOT EXISTS user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE calendar_types ADD COLUMN IF NOT EXISTS is_presentation boolean NOT NULL DEFAULT false;

ALTER TABLE slots          ADD COLUMN IF NOT EXISTS user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE slot_configs   ADD COLUMN IF NOT EXISTS user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE bookings       ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE bookings       ADD COLUMN IF NOT EXISTS students     jsonb NOT NULL DEFAULT '[]';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop legacy single-tenant unique constraints
ALTER TABLE calendar_types DROP CONSTRAINT IF EXISTS calendar_types_name_key;

-- Ensure id columns have a default on legacy tables (older migrations omitted it)
ALTER TABLE lecturer_profiles     ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE professional_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE calendar_types        ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE slots                 ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE slot_configs          ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE bookings              ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE admin_settings        ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE team_members          ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Indices ──────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_lp_username ON lecturer_profiles(username)     WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pp_username ON professional_profiles(username) WHERE username IS NOT NULL;

-- user_id needs a proper UNIQUE *constraint* (not a partial index) so that
-- Supabase's upsert(..., { onConflict: 'user_id' }) — which sends
-- `ON CONFLICT (user_id)` with no predicate — can resolve a target.
-- A constraint on a nullable column still allows multiple NULLs, so legacy
-- unclaimed profiles continue to work.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lecturer_profiles_user_id_key') THEN
    ALTER TABLE lecturer_profiles
      ADD CONSTRAINT lecturer_profiles_user_id_key UNIQUE (user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'professional_profiles_user_id_key') THEN
    ALTER TABLE professional_profiles
      ADD CONSTRAINT professional_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Older installs may have a partial unique index on the same column. Drop
-- it: the constraint above creates its own (non-partial) unique index.
DROP INDEX IF EXISTS idx_lp_user_id;
DROP INDEX IF EXISTS idx_pp_user_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ct_name_user  ON calendar_types(name, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_as_user_id    ON admin_settings(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX        IF NOT EXISTS idx_slots_user_date    ON slots(user_id, date);
CREATE INDEX        IF NOT EXISTS idx_bookings_slot      ON bookings(slot_id);
CREATE INDEX        IF NOT EXISTS idx_bookings_host      ON bookings(host_user_id);
CREATE INDEX        IF NOT EXISTS idx_bookings_email     ON bookings(student_email);
CREATE INDEX        IF NOT EXISTS idx_tm_member_email    ON team_members(member_email);
CREATE INDEX        IF NOT EXISTS idx_tm_host_user       ON team_members(host_user_id);

-- Cross-table username uniqueness ──────────────────────────────────────────────
-- Each table has its own unique index on username, but a lecturer and a
-- professional can't share the same handle either. These triggers reject any
-- insert/update whose username already exists in the other table.

CREATE OR REPLACE FUNCTION check_lecturer_username_unique()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.username IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM professional_profiles WHERE username = NEW.username) THEN
    RAISE EXCEPTION 'Username % is already taken', NEW.username
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION check_professional_username_unique()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.username IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM lecturer_profiles WHERE username = NEW.username) THEN
    RAISE EXCEPTION 'Username % is already taken', NEW.username
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lp_username_unique ON lecturer_profiles;
DROP TRIGGER IF EXISTS trg_pp_username_unique ON professional_profiles;
CREATE TRIGGER trg_lp_username_unique
  BEFORE INSERT OR UPDATE OF username ON lecturer_profiles
  FOR EACH ROW EXECUTE FUNCTION check_lecturer_username_unique();
CREATE TRIGGER trg_pp_username_unique
  BEFORE INSERT OR UPDATE OF username ON professional_profiles
  FOR EACH ROW EXECUTE FUNCTION check_professional_username_unique();

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

-- professional_profiles (mirror of lecturer_profiles)
ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pp_read"   ON professional_profiles;
DROP POLICY IF EXISTS "pp_insert" ON professional_profiles;
DROP POLICY IF EXISTS "pp_update" ON professional_profiles;
DROP POLICY IF EXISTS "pp_delete" ON professional_profiles;
CREATE POLICY "pp_read" ON professional_profiles FOR SELECT USING (
  is_public
  OR auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members
    WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);
CREATE POLICY "pp_insert" ON professional_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pp_update" ON professional_profiles FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "pp_delete" ON professional_profiles FOR DELETE USING (auth.uid() = user_id);

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
  SELECT user_id INTO target_user_id FROM (
    SELECT user_id, created_at FROM lecturer_profiles     WHERE user_id IS NOT NULL
    UNION ALL
    SELECT user_id, created_at FROM professional_profiles WHERE user_id IS NOT NULL
  ) p
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

-- ─────────────────────────────────────────────────────────────────────────────
-- Platform Superadmin
--
-- A small set of users that can manage everything across the platform.
-- Identity lives in `platform_admins`; `is_platform_admin()` is consulted by
-- every RLS policy so admins can transparently read/write any row.
--
-- Bootstrapping the first superadmin (do this once after the user has signed
-- up via the normal flow):
--   INSERT INTO platform_admins (user_id)
--   SELECT id FROM auth.users WHERE email = 'you@example.com';
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'superadmin',
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now()
);

-- Single-row platform configuration. Enforced by a CHECK on id=1.
CREATE TABLE IF NOT EXISTS platform_settings (
  id                  int  PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  signups_enabled     boolean NOT NULL DEFAULT true,
  banner_message      text NOT NULL DEFAULT '',
  maintenance_message text NOT NULL DEFAULT '',
  updated_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS platform_audit_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action         text NOT NULL,
  target_type    text,
  target_id      text,
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pal_created_at ON platform_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pal_actor      ON platform_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_pal_action     ON platform_audit_log(action);

-- Soft-suspend signal on profiles. When non-null, profile is hidden from the
-- public directory and the booking page.
ALTER TABLE lecturer_profiles     ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

-- is_platform_admin(): runs SECURITY DEFINER so RLS policies can call it
-- without recursing into platform_admins' own RLS.
CREATE OR REPLACE FUNCTION is_platform_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = uid)
$$;

-- ── Extend existing RLS so admins bypass owner checks ──────────────────────

-- Profiles
DROP POLICY IF EXISTS "lp_read"   ON lecturer_profiles;
DROP POLICY IF EXISTS "lp_update" ON lecturer_profiles;
DROP POLICY IF EXISTS "lp_delete" ON lecturer_profiles;
CREATE POLICY "lp_read" ON lecturer_profiles FOR SELECT USING (
  is_platform_admin()
  OR is_public
  OR auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members
    WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);
CREATE POLICY "lp_update" ON lecturer_profiles FOR UPDATE USING (
  is_platform_admin() OR auth.uid() = user_id OR user_id IS NULL
);
CREATE POLICY "lp_delete" ON lecturer_profiles FOR DELETE USING (
  is_platform_admin() OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "pp_read"   ON professional_profiles;
DROP POLICY IF EXISTS "pp_update" ON professional_profiles;
DROP POLICY IF EXISTS "pp_delete" ON professional_profiles;
CREATE POLICY "pp_read" ON professional_profiles FOR SELECT USING (
  is_platform_admin()
  OR is_public
  OR auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members
    WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);
CREATE POLICY "pp_update" ON professional_profiles FOR UPDATE USING (
  is_platform_admin() OR auth.uid() = user_id OR user_id IS NULL
);
CREATE POLICY "pp_delete" ON professional_profiles FOR DELETE USING (
  is_platform_admin() OR auth.uid() = user_id
);

-- Slots
DROP POLICY IF EXISTS "slots_update" ON slots;
DROP POLICY IF EXISTS "slots_delete" ON slots;
CREATE POLICY "slots_update" ON slots FOR UPDATE USING (
  is_platform_admin()
  OR auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);
CREATE POLICY "slots_delete" ON slots FOR DELETE USING (
  is_platform_admin()
  OR auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);

-- Calendar types
DROP POLICY IF EXISTS "ct_update" ON calendar_types;
DROP POLICY IF EXISTS "ct_delete" ON calendar_types;
CREATE POLICY "ct_update" ON calendar_types FOR UPDATE USING (
  is_platform_admin()
  OR auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);
CREATE POLICY "ct_delete" ON calendar_types FOR DELETE USING (
  is_platform_admin()
  OR auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);

-- Slot configs
DROP POLICY IF EXISTS "sc_read"   ON slot_configs;
DROP POLICY IF EXISTS "sc_delete" ON slot_configs;
CREATE POLICY "sc_read"   ON slot_configs FOR SELECT USING (
  is_platform_admin()
  OR auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);
CREATE POLICY "sc_delete" ON slot_configs FOR DELETE USING (
  is_platform_admin()
  OR auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);

-- Bookings (read/insert/update are already wide-open; add a delete policy)
DROP POLICY IF EXISTS "bk_delete" ON bookings;
CREATE POLICY "bk_delete" ON bookings FOR DELETE USING (is_platform_admin());

-- Admin settings (per-user, not platform)
DROP POLICY IF EXISTS "as_read" ON admin_settings;
CREATE POLICY "as_read" ON admin_settings FOR SELECT USING (
  is_platform_admin()
  OR user_id IS NULL
  OR auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members WHERE member_email = auth.jwt()->>'email' AND status = 'active'
  )
);

-- Team members
DROP POLICY IF EXISTS "tm_host_select"   ON team_members;
DROP POLICY IF EXISTS "tm_host_delete"   ON team_members;
CREATE POLICY "tm_host_select" ON team_members FOR SELECT USING (
  is_platform_admin() OR auth.uid() = host_user_id
);
CREATE POLICY "tm_host_delete" ON team_members FOR DELETE USING (
  is_platform_admin() OR auth.uid() = host_user_id
);

-- ── RLS on new platform tables ─────────────────────────────────────────────

ALTER TABLE platform_admins    ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pa_read"   ON platform_admins;
DROP POLICY IF EXISTS "pa_insert" ON platform_admins;
DROP POLICY IF EXISTS "pa_delete" ON platform_admins;
CREATE POLICY "pa_read"   ON platform_admins FOR SELECT USING (
  is_platform_admin() OR auth.uid() = user_id
);
CREATE POLICY "pa_insert" ON platform_admins FOR INSERT WITH CHECK (is_platform_admin());
CREATE POLICY "pa_delete" ON platform_admins FOR DELETE USING (is_platform_admin());

DROP POLICY IF EXISTS "ps_read"   ON platform_settings;
DROP POLICY IF EXISTS "ps_update" ON platform_settings;
CREATE POLICY "ps_read"   ON platform_settings FOR SELECT USING (true);
CREATE POLICY "ps_update" ON platform_settings FOR UPDATE USING (is_platform_admin());

DROP POLICY IF EXISTS "pal_read"   ON platform_audit_log;
DROP POLICY IF EXISTS "pal_insert" ON platform_audit_log;
CREATE POLICY "pal_read"   ON platform_audit_log FOR SELECT USING (is_platform_admin());
CREATE POLICY "pal_insert" ON platform_audit_log FOR INSERT WITH CHECK (
  is_platform_admin() AND actor_user_id = auth.uid()
);

-- ── Platform metrics helper (single round-trip count aggregation) ─────────

CREATE OR REPLACE FUNCTION get_platform_metrics()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_users',           (SELECT count(*) FROM (
                               SELECT user_id FROM lecturer_profiles WHERE user_id IS NOT NULL
                               UNION
                               SELECT user_id FROM professional_profiles WHERE user_id IS NOT NULL
                             ) u),
    'lecturers',             (SELECT count(*) FROM lecturer_profiles     WHERE user_id IS NOT NULL),
    'professionals',         (SELECT count(*) FROM professional_profiles WHERE user_id IS NOT NULL),
    'suspended_users',       (SELECT count(*) FROM (
                               SELECT user_id FROM lecturer_profiles     WHERE suspended_at IS NOT NULL
                               UNION
                               SELECT user_id FROM professional_profiles WHERE suspended_at IS NOT NULL
                             ) s),
    'total_bookings',        (SELECT count(*) FROM bookings),
    'bookings_last_7_days',  (SELECT count(*) FROM bookings WHERE created_at >= now() - interval '7 days'),
    'bookings_pending',      (SELECT count(*) FROM bookings WHERE status = 'pending'),
    'bookings_confirmed',    (SELECT count(*) FROM bookings WHERE status = 'confirmed'),
    'total_slots',           (SELECT count(*) FROM slots),
    'slots_upcoming',        (SELECT count(*) FROM slots WHERE date >= current_date),
    'total_teams',           (SELECT count(*) FROM team_members),
    'total_session_types',   (SELECT count(*) FROM calendar_types),
    'platform_admins',       (SELECT count(*) FROM platform_admins)
  )
$$;
