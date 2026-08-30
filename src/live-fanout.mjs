import { randomUUID } from 'node:crypto';

const CHANNEL='sylora:live:events:v1';

export class LiveFanout {
  constructor({redis,dispatch,instanceId=randomUUID(),subscribeTimeoutMs=2_500,publishTimeoutMs=900,ackTimeoutMs=900}={}) {
    this.redis=redis;
    this.dispatch=dispatch;
    this.instanceId=instanceId;
    this.unsubscribe=null;
    this.distributed=false;
    this.starting=null;
    this.retryTimer=null;
    this.closing=false;
    this.subscribeTimeoutMs=Math.max(100,Number(subscribeTimeoutMs)||2_500);
    this.publishTimeoutMs=Math.max(100,Number(publishTimeoutMs)||900);
    this.generation=0;
    this.ackTimeoutMs=Math.max(100,Number(ackTimeoutMs)||900);
    this.pendingAcks=new Map();
  }

  async start() {
    if(!this.redis?.configured)return false;
    if(this.ready)return true;
    if(this.starting)return this.starting;
    this.closing=false;
    this.starting=(async()=>{
      if(this.unsubscribe){const stop=this.unsubscribe;this.unsubscribe=null;await this.stopSubscription(stop)}
      const generation=++this.generation,subscription=Promise.resolve().then(()=>this.redis.subscribe(CHANNEL,raw=>this.receive(raw),ready=>this.subscriptionStatus(ready)));let timer;
      try{const stop=await Promise.race([subscription,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('LIVE_FANOUT_SUBSCRIBE_TIMEOUT')),this.subscribeTimeoutMs)})]);if(generation!==this.generation||this.closing){await stop?.();return false}this.unsubscribe=stop;this.distributed=!!stop&&(!stop.isReady||stop.isReady());if(this.distributed){if(this.retryTimer)clearTimeout(this.retryTimer);this.retryTimer=null}else this.scheduleRestart()}catch{subscription.then(stop=>stop?.()).catch(()=>{});this.distributed=false;this.scheduleRestart()}finally{if(timer)clearTimeout(timer)}
      return this.distributed
    })().finally(()=>{this.starting=null});
    return this.starting;
  }

  get ready(){return !!this.distributed&&!!this.unsubscribe&&(!this.unsubscribe.isReady||this.unsubscribe.isReady())}
  status(){return{configured:!!this.redis?.configured,ready:!this.redis?.configured||this.ready}}
  subscriptionStatus(ready){if(this.closing)return;this.distributed=!!ready;if(ready){if(this.retryTimer)clearTimeout(this.retryTimer);this.retryTimer=null}else this.scheduleRestart()}
  scheduleRestart(){if(this.closing||this.retryTimer)return;this.retryTimer=setTimeout(()=>{this.retryTimer=null;this.start().catch(()=>{})},1_000);this.retryTimer.unref?.()}
  async stopSubscription(stop){let timer;try{await Promise.race([Promise.resolve().then(()=>stop?.()),new Promise(resolve=>{timer=setTimeout(resolve,this.subscribeTimeoutMs)})])}catch{}finally{if(timer)clearTimeout(timer)}}
  async publishBounded(payload){let timer;const publishing=Promise.resolve().then(()=>this.redis.publish(CHANNEL,payload));try{return await Promise.race([publishing,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('LIVE_FANOUT_PUBLISH_TIMEOUT')),this.publishTimeoutMs)})])}finally{if(timer)clearTimeout(timer)}}

  emit(liveId,type,event) {
    this.dispatch?.(String(liveId),String(type),event);
    if(!this.ready)return;
    const envelope=JSON.stringify({v:1,source:this.instanceId,liveId:String(liveId),type:String(type),event});
    this.publishBounded(envelope).catch(()=>{});
  }

  async emitReliable(liveId,type,event){
    const normalizedLiveId=String(liveId),normalizedType=String(type);
    if(this.redis?.configured){
      if(!this.ready)await this.start();
      if(!this.ready)throw new Error('LIVE_FANOUT_UNAVAILABLE');
      const requiresAck=normalizedType==='signal'&&typeof event?.toPeerId==='string',messageId=requiresAck?randomUUID():null,acknowledged=requiresAck?new Promise(resolve=>{const timer=setTimeout(()=>{this.pendingAcks.delete(messageId);resolve(false)},this.ackTimeoutMs);this.pendingAcks.set(messageId,{resolve,timer})}):null,envelope=JSON.stringify({v:1,source:this.instanceId,liveId:normalizedLiveId,type:normalizedType,event,...(requiresAck?{messageId,requiresAck:true}:{})});
      try{await this.publishBounded(envelope)}catch(error){if(messageId)this.settleAck(messageId,false);throw error}
      const delivered=!!this.dispatch?.(normalizedLiveId,normalizedType,event);if(delivered&&messageId)this.settleAck(messageId,true);if(acknowledged&&!delivered&&!await acknowledged)throw new Error('LIVE_SIGNAL_TARGET_UNAVAILABLE');return;
    }
    this.dispatch?.(normalizedLiveId,normalizedType,event);
  }

  settleAck(messageId,value){const pending=this.pendingAcks.get(messageId);if(!pending)return;this.pendingAcks.delete(messageId);clearTimeout(pending.timer);pending.resolve(!!value)}

  receive(raw) {
    try {
      const message=JSON.parse(String(raw));
      if(message?.v!==1||message.source===this.instanceId)return;if(typeof message.ackFor==='string'){this.settleAck(message.ackFor,true);return}if(typeof message.liveId!=='string'||typeof message.type!=='string')return;
      const delivered=!!this.dispatch?.(message.liveId,message.type,message.event);if(delivered&&message.requiresAck&&typeof message.messageId==='string'){const ack=JSON.stringify({v:1,source:this.instanceId,ackFor:message.messageId});this.publishBounded(ack).catch(()=>{})}
    } catch {}
  }

  async close() { this.closing=true;this.generation++;if(this.retryTimer)clearTimeout(this.retryTimer);this.retryTimer=null;this.distributed=false;for(const messageId of [...this.pendingAcks.keys()])this.settleAck(messageId,false);if(this.unsubscribe){const stop=this.unsubscribe;this.unsubscribe=null;await this.stopSubscription(stop)} }
}
