/** Permission-aware knowledge graph helpers (foundation layer). */
export const NODE_TYPES = Object.freeze([
  'user', 'person', 'company', 'project', 'post', 'video', 'live', 'message',
  'document', 'course', 'skill', 'product', 'service', 'community', 'event',
  'agent', 'knowledge', 'action'
]);

export const EDGE_TYPES = Object.freeze([
  'knows', 'follows', 'member_of', 'authored', 'participates', 'teaches',
  'owns', 'references', 'derived_from', 'performed', 'linked_to'
]);

export function nodeKey(type, id) {
  return `${type}:${id}`;
}

export function canTraverseEdge({ viewerId, ownerId, edgeVisibility, consent }) {
  if (!viewerId || viewerId === ownerId) return true;
  if (!consent?.granted) return false;
  if (edgeVisibility === 'public') return true;
  if (edgeVisibility === 'private') return false;
  return false;
}

export function buildNode({ id, type, ownerId, label, visibility = 'private', metadata = {} }) {
  if (!NODE_TYPES.includes(type)) throw new Error('INVALID_NODE_TYPE');
  return {
    id,
    type,
    ownerId,
    label: String(label || '').slice(0, 240),
    visibility,
    metadata,
    createdAt: new Date().toISOString()
  };
}
