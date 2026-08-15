import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { newDb } from 'pg-mem';
import { PostgresEcosystemRepository } from '../src/repositories/postgres-ecosystem.mjs';
import fs from 'node:fs';

test('PostgreSQL ecosystem repository persists personal AI, identity, KG and orgs', async () => {
  const sql010 = fs.readFileSync(new URL('../infra/postgres/migrations/010_ecosystem_core.sql', import.meta.url), 'utf8');
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  memory.public.none(`
    CREATE TABLE users (
      id uuid PRIMARY KEY,
      email text UNIQUE,
      username text UNIQUE,
      password_hash text,
      display_name text,
      bio text DEFAULT '',
      locale text DEFAULT 'uk',
      role text DEFAULT 'user',
      created_at timestamptz DEFAULT now()
    );
  `);
  // pg-mem may not support all SQL; apply a minimal compatible subset
  memory.public.none(`
    CREATE TABLE personal_agents (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL DEFAULT 'Sylora', kind text NOT NULL DEFAULT 'personal', locale text NOT NULL DEFAULT 'uk',
      permissions jsonb NOT NULL DEFAULT '{}', contexts jsonb NOT NULL DEFAULT '{}',
      privacy_controls jsonb NOT NULL DEFAULT '{}', proactive_level text NOT NULL DEFAULT 'IMPORTANT_ONLY', voice_personality text NOT NULL DEFAULT 'warm',
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id, kind)
    );
    CREATE TABLE identity_profiles (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      verified_person boolean NOT NULL DEFAULT false,
      creator_persona jsonb NOT NULL DEFAULT '{}', professional jsonb NOT NULL DEFAULT '{}',
      portfolio jsonb NOT NULL DEFAULT '[]', interests jsonb NOT NULL DEFAULT '[]',
      privacy jsonb NOT NULL DEFAULT '{}', reputation_refs jsonb NOT NULL DEFAULT '{}',
      agent_id uuid, updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE kg_nodes (
      id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type text NOT NULL, label text NOT NULL, data jsonb NOT NULL DEFAULT '{}', privacy text NOT NULL DEFAULT 'private',
      provenance jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE kg_edges (
      id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_id uuid NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
      to_id uuid NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
      type text NOT NULL, data jsonb NOT NULL DEFAULT '{}', privacy text NOT NULL DEFAULT 'private',
      created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE agent_catalog (
      id uuid PRIMARY KEY, developer_id text NOT NULL, slug text NOT NULL UNIQUE, name text NOT NULL,
      summary text NOT NULL DEFAULT '', category text NOT NULL, permissions jsonb NOT NULL DEFAULT '[]',
      capabilities jsonb NOT NULL DEFAULT '[]', tools jsonb NOT NULL DEFAULT '[]', pricing jsonb NOT NULL DEFAULT '{}',
      version text NOT NULL DEFAULT '0.1.0', status text NOT NULL DEFAULT 'sandbox',
      security_review text NOT NULL DEFAULT 'pending', installs int NOT NULL DEFAULT 0,
      revenue_share_bps int NOT NULL DEFAULT 7000, created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE agent_installs (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, org_id uuid,
      agent_id uuid NOT NULL REFERENCES agent_catalog(id) ON DELETE CASCADE, permissions jsonb NOT NULL DEFAULT '[]',
      status text NOT NULL DEFAULT 'installed', installed_at timestamptz NOT NULL DEFAULT now(), removed_at timestamptz
    );
    CREATE TABLE developer_apps (
      id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL, description text NOT NULL DEFAULT '', scopes jsonb NOT NULL DEFAULT '[]',
      redirect_uris jsonb NOT NULL DEFAULT '[]', webhook_url text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'sandbox',
      rate_limit_per_minute int NOT NULL DEFAULT 60, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE developer_api_keys (
      id uuid PRIMARY KEY, app_id uuid NOT NULL REFERENCES developer_apps(id) ON DELETE CASCADE,
      owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, prefix text NOT NULL, hash text NOT NULL UNIQUE,
      label text NOT NULL DEFAULT 'default', last_used_at timestamptz, revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE organizations (
      id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL, description text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE organization_members (
      id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, role text NOT NULL DEFAULT 'member',
      joined_at timestamptz NOT NULL DEFAULT now(), UNIQUE(org_id, user_id)
    );
    CREATE TABLE enterprise_ai_controls (
      org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
      allowlist jsonb NOT NULL DEFAULT '[]', blocklist jsonb NOT NULL DEFAULT '[]', budgets jsonb NOT NULL DEFAULT '{}',
      kill_switch boolean NOT NULL DEFAULT false, require_approval_for jsonb NOT NULL DEFAULT '[]',
      policies jsonb NOT NULL DEFAULT '[]', updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE ai_activity (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, agent_id uuid,
      kind text NOT NULL, summary text NOT NULL, data_used jsonb NOT NULL DEFAULT '[]', reason text NOT NULL DEFAULT '',
      context text NOT NULL DEFAULT 'command_center', created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  const repo = new PostgresEcosystemRepository(pool);
  const userId = randomUUID();
  await pool.query('INSERT INTO users(id,email,username,password_hash,display_name) VALUES($1,$2,$3,$4,$5)', [userId, 'eco@test.dev', 'eco', 'x', 'Eco']);

  const agent = await repo.upsertPersonalAgent({
    id: randomUUID(), userId, name: 'Sylora', kind: 'personal', locale: 'uk',
    permissions: { live_assist: true }, contexts: { live: 'creator_assistant' },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });
  assert.equal((await repo.findPersonalAgent(userId)).id, agent.id);
  await repo.patchPersonalAgent(userId, { privacyControls: { memory: false } });
  await repo.patchPersonalAgent(userId, { permissions: { memory_read: false } });
  const patchedAgent = await repo.findPersonalAgent(userId);
  assert.equal(patchedAgent.privacyControls.memory, false);
  assert.equal(patchedAgent.permissions.live_assist, true);
  assert.equal(patchedAgent.permissions.memory_read, false);
  const staleColdStart = await repo.upsertPersonalAgent({
    id: randomUUID(), userId, name: 'Sylora', kind: 'personal', locale: 'uk',
    permissions: { memory_read: true }, contexts: {}, privacyControls: { memory: true },
    proactiveLevel: 'IMPORTANT_ONLY', voicePersonality: 'warm',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });
  assert.equal(staleColdStart.id, agent.id);
  assert.equal(staleColdStart.privacyControls.memory, false);
  assert.equal(staleColdStart.permissions.memory_read, false);
  assert.equal(staleColdStart.permissions.live_assist, true);

  const identity = await repo.upsertIdentity({
    userId, verifiedPerson: false, creatorPersona: { headline: 'Maker' }, professional: { skills: ['Flutter'] },
    portfolio: [], interests: ['AI'], privacy: { profile: 'public' }, reputationRefs: {}, agentId: agent.id,
    updatedAt: new Date().toISOString()
  });
  await repo.patchIdentity({ id: userId, username: 'eco', displayName: 'Eco' }, { professional: { title: 'Architect' } });
  await repo.patchIdentity({ id: userId, username: 'eco', displayName: 'Eco' }, { interests: ['Security'] });
  const patchedIdentity = await repo.getIdentity(userId);
  assert.equal(patchedIdentity.creatorPersona.headline, 'Maker');
  assert.equal(patchedIdentity.professional.title, 'Architect');
  assert.deepEqual(patchedIdentity.interests, ['Security']);
  const staleIdentityCreate = await repo.upsertIdentity({
    userId, verifiedPerson: true, creatorPersona: {}, professional: {}, portfolio: [], interests: [],
    privacy: {}, reputationRefs: { trust: 'forged' }, agentId: null, updatedAt: new Date().toISOString()
  });
  assert.equal(staleIdentityCreate.professional.title, 'Architect');
  assert.deepEqual(staleIdentityCreate.interests, ['Security']);
  assert.equal(staleIdentityCreate.verifiedPerson, false);
  assert.ok(identity.userId);

  const nodeA = await repo.createKgNode({
    id: randomUUID(), ownerId: userId, type: 'skill', label: 'Flutter', data: {}, privacy: 'public',
    provenance: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null
  });
  const nodeB = await repo.createKgNode({
    id: randomUUID(), ownerId: userId, type: 'project', label: 'App', data: {}, privacy: 'private',
    provenance: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null
  });
  await repo.createKgEdge({
    id: randomUUID(), ownerId: userId, fromId: nodeA.id, toId: nodeB.id, type: 'related', data: {}, privacy: 'private',
    createdAt: new Date().toISOString(), deletedAt: null
  });
  assert.equal((await repo.listKgNodes(userId)).length, 2);
  assert.equal((await repo.listKgEdges(userId)).length, 1);
  assert.equal(await repo.softDeleteKgNode(userId, nodeB.id), true);
  assert.equal((await repo.listKgNodes(userId)).length, 1);

  const catalog = await repo.upsertAgentCatalog({
    id: randomUUID(), developerId: 'sylora-platform', slug: 'translator', name: 'Translator', summary: 't',
    category: 'translator', permissions: ['translate'], capabilities: ['translate'], tools: [], pricing: { model: 'free' },
    version: '0.1.0', status: 'sandbox', securityReview: 'pending', installs: 0, revenueShareBps: 7000,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });
  await repo.createInstall({
    id: randomUUID(), userId, orgId: null, agentId: catalog.id, permissions: catalog.permissions,
    status: 'installed', installedAt: new Date().toISOString(), removedAt: null
  });
  await repo.bumpAgentInstalls(catalog.id);
  assert.equal((await repo.listInstalls(userId)).length, 1);
  assert.equal((await repo.findAgent(catalog.id)).installs, 1);

  const developerApp = await repo.createDeveloperApp({
    id: randomUUID(), ownerId: userId, name: 'Test App', description: '', scopes: ['identity.read'],
    redirectUris: [], webhookUrl: '', status: 'sandbox', rateLimitPerMinute: 60,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });
  const developerKey = await repo.createDeveloperApiKey({
    id: randomUUID(), appId: developerApp.id, ownerId: userId, prefix: 'syl_test_key', hash: 'a'.repeat(64),
    label: 'test', lastUsedAt: null, revokedAt: null, createdAt: new Date().toISOString()
  });
  assert.equal((await repo.listDeveloperApps(userId)).length, 1);
  assert.equal((await repo.listDeveloperApiKeys(userId, developerApp.id))[0].id, developerKey.id);
  assert.equal((await repo.resolveDeveloperApiKey('a'.repeat(64))).app.id, developerApp.id);
  assert.equal((await repo.revokeDeveloperApiKey(userId, developerApp.id, developerKey.id)).id, developerKey.id);
  assert.equal(await repo.resolveDeveloperApiKey('a'.repeat(64)), null);

  const org = await repo.createOrg({ id: randomUUID(), ownerId: userId, name: 'Acme', description: '', createdAt: new Date().toISOString() });
  await repo.createMembership({ id: randomUUID(), orgId: org.id, userId, role: 'owner', joinedAt: new Date().toISOString() });
  await repo.upsertControlPlane({
    orgId: org.id, allowlist: [], blocklist: [], budgets: { aiTokensPerDay: 1 }, killSwitch: false,
    requireApprovalFor: ['EXECUTE_ALLOWED'], policies: [], updatedAt: new Date().toISOString()
  });
  assert.equal((await repo.listOrgsForUser(userId))[0].name, 'Acme');
  assert.equal((await repo.getControlPlane(org.id)).killSwitch, false);

  await repo.createActivity({
    id: randomUUID(), userId, agentId: agent.id, kind: 'chat', summary: 'hello', dataUsed: [], reason: '',
    context: 'command_center', createdAt: new Date().toISOString()
  });
  assert.equal((await repo.listActivity(userId, 10)).length, 1);

  assert.ok(sql010.includes('personal_agents'));
  await pool.end();
});
