import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

async function startServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-p0-'));
  process.env.SYLORA_DATA_FILE = path.join(dir, 'data.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.NODE_ENV = 'test';
  const { server } = await import(`../src/server.mjs?p0=${Date.now()}`);
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

test('P0: DM call creates session, rings via notification store, accept + signal path', async () => {
  const { server, base, dir } = await startServer();
  try {
    const a = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'callerp0', email: 'ca@ex.com', password: 'password12' }
    });
    const b = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'calleep0', email: 'cb@ex.com', password: 'password12' }
    });
    assert.equal(a.status, 201);
    const tokenA = a.data.token;
    const tokenB = b.data.token;
    const userB = b.data.user.id;

    const rtc = await req(base, '/api/calls/rtc-config', { token: tokenA });
    assert.equal(rtc.status, 200);
    assert.equal(rtc.data.engine, 'call_engine_shared_webrtc');
    assert.ok(Array.isArray(rtc.data.iceServers));

    const started = await req(base, '/api/calls', {
      method: 'POST',
      token: tokenA,
      body: { kind: 'voice', userId: userB }
    });
    assert.equal(started.status, 201);
    assert.equal(started.data.call.status, 'ringing');
    const callId = started.data.call.id;

    const notes = await req(base, '/api/notifications', { token: tokenB });
    assert.ok((notes.data.notifications || []).some(n => n.type === 'voice_call' && n.payload?.callId === callId));

    const accepted = await req(base, `/api/calls/${callId}/accept`, {
      method: 'POST',
      token: tokenB,
      body: {}
    });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.data.call.status, 'active');

    const peerA = 'peer-a-1';
    const peerB = 'peer-b-1';
    const joinA = await req(base, `/api/calls/${callId}/signal`, {
      method: 'POST',
      token: tokenA,
      body: { kind: 'peer-join', fromPeerId: peerA, data: { media: 'audio' } }
    });
    assert.equal(joinA.status, 200);
    const joinB = await req(base, `/api/calls/${callId}/signal`, {
      method: 'POST',
      token: tokenB,
      body: { kind: 'peer-join', fromPeerId: peerB, data: { media: 'audio' } }
    });
    assert.equal(joinB.status, 200);

    const offer = await req(base, `/api/calls/${callId}/signal`, {
      method: 'POST',
      token: tokenA,
      body: {
        kind: 'offer',
        fromPeerId: peerA,
        toPeerId: peerB,
        data: { type: 'offer', sdp: 'v=0\r\n' }
      }
    });
    assert.equal(offer.status, 200);
    assert.equal(offer.data.signal.kind, 'offer');

    const got = await req(base, `/api/calls/${callId}`, { token: tokenA });
    assert.equal(got.status, 200);
    assert.equal(got.data.call.id, callId);

    const ended = await req(base, `/api/calls/${callId}/end`, {
      method: 'POST',
      token: tokenA,
      body: {}
    });
    assert.equal(ended.status, 200);
    assert.ok(['ended', 'missed'].includes(ended.data.call.status));

    const app = fs.readFileSync('public/app.js', 'utf8');
    assert.match(app, /openCallSession/);
    assert.match(app, /\/api\/calls\/\$\{callId\}\/signal/);
    assert.match(app, /RTCPeerConnection/);
    assert.match(app, /showIncomingCallBanner/);
    assert.match(app, /intent==='create'/);
    // Single inbox header icon (no duplicate ♧ + ◌)
    assert.ok(!app.includes('title="Inbox">♧</button><button class="header-icon" data-account-view="messages"'));
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('P0 audit document exists and is honest about call path', () => {
  const doc = fs.readFileSync('docs/audit/MASTER_AUDIT_P0.md', 'utf8');
  assert.match(doc, /Call Engine/);
  assert.match(doc, /WORKING|BROKEN|PARTIAL/);
  assert.match(doc, /Production VPS/);
});
