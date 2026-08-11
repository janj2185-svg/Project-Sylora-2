/** Agent Marketplace foundation — manifests, install, permissions, sandbox. */

export const AGENT_STATUSES = Object.freeze(['draft', 'review', 'published', 'suspended', 'revoked']);

export function createAgentManifest({
  id,
  developerId,
  name,
  slug,
  summary,
  category = 'general',
  capabilities = [],
  tools = [],
  permissions = [],
  pricing = { model: 'free', priceCents: 0, currency: 'USD' },
  version = '0.1.0',
  sandbox = true
}) {
  if (!name || !slug || !developerId) throw new Error('AGENT_MANIFEST_INVALID');
  return {
    id,
    developerId,
    name: String(name).slice(0, 80),
    slug: String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 64),
    summary: String(summary || '').slice(0, 500),
    category,
    capabilities,
    tools,
    permissions,
    pricing: {
      model: pricing.model === 'subscription' || pricing.model === 'paid' ? pricing.model : 'free',
      priceCents: Math.max(0, Number(pricing.priceCents) || 0),
      currency: pricing.currency || 'USD',
      revenueShareBps: 7000
    },
    version,
    status: 'draft',
    securityReview: 'pending',
    ratings: { average: 0, count: 0 },
    installs: 0,
    sandbox: sandbox !== false,
    createdAt: null,
    updatedAt: null
  };
}

export function ensureAgents(store) {
  store.data.agentCatalog ??= [];
  store.data.agentInstalls ??= [];
  store.data.agentReviews ??= [];
  store.data.developerProfiles ??= [];
  return store;
}

export function seedStarterAgents(store, id, now) {
  ensureAgents(store);
  if (store.data.agentCatalog.length) return;
  const starters = [
    ['Live Moderator', 'live-moderator', 'live', ['live_moderate', 'comment_reply']],
    ['Creator Assistant', 'creator-assistant', 'creator', ['live_assist', 'content_create']],
    ['Teacher Agent', 'teacher-agent', 'learning', ['learn', 'translate']],
    ['Business Analyst', 'business-analyst', 'business', ['business_help', 'audience_analyze']],
    ['Translator', 'translator-agent', 'communication', ['translate']],
    ['Support Agent', 'support-agent', 'business', ['business_help', 'agent_interact']],
    ['Research Agent', 'research-agent', 'knowledge', ['knowledge_graph']],
    ['Design Agent', 'design-agent', 'creator', ['content_create']]
  ];
  for (const [name, slug, category, permissions] of starters) {
    const manifest = createAgentManifest({
      id: id(),
      developerId: 'sylora-official',
      name,
      slug,
      summary: `${name} for the SYLORA ecosystem (sandbox foundation).`,
      category,
      permissions,
      capabilities: permissions,
      sandbox: true
    });
    manifest.status = 'published';
    manifest.securityReview = 'official';
    manifest.createdAt = now();
    manifest.updatedAt = now();
    store.data.agentCatalog.push(manifest);
  }
  store.save();
}

export function listMarketplace(store, { q = '', category = '' } = {}) {
  ensureAgents(store);
  const needle = q.toLowerCase();
  return store.data.agentCatalog
    .filter(a => a.status === 'published')
    .filter(a => !category || a.category === category)
    .filter(a => !needle || `${a.name} ${a.summary} ${a.slug}`.toLowerCase().includes(needle));
}

export function installAgent(store, { id, userId, agentId, grantedPermissions = [] }, now) {
  ensureAgents(store);
  const agent = store.data.agentCatalog.find(a => a.id === agentId && a.status === 'published');
  if (!agent) throw new Error('AGENT_NOT_FOUND');
  const existing = store.data.agentInstalls.find(x => x.userId === userId && x.agentId === agentId && !x.uninstalledAt);
  if (existing) return existing;
  const install = {
    id,
    userId,
    agentId,
    grantedPermissions: grantedPermissions.filter(p => agent.permissions.includes(p)),
    sandbox: agent.sandbox,
    installedAt: now(),
    uninstalledAt: null
  };
  store.data.agentInstalls.push(install);
  agent.installs += 1;
  store.save();
  return install;
}

export function uninstallAgent(store, { userId, agentId }, now) {
  ensureAgents(store);
  const install = store.data.agentInstalls.find(x => x.userId === userId && x.agentId === agentId && !x.uninstalledAt);
  if (!install) return false;
  install.uninstalledAt = now();
  store.save();
  return true;
}
