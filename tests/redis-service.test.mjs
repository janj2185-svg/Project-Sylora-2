import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RedisService } from '../src/infra/redis.mjs';
import { LiveHostSessionRegistry, LivePeerRegistry } from '../src/live-peer-registry.mjs';

const never = () => new Promise(() => {});

function hungRedis(commandTimeoutMs = 30) {
  const redis = new RedisService('', { commandTimeoutMs });
  redis.client = {
    isReady: true,
    eval: never,
    get: never,
    ping: never,
    publish: never
  };
  return redis;
}

function isCommandTimeout(error, operation) {
  return error?.code === 'REDIS_COMMAND_TIMEOUT' && error?.operation === operation;
}

test('Redis command deadline bounds health, rate, publish, and viewer commands', async () => {
  const redis = hungRedis();
  const started = Date.now();
  const results = await Promise.allSettled([
    redis.rateCount('rate:test', 60_000),
    redis.publish('events', '{}'),
    redis.touchViewer('live-a', 'viewer-a'),
    redis.removeViewer('live-a', 'viewer-a'),
    redis.viewerCount('live-a')
  ]);
  const operations = ['rateCount', 'publish', 'touchViewer', 'removeViewer', 'viewerCount'];
  for (let index = 0; index < results.length; index += 1) {
    assert.equal(results[index].status, 'rejected');
    assert.equal(isCommandTimeout(results[index].reason, operations[index]), true);
  }
  assert.equal(Date.now() - started < 500, true, 'hung Redis commands should fail promptly');
  const health = await redis.ping();
  assert.equal(health.configured, true);
  assert.equal(health.ok, false);
  assert.equal(health.latencyMs < 500, true, 'Redis health must share the command deadline');
});

test('peer lease GET and EVAL operations cannot hold registry requests open', async () => {
  const registry = new LivePeerRegistry(hungRedis());
  const started = Date.now();
  const results = await Promise.allSettled([
    registry.claim('live-a', 'peer-aaaa', 'user-a'),
    registry.owner('live-a', 'peer-aaaa'),
    registry.release('live-a', 'peer-aaaa', 'user-a')
  ]);
  for (const [index, operation] of ['claimLease', 'leaseOwner', 'releaseLease'].entries()) {
    assert.equal(results[index].status, 'rejected');
    assert.equal(isCommandTimeout(results[index].reason, operation), true);
  }
  assert.equal(Date.now() - started < 500, true, 'hung lease commands should fail promptly');
});

test('host stream acquire, renew, and release reject on a hung Redis command', async () => {
  const registry = new LiveHostSessionRegistry(hungRedis());
  const started = Date.now();
  for (const [operation, run] of [
    ['acquireHostStream', () => registry.acquireStream('live-a', 'host-peer', 'host-user', 'stream-a')],
    ['renewHostStream', () => registry.renewStream('live-a', 'host-peer', 'host-user', 'stream-a')],
    ['releaseHostStream', () => registry.releaseStream('live-a', 'host-peer', 'host-user', 'stream-a')]
  ]) {
    await assert.rejects(run(), error => isCommandTimeout(error, operation));
  }
  assert.equal(Date.now() - started < 750, true, 'host registry commands should fail promptly');
});

test('signaling acquire fails closed and heartbeat renewal always clears its guard', () => {
  const server = fs.readFileSync(new URL('../src/server.mjs', import.meta.url), 'utf8');
  const acquireStart = server.indexOf("hostFenceClaimTask=liveHostRegistry.acquireStream");
  const heartbeatStart = server.indexOf('let renewing=false', acquireStart);
  assert.notEqual(acquireStart, -1);
  assert.notEqual(heartbeatStart, -1);
  assert.match(server.slice(acquireStart, heartbeatStart), /json\(res,503,\{error:'LIVE_SIGNALING_UNAVAILABLE'\}\)/);
  assert.match(server.slice(heartbeatStart, heartbeatStart + 1_500), /catch\{liveSignalSse\.end\(res\)\}finally\{renewing=false\}/);
});
