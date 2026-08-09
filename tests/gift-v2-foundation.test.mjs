import test from 'node:test';
import assert from 'node:assert/strict';
import {StoryGraph} from '../public/gift-v2/story-graph.js';
import {ShotDirector} from '../public/gift-v2/shot-director.js';
import {PhysicsWorld} from '../public/gift-v2/physics-world.js';
import {GiftRuntimeV2} from '../public/gift-v2/runtime.js';
import {validateGiftDefinition} from '../public/gift-v2/validator.js';
import {QualityGovernor} from '../public/gift-v2/quality-governor.js';
import {MaterialLab,registerSyloraCoreMaterials} from '../public/gift-v2/material-lab.js';
import {ParticleDirector} from '../public/gift-v2/particle-director.js';

const makeDefinition=()=>({
  id:'runtime-proof',tier:'legendary',climaxType:'aerodynamic-proof',endingType:'single-feather-proof',streamDepthInteraction:true,audioLabels:['air','crystal','wing'],
  story:new StoryGraph({id:'runtime-proof',duration:7,beats:[
    {id:'i',fn:'intrigue',at:0,duration:.8,channels:['environment']},{id:'a',fn:'arrival',at:.65,duration:1,channels:['animation','camera']},
    {id:'t',fn:'transformation',at:1.45,duration:1.4,channels:['physics','material']},{id:'m',fn:'motion',at:2.55,duration:1.5,channels:['animation','camera']},
    {id:'w',fn:'worldInteraction',at:3.8,duration:1.35,channels:['stream','light']},{id:'c',fn:'climax',at:4.9,duration:1.15,channels:['physics','audio']},
    {id:'e',fn:'exit',at:5.8,duration:1.2,channels:['particles','audio']}
  ]}),
  shots:new ShotDirector([{type:'macro',at:0,duration:1.2,motivation:'establish material tension'},{type:'flyby',at:1.2,duration:2,motivation:'establish speed and depth'},{type:'wide-reveal',at:3.2,duration:2,motivation:'show stream interaction'},{type:'near-camera',at:5.2,duration:1.8,motivation:'physical climax and exit'}])
});

test('V2 story enforces seven functions and no dead second',()=>{const d=makeDefinition(),result=validateGiftDefinition(d);assert.equal(result.ok,true,result.errors.join(','));assert.equal(d.story.activityGaps(1).length,0)});

test('V2 validator rejects template camera/climax/ending and music',()=>{const a=makeDefinition(),b=makeDefinition();b.id='copy';b.audioLabels=['orchestral music'];const result=validateGiftDefinition(b,{siblings:[a]});assert.equal(result.ok,false);for(const prefix of ['forbidden-music','duplicate-camera','duplicate-climax','duplicate-ending'])assert.ok(result.errors.some(x=>x.startsWith(prefix)),prefix)});

test('V2 physics is deterministic under equal fixed-step inputs',()=>{const run=()=>{const w=new PhysicsWorld();w.addField({type:'wind',strength:2,direction:{x:1,y:.15,z:0}});const b=w.addBody({id:'f',material:'feather',position:{x:0,y:0,z:0}});for(let i=0;i<120;i++)w.advance(1/120);return b.position};assert.deepEqual(run(),run())});

test('quality governor never sacrifices story signature',()=>{const g=new QualityGovernor();for(let i=0;i<20;i++)g.update(40);const p=g.profile();for(const key of ['storyBeat','signatureTransformation','signatureClimax','causalAudio','endingGesture'])assert.ok(p.protected.includes(key));assert.equal(QualityGovernor.canDrop('signatureClimax'),false)});

test('runtime emits semantic story beats against a deterministic timeline',()=>{const r=new GiftRuntimeV2().load(makeDefinition()).start();for(let i=0;i<14;i++)r.tick(.5,8);const storyEvents=r.events.history.filter(x=>x.type==='STORY_BEAT');assert.ok(storyEvents.length>=8);assert.equal(r.elapsed,7)});

test('V2 material passports and particle families are explicit instead of generic sparkle presets',()=>{const lab=registerSyloraCoreMaterials(new MaterialLab());assert.equal(lab.get('sylora-crystal').ior,1.62);assert.notEqual(lab.signature('sylora-crystal'),lab.signature('sylora-gold'));const p=new ParticleDirector({seed:7});p.registerFamily('test-shard',{cause:'impact',material:'crystal',depthPlane:'lens',lifetime:[.3,.7],forces:['drag'],endState:'fracture-dust',velocityJitter:.3});const a=p.emit('test-shard',{count:3,velocity:{x:1,y:0,z:0}}),b=new ParticleDirector({seed:7});b.registerFamily('test-shard',{cause:'impact',material:'crystal',depthPlane:'lens',lifetime:[.3,.7],forces:['drag'],endState:'fracture-dust',velocityJitter:.3});assert.deepEqual(a,b.emit('test-shard',{count:3,velocity:{x:1,y:0,z:0}}))});
