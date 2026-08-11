import { privacyAllows } from './permissions.mjs';

export const NODE_TYPES = Object.freeze([
  'user', 'person', 'company', 'project', 'post', 'video', 'live', 'message',
  'document', 'course', 'skill', 'product', 'service', 'community', 'event',
  'ai_agent', 'knowledge', 'action'
]);

export function ensureGraph(store) {
  store.data.knowledgeNodes ??= [];
  store.data.knowledgeEdges ??= [];
  store.data.knowledgeConsents ??= [];
  return store;
}

export function upsertNode(store, node, now) {
  ensureGraph(store);
  const existing = store.data.knowledgeNodes.find(x => x.id === node.id);
  if (existing) {
    Object.assign(existing, node, { updatedAt: now() });
    store.save();
    return existing;
  }
  const created = {
    privacy: 'private',
    ownerId: null,
    provenance: { source: 'user', createdBy: node.ownerId || null },
    ...node,
    createdAt: now(),
    updatedAt: now()
  };
  if (!NODE_TYPES.includes(created.type)) throw new Error('INVALID_NODE_TYPE');
  store.data.knowledgeNodes.push(created);
  store.save();
  return created;
}

export function linkNodes(store, { id, fromId, toId, rel, ownerId, privacy = 'private' }, now) {
  ensureGraph(store);
  const edge = {
    id,
    fromId,
    toId,
    rel: String(rel || 'related').slice(0, 80),
    ownerId,
    privacy,
    createdAt: now()
  };
  store.data.knowledgeEdges.push(edge);
  store.save();
  return edge;
}

export function grantConsent(store, { id, userId, purpose, scope }, now) {
  ensureGraph(store);
  const consent = { id, userId, purpose, scope, createdAt: now(), revokedAt: null };
  store.data.knowledgeConsents.push(consent);
  store.save();
  return consent;
}

function canSee(entity, { userId, purpose = 'human', relation = 'self' }) {
  if (!entity) return false;
  if (entity.ownerId === userId || relation === 'admin') return true;
  return privacyAllows({ level: entity.privacy || 'private', viewerRelation: relation, purpose });
}

export function queryGraph(store, { userId, q = '', types = null, purpose = 'ai', relation = 'self', limit = 40 }) {
  ensureGraph(store);
  const needle = String(q || '').toLowerCase().trim();
  const nodes = store.data.knowledgeNodes
    .filter(node => canSee(node, { userId, purpose, relation }))
    .filter(node => !types || types.includes(node.type))
    .filter(node => !needle || JSON.stringify(node).toLowerCase().includes(needle))
    .slice(0, limit);
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges = store.data.knowledgeEdges
    .filter(edge => canSee(edge, { userId, purpose, relation }))
    .filter(edge => nodeIds.has(edge.fromId) || nodeIds.has(edge.toId))
    .slice(0, limit * 2);
  return { nodes, edges };
}

export function deleteUserGraphData(store, userId) {
  ensureGraph(store);
  store.data.knowledgeNodes = store.data.knowledgeNodes.filter(n => n.ownerId !== userId);
  store.data.knowledgeEdges = store.data.knowledgeEdges.filter(e => e.ownerId !== userId);
  store.data.knowledgeConsents = store.data.knowledgeConsents.filter(c => c.userId !== userId);
  store.save();
}

export function exportUserGraph(store, userId) {
  ensureGraph(store);
  return {
    nodes: store.data.knowledgeNodes.filter(n => n.ownerId === userId),
    edges: store.data.knowledgeEdges.filter(e => e.ownerId === userId),
    consents: store.data.knowledgeConsents.filter(c => c.userId === userId)
  };
}
