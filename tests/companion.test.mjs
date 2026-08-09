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

test('companion URL is restricted to loopback HTTP',()=>{
  assert.equal(normalizeCompanionUrl('http://127.0.0.1:43179'),'http://127.0.0.1:43179');
  assert.throws(()=>normalizeCompanionUrl('https://127.0.0.1:43179'),/COMPANION_URL_PROTOCOL/);
  assert.throws(()=>normalizeCompanionUrl('http://example.com:43179'),/COMPANION_LOCALHOST_ONLY/);
});

test('companion requires pairing, origin allowlist and bounded OBS actions',async()=>{
  const token='12345678901234567890123456789012',companion=createCompanionServer({token,allowedOrigins:['https://sylora.example'],ObsClient:FakeObsClient});
  const address=await companion.listen(0),base=`http://127.0.0.1:${address.port}`;
  try{
    const denied=await fetch(`${base}/v1/obs/action`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
    assert.equal(denied.status,401);
    const badOrigin=await fetch(`${base}/v1/health`,{headers:{origin:'https://evil.example'}});
    assert.equal(badOrigin.status,403);
    const fetchImpl=(url,options={})=>fetch(url,{...options,headers:{...(options.headers||{}),origin:'https://sylora.example'}});
    const client=new SyloraCompanionClient({url:base,token,fetchImpl});
    assert.equal((await client.health()).service,'sylora-companion');
    const connected=await client.connectObs({url:'ws://127.0.0.1:4455',password:'local-only'});
    assert.equal(connected.connected,true);
    assert.equal(FakeObsClient.last.options.password,'local-only');
    await client.obsAction('startStream');
    assert.deepEqual(FakeObsClient.last.calls,[['stream','start']]);
    await assert.rejects(()=>client.obsAction('deleteEverything'),/ACTION_NOT_ALLOWED/);
  }finally{await companion.close()}
});
