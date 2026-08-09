import test from 'node:test';
import assert from 'node:assert/strict';
import {PLATFORM_CAPABILITIES, PLATFORM_EVENT_TYPES, validatePlatformVision} from '../src/platform-vision.mjs';

test('all fourteen future-facing SYLORA capabilities have reserved contracts', () => {
  assert.equal(PLATFORM_CAPABILITIES.length, 14);
  assert.deepEqual(validatePlatformVision(), {capabilities: 14, events: 30});
  assert.equal(new Set(PLATFORM_EVENT_TYPES).size, PLATFORM_EVENT_TYPES.length);
});

test('high-risk autonomous capabilities preserve explicit human authority in their proof contract', () => {
  const twin = PLATFORM_CAPABILITIES.find(x => x.id === 'creator-digital-twin');
  const business = PLATFORM_CAPABILITIES.find(x => x.id === 'ai-business-partner');
  const moments = PLATFORM_CAPABILITIES.find(x => x.id === 'sylora-moments');
  assert.match(twin.firstProof, /explicit authority/i);
  assert.match(business.firstProof, /human-controlled/i);
  assert.ok(moments.events.includes('moment.publish.approved'));
});
