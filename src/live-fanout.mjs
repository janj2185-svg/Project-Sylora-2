import { randomUUID } from 'node:crypto';

const CHANNEL='sylora:live:events:v1';

export class LiveFanout {
  constructor({redis,dispatch,instanceId=randomUUID()}={}) {
    this.redis=redis;
    this.dispatch=dispatch;
    this.instanceId=instanceId;
    this.unsubscribe=null;
    this.distributed=false;
  }

  async start() {
    if(!this.redis?.configured||this.unsubscribe)return this.distributed;
    try {
      this.unsubscribe=await this.redis.subscribe(CHANNEL,raw=>this.receive(raw));
      this.distributed=!!this.unsubscribe;
    } catch { this.distributed=false; }
    return this.distributed;
  }

  emit(liveId,type,event) {
    this.dispatch?.(String(liveId),String(type),event);
    if(!this.distributed)return;
    const envelope=JSON.stringify({v:1,source:this.instanceId,liveId:String(liveId),type:String(type),event});
    this.redis.publish(CHANNEL,envelope).catch(()=>{});
  }

  receive(raw) {
    try {
      const message=JSON.parse(String(raw));
      if(message?.v!==1||message.source===this.instanceId||typeof message.liveId!=='string'||typeof message.type!=='string')return;
      this.dispatch?.(message.liveId,message.type,message.event);
    } catch {}
  }

  async close() { if(this.unsubscribe){const stop=this.unsubscribe;this.unsubscribe=null;this.distributed=false;await stop()} }
}
