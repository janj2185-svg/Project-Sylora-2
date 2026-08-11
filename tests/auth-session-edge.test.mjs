import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

async function boot(tag, env = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-auth-'));
  process.env.SYLORA_DATA_FILE = path.join(dir, 'data.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.NODE_ENV = 'test';
  delete process.env.SESSION_TTL_MS;
  for (const [k, v] of Object.entries(env)) {
    if (v == null) delete process.env[k];
    else process.env[k] = String(v);
  }
  const { server } = await import(`../src/server.mjs?${tag}=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    server,
    base: `http://127.0.0.1:${server.address().port}`,
    dir,
    dataFile: process.env.SYLORA_DATA_FILE
  };
}

test('auth: status, invalid token, logout, revoke session', async () => {
  const { server, base, dir } = await boot('authmain');
  try {
    const bad = await req(base, '/api/me', { token: 'not-a-real-token' });
    assert.equal(bad.status, 401);

    const reg = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'authedge', email: 'authedge@ex.com', password: 'password12' }
    });
    assert.equal(reg.status, 201);
    const token = reg.data.token;

    const status = await req(base, '/api/auth/status', { token });
    assert.equal(status.status, 200);
    assert.equal(status.data.authenticated, true);

    const login2 = await req(base, '/api/auth/login', {
      method: 'POST',
      body: { identity: 'authedge@ex.com', password: 'password12' }
    });
    assert.equal(login2.status, 200);
    const token2 = login2.data.token;

    const sessions = await req(base, '/api/sessions', { token });
    assert.equal(sessions.status, 200);
    assert.ok(sessions.data.sessions.length >= 2);

    const other = sessions.data.sessions.find(s => !s.current);
    const revoke = await req(base, '/api/sessions/revoke', {
      method: 'POST',
      token,
      body: { sessionId: other.id }
    });
    assert.equal(revoke.status, 200);
    assert.ok(revoke.data.revoked >= 1);
    assert.equal((await req(base, '/api/me', { token: token2 })).status, 401);

    await req(base, '/api/auth/logout', { method: 'POST', token });
    assert.equal((await req(base, '/api/me', { token })).status, 401);

    const loginC = await req(base, '/api/auth/login', {
      method: 'POST',
      body: { identity: 'authedge@ex.com', password: 'password12' }
    });
    await req(base, '/api/sessions/revoke', { method: 'POST', token: loginC.data.token, body: { all: true } });
    assert.equal((await req(base, '/api/me', { token: loginC.data.token })).status, 401);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('auth: expired session rejected', async () => {
  const { server, base, dir } = await boot('authexp', { SESSION_TTL_MS: '1' });
  try {
    const reg = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'expiredx', email: 'expiredx@ex.com', password: 'password12' }
    });
    assert.equal(reg.status, 201);
    await new Promise(r => setTimeout(r, 25));
    assert.equal((await req(base, '/api/me', { token: reg.data.token })).status, 401);
  } finally {
    delete process.env.SESSION_TTL_MS;
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('auth: disabled account blocks login and protected routes', async () => {
  const { server: s1, base: base1, dir, dataFile } = await boot('authdis1');
  const reg = await req(base1, '/api/auth/register', {
    method: 'POST',
    body: { username: 'disuser', email: 'disuser@ex.com', password: 'password12' }
  });
  assert.equal(reg.status, 201);
  s1.close();
  await new Promise(r => setTimeout(r, 30));

  const disk = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  disk.users.find(u => u.username === 'disuser').disabled = true;
  fs.writeFileSync(dataFile, JSON.stringify(disk));

  process.env.SYLORA_DATA_FILE = dataFile;
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.NODE_ENV = 'test';
  delete process.env.SESSION_TTL_MS;
  const { server } = await import(`../src/server.mjs?authdis2=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const login = await req(base, '/api/auth/login', {
      method: 'POST',
      body: { identity: 'disuser@ex.com', password: 'password12' }
    });
    assert.equal(login.status, 403);
    assert.equal(login.data.error, 'ACCOUNT_DISABLED');
    const stale = await req(base, '/api/me', { token: reg.data.token });
    assert.equal(stale.status, 403);
    assert.equal(stale.data.error, 'ACCOUNT_DISABLED');
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
