ALTER TABLE ai_messages ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'chat';
ALTER TABLE ai_messages ADD COLUMN IF NOT EXISTS source_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS ai_messages_source_event_unique_idx
  ON ai_messages(user_id,source_event_id)
  WHERE source_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ai_messages_user_source_idx
  ON ai_messages(user_id,source,created_at DESC);
