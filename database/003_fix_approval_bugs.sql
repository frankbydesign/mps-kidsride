-- ============================================
-- Migration: Fix Approval Feature Bugs
-- Date: 2026-01-14
-- ============================================
--
-- This migration fixes critical performance issues caused by the
-- approval feature by adding missing indexes for RLS policy checks.
--
-- INSTRUCTIONS:
-- 1. Log into your Supabase Dashboard
-- 2. Go to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run"
--
-- These changes are NON-DESTRUCTIVE and will dramatically improve
-- query performance, especially for RLS policy checks.
-- ============================================

-- Add critical indexes for RLS policy performance
-- These dramatically speed up the approval checks in every RLS policy
-- Each RLS policy does: WHERE volunteers.id = auth.uid() AND volunteers.approved = true
-- Without these indexes, every query does a full table scan on volunteers

-- Composite index for fast (id, approved) lookups
CREATE INDEX IF NOT EXISTS idx_volunteers_id_approved
ON volunteers(id, approved);

-- Partial index for approved volunteers only (even faster for common case)
CREATE INDEX IF NOT EXISTS idx_volunteers_approved
ON volunteers(approved) WHERE approved = true;

-- ============================================
-- Verification
-- ============================================
-- Run this query after the migration to verify indexes were created:
--
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE tablename = 'volunteers'
-- ORDER BY indexname;
--
-- You should see:
-- - idx_volunteers_id_approved
-- - idx_volunteers_approved
-- ============================================
