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

    const status = await req(base, '/api/ecosystem/status');
    assert.equal(status.status, 200);
    assert.match(status.data.core, /personal_ai/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
