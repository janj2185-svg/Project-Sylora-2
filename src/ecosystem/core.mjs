/** SYLORA ecosystem foundation — Personal AI + Identity + Knowledge + Agents + Economy contracts. */

export const ACTION_LEVELS = Object.freeze(['READ', 'PROPOSE', 'PREPARE', 'REQUEST_CONFIRMATION', 'EXECUTE_ALLOWED']);

export const DEFAULT_AI_PERMISSIONS = Object.freeze({
  profile: true,
  memory: true,
  projects: true,
  live: true,
  content: true,
  calendar: false,
  business: false,
  tools: true,
  agents: false,
  knowledge: true
});

export const IDENTITY_VISIBILITY = Object.freeze(['public', 'followers', 'connections', 'business', 'private', 'ai_only']);

export const REPUTATION_DIMENSIONS = Object.freeze([
  'creator', 'professional', 'marketplace', 'community', 'contribution', 'expertise', 'trust'
]);

export const AGENT_CATALOG_SEED = Object.freeze([
  { slug: 'teacher', name: 'Teacher Agent', category: 'learning', pricing: 'free', capabilities: ['tutor', 'quiz', 'summarize'] },
  { slug: 'live-moderator', name: 'LIVE Moderator', category: 'live', pricing: 'free', capabilities: ['moderate', 'reply', 'highlight'] },
  { slug: 'translator', name: 'Translator Agent', category: 'communication', pricing: 'free', capabilities: ['translate', 'subtitle', 'detect_language'] },
  { slug: 'creator-assistant', name: 'Creator Assistant', category: 'creator', pricing: 'free', capabilities: ['script', 'titles', 'clips'] },
  { slug: 'business-analyst', name: 'Business Analyst', category: 'business', pricing: 'paid', capabilities: ['analyze', 'report', 'propose'] },
  { slug: 'support', name: 'Support Agent', category: 'business', pricing: 'paid', capabilities: ['support', 'faq', 'escalate'] },
  { slug: 'research', name: 'Research Agent', category: 'knowledge', pricing: 'free', capabilities: ['search', 'summarize', 'cite'] },
  { slug: 'designer', name: 'Designer Agent', category: 'creator', pricing: 'paid', capabilities: ['brief', 'variants', 'critique'] }
]);

export const API_SCOPES = Object.freeze([
  'identity.read', 'identity.write',
  'creator.read', 'creator.write',
  'content.read', 'content.write',
  'live.read', 'live.write',
  'agents.read', 'agents.write',
  'messages.read', 'messages.write',
  'business.read', 'business.write',
  'analytics.read', 'commerce.read', 'integrations.messaging'
]);

export function normalizePermissions(input = {}) {
  const out = { ...DEFAULT_AI_PERMISSIONS };
  for (const key of Object.keys(DEFAULT_AI_PERMISSIONS)) {
    if (typeof input[key] === 'boolean') out[key] = input[key];
  }
  return out;
}

export function normalizeVisibility(value) {
  return IDENTITY_VISIBILITY.includes(value) ? value : 'public';
}

export function permissionAllows(permissions, key) {
  const perms = normalizePermissions(permissions);
  return perms[key] !== false;
}

export function actionRequiresConfirmation(level) {
  return level === 'REQUEST_CONFIRMATION' || level === 'EXECUTE_ALLOWED';
}

export function resolveActionLevel({ permissionGranted, dangerous = false, financial = false, legal = false }) {
  if (!permissionGranted) return 'PROPOSE';
  if (financial || legal || dangerous) return 'REQUEST_CONFIRMATION';
  return 'EXECUTE_ALLOWED';
}

export function buildIdentityProfile(user, existing = {}) {
  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    verifiedPerson: !!existing.verifiedPerson,
    creatorPersona: existing.creatorPersona || '',
    professionalIdentity: existing.professionalIdentity || '',
    skills: Array.isArray(existing.skills) ? existing.skills.slice(0, 40) : [],
    interests: Array.isArray(existing.interests) ? existing.interests.slice(0, 40) : [],
    portfolio: Array.isArray(existing.portfolio) ? existing.portfolio.slice(0, 40) : [],
    education: Array.isArray(existing.education) ? existing.education.slice(0, 20) : [],
    achievements: Array.isArray(existing.achievements) ? existing.achievements.slice(0, 40) : [],
    visibility: normalizeVisibility(existing.visibility),
    fieldVisibility: existing.fieldVisibility || {},
    updatedAt: existing.updatedAt || null
  };
}

