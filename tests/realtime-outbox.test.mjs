import test from 'node:test';
import assert from 'node:assert/strict';
import { RealtimeOutbox } from '../src/realtime-outbox.mjs';
import { RealtimeFanout } from '../src/realtime-fanout.mjs';

class FakeRedisBus{
  constructor(bus,{failPublish=false}={}){this.bus=bus;this.configured=true;this.failPublish=failPublish}
  async subscribe(channel,handler){if(!this.bus.has(channel))this.bus.set(channel,new Set());this.bus.get(channel).add(handler);return async()=>this.bus.get(channel)?.delete(handler)}
  async publish(channel,payload){if(this.failPublish)throw new Error('REDIS_DOWN');for(const handler of this.bus.get(channel)||[])handler(payload);return 1}
}

test('durable realtime fanout publishes across instances and dispatches source once',async()=>{
  const bus=new Map(),aEvents=[],bEvents=[];
  const a=new RealtimeFanout({redis:new FakeRedisBus(bus),instanceId:'a',dispatch:(type,event)=>aEvents.push({type,event})});
  const b=new RealtimeFanout({redis:new FakeRedisBus(bus),instanceId:'b',dispatch:(type,event)=>bEvents.push({type,event})});
  await a.start();await b.start();
  await a.emitDurable('gift.sent',{id:'gift-1'});
  assert.deepEqual(aEvents,[{type:'gift.sent',event:{id:'gift-1'}}]);
  assert.deepEqual(bEvents,[{type:'gift.sent',event:{id:'gift-1'}}]);
  await a.close();await b.close();
});

test('durable realtime fanout does not acknowledge when Redis publish fails',async()=>{
  const local=[],fanout=new RealtimeFanout({redis:new FakeRedisBus(new Map(),{failPublish:true}),dispatch:(type,event)=>local.push({type,event})});
  await fanout.start();
  await assert.rejects(()=>fanout.emitDurable('gift.sent',{id:'gift-2'}),/REDIS_DOWN/);
  assert.equal(local.length,0);
  await fanout.close();
});

test('outbox releases failed deliveries and marks successful retries published',async()=>{
  const event={id:'outbox-1',topic:'gift',eventType:'gift.sent',payload:{id:'gift-3'},attempts:1};let available=true,marked=0,released=0,tries=0;
  const repository={enabled:true,async claimBatch(){if(!available)return{claimToken:'claim-1',events:[]};available=false;return{claimToken:'claim-1',events:[event]}},async markPublished(){marked++;return true},async releaseClaim(){released++;available=true;return true}};
  const outbox=new RealtimeOutbox({repository,dispatch:async()=>{tries++;if(tries===1)throw new Error('temporary')}});
  assert.equal(await outbox.flush(),0);assert.equal(released,1);assert.equal(marked,0);
  assert.equal(await outbox.flush(),1);assert.equal(marked,1);assert.equal(tries,2);
});
