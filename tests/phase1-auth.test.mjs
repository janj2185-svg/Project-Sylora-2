import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { newDb } from 'pg-mem';
import { AuthService, AuthServiceError, SUPPORTED_ACCOUNT_LOCALES } from '../src/services/auth-service.mjs';
import { PostgresAuthSocialRepository } from '../src/repositories/postgres-auth-social.mjs';
import { Store } from '../src/store.mjs';

async function harness(options = {}) {
  const memory = newDb();
  memory.public.none(`
    CREATE TABLE users (
      id uuid PRIMARY KEY, email text NOT NULL, username text NOT NULL, password_hash text NOT NULL,
      display_name text NOT NULL, bio text NOT NULL DEFAULT '', locale text NOT NULL DEFAULT 'uk',
      avatar text NOT NULL DEFAULT '', role text NOT NULL DEFAULT 'user', status text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
    );
    CREATE UNIQUE INDEX users_email_lower_unique_idx ON users(lower(email));
    CREATE UNIQUE INDEX users_username_lower_unique_idx ON users(lower(username));
    CREATE TABLE sessions (
      token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL
    );
  `);
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  const repository = new PostgresAuthSocialRepository(pool);
  const service = new AuthService({ repository, ttlDays: 30, ...options });
  return { pool, repository, service };
}

async function errorCode(promise) {
  try {
    await promise;
    assert.fail('Expected AuthServiceError');
  } catch (error) {
    assert.equal(error instanceof AuthServiceError, true);
    return { code: error.code, status: error.status };
  }
}

test('Phase 1 registration normalizes email, hashes password, and returns only canonical safe fields', async () => {
  const { pool, service } = await harness();
  try {
    const result = await service.register({ email: '  Alice@Example.COM ', username: 'alice_1', password: 'password123' });
    assert.equal(result.user.email, 'alice@example.com');
    assert.equal(result.user.status, 'active');
    assert.equal(result.token.length, 43);
    assert.equal('passwordHash' in result.user, false);
    assert.doesNotMatch(JSON.stringify(result), /password123|passwordHash/);
    const row = (await pool.query('SELECT * FROM users WHERE id=$1', [result.user.id])).rows[0];
    assert.notEqual(row.password_hash, 'password123');
    assert.match(row.password_hash, /^scrypt:/);
    const session = (await pool.query('SELECT * FROM sessions WHERE user_id=$1', [result.user.id])).rows[0];
    assert.equal(session.token_hash.length, 64);
    assert.notEqual(session.token_hash, result.token);
  } finally {
    await pool.end();
  }
});

test('Phase 1 public registration cannot self-provision an admin role', async () => {
  const { pool, repository } = await harness();
  try {
    const service = new AuthService({
      repository,
      // Kept in the test to prove the removed legacy input cannot elevate a user.
      adminEmails: new Set(['admin@example.com'])
    });
    const result = await service.register({ email: 'admin@example.com', username: 'admin_claim', password: 'password123' });
    assert.equal(result.user.role, 'user');
    assert.equal((await pool.query('SELECT role FROM users WHERE id=$1', [result.user.id])).rows[0].role, 'user');
  } finally {
    await pool.end();
  }
});

test('Phase 1 PostgreSQL registration rolls back account and session when provisioning fails', async () => {
  const commands = [];
  const client = {
    async query(sql) { commands.push(String(sql).trim().split(/\s+/)[0].toUpperCase()); return { rowCount: 0, rows: [] }; },
    release() { commands.push('RELEASE'); }
  };
  const pool = {
    async query() { return { rowCount: 0, rows: [] }; },
    async connect() { return client; }
  };
  const repository = new PostgresAuthSocialRepository(pool);
  const service = new AuthService({
    repository,
    provisionAccount: async () => { throw new Error('ACCOUNT_PROVISIONING_FAILED'); }
  });
  await assert.rejects(
    () => service.register({ email: 'rollback@example.com', username: 'rollback_user', password: 'password123' }),
    /ACCOUNT_PROVISIONING_FAILED/
  );
  assert.deepEqual(commands.slice(0, 4), ['BEGIN', 'INSERT', 'INSERT', 'ROLLBACK']);
  assert.equal(commands.includes('COMMIT'), false);
  assert.equal(commands.at(-1), 'RELEASE');
});

