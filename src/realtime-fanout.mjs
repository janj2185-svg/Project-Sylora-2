import { randomUUID } from 'node:crypto';

const CHANNEL='sylora:realtime:outbox:v1';

export class RealtimeFanout {
  constructor({redis,dispatch,instanceId=randomUUID()}={}){this.redis=redis;this.dispatch=dispatch;this.instanceId=instanceId;this.unsubscribe=null;this.distributed=false}

  async start(){if(!this.redis?.configured||this.unsubscribe)return this.distributed;if(!this.redis.configured)return false;this.unsubscribe=await this.redis.subscribe(CHANNEL,raw=>this.receive(raw));this.distributed=!!this.unsubscribe;return this.distributed}

  async emitDurable(eventType,event){if(this.redis?.configured){if(!this.distributed)await this.start();if(!this.distributed)throw new Error('REALTIME_FANOUT_UNAVAILABLE');const envelope=JSON.stringify({v:1,source:this.instanceId,eventType:String(eventType),event});await this.redis.publish(CHANNEL,envelope)}this.dispatch?.(String(eventType),event)}

  receive(raw){try{const message=JSON.parse(String(raw));if(message?.v!==1||message.source===this.instanceId||typeof message.eventType!=='string')return;this.dispatch?.(message.eventType,message.event)}catch{}}

  async close(){if(this.unsubscribe){const stop=this.unsubscribe;this.unsubscribe=null;this.distributed=false;await stop()}}
}
