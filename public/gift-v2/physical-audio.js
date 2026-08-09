const FORBIDDEN=/music|score|song|choir|melod|fanfare/i;

const MATERIAL_LAYERS=Object.freeze({
  crystal:['structure','shard-body','micro-contact','air','room-reflection'],
  gold:['dense-metal','contact','air','room-reflection'],
  feather:['primary-air','low-pressure','feather-friction','feather-bed','room-reflection'],
  fire:['flame-body','hot-air','sparks','environment-reflection'],
  water:['impact','surface-tension','droplets','room-reflection']
});

export class PhysicalAudioEngine{
  constructor({listener={x:0,y:0,z:0}}={}){this.listener=listener;this.events=[]}
  ingest(event){
    const descriptor=this.describe(event);if(!descriptor)return null;
    if(FORBIDDEN.test(descriptor.kind))throw new Error('Music is forbidden in SYLORA Gift Runtime V2');
    this.events.push(descriptor);return descriptor;
  }
  describe(event){
    const material=event.material||event.creatureMaterial;
    if(event.type==='CAMERA_SHOT'||event.type==='LIGHT_CHANGE'||event.type==='STORY_BEAT')return null;
    const p=event.position||{x:0,y:0,z:0},dx=p.x-this.listener.x,dy=p.y-this.listener.y,dz=p.z-this.listener.z,distance=Math.hypot(dx,dy,dz);
    const layers=MATERIAL_LAYERS[material]||this.layersForEvent(event.type);
    return {kind:`physical:${event.type.toLowerCase()}`,eventSequence:event.sequence,time:event.time,position:p,distance,layers,energy:this.energy(event),velocity:event.velocity||null};
  }
  layersForEvent(type){if(type==='WING_FLAP')return MATERIAL_LAYERS.feather;if(type==='PRESSURE_CHANGE')return['air-pressure','low-body','environment-reflection'];if(type==='CREATURE_VOICE')return['creature-source','body-resonance','environment-reflection'];return['physical-source','air','environment-reflection']}
  energy(event){const impulse=Math.abs(event.impulse||event.impactForce||event.deltaPressure||0),mass=Math.max(.01,event.mass||1),speed=event.velocity?Math.hypot(event.velocity.x||0,event.velocity.y||0,event.velocity.z||0):0;return Math.min(1,Math.log1p(impulse+mass*speed)/5)}
}

export const isForbiddenAudioLabel=label=>FORBIDDEN.test(label);
