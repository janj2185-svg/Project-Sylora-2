import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createCallSession,
  acceptCall,
  declineCall,
  endCall,
  cancelOutgoingCall,
  applyRingTimeout,
  validateCallSignal,
  nextCallStatus,
  CALL_SIGNAL_KINDS,
  setCallMedia
} from '../src/ecosystem/call-engine.mjs';

async function startServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-call-sm-'));
  process.env.SYLORA_DATA_FILE = path.join(dir, 'data.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.NODE_ENV = 'test';
  process.env.SYLORA_CALL_RING_TIMEOUT_MS = '50';
  const { server } = await import(`../src/server.mjs?callsm=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}`, dir };
}

async function req(base, pathname, { method = 'GET', token, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${pathname}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test('call signaling state machine helpers', () => {
  assert.equal(nextCallStatus('ringing', 'accept'), 'active');
  assert.equal(nextCallStatus('ringing', 'cancel'), 'cancelled');
  assert.equal(nextCallStatus('ringing', 'timeout'), 'missed');
  assert.equal(nextCallStatus('active', 'end'), 'ended');
  assert.equal(nextCallStatus('ended', 'accept'), 'ended');

  const call = createCallSession({ id: 'c1', kind: 'voice', initiatorId: 'a', participantIds: ['b'] });
  assert.equal(call.status, 'ringing');
  const cancelled = cancelOutgoingCall(call, 'a');
  assert.equal(cancelled.ok, true);
  assert.equal(call.status, 'cancelled');

  const call2 = createCallSession({ id: 'c2', kind: 'video', initiatorId: 'a', participantIds: ['b'] });
  call2.startedAt = new Date(Date.now() - 60_000).toISOString();
  const timed = applyRingTimeout(call2, { timeoutMs: 45_000 });
  assert.equal(timed.timedOut, true);
  assert.equal(call2.status, 'missed');

  const call3 = createCallSession({ id: 'c3', kind: 'voice', initiatorId: 'a', participantIds: ['b'] });
  assert.equal(acceptCall(call3, 'b').ok, true);
  assert.equal(call3.status, 'active');
  assert.equal(setCallMedia(call3, 'a', { muted: true }).ok, true);
  assert.equal(call3.participants.find(p => p.userId === 'a').muted, true);
  assert.equal(endCall(call3, 'a').ok, true);
  assert.equal(call3.status, 'ended');

  const call4 = createCallSession({ id: 'c4', kind: 'voice', initiatorId: 'a', participantIds: ['b'] });
  assert.equal(declineCall(call4, 'b').ok, true);

  for (const kind of CALL_SIGNAL_KINDS) {
    const payload = { kind, fromPeerId: 'p1', toPeerId: kind === 'peer-join' || kind === 'peer-left' ? null : 'p2' };
    if (kind === 'peer-join' || kind === 'peer-left') delete payload.toPeerId;
    assert.equal(validateCallSignal(payload).ok, true, kind);
  }
  assert.equal(validateCallSignal({ kind: 'offer', fromPeerId: 'p1' }).ok, false);
  assert.equal(validateCallSignal({ kind: 'bogus', fromPeerId: 'p1' }).ok, false);
});

test('API: cancel outgoing call and ring timeout → missed', async () => {
  const { server, base, dir } = await startServer();
  try {
    const a = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'cancela', email: 'cancela@ex.com', password: 'password12' }
    });
    const b = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'cancelb', email: 'cancelb@ex.com', password: 'password12' }
    });
    const tokenA = a.data.token;
    const tokenB = b.data.token;

    const started = await req(base, '/api/calls', {
      method: 'POST',
      token: tokenA,
      body: { kind: 'voice', userId: b.data.user.id, ringTimeoutMs: 10_000 }
    });
    assert.equal(started.status, 201);
    const callId = started.data.call.id;

    const cancelled = await req(base, `/api/calls/${callId}/cancel`, {
      method: 'POST',
      token: tokenA,
      body: {}
    });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.data.call.status, 'cancelled');

    const started2 = await req(base, '/api/calls', {
      method: 'POST',
      token: tokenA,
      body: { kind: 'voice', userId: b.data.user.id, ringTimeoutMs: 50 }
    });
    assert.equal(started2.status, 201);
    const callId2 = started2.data.call.id;
    await new Promise(r => setTimeout(r, 200));
    const got = await req(base, `/api/calls/${callId2}`, { token: tokenA });
    assert.equal(got.status, 200);
    assert.equal(got.data.call.status, 'missed');
    const hist = await req(base, '/api/calls/history', { token: tokenA });
    assert.ok((hist.data.history || []).some(h => h.id === callId2 && h.status === 'missed'));

    // media mute while active
    const started3 = await req(base, '/api/calls', {
      method: 'POST',
      token: tokenA,
      body: { kind: 'voice', userId: b.data.user.id }
    });
    await req(base, `/api/calls/${started3.data.call.id}/accept`, { method: 'POST', token: tokenB, body: {} });
    const media = await req(base, `/api/calls/${started3.data.call.id}/media`, {
      method: 'POST',
      token: tokenA,
      body: { muted: true }
    });
    assert.equal(media.status, 200);
    assert.equal(media.data.call.participants.find(p => p.userId === a.data.user.id).muted, true);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
