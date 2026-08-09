import test from 'node:test';
import assert from 'node:assert/strict';
import {STREAM_COMPOSITE_FRAGMENT} from '../public/gift-v2/webgl-renderer.js';
import {PHYSICAL_LAYER_PROFILES} from '../public/gift-v2/web-audio-renderer.js';
import {PhysicalAudioEngine} from '../public/gift-v2/physical-audio.js';

test('V2 stream compositor has real behind/front/lens depth composition and person occlusion',()=>{for(const token of ['tBehind','tFront','tLens','tMask','person','pressure'])assert.ok(STREAM_COMPOSITE_FRAGMENT.includes(token),token);assert.match(STREAM_COMPOSITE_FRAGMENT,/behind\.a\*=1\.0-person/)});

test('V2 physical playback profiles cover material, air and creature layers without music synthesis',()=>{for(const layer of ['structure','shard-body','dense-metal','primary-air','low-pressure','feather-friction','flame-body','sparks','creature-source','body-resonance'])assert.ok(PHYSICAL_LAYER_PROFILES[layer],layer);assert.equal('oscillator' in PHYSICAL_LAYER_PROFILES,false)});

test('causal physical descriptor keeps 3D position and event energy for spatial playback',()=>{const engine=new PhysicalAudioEngine(),d=engine.ingest({type:'PHYSICS_IMPACT',sequence:4,time:1.2,material:'crystal',mass:2,impactForce:8,position:{x:.8,y:.2,z:-.4},velocity:{x:3,y:0,z:1}});assert.deepEqual(d.position,{x:.8,y:.2,z:-.4});assert.ok(d.energy>0);assert.ok(d.layers.includes('micro-contact'))});
