import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

const MASTER_KEY = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
const CONTROL_USER = 'sylora-control';
const CONTROL_PASSWORD = 'test-control-password-0123456789abcdef';
const EXTERNAL_STREAM_KEY = 'youtube-api-test-secret';

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

test('distribution API keeps destination secrets server-side and returns ingest key once', async () => {
  const routerState = { configured: null, deleted: null };
  const expectedAuth = `Basic ${Buffer.from(`${CONTROL_USER}:${CONTROL_PASSWORD}`).toString('base64')}`;
  const fakeRouter = http.createServer(async (req, res) => {
    if (req.headers.authorization !== expectedAuth) return json(res, 401, { status: 'error', error: 'unauthorized' });
    if (req.method === 'GET' && req.url === '/v3/info') return json(res, 200, { version: 'v1.20.1' });
    if (req.method === 'POST' && req.url.startsWith('/v3/config/paths/add/')) {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      routerState.configured = {
        name: decodeURIComponent(req.url.split('/').at(-1)),
        body: JSON.parse(raw)
      };
      return json(res, 200, { status: 'ok' });
    }
    if (req.method === 'GET' && req.url.startsWith('/v3/paths/get/')) {
      return json(res, 200, {
        online: true,
        onlineTime: '2026-08-27T12:00:00.000Z',
        inboundBytes: 1234,
        outboundBytes: 2468,
        source: { type: 'rtmpConn' }
      });
    }
    if (req.method === 'GET' && req.url.startsWith('/v3/paths/forward/list?')) {
      return json(res, 200, { items: [{
        pos: 0,
        state: 'forwarding',
        protocol: 'rtmps',
        outboundBytes: 2468,
        lastError: ''
      }] });
    }
    if (req.method === 'DELETE' && req.url.startsWith('/v3/config/paths/delete/')) {
      routerState.deleted = decodeURIComponent(req.url.split('/').at(-1));
      return json(res, 200, { status: 'ok' });
    }
    return json(res, 404, { status: 'error', error: 'not found' });
  });
  await new Promise(resolve => fakeRouter.listen(0, '127.0.0.1', resolve));

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-distribution-api-'));
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.SYLORA_DATA_FILE = path.join(dir, 'db.json');
  process.env.SYLORA_MEDIA_ROUTER_CONTROL_URL = `http://127.0.0.1:${fakeRouter.address().port}`;
  process.env.SYLORA_MEDIA_ROUTER_CONTROL_USER = CONTROL_USER;
  process.env.SYLORA_MEDIA_ROUTER_CONTROL_PASSWORD = CONTROL_PASSWORD;
  process.env.SYLORA_MEDIA_ROUTER_PUBLIC_RTMP_URL = 'rtmp://127.0.0.1:1935';
  process.env.SYLORA_STREAM_SECRET_KEY = MASTER_KEY;

  const { server } = await import(`../src/server.mjs?distribution-api=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (pathname, options = {}) => {
    const response = await fetch(`${base}${pathname}`, {
      ...options,
      headers: { 'content-type': 'application/json', ...(options.headers || {}) }
    });
    const payload = await response.json();
    assert.equal(response.ok, true, JSON.stringify(payload));
    return payload;
  };

  try {
    const account = await call('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'streamer@test.dev', username: 'streamer', password: 'password123' })
    });
    const auth = { authorization: `Bearer ${account.token}` };
    const live = await call('/api/live', {
      method: 'POST', headers: auth, body: JSON.stringify({ title: 'Multistream API test' })
    });
    const outsider = await call('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'outsider@test.dev', username: 'outsider', password: 'password123' })
    });
    const outsiderAuth = { authorization: `Bearer ${outsider.token}` };
    const foreignStatus = await fetch(`${base}/api/live/${live.live.id}/distribution`, {
      headers: { ...outsiderAuth, 'content-type': 'application/json' }
    });
    assert.equal(foreignStatus.status, 403);
    assert.equal((await foreignStatus.json()).error, 'LIVE_HOST_REQUIRED');
    const studio = await call('/api/studio/distribution', { headers: auth });
    assert.equal(studio.configuration.configured, true);
    assert.equal(studio.configuration.controlCredentialsConfigured, true);

    const created = await call('/api/studio/distribution/destinations', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        provider: 'youtube',
        label: 'YouTube test',
        serverUrl: 'rtmps://a.rtmp.youtube.com/live2',
        streamKey: EXTERNAL_STREAM_KEY
      })
    });
    assert.equal('serverUrl' in created.destination, false);
    assert.equal('encryptedStreamKey' in created.destination, false);
    assert.equal(JSON.stringify(created).includes(EXTERNAL_STREAM_KEY), false);
    const foreignDelete = await fetch(`${base}/api/studio/distribution/destinations/${created.destination.id}`, {
      method: 'DELETE', headers: { ...outsiderAuth, 'content-type': 'application/json' }
    });
    assert.equal(foreignDelete.status, 404);
    assert.equal((await foreignDelete.json()).error, 'STREAM_DESTINATION_NOT_FOUND');
    const persisted = fs.readFileSync(process.env.SYLORA_DATA_FILE, 'utf8');
    assert.equal(persisted.includes(EXTERNAL_STREAM_KEY), false);
    assert.match(JSON.parse(persisted).liveStreamDestinations[0].encryptedStreamKey, /^v1\./);

    const preflight = await call(`/api/live/${live.live.id}/distribution/preflight`, {
      method: 'POST', headers: auth, body: JSON.stringify({ destinationIds: [created.destination.id] })
    });
    assert.equal(preflight.ready, true);
    const started = await call(`/api/live/${live.live.id}/distribution/start`, {
      method: 'POST', headers: auth, body: JSON.stringify({ destinationIds: [created.destination.id], record: true })
    });
    assert.equal(started.ingest.shownOnce, true);
    assert.match(started.ingest.streamKey, /^sylora_/);
    assert.equal(JSON.stringify(started).includes(EXTERNAL_STREAM_KEY), false);
    assert.equal(routerState.configured.name, started.ingest.streamKey);
    assert.deepEqual(routerState.configured.body.forward, [
      { dest: `rtmps://a.rtmp.youtube.com/live2#${EXTERNAL_STREAM_KEY}` }
    ]);
    assert.equal(routerState.configured.body.record, true);

    const observed = await call(`/api/live/${live.live.id}/distribution`, { headers: auth });
    assert.equal(observed.session.status, 'live');
    assert.equal(observed.session.inboundBytes, 1234);
    assert.equal(observed.session.destinations[0].status, 'forwarding');
    assert.equal(JSON.stringify(observed).includes(started.ingest.streamKey), false);
    assert.equal(JSON.stringify(observed).includes(EXTERNAL_STREAM_KEY), false);

    const activeDelete = await fetch(`${base}/api/studio/distribution/destinations/${created.destination.id}`, {
      method: 'DELETE', headers: { ...auth, 'content-type': 'application/json' }
    });
    assert.equal(activeDelete.status, 409);
    assert.equal((await activeDelete.json()).error, 'STREAM_DESTINATION_IN_ACTIVE_SESSION');

    const stopped = await call(`/api/live/${live.live.id}/distribution/stop`, {
      method: 'POST', headers: auth, body: '{}'
    });
    assert.equal(stopped.session.status, 'stopped');
    assert.equal(routerState.deleted, routerState.configured.name);
    await call(`/api/studio/distribution/destinations/${created.destination.id}`, {
      method: 'DELETE', headers: auth
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    await new Promise(resolve => fakeRouter.close(resolve));
    for (const name of [
      'SYLORA_MEDIA_ROUTER_CONTROL_URL',
      'SYLORA_MEDIA_ROUTER_CONTROL_USER',
      'SYLORA_MEDIA_ROUTER_CONTROL_PASSWORD',
      'SYLORA_MEDIA_ROUTER_PUBLIC_RTMP_URL',
      'SYLORA_STREAM_SECRET_KEY'
    ]) delete process.env[name];
  }
});
