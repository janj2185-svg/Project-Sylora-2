/** SYLORA permission tiers — architecture, not UI toggles. */
export const VISIBILITY = Object.freeze({
  PUBLIC: 'public',
  FOLLOWERS: 'followers',
  CONNECTIONS: 'connections',
  BUSINESS: 'business',
  PRIVATE: 'private',
  AI_ONLY: 'ai_only'
});

export const AI_PERMISSION_KEYS = Object.freeze([
  'profile_read',
  'memory_read',
  'memory_write',
  'posts_read',
  'posts_write',
  'messages_read',
  'calendar_read',
  'live_assist',
  'live_moderate',
  'business_read',
  'tools_execute',
  'agent_delegate',
  'external_share'
]);

export const ACTION_LEVELS = Object.freeze({
  READ: 'read',
  PROPOSE: 'propose',
  PREPARE: 'prepare',
  REQUEST_CONFIRMATION: 'request_confirmation',
  EXECUTE_ALLOWED: 'execute_allowed'
});

export const DEFAULT_AI_PERMISSIONS = Object.freeze({
  profile_read: true,
  memory_read: true,
  memory_write: true,
  posts_read: true,
  posts_write: false,
  messages_read: false,
  calendar_read: false,
  live_assist: true,
  live_moderate: false,
  business_read: false,
  tools_execute: false,
  agent_delegate: false,
  external_share: false
});

export function normalizeAiPermissions(input = {}) {
  const out = { ...DEFAULT_AI_PERMISSIONS };
  for (const key of AI_PERMISSION_KEYS) {
    if (typeof input[key] === 'boolean') out[key] = input[key];
  }
  return out;
}

export function canAiPermission(permissions, key) {
  return !!normalizeAiPermissions(permissions)[key];
}
