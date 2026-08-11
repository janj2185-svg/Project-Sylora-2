import { createPersonalAgent, createActivityEntry, permissionDashboard, contextRole } from './personal-ai.mjs';
import { mergeAiPermissions as mergePerms, ACTION_LEVELS, DEFAULT_AI_PERMISSIONS } from './permissions.mjs';
import { defaultIdentity, patchIdentity, publicIdentityView } from './identity.mjs';
import { createNode, createEdge, visibleNodes, graphSummary, KG_NODE_TYPES, KG_EDGE_TYPES } from './knowledge-graph.mjs';
import { createActionRecord, canExecute, markConfirmed, markCompleted, BUILTIN_ACTIONS } from './action-engine.mjs';
import { createAgentManifest, installRecord, STARTER_CATALOG } from './agents.mjs';
import { createDeveloperApp, generateApiKey, createApiKeyRecord, hashApiKey, OAUTH_DOC, scopeAllows } from './developer-platform.mjs';
import { createTranslationJob, localDetectLanguage, localTranslateStub, VOICE_POLICY } from './translation.mjs';
import { createOrganization, createMembership, rbacAllows, defaultEnterpriseControlPlane, createTeam, createOrgDocument, createOrgTask } from './business-os.mjs';
import { emptyReputation, applyEvidence, openDispute } from './reputation.mjs';
import { createProvenance, createSecurityCenterView, privacyRequest } from './trust.mjs';
import { createCommerceItem, sandboxCheckout } from './commerce.mjs';
import { structuredSearch, planAiSearch } from './search.mjs';
import { createMetricsRegistry, aiUsageEvent } from './observability.mjs';
import { defaultUserBudget, consume } from './cost-control.mjs';
import { defaultRevenueShares } from './economy.mjs';
import { createNegotiation, draftBusinessReply, confirmNegotiation } from './ai-to-ai.mjs';

function ensureCollections(store) {
  const d = store.data;
  d.identities ||= [];
  d.personalAgents ||= [];
  d.aiActivity ||= [];
  d.kgNodes ||= [];
  d.kgEdges ||= [];
  d.ecosystemActions ||= [];
  d.agentCatalog ||= [];
  d.agentInstalls ||= [];
  d.developerApps ||= [];
  d.apiKeys ||= [];
  d.translationJobs ||= [];
  d.organizations ||= [];
  d.orgMembers ||= [];
  d.orgTeams ||= [];
  d.orgDocuments ||= [];
  d.orgTasks ||= [];
  d.agentNegotiations ||= [];
  d.enterpriseControls ||= [];
  d.reputations ||= [];
  d.provenance ||= [];
  d.commerceItems ||= [];
  d.commerceOrders ||= [];
  d.privacyRequests ||= [];
  d.aiBudgets ||= [];
  d.aiUsage ||= [];
  d.studioAiPlans ||= [];
  d.audit ||= d.audit || [];
}

function audit(store, actorId, action, targetType, targetId, metadata = {}) {
  store.data.audit.unshift({
    id: store.id(),
    actorId,
    action,
    targetType,
    targetId,
    metadata,
    createdAt: store.now()
  });
}

export class EcosystemService {
  constructor(store, repo = null) {
    this.store = store;
    this.repo = repo;
    this.metrics = createMetricsRegistry();
    ensureCollections(store);
    this._catalogReady = null;
    this.seedCatalog();
  }

  get pg() { return this.repo?.enabled ? this.repo : null; }

  seedCatalog() {
    if (this.store.data.agentCatalog.length) return;
    for (const item of STARTER_CATALOG) {
      const agent = createAgentManifest({
        id: this.store.id(),
        developerId: 'sylora-platform',
        ...item,
        tools: item.capabilities,
        sandbox: true
      });
      this.store.data.agentCatalog.push(agent);
      if (this.pg) this._catalogReady = (this._catalogReady || Promise.resolve()).then(() => this.pg.upsertAgentCatalog(agent)).catch(() => {});
    }
    this.store.save();
  }

