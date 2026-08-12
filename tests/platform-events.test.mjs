import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emitPlatformEvent,
  emitGiftLifecycleEvents,
  capabilityRegistry,
  CAPABILITY_STATUS,
  onPlatformEvent
} from '../src/platform-events.mjs';

test('platform event spine emits gift and world events', () => {
  const seen = [];
  const off = onPlatformEvent('gift.interaction.requested', e => seen.push(e.eventType));
  onPlatformEvent('world.state.changed', e => seen.push(e.eventType));
  emitGiftLifecycleEvents({
    gift: { id: 'cosmos' },
    liveId: 'live-1',
    sender: { id: 'u1' },
    recipient: { id: 'u2' },
    quantity: 1
  });
  assert.ok(seen.includes('gift.interaction.requested'));
  assert.ok(seen.includes('world.state.changed'));
  off();
});

test('capability registry exposes honest runtime status', () => {
  const reg = capabilityRegistry();
  assert.equal(reg.length, 14);
  const economy = reg.find(c => c.id === 'creator-economy');
  assert.equal(economy.runtimeStatus, CAPABILITY_STATUS.MOCK);
  const translation = reg.find(c => c.id === 'live-translation');
  assert.equal(translation.runtimeStatus, CAPABILITY_STATUS.BLOCKED_EXTERNAL);
});

test('unknown platform events are ignored safely', () => {
  assert.equal(emitPlatformEvent('not.a.real.event', {}), false);
});
