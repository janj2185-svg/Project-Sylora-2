import test from 'node:test';
import assert from 'node:assert/strict';
import { GestureEngine, detectEmotionFromText, GESTURE_CATALOG } from '../public/sylora-living.js';
import { livingStateFrom, detectQualityTier } from '../public/sylora-motion.js';
import { resolveVoiceProvider, conversationalPersonalityAddon } from '../src/ecosystem/voice-provider.mjs';
import { buildPersonalityInstructions } from '../src/ecosystem/sylora-intelligence.mjs';
import fs from 'node:fs';

test('gesture engine avoids immediate repeats via cooldown', () => {
  let i = 0;
  const engine = new GestureEngine({ random: () => (i++ % 2 === 0 ? 0 : 0.99) });
  const first = engine.pick({ presence: 'speaking', emotion: 'happy', force: true, now: 1000 });
  const second = engine.pick({ presence: 'speaking', emotion: 'happy', force: false, now: 1100 });
  assert.equal(second, first); // cooldown holds
  const third = engine.pick({ presence: 'speaking', emotion: 'happy', force: false, now: 4000 });
  assert.ok(GESTURE_CATALOG[third]);
});

test('living states map presence and emotion', () => {
  assert.equal(livingStateFrom({ presence: 'listening' }), 'idle_listening');
  assert.equal(livingStateFrom({ presence: 'speaking', emotion: 'happy' }), 'speaking_happy');
  assert.equal(livingStateFrom({ presence: 'ready' }), 'idle_neutral');
});

test('quality tier prefers mobile on narrow viewports', () => {
  assert.equal(detectQualityTier({ width: 390 }), 'MOBILE');
  assert.equal(detectQualityTier({ width: 1400 }), 'HIGH');
  assert.equal(detectQualityTier({ reducedMotion: true }), 'LOW');
});

test('personality instructions ban helpdesk patterns', () => {
  const text = buildPersonalityInstructions({ locale: 'uk' });
  assert.match(text, /helpdesk|companion|template openers/i);
  assert.match(conversationalPersonalityAddon(), /short question/);
});

test('voice provider stays honest without inventing credentials', () => {
  const snap = resolveVoiceProvider();
  assert.ok(['READY', 'PARTIAL'].includes(snap.status));
  assert.ok(snap.honesty || snap.note);
});

test('emotion detector and assembled CSS include mobile living framing', () => {
  assert.equal(detectEmotionFromText('дякую дуже'), 'grateful');
  const css = fs.readFileSync('public/design-avatar-assembled.css', 'utf8');
  assert.match(css, /100dvh/);
  assert.match(css, /safe-area-inset/);
  assert.match(css, /sylora-life-blink/);
  assert.match(css, /max-width:320px/);
  const app = fs.readFileSync('public/app.js', 'utf8');
  assert.match(app, /SyloraLivingController/);
  assert.match(app, /onAudioDelta/);
  assert.match(app, /normalizeSpeakMeta/);
  assert.doesNotMatch(app, /function startSyloraBodyLife/);
  assert.doesNotMatch(app, /function startSyloraHairPhysics/);
});

test('server inferAssistantBehavior is unicode-aware for Ukrainian', () => {
  const server = fs.readFileSync('src/server.mjs', 'utf8');
  assert.match(server, /\\p\{L\}/);
  assert.match(server, /inferAssistantBehavior/);
  assert.equal(detectEmotionFromText('дякую'), 'grateful');
  assert.equal(detectEmotionFromText('це важливо і серйозно'), 'serious');
});
