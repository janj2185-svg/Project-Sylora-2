import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ACTION_LEVELS, canViewerAccess, mergeAiPermissions } from '../src/ecosystem/permissions.mjs';
import { createNode, visibleNodes } from '../src/ecosystem/knowledge-graph.mjs';
import { createActionRecord, canExecute } from '../src/ecosystem/action-engine.mjs';
import { createAgentManifest } from '../src/ecosystem/agents.mjs';
import { localDetectLanguage } from '../src/ecosystem/translation.mjs';
import { applyEvidence, emptyReputation } from '../src/ecosystem/reputation.mjs';
import { handleEcosystemRoutes } from '../src/ecosystem/routes.mjs';
import { sanitizeIdentityRecord } from '../src/ecosystem/identity.mjs';

async function startServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-eco-'));
  process.env.SYLORA_DATA_FILE = path.join(dir, 'data.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.NODE_ENV = 'test';
  const { server } = await import(`../src/server.mjs?eco=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  return { server, base, dir };
}

async function req(base, pathname, { method = 'GET', token, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${pathname}`, { method, headers, body: body == null ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test('permission privacy levels and AI defaults are explicit', () => {
  assert.equal(canViewerAccess('public', 'public'), true);
  assert.equal(canViewerAccess('private', 'follower'), false);
  assert.equal(canViewerAccess('ai_only', 'ai'), true);
  assert.equal(mergeAiPermissions({ live_assist: true }).live_assist, true);
  assert.equal(mergeAiPermissions({}).execute_writes, false);
});

test('knowledge graph hides private nodes from outsiders', () => {
  const owner = 'u1';
  const nodes = [
    createNode({ id: '1', ownerId: owner, type: 'skill', label: 'Flutter', privacy: 'public' }),
    createNode({ id: '2', ownerId: owner, type: 'document', label: 'Secret', privacy: 'private' })
  ];
  assert.equal(visibleNodes(nodes, { viewerId: 'other', relation: 'public' }).length, 1);
  assert.equal(visibleNodes(nodes, { viewerId: owner, relation: 'self' }).length, 2);
});

test('action engine requires confirmation for critical publishes', () => {
  const action = createActionRecord({ id: 'a1', userId: 'u1', type: 'publish_post', level: ACTION_LEVELS.REQUEST_CONFIRMATION, input: { text: 'hi' } });
  assert.equal(action.confirmationRequired, true);
  assert.equal(canExecute(action, ACTION_LEVELS.EXECUTE_ALLOWED).ok, false);
  assert.equal(canExecute({ ...action, status: 'confirmed' }, ACTION_LEVELS.EXECUTE_ALLOWED).ok, true);
});

test('agent manifests reject unknown categories', () => {
  assert.throws(() => createAgentManifest({ id: '1', developerId: 'd', slug: 'x', name: 'X', summary: 's', category: 'nope' }));
  const ok = createAgentManifest({ id: '1', developerId: 'd', slug: 'Live Moderator!', name: 'Live Moderator', summary: 'helps', category: 'live_moderator' });
  assert.equal(ok.slug, 'livemoderator');
});

test('translation language detect understands Ukrainian cues', () => {
  assert.equal(localDetectLanguage('це тестове повідомлення і так'), 'uk');
});

test('reputation reasons stay transparent and bounded', () => {
  let rep = emptyReputation('u1');
  rep = applyEvidence(rep, 'creator', 5, 'Completed verified LIVE');
  assert.equal(rep.dimensions.creator.score, 5);
  assert.match(rep.dimensions.creator.reasons[0].reason, /LIVE/);
});

test('identity read sanitizer strips sensitive legacy JSON keys', () => {
  const safe = sanitizeIdentityRecord({
    userId: 'user-1',
    username: 'safe_user',
    displayName: 'Safe User',
    passwordHash: 'top-level-secret',
    creatorPersona: { headline: 'Builder', passwordHash: 'nested-secret' },
    professional: { title: 'Architect', role: 'admin', password_hash: 'nested-hash' },
    portfolio: [{ title: 'Work', url: 'https://example.com', secret: 'hidden' }],
    privacy: { profile: 'public', password: 'hidden' },
    reputationRefs: { trust: null, secret: 'hidden' }
  });
  assert.equal(safe.professional.title, 'Architect');
  assert.equal(safe.creatorPersona.headline, 'Builder');
  assert.equal(safe.portfolio[0].title, 'Work');
  assert.doesNotMatch(JSON.stringify(safe), /password|nested-secret|nested-hash|"role"|"secret"/i);
});

test('async ecosystem routes expose only known validation errors', async () => {
  const user = { id: 'user-1' };
  const routeContext = ({ pathname, method, input, ecosystem, responses = [] }) => ({
    req: { method },
    res: {},
    url: new URL(`http://localhost${pathname}`),
    json: (_res, status, payload) => { responses.push({ status, payload }); },
    body: async () => input,
    requireUser: async () => user,
    route: () => null,
    safeText: value => String(value || ''),
    ecosystem,
    store: { now: () => new Date().toISOString() }
  });

  const proactiveResponses = [];
  const proactiveContext = routeContext({
    pathname: '/api/ai/proactive',
    method: 'PATCH',
    input: { level: 'always' },
    responses: proactiveResponses,
    ecosystem: { setProactiveLevelAsync: async () => { throw new Error('INVALID_PROACTIVE_LEVEL'); } }
  });
  assert.equal(await handleEcosystemRoutes(proactiveContext), true);
  assert.deepEqual(proactiveResponses[0], {
    status: 400,
    payload: {
      error: 'INVALID_PROACTIVE_LEVEL',
      code: 'INVALID_PROACTIVE_LEVEL',
      message: 'Unsupported proactive level.'
    }
  });

  const scopeResponses = [];
  const scopeContext = routeContext({
    pathname: '/api/developer/apps',
    method: 'POST',
    input: { scopes: ['database.drop'] },
    responses: scopeResponses,
    ecosystem: { createAppAsync: async () => { throw new Error('INVALID_SCOPES:database.drop'); } }
  });
  assert.equal(await handleEcosystemRoutes(scopeContext), true);
  assert.deepEqual(scopeResponses[0], {
    status: 400,
    payload: {
      error: 'INVALID_SCOPES',
      code: 'INVALID_SCOPES',
      message: 'One or more requested scopes are invalid.'
    }
  });
  assert.doesNotMatch(JSON.stringify(scopeResponses[0]), /database\.drop/);

  const repositoryError = new Error('SELECT password_hash FROM users; /srv/private; secret=abc');
  await assert.rejects(() => handleEcosystemRoutes(routeContext({
    pathname: '/api/developer/apps',
    method: 'POST',
    input: { scopes: ['identity.read'] },
    ecosystem: { createAppAsync: async () => { throw repositoryError; } }
  })), error => error === repositoryError);
  await assert.rejects(() => handleEcosystemRoutes(routeContext({
    pathname: '/api/ai/command',
    method: 'POST',
    input: { text: 'show my messages' },
    ecosystem: {
      ensurePersonalAgentAsync: async () => ({}),
      universalCommand: async () => { throw repositoryError; }
    }
  })), error => error === repositoryError);
});

test('ecosystem APIs: identity, kg, agents, developer keys, translate, orgs', async () => {
  const { server, base, dir } = await startServer();
  try {
    const reg = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { email: 'eco@example.com', username: 'eco_user', password: 'password123' }
    });
    assert.equal(reg.status, 201);
    const token = reg.data.token;

    const identity = await req(base, '/api/identity', {
      method: 'PATCH',
      token,
      body: { professional: { title: 'Designer', skills: ['Flutter'] }, privacy: { professional: 'connections' } }
    });
    assert.equal(identity.status, 200);
    assert.equal(identity.data.identity.professional.title, 'Designer');

    const dash = await req(base, '/api/ai/dashboard', { token });
    assert.equal(dash.status, 200);
    assert.equal(dash.data.agent.kind, 'personal');
    assert.equal(dash.data.access.execute_writes, false);

    const node = await req(base, '/api/kg/nodes', {
      method: 'POST',
      token,
      body: { type: 'skill', label: 'Flutter', privacy: 'public' }
    });
    assert.equal(node.status, 201);

    const graph = await req(base, '/api/kg', { token });
    assert.equal(graph.status, 200);
    assert.ok(graph.data.nodes.length >= 1);

    const agents = await req(base, '/api/agents');
    assert.equal(agents.status, 200);
    assert.ok(agents.data.agents.length >= 3);
    const install = await req(base, `/api/agents/${agents.data.agents[0].id}/install`, { method: 'POST', token, body: {} });
    assert.equal(install.status, 201);

    const app = await req(base, '/api/developer/apps', {
      method: 'POST',
      token,
      body: { name: 'Demo App', scopes: ['identity.read'] }
    });
    assert.equal(app.status, 201);
    const key = await req(base, `/api/developer/apps/${app.data.app.id}/keys`, { method: 'POST', token, body: { label: 'ci' } });
    assert.equal(key.status, 201);
    assert.match(key.data.raw, /^syl_/);

    const v1 = await fetch(`${base}/api/v1/identity/me`, { headers: { authorization: `Bearer ${key.data.raw}` } });
    assert.equal(v1.status, 200);
    const keys = await req(base, `/api/developer/apps/${app.data.app.id}/keys`, { token });
    assert.equal(keys.status, 200);
    assert.equal(keys.data.keys.length, 1);
    assert.equal('hash' in keys.data.keys[0], false);
    const revoked = await req(base, `/api/developer/apps/${app.data.app.id}/keys/${key.data.key.id}`, { method: 'DELETE', token });
    assert.equal(revoked.status, 200);
    const afterRevoke = await fetch(`${base}/api/v1/identity/me`, { headers: { authorization: `Bearer ${key.data.raw}` } });
    assert.equal(afterRevoke.status, 401);

    const tr = await req(base, '/api/translate', { method: 'POST', token, body: { text: 'привіт світе', targetLang: 'en' } });
    assert.equal(tr.status, 200);
    assert.equal(tr.data.job.result.originalPreserved, true);

    const org = await req(base, '/api/orgs', { method: 'POST', token, body: { name: 'Acme AI' } });
    assert.equal(org.status, 201);
    const plane = await req(base, `/api/orgs/${org.data.organization.id}/ai-control`, { token });
    assert.equal(plane.status, 200);
    assert.equal(plane.data.plane.killSwitch, false);

    const plan = await req(base, '/api/studio/ai/plan', { method: 'POST', token, body: { topic: 'Flutter in Poland' } });
    assert.equal(plan.status, 200);
    assert.ok(plan.data.plan.structure.length >= 3);
    const confirmedPlan = await req(base, `/api/studio/ai/plan/${plan.data.action.id}/confirm`, { method: 'POST', token, body: {} });
    assert.equal(confirmedPlan.status, 200);
    assert.equal(confirmedPlan.data.ok, true);
    assert.ok(confirmedPlan.data.scene?.name);

    const negotiation = await req(base, '/api/agents/negotiations', {
      method: 'POST',
      token,
      body: { toAgentId: agents.data.agents[0].id, topic: 'price', message: 'Need a quote' }
    });
    assert.equal(negotiation.status, 201);
    assert.equal(negotiation.data.negotiation.reply.requiresUserConfirmation, true);
    const confirmedNeg = await req(base, `/api/agents/negotiations/${negotiation.data.negotiation.id}/confirm`, { method: 'POST', token, body: {} });
    assert.equal(confirmedNeg.status, 200);
    assert.equal(confirmedNeg.data.executed, false);

    const team = await req(base, `/api/orgs/${org.data.organization.id}/teams`, { method: 'POST', token, body: { name: 'Product' } });
    assert.equal(team.status, 201);
    const doc = await req(base, `/api/orgs/${org.data.organization.id}/documents`, { method: 'POST', token, body: { title: 'Playbook', body: 'Internal' } });
    assert.equal(doc.status, 201);
    const workspace = await req(base, `/api/orgs/${org.data.organization.id}/workspace`, { token });
    assert.equal(workspace.status, 200);
    assert.equal(workspace.data.teams.length, 1);
    assert.equal(workspace.data.documents.length, 1);

    const center = await req(base, '/api/ai/command-center?view=studio', { token });
    assert.equal(center.status, 200);
    assert.equal(center.data.pack.role, 'creator_assistant');
    assert.match(center.data.pack.instruction, /Creator Assistant/i);

    const status = await req(base, '/api/ecosystem/status');
    assert.equal(status.status, 200);
    assert.match(status.data.core, /personal_ai/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('AI-to-AI module never auto-executes financial actions', async () => {
  const { createNegotiation, draftBusinessReply, confirmNegotiation } = await import('../src/ecosystem/ai-to-ai.mjs');
  const negotiation = createNegotiation({
    id: 'n1', userId: 'u1', fromAgentId: 'p1', toAgentId: 'b1', topic: 'booking', message: 'Book Friday'
  });
  const reply = draftBusinessReply(negotiation, { name: 'Biz' });
  assert.equal(reply.binding, false);
  const confirmed = confirmNegotiation(negotiation);
  assert.equal(confirmed.ok, true);
  assert.equal(confirmed.negotiation.status, 'confirmed');
});
