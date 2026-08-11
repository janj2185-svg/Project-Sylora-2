import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('password reset + LIVE following + ask honesty + wallet + AI stream fail-closed', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-real-'));
  process.env.NODE_ENV = 'test';
  process.env.SYLORA_DATA_FILE = path.join(dir, 'db.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  delete process.env.OPENAI_API_KEY;
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;

  const { server } = await import(`../src/server.mjs?real=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (pathname, options = {}) => {
    const response = await fetch(`${base}${pathname}`, {
      ...options,
      headers: { 'content-type': 'application/json', ...(options.headers || {}) }
    });
    const json = await response.json().catch(() => ({}));
    return { status: response.status, data: json, response };
  };

  try {
    const host = await call('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'host@test.dev', username: 'hostlive', password: 'password123' })
    });
    assert.equal(host.status, 201);
    const viewer = await call('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'viewer@test.dev', username: 'viewerlive', password: 'password123' })
    });
    assert.equal(viewer.status, 201);
    const hostAuth = { authorization: `Bearer ${host.data.token}` };
    const viewerAuth = { authorization: `Bearer ${viewer.data.token}` };

    // Unified wallet (no dual-write confusion in JSON mode — single wallet row)
    const wallet = await call('/api/wallet', { headers: viewerAuth });
    assert.equal(wallet.status, 200);
    assert.equal(wallet.data.mode, 'test');
    assert.equal(wallet.data.honesty.state, 'test_lumen');
    assert.equal(typeof wallet.data.wallet.balance, 'number');

    await call(`/api/users/${host.data.user.id}/follow`, { method: 'POST', headers: viewerAuth, body: '{}' });
    const live = await call('/api/live', {
      method: 'POST',
      headers: hostAuth,
      body: JSON.stringify({ title: 'Followed LIVE' })
    });
    assert.equal(live.status, 201);

    const following = await call('/api/live/following', { headers: viewerAuth });
    assert.equal(following.status, 200);
    assert.equal(following.data.rooms.some(r => r.id === live.data.live.id), true);

    const stranger = await call('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'stranger@test.dev', username: 'strangerx', password: 'password123' })
    });
    const emptyFollowing = await call('/api/live/following', {
      headers: { authorization: `Bearer ${stranger.data.token}` }
    });
    assert.equal(emptyFollowing.data.rooms.length, 0);

    const ask = await call('/api/ai/ask', {
      method: 'POST',
      headers: viewerAuth,
      body: JSON.stringify({ contentType: 'live', contentId: live.data.live.id, question: 'what happened?', view: 'live' })
    });
    assert.equal(ask.status, 200);
    assert.equal(ask.data.mode, 'extractive_local');
    assert.match(String(ask.data.answer), /Local extract/i);
    assert.equal(ask.data.modelChat, false);

    const stream = await call('/api/ai/chat/stream', {
      method: 'POST',
      headers: viewerAuth,
      body: JSON.stringify({ text: 'hello', view: 'command_center' })
    });
    assert.equal(stream.status, 503);
    assert.equal(stream.data.error, 'AI_PROVIDER_NOT_CONFIGURED');

    const google = await call('/api/auth/google');
    assert.equal(google.status, 503);
    assert.equal(google.data.error, 'GOOGLE_OAUTH_NOT_CONFIGURED');

    const resetReq = await call('/api/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email: 'viewer@test.dev' })
    });
    assert.equal(resetReq.status, 200);
    assert.equal(resetReq.data.accepted, true);
    assert.equal(resetReq.data.emailDelivery, 'blocked_until_mail_provider');
    assert.ok(resetReq.data.resetToken, 'test env returns reset token without claiming email');

    const confirm = await call('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token: resetReq.data.resetToken, password: 'newpassword99' })
    });
    assert.equal(confirm.status, 200);
    assert.equal(confirm.data.reset, true);

    const oldLogin = await call('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identity: 'viewer@test.dev', password: 'password123' })
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await call('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identity: 'viewerlive', password: 'newpassword99' })
    });
    assert.equal(newLogin.status, 200);
    assert.ok(newLogin.data.token);

    // Anti-enumeration: unknown email still 200
    const ghost = await call('/api/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email: 'nobody@example.invalid' })
    });
    assert.equal(ghost.status, 200);
    assert.equal(ghost.data.accepted, true);
    assert.equal(ghost.data.resetToken, undefined);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
