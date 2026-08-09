import test from 'node:test';
import assert from 'node:assert/strict';
import { buildObsAuthentication, normalizeObsUrl, ObsWebSocketClient } from '../public/obs-client.js';

test('OBS WebSocket 5.x authentication follows challenge/salt SHA-256 flow',async()=>{
  const auth=await buildObsAuthentication('secret','salt-value','challenge-value');
  assert.equal(auth,'h94szluIAg3BtKWoFpFowzEXXbx6fl8PlYxdM/LvrEA=');
});

test('OBS endpoint is intentionally limited to the local OBS instance',()=>{
  assert.match(normalizeObsUrl('ws://127.0.0.1:4455'),/^ws:\/\/127\.0\.0\.1:4455\/?$/);
  assert.match(normalizeObsUrl('wss://localhost:4455'),/^wss:\/\/localhost:4455\/?$/);
  assert.throws(()=>normalizeObsUrl('https://localhost:4455'),/OBS_URL_PROTOCOL/);
  assert.throws(()=>normalizeObsUrl('ws://example.com:4455'),/OBS_LOCALHOST_ONLY/);
});

test('OBS client distinguishes an unexpected disconnect from an intentional close',async()=>{
  class FakeWebSocket{
    static last=null;
    constructor(){FakeWebSocket.last=this}
    send(raw){const packet=JSON.parse(raw);if(packet.op===1)queueMicrotask(()=>this.onmessage?.({data:JSON.stringify({op:2,d:{negotiatedRpcVersion:1}})}))}
    close(){queueMicrotask(()=>this.onclose?.())}
    hello(){this.onmessage?.({data:JSON.stringify({op:0,d:{obsWebSocketVersion:'5.x',rpcVersion:1}})})}
    drop(){this.onclose?.()}
  }
  let disconnects=0;
  const client=new ObsWebSocketClient({WebSocketImpl:FakeWebSocket,onDisconnect:()=>disconnects++});
  const connected=client.connect();FakeWebSocket.last.hello();await connected;
  FakeWebSocket.last.drop();await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(disconnects,1);
  const manual=new ObsWebSocketClient({WebSocketImpl:FakeWebSocket,onDisconnect:()=>disconnects++});
  const manualConnected=manual.connect();FakeWebSocket.last.hello();await manualConnected;manual.disconnect();await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(disconnects,1);
});

test('OBS broadcast controls use official WebSocket stream requests',async()=>{
  const client=new ObsWebSocketClient();
  const calls=[];
  client.request=async type=>{calls.push(type);return{}};
  await client.startStream();
  await client.stopStream();
  assert.deepEqual(calls,['StartStream','StopStream']);
});
