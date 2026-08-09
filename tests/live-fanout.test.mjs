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