export function emptyReputation(userId) {
  const scores = Object.fromEntries(REPUTATION_DIMENSIONS.map(d => [d, { score: 0, reasons: [] }]));
  return { userId, ...scores, updatedAt: null };
}

export class EcosystemService {
  constructor({ store, postgresRepo = null }) {
    this.store = store;
    this.postgresRepo = postgresRepo;
    this.ensureCollections();
    this.ensureAgentSeed();
  }

  get postgresEnabled() {
    return !!this.postgresRepo?.enabled;
  }

  ensureCollections() {
    const d = this.store.data;
    for (const key of [
      'identityProfiles', 'aiPermissions', 'aiActivityLog', 'knowledgeNodes', 'knowledgeEdges',
      'agentCatalog', 'agentInstalls', 'developerApps', 'apiKeys', 'organizations', 'orgMembers',
      'orgPolicies', 'reputationScores', 'contentProvenance', 'translationPrefs', 'revenueShares',
      'actionAudit'
    ]) {
      if (!Array.isArray(d[key])) d[key] = [];
    }
  }

  ensureAgentSeed() {
    if (this.store.data.agentCatalog.length) return;
    for (const agent of AGENT_CATALOG_SEED) {
      this.store.data.agentCatalog.push({
        id: this.store.id(),
        ...agent,
        status: 'verified',
        version: '0.1.0',
        rating: 0,
        installs: 0,
        createdAt: this.store.now()
      });
    }
    this.store.save();
  }

  getPermissions(userId) {
    const row = this.store.data.aiPermissions.find(x => x.userId === userId);
    return normalizePermissions(row?.permissions);
  }

  setPermissions(userId, permissions) {
    const normalized = normalizePermissions(permissions);
    let row = this.store.data.aiPermissions.find(x => x.userId === userId);
    if (!row) {
      row = { userId, permissions: normalized, updatedAt: this.store.now() };
      this.store.data.aiPermissions.push(row);
    } else {
      row.permissions = normalized;
      row.updatedAt = this.store.now();
    }
    this.store.save();
    this.logActivity(userId, {
      action: 'permissions.updated',
      reason: 'User updated AI permission dashboard',
      permissionLevel: 'EXECUTE_ALLOWED',
      dataUsed: Object.keys(normalized).filter(k => normalized[k])
    });
    return normalized;
  }

  getIdentity(user) {
    const existing = this.store.data.identityProfiles.find(x => x.userId === user.id) || {};
    return buildIdentityProfile(user, existing);
  }

  updateIdentity(user, patch = {}) {
    const current = this.getIdentity(user);
    const next = buildIdentityProfile(user, {
      ...current,
      ...patch,
      skills: patch.skills ?? current.skills,
      interests: patch.interests ?? current.interests,
      portfolio: patch.portfolio ?? current.portfolio,
      education: patch.education ?? current.education,
      achievements: patch.achievements ?? current.achievements,
      visibility: patch.visibility ?? current.visibility,
      fieldVisibility: patch.fieldVisibility ?? current.fieldVisibility,
      updatedAt: this.store.now()
    });
    const idx = this.store.data.identityProfiles.findIndex(x => x.userId === user.id);
    if (idx >= 0) this.store.data.identityProfiles[idx] = next;
    else this.store.data.identityProfiles.push(next);
    this.store.save();
    this.upsertKnowledgeNode(user.id, {
      type: 'user',
      refId: user.id,
      label: user.displayName || user.username,
      visibility: next.visibility,
      data: { skills: next.skills, interests: next.interests }
    });
    return next;
  }

  logActivity(userId, { action, reason = '', permissionLevel = 'READ', dataUsed = [], agentId = null, result = 'ok', error = null }) {
    const entry = {
      id: this.store.id(),
      userId,
      agentId,
      action,
      reason,
      permissionLevel,
      dataUsed,
      result,
      error,
      createdAt: this.store.now()
    };
    this.store.data.aiActivityLog.unshift(entry);
    this.store.data.aiActivityLog = this.store.data.aiActivityLog.slice(0, 500);
    this.store.data.actionAudit.unshift({
      id: this.store.id(),
      actor: 'personal_ai',
      agentId,
      userId,
      timestamp: entry.createdAt,
      input: { action, dataUsed },
      output: { result },
      permission: permissionLevel,
      confirmation: actionRequiresConfirmation(permissionLevel),
      result,
      error
    });
    this.store.data.actionAudit = this.store.data.actionAudit.slice(0, 1000);
    this.store.save();
    return entry;
  }

