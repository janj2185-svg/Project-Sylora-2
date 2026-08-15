import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

async function request(base, pathname, { method = 'GET', token, payload } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  return { status: response.status, body: await response.json() };
}

test('Phase 1 HTTP critical path persists profile ownership and revokes the logged-out session', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-phase1-http-'));
  const dataFile = path.join(directory, 'sylora.json');
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.SYLORA_DATA_FILE = dataFile;
  process.env.SYLORA_ADMIN_EMAILS = 'alice@example.com';
  const { server } = await import(`../src/server.mjs?phase1-http=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const invalidJson = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not-valid-json'
    });
    assert.equal(invalidJson.status, 400);
    assert.deepEqual(await invalidJson.json(), {
      error: 'INVALID_JSON',
      code: 'INVALID_JSON',
      message: 'Request body must contain valid JSON.'
    });

    const unauthenticated = await request(base, '/api/me');
    assert.equal(unauthenticated.status, 401);
    assert.deepEqual(unauthenticated.body, {
      error: 'AUTH_REQUIRED',
      code: 'AUTH_REQUIRED',
      message: 'Authentication is required.'
    });

    assert.equal((await request(base, '/api/auth/register', {
      method: 'POST', payload: { email: 'invalid', username: 'valid_user', password: 'password123' }
    })).status, 400);
    assert.equal((await request(base, '/api/auth/register', {
      method: 'POST', payload: { email: 'valid@example.com', username: 'valid_user', password: 'weak' }
    })).status, 400);

    const aliceRegistration = await request(base, '/api/auth/register', {
      method: 'POST',
      payload: { email: ' Alice@Example.com ', username: 'alice_user', password: 'password123' }
    });
    assert.equal(aliceRegistration.status, 201);
    assert.equal(aliceRegistration.body.user.email, 'alice@example.com');
    assert.equal(aliceRegistration.body.user.role, 'user');
    assert.equal('passwordHash' in aliceRegistration.body.user, false);
    assert.doesNotMatch(JSON.stringify(aliceRegistration.body), /password123|passwordHash/);

    const bobRegistration = await request(base, '/api/auth/register', {
      method: 'POST',
      payload: { email: 'bob@example.com', username: 'bob_user', password: 'password123' }
    });
    assert.equal(bobRegistration.status, 201);
    const duplicate = await request(base, '/api/auth/register', {
      method: 'POST',
      payload: { email: 'ALICE@example.com', username: 'alice_other', password: 'password123' }
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.code, 'ACCOUNT_ALREADY_EXISTS');

    const persistedRegistration = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const aliceStored = persistedRegistration.users.find(user => user.id === aliceRegistration.body.user.id);
    assert.match(aliceStored.passwordHash, /^scrypt:/);
    assert.notEqual(aliceStored.passwordHash, 'password123');
    assert.doesNotMatch(JSON.stringify(persistedRegistration), /"password"\s*:/);
    assert.equal(persistedRegistration.sessions.every(session => !('token' in session) && session.tokenHash.length === 64), true);

    const wrongPassword = await request(base, '/api/auth/login', {
      method: 'POST', payload: { identity: 'alice@example.com', password: 'wrong-password1' }
    });
    const unknownUser = await request(base, '/api/auth/login', {
      method: 'POST', payload: { identity: 'unknown@example.com', password: 'wrong-password1' }
    });
    assert.equal(wrongPassword.status, 401);
    assert.deepEqual(unknownUser, wrongPassword);

    const login = await request(base, '/api/auth/login', {
      method: 'POST', payload: { identity: 'ALICE@EXAMPLE.COM', password: 'password123' }
    });
    assert.equal(login.status, 200);
    const token = login.body.token;
    const me = await request(base, '/api/me', { token });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.id, aliceRegistration.body.user.id);
    assert.equal('passwordHash' in me.body.user, false);

    const profileRead = await request(base, '/api/identity', { token });
    assert.equal(profileRead.status, 200);
    const profileUpdate = await request(base, '/api/identity', {
      method: 'PATCH',
      token,
      payload: {
        userId: bobRegistration.body.user.id,
        username: 'hijacked',
        displayName: 'Hijacked',
        verifiedPerson: true,
        reputationRefs: { trust: 'forged' },
        creatorPersona: { headline: 'Builder', passwordHash: 'forged' },
        professional: { title: 'Architect', skills: ['Security'], passwordHash: 'forged', role: 'admin' }
      }
    });
    assert.equal(profileUpdate.status, 200);
    assert.equal(profileUpdate.body.identity.userId, aliceRegistration.body.user.id);
    assert.equal(profileUpdate.body.identity.username, 'alice_user');
    assert.equal(profileUpdate.body.identity.verifiedPerson, false);
    assert.equal(profileUpdate.body.identity.reputationRefs.trust, null);
    assert.equal(profileUpdate.body.identity.professional.title, 'Architect');
    assert.equal('passwordHash' in profileUpdate.body.identity.professional, false);
    assert.equal('role' in profileUpdate.body.identity.professional, false);
    assert.equal('passwordHash' in profileUpdate.body.identity.creatorPersona, false);
    assert.doesNotMatch(JSON.stringify(profileUpdate.body), /passwordHash|forged/);

    const bobPublicProfile = await request(base, `/api/identity/${bobRegistration.body.user.id}`);
    assert.equal(bobPublicProfile.status, 200);
    assert.equal(bobPublicProfile.body.identity.professional, undefined);
    const bobOwnProfile = await request(base, '/api/identity', { token: bobRegistration.body.token });
    assert.equal(bobOwnProfile.body.identity.professional.title, '');

    const accountUpdate = await request(base, '/api/me', {
      method: 'PATCH',
      token,
      payload: {
        id: bobRegistration.body.user.id,
        email: 'bob@example.com',
        role: 'admin',
        status: 'disabled',
        displayName: 'Alice Updated',
        bio: 'Owner-only profile update'
      }
    });
    assert.equal(accountUpdate.status, 200);
    assert.equal(accountUpdate.body.user.id, aliceRegistration.body.user.id);
    assert.equal(accountUpdate.body.user.email, 'alice@example.com');
    assert.equal(accountUpdate.body.user.role, 'user');
    assert.equal(accountUpdate.body.user.status, 'active');

    const bobMe = await request(base, '/api/me', { token: bobRegistration.body.token });
    assert.equal(bobMe.body.user.displayName, 'bob_user');

    const logout = await request(base, '/api/auth/logout', { method: 'POST', token, payload: {} });
    assert.equal(logout.status, 200);
    assert.equal((await request(base, '/api/me', { token })).status, 401);
    assert.equal((await request(base, '/api/me', { token: 'malformed.token' })).status, 401);

    const persistedFinal = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    assert.equal(persistedFinal.users.find(user => user.id === aliceRegistration.body.user.id).displayName, 'Alice Updated');
    assert.equal(persistedFinal.identities.find(identity => identity.userId === aliceRegistration.body.user.id).professional.title, 'Architect');
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