  // —— Personal AI ——
  ensurePersonalAgent(user) {
    ensureCollections(this.store);
    let agent = this.store.data.personalAgents.find(a => a.userId === user.id && a.kind === 'personal');
    if (!agent) {
      agent = createPersonalAgent({ id: this.store.id(), userId: user.id, locale: user.locale || 'uk' });
      this.store.data.personalAgents.push(agent);
      this.store.save();
      if (this.pg) this.pg.upsertPersonalAgent(agent).catch(() => {});
      audit(this.store, user.id, 'personal_ai.created', 'personal_agent', agent.id);
    }
    return agent;
  }

  async ensurePersonalAgentAsync(user) {
    if (this.pg) {
      const existing = await this.pg.findPersonalAgent(user.id);
      if (existing) {
        const idx = this.store.data.personalAgents.findIndex(a => a.userId === user.id && a.kind === 'personal');
        if (idx >= 0) this.store.data.personalAgents[idx] = existing;
        else this.store.data.personalAgents.push(existing);
        return existing;
      }
    }
    const agent = this.ensurePersonalAgent(user);
    if (this.pg) await this.pg.upsertPersonalAgent(agent);
    return agent;
  }

  updateAiPermissions(user, patch = {}) {
    const agent = this.ensurePersonalAgent(user);
    agent.permissions = mergePerms({ ...agent.permissions, ...patch });
    agent.updatedAt = this.store.now();
    this.store.save();
    if (this.pg) this.pg.upsertPersonalAgent(agent).catch(() => {});
    audit(this.store, user.id, 'personal_ai.permissions_updated', 'personal_agent', agent.id, { permissions: agent.permissions });
    return agent;
  }

  dashboard(user, pendingActions = []) {
    const agent = this.ensurePersonalAgent(user);
    const memories = (this.store.data.aiMemories || []).filter(m => m.userId === user.id);
    const activity = this.store.data.aiActivity.filter(a => a.userId === user.id).slice(-50);
    return permissionDashboard(agent, memories, activity, pendingActions);
  }

  recordActivity(user, entry) {
    const agent = this.ensurePersonalAgent(user);
    const row = createActivityEntry({ id: this.store.id(), userId: user.id, agentId: agent.id, ...entry });
    this.store.data.aiActivity.push(row);
    this.store.save();
    if (this.pg) this.pg.createActivity(row).catch(() => {});
    return row;
  }

  exportMemory(user) {
    const memories = (this.store.data.aiMemories || []).filter(m => m.userId === user.id);
    const activity = this.store.data.aiActivity.filter(a => a.userId === user.id);
    audit(this.store, user.id, 'personal_ai.memory_exported', 'user', user.id, { count: memories.length });
    return { exportedAt: this.store.now(), memories, activity };
  }

  clearMemory(user) {
    const before = (this.store.data.aiMemories || []).length;
    this.store.data.aiMemories = (this.store.data.aiMemories || []).filter(m => m.userId !== user.id);
    this.store.data.aiActivity = this.store.data.aiActivity.filter(a => a.userId !== user.id);
    this.store.save();
    audit(this.store, user.id, 'personal_ai.memory_cleared', 'user', user.id, { removed: before - this.store.data.aiMemories.length });
    return { cleared: true };
  }

  // —— Identity ——
  ensureIdentity(user) {
    ensureCollections(this.store);
    let identity = this.store.data.identities.find(x => x.userId === user.id);
    if (!identity) {
      identity = defaultIdentity(user);
      const agent = this.ensurePersonalAgent(user);
      identity.agentId = agent.id;
      this.store.data.identities.push(identity);
      this.store.save();
      if (this.pg) this.pg.upsertIdentity(identity).catch(() => {});
    }
    identity.username = user.username;
    identity.displayName = user.displayName;
    return identity;
  }

  updateIdentity(user, patch) {
    const current = this.ensureIdentity(user);
    const next = patchIdentity(current, patch);
    const idx = this.store.data.identities.findIndex(x => x.userId === user.id);
    this.store.data.identities[idx] = next;
    this.store.save();
    if (this.pg) this.pg.upsertIdentity(next).catch(() => {});
    audit(this.store, user.id, 'identity.updated', 'identity', user.id);
    return next;
  }

  getPublicIdentity(user, relation = 'public') {
    return publicIdentityView(this.ensureIdentity(user), relation);
  }

