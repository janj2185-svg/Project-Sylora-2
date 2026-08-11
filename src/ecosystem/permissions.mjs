/** Permission / ABAC-lite foundation for SYLORA ecosystem. */

export const PRIVACY_LEVELS = Object.freeze(['public', 'followers', 'connections', 'business', 'private', 'ai_only']);

export const ACTION_LEVELS = Object.freeze({
  READ: 'READ',
  PROPOSE: 'PROPOSE',
  PREPARE: 'PREPARE',
  REQUEST_CONFIRMATION: 'REQUEST_CONFIRMATION',
  EXECUTE_ALLOWED: 'EXECUTE_ALLOWED'
});

export const ACTION_LEVEL_RANK = Object.freeze({
  READ: 1,
  PROPOSE: 2,
  PREPARE: 3,
  REQUEST_CONFIRMATION: 4,
  EXECUTE_ALLOWED: 5
});

/** Default personal AI permission matrix — explicit, revocable, inspectable. */
export const DEFAULT_AI_PERMISSIONS = Object.freeze({
  profile_context: true,
  memory_read: true,
  memory_propose: true,
  projects_read: true,
  business_assist: true,
  content_assist: true,
  live_assist: false,
  live_moderate: false,
  comment_reply: false,
  audience_analyze: false,
  calendar: false,
  translate: true,
  learn_assist: true,
  tool_use: true,
  agent_to_agent: false,
  execute_writes: false
});

export const DEVELOPER_SCOPES = Object.freeze([
  'identity.read', 'identity.write',
  'creator.read', 'content.read', 'content.write',
  'live.read', 'live.write',
  'agents.read', 'agents.install',
  'messages.read', 'messages.write',
  'business.read', 'analytics.read',
  'commerce.read', 'integrations.messaging'
]);

export function normalizePrivacy(level, fallback = 'public') {
  return PRIVACY_LEVELS.includes(level) ? level : fallback;
}

export function canViewerAccess(ownerPrivacy, relation = 'public') {
  const privacy = normalizePrivacy(ownerPrivacy);
  const order = { public: 0, followers: 1, connections: 2, business: 3, private: 4, ai_only: 5 };
  const relationRank = {
    public: 0,
    follower: 1,
    connection: 2,
    business: 3,
    self: 4,
    ai: 5
  };
  if (privacy === 'ai_only') return relation === 'ai' || relation === 'self';
  if (relation === 'self' || relation === 'ai') return true;
  return (relationRank[relation] ?? 0) >= (order[privacy] ?? 0);
}

export function mergeAiPermissions(input = {}) {
  const out = { ...DEFAULT_AI_PERMISSIONS };
  for (const key of Object.keys(out)) {
    if (typeof input[key] === 'boolean') out[key] = input[key];
  }
  return out;
}

export function assertActionLevel(granted, required) {
  const have = ACTION_LEVEL_RANK[granted] || 0;
  const need = ACTION_LEVEL_RANK[required] || 99;
  return have >= need;
}

export function validateScopes(scopes = []) {
  const list = Array.isArray(scopes) ? scopes : String(scopes || '').split(/[,\s]+/).filter(Boolean);
  const invalid = list.filter(s => !DEVELOPER_SCOPES.includes(s));
  return { scopes: list.filter(s => DEVELOPER_SCOPES.includes(s)), invalid };
}

export function criticalActionRequiresConfirmation(actionType = '') {
  return [
    'publish_post', 'publish_live', 'send_message', 'spend_money',
    'install_agent', 'revoke_agent', 'export_data', 'delete_account',
    'execute_tool', 'business_contract', 'payout_request'
  ].includes(actionType);
}
