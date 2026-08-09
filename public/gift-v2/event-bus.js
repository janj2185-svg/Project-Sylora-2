export const GIFT_EVENT_TYPES=Object.freeze([
  'STORY_BEAT','CAMERA_SHOT','PHYSICS_IMPACT','PRESSURE_CHANGE','MATERIAL_CONTACT',
  'WING_FLAP','PARTICLE_EMIT','LIGHT_CHANGE','STREAM_INTERACTION','CREATURE_VOICE','HAPTIC'
]);

export class GiftEventBus{
  constructor(){this.listeners=new Map();this.sequence=0;this.history=[]}
  on(type,listener){const bucket=this.listeners.get(type)||new Set();bucket.add(listener);this.listeners.set(type,bucket);return()=>bucket.delete(listener)}
  emit(type,payload={},time=0){
    if(!GIFT_EVENT_TYPES.includes(type))throw new Error(`Unknown Gift V2 event: ${type}`);
    const event=Object.freeze({type,time,sequence:this.sequence++,...payload});
    this.history.push(event);
    for(const listener of this.listeners.get(type)||[])listener(event);
    for(const listener of this.listeners.get('*')||[])listener(event);
    return event;
  }
  clear(){this.history.length=0;this.sequence=0}
}
