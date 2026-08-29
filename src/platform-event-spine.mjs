import { randomUUID } from 'node:crypto';
import { PLATFORM_EVENT_TYPES } from './platform-vision.mjs';

export const EVENT_SPINE_VERSION = 1;

const KNOWN_TYPES = new Set([
  ...PLATFORM_EVENT_TYPES,
  'live.started',
  'live.viewer.joined',
  'live.chat.message',
  'external.live.event',
  'gift.sent',
  'battle.started',
  'battle.score.changed',
  'creator.action',
  'assistant.reaction.requested',
  'assistant.reaction.ready',
  'director.suggestion.ready'
]);

/**
 * Canonical typed platform event contract.
 * All subsystems (Gift, LIVE, Sylora AI, battle, Director) emit through this spine.
 */
export function createPlatformEvent({
  eventType,
  actor = null,
  target = null,
  liveRoomId = null,
  correlationId = null,
  payload = {},
  schemaVersion = EVENT_SPINE_VERSION
} = {}) {
  if (!eventType || !KNOWN_TYPES.has(eventType)) {
    const error = new Error(`INVALID_PLATFORM_EVENT_TYPE:${eventType}`);
    error.code = 'INVALID_PLATFORM_EVENT_TYPE';
    throw error;
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    const error = new Error('INVALID_PLATFORM_EVENT_PAYLOAD');
    error.code = 'INVALID_PLATFORM_EVENT_PAYLOAD';
    throw error;
  }
  return Object.freeze({
    eventId: `evt_${randomUUID()}`,
    eventType,
    timestamp: new Date().toISOString(),
    actor: actor ? Object.freeze({ ...actor }) : null,
    target: target ? Object.freeze({ ...target }) : null,
    liveRoomId: liveRoomId || null,
    correlationId: correlationId || null,
    payload: Object.freeze({ ...payload }),
    schemaVersion
  });
}

export function validatePlatformEvent(event) {
  const errors = [];
  if (!event?.eventId) errors.push('missing eventId');
  if (!event?.eventType || !KNOWN_TYPES.has(event.eventType)) errors.push('invalid eventType');
  if (!event?.timestamp || Number.isNaN(Date.parse(event.timestamp))) errors.push('invalid timestamp');
  if (!event?.payload || typeof event.payload !== 'object') errors.push('invalid payload');
  if (event?.schemaVersion != null && event.schemaVersion !== EVENT_SPINE_VERSION) errors.push('unsupported schemaVersion');
  return { valid: errors.length === 0, errors };
}

export function platformEventTypes() {
  return [...KNOWN_TYPES].sort();
}
