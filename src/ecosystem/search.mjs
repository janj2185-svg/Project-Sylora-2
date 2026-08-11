/**
 * Universal Search — structured + lexical semantic fallback.
 * True vector embeddings require EmbeddingProvider (honest blocked_provider when missing).
 */

function tokenize(q) {
  return String(q || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function lexicalScore(hay, tokens) {
  if (!hay || !tokens.length) return 0;
  let hits = 0;
  for (const t of tokens) if (hay.includes(t)) hits += 1;
  return hits / tokens.length;
}

export function structuredSearch(query, collections = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return { query, results: [], mode: 'structured' };
  const tokens = tokenize(q);
  const results = [];
  const push = (type, item, score, label, meta = {}) => {
    if (score <= 0) return;
    results.push({ type, id: item.id, label, score, item, ...meta });
  };

  for (const u of collections.users || []) {
    const hay = `${u.username || ''} ${u.displayName || ''} ${u.bio || ''}`.toLowerCase();
    const score = hay.includes(q) ? 1 : lexicalScore(hay, tokens) * 0.85;
    push('people', u, score, u.displayName || u.username);
  }
  for (const p of collections.posts || []) {
    const hay = String(p.body || p.text || '').toLowerCase();
    const score = hay.includes(q) ? 0.8 : lexicalScore(hay, tokens) * 0.7;
    push('posts', p, score, String(p.body || p.text || '').slice(0, 80));
  }
  for (const c of collections.communities || []) {
    const hay = `${c.name || ''} ${c.description || ''}`.toLowerCase();
    const score = hay.includes(q) ? 0.9 : lexicalScore(hay, tokens) * 0.75;
    push('communities', c, score, c.name);
  }
  for (const course of collections.courses || []) {
    const hay = `${course.title || ''} ${course.description || ''}`.toLowerCase();
    const score = hay.includes(q) ? 0.9 : lexicalScore(hay, tokens) * 0.75;
    push('courses', course, score, course.title);
  }
  for (const b of collections.businesses || []) {
    const hay = `${b.name || ''} ${b.description || ''}`.toLowerCase();
    const score = hay.includes(q) ? 0.9 : lexicalScore(hay, tokens) * 0.75;
    push('businesses', b, score, b.name);
  }
  for (const org of collections.organizations || []) {
    const hay = `${org.name || ''} ${org.description || ''}`.toLowerCase();
    const score = hay.includes(q) ? 0.9 : lexicalScore(hay, tokens) * 0.75;
    push('companies', org, score, org.name);
  }
  for (const a of collections.agents || []) {
    const hay = `${a.name || ''} ${a.summary || ''} ${a.category || ''}`.toLowerCase();
    const score = hay.includes(q) ? 1 : lexicalScore(hay, tokens) * 0.8;
    push('agents', a, score, a.name);
  }
  for (const live of collections.lives || []) {
    const hay = String(live.title || '').toLowerCase();
    const score = hay.includes(q) ? 0.85 : lexicalScore(hay, tokens) * 0.7;
    push('live', live, score, live.title);
  }
  for (const v of collections.videos || []) {
    const hay = `${v.title || ''} ${v.description || ''}`.toLowerCase();
    const score = hay.includes(q) ? 0.85 : lexicalScore(hay, tokens) * 0.7;
    push('videos', v, score, v.title || 'Video');
  }
  for (const msg of collections.messages || []) {
    const hay = String(msg.text || '').toLowerCase();
    const score = hay.includes(q) ? 0.75 : lexicalScore(hay, tokens) * 0.65;
    push('messages', msg, score, String(msg.text || '').slice(0, 80), {
      conversationId: msg.conversationId,
      note: 'Permission-filtered by caller'
    });
  }
  for (const doc of collections.documents || []) {
    const hay = `${doc.title || ''} ${doc.body || doc.content || ''}`.toLowerCase();
    const score = hay.includes(q) ? 0.85 : lexicalScore(hay, tokens) * 0.7;
    push('files', doc, score, doc.title || 'Document');
  }
  for (const proj of collections.projects || []) {
    const hay = `${proj.name || ''} ${proj.description || ''}`.toLowerCase();
    const score = hay.includes(q) ? 0.9 : lexicalScore(hay, tokens) * 0.75;
    push('projects', proj, score, proj.name);
  }
  for (const ev of collections.events || []) {
    const hay = `${ev.title || ''} ${ev.description || ''}`.toLowerCase();
    const score = hay.includes(q) ? 0.9 : lexicalScore(hay, tokens) * 0.75;
    push('events', ev, score, ev.title);
  }
  for (const research of collections.research || []) {
    const hay = `${research.title || ''} ${research.summary || ''}`.toLowerCase();
    const score = hay.includes(q) ? 0.85 : lexicalScore(hay, tokens) * 0.7;
    push('research', research, score, research.title);
  }

  results.sort((a, b) => b.score - a.score);
  return { query, results: results.slice(0, 80), mode: 'structured' };
}

/** Lexical “semantic” fallback when no embedding provider — honest about limits. */
export function semanticSearchFallback(query, collections = {}) {
  const base = structuredSearch(query, collections);
  const tokens = tokenize(query);
  // Boost longer overlapping phrases / related design/logo style queries
  const boosted = base.results.map(r => {
    const hay = String(r.label || '').toLowerCase() + ' ' + JSON.stringify(r.item || {}).toLowerCase();
    let bonus = 0;
    if (/дизайн|design|logo|логотип/i.test(query) && /дизайн|design|logo|логотип/i.test(hay)) bonus += 0.15;
    if (tokens.length >= 3 && lexicalScore(hay, tokens) >= 0.5) bonus += 0.1;
    return { ...r, score: Math.min(1, r.score + bonus), semantic: 'lexical_fallback' };
  }).sort((a, b) => b.score - a.score);
  return {
    query,
    results: boosted.slice(0, 50),
    mode: 'semantic_lexical',
    embeddingProvider: process.env.SYLORA_EMBEDDING_PROVIDER || null,
    honesty: process.env.SYLORA_EMBEDDING_PROVIDER
      ? { state: 'available', note: 'Embedding provider configured' }
      : { state: 'degraded', note: 'No embedding provider — lexical semantic fallback only. Exact words not required when stems overlap.' }
  };
}

/** AI search plan — structured filters + semantic hook. */
export function planAiSearch(prompt = '') {
  const text = String(prompt || '');
  const filters = {};
  if (/flutter/i.test(text)) filters.skills = [...(filters.skills || []), 'Flutter'];
  if (/design|дизайн|logo|логотип/i.test(text)) filters.skills = [...(filters.skills || []), 'Design'];
  if (/україн|ukrain/i.test(text)) filters.languages = [...(filters.languages || []), 'uk'];
  if (/польщ|poland|polsk/i.test(text)) filters.locations = [...(filters.locations || []), 'PL'];
  if (/розмов|conversation|chat|повідомл|message/i.test(text)) filters.types = [...(filters.types || []), 'messages'];
  return {
    prompt: text.slice(0, 500),
    filters,
    modes: ['structured', 'semantic'],
    semanticStatus: process.env.SYLORA_EMBEDDING_PROVIDER ? 'ready' : 'blocked_provider_lexical_fallback',
    permissionAware: true,
    summary: text.slice(0, 120)
  };
}
