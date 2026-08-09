ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS users_username_lower_idx ON users(lower(username));
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS posts_user_created_idx ON posts(user_id,created_at DESC);
