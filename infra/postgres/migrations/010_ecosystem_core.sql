ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'long';
ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]';
ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS context_sources jsonb NOT NULL DEFAULT '[]';
ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS confidence numeric NOT NULL DEFAULT 1 CHECK(confidence BETWEEN 0 AND 1);

CREATE TABLE IF NOT EXISTS identity_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, profile jsonb NOT NULL DEFAULT '{}', privacy jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ai_permissions (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, permissions jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS kg_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid REFERENCES users(id) ON DELETE CASCADE, type text NOT NULL, privacy text NOT NULL, scope text NOT NULL, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kg_nodes_owner_type_idx ON kg_nodes(owner_id,type);
CREATE TABLE IF NOT EXISTS kg_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid REFERENCES users(id) ON DELETE CASCADE, from_id uuid NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE, to_id uuid NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE, relation text NOT NULL, privacy text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kg_edges_from_to_idx ON kg_edges(from_id,to_id);
CREATE TABLE IF NOT EXISTS agent_catalog (
  id text NOT NULL, version text NOT NULL, manifest jsonb NOT NULL, security_review_status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(id,version)
);
CREATE TABLE IF NOT EXISTS agent_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, agent_id text NOT NULL, version text NOT NULL, permissions jsonb NOT NULL DEFAULT '[]', status text NOT NULL, installed_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,agent_id)
);
CREATE TABLE IF NOT EXISTS developer_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), developer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, name text NOT NULL, scopes jsonb NOT NULL DEFAULT '[]', sandbox boolean NOT NULL DEFAULT true, redirect_uris jsonb NOT NULL DEFAULT '[]', rate_limit_per_minute int NOT NULL DEFAULT 60, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), app_id uuid NOT NULL REFERENCES developer_apps(id) ON DELETE CASCADE, key_hash text NOT NULL UNIQUE, prefix text NOT NULL, name text NOT NULL, last_used_at timestamptz, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id) ON DELETE SET NULL, org_id uuid, agent_id text, actor_id uuid REFERENCES users(id) ON DELETE SET NULL, action text NOT NULL, target_id text, outcome text NOT NULL DEFAULT 'success', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_subject_idx ON audit_events(user_id,org_id,agent_id,created_at DESC);
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users(id), name text NOT NULL, slug text NOT NULL UNIQUE, settings jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS org_members (
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, role text NOT NULL, joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(org_id,user_id)
);
CREATE TABLE IF NOT EXISTS reputation_scores (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, axes jsonb NOT NULL DEFAULT '{}', factors jsonb NOT NULL DEFAULT '[]', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS provenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid REFERENCES users(id) ON DELETE SET NULL, target_type text NOT NULL, target_id text NOT NULL, origin text NOT NULL, creator_id text, model text, content_hash text, chain jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS translation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, source_language text, target_language text NOT NULL, provider text, provider_job_id text, status text NOT NULL, input_text text NOT NULL, output_text text, error text, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