test('Phase 1 registration rejects duplicate email case-insensitively', async () => {
  const { pool, service } = await harness();
  try {
    await service.register({ email: 'person@example.com', username: 'person_one', password: 'password123' });
    assert.deepEqual(
      await errorCode(service.register({ email: 'PERSON@example.com', username: 'person_two', password: 'password123' })),
      { code: 'ACCOUNT_ALREADY_EXISTS', status: 409 }
    );
  } finally {
    await pool.end();
  }
});

test('Phase 1 registration rejects invalid email', async () => {
  const { pool, service } = await harness();
  try {
    assert.deepEqual(
      await errorCode(service.register({ email: 'not-an-email', username: 'valid_user', password: 'password123' })),
      { code: 'INVALID_EMAIL', status: 400 }
    );
  } finally {
    await pool.end();
  }
});

test('Phase 1 registration rejects weak password', async () => {
  const { pool, service } = await harness();
  try {
    assert.deepEqual(
      await errorCode(service.register({ email: 'valid@example.com', username: 'valid_user', password: 'short' })),
      { code: 'INVALID_PASSWORD', status: 400 }
    );
  } finally {
    await pool.end();
  }
});

test('Phase 1 login succeeds and wrong, unknown, or disabled accounts share a safe error', async () => {
  const { pool, service } = await harness();
  try {
    const registered = await service.register({ email: 'login@example.com', username: 'login_user', password: 'password123' });
    const loggedIn = await service.login({ identity: 'LOGIN@EXAMPLE.COM', password: 'password123' });
    assert.equal(loggedIn.user.id, registered.user.id);
    const wrong = await errorCode(service.login({ identity: 'login@example.com', password: 'wrong-password1' }));
    const unknown = await errorCode(service.login({ identity: 'unknown@example.com', password: 'wrong-password1' }));
    const oversized = await errorCode(service.login({ identity: 'x'.repeat(1000), password: 'x'.repeat(1000) }));
    const createSession = service.repository.createSession.bind(service.repository);
    service.repository.createSession = async () => false;
    const statusChangedDuringLogin = await errorCode(service.login({ identity: 'login@example.com', password: 'password123' }));
    service.repository.createSession = createSession;
    await pool.query("UPDATE users SET status='disabled' WHERE id=$1", [registered.user.id]);
    const disabled = await errorCode(service.login({ identity: 'login@example.com', password: 'password123' }));
    assert.deepEqual(wrong, { code: 'INVALID_CREDENTIALS', status: 401 });
    assert.deepEqual(unknown, wrong);
    assert.deepEqual(oversized, wrong);
    assert.deepEqual(statusChangedDuringLogin, wrong);
    assert.deepEqual(disabled, wrong);
  } finally {
    await pool.end();
  }
});

test('Phase 1 sessions reject malformed and expired tokens and revoke the old token on logout', async () => {
  const { pool, service } = await harness();
  try {
    const result = await service.register({ email: 'session@example.com', username: 'session_user', password: 'password123' });
    assert.equal((await service.authenticate(result.token)).id, result.user.id);
    assert.equal(await service.authenticate('malformed.token'), null);
    await pool.query("UPDATE sessions SET expires_at=now()-interval '1 minute' WHERE user_id=$1", [result.user.id]);
    assert.equal(await service.authenticate(result.token), null);
    const login = await service.login({ identity: 'session_user', password: 'password123' });
    assert.equal((await service.authenticate(login.token)).id, result.user.id);
    assert.equal(await service.logout(login.token), true);
    assert.equal(await service.authenticate(login.token), null);
  } finally {
    await pool.end();
  }
});

test('Phase 1 account update is owner-scoped and ignores identity, role, status, and email injection', async () => {
  const { pool, service } = await harness();
  try {
    const alice = await service.register({ email: 'owner@example.com', username: 'owner_user', password: 'password123' });
    const bob = await service.register({ email: 'other@example.com', username: 'other_user', password: 'password123' });
    const updated = await service.updateAccount(alice.user, {
      id: bob.user.id,
      email: bob.user.email,
      role: 'admin',
      status: 'disabled',
      displayName: 'Owner Updated',
      bio: 'Owned by Alice'
    });
    assert.equal(updated.id, alice.user.id);
    assert.equal(updated.email, alice.user.email);
    assert.equal(updated.role, 'user');
    assert.equal(updated.status, 'active');
    assert.equal(updated.displayName, 'Owner Updated');
    const untouched = await service.findUserById(bob.user.id);
    assert.equal(untouched.displayName, 'other_user');
  } finally {
    await pool.end();
  }
});

