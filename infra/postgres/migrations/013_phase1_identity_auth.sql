-- Phase 1: canonical account lifecycle, case-insensitive identity, and AI-memory metadata.

ALTER TABLE users ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK(status IN ('active','disabled','blocked'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- These indexes deliberately fail rather than silently merge conflicting legacy accounts.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique_idx ON users(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique_idx ON users(lower(username));
CREATE INDEX IF NOT EXISTS sessions_user_expires_idx ON sessions(user_id,expires_at DESC);

ALTER TABLE personal_agents ADD COLUMN IF NOT EXISTS privacy_controls jsonb NOT NULL DEFAULT '{}';
ALTER TABLE personal_agents ADD COLUMN IF NOT EXISTS proactive_level text NOT NULL DEFAULT 'IMPORTANT_ONLY';
ALTER TABLE personal_agents ADD COLUMN IF NOT EXISTS voice_personality text NOT NULL DEFAULT 'warm';

ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'preferences'
  CHECK(category IN ('conversation','preferences','people','projects','professional','learning'));
ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS ai_memories_user_updated_idx ON ai_memories(user_id,updated_at DESC);
