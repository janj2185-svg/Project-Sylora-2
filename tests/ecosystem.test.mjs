import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EcosystemService, resolveActionLevel, normalizePermissions } from '../src/ecosystem/core.mjs';
import { Store } from '../src/store.mjs';

test('permission and action level contracts stay conservative', () => {
  const perms = normalizePermissions({ business: true, calendar: false });
  assert.equal(perms.profile, true);
  assert.equal(perms.calendar, false);
  assert.equal(perms.business, true);
  assert.equal(resolveActionLevel({ permissionGranted: true, financial: true }), 'REQUEST_CONFIRMATION');
  assert.equal(resolveActionLevel({ permissionGranted: false }), 'PROPOSE');
  assert.equal(resolveActionLevel({ permissionGranted: true }), 'EXECUTE_ALLOWED');
});

test('ecosystem service wires identity, knowledge, agents and developer apps', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-eco-'));
  const store = new Store(path.join(dir, 'db.json')).load();
  const user = { id: store.id(), username: 'ada', displayName: 'Ada' };
  const eco = new EcosystemService({ store });
  const identity = eco.updateIdentity(user, { skills: ['Flutter', 'Design'], visibility: 'connections', professionalIdentity: 'Product designer' });
  assert.equal(identity.visibility, 'connections');
  assert.deepEqual(identity.skills, ['Flutter', 'Design']);
  const perms = eco.setPermissions(user.id, { agents: true, business: true });
  assert.equal(perms.agents, true);
  const a = eco.upsertKnowledgeNode(user.id, { type: 'skill', refId: 'flutter', label: 'Flutter', visibility: 'public' });
  const b = eco.upsertKnowledgeNode(user.id, { type: 'place', refId: 'poland', label: 'Poland', visibility: 'public' });
  const edge = eco.linkKnowledge(user.id, a.id, b.id, 'located_in');
  assert.ok(edge);
  assert.equal(eco.knowledgeSummary(user.id).nodes, 3); // identity node + 2
  const agents = eco.listAgents();
  assert.ok(agents.length >= 6);
  const installed = eco.installAgent(user.id, agents[0].id);
  assert.equal(installed.agent.id, agents[0].id);
  const app = eco.createDeveloperApp(user.id, { name: 'Demo App', scopes: ['identity.read', 'agents.read', 'not-a-scope'] });
  assert.ok(app.apiKey.secret.startsWith('sk_sandbox_'));
  assert.deepEqual(app.app.scopes, ['identity.read', 'agents.read']);
  const org = eco.createOrganization(user.id, { name: 'Northwind' });
  const policy = eco.updateOrgPolicy(org.id, user.id, { killSwitch: true, budgets: { aiTokensDaily: 10 } });
  assert.equal(policy.killSwitch, true);
  assert.equal(policy.budgets.aiTokensDaily, 10);
  const search = eco.aiSearch('Flutter designer Poland', { users: [user], agents, businesses: [], communities: [], courses: [], posts: [] });
  assert.ok(search.results.some(r => r.type === 'user' || r.type === 'agent'));
});

test('ecosystem APIs are available on the running core', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-eco-api-'));
  process.env.NODE_ENV = 'test';
  process.env.SYLORA_DATA_FILE = path.join(dir, 'db.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  const { server } = await import(`../src/server.mjs?eco=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (pathname, options = {}) => {
    const response = await fetch(`${base}${pathname}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
    const json = await response.json();
    assert.equal(response.ok, true, JSON.stringify(json));
    return json;
  };
  try {
    const status = await call('/api/ecosystem/status');
    assert.ok(status.core.includes('personal-ai'));
    const alice = await call('/api/auth/register', { method: 'POST', body: JSON.stringify({ email: 'eco@test.dev', username: 'ecoalice', password: 'password123' }) });
    const auth = { authorization: `Bearer ${alice.token}` };
    const center = await call('/api/ai/command-center', { headers: auth });
    assert.equal(center.permissions.profile, true);
    await call('/api/ai/permissions', { method: 'PUT', headers: auth, body: JSON.stringify({ permissions: { ...center.permissions, business: true } }) });
    assert.equal((await call('/api/ai/permissions', { headers: auth })).permissions.business, true);
    const identity = await call('/api/identity', { method: 'PUT', headers: auth, body: JSON.stringify({ skills: ['AI'], visibility: 'followers' }) });
    assert.equal(identity.identity.visibility, 'followers');
    const memory = await call('/api/ai/memory', { method: 'POST', headers: auth, body: JSON.stringify({ label: 'City', value: 'Warsaw' }) });
    const exported = await call('/api/ai/memory/export', { headers: auth });
    assert.ok(exported.memories.some(m => m.id === memory.memory.id));
    const agents = await call('/api/agents', { headers: auth });
    assert.ok(agents.agents.length > 0);
    await call(`/api/agents/${agents.agents[0].id}/install`, { method: 'POST', headers: auth, body: '{}' });
    const app = await call('/api/developer/apps', { method: 'POST', headers: auth, body: JSON.stringify({ name: 'Partner SDK', scopes: ['identity.read'] }) });
    assert.ok(app.apiKey.secret);
    const org = await call('/api/organizations', { method: 'POST', headers: auth, body: JSON.stringify({ name: 'Acme AI' }) });
    const policy = await call(`/api/organizations/${org.organization.id}/ai-policy`, { method: 'PUT', headers: auth, body: JSON.stringify({ killSwitch: false }) });
    assert.equal(policy.policy.killSwitch, false);
    const translation = await call('/api/translation/text', { method: 'POST', headers: auth, body: JSON.stringify({ text: 'Hello', targetLang: 'uk' }) });
    assert.equal(translation.translation.status, 'sandbox');
    await call('/api/ai/memory/purge', { method: 'POST', headers: auth, body: '{}' });
    assert.equal((await call('/api/ai/history', { headers: auth })).memories.length, 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
