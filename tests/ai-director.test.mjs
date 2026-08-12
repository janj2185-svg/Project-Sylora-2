import test from 'node:test';
import assert from 'node:assert/strict';
import { AIDirectorEngine, directorStatus } from '../src/ecosystem/ai-director.mjs';
import { createPlatformEvent } from '../src/platform-event-spine.mjs';

test('AI Director proposes advisory cues only', () => {
  const director = new AIDirectorEngine();
  for (let i = 0; i < 10; i++) {
    director.ingest(createPlatformEvent({
      eventType: 'live.chat.message',
      liveRoomId: 'live-1',
      payload: { text: 'hello' }
    }));
  }
  const cue = director.propose({ liveRoomId: 'live-1', viewerCount: 12 });
  assert.equal(cue.eventType, 'director.cue.proposed');
  assert.equal(cue.payload.mode, 'advisory');
  assert.equal(cue.payload.autoExecute, false);
  const status = directorStatus();
  assert.equal(status.mode, 'advisory');
});