  listActivity(userId, limit = 30) {
    return this.store.data.aiActivityLog.filter(x => x.userId === userId).slice(0, Math.max(1, Math.min(100, limit)));
  }

  upsertKnowledgeNode(ownerUserId, { type, refId, label, visibility = 'private', data = {} }) {
    let node = this.store.data.knowledgeNodes.find(x => x.ownerUserId === ownerUserId && x.type === type && x.refId === refId);
    if (!node) {
      node = {
        id: this.store.id(),
        ownerUserId,
        type,
        refId,
        label,
        visibility: normalizeVisibility(visibility),
        data,
        consent: true,
        createdAt: this.store.now(),
        updatedAt: this.store.now()
      };
      this.store.data.knowledgeNodes.push(node);
    } else {
      node.label = label;
      node.visibility = normalizeVisibility(visibility);
      node.data = data;
      node.updatedAt = this.store.now();
    }
    this.store.save();
    return node;
  }

  linkKnowledge(ownerUserId, fromNodeId, toNodeId, relation = 'related', visibility = 'private') {
    const from = this.store.data.knowledgeNodes.find(x => x.id === fromNodeId && x.ownerUserId === ownerUserId);
    const to = this.store.data.knowledgeNodes.find(x => x.id === toNodeId && x.ownerUserId === ownerUserId);
    if (!from || !to) return null;
    const edge = {
      id: this.store.id(),
      ownerUserId,
      fromNodeId,
      toNodeId,
      relation: String(relation).slice(0, 80),
      visibility: normalizeVisibility(visibility),
      createdAt: this.store.now()
    };
    this.store.data.knowledgeEdges.push(edge);
    this.store.save();
    return edge;
  }

  knowledgeSummary(userId) {
    return {
      nodes: this.store.data.knowledgeNodes.filter(x => x.ownerUserId === userId).length,
      edges: this.store.data.knowledgeEdges.filter(x => x.ownerUserId === userId).length
    };
  }

  listKnowledge(userId, { forAi = false } = {}) {
    const permissions = this.getPermissions(userId);
    if (forAi && !permissionAllows(permissions, 'knowledge')) return { nodes: [], edges: [] };
    const nodes = this.store.data.knowledgeNodes.filter(x => x.ownerUserId === userId && x.consent !== false);
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = this.store.data.knowledgeEdges.filter(x => x.ownerUserId === userId && nodeIds.has(x.fromNodeId) && nodeIds.has(x.toNodeId));
    return { nodes, edges };
  }

  deleteKnowledge(userId) {
    this.store.data.knowledgeNodes = this.store.data.knowledgeNodes.filter(x => x.ownerUserId !== userId);
    this.store.data.knowledgeEdges = this.store.data.knowledgeEdges.filter(x => x.ownerUserId !== userId);
    this.store.save();
    this.logActivity(userId, { action: 'knowledge.purged', reason: 'User deleted knowledge graph', permissionLevel: 'EXECUTE_ALLOWED' });
    return true;
  }

  listAgents() {
    return this.store.data.agentCatalog.slice();
  }

  installAgent(userId, agentId) {
    const agent = this.store.data.agentCatalog.find(x => x.id === agentId);
    if (!agent) return null;
    if (this.store.data.agentInstalls.some(x => x.userId === userId && x.agentId === agentId && x.status === 'installed')) {
      return { already: true, agent };
    }
    const install = { id: this.store.id(), userId, agentId, status: 'installed', createdAt: this.store.now() };
    this.store.data.agentInstalls.push(install);
    agent.installs = (agent.installs || 0) + 1;
    this.store.save();
    this.logActivity(userId, { action: 'agent.installed', reason: `Installed ${agent.name}`, permissionLevel: 'EXECUTE_ALLOWED', agentId });
    return { install, agent };
  }

