import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ObsWebSocketClient } from '../public/obs-client.js';
import { TikFinityBridge } from './tiktok-live.mjs';
import { TikTokRelayUplink } from './tiktok-relay-uplink.mjs';

const LOOPBACK_HOST='127.0.0.1';
const DEFAULT_PORT=43179;
const MAX_BODY_BYTES=16*1024;
const DEFAULT_ORIGINS=new Set(['http://localhost:8787','http://127.0.0.1:8787']);
const ACTIONS=new Set(['capabilities','setScene','startVirtualCamera','stopVirtualCamera','startStream','stopStream']);

function safeEqual(a,b){const left=Buffer.from(String(a||'')),right=Buffer.from(String(b||''));return left.length===right.length&&crypto.timingSafeEqual(left,right)}
function json(res,status,data,headers={}){const body=JSON.stringify(data);res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(body),'cache-control':'no-store',...headers});res.end(body)}
function corsHeaders(origin,allowed){return origin&&allowed.has(origin)?{'access-control-allow-origin':origin,'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'authorization, content-type','access-control-max-age':'600','vary':'Origin'}:{}}
async function readJson(req){let size=0,text='';for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY_BYTES){req.destroy();throw new Error('BODY_TOO_LARGE')}text+=chunk}if(!text)return{};try{return JSON.parse(text)}catch{throw new Error('INVALID_JSON')}}