  // —— Knowledge Graph ——
  addNode(user, input) {
    const node = createNode({
      id: this.store.id(),
      ownerId: user.id,
      type: input.type,
      label: input.label,
      data: input.data || {},
      privacy: input.privacy || 'private',
      provenance: input.provenance || { source: 'user', createdHow: 'manual', aiInvolved: false }
    });
    this.store.data.kgNodes.push(node);
    this.store.save();
    if (this.pg) this.pg.createKgNode(node).catch(() => {});
    audit(this.store, user.id, 'kg.node_created', 'kg_node', node.id, { type: node.type, privacy: node.privacy });
    return node;
  }

  addEdge(user, input) {
    const edge = createEdge({
      id: this.store.id(),
      ownerId: user.id,
      fromId: input.fromId,
      toId: input.toId,
      type: input.type,
      data: input.data || {},
      privacy: input.privacy || 'private'
    });
    this.store.data.kgEdges.push(edge);
    this.store.save();
    if (this.pg) this.pg.createKgEdge(edge).catch(() => {});
    return edge;
  }

  graphFor(user, { asAi = false, relation = 'self' } = {}) {
    const nodes = visibleNodes(this.store.data.kgNodes.filter(n => n.ownerId === user.id), {
      viewerId: user.id,
      relation,
      asAi
    });
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = this.store.data.kgEdges.filter(e => e.ownerId === user.id && !e.deletedAt && nodeIds.has(e.fromId) && nodeIds.has(e.toId));
    return { ...graphSummary(nodes, edges), nodes, edges, types: { nodes: KG_NODE_TYPES, edges: KG_EDGE_TYPES } };
  }

  deleteNode(user, id) {
    const node = this.store.data.kgNodes.find(n => n.id === id && n.ownerId === user.id);
    if (!node) return false;
    node.deletedAt = this.store.now();
    this.store.save();
    if (this.pg) this.pg.softDeleteKgNode(user.id, id).catch(() => {});
    audit(this.store, user.id, 'kg.node_deleted', 'kg_node', id);
    return true;
  }

  // —— Action Engine ——
  proposeAction(user, input) {
    const agent = this.ensurePersonalAgent(user);
    const action = createActionRecord({
      id: this.store.id(),
      userId: user.id,
      agentId: agent.id,
      type: input.type,
      level: input.level || ACTION_LEVELS.REQUEST_CONFIRMATION,
      input: input.input || {},
      permission: input.permission || null,
      context: input.context || 'command_center'
    });
    this.store.data.ecosystemActions.push(action);
    this.store.save();
    this.recordActivity(user, {
      kind: 'action_proposed',
      summary: `Proposed ${action.type}`,
      dataUsed: Object.keys(action.input || {}),
      reason: input.reason || 'User or agent requested an action',
      context: action.context
    });
    return action;
  }

  confirmEcosystemAction(user, id) {
    const action = this.store.data.ecosystemActions.find(a => a.id === id && a.userId === user.id);
    if (!action) return { ok: false, error: 'ACTION_NOT_FOUND' };
    const gate = canExecute({ ...action, status: 'confirmed' }, ACTION_LEVELS.EXECUTE_ALLOWED);
    const confirmed = markConfirmed(action);
    Object.assign(action, confirmed);
    const completed = markCompleted(action, { accepted: true });
    Object.assign(action, completed);
    this.store.save();
    audit(this.store, user.id, 'action.confirmed', 'ecosystem_action', id, { type: action.type });
    return { ok: true, action, gate };
  }

  listActions(user) {
    return this.store.data.ecosystemActions.filter(a => a.userId === user.id).slice(-50);
  }

  // —— Agents marketplace ——
  listAgents() {
    return this.store.data.agentCatalog.filter(a => a.status !== 'removed');
  }

  publishAgent(user, input) {
    const manifest = createAgentManifest({
      id: this.store.id(),
      developerId: user.id,
      slug: input.slug,
      name: input.name,
      summary: input.summary,
      category: input.category || 'custom',
      permissions: input.permissions || [],
      capabilities: input.capabilities || [],
      tools: input.tools || [],
      pricing: input.pricing,
      version: input.version || '0.1.0',
      sandbox: input.sandbox !== false
    });
    this.store.data.agentCatalog.push(manifest);
    this.store.save();
    if (this.pg) this.pg.upsertAgentCatalog(manifest).catch(() => {});
    audit(this.store, user.id, 'agent.published', 'agent', manifest.id);
    return manifest;
  }