  uninstallAgent(userId, agentId) {
    const row = this.store.data.agentInstalls.find(x => x.userId === userId && x.agentId === agentId && x.status === 'installed');
    if (!row) return false;
    row.status = 'removed';
    row.removedAt = this.store.now();
    this.store.save();
    this.logActivity(userId, { action: 'agent.removed', reason: 'User removed agent', permissionLevel: 'EXECUTE_ALLOWED', agentId });
    return true;
  }

  listInstalledAgents(userId) {
    const installs = this.store.data.agentInstalls.filter(x => x.userId === userId && x.status === 'installed');
    return installs.map(i => ({ ...i, agent: this.store.data.agentCatalog.find(a => a.id === i.agentId) || null }));
  }

  createDeveloperApp(userId, { name, description = '', scopes = [] }) {
    const cleanScopes = scopes.filter(s => API_SCOPES.includes(s)).slice(0, 20);
    const app = {
      id: this.store.id(),
      ownerUserId: userId,
      name: String(name || '').slice(0, 80),
      description: String(description || '').slice(0, 1000),
      scopes: cleanScopes,
      status: 'sandbox',
      createdAt: this.store.now()
    };
    if (!app.name) return null;
    this.store.data.developerApps.push(app);
    const key = {
      id: this.store.id(),
      appId: app.id,
      prefix: `sk_sandbox_${app.id.slice(0, 8)}`,
      secretHash: null,
      createdAt: this.store.now(),
      revokedAt: null
    };
    // Secret is returned once; only a marker is stored in JSON runtime.
    const secret = `${key.prefix}_${this.store.id().replace(/-/g, '')}`;
    key.secretHint = `${secret.slice(0, 16)}…`;
    this.store.data.apiKeys.push(key);
    this.store.save();
    return { app, apiKey: { id: key.id, secret, hint: key.secretHint, scopes: app.scopes, environment: 'sandbox' } };
  }

  listDeveloperApps(userId) {
    return this.store.data.developerApps.filter(x => x.ownerUserId === userId).map(app => ({
      ...app,
      keys: this.store.data.apiKeys.filter(k => k.appId === app.id && !k.revokedAt).map(k => ({ id: k.id, hint: k.secretHint, createdAt: k.createdAt }))
    }));
  }

  createOrganization(userId, { name, description = '' }) {
    const org = {
      id: this.store.id(),
      name: String(name || '').slice(0, 120),
      description: String(description || '').slice(0, 2000),
      ownerId: userId,
      createdAt: this.store.now()
    };
    if (!org.name) return null;
    this.store.data.organizations.push(org);
    this.store.data.orgMembers.push({ orgId: org.id, userId, role: 'owner', joinedAt: this.store.now() });
    this.store.data.orgPolicies.push({
      orgId: org.id,
      allowlistAgents: [],
      blocklistAgents: [],
      budgets: { aiTokensDaily: 100000, translationMinutesDaily: 120 },
      killSwitch: false,
      requireApprovalFor: ['EXECUTE_ALLOWED', 'financial', 'legal'],
      updatedAt: this.store.now()
    });
    this.store.save();
    return org;
  }

  listOrganizations(userId) {
    const memberships = this.store.data.orgMembers.filter(m => m.userId === userId);
    return memberships.map(m => {
      const org = this.store.data.organizations.find(o => o.id === m.orgId);
      return org ? { ...org, role: m.role, policy: this.store.data.orgPolicies.find(p => p.orgId === org.id) || null } : null;
    }).filter(Boolean);
  }

  getOrgPolicy(orgId, userId) {
    const member = this.store.data.orgMembers.find(m => m.orgId === orgId && m.userId === userId);
    if (!member || !['owner', 'admin'].includes(member.role)) return null;
    return this.store.data.orgPolicies.find(p => p.orgId === orgId) || null;
  }

  updateOrgPolicy(orgId, userId, patch = {}) {
    const policy = this.getOrgPolicy(orgId, userId);
    if (!policy) return null;
    if (Array.isArray(patch.allowlistAgents)) policy.allowlistAgents = patch.allowlistAgents.slice(0, 100);
    if (Array.isArray(patch.blocklistAgents)) policy.blocklistAgents = patch.blocklistAgents.slice(0, 100);
    if (patch.budgets && typeof patch.budgets === 'object') policy.budgets = { ...policy.budgets, ...patch.budgets };
    if (typeof patch.killSwitch === 'boolean') policy.killSwitch = patch.killSwitch;
    if (Array.isArray(patch.requireApprovalFor)) policy.requireApprovalFor = patch.requireApprovalFor.slice(0, 20);
    policy.updatedAt = this.store.now();
    this.store.save();
    return policy;
  }

