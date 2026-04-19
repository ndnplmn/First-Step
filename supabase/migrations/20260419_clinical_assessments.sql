-- Sprint 9: PHQ-9 and GAD-7 clinical assessment columns
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS phq9 jsonb,
  ADD COLUMN IF NOT EXISTS gad7 jsonb;
