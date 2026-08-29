import { createHash } from 'node:crypto';

const LOOPBACK_HOSTS=new Set(['127.0.0.1','localhost','[::1]','::1']);
const EVENT_TYPES=new Set(['chat','question','gift','like','follow','share','subscribe','member','viewer','guest','stream_end']);

function clipped(value,max=500){return String(value??'').trim().slice(0,max)}
function number(value,fallback=0){const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback}
function timestamp(value){if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)){const parsed=Date.parse(value);if(Number.isFinite(parsed))return new Date(parsed).toISOString()}const parsed=number(value,Date.now());return new Date(parsed<10_000_000_000?parsed*1000:parsed).toISOString()}
function userFrom(data={}){return{id:clipped(data.userId||data.user?.id||data.uniqueId||data.user?.uniqueId||data.nickname,120)||null,username:clipped(data.uniqueId||data.user?.uniqueId||data.username||data.user?.username,80)||null,displayName:clipped(data.nickname||data.user?.nickname||data.displayName||data.user?.displayName||data.uniqueId,120)||'TikTok viewer'}}
function eventType(rawType,data){
  const type=clipped(rawType,80).toLowerCase().replaceAll('-','_');
  if(['chat','comment'].includes(type))return data.question?'question':'chat';
  if(['question','qa'].includes(type))return'question';
  if(['gift','treasurebox'].includes(type))return'gift';
  if(['like'].includes(type))return'like';
  if(['follow'].includes(type))return'follow';
  if(['share'].includes(type))return'share';
  if(['subscribe','subscription'].includes(type))return'subscribe';
  if(['member','join','roomuser'].includes(type))return'member';
  if(['viewer','roomusercount','viewercount'].includes(type))return'viewer';
  if(['guest','linkmicbattle','linkmic','guestrequest'].includes(type))return'guest';
  if(['streamend','stream_end','disconnected'].includes(type))return'stream_end';
  return null;
}

export function normalizeTikFinityUrl(value='ws://127.0.0.1:21213'){
  const url=new URL(String(value||'ws://127.0.0.1:21213'));
  if(url.protocol!=='ws:')throw new Error('TIKTOK_BRIDGE_PROTOCOL');
  if(!LOOPBACK_HOSTS.has(url.hostname))throw new Error('TIKTOK_BRIDGE_LOOPBACK_ONLY');
  if(url.username||url.password)throw new Error('TIKTOK_BRIDGE_CREDENTIALS_FORBIDDEN');
  if(!url.port)url.port='21213';
  url.hash='';
  return url.toString();
}

export function normalizeTikTokLiveEvent(input={}){
  const envelope=input&&typeof input==='object'?input:{};
  const data=envelope.data&&typeof envelope.data==='object'?envelope.data:envelope;
  const rawType=envelope.event||envelope.type||envelope.eventType||data.event||data.type||'';
  const type=eventType(rawType,data);
  if(!type||!EVENT_TYPES.has(type))return null;
  const user=userFrom(data);
  const text=clipped(data.comment||data.text||data.question||data.message,500);
  const rawId=clipped(envelope.eventId||envelope.id||data.eventId||data.msgId||data.id,180);
  const occurredAt=timestamp(envelope.occurredAt||envelope.timestamp||envelope.createTime||data.occurredAt||data.timestamp||data.createTime||Date.now());
  const signature=JSON.stringify([type,rawId,user.id,text,occurredAt,data.giftId||data.gift?.id,data.repeatCount]);
  const id=rawId||createHash('sha256').update(signature).digest('hex').slice(0,24);
  const event={id,type,occurredAt,user,source:'tikfinity-local'};
  if(type==='chat'||type==='question')event.text=text;
  if(type==='gift')event.gift={
    id:clipped(data.giftId||data.gift?.id||data.giftName||data.gift?.name,120)||null,
    name:clipped(data.giftName||data.gift?.name||'Gift',120),
    count:Math.max(1,Math.min(10_000,number(data.repeatCount||data.repeatEnd||data.count||data.gift?.count||1,1))),
    diamonds:Math.max(0,Math.min(10_000_000,number(data.diamondCount||data.diamonds||data.gift?.diamondCount,0)))
  };
  if(type==='like')event.likeCount=Math.max(1,Math.min(1_000_000,number(data.likeCount||data.count||1,1)));
  if(type==='viewer')event.viewerCount=Math.max(0,Math.min(10_000_000,number(data.viewerCount||data.count||data.roomUserCount,0)));
  if(type==='guest')event.guest={status:clipped(data.status||data.action||rawType,80),roomId:clipped(data.roomId,120)||null};
  return event;
}

