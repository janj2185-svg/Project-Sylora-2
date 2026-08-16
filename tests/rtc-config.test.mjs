import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_TURN_TTL_SECONDS,
  buildIceServersFromEnv,
  hasTurnServer,
  issueIceServersForUser,
  parseIceServers,
  parseTurnTtlSeconds,
  resolveTurnConfiguration
} from '../src/rtc-config.mjs';
import {
  REALTIME_STATUS,
  loadRuntimeConfig
} from '../src/config.mjs';
import { integrationStatus } from '../src/integrations.mjs';
import { buildReadinessReport } from '../src/runtime-status.mjs';
import {
  RTC_CONFIG_CACHE_MAX_MS,
  RTC_CONFIG_EXPIRY_SAFETY_MS,
  isRtcConfigCacheFresh
} from '../public/rtc-config-cache.js';

const DATABASE_URL = 'postgresql://sylora:test@postgres:5432/sylora';
const TURN_URL = 'turn:turn.example.test:3478?transport=udp';
const SHARED_SECRET = '0123456789abcdef0123456789abcdef';

function healthyDependencies() {
  return {
    postgres: { configured: true, ok: true },
    redis: { configured: true, ok: true },
    outbox: { configured: true, ok: true }
  };
}

test('RTC config builds ICE servers from discrete STUN/TURN env vars', () => {
  const servers = buildIceServersFromEnv({
    SYLORA_STUN_URLS: 'stun:stun.example.com:3478,stun:stun2.example.com:3478',
    SYLORA_TURN_URL: 'turn:turn.example.com:3478',
    SYLORA_TURN_USERNAME: 'sylora',
    SYLORA_TURN_CREDENTIAL: 'secret'
  });
  assert.equal(servers.length, 2);
  assert.equal(servers[1].username, 'sylora');
  assert.equal(hasTurnServer(servers), true);
});

test('RTC config accepts only bounded STUN/TURN server definitions', () => {
  const servers = parseIceServers(JSON.stringify([
    { urls: 'stun:stun.example.com:3478' },
    { urls: ['turn:turn.example.com:3478?transport=udp', 'turns:turn.example.com:5349'], username: 'sylora', credential: 'secret' },
    { urls: 'https://not-an-ice-server.example.com' }
  ]));
  assert.equal(servers.length, 2);
  assert.equal(servers[1].username, 'sylora');
  assert.equal(servers[1].credential, 'secret');
  assert.equal(hasTurnServer(servers), true);
});

test('RTC config fails closed for malformed input', () => {
  assert.deepEqual(parseIceServers('{bad json'), []);
  assert.deepEqual(parseIceServers(JSON.stringify({ urls: 'stun:x' })), []);
  for (const url of [
    'turn:',
    'turn://turn.example.test:3478',
    'turn:turn.example.test:0',
    'turn:turn.example.test:65536',
    'turn:turn.example.test:3478?transport=sctp',
    'stun:stun.example.test:3478?transport=udp',
    'turn:[::::]:3478',
    'turn:turn.example.test:3478\nno-auth'
  ]) {
    assert.deepEqual(parseIceServers(JSON.stringify([{ urls: url }])), []);
  }
  assert.equal(hasTurnServer([]), false);
});

test('bare TURN URL is not production-ready without usable credentials', () => {
  const config = loadRuntimeConfig({
    NODE_ENV: 'production',
    DATABASE_URL,
    SYLORA_TURN_URL: TURN_URL
  });

  assert.equal(config.turnUrlConfigured, true);
  assert.equal(config.turnConfigured, false);
  assert.equal(config.turnAuthMode, null);
  assert.equal(config.realtime.status, REALTIME_STATUS.NOT_READY);
  assert.equal(config.realtime.reason, 'TURN_CREDENTIALS_NOT_CONFIGURED');
  assert.equal(buildReadinessReport(config, healthyDependencies()).ready, false);
});

