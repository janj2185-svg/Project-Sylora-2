ALTER TABLE conversations ADD COLUMN IF NOT EXISTS direct_key text UNIQUE;

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(blocker_id,blocked_id),
  CHECK(blocker_id<>blocked_id)
);

CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS conversation_members_user_idx ON conversation_members(user_id,conversation_id);
