import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  LiveDistributionService,
  MediaMtxControlClient,
  StreamSecretVault,
  normalizeRtmpServerUrl
} from '../src/live-distribution.mjs';
import { loadRuntimeConfig } from '../src/config.mjs';

const MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const CONTROL_PASSWORD = 'test-control-password-0123456789abcdef';

test('stream secret vault encrypts with authenticated context and never stores plaintext', () => {
  const vault = new StreamSecretVault(MASTER_KEY);
  const encrypted = vault.encrypt('external-stream-key', 'destination:one');
  assert.match(encrypted, /^v1\./);
  assert.equal(encrypted.includes('external-stream-key'), false);
  assert.equal(vault.decrypt(encrypted, 'destination:one'), 'external-stream-key');
  assert.throws(() => vault.decrypt(encrypted, 'destination:two'), /STREAM_SECRET_DECRYPT_FAILED/);
  assert.equal(vault.fingerprint('external-stream-key').length, 12);
});

test('RTMP destination policy requires TLS and blocks local targets', () => {
  assert.equal(
    normalizeRtmpServerUrl('rtmps://a.rtmp.youtube.com/live2'),
    'rtmps://a.rtmp.youtube.com/live2'
  );
  assert.throws(() => normalizeRtmpServerUrl('rtmp://live.twitch.tv/app'), /RTMPS_REQUIRED_IN_PRODUCTION/);
  assert.throws(
    () => normalizeRtmpServerUrl('rtmps://127.0.0.1/live'),
    /PRIVATE_STREAM_DESTINATION_FORBIDDEN/
  );
  assert.throws(
    () => normalizeRtmpServerUrl('rtmps://[::1]/live'),
    /PRIVATE_STREAM_DESTINATION_FORBIDDEN/
  );
  assert.throws(
    () => normalizeRtmpServerUrl('rtmps://[::ffff:127.0.0.1]/live'),
    /PRIVATE_STREAM_DESTINATION_FORBIDDEN/
  );
  assert.throws(
    () => normalizeRtmpServerUrl('rtmps://user:pass@example.com/live'),
    /RTMP_SERVER_URL_INVALID/
  );
});

test('MediaMTX control client uses authenticated v3 endpoints', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    const pathname = new URL(url).pathname;
    if (pathname === '/v3/info') return new Response(JSON.stringify({ version: 'v1.20.1' }));
    if (pathname.startsWith('/v3/config/paths/add/')) return new Response(JSON.stringify({ status: 'ok' }));
    if (pathname.startsWith('/v3/config/paths/delete/')) return new Response(JSON.stringify({ status: 'ok' }));
    if (pathname.startsWith('/v3/paths/get/')) {
      return new Response(JSON.stringify({
        online: true,
        onlineTime: '2026-08-27T10:00:00.000Z',
        inboundBytes: 1200,
        outboundBytes: 2400,
        source: { type: 'rtmpConn' }
      }));
    }
    if (pathname === '/v3/paths/forward/list') {
      return new Response(JSON.stringify({ items: [{
        pos: 0,
        state: 'forwarding',
        protocol: 'rtmps',
        outboundBytes: 2400,
        lastError: ''
      }] }));
    }
    return new Response('{}', { status: 404 });
  };
  const client = new MediaMtxControlClient({
    baseUrl: 'http://mediamtx:9997',
    username: 'sylora-control',
    password: CONTROL_PASSWORD,
    fetchImpl
  });
  assert.equal(client.configured, true);
  assert.deepEqual(await client.ping(), { ok: true, version: 'v1.20.1' });
  await client.configurePath('sylora_control_test_path_001', ['rtmps://live.example.test/app#secret'], { record: true });
  assert.deepEqual(await client.pathStatus('sylora_control_test_path_001'), {
    exists: true,
    online: true,
    inboundBytes: 1200,
    outboundBytes: 2400,
    source: 'rtmpConn',
    onlineTime: '2026-08-27T10:00:00.000Z'
  });
  assert.deepEqual(await client.forwardStatus('sylora_control_test_path_001'), [{
    position: 0,
    status: 'forwarding',
    protocol: 'rtmps',
    outboundBytes: 2400,
    hasError: false
  }]);
  await client.deletePath('sylora_control_test_path_001');
  assert.equal(calls.every(call => call.options.headers.authorization?.startsWith('Basic ')), true);
  const addCall = calls.find(call => call.url.includes('/config/paths/add/'));
  assert.deepEqual(JSON.parse(addCall.options.body).forward, [{ dest: 'rtmps://live.example.test/app#secret' }]);
});

