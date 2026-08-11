-- SYLORA ecosystem foundation: identity, AI permissions, knowledge graph, agents, developer apps, orgs, reputation, provenance.

CREATE TABLE IF NOT EXISTS identity_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  verified_person boolean NOT NULL DEFAULT false,
  creator_persona text NOT NULL DEFAULT '',
  professional_identity text NOT NULL DEFAULT '',
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  interests jsonb NOT NULL DEFAULT '[]'::jsonb,
  portfolio jsonb NOT NULL DEFAULT '[]'::jsonb,
  education jsonb NOT NULL DEFAULT '[]'::jsonb,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','followers','connections','business','private','ai_only')),
  field_visibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_permissions (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id uuid,
  action text NOT NULL,
  reason text NOT NULL DEFAULT '',
  permission_level text NOT NULL CHECK (permission_level IN ('READ','PROPOSE','PREPARE','REQUEST_CONFIRMATION','EXECUTE_ALLOWED')),
  data_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  result text NOT NULL DEFAULT 'ok',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_activity_user_idx ON ai_activity_log(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  ref_id text NOT NULL,
  label text NOT NULL,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','followers','connections','business','private','ai_only')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_user_id, type, ref_id)
);
CREATE INDEX IF NOT EXISTS knowledge_nodes_owner_idx ON knowledge_nodes(owner_user_id, type);

CREATE TABLE IF NOT EXISTS knowledge_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_node_id uuid NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  to_node_id uuid NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  relation text NOT NULL,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','followers','connections','business','private','ai_only')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_edges_owner_idx ON knowledge_edges(owner_user_id);

CREATE TABLE IF NOT EXISTS agent_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  pricing text NOT NULL CHECK (pricing IN ('free','paid','subscription')),
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sandbox','verified','blocked')),
  version text NOT NULL DEFAULT '0.1.0',
  rating numeric NOT NULL DEFAULT 0,
  installs int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agent_catalog(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('installed','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  UNIQUE(user_id, agent_id, status)
);

CREATE TABLE IF NOT EXISTS developer_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'sandbox' CHECK (status IN ('sandbox','review','production','revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS developer_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES developer_apps(id) ON DELETE CASCADE,
  prefix text NOT NULL,
  secret_hash text,
  secret_hint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','viewer')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(org_id, user_id)
);

CREATE TABLE IF NOT EXISTS organization_ai_policies (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  allowlist_agents jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocklist_agents jsonb NOT NULL DEFAULT '[]'::jsonb,
  budgets jsonb NOT NULL DEFAULT '{}'::jsonb,
  kill_switch boolean NOT NULL DEFAULT false,
  require_approval_for jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reputation_scores (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id text NOT NULL,
  content_type text NOT NULL,
  creator_id uuid REFERENCES users(id) ON DELETE SET NULL,
  source text NOT NULL,
  ai_involved boolean NOT NULL DEFAULT false,
  method text NOT NULL DEFAULT 'created',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_provenance_content_idx ON content_provenance(content_id, created_at DESC);

CREATE TABLE IF NOT EXISTS translation_prefs (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  source_lang text NOT NULL DEFAULT 'auto',
  target_lang text NOT NULL DEFAULT 'uk',
  live_subtitles boolean NOT NULL DEFAULT true,
  chat_translation boolean NOT NULL DEFAULT true,
  voice_translation boolean NOT NULL DEFAULT false,
  mark_synthetic_voice boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS action_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL,
  agent_id uuid,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  permission text NOT NULL,
  confirmation boolean NOT NULL DEFAULT false,
  result text NOT NULL DEFAULT 'ok',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS action_audit_user_idx ON action_audit(user_id, created_at DESC);
