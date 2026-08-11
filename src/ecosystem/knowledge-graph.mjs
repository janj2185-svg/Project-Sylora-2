import { canViewerAccess, normalizePrivacy } from './permissions.mjs';

export const KG_NODE_TYPES = Object.freeze([
  'user', 'person', 'company', 'project', 'post', 'video', 'live',
  'message', 'document', 'course', 'skill', 'product', 'service',
  'community', 'event', 'ai_agent', 'knowledge', 'action'
]);

export const KG_EDGE_TYPES = Object.freeze([
  'knows', 'follows', 'works_at', 'owns', 'created', 'about',
  'teaches', 'enrolled', 'member_of', 'related', 'derived_from', 'assisted_by'
]);

export function createNode({ id, ownerId, type, label, data = {}, privacy = 'private', provenance = null }) {
  if (!KG_NODE_TYPES.includes(type)) throw new Error('INVALID_KG_NODE_TYPE');
  return {
    id,
    ownerId,
    type,
    label: String(label || '').slice(0, 200),
    data,
    privacy: normalizePrivacy(privacy, 'private'),
    provenance: provenance || { source: 'user', createdHow: 'manual', aiInvolved: false },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null
  };
}

export function createEdge({ id, ownerId, fromId, toId, type, data = {}, privacy = 'private' }) {
  if (!KG_EDGE_TYPES.includes(type)) throw new Error('INVALID_KG_EDGE_TYPE');
  return {
    id,
    ownerId,
    fromId,
    toId,
    type,
    data,
    privacy: normalizePrivacy(privacy, 'private'),
    createdAt: new Date().toISOString(),
    deletedAt: null
  };
}

/** Permission-aware filter — never returns ai_only/private nodes to wrong viewer. */
export function visibleNodes(nodes, { viewerId, relation = 'public', asAi = false } = {}) {
  return (nodes || []).filter(node => {
    if (node.deletedAt) return false;
    if (node.ownerId === viewerId) return true;
    const rel = asAi && node.ownerId === viewerId ? 'ai' : (node.ownerId === viewerId ? 'self' : relation);
    return canViewerAccess(node.privacy, rel);
  });
}

export function graphSummary(nodes = [], edges = []) {
  const byType = {};
  for (const n of nodes) byType[n.type] = (byType[n.type] || 0) + 1;
  return { nodes: nodes.length, edges: edges.length, byType };
}