test('integration status uses strict TURN auth readiness', () => {
  const bare = integrationStatus({
    NODE_ENV: 'production',
    DATABASE_URL,
    SYLORA_TURN_URL: TURN_URL
  });
  const shared = integrationStatus({
    NODE_ENV: 'production',
    DATABASE_URL,
    SYLORA_TURN_URL: TURN_URL,
    SYLORA_TURN_SHARED_SECRET: SHARED_SECRET
  });

  assert.equal(bare.turn.status, 'BLOCKED_EXTERNAL');
  assert.equal(bare.turn.reason, 'TURN_CREDENTIALS_NOT_CONFIGURED');
  assert.equal(bare.turn.authMode, null);
  assert.equal(shared.turn.status, 'CONFIGURED');
  assert.equal(shared.turn.authMode, 'shared_secret');
});

test('static TURN credentials remain supported and satisfy readiness', () => {
  const config = loadRuntimeConfig({
    NODE_ENV: 'production',
    DATABASE_URL,
    SYLORA_TURN_URL: TURN_URL,
    SYLORA_TURN_USERNAME: 'static-user',
    SYLORA_TURN_CREDENTIAL: 'static-password'
  });

  assert.equal(config.turnConfigured, true);
  assert.equal(config.turnAuthMode, 'static');
  assert.equal(config.realtime.status, REALTIME_STATUS.READY);
  assert.equal(buildReadinessReport(config, healthyDependencies()).ready, true);
});

test('shared-secret mode issues deterministic coturn REST credentials with an expiry', () => {
  const env = {
    NODE_ENV: 'production',
    DATABASE_URL,
    SYLORA_STUN_URLS: 'stun:stun.example.test:3478',
    SYLORA_TURN_URL: TURN_URL,
    SYLORA_TURN_SHARED_SECRET: SHARED_SECRET,
    SYLORA_TURN_TTL_SECONDS: '1800'
  };
  const config = loadRuntimeConfig(env);
  const now = Date.UTC(2026, 7, 16, 12, 0, 0);
  const issued = issueIceServersForUser(config.iceServers, {
    env,
    userId: 'user-123',
    now
  });
  const expiresAtEpochSeconds = Math.floor(now / 1000) + 1800;
  const username = `${expiresAtEpochSeconds}:user-123`;
  const expectedCredential = createHmac('sha1', SHARED_SECRET)
    .update(username)
    .digest('base64');

  assert.equal(config.turnConfigured, true);
  assert.equal(config.turnAuthMode, 'shared_secret');
  assert.equal(config.turnCredentialTtlSeconds, 1800);
  assert.equal(config.realtime.status, REALTIME_STATUS.READY);
  assert.equal(issued.authMode, 'shared_secret');
  assert.equal(issued.credentialTtlSeconds, 1800);
  assert.equal(issued.credentialExpiresAtEpochSeconds, expiresAtEpochSeconds);
  assert.equal(issued.credentialExpiresAt, new Date(expiresAtEpochSeconds * 1000).toISOString());
  assert.deepEqual(issued.iceServers[0], { urls: ['stun:stun.example.test:3478'] });
  assert.equal(issued.iceServers[1].username, username);
  assert.equal(issued.iceServers[1].credential, expectedCredential);
  assert.equal(JSON.stringify(config).includes(SHARED_SECRET), false);
  assert.equal(JSON.stringify(issued).includes(SHARED_SECRET), false);
  assert.equal(buildReadinessReport(config, healthyDependencies()).ready, true);
});

test('short shared secret is rejected instead of producing false readiness', () => {
  const iceServers = buildIceServersFromEnv({ SYLORA_TURN_URL: TURN_URL });
  const turn = resolveTurnConfiguration(iceServers, {
    SYLORA_TURN_SHARED_SECRET: 'too-short'
  });

  assert.equal(turn.urlConfigured, true);
  assert.equal(turn.configured, false);
  assert.equal(turn.authMode, null);
});