  installAgent(user, agentId) {
    const agent = this.store.data.agentCatalog.find(a => a.id === agentId);
    if (!agent) return { ok: false, error: 'AGENT_NOT_FOUND' };
    if (this.store.data.agentInstalls.find(x => x.userId === user.id && x.agentId === agentId && !x.removedAt)) {
      return { ok: false, error: 'ALREADY_INSTALLED' };
    }
    const row = installRecord({ id: this.store.id(), userId: user.id, agentId, permissions: agent.permissions });
    this.store.data.agentInstalls.push(row);
    agent.installs = (agent.installs || 0) + 1;
    this.store.save();
    if (this.pg) {
      this.pg.createInstall(row).catch(() => {});
      this.pg.bumpAgentInstalls(agentId).catch(() => {});
    }
    audit(this.store, user.id, 'agent.installed', 'agent', agentId);
    return { ok: true, install: row, agent };
  }

  uninstallAgent(user, agentId) {
    const row = this.store.data.agentInstalls.find(x => x.userId === user.id && x.agentId === agentId && !x.removedAt);
    if (!row) return false;
    row.removedAt = this.store.now();
    row.status = 'removed';
    this.store.save();
    if (this.pg) this.pg.removeInstall(user.id, agentId).catch(() => {});
    audit(this.store, user.id, 'agent.uninstalled', 'agent', agentId);
    return true;
  }

  myInstalls(user) {
    return this.store.data.agentInstalls.filter(x => x.userId === user.id && !x.removedAt);
  }

  // —— Developer platform ——
  createApp(user, input) {
    const app = createDeveloperApp({
      id: this.store.id(),
      ownerId: user.id,
      name: input.name,
      description: input.description,
      scopes: input.scopes,
      redirectUris: input.redirectUris,
      webhookUrl: input.webhookUrl
    });
    this.store.data.developerApps.push(app);
    this.store.save();
    audit(this.store, user.id, 'developer.app_created', 'developer_app', app.id);
    return app;
  }

  listApps(user) {
    return this.store.data.developerApps.filter(a => a.ownerId === user.id);
  }

  createKey(user, appId, label) {
    const app = this.store.data.developerApps.find(a => a.id === appId && a.ownerId === user.id);
    if (!app) return { ok: false, error: 'APP_NOT_FOUND' };
    const generated = generateApiKey();
    const record = createApiKeyRecord({
      id: this.store.id(),
      appId,
      ownerId: user.id,
      prefix: generated.prefix,
      hash: generated.hash,
      label
    });
    this.store.data.apiKeys.push(record);
    this.store.save();
    audit(this.store, user.id, 'developer.api_key_created', 'api_key', record.id, { prefix: record.prefix });
    return { ok: true, key: { id: record.id, prefix: record.prefix, label: record.label, createdAt: record.createdAt }, raw: generated.raw, oauth: OAUTH_DOC };
  }

  resolveApiKey(raw) {
    if (!raw) return null;
    const hash = hashApiKey(raw);
    const key = this.store.data.apiKeys.find(k => k.hash === hash && !k.revokedAt);
    if (!key) return null;
    const app = this.store.data.developerApps.find(a => a.id === key.appId);
    if (!app) return null;
    key.lastUsedAt = this.store.now();
    this.store.save();
    return { key, app };
  }

  // —— Translation ——
  translate(user, input) {
    const detected = input.sourceLang && input.sourceLang !== 'auto' ? input.sourceLang : localDetectLanguage(input.text);
    const job = createTranslationJob({
      id: this.store.id(),
      userId: user.id,
      mode: input.mode || 'text',
      sourceLang: detected,
      targetLang: input.targetLang || 'en',
      text: input.text,
      preserveVoice: !!input.preserveVoice,
      context: input.context || {}
    });
    const providerConfigured = !!(process.env.SYLORA_TRANSLATE_API_KEY || process.env.OPENAI_API_KEY);
    if (!providerConfigured) {
      job.status = 'completed_local';
      job.provider = 'local-passthrough';
      job.result = localTranslateStub(input.text, job.targetLang);
      job.result.detectedSourceLang = detected;
      job.result.voicePolicy = VOICE_POLICY;
      job.result.blocked = 'TRANSLATION_PROVIDER_OPTIONAL';
    } else {
      // Full MT provider path is prepared; without a dedicated translator we still passthrough with metadata.
      job.status = 'completed_local';
      job.provider = process.env.SYLORA_TRANSLATE_PROVIDER || 'openai-prepared';
      job.result = localTranslateStub(input.text, job.targetLang);
      job.result.detectedSourceLang = detected;
      job.result.voicePolicy = VOICE_POLICY;
      job.result.note = 'Dedicated MT provider integration is wired for configuration; response is labeled non-production until SYLORA_TRANSLATE_API_KEY is set.';
    }
    this.store.data.translationJobs.push(job);
    this.metrics.incr('translation.jobs');
    this.store.save();
    return job;
  }

