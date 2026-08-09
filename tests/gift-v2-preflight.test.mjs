import test from 'node:test';
import assert from 'node:assert/strict';
import {GiftAssetPreflight,choosePlaybackProfile} from '../public/gift-v2/asset-preflight.js';
import {GiftAccessibilityGovernor} from '../public/gift-v2/accessibility.js';

test('critical assets must be preloaded and playback lock forbids late network dependencies',async()=>{const seen=[],p=new GiftAssetPreflight({loader:async e=>{seen.push(e.id);return{ready:e.id}}});p.register({id:'hero',url:'/hero.glb'}).register({id:'shader',url:'/hero.glsl',type:'shader'});assert.throws(()=>p.lockForPlayback(),/missing critical assets/);await p.preload();assert.equal(p.lockForPlayback(),p);assert.deepEqual(seen,['hero','shader']);assert.throws(()=>p.register({id:'late',url:'/late.bin'}),/playback lock/)});

test('V2 preflight fails to legacy cleanly when WebGL2 is unavailable',()=>{assert.deepEqual(choosePlaybackProfile({webgl2:false}),{mode:'legacy',reason:'webgl2-unavailable'});const v2=choosePlaybackProfile({webgl2:true,segmentation:true,spatialAudio:true,haptics:false,reducedMotion:false});assert.equal(v2.mode,'v2');assert.equal(v2.depthInteraction,true)});

test('accessibility limits aggressive motion/light without deleting story',()=>{const g=new GiftAccessibilityGovernor({reducedMotion:true,photosensitiveSafe:true}),camera=g.camera({shake:.8,nearAcceleration:1}),light=g.light({exposure:1.5,flashHz:9,contrast:2}),story=g.preserveStory({progress:.5});assert.ok(camera.shake<=.08);assert.ok(light.flashHz<=2.5);assert.equal(story.signatureClimaxPreserved,true);assert.equal(story.endingPreserved,true)});
