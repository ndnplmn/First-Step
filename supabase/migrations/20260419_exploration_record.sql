-- Add structured exploration record to sessions
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS exploration_record jsonb;