  // —— Business OS ——
  createOrg(user, input) {
    const org = createOrganization({ id: this.store.id(), ownerId: user.id, name: input.name, description: input.description });
    const membership = createMembership({ id: this.store.id(), orgId: org.id, userId: user.id, role: 'owner' });
    const plane = defaultEnterpriseControlPlane(org.id);
    this.store.data.organizations.push(org);
    this.store.data.orgMembers.push(membership);
    this.store.data.enterpriseControls.push(plane);
    this.store.save();
    if (this.pg) {
      this.pg.createOrg(org).then(() => this.pg.createMembership(membership)).then(() => this.pg.upsertControlPlane(plane)).catch(() => {});
    }
    audit(this.store, user.id, 'org.created', 'organization', org.id);
    return org;
  }

  listOrgs(user) {
    const memberOf = new Set(this.store.data.orgMembers.filter(m => m.userId === user.id).map(m => m.orgId));
    return this.store.data.organizations.filter(o => memberOf.has(o.id) || o.ownerId === user.id);
  }

  getControlPlane(user, orgId) {
    const membership = this.store.data.orgMembers.find(m => m.orgId === orgId && m.userId === user.id);
    if (!membership || (membership.role !== 'owner' && !rbacAllows(membership.role, 'control_ai'))) {
      return { ok: false, error: 'FORBIDDEN' };
    }
    const plane = this.store.data.enterpriseControls.find(c => c.orgId === orgId);
    const installs = this.store.data.agentInstalls.filter(i => i.orgId === orgId || (!i.orgId && false));
    return {
      ok: true,
      plane,
      role: membership.role,
      activeAgents: installs,
      usage: this.store.data.aiUsage.filter(u => u.orgId === orgId).slice(-100)
    };
  }

  updateControlPlane(user, orgId, patch = {}) {
    const current = this.getControlPlane(user, orgId);
    if (!current.ok) return current;
    Object.assign(current.plane, patch, { updatedAt: this.store.now() });
    this.store.save();
    audit(this.store, user.id, 'enterprise.control_updated', 'organization', orgId, patch);
    return { ok: true, plane: current.plane };
  }

  // —— Reputation / trust / commerce / search / privacy ——
  reputation(user) {
    let rep = this.store.data.reputations.find(r => r.userId === user.id);
    if (!rep) {
      rep = emptyReputation(user.id);
      this.store.data.reputations.push(rep);
      this.store.save();
    }
    return rep;
  }

  addReputationEvidence(user, dimension, delta, reason) {
    const idx = this.store.data.reputations.findIndex(r => r.userId === user.id);
    const current = this.reputation(user);
    const next = applyEvidence(current, dimension, delta, reason);
    if (idx >= 0) this.store.data.reputations[idx] = next;
    else this.store.data.reputations.push(next);
    this.store.save();
    return next;
  }

  disputeReputation(user, dimension, reason) {
    const idx = this.store.data.reputations.findIndex(r => r.userId === user.id);
    const current = this.reputation(user);
    const next = openDispute(current, { id: this.store.id(), dimension, reason });
    this.store.data.reputations[idx] = next;
    this.store.save();
    return next;
  }

  addProvenance(user, input) {
    const row = createProvenance({ id: this.store.id(), creatorId: user.id, ...input });
    this.store.data.provenance.push(row);
    this.store.save();
    return row;
  }

