import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../src/store.mjs';
import {
  normalizeAiPermissions, hasAiPermission, privacyAllows, ACTION_LEVELS
} from '../src/ecosystem/permissions.mjs';
import { createActionEngine } from '../src/ecosystem/action-engine.mjs';
import { ensurePersonalAiState, personalAiDashboard } from '../src/ecosystem/personal-ai.mjs';
import { ensureIdentity, patchIdentity, presentIdentity } from '../src/ecosystem/identity.mjs';
import { upsertNode, linkNodes, queryGraph } from '../src/ecosystem/knowledge-graph.mjs';
import { seedStarterAgents, listMarketplace, installAgent } from '../src/ecosystem/agents.mjs';
import { registerApp, createApiKey, hashSecret } from '../src/ecosystem/developer-platform.mjs';
import { detectLanguage, sandboxTranslate, translationProviderStatus } from '../src/ecosystem/translation.mjs';
import { createOrganization, setKillSwitch, installOrgAgent } from '../src/ecosystem/business.mjs';
import { createProduct, createSandboxOrder, paymentMode } from '../src/ecosystem/commerce.mjs';
import { applyReputationEvent, explainReputation } from '../src/ecosystem/reputation.mjs';
import { createProvenanceRecord } from '../src/ecosystem/provenance.mjs';
import { aiSearch } from '../src/ecosystem/search.mjs';
import { buildLivePackage } from '../src/ecosystem/creator-studio-ai.mjs';
import { createMetrics, aiQuotaGate } from '../src/ecosystem/observability.mjs';
import { handleEcosystemApi } from '../src/ecosystem/router.mjs';

function memStore() {
  const store = new Store('/tmp/sylora-ecosystem-test.json');
  store.data = JSON.parse(JSON.stringify(store.data));
  store.save = () => {};
  return store;
}

test('AI permissions normalize and never silent-enable execute', () => {
  const perms = normalizeAiPermissions({ execute_allowed: 'yes', live_assist: true });
  assert.equal(perms.live_assist, true);
  assert.equal(perms.execute_allowed, false);
  assert.equal(hasAiPermission(perms, 'live_assist'), true);
});

test('privacy levels gate identity fields', () => {
  assert.equal(privacyAllows({ level: 'public', viewerRelation: 'public' }), true);
  assert.equal(privacyAllows({ level: 'private', viewerRelation: 'follower' }), false);
  assert.equal(privacyAllows({ level: 'ai_only', viewerRelation: 'follower', purpose: 'ai' }), true);
});

test('action engine requires confirmation for critical levels', async () => {
  const audits = [];
  const engine = createActionEngine({
    id: () => 'a1',
    now: () => 't',
    persistAudit: async (e) => audits.push(e)
  });
  const planned = await engine.plan({
    userId: 'u1', type: 'send', level: 'REQUEST_CONFIRMATION', allowed: true, input: { x: 1 }
  });
  assert.equal(planned.action.status, 'pending_confirmation');
  assert.ok(ACTION_LEVELS.includes('EXECUTE_ALLOWED'));
  const denied = await engine.plan({
    userId: 'u1', type: 'send', level: 'EXECUTE_ALLOWED', allowed: false
  });
  assert.equal(denied.status, 'denied');
});

test('personal AI dashboard exposes knowledge of access and tools', () => {
  const store = memStore();
  const record = ensurePersonalAiState(store, 'u1', () => 'now');
  const dash = personalAiDashboard(record, [{ label: 'lang', value: 'uk' }], []);
  assert.equal(dash.displayName, 'Sylora');
  assert.ok(dash.tools.length >= 5);
  assert.ok(dash.whatAiKnows.longMemories.length === 1);
});

test('identity privacy redacts fields for public viewers', () => {
  const store = memStore();
  const user = { id: 'u1', username: 'ada', displayName: 'Ada' };
  const identity = ensureIdentity(store, user, () => 'now');
  patchIdentity(identity, { skills: ['flutter'], privacy: { skills: 'private' } });
  const publicView = presentIdentity(identity, { viewerRelation: 'public' });
  assert.equal(publicView.skills, null);
  const selfView = presentIdentity(identity, { viewerRelation: 'self' });
  assert.deepEqual(selfView.skills, ['flutter']);
});

test('knowledge graph is permission-aware', () => {
  const store = memStore();
  const now = () => 'now';
  const mine = upsertNode(store, { id: 'n1', type: 'skill', label: 'Flutter', ownerId: 'u1', privacy: 'private' }, now);
  upsertNode(store, { id: 'n2', type: 'skill', label: 'Public Design', ownerId: 'u2', privacy: 'public' }, now);
  linkNodes(store, { id: 'e1', fromId: mine.id, toId: 'n2', rel: 'related', ownerId: 'u1', privacy: 'private' }, now);
  const forOwner = queryGraph(store, { userId: 'u1', q: 'flutter' });
  assert.equal(forOwner.nodes.some(n => n.id === 'n1'), true);
  const forOther = queryGraph(store, { userId: 'u2', q: 'flutter', relation: 'public' });
  assert.equal(forOther.nodes.some(n => n.id === 'n1'), false);
});

test('agent marketplace seeds and installs with granted permissions', () => {
  const store = memStore();
  seedStarterAgents(store, () => `id-${store.data.agentCatalog.length}`, () => 'now');
  const agents = listMarketplace(store);
  assert.ok(agents.length >= 5);
  const install = installAgent(store, {
    id: 'inst1', userId: 'u1', agentId: agents[0].id, grantedPermissions: agents[0].permissions.slice(0, 1)
  }, () => 'now');
  assert.equal(install.userId, 'u1');
});