export class TikFinityBridge{
  constructor({WebSocketImpl=globalThis.WebSocket,maxEvents=500,reconnectBaseMs=800,reconnectMaxMs=15_000,connectTimeoutMs=5_000}={}){
    this.WebSocketImpl=WebSocketImpl;this.maxEvents=Math.max(20,Math.min(5_000,maxEvents));this.reconnectBaseMs=reconnectBaseMs;this.reconnectMaxMs=reconnectMaxMs;this.connectTimeoutMs=connectTimeoutMs;
    this.socket=null;this.url=null;this.events=[];this.sequence=0;this.seen=new Map();this.reconnectTimer=null;this.reconnectAttempt=0;this.intentionalClose=false;
    this.status={state:'disconnected',connected:false,url:null,connectedAt:null,lastEventAt:null,lastError:null,reconnectAttempt:0};
  }
  snapshot(){return{...this.status,queuedEvents:this.events.length,cursor:this.sequence}}
  async connect(value){
    if(!this.WebSocketImpl)throw new Error('WEBSOCKET_UNAVAILABLE');
    this.url=normalizeTikFinityUrl(value);this.intentionalClose=true;clearTimeout(this.reconnectTimer);this.#closeSocket();this.intentionalClose=false;
    await this.#open(false);return this.snapshot();
  }
  async #open(reconnecting){
    this.status={...this.status,state:reconnecting?'reconnecting':'connecting',connected:false,url:this.url,lastError:null,reconnectAttempt:this.reconnectAttempt};
    const socket=new this.WebSocketImpl(this.url);this.socket=socket;
    const on=(name,handler)=>typeof socket.addEventListener==='function'?socket.addEventListener(name,handler):socket.on?.(name,handler);
    await new Promise((resolve,reject)=>{
      let settled=false;
      const timer=setTimeout(()=>{if(settled)return;settled=true;this.#closeSocket();reject(new Error('TIKTOK_BRIDGE_TIMEOUT'))},this.connectTimeoutMs);
      on('open',()=>{if(settled)return;settled=true;clearTimeout(timer);this.reconnectAttempt=0;this.status={...this.status,state:'connected',connected:true,connectedAt:new Date().toISOString(),lastError:null,reconnectAttempt:0};resolve()});
      on('message',message=>this.#receive(message?.data??message));
      on('error',error=>{this.status={...this.status,lastError:clipped(error?.message||'TIKTOK_BRIDGE_ERROR',180)}});
      on('close',()=>{if(this.socket!==socket)return;this.socket=null;this.status={...this.status,state:'disconnected',connected:false};if(!settled){settled=true;clearTimeout(timer);reject(new Error(this.status.lastError||'TIKTOK_BRIDGE_CLOSED'))}else this.#scheduleReconnect()});
    });
  }
  #receive(payload){
    let parsed=payload;if(typeof payload!=='string')parsed=Buffer.isBuffer(payload)?payload.toString('utf8'):payload;
    if(typeof parsed==='string')try{parsed=JSON.parse(parsed)}catch{return}
    const candidates=Array.isArray(parsed)?parsed:Array.isArray(parsed?.events)?parsed.events:[parsed];
    for(const candidate of candidates)this.#enqueue(normalizeTikTokLiveEvent(candidate));
  }
  #enqueue(event){
    if(!event)return null;const now=Date.now();for(const [id,expires] of this.seen)if(expires<=now)this.seen.delete(id);if(this.seen.has(event.id))return null;
    this.seen.set(event.id,now+10*60_000);const queued={...event,cursor:++this.sequence};this.events.push(queued);if(this.events.length>this.maxEvents)this.events.splice(0,this.events.length-this.maxEvents);
    this.status={...this.status,lastEventAt:queued.occurredAt};return queued;
  }
  #scheduleReconnect(){
    if(this.intentionalClose||!this.url||this.reconnectTimer)return;this.reconnectAttempt+=1;const delay=Math.min(this.reconnectMaxMs,this.reconnectBaseMs*(2**Math.min(8,this.reconnectAttempt-1)));
    this.status={...this.status,state:'reconnecting',reconnectAttempt:this.reconnectAttempt};this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null;this.#open(true).catch(error=>{this.status={...this.status,lastError:clipped(error.message,180)};this.#scheduleReconnect()})},delay);
  }
  #closeSocket(){const socket=this.socket;this.socket=null;if(!socket)return;try{socket.close()}catch{}}
  disconnect(){this.intentionalClose=true;clearTimeout(this.reconnectTimer);this.reconnectTimer=null;this.#closeSocket();this.url=null;this.reconnectAttempt=0;this.status={state:'disconnected',connected:false,url:null,connectedAt:null,lastEventAt:this.status.lastEventAt,lastError:null,reconnectAttempt:0};return this.snapshot()}
  eventsAfter(after=0,limit=100){const cursor=Math.max(0,number(after,0));const size=Math.max(1,Math.min(200,number(limit,100)));const events=this.events.filter(event=>event.cursor>cursor).slice(0,size);return{events,cursor:events.at(-1)?.cursor||cursor,status:this.snapshot()}}
  simulate(input){const candidate={...input,event:input?.event||input?.type||'chat',timestamp:input?.timestamp||Date.now()};const event=normalizeTikTokLiveEvent(candidate);if(!event)throw new Error('TIKTOK_EVENT_UNSUPPORTED');const queued=this.#enqueue({...event,source:'simulator'});return queued||this.events.find(item=>item.id===event.id)||null}
  close(){return this.disconnect()}
}
