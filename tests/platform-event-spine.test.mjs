import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlatformEvent, validatePlatformEvent, platformEventTypes } from '../src/platform-event-spine.mjs';

test('platform event spine validates canonical contract', () => {
  const event = createPlatformEvent({
    eventType: 'gift.interaction.requested',
    liveRoomId: 'live-1',
    actor: { type: 'user', id: 'u1' },
    payload: { giftId: 'spark', quantity: 1 }
  });
  const check = validatePlatformEvent(event);
  assert.equal(check.valid, true);
  assert.ok(event.eventId.startsWith('evt_'));
  assert.equal(event.schemaVersion, 1);
  assert.ok(platformEventTypes().includes('live.started'));
});

test('platform event spine rejects unknown types', () => {
  assert.throws(() => createPlatformEvent({ eventType: 'chaos.event', payload: {} }));
});
