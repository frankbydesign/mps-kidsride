-- ============================================
-- MIGRATION: Re-open resolved conversations with unseen inbound messages
-- ============================================
-- This fixes conversations that received inbound messages while resolved.
-- The webhook was not re-opening resolved conversations, so new messages
-- from parents were stored but invisible in the UI.
--
-- Run this in your Supabase SQL Editor to fix existing data.

-- Re-open any resolved conversation that has an inbound message
-- received AFTER the conversation was last updated (i.e., after it was resolved).
-- This catches conversations where parents texted back but no one could see it.
UPDATE conversations
SET status = 'active'
WHERE status = 'resolved'
  AND id IN (
    SELECT DISTINCT conversation_id
    FROM messages
    WHERE direction = 'inbound'
      AND created_at > (
        SELECT c.updated_at
        FROM conversations c
        WHERE c.id = messages.conversation_id
      )
  );
