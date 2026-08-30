import test from 'node:test';
import assert from 'node:assert/strict';
import { LiveHostSessionRegistry, LivePeerRegistry } from '../src/live-peer-registry.mjs';

class FakeRedisLeases {
  constructor(shared=new Map()){this.configured=true;this.shared=shared}
  async claimLease(key,owner){const current=this.shared.get(key);if(!current||current===owner)this.shared.set(key,owner);return this.shared.get(key)}
  async leaseOwner(key){return this.shared.get(key)||null}
  async releaseLease(key,owner){if(this.shared.get(key)!==owner)return false;this.shared.delete(key);return true}
}

class FakeRedisHostSessions {
  constructor(shared=new Map()){this.configured=true;this.shared=shared}
  async acquireHostStream({peerKey,activeKey,streamKey,closedKey,userId,peerId,streamId}){if(this.shared.has(closedKey))return false;const peer=this.shared.get(peerKey),active=this.shared.get(activeKey),stream=this.shared.get(streamKey);if(peer&&peer!==userId||active&&active!==peerId||stream&&stream!==streamId)return false;this.shared.set(peerKey,userId);this.shared.set(activeKey,peerId);this.shared.set(streamKey,streamId);return true}
  async renewHostStream(input){const{peerKey,activeKey,streamKey,closedKey,userId,peerId,streamId}=input;if(this.shared.has(closedKey)||this.shared.get(peerKey)!==userId||this.shared.get(activeKey)!==peerId||this.shared.get(streamKey)!==streamId)return false;return true}
  async releaseHostStream({peerKey,activeKey,streamKey,userId,peerId,streamId}){if(this.shared.get(peerKey)!==userId||this.shared.get(activeKey)!==peerId||this.shared.get(streamKey)!==streamId)return false;this.shared.delete(streamKey);this.shared.delete(peerKey);this.shared.delete(activeKey);return true}
  async leaseOwner(key){return this.shared.get(key)||null}
}

test('LIVE peer ownership is shared across instances and cannot be stolen',async()=>{
  const shared=new Map(),a=new LivePeerRegistry(new FakeRedisLeases(shared)),b=new LivePeerRegistry(new FakeRedisLeases(shared));
  assert.equal(await a.claim('live-1','peer-1','user-a'),true);
  assert.equal(await b.owner('live-1','peer-1'),'user-a');
  assert.equal(await b.claim('live-1','peer-1','user-b'),false);
  assert.equal(await b.release('live-1','peer-1','user-b'),false);
  assert.equal(await a.release('live-1','peer-1','user-a'),true);
  assert.equal(await b.owner('live-1','peer-1'),null);
});

test('LIVE peer registry keeps a safe local fallback without Redis',async()=>{
  const registry=new LivePeerRegistry({configured:false});
  assert.equal(await registry.claim('live-local','peer-local','user-a'),true);
  assert.equal(await registry.claim('live-local','peer-local','user-b'),false);
  assert.equal(await registry.owner('live-local','peer-local'),'user-a');
  registry.clearLocalRoom('live-local');
  assert.equal(await registry.owner('live-local','peer-local'),null);
});

test('local LIVE host and viewer roles share one typed peer lease namespace',async()=>{
  const viewers=new LivePeerRegistry({configured:false},'live',90_000,()=>Date.now(),'viewer'),hosts=new LiveHostSessionRegistry({configured:false},90_000,5_000,()=>Date.now(),viewers);
  assert.equal(await hosts.acquireStream('live-shared','shared-peer','same-user','stream-a'),true);
  assert.equal(await viewers.claim('live-shared','shared-peer','same-user'),false);
  assert.equal(await viewers.claim('live-shared','shared-peer','viewer-user'),false);
  assert.equal(await viewers.release('live-shared','shared-peer','same-user'),false);
  assert.equal(await hosts.renewStream('live-shared','shared-peer','same-user','stream-a'),true);
  assert.equal(await hosts.releaseStream('live-shared','shared-peer','same-user','stream-a'),true);
  assert.equal(await viewers.claim('live-shared','shared-peer','same-user'),true);
  assert.equal(await viewers.claim('live-shared','shared-peer','same-user'),true,'same viewer may renew its own lease');
  assert.equal(await hosts.acquireStream('live-shared','shared-peer','same-user','stream-b'),false);
  assert.equal(await hosts.acquireStream('live-shared','shared-peer','host-user','stream-b'),false);
  assert.equal(await hosts.releaseStream('live-shared','shared-peer','same-user','stream-b'),false);
  assert.equal(await viewers.owner('live-shared','shared-peer'),'same-user');
});

