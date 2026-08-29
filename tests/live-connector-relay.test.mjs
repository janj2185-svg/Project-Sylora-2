import test from 'node:test';
import assert from 'node:assert/strict';
import { LiveConnectorRelay } from '../src/live-connector-relay.mjs';
import { normalizeRelayBaseUrl, TikTokRelayUplink } from '../src/tiktok-relay-uplink.mjs';

test('LIVE connector tokens are one-time-visible, owner scoped, expiring and secret-free in status', () => {
  let now = Date.parse('2026-08-28T12:00:00.000Z');
  const relay = new LiveConnectorRelay({ now: () => now, ttlMs: 60_000, maxEventsPerRoom: 20 });
  const issued = relay.issue({ liveId: 'live-1', userId: 'owner-1' });
  assert.match(issued.token, /^slr_live_[A-Za-z0-9_-]{40,}$/);
  assert.equal(issued.pairing.liveId, 'live-1');
  assert.equal(JSON.stringify(relay.pairingsFor('live-1', 'owner-1')).includes(issued.token), false);
  assert.throws(() => relay.verify(issued.token, 'live-2'), /LIVE_RELAY_SCOPE_MISMATCH/);
  assert.equal(relay.verify(issued.token, 'live-1').provider, 'tikfinity');

  const first = relay.ingest(issued.token, 'live-1', { event: 'chat', id: 'chat-1', uniqueId: 'viewer', nickname: 'Viewer', comment: 'Привіт' });
  const duplicate = relay.ingest(issued.token, 'live-1', { event: 'chat', id: 'chat-1', uniqueId: 'viewer', nickname: 'Viewer', comment: 'Привіт' });
  const normalized = relay.ingest(issued.token, 'live-1', { event: { type: 'gift', id: 'gift-1', occurredAt: '2026-08-28T12:00:01.000Z', user: { username: 'fan', displayName: 'Fan' }, gift: { id: 'rose', name: 'Rose', count: 3, diamonds: 20 } } });
  assert.equal(first.accepted, true);
  assert.equal(first.event.source, 'tikfinity-owner-relay');
  assert.equal(duplicate.duplicate, true);
  assert.equal(normalized.event.gift.count, 3);
  assert.deepEqual(relay.eventsAfter('live-1', 1).events.map(event => event.id), ['gift-1']);

  now += 60_001;
  assert.throws(() => relay.verify(issued.token, 'live-1'), /LIVE_RELAY_TOKEN_INVALID|LIVE_RELAY_TOKEN_EXPIRED/);
});

test('desktop uplink accepts HTTPS or loopback dev only and never exposes its relay token', async () => {
  assert.equal(normalizeRelayBaseUrl('https://sylora.example/'), 'https://sylora.example');
  assert.equal(normalizeRelayBaseUrl('http://127.0.0.1:8787/'), 'http://127.0.0.1:8787');
  assert.throws(() => normalizeRelayBaseUrl('http://sylora.example'), /LIVE_RELAY_HTTPS_REQUIRED/);
  assert.throws(() => normalizeRelayBaseUrl('https://user:pass@sylora.example'), /LIVE_RELAY_URL_INVALID/);

  const token = `slr_live_${'a'.repeat(43)}`;
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ accepted: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  let served = false;
  const uplink = new TikTokRelayUplink({
    eventsAfter: () => served ? { events: [] } : (served = true, { events: [{ cursor: 1, type: 'chat', id: 'chat-1', text: 'hello' }] }),
    fetchImpl,
    pollMs: 250
  });
  await uplink.connect({ baseUrl: 'https://sylora.example', liveId: 'live-1', token });
  await new Promise(resolve => setTimeout(resolve, 20));
  const snapshot = uplink.snapshot();
  assert.equal(snapshot.connected, true);
  assert.equal(snapshot.cursor, 1);
  assert.equal(JSON.stringify(snapshot).includes(token), false);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.endsWith('/check'), true);
  assert.equal(calls[1].url.endsWith('/events'), true);
  assert.equal(calls[1].options.headers.authorization, `Bearer ${token}`);
  uplink.disconnect();
});
