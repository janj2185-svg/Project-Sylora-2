import test from 'node:test';
import assert from 'node:assert/strict';
import { hasTurnServer, parseIceServers } from '../src/rtc-config.mjs';

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
