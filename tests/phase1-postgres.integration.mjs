import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import pg from 'pg';
import { applyMigrations } from '../src/migrations.mjs';
import { PostgresAuthSocialRepository } from '../src/repositories/postgres-auth-social.mjs';
import { PostgresEcosystemRepository } from '../src/repositories/postgres-ecosystem.mjs';
import { PostgresWalletRepository } from '../src/repositories/postgres-wallet.mjs';

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

async function startProductionServer({ databaseUrl, dataFile, openaiBaseUrl = '', openaiApiKey = '' }) {
  const port = await freePort();
  const child = spawn(process.execPath, ['src/server.mjs'], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      DATABASE_URL: databaseUrl,
      REDIS_URL: '',
      OPENAI_API_KEY: openaiApiKey,
      OPENAI_BASE_URL: openaiBaseUrl,
      SYLORA_DATA_FILE: dataFile,
      // Regression guard: an unverified public email claim must never grant admin.
      SYLORA_ADMIN_EMAILS: 'postgres@example.com'
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

async function startProviderStub() {
  const requests = [];
  let callNumber = 0;
  const server = http.createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const payload = raw ? JSON.parse(raw) : {};
    requests.push(payload);
    const hasToolResult = Array.isArray(payload.input)
      && payload.input.some(item => item?.type === 'function_call_output');
    const id = `resp_stub_${++callNumber}`;
    const response = hasToolResult
      ? {
          id,
          object: 'response',
          status: 'completed',
          model: 'gpt-5.6',
          output: [{
            id: `msg_${callNumber}`,
            type: 'message',
            status: 'completed',
            role: 'assistant',
            content: [{ type: 'output_text', text: 'Provider stub answer.', annotations: [] }]
          }]
        }
      : {
          id,
          object: 'response',
          status: 'completed',
          model: 'gpt-5.6',
          output_text: '',
          output: [{
            id: `fc_${callNumber}`,
            type: 'function_call',
            status: 'completed',
            call_id: `call_${callNumber}`,
            name: 'get_my_context',
            arguments: '{}'
          }]
        };
    const body = JSON.stringify(response);
    res.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
    res.end(body);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}/v1`,
    requests,
    close: () => new Promise(resolve => server.close(resolve))
  };
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
  let peerServer;
  let restartedServer;
  let provider;

  try {
    const migrationClient = await pool.connect();
    const concurrentMigrationClient = await pool.connect();
    try {
      await migrationClient.query('DROP SCHEMA public CASCADE');
      await migrationClient.query('CREATE SCHEMA public');
      await Promise.all([
        applyMigrations(migrationClient),
        applyMigrations(concurrentMigrationClient)
      ]);
      const upgradeUserId = randomUUID();
      const upgradeTokenHash = 'f'.repeat(64);
      await migrationClient.query('DROP TRIGGER IF EXISTS users_revoke_sessions_on_status_change ON users');
      await migrationClient.query("DELETE FROM _sylora_migrations WHERE name='014_session_status_invalidation'");
      await migrationClient.query(
        "INSERT INTO users(id,email,username,password_hash,display_name,status) VALUES($1,'upgrade-disabled@example.com','upgrade_disabled','scrypt:test:test','Upgrade Disabled','disabled')",
        [upgradeUserId]
      );
      await migrationClient.query(
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
        [upgradeTokenHash, upgradeUserId]
      );
      await Promise.all([
        applyMigrations(migrationClient),
        applyMigrations(concurrentMigrationClient)
      ]);
      assert.equal(Number((await migrationClient.query('SELECT count(*) AS count FROM sessions WHERE user_id=$1', [upgradeUserId])).rows[0].count), 0);
      await migrationClient.query("UPDATE users SET status='active' WHERE id=$1", [upgradeUserId]);
      assert.equal(Number((await migrationClient.query('SELECT count(*) AS count FROM sessions WHERE user_id=$1', [upgradeUserId])).rows[0].count), 0);
      await migrationClient.query('DELETE FROM users WHERE id=$1', [upgradeUserId]);

      const loginRaceUserId = randomUUID();
      const loginRaceTokenHash = 'e'.repeat(64);
      await migrationClient.query(
        "INSERT INTO users(id,email,username,password_hash,display_name,status) VALUES($1,'login-race@example.com','login_race','scrypt:test:test','Login Race','active')",
        [loginRaceUserId]
      );
      await concurrentMigrationClient.query('BEGIN');
      let issuance;
      try {
        await concurrentMigrationClient.query("UPDATE users SET status='disabled' WHERE id=$1", [loginRaceUserId]);
        let issuanceSettled = false;
        issuance = new PostgresAuthSocialRepository(pool).createSession({
          tokenHash: loginRaceTokenHash,
          userId: loginRaceUserId,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60_000).toISOString()
        }).then(result => { issuanceSettled = true; return result; });
        await new Promise(resolve => setTimeout(resolve, 50));
        assert.equal(issuanceSettled, false, 'session issuance must wait for a concurrent account-status change');
        await concurrentMigrationClient.query('COMMIT');
      } catch (error) {
        try { await concurrentMigrationClient.query('ROLLBACK'); } catch {}
        throw error;
      }
      assert.equal(await issuance, false);
      await migrationClient.query("UPDATE users SET status='active' WHERE id=$1", [loginRaceUserId]);
      assert.equal(Number((await migrationClient.query('SELECT count(*) AS count FROM sessions WHERE user_id=$1', [loginRaceUserId])).rows[0].count), 0);
      await migrationClient.query('DELETE FROM users WHERE id=$1', [loginRaceUserId]);
    } finally {
      migrationClient.release();
      concurrentMigrationClient.release();
    }
    assert.equal(Number((await pool.query('SELECT count(*) AS count FROM _sylora_migrations')).rows[0].count), 16);

    provider = await startProviderStub();
    firstServer = await startProductionServer({ databaseUrl, dataFile, openaiBaseUrl: provider.baseUrl, openaiApiKey: 'phase1-provider-test-key' });
    const alice = await request(firstServer.base, '/api/auth/register', {
      method: 'POST',
      payload: { email: 'postgres@example.com', username: 'postgres_user', password: 'password123' }
    });
    assert.equal(alice.status, 201, JSON.stringify(alice.body));
    assert.equal('passwordHash' in alice.body.user, false);
    assert.equal(alice.body.user.role, 'user');
    assert.equal(fs.existsSync(dataFile), false, 'production must not create the JSON data store');
    assert.equal(Number((await pool.query('SELECT count(*) AS count FROM wallets WHERE user_id=$1', [alice.body.user.id])).rows[0].count), 1);
    assert.equal(Number((await pool.query("SELECT count(*) AS count FROM ledger_entries WHERE wallet_user_id=$1 AND reason='starter_grant'", [alice.body.user.id])).rows[0].count), 1);

    const bob = await request(firstServer.base, '/api/auth/register', {
      method: 'POST',
      payload: { email: 'postgres-bob@example.com', username: 'postgres_bob', password: 'password123' }
    });
    assert.equal(bob.status, 201, JSON.stringify(bob.body));
    const bobStarter = await pool.query("SELECT correlation_id FROM ledger_entries WHERE wallet_user_id=$1 AND reason='starter_grant'", [bob.body.user.id]);
    await pool.query('DELETE FROM platform_ledger_entries WHERE correlation_id=ANY($1::uuid[])', [bobStarter.rows.map(row => row.correlation_id)]);
    await pool.query("DELETE FROM ledger_entries WHERE wallet_user_id=$1 AND reason='starter_grant'", [bob.body.user.id]);
    await pool.query('DELETE FROM wallets WHERE user_id=$1', [bob.body.user.id]);
    const walletRepository = new PostgresWalletRepository(pool);
    const concurrentWallets = await Promise.all(Array.from({ length: 4 }, () => walletRepository.ensureWallet(bob.body.user.id)));
    assert.equal(concurrentWallets.every(wallet => wallet.balance === 10000), true);
    assert.equal(Number((await pool.query("SELECT count(*) AS count FROM ledger_entries WHERE wallet_user_id=$1 AND reason='starter_grant'", [bob.body.user.id])).rows[0].count), 1);
    const duplicate = await request(firstServer.base, '/api/auth/register', {
      method: 'POST',
      payload: { email: 'POSTGRES@example.com', username: 'postgres_other', password: 'password123' }
    });
    assert.equal(duplicate.status, 409);

    await pool.query("UPDATE users SET status='disabled' WHERE id=$1", [alice.body.user.id]);
    assert.equal((await request(firstServer.base, '/api/me', { token: alice.body.token })).status, 401);
    assert.equal(Number((await pool.query('SELECT count(*) AS count FROM sessions WHERE user_id=$1', [alice.body.user.id])).rows[0].count), 0);
    await pool.query("UPDATE users SET status='active' WHERE id=$1", [alice.body.user.id]);
    assert.equal((await request(firstServer.base, '/api/me', { token: alice.body.token })).status, 401);

    const login = await request(firstServer.base, '/api/auth/login', {
      method: 'POST', payload: { identity: 'POSTGRES@EXAMPLE.COM', password: 'password123' }
    });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    const token = login.body.token;
    assert.equal((await request(firstServer.base, '/api/me', { token })).status, 200);

    peerServer = await startProductionServer({ databaseUrl, dataFile, openaiBaseUrl: provider.baseUrl, openaiApiKey: 'phase1-provider-test-key' });
    const [accountFirst, accountPeer] = await Promise.all([
      request(firstServer.base, '/api/me', { method: 'PATCH', token, payload: { displayName: 'Postgres Alice' } }),
      request(peerServer.base, '/api/me', { method: 'PATCH', token, payload: { bio: 'Concurrency-safe account' } })
    ]);
    assert.equal(accountFirst.status, 200, JSON.stringify(accountFirst.body));
    assert.equal(accountPeer.status, 200, JSON.stringify(accountPeer.body));
    const mergedAccount = await request(firstServer.base, '/api/me', { token });
    assert.equal(mergedAccount.body.user.displayName, 'Postgres Alice');
    assert.equal(mergedAccount.body.user.bio, 'Concurrency-safe account');
    const [firstColdAgent, peerColdAgent] = await Promise.all([
      request(firstServer.base, '/api/ai/dashboard', { token }),
      request(peerServer.base, '/api/ai/dashboard', { token })
    ]);
    assert.equal(firstColdAgent.status, 200, JSON.stringify(firstColdAgent.body));
    assert.equal(peerColdAgent.status, 200, JSON.stringify(peerColdAgent.body));
    const canonicalAgent = await pool.query("SELECT id FROM personal_agents WHERE user_id=$1 AND kind='personal'", [alice.body.user.id]);
    assert.equal(canonicalAgent.rowCount, 1);
    assert.equal(firstColdAgent.body.agent.id, canonicalAgent.rows[0].id);
    assert.equal(peerColdAgent.body.agent.id, canonicalAgent.rows[0].id);

    const [profile, profilePeer] = await Promise.all([
      request(firstServer.base, '/api/identity', {
        method: 'PATCH',
        token,
        payload: {
          userId: bob.body.user.id,
          verifiedPerson: true,
          professional: { title: 'PostgreSQL Architect', skills: ['Data'] }
        }
      }),
      request(peerServer.base, '/api/identity', {
        method: 'PATCH', token, payload: { interests: ['Concurrency-safe'] }
      })
    ]);
    assert.equal(profile.status, 200, JSON.stringify(profile.body));
    assert.equal(profilePeer.status, 200, JSON.stringify(profilePeer.body));
    const mergedProfile = await request(firstServer.base, '/api/identity', { token });
    assert.equal(mergedProfile.body.identity.userId, alice.body.user.id);
    assert.equal(mergedProfile.body.identity.verifiedPerson, false);
    assert.equal(mergedProfile.body.identity.professional.title, 'PostgreSQL Architect');
    assert.deepEqual(mergedProfile.body.identity.interests, ['Concurrency-safe']);
    const staleIdentityCreate = await new PostgresEcosystemRepository(pool).upsertIdentity({
      userId: alice.body.user.id, verifiedPerson: true, creatorPersona: {}, professional: {},
      portfolio: [], interests: [], privacy: {}, reputationRefs: { trust: 'forged' }, agentId: null,
      updatedAt: new Date().toISOString()
    });
    assert.equal(staleIdentityCreate.professional.title, 'PostgreSQL Architect');
    assert.deepEqual(staleIdentityCreate.interests, ['Concurrency-safe']);
    assert.equal(staleIdentityCreate.verifiedPerson, false);
    const bobProfile = await request(firstServer.base, '/api/identity', { token: bob.body.token });
    assert.equal(bobProfile.body.identity.professional.title, '');

    const persisted = (await pool.query('SELECT email,password_hash,status,updated_at FROM users WHERE id=$1', [alice.body.user.id])).rows[0];
    assert.equal(persisted.email, 'postgres@example.com');
    assert.notEqual(persisted.password_hash, 'password123');
    assert.match(persisted.password_hash, /^scrypt:/);
    assert.equal(persisted.status, 'active');
    assert.ok(persisted.updated_at);
    assert.equal(Number((await pool.query('SELECT count(*) AS count FROM identity_profiles WHERE user_id=$1', [alice.body.user.id])).rows[0].count), 1);

    const post = await request(firstServer.base, '/api/posts', {
      method: 'POST', token, payload: { text: 'Persistent home hub post' }
    });
    assert.equal(post.status, 201);
    const conversation = await request(firstServer.base, '/api/conversations', {
      method: 'POST', token, payload: { userId: bob.body.user.id }
    });
    assert.equal(conversation.status, 201);
    const message = await request(firstServer.base, `/api/conversations/${conversation.body.conversation.id}/messages`, {
      method: 'POST', token, payload: { text: 'Persistent hub message' }
    });
    assert.equal(message.status, 201);
    assert.equal((await request(firstServer.base, `/api/users/${alice.body.user.id}/follow`, {
      method: 'POST', token: bob.body.token, payload: {}
    })).status, 200);

    const sentinel = 'phase1-private-memory-sentinel';
    assert.equal((await request(firstServer.base, '/api/ai/memory', {
      method: 'POST', token, payload: { label: 'Private sentinel', value: sentinel }
    })).status, 201);
    const [memoryDisabled, readDisabled] = await Promise.all([
      request(firstServer.base, '/api/ai/memory/enabled', { method: 'PATCH', token, payload: { enabled: false } }),
      request(peerServer.base, '/api/ai/permissions', { method: 'PATCH', token, payload: { memory_read: false } })
    ]);
    assert.equal(memoryDisabled.status, 200, JSON.stringify(memoryDisabled.body));
    assert.equal(readDisabled.status, 200, JSON.stringify(readDisabled.body));
    const agentControls = (await pool.query("SELECT permissions,privacy_controls FROM personal_agents WHERE user_id=$1 AND kind='personal'", [alice.body.user.id])).rows[0];
    assert.equal(agentControls.permissions.memory_read, false);
    assert.equal(agentControls.privacy_controls.memory, false);
    const staleRepository = new PostgresEcosystemRepository(pool);
    const staleColdStart = await staleRepository.upsertPersonalAgent({
      id: randomUUID(), userId: alice.body.user.id, name: 'Sylora', kind: 'personal', locale: 'uk',
      permissions: { memory_read: true }, contexts: {}, privacyControls: { memory: true },
      proactiveLevel: 'IMPORTANT_ONLY', voicePersonality: 'warm',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    assert.equal(staleColdStart.id, canonicalAgent.rows[0].id);
    assert.equal(staleColdStart.permissions.memory_read, false);
    assert.equal(staleColdStart.privacyControls.memory, false);

    const coldHub = await request(peerServer.base, '/api/home/hub', { token });
    assert.equal(coldHub.status, 200, JSON.stringify(coldHub.body));
    assert.equal(coldHub.body.hub.creator.posts.some(item => item.id === post.body.post.id), true);
    assert.equal(coldHub.body.hub.inboxPreview.conversations.some(item => item.id === conversation.body.conversation.id && item.preview === 'Persistent hub message'), true);
    assert.equal(coldHub.body.hub.inboxPreview.unreadNotifications >= 1, true);
    const hubMembers = coldHub.body.hub.inboxPreview.conversations.flatMap(item => item.members || []);
    assert.equal(hubMembers.length >= 2, true);
    assert.equal(hubMembers.every(member => !('passwordHash' in member) && !('email' in member) && !('role' in member) && !('status' in member)), true);
    await stopServer(peerServer);
    peerServer = null;

    const developerApp = await request(firstServer.base, '/api/developer/apps', {
      method: 'POST', token, payload: { name: 'Phase 1 API', scopes: ['identity.read'] }
    });
    assert.equal(developerApp.status, 201, JSON.stringify(developerApp.body));
    const developerKey = await request(firstServer.base, `/api/developer/apps/${developerApp.body.app.id}/keys`, {
      method: 'POST', token, payload: { label: 'restart-proof' }
    });
    assert.equal(developerKey.status, 201, JSON.stringify(developerKey.body));
    assert.match(developerKey.body.raw, /^syl_/);
    const persistedKey = (await pool.query('SELECT hash FROM developer_api_keys WHERE id=$1', [developerKey.body.key.id])).rows[0];
    assert.equal(persistedKey.hash, createHash('sha256').update(developerKey.body.raw).digest('hex'));
    assert.doesNotMatch(JSON.stringify(persistedKey), new RegExp(developerKey.body.raw));

    await stopServer(firstServer);
    firstServer = null;
    restartedServer = await startProductionServer({ databaseUrl, dataFile, openaiBaseUrl: provider.baseUrl, openaiApiKey: 'phase1-provider-test-key' });
    const afterRestart = await request(restartedServer.base, '/api/me', { token });
    assert.equal(afterRestart.status, 200, JSON.stringify(afterRestart.body));
    assert.equal(afterRestart.body.user.id, alice.body.user.id);
    const profileAfterRestart = await request(restartedServer.base, '/api/identity', { token });
    assert.equal(profileAfterRestart.body.identity.professional.title, 'PostgreSQL Architect');
    const memoryCenter = await request(restartedServer.base, '/api/ai/memory/center', { token });
    assert.equal(memoryCenter.status, 200);
    assert.equal(memoryCenter.body.enabled, false);
    assert.equal(JSON.stringify(memoryCenter.body).includes(sentinel), true, 'the owner can still inspect disabled stored memory');
    const securityCenter = await request(restartedServer.base, '/api/security-center', { token });
    assert.equal(securityCenter.body.aiControl.privacyControls.memory, false);
    assert.equal(securityCenter.body.aiControl.permissions.memory_read, false);
    assert.equal(securityCenter.body.aiControl.remembers.some(item => item.label === 'Private sentinel'), true);
    assert.equal((await request(restartedServer.base, '/api/ai/memory', {
      method: 'POST', token, payload: { label: 'Blocked', value: 'must not persist' }
    })).status, 409);
    const disabledChat = await request(restartedServer.base, '/api/ai/chat', {
      method: 'POST', token, payload: { text: 'Use my context.', view: 'command_center' }
    });
    assert.equal(disabledChat.status, 200, JSON.stringify(disabledChat.body));
    const disabledToolPayload = [...provider.requests].reverse().find(payload => payload.input?.some(item => item?.type === 'function_call_output'));
    assert.ok(disabledToolPayload);
    assert.equal(JSON.stringify(disabledToolPayload).includes(sentinel), false);
    const controlsAfterRead = (await pool.query("SELECT permissions,privacy_controls FROM personal_agents WHERE user_id=$1 AND kind='personal'", [alice.body.user.id])).rows[0];
    assert.equal(controlsAfterRead.permissions.memory_read, false);
    assert.equal(controlsAfterRead.privacy_controls.memory, false);

    assert.equal((await request(restartedServer.base, '/api/ai/memory/enabled', {
      method: 'PATCH', token, payload: { enabled: true }
    })).status, 200);
    assert.equal((await request(restartedServer.base, '/api/ai/permissions', {
      method: 'PATCH', token, payload: { memory_read: true }
    })).status, 200);
    const requestCountBeforePositiveControl = provider.requests.length;
    assert.equal((await request(restartedServer.base, '/api/ai/chat', {
      method: 'POST', token, payload: { text: 'Use my context again.', view: 'command_center' }
    })).status, 200);
    const positiveToolPayload = provider.requests.slice(requestCountBeforePositiveControl).find(payload => payload.input?.some(item => item?.type === 'function_call_output'));
    assert.ok(positiveToolPayload);
    assert.equal(JSON.stringify(positiveToolPayload).includes(sentinel), true);

    const hubAfterRestart = await request(restartedServer.base, '/api/home/hub', { token });
    assert.equal(hubAfterRestart.body.hub.creator.posts.some(item => item.id === post.body.post.id), true);
    assert.equal(hubAfterRestart.body.hub.inboxPreview.conversations.some(item => item.id === conversation.body.conversation.id), true);
    const apiKeyAfterRestart = await request(restartedServer.base, '/api/v1/identity/me', { token: developerKey.body.raw });
    assert.equal(apiKeyAfterRestart.status, 200, JSON.stringify(apiKeyAfterRestart.body));
    assert.equal(apiKeyAfterRestart.body.identity.userId, alice.body.user.id);
    const listedKeys = await request(restartedServer.base, `/api/developer/apps/${developerApp.body.app.id}/keys`, { token });
    assert.equal(listedKeys.status, 200);
    assert.equal('hash' in listedKeys.body.keys[0], false);
    const revokeKey = await request(restartedServer.base, `/api/developer/apps/${developerApp.body.app.id}/keys/${developerKey.body.key.id}`, {
      method: 'DELETE', token, payload: {}
    });
    assert.equal(revokeKey.status, 200);
    assert.equal((await request(restartedServer.base, '/api/v1/identity/me', { token: developerKey.body.raw })).status, 401);

    const logout = await request(restartedServer.base, '/api/auth/logout', { method: 'POST', token, payload: {} });
    assert.equal(logout.status, 200);
    assert.equal((await request(restartedServer.base, '/api/me', { token })).status, 401);
    assert.equal((await request(restartedServer.base, '/api/me', { token: 'malformed.token' })).status, 401);
    assert.equal(Number((await pool.query('SELECT count(*) AS count FROM sessions WHERE token_hash=encode(digest($1,\'sha256\'),\'hex\')', [token])).rows[0].count), 0);
    assert.equal(fs.existsSync(dataFile), false, 'production restart must still avoid JSON persistence');
  } finally {
    await stopServer(firstServer);
    await stopServer(peerServer);
    await stopServer(restartedServer);
    if (provider) await provider.close();
    await pool.end();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