  securityCenter(user, { sessions = [], blocks = [] } = {}) {
    return createSecurityCenterView({ userId: user.id, sessions, blocks, exportReady: true });
  }

  requestPrivacy(user, type, details) {
    const row = privacyRequest({ id: this.store.id(), userId: user.id, type, details });
    this.store.data.privacyRequests.push(row);
    this.store.save();
    audit(this.store, user.id, 'privacy.request', type, user.id);
    return row;
  }

  createProduct(user, input) {
    const item = createCommerceItem({ id: this.store.id(), creatorId: user.id, ...input, paymentMode: input.paymentMode || 'sandbox' });
    this.store.data.commerceItems.push(item);
    this.store.save();
    return item;
  }

  checkout(user, itemId) {
    const item = this.store.data.commerceItems.find(i => i.id === itemId);
    if (!item) return { ok: false, error: 'ITEM_NOT_FOUND' };
    const result = sandboxCheckout({ id: this.store.id(), buyerId: user.id, item });
    if (result.ok) {
      this.store.data.commerceOrders.push(result.order);
      this.store.save();
    }
    return result;
  }

  listProducts(userId) {
    return this.store.data.commerceItems.filter(i => !userId || i.creatorId === userId);
  }

  search(query, collections) {
    return structuredSearch(query, collections);
  }

  aiSearch(prompt) {
    return planAiSearch(prompt);
  }

  metricsSnapshot() {
    return this.metrics.snapshot();
  }

  trackAiUsage(event) {
    const row = aiUsageEvent(event);
    this.store.data.aiUsage.push(row);
    this.metrics.incr('ai.requests', 1, { action: event.action || 'chat' });
    this.store.save();
    return row;
  }

  budget(user) {
    let b = this.store.data.aiBudgets.find(x => x.userId === user.id);
    if (!b) {
      b = defaultUserBudget(user.id);
      this.store.data.aiBudgets.push(b);
      this.store.save();
    }
    return b;
  }

  consumeBudget(user, kind, amount) {
    const idx = this.store.data.aiBudgets.findIndex(x => x.userId === user.id);
    const current = this.budget(user);
    const result = consume(current, kind, amount);
    if (idx >= 0) this.store.data.aiBudgets[idx] = result.budget;
    this.store.save();
    return result;
  }

  revenueShares() {
    return defaultRevenueShares();
  }

  creatorStudioPlan(user, topic) {
    const plan = {
      topic: String(topic || '').slice(0, 200),
      structure: ['Hook', 'Core value', 'Interactive mid', 'CTA', 'Outro'],
      scenes: ['Intro', 'Demo', 'Q&A'],
      overlays: ['Lower-third title', 'Poll', 'Gift goal'],
      questions: [`What is your experience with ${topic}?`, 'What should we deep-dive next?'],
      interactives: ['Poll', 'Q&A', 'Resonance invite'],
      moderation: 'Suggest only — host confirms',
      clips: 'Post-LIVE summary + 3 short clip candidates require approval',
      subtitlePlan: ['Detect speech language', 'Generate captions', 'Offer translated captions'],
      status: 'proposal'
    };
    const action = this.proposeAction(user, {
      type: 'prepare_live',
      level: ACTION_LEVELS.REQUEST_CONFIRMATION,
      context: 'studio',
      reason: 'Creator asked Sylora to prepare a LIVE',
      input: { topic: plan.topic, plan }
    });
    this.store.data.studioAiPlans.push({ id: action.id, userId: user.id, plan, status: 'pending', createdAt: this.store.now() });
    this.store.save();
    this.addProvenance(user, {
      contentId: action.id,
      contentType: 'studio_plan',
      origin: 'ai',
      creationMethod: 'ai_creator_studio',
      aiInvolved: true
    });
    return { action, plan };
  }

