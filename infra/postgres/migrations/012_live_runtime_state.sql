-- LIVE runtime state: battle overlays, stages, room profiles, clip jobs, search vectors

ALTER TABLE live_battles ADD COLUMN IF NOT EXISTS overlay jsonb NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS live_stages (
  live_id uuid PRIMARY KEY REFERENCES live_rooms(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_room_profiles (
  id uuid PRIMARY KEY,
  live_id uuid NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'standard',
  title text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(live_id)
);

CREATE TABLE IF NOT EXISTS clip_jobs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  live_id uuid REFERENCES live_rooms(id) ON DELETE SET NULL,
  media_id uuid,
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','completed','failed')),
  output_path text,
  output_metadata jsonb NOT NULL DEFAULT '{}',
  error text,
  attempts int NOT NULL DEFAULT 0 CHECK(attempts >= 0),
  max_attempts int NOT NULL DEFAULT 3 CHECK(max_attempts >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clip_jobs_user_status_idx ON clip_jobs(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS clip_jobs_status_queued_idx ON clip_jobs(status, created_at) WHERE status IN ('queued','processing');

-- Full-text search fallback (posts + live titles)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS posts_search_vector_idx ON posts USING gin(search_vector);

UPDATE posts SET search_vector = to_tsvector('simple',
  coalesce(body,'') || ' ' || coalesce((
    SELECT username FROM users WHERE users.id = posts.user_id
  ),''))
) WHERE search_vector IS NULL;

CREATE OR REPLACE FUNCTION posts_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', coalesce(NEW.body,''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_search_vector_update ON posts;
CREATE TRIGGER posts_search_vector_update
  BEFORE INSERT OR UPDATE OF body ON posts
  FOR EACH ROW EXECUTE FUNCTION posts_search_vector_trigger();

ALTER TABLE live_rooms ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS live_rooms_search_vector_idx ON live_rooms USING gin(search_vector);

UPDATE live_rooms SET search_vector = to_tsvector('simple', coalesce(title,'')) WHERE search_vector IS NULL;

CREATE OR REPLACE FUNCTION live_rooms_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', coalesce(NEW.title,''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS live_rooms_search_vector_update ON live_rooms;
CREATE TRIGGER live_rooms_search_vector_update
  BEFORE INSERT OR UPDATE OF title ON live_rooms
  FOR EACH ROW EXECUTE FUNCTION live_rooms_search_vector_trigger();
