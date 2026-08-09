CREATE TABLE IF NOT EXISTS realtime_outbox (
  id uuid PRIMARY KEY,
  topic text NOT NULL,
  aggregate_id text,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  available_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  claim_token uuid,
  published_at timestamptz,
  attempts int NOT NULL DEFAULT 0 CHECK(attempts>=0),
  last_error text
);

CREATE INDEX IF NOT EXISTS realtime_outbox_pending_idx
  ON realtime_outbox(available_at,created_at)
  WHERE published_at IS NULL;
