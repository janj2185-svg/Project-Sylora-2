/** SYLORA LIVE — shared event & session types (normalized cross-platform). */

export const LIVE_EVENT_TYPES = Object.freeze([
  'viewer_joined', 'viewer_left', 'chat_message', 'reply', 'mention',
  'like', 'reaction', 'follow', 'unfollow', 'subscription', 'membership',
  'gift', 'donation', 'share', 'raid', 'stream_started', 'stream_ended',
  'moderation_event', 'goal_event', 'battle_event', 'host_speech',
  'ai_spoke', 'ai_suggestion', 'connection_status', 'automation_fired'
]);

export const CONNECTION_STATES = Object.freeze([
  'CONNECTED', 'CONNECTING', 'RECONNECTING', 'DISCONNECTED',
  'AUTH_REQUIRED', 'API_LIMITED', 'ERROR', 'UNAVAILABLE', 'SETUP_REQUIRED'
]);

export const AI_AUTONOMY = Object.freeze(['OFF', 'ASSIST', 'CO_HOST', 'AUTONOMOUS']);

export const AVATAR_STATES = Object.freeze([
  'idle', 'listening', 'thinking', 'speaking', 'happy', 'excited',
  'surprised', 'sad', 'serious', 'laughing'
]);

export function createLiveEvent({
  id,
  platform,
  streamId = null,
  eventId = null,
  userId = null,
  username = null,
  displayName = null,
  avatar = null,
  timestamp = new Date().toISOString(),
  eventType,
  message = null,
  amount = null,
  currency = null,
  gift = null,
  metadata = {},
  language = null
} = {}) {
  if (!LIVE_EVENT_TYPES.includes(eventType)) {
    throw Object.assign(new Error('INVALID_LIVE_EVENT_TYPE'), { code: 'INVALID_LIVE_EVENT_TYPE' });
  }
  return {
    id: id || `${platform}:${eventType}:${eventId || timestamp}:${userId || 'sys'}`,
    platform: String(platform || 'sylora'),
    streamId,
    eventId: eventId || id || null,
    userId,
    username,
    displayName: displayName || username,
    avatar,
    timestamp,
    eventType,
    message,
    amount: amount == null ? null : Number(amount),
    currency,
    gift,
    metadata: metadata || {},
    language
  };
}
