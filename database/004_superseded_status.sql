-- Migration: Add 'superseded' status for retry handling
-- Date: 2026-01-15
-- Description: Allows marking failed messages as superseded when retried,
--              preventing data loss while keeping UI clean

-- Update the check constraint on messages.status to include 'superseded'
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;

ALTER TABLE messages ADD CONSTRAINT messages_status_check
  CHECK (status IN ('pending', 'sent', 'failed', 'received', 'superseded'));

-- Add comment explaining superseded status
COMMENT ON COLUMN messages.status IS 'Message status: pending (being sent), sent (successful), failed (error), received (inbound), superseded (failed message that was retried)';
