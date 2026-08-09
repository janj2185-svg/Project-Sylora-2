export const PHYSICAL_LAYER_PROFILES=Object.freeze({
  'structure':{low:120,high:5200,gain:.42},'shard-body':{low:700,high:11000,gain:.28},'micro-contact':{low:2400,high:15000,gain:.18},
  'dense-metal':{low:90,high:4600,gain:.42},'contact':{low:350,high:9500,gain:.3},'primary-air':{low:70,high:5400,gain:.48},
  'low-pressure':{low:28,high:240,gain:.6},'feather-friction':{low:800,high:9200,gain:.24},'feather-bed':{low:220,high:5400,gain:.2},
  'flame-body':{low:80,high:3200,gain:.42},'hot-air':{low:60,high:1500,gain:.3},'sparks':{low:2600,high:15000,gain:.12},
  'air-pressure':{low:28,high:1200,gain:.55},'low-body':{low:25,high:180,gain:.62},'air':{low:90,high:7000,gain:.25},
  'room-reflection':{low:180,high:7800,gain:.12},'environment-reflection':{low:140,high:6500,gain:.12},'physical-source':{low:80,high:9000,gain:.35},
  'creature-source':{low:180,high:7800,gain:.48},'body-resonance':{low:70,high:900,gain:.32},'impact':{low:60,high:6500,gain:.45},
  'surface-tension':{low:600,high:9000,gain:.24},'droplets':{low:1800,high:14000,gain:.16}
});

export class SpatialPhysicalAudioRenderer{
  constructor({context=null}={}){this.context=context;this.master=null;this.noise=null;if(context)this.init(context)}
  init(context){this.context=context;this.master=context.createGain();this.master.gain.value=1.8;this.master.connect(context.destination);this.noise=this.makeNoiseBuffer(2);return this}
  makeNoiseBuffer(seconds=2){const rate=this.context.sampleRate,length=Math.ceil(rate*seconds),buffer=this.context.createBuffer(1,length,rate),data=buffer.getChannelData(0);let brown=0;for(let i=0;i<length;i++){const white=Math.random()*2-1;brown=(brown+.02*white)/1.02;data[i]=Math.max(-1,Math.min(1,brown*3.2+white*.18))}return buffer}
  setListener({x=0,y=0,z=0,forward={x:0,y:0,z:-1},up={x:0,y:1,z:0}}={}){const l=this.context?.listener;if(!l)return;const now=this.context.currentTime;l.positionX?.setValueAtTime(x,now);l.positionY?.setValueAtTime(y,now);l.positionZ?.setValueAtTime(z,now);l.forwardX?.setValueAtTime(forward.x,now);l.forwardY?.setValueAtTime(forward.y,now);l.forwardZ?.setValueAtTime(forward.z,now);l.upX?.setValueAtTime(up.x,now);l.upY?.setValueAtTime(up.y,now);l.upZ?.setValueAtTime(up.z,now)}
  play(descriptor){if(!this.context||!descriptor||!this.noise)return[];const nodes=[],now=this.context.currentTime,energy=Math.max(.04,descriptor.energy||.15),duration=Math.max(.18,Math.min(1.6,.16+energy));for(let i=0;i<descriptor.layers.length;i++){const layer=descriptor.layers[i],profile=PHYSICAL_LAYER_PROFILES[layer]||PHYSICAL_LAYER_PROFILES['physical-source'],source=this.context.createBufferSource(),highpass=this.context.createBiquadFilter(),lowpass=this.context.createBiquadFilter(),gain=this.context.createGain(),panner=this.context.createPanner();source.buffer=this.noise;highpass.type='highpass';highpass.frequency.value=profile.low;lowpass.type='lowpass';lowpass.frequency.value=profile.high;panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=1.1;panner.maxDistance=40;panner.rolloffFactor=.85;const p=descriptor.position||{x:0,y:0,z:-1};panner.positionX.value=p.x;panner.positionY.value=p.y;panner.positionZ.value=p.z;const start=now+i*.002,peak=Math.min(.9,profile.gain*energy);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.001,peak),start+Math.min(.018,duration*.2));gain.gain.exponentialRampToValueAtTime(.0001,start+duration);source.connect(highpass).connect(lowpass).connect(gain).connect(panner).connect(this.master);source.start(start,Math.random()*Math.max(.001,this.noise.duration-duration),duration);source.stop(start+duration+.01);nodes.push({source,panner,gain})}return nodes}
  dispose(){this.master?.disconnect();this.master=null;this.noise=null}
}
