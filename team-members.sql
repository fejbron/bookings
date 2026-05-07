-- BookSlot — Team Members Migration
-- Run this in your Supabase SQL Editor

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

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Host can manage their own team
CREATE POLICY "tm_host_select" ON team_members FOR SELECT USING (auth.uid() = host_user_id);
CREATE POLICY "tm_host_insert" ON team_members FOR INSERT WITH CHECK (auth.uid() = host_user_id);
CREATE POLICY "tm_host_delete" ON team_members FOR DELETE USING (auth.uid() = host_user_id);

-- Members can see which accounts they have access to
CREATE POLICY "tm_member_select" ON team_members FOR SELECT
  USING (auth.jwt()->>'email' = member_email);

-- Members can update their own row (to link member_user_id on first login)
CREATE POLICY "tm_member_update" ON team_members FOR UPDATE
  USING (auth.uid() = host_user_id OR auth.jwt()->>'email' = member_email);

-- Allow team members to read their host's profile (even if private)
DROP POLICY IF EXISTS "lp_read" ON lecturer_profiles;
CREATE POLICY "lp_read" ON lecturer_profiles FOR SELECT USING (
  is_public
  OR auth.uid() = user_id
  OR user_id IN (
    SELECT host_user_id FROM team_members
    WHERE member_email = auth.jwt()->>'email'
    AND status = 'active'
  )
);
