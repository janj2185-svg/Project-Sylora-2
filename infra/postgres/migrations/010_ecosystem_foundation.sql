-- SYLORA ecosystem foundation: identity visibility, AI permissions, knowledge graph, action audit.

CREATE TABLE IF NOT EXISTS identity_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  creator_persona text NOT NULL DEFAULT '',
  professional_title text NOT NULL DEFAULT '',
  skills jsonb NOT NULL DEFAULT '[]',
  interests jsonb NOT NULL DEFAULT '[]',
  portfolio jsonb NOT NULL DEFAULT '[]',
  education jsonb NOT NULL DEFAULT '[]',
  achievements jsonb NOT NULL DEFAULT '[]',
  reputation jsonb NOT NULL DEFAULT '{"creator":0,"professional":0,"market":0,"community":0,"contribution":0,"trust":0}',
  visibility jsonb NOT NULL DEFAULT '{}',
  verified_identity boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_user_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  agent_name text NOT NULL DEFAULT 'Sylora',
  permissions jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_type text NOT NULL,
  label text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','followers','connections','business','private','ai_only')),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_nodes_owner_idx ON knowledge_nodes(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_nodes_type_idx ON knowledge_nodes(node_type, created_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_node_id uuid NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  to_node_id uuid NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  edge_type text NOT NULL,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','followers','connections','business','private','ai_only')),
  consent_granted boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_edges_owner_idx ON knowledge_edges(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_action_log (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id text NOT NULL DEFAULT 'personal',
  action_type text NOT NULL,
  level text NOT NULL,
  permission text,
  input jsonb NOT NULL DEFAULT '{}',
  confirmed boolean NOT NULL DEFAULT false,
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_action_log_user_idx ON ai_action_log(user_id, created_at DESC);
