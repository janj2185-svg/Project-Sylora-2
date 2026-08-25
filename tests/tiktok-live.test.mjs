import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTikFinityUrl, normalizeTikTokLiveEvent, TikFinityBridge } from '../src/tiktok-live.mjs';

test('TikFinity URL accepts only credential-free loopback WebSocket endpoints',()=>{
  assert.equal(normalizeTikFinityUrl('ws://127.0.0.1'),'ws://127.0.0.1:21213/');
  assert.equal(normalizeTikFinityUrl('ws://localhost:21213'),'ws://localhost:21213/');
  assert.throws(()=>normalizeTikFinityUrl('wss://localhost:21213'),/TIKTOK_BRIDGE_PROTOCOL/);
  assert.throws(()=>normalizeTikFinityUrl('ws://example.com:21213'),/TIKTOK_BRIDGE_LOOPBACK_ONLY/);
  assert.throws(()=>normalizeTikFinityUrl('ws://user:pass@127.0.0.1:21213'),/TIKTOK_BRIDGE_CREDENTIALS_FORBIDDEN/);
});

test('TikTok LIVE events are normalized and bounded',()=>{
  const chat=normalizeTikTokLiveEvent({event:'chat',data:{msgId:'m1',uniqueId:'viewer',nickname:'Viewer',comment:'hello',createTime:1_700_000_000}});
  assert.deepEqual(chat,{id:'m1',type:'chat',occurredAt:'2023-11-14T22:13:20.000Z',user:{id:'viewer',username:'viewer',displayName:'Viewer'},source:'tikfinity-local',text:'hello'});
  const gift=normalizeTikTokLiveEvent({event:'gift',data:{uniqueId:'fan',giftId:'rose',giftName:'Rose',repeatCount:99_999,diamondCount:20}});
  assert.equal(gift.type,'gift');assert.equal(gift.gift.count,10_000);assert.equal(gift.gift.diamonds,20);
  assert.equal(normalizeTikTokLiveEvent({event:'unknown'}),null);
});

test('host, viewer-count and stream-end signals remain distinct',()=>{
  assert.equal(normalizeTikTokLiveEvent({event:'linkMicBattle',status:'accepted'}).type,'guest');
  assert.equal(normalizeTikTokLiveEvent({event:'roomUserCount',viewerCount:42}).viewerCount,42);
  assert.equal(normalizeTikTokLiveEvent({event:'streamEnd'}).type,'stream_end');
});

test('TikFinity bridge simulation deduplicates and provides cursor paging',()=>{
  const bridge=new TikFinityBridge({maxEvents:20});
  const first=bridge.simulate({event:'chat',id:'same',uniqueId:'viewer',comment:'hello'});
  const duplicate=bridge.simulate({event:'chat',id:'same',uniqueId:'viewer',comment:'hello'});
  bridge.simulate({event:'gift',id:'gift-1',uniqueId:'fan',giftName:'Rose'});
  assert.equal(first.cursor,1);assert.equal(duplicate.cursor,1);
  const page=bridge.eventsAfter(1);
  assert.equal(page.events.length,1);assert.equal(page.events[0].type,'gift');assert.equal(page.cursor,2);
  assert.equal(bridge.disconnect().connected,false);
});

test('reconnecting ignores a stale close event from the replaced socket',async()=>{
  class FakeSocket{
    static instances=[];
    constructor(){this.listeners=new Map();FakeSocket.instances.push(this)}
    addEventListener(name,handler){this.listeners.set(name,handler)}
    emit(name,value={}){this.listeners.get(name)?.(value)}
    close(){queueMicrotask(()=>this.emit('close'))}
  }
  const bridge=new TikFinityBridge({WebSocketImpl:FakeSocket,connectTimeoutMs:100});
  const firstConnect=bridge.connect();FakeSocket.instances[0].emit('open');await firstConnect;
  const secondConnect=bridge.connect();FakeSocket.instances[1].emit('open');await secondConnect;await new Promise(resolve=>setImmediate(resolve));
  assert.equal(bridge.snapshot().connected,true);assert.equal(bridge.snapshot().state,'connected');bridge.disconnect();
});
