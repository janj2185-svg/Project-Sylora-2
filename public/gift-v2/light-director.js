const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class LightDirector{
  constructor(){this.sources=new Map();this.streamExposure=1;this.streamTint='#FFFFFF'}
  add(id,{color='#FFFFFF',intensity=1,position={x:0,y:0,z:0},volumetric=false}={}){const light={id,color,intensity,position:{...position},volumetric};this.sources.set(id,light);return light}
  energy(id,intensity){const light=this.sources.get(id);if(!light)throw new Error(`Unknown light: ${id}`);light.intensity=Math.max(0,intensity);return light}
  reactStream({energy=0,color='#FFFFFF'}={}){this.streamExposure=clamp(1+energy*.22,.8,1.35);this.streamTint=color;return{exposure:this.streamExposure,tint:this.streamTint}}
  frame(){return{sources:[...this.sources.values()].map(x=>({...x,position:{...x.position}})),streamExposure:this.streamExposure,streamTint:this.streamTint}}
}
