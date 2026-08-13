import test from 'node:test';
import assert from 'node:assert/strict';
import { hasTurnServer, parseIceServers, buildIceServersFromEnv } from '../src/rtc-config.mjs';

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
  assert.equal(hasTurnServer([]), false);
});
