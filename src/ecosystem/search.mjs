/** Global + AI search layer (structured now; semantic adapter hook prepared). */

export function structuredSearch(store, q, { limit = 20 } = {}) {
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return { query: q, results: [], mode: 'structured' };
  const results = [];
  const push = (type, item, label) => {
    if (results.length >= limit) return;
    results.push({ type, id: item.id || item.userId, label, item });
  };

  for (const user of store.data.users || []) {
    if (`${user.username} ${user.displayName || ''}`.toLowerCase().includes(needle)) {
      push('people', store.publicUser(user), `@${user.username}`);
    }
  }
  for (const post of store.data.posts || []) {
    if (String(post.text || '').toLowerCase().includes(needle)) push('posts', post, post.text.slice(0, 80));
  }
  for (const live of store.data.liveRooms || []) {
    if (`${live.title || ''} ${live.topic || ''}`.toLowerCase().includes(needle)) push('live', live, live.title || live.id);
  }
  for (const community of store.data.communities || []) {
    if (`${community.name || ''} ${community.description || ''}`.toLowerCase().includes(needle)) push('communities', community, community.name);
  }
  for (const course of store.data.courses || []) {
    if (`${course.title || ''}`.toLowerCase().includes(needle)) push('courses', course, course.title);
  }
  for (const business of store.data.businesses || []) {
    if (`${business.name || ''} ${business.category || ''}`.toLowerCase().includes(needle)) push('businesses', business, business.name);
  }
  for (const agent of store.data.agentCatalog || []) {
    if (agent.status === 'published' && `${agent.name} ${agent.summary}`.toLowerCase().includes(needle)) {
      push('agents', agent, agent.name);
    }
  }
  for (const product of store.data.commerceProducts || []) {
    if (product.active && `${product.title}`.toLowerCase().includes(needle)) push('products', product, product.title);
  }
  for (const node of store.data.knowledgeNodes || []) {
    if (`${node.label || ''} ${node.type}`.toLowerCase().includes(needle)) push('knowledge', node, node.label || node.type);
  }
  return { query: q, results, mode: 'structured' };
}

export function parseAiSearchIntent(query) {
  const q = String(query || '').trim();
  const filters = {};
  const flutter = /flutter/i.test(q);
  const designer = /design|дизайнер/i.test(q);
  const ukraine = /україн|ukrain/i.test(q);
  const poland = /польщ|poland|polsk/i.test(q);
  if (flutter) filters.skill = 'flutter';
  if (designer) filters.role = 'designer';
  if (ukraine) filters.origin = 'ua';
  if (poland) filters.location = 'pl';
  return { query: q, filters, mode: 'ai_structured' };
}

export function aiSearch(store, query, { semanticProvider = null } = {}) {
  const intent = parseAiSearchIntent(query);
  const structured = structuredSearch(store, query, { limit: 30 });
  let semantic = null;
  if (typeof semanticProvider === 'function') {
    semantic = semanticProvider(query);
  }
  // Permission-aware identity/skills enrichment
  const identities = (store.data.identities || []).filter(identity => {
    const skills = (identity.skills || []).map(s => String(s).toLowerCase());
    const hay = `${identity.displayName} ${identity.professionalIdentity} ${skills.join(' ')}`.toLowerCase();
    if (intent.filters.skill && !skills.includes(intent.filters.skill) && !hay.includes(intent.filters.skill)) return false;
    if (intent.filters.role && !hay.includes(intent.filters.role) && !hay.includes('дизайн')) return false;
    return true;
  }).slice(0, 10).map(identity => ({
    type: 'creators',
    id: identity.userId,
    label: identity.displayName,
    item: { userId: identity.userId, skills: identity.skills, professionalIdentity: identity.professionalIdentity }
  }));

  return {
    ...intent,
    results: [...identities, ...structured.results].slice(0, 40),
    semantic: semantic || { status: process.env.SYLORA_EMBEDDINGS_API_KEY ? 'adapter-pending' : 'blocked' }
  };
}
