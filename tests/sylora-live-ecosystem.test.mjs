import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LiveEventBus } from '../src/live/events/bus.mjs';
import { createLiveEvent } from '../src/live/core/types.mjs';
import { shouldAiSpeak, normalizeAiHostControls } from '../src/live/ai-host/autonomy.mjs';
import { AutomationEngine, createAutomationRule, AUTOMATION_TEMPLATES } from '../src/live/automation/engine.mjs';
import { UnifiedLiveChat } from '../src/live/chat/unified-chat.mjs';
import { scoreChatMessage, rankMessages } from '../src/live/chat/priority.mjs';
import { capabilityMatrixRows } from '../src/live/platforms/capabilities.mjs';
import { canTakeTurn, applyVadFrame, applyTranscript, createTurnTakingState } from '../src/live/voice/turn-taking.mjs';
import { moderateMessage } from '../src/live/moderation/assistant.mjs';
import { buildStreamRecap } from '../src/live/analytics/recap.mjs';
import { LiveAnalytics } from '../src/live/analytics/realtime.mjs';

test('live event bus dedupes, rate-limits, and preserves critical events', () => {
  const bus = new LiveEventBus({ ratePerSec: 1000, maxQueue: 5 });
  const a = createLiveEvent({ platform: 'sylora', eventType: 'chat_message', message: 'hi', eventId: 'e1', userId: 'u1' });
  assert.equal(bus.publish(a).accepted, true);
  assert.equal(bus.publish(a).accepted, false);
  assert.equal(bus.publish(a).reason, 'duplicate');
  for (let i = 0; i < 6; i++) {
    bus.publish(createLiveEvent({
      platform: 'sylora', eventType: 'chat_message', message: `m${i}`, eventId: `c${i}`, userId: 'u2'
    }));
  }
  assert.ok(bus.stats().queued <= 5);
  const gift = createLiveEvent({ platform: 'sylora', eventType: 'gift', eventId: 'g1', amount: 10, userId: 'u3', gift: { id: 'spark' } });
  assert.equal(bus.publish(gift).accepted, true);
});

test('AI autonomy never interrupts host when protection on', () => {
  const d = shouldAiSpeak({
    controls: { autonomy: 'CO_HOST', interruptProtection: true },
    addressedToSylora: true,
    hostSpeaking: true
  });
  assert.equal(d.speak, false);
  assert.equal(d.reason, 'host_speaking');
  const ok = shouldAiSpeak({
    controls: normalizeAiHostControls({ autonomy: 'ASSIST' }),
    addressedToSylora: true,
    hostSpeaking: false,
    silenceMs: 5000
  });
  assert.equal(ok.speak, true);
});

test('automation WHEN/IF/THEN fires planned actions only', () => {
  const rule = createAutomationRule({
    id: 'r1', userId: 'u', name: 'Big gift',
    when: { eventType: 'gift' },
    if: [{ field: 'amount', op: 'gte', value: 50 }],
    then: [{ action: 'sylora_say', params: { template: 'thank_gift' } }, { action: 'avatar_emotion', params: { emotion: 'excited' } }]
  });
  const engine = new AutomationEngine({ rules: [rule] });
  assert.equal(engine.evaluate({ eventType: 'gift', amount: 10 }).length, 0);
  const fired = engine.evaluate({ eventType: 'gift', amount: 80 });
  assert.equal(fired.length, 1);
  assert.equal(fired[0].actions[0].status, 'planned');
  assert.ok(AUTOMATION_TEMPLATES.length >= 3);
});

test('unified chat badges + priority + moderation', () => {
  const chat = new UnifiedLiveChat();
  const r = chat.ingestNormalizedEvent(createLiveEvent({
    platform: 'twitch', eventType: 'chat_message', message: 'Sylora how are you?', username: 'alex', userId: 'a1'
  }));
  assert.equal(r.accepted, true);
  assert.equal(r.message.badge.label, 'Twitch');
  assert.equal(r.message.mentionsSylora, true);
  const scored = scoreChatMessage(r.message);
  assert.ok(scored.score >= 50);
  const ranked = rankMessages([r.message]);
  assert.equal(ranked[0].id, r.message.id);
  const mod = moderateMessage('free followers http://x.com http://y.com');
  assert.ok(mod.flags.includes('spam') || mod.flags.includes('scam'));
});

test('capability matrix is honest — no fake WORKING for TikTok/IG', () => {
  const rows = capabilityMatrixRows();
  const tiktok = rows.find(r => r.platform === 'tiktok');
  const ig = rows.find(r => r.platform === 'instagram');
  const sylora = rows.find(r => r.platform === 'sylora');
  assert.equal(sylora.status, 'WORKING');
  assert.notEqual(tiktok.status, 'WORKING');
  assert.equal(ig.status, 'UNAVAILABLE');
});

