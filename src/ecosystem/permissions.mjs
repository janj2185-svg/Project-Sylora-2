/** Permission architecture for Personal AI, Identity, Agents, and Developer APIs. */

export const PRIVACY_LEVELS = Object.freeze(['public', 'followers', 'connections', 'business', 'private', 'ai_only']);

export const AI_PERMISSIONS = Object.freeze({
  profile_context: { default: true, risk: 'low', label: 'Profile context' },
  memory_read: { default: true, risk: 'low', label: 'Read memories' },
  memory_propose: { default: true, risk: 'medium', label: 'Propose memories' },
  projects: { default: true, risk: 'low', label: 'User projects' },
  business_help: { default: false, risk: 'medium', label: 'Business assistance' },
  content_create: { default: true, risk: 'medium', label: 'Content drafting' },
  live_assist: { default: true, risk: 'medium', label: 'LIVE assistance' },
  live_moderate: { default: false, risk: 'high', label: 'LIVE moderation' },
  comment_reply: { default: false, risk: 'high', label: 'Reply to comments' },
  audience_analyze: { default: true, risk: 'medium', label: 'Audience analysis' },
  calendar: { default: false, risk: 'medium', label: 'Calendar' },
  translate: { default: true, risk: 'low', label: 'Translation' },
  learn: { default: true, risk: 'low', label: 'Learning help' },
  tool_use: { default: true, risk: 'medium', label: 'Tool use' },
  agent_interact: { default: false, risk: 'high', label: 'Talk to other agents' },
  knowledge_graph: { default: true, risk: 'medium', label: 'Knowledge graph' },
  execute_allowed: { default: false, risk: 'critical', label: 'Execute allowed actions' }
});

export const ACTION_LEVELS = Object.freeze(['READ', 'PROPOSE', 'PREPARE', 'REQUEST_CONFIRMATION', 'EXECUTE_ALLOWED']);

export const API_SCOPES = Object.freeze([
  'identity.read', 'identity.write',
  'creator.read', 'creator.write',
  'content.read', 'content.write',
  'live.read', 'live.write',
  'agents.read', 'agents.write',
  'messages.read', 'messages.write',
  'business.read', 'business.write',
  'analytics.read',
  'commerce.read', 'commerce.write',
  'integrations.messaging'
]);

export function defaultAiPermissions() {
  return Object.fromEntries(Object.entries(AI_PERMISSIONS).map(([key, meta]) => [key, meta.default]));
}

export function normalizeAiPermissions(input = {}) {
  const base = defaultAiPermissions();
  for (const key of Object.keys(AI_PERMISSIONS)) {
    if (typeof input[key] === 'boolean') base[key] = input[key];
  }
  // Critical execute never silently defaults on from unknown shapes
  if (input.execute_allowed !== true) base.execute_allowed = false;
  return base;
}

export function hasAiPermission(permissions, key) {
  const perms = normalizeAiPermissions(permissions);
  return perms[key] === true;
}

export function privacyAllows({ level = 'private', viewerRelation = 'self', purpose = 'human' }) {
  const normalized = PRIVACY_LEVELS.includes(level) ? level : 'private';
  if (viewerRelation === 'self' || viewerRelation === 'admin') return true;
  if (normalized === 'public') return true;
  if (normalized === 'ai_only') return purpose === 'ai';
  if (normalized === 'private') return false;
  if (normalized === 'followers') return viewerRelation === 'follower' || viewerRelation === 'connection' || viewerRelation === 'business';
  if (normalized === 'connections') return viewerRelation === 'connection' || viewerRelation === 'business';
  if (normalized === 'business') return viewerRelation === 'business';
  return false;
}

export function assertActionLevel(level) {
  if (!ACTION_LEVELS.includes(level)) throw new Error('INVALID_ACTION_LEVEL');
  return level;
}

export function requiresConfirmation(level) {
  return level === 'REQUEST_CONFIRMATION' || level === 'EXECUTE_ALLOWED';
}
