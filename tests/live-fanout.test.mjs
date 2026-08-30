import test from 'node:test';
import assert from 'node:assert/strict';
import { LiveFanout } from '../src/live-fanout.mjs';

class FakeRedisBus {
  constructor(bus){this.bus=bus;this.configured=true}
  async subscribe(channel,handler){if(!this.bus.has(channel))this.bus.set(channel,new Set());this.bus.get(channel).add(handler);return async()=>this.bus.get(channel)?.delete(handler)}
  async publish(channel,payload){for(const handler of this.bus.get(channel)||[])handler(payload);return 1}
}

test('LIVE fanout delivers locally once and crosses instances without echo duplication',async()=>{
  const bus=new Map(),receivedA=[],receivedB=[];
  const a=new LiveFanout({redis:new FakeRedisBus(bus),instanceId:'a',dispatch:(liveId,type,event)=>receivedA.push({liveId,type,event})});
  const b=new LiveFanout({redis:new FakeRedisBus(bus),instanceId:'b',dispatch:(liveId,type,event)=>receivedB.push({liveId,type,event})});
  await a.start();await b.start();
  a.emit('live-1','chat',{text:'hello'});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(receivedA.length,1);
  assert.equal(receivedB.length,1);
  assert.deepEqual(receivedB[0],{liveId:'live-1',type:'chat',event:{text:'hello'}});
  await a.close();await b.close();
});

test('LIVE fanout keeps local delivery when Redis is not configured',async()=>{
  const received=[],fanout=new LiveFanout({redis:{configured:false},instanceId:'solo',dispatch:(liveId,type,event)=>received.push({liveId,type,event})});
  assert.equal(await fanout.start(),false);
  fanout.emit('live-local','gift',{id:'g1'});
  assert.equal(received.length,1);
});

test('reliable private signal fanout reaches the target peer across instances',async()=>{
  const bus=new Map(),receivedA=[],receivedB=[];
  const targetDispatch=received=>(liveId,type,event)=>{if(type!=='signal'||event.toPeerId!=='viewer-b')return false;received.push({liveId,event});return true};
  const a=new LiveFanout({redis:new FakeRedisBus(bus),instanceId:'a',dispatch:()=>false}),b=new LiveFanout({redis:new FakeRedisBus(bus),instanceId:'b',dispatch:targetDispatch(receivedB)});
  await a.start();await b.start();await a.emitReliable('live-private','signal',{kind:'offer',fromPeerId:'host-a',toPeerId:'viewer-b',data:{type:'offer',sdp:'v=0'}});
  await new Promise(resolve=>setTimeout(resolve,0));assert.equal(receivedA.length,0);assert.equal(receivedB.length,1);assert.equal(receivedB[0].event.toPeerId,'viewer-b');
  await a.close();await b.close();
});

test('reliable signal fanout fails closed when configured Redis is unavailable',async()=>{
  const fanout=new LiveFanout({redis:{configured:true},dispatch:()=>assert.fail('must not dispatch local split-brain signal')});
  await assert.rejects(()=>fanout.emitReliable('live-1','signal',{toPeerId:'viewer-1'}),/LIVE_FANOUT_UNAVAILABLE/);
});

test('reliable fanout recovers an initial subscriber failure before acknowledging',async()=>{
  const bus=new Map(),redis=new FakeRedisBus(bus),original=redis.subscribe.bind(redis);let attempts=0;
  redis.subscribe=async(...args)=>{attempts++;if(attempts===1)throw new Error('SUBSCRIBER_DOWN');return original(...args)};
  const received=[],fanout=new LiveFanout({redis,dispatch:(liveId,type,event)=>received.push({liveId,type,event})});
  assert.equal(await fanout.start(),false);await fanout.emitReliable('live-retry','signal',{toPeerId:'viewer-retry'});
  assert.equal(attempts,2);assert.equal(received.length,1);await fanout.close();
});

test('reliable fanout fails readiness while its subscriber is unhealthy',async()=>{
  let ready=true,statusHandler=null;const redis={configured:true,async subscribe(_channel,_handler,onStatus){statusHandler=onStatus;const stop=async()=>{};stop.isReady=()=>ready;return stop},async publish(){return 1}};
  const fanout=new LiveFanout({redis,dispatch:()=>true});await fanout.start();assert.deepEqual(fanout.status(),{configured:true,ready:true});
  ready=false;statusHandler(false);assert.deepEqual(fanout.status(),{configured:true,ready:false});await assert.rejects(()=>fanout.emitReliable('live-down','signal',{toPeerId:'viewer'}),/LIVE_FANOUT_UNAVAILABLE/);
  ready=true;statusHandler(true);await fanout.emitReliable('live-up','signal',{toPeerId:'viewer'});await fanout.close();
});

test('reliable private signal rejects when no instance owns the target peer',async()=>{
  const bus=new Map(),a=new LiveFanout({redis:new FakeRedisBus(bus),instanceId:'a',ackTimeoutMs:100,dispatch:()=>false}),b=new LiveFanout({redis:new FakeRedisBus(bus),instanceId:'b',ackTimeoutMs:100,dispatch:()=>false});
  await a.start();await b.start();const started=Date.now();
  await assert.rejects(()=>a.emitReliable('live-private','signal',{kind:'offer',fromPeerId:'host-a',toPeerId:'missing-viewer',data:{type:'offer',sdp:'v=0'}}),/LIVE_SIGNAL_TARGET_UNAVAILABLE/);
  assert.ok(Date.now()-started<500);await a.close();await b.close();
});

test('reliable fanout bounds an initially hung subscriber instead of hanging signaling',async()=>{
  const fanout=new LiveFanout({redis:{configured:true,subscribe:()=>new Promise(()=>{})},subscribeTimeoutMs:40,dispatch:()=>assert.fail('must fail closed')});
  const started=Date.now();await assert.rejects(()=>fanout.emitReliable('live-hung','signal',{toPeerId:'viewer'}),/LIVE_FANOUT_UNAVAILABLE/);assert.ok(Date.now()-started<500);await fanout.close();
});

test('reliable fanout bounds a hung Redis publish instead of hanging signaling',async()=>{
  const stop=async()=>{};stop.isReady=()=>true;const redis={configured:true,async subscribe(){return stop},publish:()=>new Promise(()=>{})};
  const fanout=new LiveFanout({redis,publishTimeoutMs:100,dispatch:()=>assert.fail('must not dispatch before publish is acknowledged')});await fanout.start();const started=Date.now();
  await assert.rejects(()=>fanout.emitReliable('live-hung-publish','signal',{toPeerId:'viewer'}),/LIVE_FANOUT_PUBLISH_TIMEOUT/);assert.ok(Date.now()-started<500);await fanout.close();
});

test('reliable fanout bounds an unhealthy subscriber stop before reconnecting',async()=>{
  let ready=true,statusHandler,attempts=0;const redis={configured:true,async subscribe(_channel,_handler,onStatus){attempts++;statusHandler=onStatus;const stop=attempts===1?()=>new Promise(()=>{}):async()=>{};stop.isReady=()=>ready;return stop},async publish(){return 1}};
  const fanout=new LiveFanout({redis,subscribeTimeoutMs:40,dispatch:()=>{}});await fanout.start();ready=false;statusHandler(false);const started=Date.now();await assert.rejects(()=>fanout.emitReliable('live-reconnect','signal',{toPeerId:'viewer'}),/LIVE_FANOUT_UNAVAILABLE/);assert.ok(Date.now()-started<500);assert.equal(attempts,2);await fanout.close();
});
