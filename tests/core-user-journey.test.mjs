import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('E2E core journey: register→social→live gift→wallet→ai fail-closed→logout→login persist', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-journey-'));
  process.env.NODE_ENV = 'test';
  process.env.SYLORA_DATA_FILE = path.join(dir, 'db.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  delete process.env.OPENAI_API_KEY;

  const { server } = await import(`../src/server.mjs?journey=${Date.now()}`);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (pathname, options = {}) => {
    const response = await fetch(`${base}${pathname}`, {
      ...options,
      headers: { 'content-type': 'application/json', ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  };

  try {
    const a = await call('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'alice@journey.dev', username: 'alicej', password: 'password123' })
    });
    assert.equal(a.status, 201);
    const b = await call('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'bob@journey.dev', username: 'bobj', password: 'password123' })
    });
    assert.equal(b.status, 201);
    const alice = { authorization: `Bearer ${a.data.token}` };
    const bob = { authorization: `Bearer ${b.data.token}` };

    // Profile
    const me = await call('/api/me', { headers: alice });
    assert.equal(me.status, 200);
    assert.equal(me.data.user.username, 'alicej');

    // Feed + post
    const post = await call('/api/posts', {
      method: 'POST', headers: alice,
      body: JSON.stringify({ text: 'Journey post persists' })
    });
    assert.equal(post.status, 201);
    const feed = await call('/api/feed', { headers: bob });
    assert.ok(feed.data.posts.some(p => p.id === post.data.post.id));

    // Follow / like / comment
    const follow = await call(`/api/users/${a.data.user.id}/follow`, { method: 'POST', headers: bob, body: '{}' });
    assert.equal(follow.data.following, true);
    const followers = await call(`/api/users/${a.data.user.id}/followers`, { headers: alice });
    assert.ok(followers.data.users.some(u => u.id === b.data.user.id));
    await call(`/api/posts/${post.data.post.id}/react`, { method: 'POST', headers: bob, body: '{}' });
    const comment = await call(`/api/posts/${post.data.post.id}/comments`, {
      method: 'POST', headers: bob, body: JSON.stringify({ text: 'Nice journey' })
    });
    assert.equal(comment.status, 201);
    const reacted = await call(`/api/comments/${comment.data.comment.id}/react`, {
      method: 'POST', headers: alice, body: '{}'
    });
    assert.equal(reacted.status, 200);
    assert.equal(reacted.data.reacted, true);

    // Notifications
    const notes = await call('/api/notifications', { headers: alice });
    assert.ok(notes.data.notifications.length >= 1);

    // Messages
    const conv = await call('/api/conversations', {
      method: 'POST', headers: alice,
      body: JSON.stringify({ userId: b.data.user.id })
    });
    assert.ok(conv.status === 200 || conv.status === 201);
    const convId = conv.data.conversation?.id || conv.data.id;
    assert.ok(convId);
    const msg = await call(`/api/conversations/${convId}/messages`, {
      method: 'POST', headers: alice,
      body: JSON.stringify({ text: 'hello bob', clientId: 'journey-msg-1' })
    });
    assert.ok(msg.status === 200 || msg.status === 201);

    // Search
    const search = await call('/api/search?q=alice', { headers: bob });
    assert.ok(search.data.users.some(u => u.username === 'alicej'));

    // LIVE + gift + wallet
    const live = await call('/api/live', {
      method: 'POST', headers: alice, body: JSON.stringify({ title: 'Journey LIVE' })
    });
    assert.equal(live.status, 201);
    const followingLive = await call('/api/live/following', { headers: bob });
    assert.ok(followingLive.data.rooms.some(r => r.id === live.data.live.id));
    const walletBefore = await call('/api/wallet', { headers: bob });
    const gift = await call('/api/gifts/send', {
      method: 'POST',
      headers: { ...bob, 'Idempotency-Key': 'journey-gift-key-01' },
      body: JSON.stringify({
        giftId: 'spark',
        recipientId: a.data.user.id,
        liveId: live.data.live.id,
        quantity: 1
      })
    });
    assert.ok(gift.status === 201 || gift.status === 200);
    const giftReplay = await call('/api/gifts/send', {
      method: 'POST',
      headers: { ...bob, 'Idempotency-Key': 'journey-gift-key-01' },
      body: JSON.stringify({
        giftId: 'spark',
        recipientId: a.data.user.id,
        liveId: live.data.live.id,
        quantity: 1
      })
    });
    assert.equal(giftReplay.data.replayed, true);
    assert.equal(giftReplay.data.balance, gift.data.balance);
    const walletAfter = await call('/api/wallet', { headers: bob });
    assert.equal(walletAfter.data.wallet.balance, walletBefore.data.wallet.balance - 10);

    // AI fail-closed without key
    const ai = await call('/api/ai/chat', {
      method: 'POST', headers: alice, body: JSON.stringify({ text: 'hi' })
    });
    assert.equal(ai.status, 503);

    // Settings / locale
    const patched = await call('/api/me', {
      method: 'PATCH', headers: alice, body: JSON.stringify({ displayName: 'Alice Journey', locale: 'en' })
    });
    assert.equal(patched.data.user.displayName, 'Alice Journey');
    assert.equal(patched.data.user.locale, 'en');

    // Logout + login again + persistence
    await call('/api/auth/logout', { method: 'POST', headers: alice });
    const stale = await call('/api/me', { headers: alice });
    assert.equal(stale.status, 401);
    const login = await call('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identity: 'alicej', password: 'password123' })
    });
    assert.equal(login.status, 200);
    const alice2 = { authorization: `Bearer ${login.data.token}` };
    const feed2 = await call('/api/feed', { headers: alice2 });
    assert.ok(feed2.data.posts.some(p => p.text === 'Journey post persists'));
    const me2 = await call('/api/me', { headers: alice2 });
    assert.equal(me2.data.user.displayName, 'Alice Journey');

    // Session renew
    const renew = await call('/api/sessions/renew', { method: 'POST', headers: alice2, body: '{}' });
    assert.equal(renew.status, 200);
    assert.ok(renew.data.expiresAt);
  } finally {
    await new Promise(r => server.close(r));
  }
});
