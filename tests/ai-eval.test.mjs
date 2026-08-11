import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPersonalityInstructions,
  sanitizeMemoryValue,
  modeFromView,
  SYLORA_MODES
} from '../src/ecosystem/sylora-intelligence.mjs';
import {
  analyzeLiveRoom,
  buildCreatorContentPack,
  summarizeMeetingNotes,
  proposeTasksFromDecisions,
  buildLessonQuiz,
  adaptiveLearningState,
  homeHubPayload
} from '../src/ecosystem/domain-intelligence.mjs';

test('eval: one Sylora personality across modes (no separate bots)', () => {
  for (const view of ['ai', 'studio', 'business', 'learning', 'live']) {
    const mode = modeFromView(view);
    const text = buildPersonalityInstructions({ mode, locale: 'uk', proactive: 'IMPORTANT_ONLY' });
    assert.match(text, /one continuous Personal AI identity/i);
    assert.match(text, new RegExp(SYLORA_MODES[mode].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(text, /Business Bot|Science Bot|LIVE Bot|Learning Bot|Support Bot/i);
  }
});

test('eval: memory rejects secrets (safety)', () => {
  assert.throws(() => sanitizeMemoryValue('password=hunter2'), /MEMORY_SECRET_REJECTED/);
  assert.throws(() => sanitizeMemoryValue('Bearer abcdefghijklmnop'), /MEMORY_SECRET_REJECTED/);
});

test('eval: creator insights use real metrics only (no fake analytics)', () => {
  const empty = analyzeLiveRoom({ room: { id: 'l1', title: 'Demo' }, engagement: {}, chat: [], gifts: [] });
  assert.equal(empty.honestEmpty, true);
  assert.equal(empty.metrics.source, 'platform_store');
  assert.equal(empty.metrics.likes, 0);
  const rich = analyzeLiveRoom({
    room: { id: 'l1', title: 'Demo', viewerCount: 4 },
    engagement: { likes: 12 },
    chat: [{ text: 'hello' }, { text: 'wow' }, { text: 'more' }, { text: 'chat' }, { text: 'go' }],
    gifts: [{ amount: 25 }, { amount: 10 }]
  });
  assert.equal(rich.honestEmpty, false);
  assert.equal(rich.metrics.giftVolume, 35);
  assert.ok(rich.moments.length >= 2);
  const pack = buildCreatorContentPack({ topic: 'Demo', analysis: rich });
  assert.equal(pack.requiresConfirmation, true);
  assert.ok(pack.clipCandidates.every(c => c.status === 'draft_requires_confirmation'));
});

test('eval: business summary does not invent decisions', () => {
  const summary = summarizeMeetingNotes({ notes: 'Discussed roadmap.\nRisk: vendor delay.\nDecision: ship MVP Friday.' });
  assert.ok(summary.decisions.some(d => /MVP/i.test(d)));
  assert.ok(summary.risks.some(r => /vendor/i.test(r)));
  assert.match(summary.factPolicy, /Do not invent/);
  const tasks = proposeTasksFromDecisions(summary.decisions);
  assert.ok(tasks.every(t => t.requiresConfirmation));
});

test('eval: learning adaptive difficulty responds to errors', () => {
  const quiz = buildLessonQuiz({ lesson: { id: 'les1', title: 'Vectors', content: 'Vectors have magnitude and direction. They are used in physics and graphics. Unit vectors normalize length.' } });
  assert.equal(quiz.questions.length, 1);
  assert.ok(quiz.questions[0].options.length >= 2);
  const hard = adaptiveLearningState({ progressRatio: 0.9, attempts: [{ correct: true }, { correct: true }, { correct: true }, { correct: true }] });
  assert.equal(hard.difficulty, 'harder');
  const easy = adaptiveLearningState({ progressRatio: 0.1, attempts: [{ correct: false }, { correct: false }, { correct: false }] });
  assert.equal(easy.difficulty, 'easier');
});

test('eval: multilingual personality hint for UA/PL/EN/DE', () => {
  for (const locale of ['uk', 'pl', 'en', 'de']) {
    const text = buildPersonalityInstructions({ mode: 'personal', locale, proactive: 'NORMAL' });
    assert.match(text, new RegExp(`Preferred locale hint: ${locale}`));
  }
});

test('eval: home hub payload stays data-driven', () => {
  const hub = homeHubPayload({
    me: { id: 'u1' },
    rooms: [{ id: 'r1', title: 'Live A', viewerCount: 2 }],
    notifications: [{ read: false }, { read: true }],
    conversations: [{ id: 'c1', lastMessage: { text: 'hi' }, members: [] }],
    enrollments: [{ courseId: 'c1', progress: 0.25 }],
    courses: [{ id: 'c1', title: 'Course' }],
    activity: [{ summary: 'Sylora відповіла' }]
  });
  assert.equal(hub.inboxPreview.unreadNotifications, 1);
  assert.ok(hub.continue.length >= 1);
  assert.equal(hub.live[0].title, 'Live A');
});
