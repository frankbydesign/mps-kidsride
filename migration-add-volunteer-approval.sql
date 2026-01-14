-- ============================================
-- MIGRATION: Add Volunteer Approval System
-- ============================================
-- This migration adds the approval system to existing MPS Kids Ride databases
-- Run this in your Supabase SQL Editor if you already have the database set up

-- 1. Add new columns to volunteers table
ALTER TABLE volunteers
  ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- 2. Update existing volunteers to be approved (optional - uncomment if you want to auto-approve existing users)
-- UPDATE volunteers SET approved = true WHERE created_at < NOW();

-- 3. Make frank@centerpointcorp.com an admin and approve them
UPDATE volunteers
SET is_admin = true, approved = true
WHERE email = 'frank@centerpointcorp.com';

-- 4. Update the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  volunteer_count integer;
  is_first_user boolean;
  should_approve boolean;
  should_be_admin boolean;
BEGIN
  -- Check if this is the first user
  SELECT count(*) INTO volunteer_count FROM public.volunteers;
  is_first_user := (volunteer_count = 0);

  -- Make first user or frank@centerpointcorp.com an admin and auto-approve
  should_be_admin := (is_first_user OR new.email = 'frank@centerpointcorp.com');
  should_approve := should_be_admin;

  INSERT INTO public.volunteers (id, email, display_name, approved, is_admin)
  VALUES (new.id, new.email, split_part(new.email, '@', 1), should_approve, should_be_admin);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update RLS policies for conversations to restrict to approved volunteers
DROP POLICY IF EXISTS "Authenticated users can view conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can insert conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can update conversations" ON conversations;

CREATE POLICY "Approved volunteers can view conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM volunteers
    WHERE volunteers.id = auth.uid()
    AND volunteers.approved = true
  ));

CREATE POLICY "Approved volunteers can insert conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM volunteers
    WHERE volunteers.id = auth.uid()
    AND volunteers.approved = true
  ));

CREATE POLICY "Approved volunteers can update conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM volunteers
    WHERE volunteers.id = auth.uid()
    AND volunteers.approved = true
  ));

-- 6. Update RLS policies for messages to restrict to approved volunteers
DROP POLICY IF EXISTS "Authenticated users can view messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON messages;

CREATE POLICY "Approved volunteers can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM volunteers
    WHERE volunteers.id = auth.uid()
    AND volunteers.approved = true
  ));

CREATE POLICY "Approved volunteers can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM volunteers
    WHERE volunteers.id = auth.uid()
    AND volunteers.approved = true
  ));

CREATE POLICY "Approved volunteers can update messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM volunteers
    WHERE volunteers.id = auth.uid()
    AND volunteers.approved = true
  ));

-- ============================================
-- MANUAL COMMANDS (run separately if needed)
-- ============================================

-- To manually make a user an admin:
-- UPDATE volunteers SET is_admin = true, approved = true WHERE email = 'user@example.com';

-- To approve a specific volunteer:
-- UPDATE volunteers SET approved = true WHERE email = 'volunteer@example.com';

-- To see all pending volunteers:
-- SELECT id, email, display_name, created_at FROM volunteers WHERE approved = false ORDER BY created_at DESC;

-- To see all admins:
-- SELECT id, email, display_name, is_admin FROM volunteers WHERE is_admin = true;