test('authenticated account locale contract persists the canonical five UI languages', async () => {
  assert.deepEqual(SUPPORTED_ACCOUNT_LOCALES, ['uk', 'en', 'pl', 'de', 'ru']);
  const { pool, service } = await harness();
  try {
    const registered = await service.register({ email: 'locale@example.com', username: 'locale_user', password: 'password123' });
    for (const locale of SUPPORTED_ACCOUNT_LOCALES) {
      const updated = await service.updateAccount(await service.findUserById(registered.user.id), { locale });
      assert.equal(updated.locale, locale);
      assert.equal((await service.findUserById(registered.user.id)).locale, locale);
    }
    const unchanged = await service.updateAccount(await service.findUserById(registered.user.id), { locale: 'es' });
    assert.equal(unchanged.locale, 'ru');
  } finally {
    await pool.end();
  }
});

test('Phase 1 PostgreSQL account survives repository and service recreation', async () => {
  const { pool, service } = await harness();
  try {
    const registered = await service.register({ email: 'restart@example.com', username: 'restart_user', password: 'password123' });
    const restartedRepository = new PostgresAuthSocialRepository(pool);
    const restartedService = new AuthService({ repository: restartedRepository, ttlDays: 30 });
    const persisted = await restartedService.findUserById(registered.user.id);
    assert.equal(persisted.email, 'restart@example.com');
    const login = await restartedService.login({ identity: 'restart_user', password: 'password123' });
    assert.equal(login.user.id, registered.user.id);
  } finally {
    await pool.end();
  }
});

test('Phase 1 session TTL rejects non-finite, fractional, and unreasonably long values', async () => {
  const { pool, repository } = await harness();
  try {
    for (const ttlDays of [Number.POSITIVE_INFINITY, Number.NaN, 1.5, 0, 366]) {
      assert.throws(() => new AuthService({ repository, ttlDays }), /INVALID_SESSION_TTL/);
    }
    assert.doesNotThrow(() => new AuthService({ repository, ttlDays: 365 }));
  } finally {
    await pool.end();
  }
});

test('Phase 1 JSON persistence strips legacy and newly attached plaintext credentials', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-phase1-store-'));
  const file = path.join(directory, 'sylora.json');
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  fs.writeFileSync(file, JSON.stringify({
    users: [{
      id: 'legacy-user', email: 'legacy@example.com', username: 'legacy_user',
      password: 'legacy-plaintext', password_hash: 'scrypt:legacy-salt:legacy-hash',
      displayName: 'Legacy', role: 'user', createdAt: new Date().toISOString()
    }],
    sessions: [{ token: 'a'.repeat(43), userId: 'legacy-user', expiresAt, createdAt: new Date().toISOString() }]
  }));

  try {
    const store = new Store(file).load();
    assert.equal('password' in store.data.users[0], false);
    assert.equal('password_hash' in store.data.users[0], false);
    assert.equal(store.data.users[0].passwordHash, 'scrypt:legacy-salt:legacy-hash');
    assert.equal('token' in store.data.sessions[0], false);
    assert.equal(store.data.sessions[0].tokenHash.length, 64);
    const rewritten = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal('password' in rewritten.users[0], false);
    assert.equal('password_hash' in rewritten.users[0], false);
    assert.equal(rewritten.users[0].passwordHash, 'scrypt:legacy-salt:legacy-hash');
    assert.equal('token' in rewritten.sessions[0], false);
    assert.doesNotMatch(JSON.stringify(rewritten), /legacy-plaintext/);
    store.data.users[0].password = 'new-plaintext';
    store.data.sessions[0].token = 'b'.repeat(43);
    store.save();
    const persisted = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal('password' in persisted.users[0], false);
    assert.equal('password_hash' in persisted.users[0], false);
    assert.equal('token' in persisted.sessions[0], false);
    assert.doesNotMatch(JSON.stringify(persisted), /legacy-plaintext|new-plaintext/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