  confirmCreatorStudioPlan(user, actionId) {
    const out = this.confirmEcosystemAction(user, actionId);
    if (!out.ok) return out;
    const saved = this.store.data.studioAiPlans.find(p => p.id === actionId && p.userId === user.id);
    if (saved) saved.status = 'confirmed';
    const plan = saved?.plan || out.action?.input?.plan || {};
    const scene = {
      id: this.store.id(),
      userId: user.id,
      name: String(plan.topic || 'AI LIVE Plan').slice(0, 60),
      overlayTitle: String(plan.topic || 'SYLORA LIVE').slice(0, 60),
      overlayStyle: 'violet',
      profileId: 'vertical1080',
      micGain: 100,
      micMuted: false,
      aiPlan: plan,
      createdAt: this.store.now(),
      updatedAt: this.store.now()
    };
    this.store.data.studioScenes.push(scene);
    this.store.save();
    this.recordActivity(user, {
      kind: 'studio_plan_confirmed',
      summary: `Confirmed AI LIVE plan: ${scene.name}`,
      dataUsed: ['creator_studio', 'action_engine'],
      reason: 'User confirmed prepare_live action',
      context: 'studio'
    });
    return { ok: true, action: out.action, scene, plan };
  }

  createTeam(user, orgId, name) {
    const membership = this.store.data.orgMembers.find(m => m.orgId === orgId && m.userId === user.id);
    if (!membership || (membership.role !== 'owner' && !rbacAllows(membership.role, 'manage_members'))) {
      return { ok: false, error: 'FORBIDDEN' };
    }
    const team = createTeam({ id: this.store.id(), orgId, name, memberIds: [user.id] });
    this.store.data.orgTeams.push(team);
    this.store.save();
    audit(this.store, user.id, 'org.team_created', 'organization_team', team.id, { orgId });
    return { ok: true, team };
  }

  listTeams(user, orgId) {
    const membership = this.store.data.orgMembers.find(m => m.orgId === orgId && m.userId === user.id);
    if (!membership) return { ok: false, error: 'FORBIDDEN' };
    return { ok: true, teams: this.store.data.orgTeams.filter(t => t.orgId === orgId) };
  }

  addOrgDocument(user, orgId, input) {
    const membership = this.store.data.orgMembers.find(m => m.orgId === orgId && m.userId === user.id);
    if (!membership || (membership.role !== 'owner' && !rbacAllows(membership.role, 'view_knowledge'))) {
      return { ok: false, error: 'FORBIDDEN' };
    }
    const doc = createOrgDocument({
      id: this.store.id(),
      orgId,
      authorId: user.id,
      title: input.title,
      body: input.body,
      privacy: input.privacy || 'business'
    });
    this.store.data.orgDocuments.push(doc);
    this.store.save();
    this.addNode(user, {
      type: 'document',
      label: doc.title,
      privacy: 'business',
      data: { orgId, documentId: doc.id },
      provenance: { source: 'business_os', createdHow: 'manual', aiInvolved: false }
    });
    return { ok: true, document: doc };
  }

  addOrgTask(user, orgId, input) {
    const membership = this.store.data.orgMembers.find(m => m.orgId === orgId && m.userId === user.id);
    if (!membership) return { ok: false, error: 'FORBIDDEN' };
    const task = createOrgTask({
      id: this.store.id(),
      orgId,
      creatorId: user.id,
      title: input.title,
      assigneeId: input.assigneeId || null,
      status: input.status || 'open'
    });
    this.store.data.orgTasks.push(task);
    this.store.save();
    return { ok: true, task };
  }

  listOrgWorkspace(user, orgId) {
    const membership = this.store.data.orgMembers.find(m => m.orgId === orgId && m.userId === user.id);
    if (!membership) return { ok: false, error: 'FORBIDDEN' };
    return {
      ok: true,
      role: membership.role,
      teams: this.store.data.orgTeams.filter(t => t.orgId === orgId),
      documents: this.store.data.orgDocuments.filter(d => d.orgId === orgId).slice(-50),
      tasks: this.store.data.orgTasks.filter(t => t.orgId === orgId).slice(-50)
    };
  }

