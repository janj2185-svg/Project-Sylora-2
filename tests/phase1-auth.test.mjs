import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { AuthService, AuthServiceError } from '../src/services/auth-service.mjs';
import { PostgresAuthSocialRepository } from '../src/repositories/postgres-auth-social.mjs';

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
    await pool.query("UPDATE users SET status='disabled' WHERE id=$1", [registered.user.id]);
    const disabled = await errorCode(service.login({ identity: 'login@example.com', password: 'password123' }));
    assert.deepEqual(wrong, { code: 'INVALID_CREDENTIALS', status: 401 });
    assert.deepEqual(unknown, wrong);
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
