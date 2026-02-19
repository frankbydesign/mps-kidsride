-- ============================================
-- MIGRATION: Add Vehicle Fields to Volunteers
-- ============================================
-- Adds vehicle information columns to the volunteers table
-- for tracking volunteer car details during kid rides.
-- Run this in your Supabase SQL Editor after all previous migrations.

ALTER TABLE volunteers
  ADD COLUMN IF NOT EXISTS license_plate text,
  ADD COLUMN IF NOT EXISTS car_make text,
  ADD COLUMN IF NOT EXISTS car_color text;
