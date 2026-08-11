export const AGENT_CATEGORIES = Object.freeze([
  'commerce', 'teacher', 'designer', 'business_analyst', 'live_moderator',
  'translator', 'support', 'research', 'creator_assistant', 'custom'
]);

export function createAgentManifest({
  id,
  developerId,
  slug,
  name,
  summary,
  category = 'custom',
  permissions = [],
  capabilities = [],
  tools = [],
  pricing = { model: 'free', price: 0, currency: 'LUMEN' },
  version = '0.1.0',
  sandbox = true
}) {
  if (!AGENT_CATEGORIES.includes(category)) throw new Error('INVALID_AGENT_CATEGORY');
  return {
    id,
    developerId,
    slug: String(slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48),
    name: String(name || '').slice(0, 80),
    summary: String(summary || '').slice(0, 500),
    category,
    permissions: [...new Set(permissions)].slice(0, 40),
    capabilities: [...new Set(capabilities)].slice(0, 40),
    tools: [...new Set(tools)].slice(0, 40),
    pricing: {
      model: ['free', 'paid', 'subscription'].includes(pricing?.model) ? pricing.model : 'free',
      price: Math.max(0, Number(pricing?.price) || 0),
      currency: pricing?.currency || 'LUMEN'
    },
    version,
    status: sandbox ? 'sandbox' : 'pending_review',
    securityReview: 'pending',
    ratings: { average: 0, count: 0 },
    installs: 0,
    revenueShareBps: 7000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function installRecord({ id, userId, agentId, permissions = [], orgId = null }) {
  return {
    id,
    userId,
    orgId,
    agentId,
    permissions,
    status: 'installed',
    installedAt: new Date().toISOString(),
    removedAt: null
  };
}

export const STARTER_CATALOG = Object.freeze([
  { slug: 'live-moderator', name: 'LIVE Moderator', category: 'live_moderator', summary: 'Helps moderate LIVE chat within granted permissions.', capabilities: ['moderate', 'summarize'], permissions: ['live_assist', 'live_moderate'], pricing: { model: 'free', price: 0 } },
  { slug: 'creator-assistant', name: 'Creator Assistant', category: 'creator_assistant', summary: 'Prepares LIVE outlines, titles and post-summaries for confirmation.', capabilities: ['prepare', 'generate'], permissions: ['content_assist', 'live_assist'], pricing: { model: 'free', price: 0 } },
  { slug: 'business-analyst', name: 'Business Analyst', category: 'business_analyst', summary: 'Reads permitted business metrics and proposes actions.', capabilities: ['analyze', 'propose'], permissions: ['business_assist'], pricing: { model: 'subscription', price: 500 } },
  { slug: 'translator', name: 'Translator Agent', category: 'translator', summary: 'Permissioned translation for chat and LIVE captions.', capabilities: ['translate'], permissions: ['translate'], pricing: { model: 'free', price: 0 } },
  { slug: 'teacher', name: 'Teacher Agent', category: 'teacher', summary: 'Tutoring assistant for enrolled learning contexts.', capabilities: ['teach', 'quiz'], permissions: ['learn_assist'], pricing: { model: 'paid', price: 250 } }
]);
