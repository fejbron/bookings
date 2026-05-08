-- BookSlot — Backfill user_id for pre-migration data
-- Run this AFTER supabase-multitenant.sql
-- Assigns all orphaned rows (user_id IS NULL) to the first account
-- that completed profile setup. Handles duplicate-name conflicts.
-- Safe to run multiple times.

DO $$
DECLARE
  target_user_id uuid;
  slots_updated int;
  configs_updated int;
  types_updated int;
  settings_updated int;
  bookings_updated int;
BEGIN
  SELECT user_id INTO target_user_id
  FROM lecturer_profiles
  WHERE user_id IS NOT NULL
  ORDER BY created_at
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE NOTICE 'No profiles with user_id found. Complete the setup flow first, then re-run.';
    RETURN;
  END IF;

  RAISE NOTICE 'Backfilling orphaned rows to user_id = %', target_user_id;

  -- Remove orphaned calendar_types that clash with an existing (name, user_id) row
  DELETE FROM calendar_types
  WHERE user_id IS NULL
    AND name IN (
      SELECT name FROM calendar_types WHERE user_id = target_user_id
    );

  -- Remove orphaned admin_settings if target user already has one
  DELETE FROM admin_settings
  WHERE user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM admin_settings WHERE user_id = target_user_id
    );

  -- Backfill remaining null rows
  UPDATE slots        SET user_id      = target_user_id WHERE user_id      IS NULL;
  GET DIAGNOSTICS slots_updated = ROW_COUNT;

  UPDATE slot_configs SET user_id      = target_user_id WHERE user_id      IS NULL;
  GET DIAGNOSTICS configs_updated = ROW_COUNT;

  UPDATE calendar_types SET user_id   = target_user_id WHERE user_id      IS NULL;
  GET DIAGNOSTICS types_updated = ROW_COUNT;

  UPDATE admin_settings SET user_id   = target_user_id WHERE user_id      IS NULL;
  GET DIAGNOSTICS settings_updated = ROW_COUNT;

  UPDATE bookings SET host_user_id    = target_user_id WHERE host_user_id  IS NULL;
  GET DIAGNOSTICS bookings_updated = ROW_COUNT;

  RAISE NOTICE 'Done: % slots, % slot_configs, % calendar_types, % admin_settings, % bookings updated.',
    slots_updated, configs_updated, types_updated, settings_updated, bookings_updated;
END $$;
