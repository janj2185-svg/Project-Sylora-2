const clamp01=n=>Math.max(0,Math.min(1,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);

export class AnimationDirector{
  constructor(){this.tracks=new Map();this.springs=new Map()}
  addTrack(id,keyframes){if(!id||!Array.isArray(keyframes)||keyframes.length<2)throw new Error('Animation track needs at least two keyframes');const sorted=[...keyframes].sort((a,b)=>a.at-b.at);this.tracks.set(id,sorted);return id}
  sample(id,time){const track=this.tracks.get(id);if(!track)throw new Error(`Unknown animation track: ${id}`);if(time<=track[0].at)return track[0].value;if(time>=track.at(-1).at)return track.at(-1).value;let b=track.findIndex(x=>x.at>=time),a=b-1,k=track[a],n=track[b],t=smooth(clamp01((time-k.at)/(n.at-k.at)));if(typeof k.value==='number')return lerp(k.value,n.value,t);const out={};for(const key of Object.keys(k.value))out[key]=lerp(k.value[key],n.value[key],t);return out}
  addSpring(id,{value=0,velocity=0,stiffness=150,damping=18,mass=1}={}){const state={value,velocity,target:value,stiffness,damping,mass};this.springs.set(id,state);return state}
  springTarget(id,target){const state=this.springs.get(id);if(!state)throw new Error(`Unknown spring: ${id}`);state.target=target}
  step(delta){for(const state of this.springs.values()){const force=-state.stiffness*(state.value-state.target)-state.damping*state.velocity,accel=force/state.mass;state.velocity+=accel*delta;state.value+=state.velocity*delta}return this}
}
