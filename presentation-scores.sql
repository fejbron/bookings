-- BookSlot — Presentation Scores Migration
-- Run this in your Supabase SQL Editor

-- Mark a calendar type as a presentation type (triggers student roster on booking form)
ALTER TABLE calendar_types ADD COLUMN IF NOT EXISTS is_presentation boolean NOT NULL DEFAULT false;

-- Store the list of students (and their scores after the session)
-- Format: [{ "name": "John Doe", "indexNumber": "ST001", "score": null }, ...]
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS students jsonb NOT NULL DEFAULT '[]';
