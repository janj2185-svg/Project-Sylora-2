import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import pg from 'pg';
import { applyMigrations } from '../src/migrations.mjs';

const { Pool } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function requiredTestDatabaseUrl() {
  const value = String(process.env.TEST_DATABASE_URL || '');
  if (!value) throw new Error('TEST_DATABASE_URL_REQUIRED');
  const parsed = new URL(value);
  if (parsed.pathname !== '/sylora_phase1_test') throw new Error('UNSAFE_TEST_DATABASE_NAME');
  return value;
}

async function freePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => probe.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  return port;
}

async function startProductionServer({ databaseUrl, dataFile }) {
  const port = await freePort();
  const child = spawn(process.execPath, ['src/server.mjs'], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      DATABASE_URL: databaseUrl,
      REDIS_URL: '',
      OPENAI_API_KEY: '',
      SYLORA_DATA_FILE: dataFile,
      SYLORA_ADMIN_EMAILS: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', chunk => { output = `${output}${chunk}`.slice(-20_000); });
  child.stderr.on('data', chunk => { output = `${output}${chunk}`.slice(-20_000); });
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error(`SERVER_EXITED:${child.exitCode}\n${output}`);
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return { child, base, output: () => output };
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  child.kill('SIGTERM');
  throw new Error(`SERVER_START_TIMEOUT\n${output}`);
}

async function stopServer(instance) {
  if (!instance || instance.child.exitCode != null) return;
  instance.child.kill('SIGTERM');
  await Promise.race([
    new Promise(resolve => instance.child.once('exit', resolve)),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`SERVER_STOP_TIMEOUT\n${instance.output()}`)), 10_000))
  ]);
}

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

test('production PostgreSQL migrations, auth/profile critical path, and restart persistence', async () => {
  const databaseUrl = requiredTestDatabaseUrl();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-phase1-postgres-'));
  const dataFile = path.join(directory, 'must-not-be-created.json');
  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  let firstServer;
  let restartedServer;

  try {
    const migrationClient = await pool.connect();
    try {
      await migrationClient.query('DROP SCHEMA public CASCADE');
      await migrationClient.query('CREATE SCHEMA public');
      await applyMigrations(migrationClient);
    } finally {
      migrationClient.release();
    }
    assert.equal(Number((await pool.query('SELECT count(*) AS count FROM _sylora_migrations')).rows[0].count), 13);

    firstServer = await startProductionServer({ databaseUrl, dataFile });
    const alice = await request(firstServer.base, '/api/auth/register', {
      method: 'POST',
      payload: { email: 'postgres@example.com', username: 'postgres_user', password: 'password123' }
    });
    assert.equal(alice.status, 201, JSON.stringify(alice.body));
    assert.equal('passwordHash' in alice.body.user, false);
    assert.equal(fs.existsSync(dataFile), false, 'production must not create the JSON data store');

    const bob = await request(firstServer.base, '/api/auth/register', {
      method: 'POST',
      payload: { email: 'postgres-bob@example.com', username: 'postgres_bob', password: 'password123' }
    });
    assert.equal(bob.status, 201, JSON.stringify(bob.body));
    const duplicate = await request(firstServer.base, '/api/auth/register', {
      method: 'POST',
      payload: { email: 'POSTGRES@example.com', username: 'postgres_other', password: 'password123' }
    });
    assert.equal(duplicate.status, 409);

    const login = await request(firstServer.base, '/api/auth/login', {
      method: 'POST', payload: { identity: 'POSTGRES@EXAMPLE.COM', password: 'password123' }
    });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    const token = login.body.token;
    assert.equal((await request(firstServer.base, '/api/me', { token })).status, 200);

    const profile = await request(firstServer.base, '/api/identity', {
      method: 'PATCH',
      token,
      payload: {
        userId: bob.body.user.id,
        verifiedPerson: true,
        professional: { title: 'PostgreSQL Architect', skills: ['Data'] }
      }
    });
    assert.equal(profile.status, 200, JSON.stringify(profile.body));
    assert.equal(profile.body.identity.userId, alice.body.user.id);
    assert.equal(profile.body.identity.verifiedPerson, false);
    assert.equal(profile.body.identity.professional.title, 'PostgreSQL Architect');
    const bobProfile = await request(firstServer.base, '/api/identity', { token: bob.body.token });
    assert.equal(bobProfile.body.identity.professional.title, '');

    const persisted = (await pool.query('SELECT email,password_hash,status,updated_at FROM users WHERE id=$1', [alice.body.user.id])).rows[0];
    assert.equal(persisted.email, 'postgres@example.com');
    assert.notEqual(persisted.password_hash, 'password123');
    assert.match(persisted.password_hash, /^scrypt:/);
    assert.equal(persisted.status, 'active');
    assert.ok(persisted.updated_at);
    assert.equal(Number((await pool.query('SELECT count(*) AS count FROM identity_profiles WHERE user_id=$1', [alice.body.user.id])).rows[0].count), 1);

    await stopServer(firstServer);
    firstServer = null;
    restartedServer = await startProductionServer({ databaseUrl, dataFile });
    const afterRestart = await request(restartedServer.base, '/api/me', { token });
    assert.equal(afterRestart.status, 200, JSON.stringify(afterRestart.body));
    assert.equal(afterRestart.body.user.id, alice.body.user.id);
    const profileAfterRestart = await request(restartedServer.base, '/api/identity', { token });
    assert.equal(profileAfterRestart.body.identity.professional.title, 'PostgreSQL Architect');

    const logout = await request(restartedServer.base, '/api/auth/logout', { method: 'POST', token, payload: {} });
    assert.equal(logout.status, 200);
    assert.equal((await request(restartedServer.base, '/api/me', { token })).status, 401);
    assert.equal((await request(restartedServer.base, '/api/me', { token: 'malformed.token' })).status, 401);
    assert.equal(Number((await pool.query('SELECT count(*) AS count FROM sessions WHERE token_hash=encode(digest($1,\'sha256\'),\'hex\')', [token])).rows[0].count), 0);
    assert.equal(fs.existsSync(dataFile), false, 'production restart must still avoid JSON persistence');
  } finally {
    await stopServer(firstServer);
    await stopServer(restartedServer);
    await pool.end();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
