import test from 'node:test';
import assert from 'node:assert/strict';
import { hasTurnServer, parseIceServers, resolveIceConfig, webrtcReadiness } from '../src/rtc-config.mjs';

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
  assert.equal(hasTurnServer([]), false);
});

test('RTC config merges discrete STUN/TURN env with JSON', () => {
  const ice = resolveIceConfig({
    SYLORA_ICE_SERVERS_JSON: JSON.stringify([{ urls: 'stun:stun.json.example:3478' }]),
    SYLORA_STUN_URLS: 'stun:stun.discrete.example:3478',
    SYLORA_TURN_URL: 'turn:turn.discrete.example:3478',
    SYLORA_TURN_USERNAME: 'turn-user',
    SYLORA_TURN_CREDENTIAL: 'turn-credential'
  });
  assert.equal(ice.stunConfigured, true);
  assert.equal(ice.turnConfigured, true);
  assert.equal(hasTurnServer(ice.iceServers), true);
  assert.ok(ice.iceServers.some(server => JSON.stringify(server).includes('turn.discrete.example')));
  const ready = webrtcReadiness({ iceServers: ice.iceServers, nodeEnv: 'production' });
  assert.equal(ready.status, 'ok');
});

test('missing TURN is degraded in development and NOT_READY in production', () => {
  const ice = resolveIceConfig({ SYLORA_STUN_URLS: 'stun:stun.example:3478' });
  assert.equal(webrtcReadiness({ iceServers: ice.iceServers, nodeEnv: 'development' }).status, 'DEGRADED');
  assert.equal(webrtcReadiness({ iceServers: ice.iceServers, nodeEnv: 'production' }).status, 'NOT_READY');
});