export function createCompanionServer({token=crypto.randomBytes(24).toString('base64url'),allowedOrigins=[...DEFAULT_ORIGINS],ObsClient=ObsWebSocketClient,TikTokBridge=TikFinityBridge,RelayUplink=TikTokRelayUplink,allowSimulation=process.env.NODE_ENV!=='production'}={}){
  if(String(token).length<24)throw new Error('PAIRING_TOKEN_TOO_SHORT');
  const origins=new Set(allowedOrigins.map(String));
  let obs=null;
  const tiktok=new TikTokBridge();
  const relay=new RelayUplink({eventsAfter:(after,limit)=>tiktok.eventsAfter(after,limit)});
  const server=http.createServer(async(req,res)=>{
    const origin=req.headers.origin||'',cors=corsHeaders(origin,origins);
    if(origin&&!origins.has(origin))return json(res,403,{error:'ORIGIN_NOT_ALLOWED'});
    if(req.method==='OPTIONS'){res.writeHead(204,cors);return res.end()}
    const url=new URL(req.url||'/',`http://${LOOPBACK_HOST}`);
    if(req.method==='GET'&&url.pathname==='/v1/health')return json(res,200,{service:'sylora-companion',version:3,obsConnected:!!obs?.connected,tiktok:tiktok.snapshot(),relay:relay.snapshot(),simulationEnabled:!!allowSimulation},cors);
    const auth=String(req.headers.authorization||''),supplied=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!safeEqual(supplied,token))return json(res,401,{error:'PAIRING_REQUIRED'},cors);
    try{
      if(req.method==='POST'&&url.pathname==='/v1/obs/connect'){
        const input=await readJson(req);obs?.disconnect();obs=new ObsClient({url:input.url,password:String(input.password||'')});await obs.connect();const capabilities=await obs.capabilities();return json(res,200,{connected:true,capabilities},cors);
      }
      if(req.method==='POST'&&url.pathname==='/v1/obs/disconnect'){obs?.disconnect();obs=null;return json(res,200,{connected:false},cors)}
      if(req.method==='POST'&&url.pathname==='/v1/obs/action'){
        if(!obs?.connected)return json(res,409,{error:'OBS_NOT_CONNECTED'},cors);
        const input=await readJson(req),action=String(input.action||'');if(!ACTIONS.has(action))return json(res,400,{error:'ACTION_NOT_ALLOWED'},cors);
        let result;if(action==='capabilities')result=await obs.capabilities();else if(action==='setScene'){const sceneName=String(input.sceneName||'').trim().slice(0,120);if(!sceneName)return json(res,400,{error:'SCENE_NAME_REQUIRED'},cors);result=await obs.setProgramScene(sceneName)}else if(action==='startVirtualCamera')result=await obs.startVirtualCamera();else if(action==='stopVirtualCamera')result=await obs.stopVirtualCamera();else if(action==='startStream')result=await obs.startStream();else if(action==='stopStream')result=await obs.stopStream();return json(res,200,{ok:true,result:result||{}},cors);
      }
      if(req.method==='POST'&&url.pathname==='/v1/tiktok/connect'){const input=await readJson(req);return json(res,200,{tiktok:await tiktok.connect(input.url)},cors)}
      if(req.method==='POST'&&url.pathname==='/v1/tiktok/disconnect'){relay.disconnect();return json(res,200,{tiktok:tiktok.disconnect(),relay:relay.snapshot()},cors)}
      if(req.method==='GET'&&url.pathname==='/v1/tiktok/events'){const page=tiktok.eventsAfter(url.searchParams.get('after'),url.searchParams.get('limit'));return json(res,200,{events:page.events,cursor:page.cursor,tiktok:page.status},cors)}
      if(req.method==='POST'&&url.pathname==='/v1/tiktok/relay/connect'){
        const input=await readJson(req);const status=await relay.connect({baseUrl:input.baseUrl,liveId:input.liveId,token:input.relayToken});return json(res,200,{relay:status},cors);
      }
      if(req.method==='POST'&&url.pathname==='/v1/tiktok/relay/disconnect')return json(res,200,{relay:relay.disconnect()},cors);
      if(req.method==='POST'&&url.pathname==='/v1/tiktok/simulate'){
        if(!allowSimulation)return json(res,403,{error:'SIMULATION_DISABLED'},cors);
        const event=tiktok.simulate(await readJson(req));return json(res,201,{event,tiktok:tiktok.snapshot()},cors);
      }
      return json(res,404,{error:'NOT_FOUND'},cors);
    }catch(error){const code=error?.message||'COMPANION_ERROR',status=code==='BODY_TOO_LARGE'?413:code==='INVALID_JSON'?400:502;return json(res,status,{error:code},cors)}
  });
  server.on('close',()=>{obs?.disconnect();obs=null;relay.disconnect();tiktok.close()});
  return{
    server,token,
    listen:(port=DEFAULT_PORT)=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,LOOPBACK_HOST,()=>{server.off('error',reject);resolve(server.address())})}),
    connectTikTok:url=>tiktok.connect(url),
    connectRelay:options=>relay.connect(options),
    close:()=>new Promise(resolve=>server.close(()=>resolve()))
  };
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const localEnvFile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../.env.local');
  if(fs.existsSync(localEnvFile))process.loadEnvFile(localEnvFile);
  const origins=(process.env.SYLORA_COMPANION_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
  const companion=createCompanionServer({token:process.env.SYLORA_COMPANION_TOKEN||crypto.randomBytes(24).toString('base64url'),allowedOrigins:origins.length?origins:[...DEFAULT_ORIGINS]});
  const address=await companion.listen(Number(process.env.SYLORA_COMPANION_PORT||DEFAULT_PORT));
  console.log(`SYLORA Companion listening on http://${address.address}:${address.port}`);
  console.log(`Pairing token: ${companion.token}`);
  console.log('Keep this token private. OBS credentials remain in this local process memory only.');
  const relayBaseUrl=String(process.env.SYLORA_RELAY_BASE_URL||'').trim(),relayLiveId=String(process.env.SYLORA_RELAY_LIVE_ID||'').trim(),relayToken=String(process.env.SYLORA_RELAY_TOKEN||'').trim();
  if(relayBaseUrl&&relayLiveId&&relayToken){
    await companion.connectTikTok(process.env.SYLORA_TIKFINITY_URL||'ws://127.0.0.1:21213');
    await companion.connectRelay({baseUrl:relayBaseUrl,liveId:relayLiveId,token:relayToken});
    console.log('TikFinity owner relay connected. Relay token is held in memory only.');
  }
}
