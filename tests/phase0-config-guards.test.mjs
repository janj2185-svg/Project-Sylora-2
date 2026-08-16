import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  AI_STATUS,
  REALTIME_STATUS,
  RuntimeMode,
  loadRuntimeConfig,
  validateProductionConfig
} from '../src/config.mjs';
import { buildReadinessReport } from '../src/runtime-status.mjs';

test('Docker Compose restarts every core service after a host reboot', () => {
  const compose = readFileSync(new URL('../compose.yaml', import.meta.url), 'utf8');
  for (const service of ['sylora', 'postgres', 'redis']) {
    assert.match(compose, new RegExp(`^  ${service}:\n    restart: unless-stopped$`, 'm'));
  }
});

test('TEST 1: development without DATABASE_URL allows startup config', () => {
  const config = loadRuntimeConfig({ NODE_ENV: 'development', DATABASE_URL: '' });
  assert.equal(config.nodeEnv, RuntimeMode.DEVELOPMENT);
  assert.equal(config.database.configured, false);
  const validation = validateProductionConfig(config);
  assert.equal(validation.valid, true);
});

test('session TTL is a finite bounded whole number', () => {
  assert.equal(loadRuntimeConfig({ SESSION_TTL_DAYS: '1' }).sessionTtlDays, 1);
  assert.equal(loadRuntimeConfig({ SESSION_TTL_DAYS: '365' }).sessionTtlDays, 365);
  for (const value of ['Infinity', 'NaN', '0', '1.5', '366']) {
    assert.throws(
      () => loadRuntimeConfig({ SESSION_TTL_DAYS: value }),
      /Invalid SESSION_TTL_DAYS configuration/
    );
  }
});

test('TEST 2: production without DATABASE_URL fails validation', () => {
  const config = loadRuntimeConfig({ NODE_ENV: 'production', DATABASE_URL: '' });
  const validation = validateProductionConfig(config);
  assert.equal(validation.valid, false);
  assert.match(validation.errors[0], /DATABASE_URL is required/);
});

test('TEST 3: production with database config passes validation', () => {
  const config = loadRuntimeConfig({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://sylora:secret@127.0.0.1:5432/sylora'
  });
  const validation = validateProductionConfig(config);
  assert.equal(validation.valid, true);
  assert.equal(config.database.configured, true);
});

test('TEST 4: missing OPENAI_API_KEY yields unavailable/degraded, not crash', () => {
  const dev = loadRuntimeConfig({ NODE_ENV: 'development', OPENAI_API_KEY: '' });
  assert.equal(dev.ai.status, AI_STATUS.DEGRADED);
  const prod = loadRuntimeConfig({ NODE_ENV: 'production', OPENAI_API_KEY: '', DATABASE_URL: 'postgresql://x' });
  assert.equal(prod.ai.status, AI_STATUS.UNAVAILABLE);
  const readiness = buildReadinessReport(prod, {
    postgres: { configured: true, ok: true },
    redis: { configured: false, ok: true },
    outbox: { configured: true, ok: true }
  });
  assert.equal(readiness.ai.status, AI_STATUS.UNAVAILABLE);
  assert.equal(readiness.checks.ai.ok, true);
  assert.equal(readiness.checks.ai.required, false);
  const degradedBase = loadRuntimeConfig({
    NODE_ENV: 'development',
    OPENAI_API_KEY: 'test-key',
    OPENAI_BASE_URL: 'http://127.0.0.1:9/v1'
  });
  assert.equal(degradedBase.ai.status, AI_STATUS.DEGRADED);
});

test('TEST 5: missing TURN yields correct realtime readiness status', () => {
  const dev = loadRuntimeConfig({ NODE_ENV: 'development', SYLORA_ICE_SERVERS_JSON: '' });
  assert.equal(dev.realtime.status, REALTIME_STATUS.DEGRADED);
  const prod = loadRuntimeConfig({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://x',
    SYLORA_ICE_SERVERS_JSON: JSON.stringify([{ urls: 'stun:stun.test:3478' }])
  });
  assert.equal(prod.realtime.status, REALTIME_STATUS.NOT_READY);
  const readiness = buildReadinessReport(prod, {
    postgres: { configured: true, ok: true },
    redis: { configured: false, ok: true },
    outbox: { configured: true, ok: true }
  });
  assert.equal(readiness.ready, false);
  assert.equal(readiness.realtime.status, REALTIME_STATUS.NOT_READY);
  assert.equal(readiness.checks.redis.status, 'DEGRADED');
});

test('production boot guard exits when DATABASE_URL is missing', async () => {
  const child = spawn(process.execPath, ['src/server.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: '', REDIS_URL: '', PORT: '8794' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const code = await new Promise((resolve) => child.on('close', resolve));
  assert.notEqual(code, 0);
  assert.match(stderr, /DATABASE_URL is required/);
  assert.doesNotMatch(stderr, /postgresql:\/\//);
});

test('development process can boot without DATABASE_URL / OpenAI / TURN', async () => {
  const port = 8795;
  const child = spawn(process.execPath, ['src/server.mjs'], {
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'development',
      DATABASE_URL: '',
      REDIS_URL: '',
      OPENAI_API_KEY: '',
      SYLORA_ICE_SERVERS_JSON: '',
      SYLORA_DATA_FILE: `./tmp/phase0-dev-${port}.json`
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    for (let i = 0; i < 50; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (res.status > 0) {
          const health = await res.json();
          assert.equal(health.alive, true);
          assert.equal(health.ai.status, AI_STATUS.DEGRADED);
          assert.equal(health.realtime.status, REALTIME_STATUS.DEGRADED);
          const aiRes = await fetch(`http://127.0.0.1:${port}/api/ai/status`);
          assert.equal(aiRes.status, 200);
          const ai = await aiRes.json();
          assert.equal(ai.status, AI_STATUS.DEGRADED);
          assert.equal('apiKey' in ai, false);
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('development server did not start');
  } finally {
    child.kill('SIGTERM');
  }
});

test('public diagnostics never embed secret values', () => {
  const secret = 'totally-secret-value-do-not-leak';
  const config = loadRuntimeConfig({
    NODE_ENV: 'development',
    DATABASE_URL: `postgresql://user:${secret}@127.0.0.1:5432/sylora`,
    REDIS_URL: `redis://:${secret}@127.0.0.1:6379`,
    OPENAI_API_KEY: secret,
    SYLORA_TURN_CREDENTIAL: secret,
    SYLORA_PAYMENT_SECRET_KEY: secret
  });
  const report = buildReadinessReport(config, {
    postgres: { configured: true, ok: true },
    redis: { configured: true, ok: true },
    outbox: { configured: true, ok: true }
  });
  const json = JSON.stringify(report);
  assert.equal(json.includes(secret), false);
  assert.equal(json.includes('postgresql://'), false);
});
