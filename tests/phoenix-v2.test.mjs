import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {validateGiftDefinition} from '../public/gift-v2/validator.js';
import {GiftRuntimeV2} from '../public/gift-v2/runtime.js';
import {createPhoenixRebirthPresenter,phoenixFramingForAspect,phoenixQualityForDevice,PHOENIX_QUALITY_PROFILES,PHOENIX_REBIRTH_DURATION,PHOENIX_REBIRTH_EVENTS,PHOENIX_REBIRTH_V2,PHOENIX_V3_KEYFRAMES} from '../public/gift-v2/phoenix-rebirth.js';

test('Phoenix Rebirth is a complete ten-second V2 story, not a legacy animation alias',()=>{
  assert.equal(PHOENIX_REBIRTH_DURATION,10);
  assert.equal(PHOENIX_REBIRTH_V2.legacyId,'cosmos');
  assert.equal(PHOENIX_REBIRTH_V2.story.functions().size,7);
  assert.equal(PHOENIX_REBIRTH_V2.story.activityGaps(1).length,0);
  assert.deepEqual(validateGiftDefinition(PHOENIX_REBIRTH_V2),{ok:true,errors:[]});
  assert.equal(PHOENIX_REBIRTH_V2.shots.shots.length,8);
  assert.equal(PHOENIX_REBIRTH_V2.streamDepthInteraction,true);
});

test('Phoenix active presenter is the cinematic V3 keyframe pipeline, not the procedural hero rig',()=>{
  assert.equal(PHOENIX_REBIRTH_V2.renderStyle,'cinematic-keyframe-v3');
  assert.equal(PHOENIX_V3_KEYFRAMES.length,5);
  assert.deepEqual(PHOENIX_REBIRTH_V2.assets.map(asset=>asset.id),PHOENIX_V3_KEYFRAMES.map(frame=>frame.id));
  for(const frame of PHOENIX_V3_KEYFRAMES){assert.match(frame.url,/^\/assets\/phoenix-v3\/\d{2}-[a-z-]+\.png$/);assert.equal(existsSync(new URL(`../public${frame.url}`,import.meta.url)),true,`missing keyframe ${frame.id}`)}
  assert.equal(createPhoenixRebirthPresenter().constructor.name,'PhoenixRebirthV3Presenter');
});

test('Phoenix V2 physical event map covers hatch, flight, stream interaction, climax and rebirth without music',()=>{
  const types=new Set(PHOENIX_REBIRTH_EVENTS.map(x=>x.type));
  for(const type of ['PHYSICS_IMPACT','WING_FLAP','STREAM_INTERACTION','PRESSURE_CHANGE','LIGHT_CHANGE','CREATURE_VOICE','HAPTIC'])assert.ok(types.has(type),type);
  assert.ok(PHOENIX_REBIRTH_EVENTS.some(x=>x.type==='PHYSICS_IMPACT'&&x.material==='crystal'));
  assert.ok(PHOENIX_REBIRTH_EVENTS.filter(x=>x.type==='WING_FLAP').length>=3);
  assert.ok(PHOENIX_REBIRTH_EVENTS.some(x=>x.type==='CREATURE_VOICE'&&x.at>9),'rebirth must end with a newborn voice event');
  assert.equal(PHOENIX_REBIRTH_V2.audioLabels.some(x=>/music|song|score|choir/i.test(x)),false);
  const audible=PHOENIX_REBIRTH_EVENTS.filter(x=>['PHYSICS_IMPACT','PRESSURE_CHANGE','MATERIAL_CONTACT','WING_FLAP','CREATURE_VOICE'].includes(x.type));
  const maxGap=Math.max(...audible.slice(1).map((event,index)=>event.at-audible[index].at));
  assert.ok(maxGap<=1.05,`physical sound bed has an excessive silent gap: ${maxGap.toFixed(2)}s`);
});

test('Phoenix V2 has explicit HIGH, MEDIUM and LOW render budgets without deleting story beats',()=>{
  assert.deepEqual(Object.keys(PHOENIX_QUALITY_PROFILES),['HIGH','MEDIUM','LOW']);
  assert.ok(PHOENIX_QUALITY_PROFILES.HIGH.farEmbers>PHOENIX_QUALITY_PROFILES.MEDIUM.farEmbers);
  assert.ok(PHOENIX_QUALITY_PROFILES.MEDIUM.farEmbers>PHOENIX_QUALITY_PROFILES.LOW.farEmbers);
  assert.equal(phoenixQualityForDevice({deviceMemory:16,hardwareConcurrency:12}),'HIGH');
  assert.equal(phoenixQualityForDevice({deviceMemory:6,hardwareConcurrency:6}),'MEDIUM');
  assert.equal(phoenixQualityForDevice({deviceMemory:4,hardwareConcurrency:8}),'LOW');
  assert.equal(phoenixQualityForDevice({deviceMemory:16,hardwareConcurrency:12,reducedMotion:true}),'LOW');
});

test('Phoenix V2 framing protects portrait, compact and desktop compositions',()=>{
  const portrait=phoenixFramingForAspect(9/16),compact=phoenixFramingForAspect(4/5),wide=phoenixFramingForAspect(16/9);
  assert.equal(portrait.mode,'portrait');
  assert.equal(compact.mode,'compact');
  assert.equal(wide.mode,'wide');
  assert.ok(portrait.heroScale<compact.heroScale&&compact.heroScale<wide.heroScale);
  assert.ok(portrait.cameraZOffset>compact.cameraZOffset&&compact.cameraZOffset>wide.cameraZOffset);
});

test('loading Phoenix preserves runtime subscribers so causal physical audio remains wired',()=>{
  const runtime=new GiftRuntimeV2();
  runtime.load(PHOENIX_REBIRTH_V2);
  runtime.events.emit('WING_FLAP',{material:'feather',position:{x:0,y:0,z:-1},velocity:{x:0,y:1,z:4},mass:3},3.38);
  assert.equal(runtime.audio.events.length,1);
  assert.equal(runtime.audio.events[0].kind,'physical:wing_flap');
  assert.ok(runtime.audio.events[0].layers.includes('primary-air'));
});