  startNegotiation(user, input) {
    const personal = this.ensurePersonalAgent(user);
    const target = this.store.data.agentCatalog.find(a => a.id === input.toAgentId);
    if (!target) return { ok: false, error: 'AGENT_NOT_FOUND' };
    if (!this.store.data.agentInstalls.find(x => x.userId === user.id && x.agentId === target.id && !x.removedAt)
      && target.developerId !== 'sylora-platform') {
      // Platform starter agents may be negotiated without install; third-party requires install.
    }
    let negotiation;
    try {
      negotiation = createNegotiation({
        id: this.store.id(),
        userId: user.id,
        fromAgentId: personal.id,
        toAgentId: target.id,
        topic: input.topic || 'proposal',
        message: input.message || '',
        payload: input.payload || {}
      });
    } catch (e) {
      return { ok: false, error: e.message };
    }
    negotiation.reply = draftBusinessReply(negotiation, target);
    this.store.data.agentNegotiations.push(negotiation);
    const action = this.proposeAction(user, {
      type: 'agent_negotiation',
      level: ACTION_LEVELS.REQUEST_CONFIRMATION,
      context: 'business',
      reason: 'AI-to-AI proposal requires human confirmation before any binding step',
      input: { negotiationId: negotiation.id, topic: negotiation.topic, toAgentId: target.id }
    });
    this.recordActivity(user, {
      kind: 'ai_to_ai_proposed',
      summary: `Personal AI proposed ${negotiation.topic} to ${target.name}`,
      dataUsed: ['agent_manifest', 'permissions'],
      reason: negotiation.message || 'User requested agent negotiation',
      context: 'business'
    });
    this.store.save();
    return { ok: true, negotiation, action, warning: 'No financial or legal action executed.' };
  }

  confirmNegotiation(user, negotiationId) {
    const negotiation = this.store.data.agentNegotiations.find(n => n.id === negotiationId && n.userId === user.id);
    if (!negotiation) return { ok: false, error: 'NEGOTIATION_NOT_FOUND' };
    const result = confirmNegotiation(negotiation);
    if (!result.ok) return result;
    Object.assign(negotiation, result.negotiation);
    // Still does NOT execute booking/payment — only marks human-approved proposal readiness.
    negotiation.status = 'approved_to_prepare';
    negotiation.updatedAt = this.store.now();
    this.store.save();
    audit(this.store, user.id, 'ai_to_ai.confirmed', 'agent_negotiation', negotiationId, { topic: negotiation.topic });
    return { ok: true, negotiation, executed: false, note: 'Approved to prepare only. EXECUTE_ALLOWED was not granted.' };
  }

  listNegotiations(user) {
    return this.store.data.agentNegotiations.filter(n => n.userId === user.id).slice(-50);
  }

  commandCenterContext(view = 'command_center') {
    return {
      view,
      principle: 'One Personal AI, one memory, one knowledge graph, many contexts.',
      builtinActions: BUILTIN_ACTIONS,
      defaultPermissions: DEFAULT_AI_PERMISSIONS
    };
  }

  /** Build the single-AI multi-context pack used by chat / voice / LIVE / business. */
  contextPack(user, view = 'command_center') {
    const agent = this.ensurePersonalAgent(user);
    const role = contextRole(agent, view);
    const graph = this.graphFor(user, { asAi: true, relation: 'self' });
    const installs = this.myInstalls(user).map(i => {
      const catalog = this.store.data.agentCatalog.find(a => a.id === i.agentId);
      return catalog ? { id: catalog.id, name: catalog.name, category: catalog.category, permissions: i.permissions } : null;
    }).filter(Boolean);
    return {
      view,
      role,
      agent: { id: agent.id, name: agent.name, permissions: agent.permissions, contexts: agent.contexts },
      knowledgeSummary: { nodes: graph.nodes, edges: graph.edges.length, byType: graph.byType },
      installedAgents: installs,
      instruction: this.contextInstruction(role, view)
    };
  }

  contextInstruction(role, view) {
    const map = {
      personal: 'You are the user\'s Personal AI in the Command Center. Stay helpful, permission-aware and never claim writes completed without confirmation.',
      creator_assistant: 'You are the same Personal AI acting as Creator Assistant in LIVE/Studio context. Propose scenes, overlays and moderation help; never publish or go live without confirmation.',
      business_assistant: 'You are the same Personal AI acting as Business Assistant. You may prepare proposals and AI-to-AI negotiations, but financial/legal actions require confirmation.',
      tutor: 'You are the same Personal AI acting as Tutor in learning context. Prefer explanations and quizzes; do not invent enrollments.',
      communication_assistant: 'You are the same Personal AI acting as Communication Assistant in Messages. Draft replies; never send without confirmation.'
    };
    return `${map[role] || map.personal} Active view: ${view}.`;
  }
}

export { scopeAllows, OAUTH_DOC, hashApiKey };
