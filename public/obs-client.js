const encoder=new TextEncoder();

async function sha256Base64(value){
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(String(value)));
  const bytes=new Uint8Array(digest);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary);
}

export async function buildObsAuthentication(password,salt,challenge){
  const secret=await sha256Base64(`${password}${salt}`);
  return sha256Base64(`${secret}${challenge}`);
}

export function normalizeObsUrl(value){
  const url=new URL(String(value||'ws://127.0.0.1:4455'));
  if(!['ws:','wss:'].includes(url.protocol))throw new Error('OBS_URL_PROTOCOL');
  const localHosts=new Set(['localhost','127.0.0.1','[::1]','::1']);
  if(!localHosts.has(url.hostname))throw new Error('OBS_LOCALHOST_ONLY');
  return url.toString();
}

export class ObsWebSocketClient{
  constructor({url='ws://127.0.0.1:4455',password='',WebSocketImpl=globalThis.WebSocket,timeoutMs=8000,onDisconnect=null}={}){
    this.url=normalizeObsUrl(url);this.password=password;this.WebSocketImpl=WebSocketImpl;this.timeoutMs=timeoutMs;this.onDisconnect=onDisconnect;this.socket=null;this.pending=new Map();this.hello=null;this.connected=false;this.intentionalClose=false;
  }
  async connect(){
    if(!this.WebSocketImpl)throw new Error('WEBSOCKET_UNAVAILABLE');
    this.disconnect();
    return new Promise((resolve,reject)=>{
      const socket=new this.WebSocketImpl(this.url);this.socket=socket;this.intentionalClose=false;let settled=false;
      const timer=setTimeout(()=>finish(new Error('OBS_CONNECT_TIMEOUT')),this.timeoutMs);
      const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);if(error){this.disconnect();reject(error)}else resolve(value)};
      socket.onerror=()=>finish(new Error('OBS_CONNECTION_FAILED'));
      socket.onclose=()=>{const unexpected=!this.intentionalClose;if(this.socket===socket)this.socket=null;this.connected=false;if(!settled)finish(new Error('OBS_CONNECTION_CLOSED'));for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(new Error('OBS_CONNECTION_CLOSED'))}this.pending.clear();if(unexpected&&this.onDisconnect)queueMicrotask(()=>this.onDisconnect())};
      socket.onmessage=async event=>{try{const packet=JSON.parse(typeof event.data==='string'?event.data:String(event.data));if(packet.op===0){this.hello=packet.d||{};const identify={rpcVersion:Math.min(1,Number(this.hello.rpcVersion)||1),eventSubscriptions:0};if(this.hello.authentication){if(!this.password)throw new Error('OBS_PASSWORD_REQUIRED');identify.authentication=await buildObsAuthentication(this.password,this.hello.authentication.salt,this.hello.authentication.challenge)}socket.send(JSON.stringify({op:1,d:identify}));return}if(packet.op===2){this.connected=true;finish(null,{obsWebSocketVersion:this.hello?.obsWebSocketVersion||'unknown',rpcVersion:packet.d?.negotiatedRpcVersion||1});return}if(packet.op===7){const id=packet.d?.requestId,pending=this.pending.get(id);if(!pending)return;this.pending.delete(id);clearTimeout(pending.timer);if(packet.d?.requestStatus?.result)pending.resolve(packet.d.responseData||{});else pending.reject(new Error(packet.d?.requestStatus?.comment||`OBS_REQUEST_${packet.d?.requestStatus?.code||'FAILED'}`))}}catch(error){finish(error)}};
    });
  }
  request(requestType,requestData={}){
    if(!this.connected||!this.socket)return Promise.reject(new Error('OBS_NOT_CONNECTED'));
    const requestId=crypto.randomUUID();
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(requestId);reject(new Error('OBS_REQUEST_TIMEOUT'))},this.timeoutMs);this.pending.set(requestId,{resolve,reject,timer});this.socket.send(JSON.stringify({op:6,d:{requestType,requestId,requestData}}))});
  }
  async capabilities(){
    const [version,scenes,virtualCam,stream]=await Promise.all([this.request('GetVersion'),this.request('GetSceneList'),this.request('GetVirtualCamStatus').catch(()=>null),this.request('GetStreamStatus').catch(()=>null)]);
    const available=new Set(version.availableRequests||[]);
    return {obsVersion:version.obsVersion||'',obsWebSocketVersion:version.obsWebSocketVersion||this.hello?.obsWebSocketVersion||'',scenes:scenes.scenes||[],currentProgramSceneName:scenes.currentProgramSceneName||'',virtualCamera:virtualCam?{available:true,active:!!virtualCam.outputActive}:{available:available.has('StartVirtualCam'),active:false},stream:stream?{available:true,active:!!stream.outputActive,congestion:Number(stream.outputCongestion)||0,reconnecting:!!stream.outputReconnecting}:{available:available.has('StartStream'),active:false,congestion:0,reconnecting:false},availableRequests:[...available]};
  }
  setProgramScene(sceneName){return this.request('SetCurrentProgramScene',{sceneName})}
  startVirtualCamera(){return this.request('StartVirtualCam')}
  stopVirtualCamera(){return this.request('StopVirtualCam')}
  startStream(){return this.request('StartStream')}
  stopStream(){return this.request('StopStream')}
  disconnect(){this.intentionalClose=true;if(this.socket){try{this.socket.close()}catch{}this.socket=null}this.connected=false;for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(new Error('OBS_DISCONNECTED'))}this.pending.clear()}
}
