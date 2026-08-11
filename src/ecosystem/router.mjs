import { normalizeAiPermissions } from './permissions.mjs';
import {
  ensurePersonalAiState, personalAiDashboard, exportMemoryBundle, pushShortMemory, logAiActivity, TOOL_REGISTRY
} from './personal-ai.mjs';
import { ensureIdentity, patchIdentity, presentIdentity } from './identity.mjs';
import {
  upsertNode, linkNodes, queryGraph, grantConsent, deleteUserGraphData, exportUserGraph, ensureGraph
} from './knowledge-graph.mjs';
import { seedStarterAgents, listMarketplace, installAgent, uninstallAgent, createAgentManifest, ensureAgents } from './agents.mjs';
import {
  ensureDeveloperPlatform, registerApp, createApiKey, registerWebhook, createOauthGrant, API_SCOPES, recordUsage
} from './developer-platform.mjs';
import { translateText, translationProviderStatus, buildLiveTranslationTurn, detectLanguage } from './translation.mjs';
import { createOrganization, controlPlaneSnapshot, requireOrgRole, setKillSwitch, installOrgAgent, ensureBusiness } from './business.mjs';
import { ensureCommerce, createProduct, createSandboxOrder, revenueDashboard, paymentMode } from './commerce.mjs';
import { ensureReputation, applyReputationEvent, explainReputation, openDispute } from './reputation.mjs';
import { ensureTrust, securityCenter, createPrivacyRequest, labelSyntheticContent, openAppeal } from './trust.mjs';
import { ensureProvenance, createProvenanceRecord, getProvenance } from './provenance.mjs';
import { structuredSearch, aiSearch } from './search.mjs';
import { buildLivePackage, ensureCreatorStudioAi, savePlan } from './creator-studio-ai.mjs';
import { createActionEngine } from './action-engine.mjs';

function route(pattern, path) {
  const pa = pattern.split('/').filter(Boolean);
  const pb = path.split('/').filter(Boolean);
  if (pa.length !== pb.length) return null;
  const params = {};
  for (let i = 0; i < pa.length; i++) {
    if (pa[i].startsWith(':')) params[pa[i].slice(1)] = decodeURIComponent(pb[i]);
    else if (pa[i] !== pb[i]) return null;
  }
  return params;
}

function audit(store, entry) {
  store.data.audit ??= [];
  store.data.audit.unshift({ id: store.id(), at: store.now(), ...entry });
  if (store.data.audit.length > 2000) store.data.audit.length = 2000;
  store.save();
}

/**
 * Ecosystem API router. Returns true if handled.
 * ctx: { req, res, url, path, method, user, body, json, store, requireUser, metrics, listMemories, listPendingActions }
 */