test('voice turn-taking + recap drafts do not auto-publish', () => {
  let turn = createTurnTakingState();
  turn = applyVadFrame(turn, { speaking: true, rms: 0.1 });
  assert.equal(turn.hostSpeaking, true);
  turn = applyTranscript(turn, 'Hey Sylora what is next?');
  assert.equal(turn.addressedToSylora, true);
  turn = applyVadFrame(turn, { speaking: false, rms: 0, now: Date.now() + 1000 });
  const gate = canTakeTurn({ ...turn, hostSpeaking: false, pauseMs: 3000 }, { autonomy: 'ASSIST', minimumSilenceMs: 2500 });
  assert.equal(gate.ok, true);
  const analytics = new LiveAnalytics();
  analytics.markStarted();
  analytics.ingest(createLiveEvent({ platform: 'sylora', eventType: 'chat_message', message: 'hi?' }));
  const recap = buildStreamRecap({ analytics, chatSample: [{ text: 'hi?', platform: 'sylora', username: 'a' }], gifts: [] });
  assert.equal(recap.publish, false);
  assert.ok(recap.titles.length);
});

test('HTTP: sylora-live overview, connections honesty, chat ingest, automation, host', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-live-'));
  process.env.NODE_ENV = 'test';
  process.env.SYLORA_DATA_FILE = path.join(dir, 'db.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  delete process.env.OPENAI_API_KEY;

  const { server } = await import(`../src/server.mjs?liveeco=${Date.now()}`);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (pathname, options = {}) => {
    const response = await fetch(`${base}${pathname}`, {
      ...options,
      headers: { 'content-type': 'application/json', ...(options.headers || {}) }
    });
    return { status: response.status, data: await response.json().catch(() => ({})) };
  };

  try {
    const reg = await call('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'live@eco.dev', username: 'liveeco', password: 'password123' })
    });
    const auth = { authorization: `Bearer ${reg.data.token}` };

    const caps = await call('/api/sylora-live/capabilities');
    assert.equal(caps.status, 200);
    assert.ok(caps.data.matrix.some(r => r.platform === 'youtube'));

    const overview = await call('/api/sylora-live/overview', { headers: auth });
    assert.equal(overview.status, 200);
    assert.equal(overview.data.product, 'SYLORA LIVE');
    assert.ok(overview.data.connections.some(c => c.platform === 'sylora'));

    const yt = await call('/api/sylora-live/connections/youtube/connect', { method: 'POST', headers: auth, body: '{}' });
    assert.equal(yt.status, 503);
    assert.equal(yt.data.connection.state, 'AUTH_REQUIRED');

    const ig = await call('/api/sylora-live/connections/instagram/connect', { method: 'POST', headers: auth, body: '{}' });
    assert.equal(ig.status, 503);
    assert.equal(ig.data.connection.state, 'UNAVAILABLE');

    const sylora = await call('/api/sylora-live/connections/sylora/connect', { method: 'POST', headers: auth, body: '{}' });
    assert.equal(sylora.status, 200);
    assert.equal(sylora.data.connection.state, 'CONNECTED');

    const live = await call('/api/live', { method: 'POST', headers: auth, body: JSON.stringify({ title: 'Eco LIVE' }) });
    const liveId = live.data.live?.id || live.data.room?.id;
    assert.ok(liveId);
    const bind = await call('/api/sylora-live/bind', { method: 'POST', headers: auth, body: JSON.stringify({ liveId }) });
    assert.equal(bind.status, 200);

    const ingest = await call('/api/sylora-live/chat/ingest', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ liveId, text: 'Sylora, привіт з чату!', username: 'viewer1', userId: 'v1' })
    });
    assert.ok([200, 201].includes(ingest.status));

    const chat = await call('/api/sylora-live/chat', { headers: auth });
    assert.ok(chat.data.messages.some(m => /привіт|Sylora/i.test(m.text)));

    const host = await call('/api/sylora-live/host', {
      method: 'PATCH', headers: auth,
      body: JSON.stringify({ autonomy: 'CO_HOST', giftReactions: true })
    });
    assert.equal(host.data.controls.autonomy, 'CO_HOST');

    const rule = await call('/api/sylora-live/automation', {
      method: 'POST', headers: auth,
      body: JSON.stringify({
        name: 'Thanks',
        when: { eventType: 'gift' },
        if: [{ field: 'amount', op: 'gte', value: 1 }],
        then: [{ action: 'sylora_say', params: {} }]
      })
    });
    assert.equal(rule.status, 201);

    const fixture = await call('/api/sylora-live/dev/fixture', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ eventType: 'gift', amount: 25, username: 'donor', userId: 'd1', gift: { id: 'spark', name: 'Crystal Star' } })
    });
    assert.equal(fixture.status, 201);

    const events = await call('/api/sylora-live/events', { headers: auth });
    assert.ok(events.data.events.length >= 1);

    const recap = await call('/api/sylora-live/recap', { method: 'POST', headers: auth, body: '{}' });
    assert.equal(recap.data.recap.publish, false);

    const appJs = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
    assert.match(appJs, /liveStudio/);
    assert.match(appJs, /live-studio\.js/);
    assert.ok(fs.existsSync(new URL('../public/live-studio.js', import.meta.url)));
  } finally {
    await new Promise(r => server.close(r));
  }
});
