-- DM attachments + gift refund marker
-- media_id is text (not FK): media bytes may live in the JSON media store while messages use Postgres.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_id text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_id text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment jsonb;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent';
CREATE INDEX IF NOT EXISTS messages_client_id_idx ON messages(conversation_id, user_id, client_id);

ALTER TABLE gift_transfers ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
