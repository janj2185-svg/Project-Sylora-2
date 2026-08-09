import {GiftEventBus} from './event-bus.js';
import {PhysicsWorld} from './physics-world.js';
import {PhysicalAudioEngine} from './physical-audio.js';
import {StreamCompositor} from './stream-compositor.js';
import {QualityGovernor} from './quality-governor.js';
import {AnimationDirector} from './animation-director.js';
import {MaterialLab,registerSyloraCoreMaterials} from './material-lab.js';
import {ParticleDirector} from './particle-director.js';
import {LightDirector} from './light-director.js';
import {HapticsDirector} from './haptics-director.js';
import {GiftTelemetry} from './telemetry.js';

export class GiftRuntimeV2{
  constructor({targetFps=120}={}){
    this.events=new GiftEventBus();this.physics=new PhysicsWorld({step:1/120});this.audio=new PhysicalAudioEngine();this.compositor=new StreamCompositor();this.quality=new QualityGovernor({targetFps});this.animation=new AnimationDirector();this.materials=registerSyloraCoreMaterials(new MaterialLab());this.particles=new ParticleDirector();this.lights=new LightDirector();this.haptics=new HapticsDirector();this.telemetry=new GiftTelemetry();this.active=null;this.elapsed=0;this.nextBeat=0;
    for(const type of ['PHYSICS_IMPACT','PRESSURE_CHANGE','MATERIAL_CONTACT','WING_FLAP','CREATURE_VOICE'])this.events.on(type,event=>this.audio.ingest(event));
  }
  load(definition){this.active=definition;this.elapsed=0;this.nextBeat=0;this.events.clear();this.audio.events.length=0;return this}
  start(){if(!this.active)throw new Error('No Gift V2 definition loaded');this.events.emit('STORY_BEAT',{beat:'runtime-start'},0);return this}
  tick(delta,frameMs=delta*1000){
    if(!this.active)return null;this.physics.advance(delta);this.elapsed=Math.min(this.active.story.duration,this.elapsed+Math.max(0,delta));
    while(this.nextBeat<this.active.story.beats.length&&this.active.story.beats[this.nextBeat].at<=this.elapsed){const beat=this.active.story.beats[this.nextBeat++];this.events.emit('STORY_BEAT',{beat:beat.id,fn:beat.fn,channels:beat.channels},beat.at)}
    this.animation.step(delta);this.telemetry.frame(frameMs);const shot=this.active.shots.current(this.elapsed),quality=this.quality.update(frameMs);if(frameMs>1000/60)this.telemetry.event('frame-budget-miss',{frameMs,time:this.elapsed});
    return{time:this.elapsed,progress:this.elapsed/this.active.story.duration,activeBeats:this.active.story.activeAt(this.elapsed),shot,quality,stream:this.compositor.frame(),lights:this.lights.frame()};
  }
}
