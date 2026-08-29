import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompanionServer } from '../src/companion.mjs';
import { normalizeCompanionUrl, SyloraCompanionClient } from '../public/companion-client.js';

class FakeObsClient {
  constructor(options){this.options=options;this.connected=false;this.calls=[];FakeObsClient.last=this}
  async connect(){this.connected=true}
  async capabilities(){return{obsVersion:'31.0',scenes:[{sceneName:'Main'}],currentProgramSceneName:'Main',virtualCamera:{available:true,active:false},stream:{available:true,active:false}}}
  async setProgramScene(name){this.calls.push(['scene',name])}
  async startVirtualCamera(){this.calls.push(['virtual','start'])}
  async stopVirtualCamera(){this.calls.push(['virtual','stop'])}
  async startStream(){this.calls.push(['stream','start'])}
  async stopStream(){this.calls.push(['stream','stop'])}
  disconnect(){this.connected=false}
}

class FakeTikTokBridge {
  constructor(){this.connected=false;this.events=[];this.cursor=0;FakeTikTokBridge.last=this}
  snapshot(){return{state:this.connected?'connected':'disconnected',connected:this.connected,cursor:this.cursor}}
  async connect(url){this.connected=true;this.url=url;return this.snapshot()}
  disconnect(){this.connected=false;return this.snapshot()}
  eventsAfter(after=0){return{events:this.events.filter(x=>x.cursor>Number(after)),cursor:this.cursor,status:this.snapshot()}}
  simulate(input){const event={...input,type:input.type||input.event||'chat',cursor:++this.cursor};this.events.push(event);return event}
  close(){this.connected=false}
}

test('companion URL is restricted to loopback HTTP',()=>{
  assert.equal(normalizeCompanionUrl('http://127.0.0.1:43179'),'http://127.0.0.1:43179');
  assert.throws(()=>normalizeCompanionUrl('https://127.0.0.1:43179'),/COMPANION_URL_PROTOCOL/);
  assert.throws(()=>normalizeCompanionUrl('http://example.com:43179'),/COMPANION_LOCALHOST_ONLY/);
});

test('companion client preserves the browser fetch receiver',async()=>{
  let receiver=null;
  const fetchImpl=function(){receiver=this;return Promise.resolve(new Response(JSON.stringify({service:'sylora-companion'}),{status:200,headers:{'content-type':'application/json'}}))};
  const client=new SyloraCompanionClient({url:'http://127.0.0.1:43179',fetchImpl});
  assert.equal((await client.health()).service,'sylora-companion');
  assert.equal(receiver,globalThis);
});

test('companion requires pairing, origin allowlist and bounded OBS actions',async()=>{
  const token='12345678901234567890123456789012',companion=createCompanionServer({token,allowedOrigins:['https://sylora.example'],ObsClient:FakeObsClient,TikTokBridge:FakeTikTokBridge,allowSimulation:true});
  const address=await companion.listen(0),base=`http://127.0.0.1:${address.port}`;
  try{
    const denied=await fetch(`${base}/v1/obs/action`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
    assert.equal(denied.status,401);
    const badOrigin=await fetch(`${base}/v1/health`,{headers:{origin:'https://evil.example'}});
    assert.equal(badOrigin.status,403);
    const fetchImpl=(url,options={})=>fetch(url,{...options,headers:{...(options.headers||{}),origin:'https://sylora.example'}});
    const client=new SyloraCompanionClient({url:base,token,fetchImpl});
    const health=await client.health();assert.equal(health.service,'sylora-companion');assert.equal(health.version,3);assert.equal(health.simulationEnabled,true);assert.equal(health.relay.connected,false);
    const connected=await client.connectObs({url:'ws://127.0.0.1:4455',password:'local-only'});
    assert.equal(connected.connected,true);
    assert.equal(FakeObsClient.last.options.password,'local-only');
    await client.obsAction('startStream');
    assert.deepEqual(FakeObsClient.last.calls,[['stream','start']]);
    await assert.rejects(()=>client.obsAction('deleteEverything'),/ACTION_NOT_ALLOWED/);
    assert.equal((await client.connectTikTok()).tiktok.connected,true);
    await client.simulateTikTok({event:'gift',id:'gift-owner-pilot'});
    const events=await client.tiktokEvents(0);
    assert.equal(events.events.length,1);assert.equal(events.events[0].type,'gift');assert.equal(events.tiktok.connected,true);
    assert.equal((await client.disconnectTikTok()).tiktok.connected,false);
  }finally{await companion.close()}
});