test('distribution service performs encrypted one-ingest fan-out lifecycle', async () => {
  const store = {
    data: { liveStreamDestinations: [], liveDistributionSessions: [] },
    save() {}
  };
  let configuredPath = null;
  let deletedPath = null;
  const router = {
    baseUrl: 'http://mediamtx:9997',
    credentialsConfigured: true,
    configured: true,
    async ping() { return { ok: true, version: 'v1.20.1' }; },
    async configurePath(name, targets, options) {
      assert.equal(store.data.liveDistributionSessions.at(-1)?.status, 'preparing');
      configuredPath = { name, targets, options };
    },
    async pathStatus() {
      return {
        online: true,
        inboundBytes: 4096,
        outboundBytes: 8192,
        source: 'rtmpConn',
        onlineTime: '2026-08-27T11:00:00.000Z'
      };
    },
    async forwardStatus() {
      return [{ position: 0, status: 'forwarding', protocol: 'rtmps', outboundBytes: 8192, hasError: false }];
    },
    async deletePath(name) { deletedPath = name; }
  };
  let clock = 0;
  const service = new LiveDistributionService({
    store,
    router,
    vault: new StreamSecretVault(MASTER_KEY),
    publicRtmpUrl: 'rtmp://127.0.0.1:1935',
    nodeEnv: 'test',
    now: () => new Date(Date.UTC(2026, 7, 27, 11, 0, clock++)).toISOString(),
    id: () => randomUUID()
  });
  await assert.rejects(
    () => service.createDestination('user-one', {
      provider: 'youtube',
      label: 'Invalid key',
      serverUrl: 'rtmps://a.rtmp.youtube.com/live2',
      streamKey: 'ключ🔑'
    }),
    /STREAM_KEY_INVALID/
  );
  const destination = await service.createDestination('user-one', {
    provider: 'youtube',
    label: 'Primary YouTube',
    serverUrl: 'rtmps://a.rtmp.youtube.com/live2',
    streamKey: 'youtube-secret-key'
  });
  assert.equal('serverUrl' in destination, false);
  assert.equal('encryptedStreamKey' in destination, false);
  assert.equal(store.data.liveStreamDestinations[0].encryptedStreamKey.includes('youtube-secret-key'), false);

  const encryptedStreamKey = store.data.liveStreamDestinations[0].encryptedStreamKey;
  store.data.liveStreamDestinations[0].encryptedStreamKey = 'v1.invalid.invalid.invalid';
  const unreadable = await service.preflight('user-one', 'live-one', [destination.id]);
  assert.equal(unreadable.ready, false);
  assert.deepEqual(unreadable.reasons, ['STREAM_DESTINATION_SECRET_UNREADABLE']);
  store.data.liveStreamDestinations[0].encryptedStreamKey = encryptedStreamKey;

  const preflight = await service.preflight('user-one', 'live-one', [destination.id]);
  assert.equal(preflight.ready, true);
  const started = await service.start('user-one', 'live-one', [destination.id], { record: true });
  assert.equal(started.ingest.shownOnce, true);
  assert.equal(started.ingest.serverUrl, 'rtmp://127.0.0.1:1935');
  assert.match(started.ingest.streamKey, /^sylora_/);
  assert.deepEqual(configuredPath.targets, ['rtmps://a.rtmp.youtube.com/live2#youtube-secret-key']);
  assert.equal(configuredPath.options.record, true);
  await assert.rejects(
    () => service.start('user-one', 'live-one', [destination.id], { record: true }),
    /DISTRIBUTION_ALREADY_ACTIVE/
  );

  const observed = await service.status('user-one', 'live-one');
  assert.equal(observed.session.status, 'live');
  assert.equal(observed.session.inboundBytes, 4096);
  assert.equal(observed.session.destinations[0].status, 'forwarding');
  assert.equal(JSON.stringify(observed).includes(started.ingest.streamKey), false);
  assert.equal(JSON.stringify(observed).includes('youtube-secret-key'), false);
  router.forwardStatus = async () => [{
    position: 0, status: 'idle', protocol: 'rtmps', outboundBytes: 0, hasError: false
  }];
  const degraded = await service.status('user-one', 'live-one');
  assert.equal(degraded.session.status, 'degraded');
  await assert.rejects(
    () => service.deleteDestination('user-one', destination.id),
    /STREAM_DESTINATION_IN_ACTIVE_SESSION/
  );
  await assert.rejects(
    () => service.updateDestination('user-one', destination.id, { enabled: false }),
    /STREAM_DESTINATION_IN_ACTIVE_SESSION/
  );
  const stopped = await service.stop('user-one', 'live-one');
  assert.equal(stopped.session.status, 'stopped');
  assert.equal(deletedPath, configuredPath.name);
  assert.deepEqual(await service.deleteDestination('user-one', destination.id), { deleted: true });
});

