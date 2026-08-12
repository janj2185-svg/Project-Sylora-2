import { PLATFORM_CAPABILITIES, PLATFORM_EVENT_TYPES } from './platform-vision.mjs';

/** Honest runtime status per capability — not inferred from file existence. */
export const CAPABILITY_STATUS = Object.freeze({
  WORKING: 'WORKING',
  PARTIAL: 'PARTIAL',
  STUB: 'STUB',
  MOCK: 'MOCK',
  BLOCKED_EXTERNAL: 'BLOCKED_EXTERNAL',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED'
});

const STATUS_BY_ID = Object.freeze({
  'living-world': CAPABILITY_STATUS.NOT_IMPLEMENTED,
  'ai-director': CAPABILITY_STATUS.NOT_IMPLEMENTED,
  'gift-interactions': CAPABILITY_STATUS.PARTIAL,
  'collective-gifts': CAPABILITY_STATUS.NOT_IMPLEMENTED,
  'gift-evolution': CAPABILITY_STATUS.NOT_IMPLEMENTED,
  'living-ai': CAPABILITY_STATUS.PARTIAL,
  'live-translation': CAPABILITY_STATUS.BLOCKED_EXTERNAL,
  'ai-co-creator': CAPABILITY_STATUS.PARTIAL,
  'creator-digital-twin': CAPABILITY_STATUS.NOT_IMPLEMENTED,
  'live-worlds': CAPABILITY_STATUS.NOT_IMPLEMENTED,
  'story-live': CAPABILITY_STATUS.NOT_IMPLEMENTED,
  'creator-economy': CAPABILITY_STATUS.MOCK,
  'ai-business-partner': CAPABILITY_STATUS.PARTIAL,
  'sylora-moments': CAPABILITY_STATUS.MOCK
});

const listeners = new Map();
for (const type of PLATFORM_EVENT_TYPES) listeners.set(type, new Set());

export function capabilityStatus(id) {
  return STATUS_BY_ID[id] || CAPABILITY_STATUS.NOT_IMPLEMENTED;
}

export function capabilityRegistry() {
  return PLATFORM_CAPABILITIES.map(cap => ({
    ...cap,
    runtimeStatus: capabilityStatus(cap.id)
  }));
}

export function onPlatformEvent(type, handler) {
  if (!listeners.has(type)) throw new Error(`Unknown platform event: ${type}`);
  listeners.get(type).add(handler);
  return () => listeners.get(type).delete(handler);
}

export function emitPlatformEvent(type, payload = {}, meta = {}) {
  if (!listeners.has(type)) return false;
  const event = Object.freeze({
    type,
    payload,
    meta: Object.freeze({ ...meta, at: new Date().toISOString() }),
    id: meta.id || `pev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  });
  for (const handler of listeners.get(type)) {
    try { handler(event); } catch (e) { console.error('[platform-event]', type, e?.message || e); }
  }
  return true;
}

/** Map gift/LIVE facts to platform spine events (first wiring). */
export function emitGiftLifecycleEvents({ gift, liveId, sender, recipient, quantity = 1 }) {
  emitPlatformEvent('gift.interaction.requested', {
    giftId: gift?.id,
    liveId: liveId || null,
    senderId: sender?.id,
    recipientId: recipient?.id,
    quantity
  }, { source: 'wallet.gift.send' });
  if (liveId) {
    emitPlatformEvent('world.state.changed', {
      liveId,
      signal: 'gift.received',
      giftId: gift?.id,
      intensity: quantity
    }, { source: 'live.gift' });
    emitPlatformEvent('assistant.reaction.requested', {
      liveId,
      trigger: 'gift',
      giftId: gift?.id
    }, { source: 'living-ai' });
  }
}

export function emitLiveStartedEvents({ live, host }) {
  emitPlatformEvent('world.state.changed', {
    liveId: live.id,
    signal: 'live.started',
    hostId: host?.id
  }, { source: 'live.create' });
}
