import test from 'node:test';
import assert from 'node:assert/strict';
import { SyloraContextEngine, SyloraReactionEngine } from '../src/ecosystem/living-sylora/index.mjs';
import { createPlatformEvent } from '../src/platform-event-spine.mjs';

test('Living Sylora observes gift and produces structured reaction', async () => {
  const ctx = new SyloraContextEngine();
  const engine = new SyloraReactionEngine({ contextEngine: ctx, aiComplete: null });
  const event = createPlatformEvent({
    eventType: 'gift.interaction.requested',
    liveRoomId: 'live-abc',
    payload: { giftId: 'cosmos', quantity: 2 }
  });
  const reaction = await engine.react(event);
  assert.equal(reaction.eventType, 'assistant.reaction.ready');
  assert.ok(reaction.payload.text);
  assert.ok(reaction.payload.emotion);
  assert.ok(['none', 'highlight_gift'].includes(reaction.payload.action));
  assert.equal(reaction.payload.fallback, true);
  assert.equal(reaction.payload.provider, 'local_fallback');
  assert.equal(reaction.payload.aiStatus, 'AI_DEGRADED');
});