  getReputation(userId) {
    return this.store.data.reputationScores.find(x => x.userId === userId) || emptyReputation(userId);
  }

  recordProvenance({ contentId, contentType, creatorId, source = 'user', aiInvolved = false, method = 'created', metadata = {} }) {
    const row = {
      id: this.store.id(),
      contentId,
      contentType,
      creatorId,
      source,
      aiInvolved: !!aiInvolved,
      method,
      metadata,
      createdAt: this.store.now()
    };
    this.store.data.contentProvenance.unshift(row);
    this.store.data.contentProvenance = this.store.data.contentProvenance.slice(0, 2000);
    this.store.save();
    return row;
  }

  getTranslationPrefs(userId) {
    return this.store.data.translationPrefs.find(x => x.userId === userId) || {
      userId,
      sourceLang: 'auto',
      targetLang: 'uk',
      liveSubtitles: true,
      chatTranslation: true,
      voiceTranslation: false,
      markSyntheticVoice: true
    };
  }

  setTranslationPrefs(userId, patch = {}) {
    let row = this.store.data.translationPrefs.find(x => x.userId === userId);
    const next = { ...this.getTranslationPrefs(userId), ...patch, userId };
    if (!row) this.store.data.translationPrefs.push(next);
    else Object.assign(row, next);
    this.store.save();
    return this.getTranslationPrefs(userId);
  }

  async translateText({ text, sourceLang = 'auto', targetLang = 'uk', provider = null }) {
    const clean = String(text || '').slice(0, 4000);
    if (!clean) return null;
    // Real provider wiring is prepared; without keys we return an explicit sandbox result.
    if (!provider) {
      return {
        status: 'sandbox',
        sourceLang,
        targetLang,
        original: clean,
        translated: clean,
        provider: 'none',
        latencyMs: 0,
        synthetic: false,
        note: 'Translation provider not configured. Set OPENAI_API_KEY or TRANSLATION_API_KEY for live translation.'
      };
    }
    return null;
  }

  commandCenter(user, memories = []) {
    const permissions = this.getPermissions(user.id);
    const identity = this.getIdentity(user);
    const knowledgeSummary = this.knowledgeSummary(user.id);
    const activity = this.listActivity(user.id, 20);
    const known = memories.map(m => ({ label: m.label, value: m.value, source: m.source }));
    return {
      permissions,
      identity,
      knowledgeSummary,
      activity,
      known,
      actionLevels: ACTION_LEVELS,
      scopes: API_SCOPES
    };
  }

  aiSearch(query, { users = [], posts = [], communities = [], courses = [], businesses = [], agents = [] } = {}) {
    const q = String(query || '').trim().toLowerCase();
    if (q.length < 2) return { query, results: [] };
    const score = (text) => {
      const t = String(text || '').toLowerCase();
      if (!t) return 0;
      if (t.includes(q)) return 3;
      const parts = q.split(/\s+/).filter(Boolean);
      return parts.reduce((acc, p) => acc + (t.includes(p) ? 1 : 0), 0);
    };
    const results = [
      ...users.map(u => ({ type: 'user', id: u.id, title: `@${u.username}`, subtitle: u.displayName, score: score(`${u.username} ${u.displayName} ${u.bio || ''}`) })),
      ...posts.map(p => ({ type: 'post', id: p.id, title: String(p.text || '').slice(0, 80), subtitle: p.author?.username || '', score: score(p.text) })),
      ...communities.map(c => ({ type: 'community', id: c.id, title: c.name, subtitle: c.description, score: score(`${c.name} ${c.description}`) })),
      ...courses.map(c => ({ type: 'course', id: c.id, title: c.title, subtitle: c.description, score: score(`${c.title} ${c.description}`) })),
      ...businesses.map(b => ({ type: 'business', id: b.id, title: b.name, subtitle: b.description, score: score(`${b.name} ${b.description}`) })),
      ...agents.map(a => ({ type: 'agent', id: a.id, title: a.name, subtitle: a.category, score: score(`${a.name} ${a.category} ${(a.capabilities || []).join(' ')}`) }))
    ].filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 40);
    return { query, mode: 'structured+semantic-ready', results };
  }
}