test('shared secret rejects whitespace and config-injection characters', () => {
  const iceServers = buildIceServersFromEnv({ SYLORA_TURN_URL: TURN_URL });
  for (const secret of [
    ` ${SHARED_SECRET}`,
    `${SHARED_SECRET} `,
    `${SHARED_SECRET}\nno-auth`,
    `${SHARED_SECRET}:unsupported`
  ]) {
    const turn = resolveTurnConfiguration(iceServers, {
      SYLORA_TURN_SHARED_SECRET: secret
    });
    assert.equal(turn.configured, false);
    assert.equal(turn.authMode, null);
  }
});

test('TURN credential TTL is bounded', () => {
  assert.equal(parseTurnTtlSeconds(undefined), DEFAULT_TURN_TTL_SECONDS);
  assert.equal(parseTurnTtlSeconds('300'), 300);
  assert.equal(parseTurnTtlSeconds('86400'), 86400);
  for (const value of ['299', '86401', '1.5', 'NaN', 'Infinity']) {
    assert.throws(
      () => parseTurnTtlSeconds(value),
      /Invalid SYLORA_TURN_TTL_SECONDS configuration/
    );
  }
});

test('browser RTC cache refreshes before credential expiry and across long sessions', () => {
  const now = Date.UTC(2026, 7, 16, 12, 0, 0);
  const staticConfig = { iceServers: [{ urls: 'turn:turn.example.test:3478' }] };
  const expiringConfig = {
    ...staticConfig,
    credentialExpiresAt: new Date(now + RTC_CONFIG_EXPIRY_SAFETY_MS + 1_000).toISOString()
  };
  const nearExpiryConfig = {
    ...staticConfig,
    credentialExpiresAt: new Date(now + RTC_CONFIG_EXPIRY_SAFETY_MS).toISOString()
  };

  assert.equal(isRtcConfigCacheFresh(staticConfig, { fetchedAt: now - 1_000, now }), true);
  assert.equal(isRtcConfigCacheFresh(expiringConfig, { fetchedAt: now - 1_000, now }), true);
  assert.equal(isRtcConfigCacheFresh(nearExpiryConfig, { fetchedAt: now - 1_000, now }), false);
  assert.equal(isRtcConfigCacheFresh(staticConfig, { fetchedAt: now - RTC_CONFIG_CACHE_MAX_MS, now }), false);
  assert.equal(isRtcConfigCacheFresh(staticConfig, { fetchedAt: now + 1, now }), false);
  assert.equal(isRtcConfigCacheFresh(null, { fetchedAt: now, now }), false);
});

test('discrete STUN and TURN variables reject the wrong URL schemes', () => {
  const servers = buildIceServersFromEnv({
    SYLORA_STUN_URLS: 'turn:wrong.example.test:3478 stun:stun.example.test:3478',
    SYLORA_TURN_URL: 'stun:wrong.example.test:3478',
    SYLORA_TURN_USERNAME: 'ignored',
    SYLORA_TURN_CREDENTIAL: 'ignored'
  });

  assert.deepEqual(servers, [{ urls: ['stun:stun.example.test:3478'] }]);
});

test('coturn deployment is pinned, opt-in, bounded, and contains no committed secret', () => {
  const compose = readFileSync(new URL('../compose.yaml', import.meta.url), 'utf8');
  const turnserver = readFileSync(new URL('../infra/coturn/turnserver.conf', import.meta.url), 'utf8');

  assert.match(compose, /image: coturn\/coturn:4\.17\.2-r0/);
  assert.match(compose, /profiles: \["turn"\]/);
  assert.match(compose, /network_mode: host/);
  assert.match(compose, /SYLORA_TURN_SHARED_SECRET/);
  assert.doesNotMatch(compose, /turn:\s+[\s\S]*?env_file:/);
  assert.match(compose, /environment:\s+SYLORA_TURN_SHARED_SECRET:/);
  assert.match(turnserver, /^use-auth-secret$/m);
  assert.match(turnserver, /^min-port=49160$/m);
  assert.match(turnserver, /^max-port=49259$/m);
  assert.doesNotMatch(turnserver, /^static-auth-secret=/m);
});
