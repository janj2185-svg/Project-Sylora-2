-- SYLORA ecosystem core spine (Identity, Personal AI, KG, Agents, Developers, Orgs, Trust)

CREATE TABLE IF NOT EXISTS personal_agents (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Sylora',
  kind text NOT NULL DEFAULT 'personal',
  locale text NOT NULL DEFAULT 'uk',
  permissions jsonb NOT NULL DEFAULT '{}',
  contexts jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, kind)
);

CREATE TABLE IF NOT EXISTS identity_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  verified_person boolean NOT NULL DEFAULT false,
  creator_persona jsonb NOT NULL DEFAULT '{}',
  professional jsonb NOT NULL DEFAULT '{}',
  portfolio jsonb NOT NULL DEFAULT '[]',
  interests jsonb NOT NULL DEFAULT '[]',
  privacy jsonb NOT NULL DEFAULT '{}',
  reputation_refs jsonb NOT NULL DEFAULT '{}',
  agent_id uuid REFERENCES personal_agents(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kg_nodes (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  label text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  privacy text NOT NULL DEFAULT 'private',
  provenance jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS kg_nodes_owner_idx ON kg_nodes(owner_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS kg_edges (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_id uuid NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
  type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  privacy text NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS ai_activity (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES personal_agents(id) ON DELETE SET NULL,
  kind text NOT NULL,
  summary text NOT NULL,
  data_used jsonb NOT NULL DEFAULT '[]',
  reason text NOT NULL DEFAULT '',
  context text NOT NULL DEFAULT 'command_center',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_activity_user_idx ON ai_activity(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ecosystem_actions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id uuid,
  actor_type text NOT NULL DEFAULT 'personal_ai',
  type text NOT NULL,
  level text NOT NULL,
  input jsonb NOT NULL DEFAULT '{}',
  output jsonb,
  permission text,
  context text NOT NULL DEFAULT 'command_center',
  status text NOT NULL,
  confirmation_required boolean NOT NULL DEFAULT true,
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS agent_catalog (
  id uuid PRIMARY KEY,
  developer_id text NOT NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  summary text NOT NULL DEFAULT '',
  category text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '[]',
  capabilities jsonb NOT NULL DEFAULT '[]',
  tools jsonb NOT NULL DEFAULT '[]',
  pricing jsonb NOT NULL DEFAULT '{}',
  version text NOT NULL DEFAULT '0.1.0',
  status text NOT NULL DEFAULT 'sandbox',
  security_review text NOT NULL DEFAULT 'pending',
  installs int NOT NULL DEFAULT 0,
  revenue_share_bps int NOT NULL DEFAULT 7000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_installs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id uuid,
  agent_id uuid NOT NULL REFERENCES agent_catalog(id) ON DELETE CASCADE,
  permissions jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'installed',
  installed_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz
);

CREATE TABLE IF NOT EXISTS developer_apps (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  scopes jsonb NOT NULL DEFAULT '[]',
  redirect_uris jsonb NOT NULL DEFAULT '[]',
  webhook_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'sandbox',
  rate_limit_per_minute int NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS developer_api_keys (
  id uuid PRIMARY KEY,
  app_id uuid NOT NULL REFERENCES developer_apps(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prefix text NOT NULL,
  hash text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT 'default',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE TABLE IF NOT EXISTS enterprise_ai_controls (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  allowlist jsonb NOT NULL DEFAULT '[]',
  blocklist jsonb NOT NULL DEFAULT '[]',
  budgets jsonb NOT NULL DEFAULT '{}',
  kill_switch boolean NOT NULL DEFAULT false,
  require_approval_for jsonb NOT NULL DEFAULT '[]',
  policies jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_provenance (
  id uuid PRIMARY KEY,
  content_id text NOT NULL,
  content_type text NOT NULL,
  creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  origin text NOT NULL,
  creation_method text NOT NULL,
  ai_involved boolean NOT NULL DEFAULT false,
  ai_label text NOT NULL DEFAULT 'human',
  edit_history jsonb NOT NULL DEFAULT '[]',
  verification jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reputation_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  dimensions jsonb NOT NULL DEFAULT '{}',
  disputes jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commerce_products (
  id uuid PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  price bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'LUMEN',
  payment_mode text NOT NULL DEFAULT 'sandbox',
  status text NOT NULL DEFAULT 'sandbox_listed',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS privacy_requests (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'queued',
  created_at timestamptz NOT NULL DEFAULT now()
);
