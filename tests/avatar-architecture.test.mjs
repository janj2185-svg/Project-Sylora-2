import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createAvatarAdapter, detectDigitalHumanAsset, Vrm3dAvatarAdapter } from '../public/avatar/adapter.js';
import { normalizeBehavior, CAPABILITY } from '../public/avatar/contract.js';
import { avatarArchitectureReport, DIGITAL_HUMAN_SPEC } from '../src/ecosystem/avatar-digital-human.mjs';
import { resolveRealtimeVoiceId, voiceCatalogPayload } from '../src/ecosystem/voice-provider.mjs';
import { CONVERSATION_SCENARIOS, scoreNaturalness, scenariosByCategory } from '../src/ecosystem/conversational-scenarios.mjs';
import { buildPersonalityInstructions } from '../src/ecosystem/sylora-intelligence.mjs';

test('repo has no production VRM/GLB digital human — ASSET_REQUIRED', () => {
  const report = avatarArchitectureReport(fs, path);
  assert.equal(report.modelStatus, 'ASSET_REQUIRED');
  assert.ok(report.assets3dFound.length === 0);
  assert.ok(report.assets3dMissing.length >= 1);
  assert.ok(DIGITAL_HUMAN_SPEC.facialBlendshapesMinimum.includes('viseme_aa'));
});

test('detectDigitalHumanAsset is honest without inventing files', () => {
  const miss = detectDigitalHumanAsset();
  assert.equal(miss.available, false);
  assert.equal(miss.status, CAPABILITY.ASSET_REQUIRED);
});

test('createAvatarAdapter defaults to 2d-png fallback', () => {
  const host = { dataset: {}, style: { setProperty() {} }, querySelector() { return null }, _syloraMotionRig: null };
  const adapter = createAvatarAdapter(host, { prefer: 'auto' });
  assert.equal(adapter.kind, '2d-png');
  assert.equal(adapter.capabilities.skeleton, CAPABILITY.NOT_SUPPORTED);
  assert.equal(adapter.capabilities.facialBlendshapes, CAPABILITY.NOT_SUPPORTED);
});

test('3d adapter reports ASSET_REQUIRED when missing', async () => {
  const host = { dataset: {} };
  const adapter = new Vrm3dAvatarAdapter(host);
  await adapter.mount();
  const status = adapter.getStatus();
  assert.equal(status.status, CAPABILITY.ASSET_REQUIRED);
  assert.equal(adapter.capabilities.visemes, CAPABILITY.ASSET_REQUIRED);
});

test('behavior contract normalizes nested AI payloads', () => {
  const b = normalizeBehavior({ behavior: { emotion: 'happy', intensity: 0.8, gestureIntent: 'positive', animationCue: 'celebrate' } });
  assert.equal(b.emotion, 'happy');
  assert.equal(b.gestureIntent, 'positive');
  assert.equal(b.animationCue, 'celebrate');
});

test('voice catalog is selectable and not single-hardcoded', () => {
  const cat = voiceCatalogPayload();
  assert.ok(cat.realtimeVoices.length >= 5);
  assert.equal(resolveRealtimeVoiceId({ voiceId: 'shimmer' }), 'shimmer');
  assert.equal(resolveRealtimeVoiceId({ voiceId: 'not-a-voice' }), resolveRealtimeVoiceId({}));
});

test('30+ conversational scenarios cover required categories', () => {
  assert.ok(CONVERSATION_SCENARIOS.length >= 30);
  const cats = scenariosByCategory();
  for (const need of ['casual', 'humor', 'sad', 'happy', 'live', 'gift', 'question', 'argument', 'silence', 'topic_switch', 'memory', 'short', 'long']) {
    assert.ok(cats[need]?.length, `missing category ${need}`);
  }
});

test('naturalness scorer flags helpdesk patterns separately from facts', () => {
  const scenario = CONVERSATION_SCENARIOS.find(s => s.id === 'no_helpdesk');
  const bad = scoreNaturalness('Чим я можу допомогти вам сьогодні?', scenario);
  const good = scoreNaturalness('Можемо почати з одного кроку — що для тебе зараз головне?', scenario);
  assert.ok(bad.score < 0.7);
  assert.ok(good.score >= 0.8);
  assert.ok(bad.flags.includes('helpdesk_opener'));
});

test('personality instructions still ban helpdesk patterns', () => {
  const text = buildPersonalityInstructions({ locale: 'uk' });
  assert.match(text, /companion|helpdesk|template openers/i);
});

test('app wires avatar adapter module', () => {
  const app = fs.readFileSync('public/app.js', 'utf8');
  assert.match(app, /createAvatarAdapter/);
  assert.match(app, /settingsRealtimeVoice|sylora_realtime_voice/);
  assert.match(app, /x-sylora-voice/);
});
