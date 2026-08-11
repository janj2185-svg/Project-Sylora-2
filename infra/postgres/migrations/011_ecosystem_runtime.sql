-- Teams, internal knowledge docs/tasks, AI-to-AI negotiations

CREATE TABLE IF NOT EXISTS organization_teams (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  member_ids jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS organization_teams_org_idx ON organization_teams(org_id);

CREATE TABLE IF NOT EXISTS organization_documents (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  privacy text NOT NULL DEFAULT 'business',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS organization_documents_org_idx ON organization_documents(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS organization_tasks (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_negotiations (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_agent_id text NOT NULL,
  to_agent_id text NOT NULL,
  topic text NOT NULL,
  message text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'proposed',
  action_level text NOT NULL DEFAULT 'REQUEST_CONFIRMATION',
  reply jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  executed_at timestamptz
);
CREATE INDEX IF NOT EXISTS agent_negotiations_user_idx ON agent_negotiations(user_id, created_at DESC);

ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'long';
ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS agent_id uuid;
ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS context_sources jsonb NOT NULL DEFAULT '[]';