export async function handleEcosystemApi(ctx) {
  const { req, res, path: p, method, json, store, metrics } = ctx;
  const requireUser = async () => {
    const user = await ctx.requireUser(req, res);
    return user;
  };

  // Bootstrap collections once
  ensureGraph(store);
  ensureAgents(store);
  ensureDeveloperPlatform(store);
  ensureBusiness(store);
  ensureCommerce(store);
  ensureReputation(store);
  ensureTrust(store);
  ensureProvenance(store);
  ensureCreatorStudioAi(store);
  seedStarterAgents(store, () => store.id(), () => store.now());

  if (method === 'GET' && p === '/api/ecosystem/status') {
    return json(res, 200, {
      product: 'SYLORA',
      core: 'HUMAN + PERSONAL_AI + IDENTITY + KNOWLEDGE + CREATOR_BUSINESS_ECONOMY + DEVELOPER_ECOSYSTEM',
      modules: [
        'personal-ai', 'identity', 'knowledge-graph', 'action-engine', 'agents', 'developer-platform',
        'translation', 'creator-studio-ai', 'business', 'commerce', 'reputation', 'trust', 'provenance', 'search', 'observability'
      ],
      paymentMode: paymentMode(),
      translation: translationProviderStatus(),
      metrics: metrics?.snapshot?.() || null,
      apiScopes: API_SCOPES,
      tools: TOOL_REGISTRY.map(t => t.id)
    });
  }

  if (method === 'GET' && p === '/api/ecosystem/metrics') {
    const user = await requireUser(); if (!user) return true;
    if (user.role !== 'admin') return json(res, 403, { error: 'ADMIN_REQUIRED' });
    return json(res, 200, metrics?.snapshot?.() || {});
  }

  // —— Personal AI ——
  if (method === 'GET' && p === '/api/ecosystem/personal-ai') {
    const user = await requireUser(); if (!user) return true;
    const record = ensurePersonalAiState(store, user.id, () => store.now());
    const memories = ctx.listMemories ? await ctx.listMemories(user.id) : (store.data.aiMemories || []).filter(m => m.userId === user.id);
    const pending = ctx.listPendingActions ? await ctx.listPendingActions(user.id) : (store.data.aiActions || []).filter(a => a.userId === user.id && a.status === 'pending');
    const knowledge = queryGraph(store, { userId: user.id, purpose: 'ai', limit: 10 });
    return json(res, 200, { dashboard: personalAiDashboard(record, memories, pending, { nodes: knowledge.nodes.length, edges: knowledge.edges.length }) });
  }

  if (method === 'PATCH' && p === '/api/ecosystem/personal-ai/permissions') {
    const user = await requireUser(); if (!user) return true;
    const record = ensurePersonalAiState(store, user.id, () => store.now());
    const input = await ctx.body(req);
    record.permissions = normalizeAiPermissions({ ...record.permissions, ...(input.permissions || input) });
    record.updatedAt = store.now();
    logAiActivity(record, { at: store.now(), type: 'permissions.updated', permissions: record.permissions });
    store.save();
    audit(store, { type: 'ai.permissions.updated', userId: user.id, actorId: user.id });
    return json(res, 200, { permissions: record.permissions });
  }

  if (method === 'POST' && p === '/api/ecosystem/personal-ai/short-memory') {
    const user = await requireUser(); if (!user) return true;
    const record = ensurePersonalAiState(store, user.id, () => store.now());
    const input = await ctx.body(req);
    const text = String(input.text || '').trim().slice(0, 1000);
    if (!text) return json(res, 400, { error: 'TEXT_REQUIRED' });
    pushShortMemory(record, { id: store.id(), text, at: store.now() });
    store.save();
    return json(res, 201, { shortMemory: record.shortMemory.slice(-12) });
  }

  if (method === 'GET' && p === '/api/ecosystem/personal-ai/export') {
    const user = await requireUser(); if (!user) return true;
    const record = ensurePersonalAiState(store, user.id, () => store.now());
    const memories = ctx.listMemories ? await ctx.listMemories(user.id) : (store.data.aiMemories || []).filter(m => m.userId === user.id);
    return json(res, 200, exportMemoryBundle({ record, memories }));
  }

  if (method === 'DELETE' && p === '/api/ecosystem/personal-ai/memory') {
    const user = await requireUser(); if (!user) return true;
    const record = ensurePersonalAiState(store, user.id, () => store.now());
    record.shortMemory = [];
    record.activity.unshift({ at: store.now(), type: 'memory.cleared' });
    store.save();
    if (ctx.clearLongMemories) await ctx.clearLongMemories(user.id);
    else store.data.aiMemories = (store.data.aiMemories || []).filter(m => m.userId !== user.id);
    store.save();
    audit(store, { type: 'ai.memory.cleared', userId: user.id, actorId: user.id });
    return json(res, 200, { cleared: true });
  }

  // —— Identity ——
  if (method === 'GET' && p === '/api/ecosystem/identity/me') {
    const user = await requireUser(); if (!user) return true;
    const identity = ensureIdentity(store, user, () => store.now());
    return json(res, 200, { identity: presentIdentity(identity, { viewerRelation: 'self' }) });
  }

  if (method === 'PATCH' && p === '/api/ecosystem/identity/me') {
    const user = await requireUser(); if (!user) return true;
    const identity = ensureIdentity(store, user, () => store.now());
    patchIdentity(identity, await ctx.body(req));
    identity.updatedAt = store.now();
    store.save();
    return json(res, 200, { identity: presentIdentity(identity, { viewerRelation: 'self' }) });
  }

  {
    const m = route('/api/ecosystem/identity/:userId', p);
    if (method === 'GET' && m) {
      const user = await requireUser(); if (!user) return true;
      const target = (store.data.users || []).find(u => u.id === m.userId);
      if (!target) return json(res, 404, { error: 'USER_NOT_FOUND' });
      const identity = ensureIdentity(store, target, () => store.now());
      const relation = user.id === target.id ? 'self' : 'public';
      return json(res, 200, { identity: presentIdentity(identity, { viewerRelation: relation }) });
    }
  }

  // —— Knowledge Graph ——
  if (method === 'GET' && p === '/api/ecosystem/knowledge') {
    const user = await requireUser(); if (!user) return true;
    const q = String(ctx.url.searchParams.get('q') || '');
    return json(res, 200, queryGraph(store, { userId: user.id, q, purpose: 'ai' }));
  }

  if (method === 'POST' && p === '/api/ecosystem/knowledge/nodes') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    const node = upsertNode(store, {
      id: store.id(),
      type: input.type,
      label: String(input.label || '').slice(0, 160),
      ownerId: user.id,
      privacy: input.privacy || 'private',
      data: input.data || {}
    }, () => store.now());
    audit(store, { type: 'knowledge.node.upserted', userId: user.id, actorId: user.id, payload: { nodeId: node.id, nodeType: node.type } });
    return json(res, 201, { node });
  }

  if (method === 'POST' && p === '/api/ecosystem/knowledge/edges') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    const edge = linkNodes(store, {
      id: store.id(), fromId: input.fromId, toId: input.toId, rel: input.rel, ownerId: user.id, privacy: input.privacy || 'private'
    }, () => store.now());
    return json(res, 201, { edge });
  }

  if (method === 'POST' && p === '/api/ecosystem/knowledge/consent') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    const consent = grantConsent(store, { id: store.id(), userId: user.id, purpose: input.purpose || 'ai', scope: input.scope || 'graph' }, () => store.now());
    return json(res, 201, { consent });
  }

  if (method === 'GET' && p === '/api/ecosystem/knowledge/export') {
    const user = await requireUser(); if (!user) return true;
    return json(res, 200, exportUserGraph(store, user.id));
  }

  if (method === 'DELETE' && p === '/api/ecosystem/knowledge') {
    const user = await requireUser(); if (!user) return true;
    deleteUserGraphData(store, user.id);
    audit(store, { type: 'knowledge.deleted', userId: user.id, actorId: user.id });
    return json(res, 200, { deleted: true });
  }

  // —— Actions ——
  if (method === 'POST' && p === '/api/ecosystem/actions/plan') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    const engine = createActionEngine({
      id: () => store.id(),
      now: () => store.now(),
      persistAudit: (entry) => audit(store, entry)
    });
    store.data.ecosystemActions ??= [];
    const result = await engine.plan({
      userId: user.id,
      agentId: input.agentId || 'personal-ai',
      type: input.type || 'generic',
      level: input.level || 'PROPOSE',
      input: input.input || {},
      permission: input.permission || null,
      allowed: input.allowed !== false
    });
    if (result.action) {
      store.data.ecosystemActions.push(result.action);
      store.save();
      metrics?.markAgentAction?.();
    }
    return json(res, result.status === 'denied' ? 403 : 201, result);
  }

  // —— Agents / Marketplace ——
  if (method === 'GET' && p === '/api/ecosystem/agents') {
    const user = await requireUser(); if (!user) return true;
    const q = String(ctx.url.searchParams.get('q') || '');
    const category = String(ctx.url.searchParams.get('category') || '');
    return json(res, 200, { agents: listMarketplace(store, { q, category }) });
  }

  if (method === 'POST' && p === '/api/ecosystem/agents') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    const manifest = createAgentManifest({
      id: store.id(),
      developerId: user.id,
      name: input.name,
      slug: input.slug || input.name,
      summary: input.summary,
      category: input.category,
      capabilities: input.capabilities || [],
      tools: input.tools || [],
      permissions: input.permissions || [],
      pricing: input.pricing,
      version: input.version,
      sandbox: input.sandbox !== false
    });
    manifest.createdAt = store.now();
    manifest.updatedAt = store.now();
    store.data.agentCatalog.push(manifest);
    store.save();
    return json(res, 201, { agent: manifest });
  }

  if (method === 'POST' && p === '/api/ecosystem/agents/install') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    try {
      const install = installAgent(store, {
        id: store.id(), userId: user.id, agentId: input.agentId, grantedPermissions: input.grantedPermissions || []
      }, () => store.now());
      audit(store, { type: 'agent.installed', userId: user.id, actorId: user.id, payload: { agentId: input.agentId } });
      return json(res, 201, { install });
    } catch (error) {
      return json(res, 404, { error: error.message });
    }
  }

  if (method === 'POST' && p === '/api/ecosystem/agents/uninstall') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    const ok = uninstallAgent(store, { userId: user.id, agentId: input.agentId }, () => store.now());
    return json(res, ok ? 200 : 404, ok ? { uninstalled: true } : { error: 'INSTALL_NOT_FOUND' });
  }

  // —— Developer Platform ——
  if (method === 'GET' && p === '/api/ecosystem/developer/apps') {
    const user = await requireUser(); if (!user) return true;
    return json(res, 200, { apps: store.data.devApps.filter(a => a.ownerId === user.id), scopes: API_SCOPES });
  }

  if (method === 'POST' && p === '/api/ecosystem/developer/apps') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    try {
      const app = registerApp(store, {
        id: store.id(), ownerId: user.id, name: input.name, description: input.description, scopes: input.scopes || [], redirectUris: input.redirectUris || []
      }, () => store.now());
      return json(res, 201, { app });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (method === 'POST' && p === '/api/ecosystem/developer/keys') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    try {
      const { key, secret } = createApiKey(store, { id: store.id(), appId: input.appId, ownerId: user.id, name: input.name }, () => store.now());
      return json(res, 201, { key: { id: key.id, prefix: key.prefix, name: key.name, createdAt: key.createdAt }, secret, note: 'Store the secret now; it cannot be retrieved again.' });
    } catch (error) {
      return json(res, 404, { error: error.message });
    }
  }

  if (method === 'POST' && p === '/api/ecosystem/developer/webhooks') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    try {
      const webhook = registerWebhook(store, { id: store.id(), appId: input.appId, ownerId: user.id, url: input.url, events: input.events || [] }, () => store.now());
      return json(res, 201, { webhook });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (method === 'POST' && p === '/api/ecosystem/developer/oauth/grants') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    const grant = createOauthGrant(store, { id: store.id(), appId: input.appId, userId: user.id, scopes: input.scopes || [] }, () => store.now());
    return json(res, 201, { grant });
  }

  if (method === 'GET' && p === '/api/v1/openapi.json') {
    return json(res, 200, {
      openapi: '3.0.3',
      info: { title: 'SYLORA Public API', version: '0.1.0' },
      paths: {
        '/api/ecosystem/status': { get: { summary: 'Ecosystem status' } },
        '/api/ecosystem/identity/me': { get: { summary: 'Identity' }, patch: { summary: 'Update identity' } },
        '/api/ecosystem/agents': { get: { summary: 'Agent marketplace' } },
        '/api/ecosystem/knowledge': { get: { summary: 'Knowledge graph query' } },
        '/api/ecosystem/search': { get: { summary: 'Structured search' } },
        '/api/ecosystem/search/ai': { post: { summary: 'AI search' } }
      },
      components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' }, apiKey: { type: 'apiKey', in: 'header', name: 'X-Sylora-Key' } } }
    });
  }

  // —— Translation ——
  if (method === 'POST' && p === '/api/ecosystem/translate') {
    const user = await requireUser(); if (!user) return true;
    const started = Date.now();
    const input = await ctx.body(req);
    const result = await translateText(input.text, { target: input.target || 'en', source: input.source });
    metrics?.markTranslation?.(Date.now() - started);
    return json(res, 200, { ...result, detected: detectLanguage(input.text || '') });
  }

  if (method === 'POST' && p === '/api/ecosystem/translate/live-turn') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    return json(res, 200, { turn: buildLiveTranslationTurn({ speakerId: user.id, sourceText: input.text || '', targetLanguages: input.targets || ['en', 'uk'] }), providers: translationProviderStatus() });
  }

  // —— Creator Studio AI ——
  if (method === 'POST' && p === '/api/ecosystem/creator-studio/plan') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    try {
      const plan = buildLivePackage(input.prompt || input.topic, { id: store.id(), creatorId: user.id }, () => store.now());
      savePlan(store, plan);
      return json(res, 201, { plan });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  // —— Business / Control Plane ——
  if (method === 'POST' && p === '/api/ecosystem/orgs') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    try {
      const org = createOrganization(store, { id: store.id(), name: input.name, ownerId: user.id }, () => store.now());
      return json(res, 201, { org });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (method === 'GET' && p === '/api/ecosystem/orgs') {
    const user = await requireUser(); if (!user) return true;
    const memberOf = store.data.orgMembers.filter(m => m.userId === user.id).map(m => m.orgId);
    return json(res, 200, { organizations: store.data.organizations.filter(o => memberOf.includes(o.id)) });
  }

  {
    const m = route('/api/ecosystem/orgs/:id/control-plane', p);
    if (method === 'GET' && m) {
      const user = await requireUser(); if (!user) return true;
      try {
        requireOrgRole(store, m.id, user.id, ['owner', 'admin', 'member']);
        return json(res, 200, controlPlaneSnapshot(store, m.id));
      } catch (error) {
        return json(res, error.message === 'ORG_FORBIDDEN' ? 403 : 404, { error: error.message });
      }
    }
  }

  {
    const m = route('/api/ecosystem/orgs/:id/kill-switch', p);
    if (method === 'POST' && m) {
      const user = await requireUser(); if (!user) return true;
      try {
        requireOrgRole(store, m.id, user.id, ['owner', 'admin']);
        const input = await ctx.body(req);
        const policy = setKillSwitch(store, m.id, !!input.enabled, user.id, () => store.now());
        return json(res, 200, { policy });
      } catch (error) {
        return json(res, error.message === 'ORG_FORBIDDEN' ? 403 : 404, { error: error.message });
      }
    }
  }

  {
    const m = route('/api/ecosystem/orgs/:id/agents', p);
    if (method === 'POST' && m) {
      const user = await requireUser(); if (!user) return true;
      try {
        requireOrgRole(store, m.id, user.id, ['owner', 'admin']);
        const input = await ctx.body(req);
        const row = installOrgAgent(store, { id: store.id(), orgId: m.id, agentId: input.agentId, installedBy: user.id, tools: input.tools || [] }, () => store.now());
        return json(res, 201, { agent: row });
      } catch (error) {
        const code = ['ORG_FORBIDDEN', 'AI_KILL_SWITCH', 'AGENT_BLOCKED', 'AGENT_NOT_ALLOWLISTED'].includes(error.message) ? 403 : 404;
        return json(res, code, { error: error.message });
      }
    }
  }

  // —— Commerce ——
  if (method === 'GET' && p === '/api/ecosystem/commerce/dashboard') {
    const user = await requireUser(); if (!user) return true;
    return json(res, 200, revenueDashboard(store, user.id));
  }

  if (method === 'POST' && p === '/api/ecosystem/commerce/products') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    try {
      const product = createProduct(store, {
        id: store.id(), creatorId: user.id, type: input.type, title: input.title, priceCents: input.priceCents, currency: input.currency, metadata: input.metadata || {}
      }, () => store.now());
      return json(res, 201, { product, paymentMode: paymentMode() });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (method === 'POST' && p === '/api/ecosystem/commerce/orders') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    try {
      const order = createSandboxOrder(store, { id: store.id(), buyerId: user.id, productId: input.productId }, () => store.now());
      return json(res, 201, { order });
    } catch (error) {
      return json(res, error.message === 'PAYMENT_PROVIDER_ADAPTER_REQUIRED' ? 503 : 400, { error: error.message });
    }
  }

  // —— Reputation ——
  if (method === 'GET' && p === '/api/ecosystem/reputation/me') {
    const user = await requireUser(); if (!user) return true;
    return json(res, 200, explainReputation(store, user.id));
  }

  if (method === 'POST' && p === '/api/ecosystem/reputation/events') {
    const user = await requireUser(); if (!user) return true;
    if (user.role !== 'admin') return json(res, 403, { error: 'ADMIN_REQUIRED' });
    const input = await ctx.body(req);
    try {
      const score = applyReputationEvent(store, {
        id: store.id(), userId: input.userId, dimension: input.dimension, delta: input.delta, reason: input.reason, evidence: input.evidence || {}
      }, () => store.now());
      return json(res, 201, { score });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (method === 'POST' && p === '/api/ecosystem/reputation/disputes') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    try {
      const dispute = openDispute(store, { id: store.id(), userId: user.id, dimension: input.dimension, message: input.message }, () => store.now());
      return json(res, 201, { dispute });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  // —— Trust / Security ——
  if (method === 'GET' && p === '/api/ecosystem/security') {
    const user = await requireUser(); if (!user) return true;
    return json(res, 200, securityCenter(store, user.id));
  }

  if (method === 'POST' && p === '/api/ecosystem/privacy/requests') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    try {
      const request = createPrivacyRequest(store, { id: store.id(), userId: user.id, type: input.type }, () => store.now());
      return json(res, 201, { request });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (method === 'POST' && p === '/api/ecosystem/trust/synthetic-label') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    const label = labelSyntheticContent(store, {
      id: store.id(), contentId: input.contentId, contentType: input.contentType || 'post', aiInvolvement: input.aiInvolvement || 'generated', creatorId: user.id
    }, () => store.now());
    return json(res, 201, { label });
  }

  if (method === 'POST' && p === '/api/ecosystem/trust/appeals') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    const appeal = openAppeal(store, { id: store.id(), userId: user.id, reportId: input.reportId, message: input.message }, () => store.now());
    return json(res, 201, { appeal });
  }

  // —— Provenance ——
  if (method === 'POST' && p === '/api/ecosystem/provenance') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    const record = createProvenanceRecord(store, {
      id: store.id(),
      contentId: input.contentId,
      contentType: input.contentType || 'content',
      creatorId: user.id,
      origin: input.origin || 'sylora',
      creationMethod: input.creationMethod || 'human',
      aiInvolvement: input.aiInvolvement || 'none',
      parentId: input.parentId || null,
      metadata: input.metadata || {}
    }, () => store.now());
    return json(res, 201, { record });
  }

  {
    const m = route('/api/ecosystem/provenance/:contentId', p);
    if (method === 'GET' && m) {
      const user = await requireUser(); if (!user) return true;
      const record = getProvenance(store, m.contentId);
      if (!record) return json(res, 404, { error: 'PROVENANCE_NOT_FOUND' });
      return json(res, 200, { record });
    }
  }

  // —— Search ——
  if (method === 'GET' && p === '/api/ecosystem/search') {
    const user = await requireUser(); if (!user) return true;
    const q = String(ctx.url.searchParams.get('q') || '');
    return json(res, 200, structuredSearch(store, q));
  }

  if (method === 'POST' && p === '/api/ecosystem/search/ai') {
    const user = await requireUser(); if (!user) return true;
    const input = await ctx.body(req);
    return json(res, 200, aiSearch(store, input.q || input.query || ''));
  }

  // usage no-op marker for future API key gateway
  if (p.startsWith('/api/ecosystem/') || p.startsWith('/api/v1/')) {
    recordUsage(store, { id: store.id(), appId: 'internal', route: p, status: 404 }, () => store.now());
    return json(res, 404, { error: 'ECOSYSTEM_ROUTE_NOT_FOUND' });
  }

  return false;
}
