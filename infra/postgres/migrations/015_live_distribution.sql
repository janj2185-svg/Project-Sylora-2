CREATE TABLE IF NOT EXISTS live_stream_destinations (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  label text NOT NULL,
  server_url text NOT NULL,
  encrypted_stream_key text NOT NULL,
  key_fingerprint text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(char_length(provider) BETWEEN 1 AND 30),
  CHECK(char_length(label) BETWEEN 2 AND 60),
  CHECK(char_length(server_url) BETWEEN 8 AND 600),
  CHECK(char_length(encrypted_stream_key) BETWEEN 16 AND 2048),
  CHECK(char_length(key_fingerprint) = 12)
);

CREATE INDEX IF NOT EXISTS live_stream_destinations_user_updated_idx
  ON live_stream_destinations(user_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS live_distribution_sessions (
  id uuid PRIMARY KEY,
  live_id uuid NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK(status IN ('preparing','waiting_for_source','live','degraded','stopped','failed')),
  encrypted_ingest_path text NOT NULL,
  ingest_key_fingerprint text NOT NULL,
  destination_ids jsonb NOT NULL DEFAULT '[]',
  destination_states jsonb NOT NULL DEFAULT '[]',
  record boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  stopped_at timestamptz,
  last_observed_at timestamptz,
  CHECK(jsonb_typeof(destination_ids) = 'array'),
  CHECK(jsonb_typeof(destination_states) = 'array'),
  CHECK(char_length(encrypted_ingest_path) BETWEEN 16 AND 2048),
  CHECK(char_length(ingest_key_fingerprint) = 12)
);

CREATE UNIQUE INDEX IF NOT EXISTS live_distribution_sessions_one_active_idx
  ON live_distribution_sessions(live_id)
  WHERE status IN ('preparing','waiting_for_source','live','degraded');

CREATE INDEX IF NOT EXISTS live_distribution_sessions_user_created_idx
  ON live_distribution_sessions(user_id,created_at DESC);
