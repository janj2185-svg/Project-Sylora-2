export function structuredSearch(query, collections = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return { query, results: [], mode: 'structured' };
  const results = [];
  const push = (type, item, score, label) => results.push({ type, id: item.id, label, score, item });

  for (const u of collections.users || []) {
    const hay = `${u.username || ''} ${u.displayName || ''} ${u.bio || ''}`.toLowerCase();
    if (hay.includes(q)) push('people', u, 1, u.displayName || u.username);
  }
  for (const p of collections.posts || []) {
    if (String(p.body || p.text || '').toLowerCase().includes(q)) push('posts', p, 0.8, String(p.body || '').slice(0, 80));
  }
  for (const c of collections.communities || []) {
    if (`${c.name} ${c.description}`.toLowerCase().includes(q)) push('communities', c, 0.9, c.name);
  }
  for (const course of collections.courses || []) {
    if (`${course.title} ${course.description}`.toLowerCase().includes(q)) push('courses', course, 0.9, course.title);
  }
  for (const b of collections.businesses || []) {
    if (`${b.name} ${b.description}`.toLowerCase().includes(q)) push('businesses', b, 0.9, b.name);
  }
  for (const a of collections.agents || []) {
    if (`${a.name} ${a.summary} ${a.category}`.toLowerCase().includes(q)) push('agents', a, 1, a.name);
  }
  for (const live of collections.lives || []) {
    if (String(live.title || '').toLowerCase().includes(q)) push('live', live, 0.85, live.title);
  }
  results.sort((a, b) => b.score - a.score);
  return { query, results: results.slice(0, 50), mode: 'structured' };
}

/** AI search plan — structured filters + semantic hook (embedding provider optional). */
export function planAiSearch(prompt = '') {
  const text = String(prompt || '');
  const filters = {};
  if (/flutter/i.test(text)) filters.skills = [...(filters.skills || []), 'Flutter'];
  if (/design/i.test(text)) filters.skills = [...(filters.skills || []), 'Design'];
  if (/україн|ukrain/i.test(text)) filters.languages = [...(filters.languages || []), 'uk'];
  if (/польщ|poland|polsk/i.test(text)) filters.locations = [...(filters.locations || []), 'PL'];
  return {
    prompt: text.slice(0, 500),
    filters,
    modes: ['structured', 'semantic'],
    semanticStatus: process.env.SYLORA_EMBEDDING_PROVIDER ? 'ready' : 'blocked_provider',
    permissionAware: true
  };
}
