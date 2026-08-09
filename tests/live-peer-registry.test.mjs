import test from 'node:test';
import assert from 'node:assert/strict';
import { LivePeerRegistry } from '../src/live-peer-registry.mjs';

class FakeRedisLeases {
  constructor(shared=new Map()){this.configured=true;this.shared=shared}
  async claimLease(key,owner){const current=this.shared.get(key);if(!current||current===owner)this.shared.set(key,owner);return this.shared.get(key)}
  async leaseOwner(key){return this.shared.get(key)||null}
  async releaseLease(key,owner){if(this.shared.get(key)!==owner)return false;this.shared.delete(key);return true}
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

test('peer registry namespaces keep conference and LIVE leases separate',async()=>{
  const shared=new Map(),redis=new FakeRedisLeases(shared),live=new LivePeerRegistry(redis),conference=new LivePeerRegistry(redis,'conference');
  assert.equal(await live.claim('same-room','same-peer','live-user'),true);
  assert.equal(await conference.claim('same-room','same-peer','conference-user'),true);
  assert.equal(await live.owner('same-room','same-peer'),'live-user');
  assert.equal(await conference.owner('same-room','same-peer'),'conference-user');
});
