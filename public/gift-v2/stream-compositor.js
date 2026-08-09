export const DEPTH_PLANES=Object.freeze(['far','behind-streamer','front-streamer','lens']);

export class StreamCompositor{
  constructor(){this.layers=new Map(DEPTH_PLANES.map(x=>[x,[]]));this.interactions=[]}
  add(object,plane){if(!DEPTH_PLANES.includes(plane))throw new Error(`Invalid stream depth plane: ${plane}`);this.layers.get(plane).push(object);return object}
  interact(effect){
    const allowed=['light-spill','rim-light','reflection','refraction','heat-haze','volumetric','pressure-displacement','depth-fog','particle-occlusion','environment-tint'];
    if(!allowed.includes(effect.type))throw new Error(`Invalid stream interaction: ${effect.type}`);this.interactions.push(effect);return effect;
  }
  frame(){return{planes:Object.fromEntries([...this.layers]),interactions:[...this.interactions]}}
  clearTransient(){for(const key of DEPTH_PLANES)this.layers.set(key,[]);this.interactions.length=0}
}
