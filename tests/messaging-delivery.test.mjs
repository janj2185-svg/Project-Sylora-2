import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createMessageRecord,
  markDelivered,
  markRead,
  markConversationRead,
  unreadCountForUser,
  paginateMessages,
  typingEvent,
  enrichConversation
} from '../src/ecosystem/messaging.mjs';

async function startServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-msg-'));
  process.env.SYLORA_DATA_FILE = path.join(dir, 'data.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.NODE_ENV = 'test';
  const { server } = await import(`../src/server.mjs?msg=${Date.now()}`);
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

test('messaging helpers: delivery, read, unread, pagination, typing', () => {
  const a = createMessageRecord({ id: 'm1', conversationId: 'c1', userId: 'u1', text: 'hi', createdAt: '2026-01-01T00:00:01.000Z', clientId: 'cid-1' });
  const b = createMessageRecord({ id: 'm2', conversationId: 'c1', userId: 'u2', text: 'yo', createdAt: '2026-01-01T00:00:02.000Z' });
  const c = createMessageRecord({ id: 'm3', conversationId: 'c1', userId: 'u1', text: 'ok', createdAt: '2026-01-01T00:00:03.000Z' });
  markDelivered(a, 'u2');
  assert.equal(a.status, 'delivered');
  markRead(a, 'u2');
  assert.equal(a.status, 'read');
  assert.ok(a.readBy.u2);
  const msgs = [a, b, c];
  assert.equal(unreadCountForUser(msgs, 'c1', 'u1'), 1);
  assert.equal(markConversationRead(msgs, 'c1', 'u1'), 1);
  assert.equal(unreadCountForUser(msgs, 'c1', 'u1'), 0);
  const page = paginateMessages(msgs, 'c1', { limit: 2 });
  assert.equal(page.messages.length, 2);
  assert.equal(page.hasMore, true);
  assert.ok(page.nextBefore);
  const older = paginateMessages(msgs, 'c1', { before: page.nextBefore, limit: 2 });
  assert.equal(older.messages.length, 1);
  assert.equal(older.hasMore, false);
  const ev = typingEvent({ conversationId: 'c1', userId: 'u1', username: 'alice', typing: true });
  assert.equal(ev.type, 'typing');
  const enriched = enrichConversation({ id: 'c1', memberIds: ['u1', 'u2'] }, msgs, 'u2');
  assert.equal(enriched.lastMessage.id, 'm3');
});

test('API: send with clientId idempotency, unread, read receipts, typing', async () => {
  const { server, base, dir } = await startServer();
  try {
    const a = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'msga', email: 'msga@ex.com', password: 'password12' }
    });
    const b = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'msgb', email: 'msgb@ex.com', password: 'password12' }
    });
    assert.equal(a.status, 201);
    const tokenA = a.data.token;
    const tokenB = b.data.token;
    const userB = b.data.user.id;

    const conv = await req(base, '/api/conversations', {
      method: 'POST',
      token: tokenA,
      body: { userId: userB }
    });
    assert.equal(conv.status, 201);
    const cid = conv.data.conversation.id;

    const sent1 = await req(base, `/api/conversations/${cid}/messages`, {
      method: 'POST',
      token: tokenA,
      body: { text: 'hello', clientId: 'dup-1' }
    });
    assert.equal(sent1.status, 201);
    const sent2 = await req(base, `/api/conversations/${cid}/messages`, {
      method: 'POST',
      token: tokenA,
      body: { text: 'hello', clientId: 'dup-1' }
    });
    assert.equal(sent2.status, 200);
    assert.equal(sent2.data.deduped, true);
    assert.equal(sent2.data.message.id, sent1.data.message.id);

    const listB = await req(base, '/api/conversations', { token: tokenB });
    assert.equal(listB.status, 200);
    const row = listB.data.conversations.find(c => c.id === cid);
    assert.ok(row.unread >= 1);

    const page = await req(base, `/api/conversations/${cid}/messages?limit=50`, { token: tokenB });
    assert.equal(page.status, 200);
    assert.ok(page.data.messages.some(m => m.status === 'delivered' || m.deliveredAt));

    const read = await req(base, `/api/conversations/${cid}/read`, {
      method: 'POST',
      token: tokenB,
      body: {}
    });
    assert.equal(read.status, 200);
    assert.ok(read.data.marked >= 1);

    const after = await req(base, '/api/conversations', { token: tokenB });
    const row2 = after.data.conversations.find(c => c.id === cid);
    assert.equal(row2.unread, 0);

    const typing = await req(base, `/api/conversations/${cid}/typing`, {
      method: 'POST',
      token: tokenA,
      body: { typing: true }
    });
    assert.equal(typing.status, 200);
    assert.equal(typing.data.event.type, 'typing');
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
