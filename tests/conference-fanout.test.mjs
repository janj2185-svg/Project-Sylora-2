import test from 'node:test';
import assert from 'node:assert/strict';
import { ConferenceFanout } from '../src/conference-fanout.mjs';

class FakeRedis{
  constructor(){this.configured=true;this.handlers=new Set()}
  async subscribe(_channel,handler){this.handlers.add(handler);return async()=>this.handlers.delete(handler)}
  async publish(_channel,payload){for(const handler of this.handlers)handler(payload)}
}

test('conference signaling fanout crosses instances without source echo duplication',async()=>{
  const redis=new FakeRedis(),aEvents=[],bEvents=[],a=new ConferenceFanout({redis,instanceId:'a',dispatch:(...x)=>aEvents.push(x)}),b=new ConferenceFanout({redis,instanceId:'b',dispatch:(...x)=>bEvents.push(x)});
  await a.start();await b.start();a.emit('room-1','signal',{kind:'peer-join',fromPeerId:'p1'});await new Promise(r=>setTimeout(r,0));
  assert.equal(aEvents.length,1);assert.equal(bEvents.length,1);assert.equal(bEvents[0][0],'room-1');assert.equal(bEvents[0][2].kind,'peer-join');await a.close();await b.close();
});
