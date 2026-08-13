import test from 'node:test';
import assert from 'node:assert/strict';
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

test('TEST 1: development without DATABASE_URL allows startup config', () => {
  const config = loadRuntimeConfig({ NODE_ENV: 'development', DATABASE_URL: '' });
  assert.equal(config.nodeEnv, RuntimeMode.DEVELOPMENT);
  assert.equal(config.database.configured, false);
  const validation = validateProductionConfig(config);
  assert.equal(validation.valid, true);
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
    redis: { configured: true, ok: true },
    outbox: { configured: true, ok: true }
  });
  assert.equal(readiness.ai.status, AI_STATUS.UNAVAILABLE);
  assert.equal(readiness.checks.ai.ok, false);
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
    redis: { configured: true, ok: true },
    outbox: { configured: true, ok: true }
  });
  assert.equal(readiness.ready, false);
  assert.equal(readiness.realtime.status, REALTIME_STATUS.NOT_READY);
});

test('production boot guard exits when DATABASE_URL is missing', async () => {
  const child = spawn(process.execPath, ['-e', `
    import { loadRuntimeConfig, enforceProductionBootGuard } from './src/config.mjs';
    enforceProductionBootGuard(loadRuntimeConfig({ NODE_ENV: 'production', DATABASE_URL: '' }));
  `], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const code = await new Promise((resolve) => child.on('close', resolve));
  assert.notEqual(code, 0);
  assert.match(stderr, /DATABASE_URL is required/);
  assert.doesNotMatch(stderr, /postgresql:\/\//);
});
