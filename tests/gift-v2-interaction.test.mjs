import test from 'node:test';
import assert from 'node:assert/strict';
import {SegmentationMaskPipeline} from '../public/gift-v2/segmentation-pipeline.js';
import {PlaybackClock} from '../public/gift-v2/playback-clock.js';
import {InteractionDirector} from '../public/gift-v2/interaction-director.js';
import {STREAM_COMPOSITE_FRAGMENT} from '../public/gift-v2/webgl-renderer.js';
import {MediaPipePersonSegmentationProvider} from '../public/gift-v2/mediapipe-segmentation-provider.js';

test('segmentation mask uses temporal smoothing and edge feather instead of hard one-frame cutout',()=>{const p=new SegmentationMaskPipeline({width:3,height:3,smoothing:.5,featherPasses:1});p.ingest(new Float32Array([0,0,0,0,1,0,0,0,0]));assert.ok(p.mask[4]>0&&p.mask[4]<1);assert.ok(p.mask[1]>0,'feather should soften neighbour pixels');const before=p.mask[4];p.ingest(new Float32Array(9));assert.ok(p.mask[4]>0&&p.mask[4]<before,'mask should decay temporally')});

test('interaction director produces effects only from semantic physical causes',()=>{const d=new InteractionDirector();assert.equal(d.update(.2).pressure,0);d.ingest({type:'WING_FLAP',time:.2,position:{x:1,y:0,z:0}});assert.ok(d.update(.35).pressure>0);d.ingest({type:'LIGHT_CHANGE',time:.4,energy:.8,color:'#E7B765'});assert.ok(d.update(.65).volumetric>0)});

test('playback clock can follow audio context as authoritative source',()=>{const audio={state:'running',currentTime:10},clock=new PlaybackClock({audioContext:audio,now:()=>999});clock.start();audio.currentTime=10.25;assert.deepEqual(clock.sample(),{elapsed:.25,delta:.25})});

test('stream shader includes temporal-mask edge lighting, volumetrics and physically-caused distortion channels',()=>{for(const token of ['maskTexel','rimStrength','volumetric','volumetricColor','heatPhase','pressureCenter'])assert.ok(STREAM_COMPOSITE_FRAGMENT.includes(token),token)});

test('person mask pipeline accepts real model resolution and resamples it for stable stream composition',()=>{const p=new SegmentationMaskPipeline({width:2,height:2,smoothing:0,featherPasses:0}),source=new Float32Array([0,0,0,0,1,1,0,1,1]);p.ingest(source,{width:3,height:3});assert.equal(p.mask.length,4);assert.ok(p.mask[3]>.7)});

test('MediaPipe adapter consumes confidence mask output without coupling runtime to model internals',async()=>{const mask={width:2,height:2,getAsFloat32Array:()=>new Float32Array([0,.5,.75,1])},segmenter={segmentForVideo(_video,_time,callback){callback({confidenceMasks:[mask],close(){}})}};const provider=new MediaPipePersonSegmentationProvider(segmenter),r=await provider.segment({},123);assert.deepEqual([...r.mask],[0,.5,.75,1]);assert.equal(r.width,2);assert.equal(r.height,2)});