test('developer platform issues hashed API keys once', () => {
  const store = memStore();
  const app = registerApp(store, { id: 'app1', ownerId: 'u1', name: 'Demo', scopes: ['identity.read'] }, () => 'now');
  const { key, secret } = createApiKey(store, { id: 'k1', appId: app.id, ownerId: 'u1' }, () => 'now');
  assert.equal(key.tokenHash, hashSecret(secret));
  assert.ok(secret.startsWith('syl_sk_'));
});

test('translation layer labels synthetic sandbox output', () => {
  assert.equal(detectLanguage('Привіт світе'), 'uk');
  const translated = sandboxTranslate('Hello', { target: 'uk' });
  assert.equal(translated.labeled, true);
  assert.equal(translationProviderStatus({}).speechToText, 'blocked');
});

test('business control plane kill switch blocks org agent installs', () => {
  const store = memStore();
  const org = createOrganization(store, { id: 'o1', name: 'Acme', ownerId: 'u1' }, () => 'now');
  setKillSwitch(store, org.id, true, 'u1', () => 'now');
  assert.throws(() => installOrgAgent(store, { id: 'oa1', orgId: org.id, agentId: 'agent', installedBy: 'u1' }, () => 'now'), /AI_KILL_SWITCH/);
});

test('commerce sandbox is separated from production payments', () => {
  assert.equal(paymentMode({}), 'sandbox');
  const store = memStore();
  const product = createProduct(store, { id: 'p1', creatorId: 'c1', type: 'digital', title: 'Pack', priceCents: 500 }, () => 'now');
  const order = createSandboxOrder(store, { id: 'o1', buyerId: 'b1', productId: product.id }, () => 'now', {});
  assert.equal(order.paymentMode, 'sandbox');
});

test('reputation is explainable', () => {
  const store = memStore();
  applyReputationEvent(store, { id: 'r1', userId: 'u1', dimension: 'creator', delta: 10, reason: 'quality LIVE' }, () => 'now');
  const explained = explainReputation(store, 'u1');
  assert.equal(explained.transparent, true);
  assert.equal(explained.scores.creator.value, 10);
  assert.match(explained.scores.creator.reasons[0].reason, /LIVE/);
});

test('provenance records AI involvement', () => {
  const store = memStore();
  const record = createProvenanceRecord(store, {
    id: 'pr1', contentId: 'post1', contentType: 'post', creatorId: 'u1', creationMethod: 'ai_assisted', aiInvolvement: 'modified'
  }, () => 'now');
  assert.equal(record.verification.openStandardReady, true);
  assert.equal(record.aiInvolvement, 'modified');
});

test('AI search parses multilingual creator intent', () => {
  const store = memStore();
  store.data.identities = [{
    userId: 'u9', displayName: 'Oksana', professionalIdentity: 'designer', skills: ['flutter'], privacy: { skills: 'public' }
  }];
  const result = aiSearch(store, 'Знайди мені українського дизайнера в Польщі, який працює з Flutter.');
  assert.equal(result.filters.skill, 'flutter');
  assert.ok(result.results.some(r => r.id === 'u9'));
});

test('creator studio AI returns approval-gated LIVE package', () => {
  const plan = buildLivePackage('Flutter tips', { id: 'plan1', creatorId: 'u1' }, () => 'now');
  assert.equal(plan.requiresCreatorApproval, true);
  assert.ok(plan.scenes.length >= 2);
});

test('observability metrics and quota gate', () => {
  const metrics = createMetrics();
  metrics.markRequest(true, 12);
  metrics.markAi({ tokensIn: 10, tokensOut: 20 });
  const snap = metrics.snapshot();
  assert.equal(snap.requests, 1);
  assert.equal(snap.ai.tokensOut, 20);
  assert.equal(aiQuotaGate({ usedTokens: 10, limitTokens: 5 }).allowed, false);
});

test('ecosystem HTTP router serves status and personal AI', async () => {
  const store = memStore();
  store.data.users.push({ id: 'u1', username: 'ada', displayName: 'Ada', role: 'user' });
  let statusCode = 0;
  let payload = null;
  const res = {
    writeHead() {},
    end() {}
  };
  const json = (_res, code, body) => { statusCode = code; payload = body; };
  await handleEcosystemApi({
    req: {},
    res,
    url: new URL('http://localhost/api/ecosystem/status'),
    path: '/api/ecosystem/status',
    method: 'GET',
    json,
    store,
    body: async () => ({}),
    requireUser: async () => ({ id: 'u1', username: 'ada', role: 'user' }),
    metrics: createMetrics()
  });
  assert.equal(statusCode, 200);
  assert.ok(payload.modules.includes('personal-ai'));

  await handleEcosystemApi({
    req: {},
    res,
    url: new URL('http://localhost/api/ecosystem/personal-ai'),
    path: '/api/ecosystem/personal-ai',
    method: 'GET',
    json,
    store,
    body: async () => ({}),
    requireUser: async () => ({ id: 'u1', username: 'ada', role: 'user' }),
    listMemories: async () => [],
    listPendingActions: async () => [],
    metrics: createMetrics()
  });
  assert.equal(statusCode, 200);
  assert.equal(payload.dashboard.displayName, 'Sylora');
});