test('peer registry namespaces keep conference and LIVE leases separate',async()=>{
  const shared=new Map(),redis=new FakeRedisLeases(shared),live=new LivePeerRegistry(redis),conference=new LivePeerRegistry(redis,'conference');
  assert.equal(await live.claim('same-room','same-peer','live-user'),true);
  assert.equal(await conference.claim('same-room','same-peer','conference-user'),true);
  assert.equal(await live.owner('same-room','same-peer'),'live-user');
  assert.equal(await conference.owner('same-room','same-peer'),'conference-user');
});

test('active signaling heartbeat renews a short peer lease',async()=>{
  let now=0;const registry=new LivePeerRegistry({configured:false},'live',10_000,()=>now);
  assert.equal(await registry.claim('live-heartbeat','peer-heartbeat','user-a'),true);
  now=9_000;assert.equal(await registry.claim('live-heartbeat','peer-heartbeat','user-a'),true);
  now=15_000;assert.equal(await registry.owner('live-heartbeat','peer-heartbeat'),'user-a');
  now=19_001;assert.equal(await registry.owner('live-heartbeat','peer-heartbeat'),null);
});

test('host stream fence rejects a duplicate same-peer connection across instances',async()=>{
  const shared=new Map(),a=new LiveHostSessionRegistry(new FakeRedisHostSessions(shared)),b=new LiveHostSessionRegistry(new FakeRedisHostSessions(shared));
  assert.equal(await a.acquireStream('live-fenced','host-peer','host-user','stream-a'),true);
  assert.equal(await b.acquireStream('live-fenced','host-peer','host-user','stream-b'),false);
  assert.equal(await b.acquireStream('live-fenced','other-host','host-user','stream-c'),false);
  assert.equal(await b.renewStream('live-fenced','host-peer','host-user','stream-b'),false);
  assert.equal(await b.releaseStream('live-fenced','host-peer','host-user','stream-b'),false);
  assert.equal(await a.releaseStream('live-fenced','host-peer','host-user','stream-a'),true);
  assert.equal(await b.acquireStream('live-fenced','host-peer','host-user','stream-b'),true);
  assert.equal(await a.renewStream('live-fenced','host-peer','host-user','stream-a'),false);
  assert.equal(await a.releaseStream('live-fenced','host-peer','host-user','stream-a'),false);
  assert.equal(await b.owner('live-fenced'),'host-peer');
});

test('host stream renewal and cleanup are fenced by the exact connection token',async()=>{
  let now=0;const registry=new LiveHostSessionRegistry({configured:false},10_000,2_000,()=>now);
  assert.equal(await registry.acquireStream('live-renew','host-peer','host-user','stream-a'),true);
  assert.equal(await registry.acquireStream('live-renew','host-peer','host-user','stream-b'),false);
  now=9_000;assert.equal(await registry.renewStream('live-renew','host-peer','host-user','stream-a'),true);
  now=18_999;assert.equal(await registry.owner('live-renew'),'host-peer');
  now=19_001;assert.equal(await registry.acquireStream('live-renew','host-peer','host-user','stream-b'),true);
  assert.equal(await registry.renewStream('live-renew','host-peer','host-user','stream-a'),false);
  assert.equal(await registry.releaseStream('live-renew','host-peer','host-user','stream-a'),false);
  assert.equal(await registry.owner('live-renew'),'host-peer');
  assert.equal(await registry.releaseStream('live-renew','host-peer','host-user','stream-b'),true);
  assert.equal(await registry.owner('live-renew'),null);
});

test('host session release tombstones stale heartbeat renewal atomically',async()=>{
  let now=0;const registry=new LiveHostSessionRegistry({configured:false},10_000,2_000,()=>now);
  assert.equal(await registry.acquireStream('live-host','host-peer','host-user','stream-a'),true);
  assert.equal(await registry.owner('live-host'),'host-peer');
  assert.equal(await registry.release('live-host','host-peer','host-user'),true);
  assert.equal(await registry.owner('live-host'),null);
  assert.equal(await registry.renewStream('live-host','host-peer','host-user','stream-a'),false);
  assert.equal(await registry.acquireStream('live-host','host-peer','host-user','stream-a'),false);
  assert.equal(await registry.acquireStream('live-host','new-host-peer','host-user','stream-b'),true);
  assert.equal(await registry.release('live-host','new-host-peer','host-user'),true);now=2_001;
  assert.equal(await registry.acquireStream('live-host','host-peer','host-user','stream-c'),true);
});
