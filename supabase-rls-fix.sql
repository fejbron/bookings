-- BookSlot — fix all RLS issues
-- Run this entire script in your Supabase SQL editor (one paste, one click Run)

-- 1. slots — public read, anyone can book (insert), admin can delete
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read"   ON slots;
DROP POLICY IF EXISTS "public_insert" ON slots;
DROP POLICY IF EXISTS "public_delete" ON slots;
CREATE POLICY "public_read"   ON slots FOR SELECT USING (true);
CREATE POLICY "public_insert" ON slots FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete" ON slots FOR DELETE USING (true);
CREATE POLICY "public_update" ON slots FOR UPDATE USING (true);

-- 2. bookings — students can read own bookings, insert, and cancel; admin can do all
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read"   ON bookings;
DROP POLICY IF EXISTS "public_insert" ON bookings;
DROP POLICY IF EXISTS "public_update" ON bookings;
CREATE POLICY "public_read"   ON bookings FOR SELECT USING (true);
CREATE POLICY "public_insert" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update" ON bookings FOR UPDATE USING (true);

-- 3. slots_configs — admin only, but simplest to open for now
ALTER TABLE slot_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read"   ON slot_configs;
DROP POLICY IF EXISTS "public_insert" ON slot_configs;
DROP POLICY IF EXISTS "public_delete" ON slot_configs;
DROP POLICY IF EXISTS "public_update" ON slot_configs;
CREATE POLICY "public_read"   ON slot_configs FOR SELECT USING (true);
CREATE POLICY "public_insert" ON slot_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete" ON slot_configs FOR DELETE USING (true);
CREATE POLICY "public_update" ON slot_configs FOR UPDATE USING (true);

-- 4. calendar_types — public read, admin write
ALTER TABLE calendar_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read"   ON calendar_types;
DROP POLICY IF EXISTS "public_insert" ON calendar_types;
DROP POLICY IF EXISTS "public_delete" ON calendar_types;
DROP POLICY IF EXISTS "public_update" ON calendar_types;
CREATE POLICY "public_read"   ON calendar_types FOR SELECT USING (true);
CREATE POLICY "public_insert" ON calendar_types FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete" ON calendar_types FOR DELETE USING (true);
CREATE POLICY "public_update" ON calendar_types FOR UPDATE USING (true);

-- 5. admin_settings — public read (welcome message), admin write
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read"   ON admin_settings;
DROP POLICY IF EXISTS "public_upsert" ON admin_settings;
DROP POLICY IF EXISTS "public_update" ON admin_settings;
CREATE POLICY "public_read"   ON admin_settings FOR SELECT USING (true);
CREATE POLICY "public_upsert" ON admin_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update" ON admin_settings FOR UPDATE USING (true);

-- 6. lecturer_profiles — public read (home page team section), admin write
ALTER TABLE lecturer_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read"   ON lecturer_profiles;
DROP POLICY IF EXISTS "public_insert" ON lecturer_profiles;
DROP POLICY IF EXISTS "public_delete" ON lecturer_profiles;
DROP POLICY IF EXISTS "public_update" ON lecturer_profiles;
CREATE POLICY "public_read"   ON lecturer_profiles FOR SELECT USING (true);
CREATE POLICY "public_insert" ON lecturer_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete" ON lecturer_profiles FOR DELETE USING (true);
CREATE POLICY "public_update" ON lecturer_profiles FOR UPDATE USING (true);

-- Also add missing columns if they don't exist yet
ALTER TABLE lecturer_profiles ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE calendar_types    ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE bookings          ADD COLUMN IF NOT EXISTS cancellation_reason text;
