import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

async function request(base, pathname, { method = 'GET', token, payload, headers = {} } = {}) {
  const requestHeaders = { 'content-type': 'application/json', ...headers };
  if (token) requestHeaders.authorization = `Bearer ${token}`;
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers: requestHeaders,
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  return { status: response.status, body: await response.json() };
}

test('Phase 1 authorization isolates messages, wallet, AI memory, LIVE management, and admin APIs', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-phase1-authz-'));
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.SYLORA_DATA_FILE = path.join(directory, 'sylora.json');
  process.env.SYLORA_ADMIN_EMAILS = 'admin@example.com';
  const { server } = await import(`../src/server.mjs?phase1-authz=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const register = async (email, username) => {
      const result = await request(base, '/api/auth/register', {
        method: 'POST', payload: { email, username, password: 'password123' }
      });
      assert.equal(result.status, 201, JSON.stringify(result.body));
      return result.body;
    };
    const admin = await register('admin@example.com', 'admin_user');
    const member = await register('member@example.com', 'member_user');
    const outsider = await register('outsider@example.com', 'outsider_user');

    const conversation = await request(base, '/api/conversations', {
      method: 'POST', token: admin.token, payload: { userId: member.user.id }
    });
    assert.equal(conversation.status, 201);
    const conversationId = conversation.body.conversation.id;
    assert.equal((await request(base, `/api/conversations/${conversationId}/messages`, {
      method: 'POST', token: admin.token, payload: { text: 'private message' }
    })).status, 201);
    assert.equal((await request(base, `/api/conversations/${conversationId}/messages`, { token: member.token })).status, 200);
    assert.equal((await request(base, `/api/conversations/${conversationId}/messages`, { token: outsider.token })).status, 404);

    const gift = await request(base, '/api/gifts/send', {
      method: 'POST', token: admin.token, payload: { giftId: 'pulse', recipientId: member.user.id }
    });
    assert.equal(gift.status, 201);
    assert.equal((await request(base, '/api/ledger', { token: outsider.token })).body.entries.length, 0);
    assert.equal((await request(base, '/api/ledger', { token: admin.token })).body.entries.length, 1);

    const memory = await request(base, '/api/ai/memory', {
      method: 'POST', token: admin.token, payload: { label: 'Owner fact', value: 'Only admin can change this' }
    });
    assert.equal(memory.status, 201);
    assert.equal((await request(base, `/api/ai/memory/${memory.body.memory.id}`, {
      method: 'DELETE', token: member.token
    })).status, 404);
    assert.equal((await request(base, '/api/ai/history', { token: admin.token })).body.memories.length, 1);

    const live = await request(base, '/api/live', {
      method: 'POST', token: admin.token, payload: { title: 'Owner LIVE' }
    });
    assert.equal(live.status, 201);
    assert.equal((await request(base, `/api/live/${live.body.live.id}/end`, {
      method: 'POST', token: member.token, payload: {}
    })).status, 404);
    assert.equal((await request(base, `/api/live/${live.body.live.id}/end`, {
      method: 'POST', token: admin.token, payload: {}
    })).status, 200);

    assert.equal((await request(base, '/api/admin/audit', { token: member.token })).status, 403);
    assert.equal((await request(base, '/api/admin/audit', { token: admin.token })).status, 200);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
