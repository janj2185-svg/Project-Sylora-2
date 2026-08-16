-- Comment reactions + comment edit timestamp (social completeness)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS edited_at timestamptz;

CREATE TABLE IF NOT EXISTS comment_reactions (
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'spark',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id, kind)
);

CREATE INDEX IF NOT EXISTS comment_reactions_user_idx ON comment_reactions(user_id);