test('distribution session fails closed when the router loses its dynamic path', async () => {
  const vault = new StreamSecretVault(MASTER_KEY);
  const sessionId = randomUUID();
  const store = {
    data: {
      liveStreamDestinations: [],
      liveDistributionSessions: [{
        id: sessionId,
        liveId: 'live-lost-path',
        userId: 'user-one',
        status: 'waiting_for_source',
        encryptedIngestPath: vault.encrypt('sylora_lost_path_0000000001', `session:${sessionId}`),
        ingestKeyFingerprint: '0123456789ab',
        destinationIds: ['destination-one'],
        destinationStates: [{ id: 'destination-one', provider: 'youtube', label: 'YouTube', status: 'configured' }],
        record: true,
        createdAt: '2026-08-27T12:00:00.000Z',
        startedAt: null,
        stoppedAt: null,
        lastObservedAt: null
      }]
    },
    save() {}
  };
  const router = {
    baseUrl: 'http://mediamtx:9997',
    credentialsConfigured: true,
    configured: true,
    async pathStatus() { return { exists: false, online: false, inboundBytes: 0, outboundBytes: 0 }; },
    async forwardStatus() { return []; }
  };
  const service = new LiveDistributionService({
    store,
    router,
    vault,
    publicRtmpUrl: 'rtmp://127.0.0.1:1935',
    nodeEnv: 'test',
    now: () => '2026-08-27T12:01:00.000Z'
  });
  const observed = await service.status('user-one', 'live-lost-path');
  assert.equal(observed.session.status, 'failed');
  assert.equal(observed.session.reason, 'MEDIA_ROUTER_PATH_LOST');
  assert.equal(observed.session.destinations[0].hasError, true);
  assert.equal(await service.activeSession('user-one', 'live-lost-path'), null);
});

test('runtime distribution config requires authenticated control and RTMPS in production', () => {
  const base = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://sylora:secret@postgres:5432/sylora',
    SYLORA_MEDIA_ROUTER_CONTROL_URL: 'http://mediamtx:9997',
    SYLORA_MEDIA_ROUTER_CONTROL_USER: 'sylora-control',
    SYLORA_MEDIA_ROUTER_CONTROL_PASSWORD: CONTROL_PASSWORD,
    SYLORA_MEDIA_ROUTER_PUBLIC_RTMP_URL: 'rtmps://stream.example.com:443',
    SYLORA_STREAM_SECRET_KEY: MASTER_KEY
  };
  const configured = loadRuntimeConfig(base);
  assert.equal(configured.distribution.configured, true);
  assert.equal(configured.distribution.controlCredentialsConfigured, true);
  assert.equal(loadRuntimeConfig({ ...base, SYLORA_MEDIA_ROUTER_CONTROL_PASSWORD: 'short' }).distribution.configured, false);
  assert.equal(loadRuntimeConfig({ ...base, SYLORA_MEDIA_ROUTER_PUBLIC_RTMP_URL: 'rtmp://stream.example.com' }).distribution.configured, false);
});
