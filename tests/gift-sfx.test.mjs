import test from 'node:test';
import assert from 'node:assert/strict';
import { GIFT_SFX,FORBIDDEN_AUDIO_CUE_TYPES,FOLEY_LAYERING,FOLEY_SCATTER,GIFT_SYNC } from '../public/gift-sfx.js';

const ids=['spark','pulse','lumen-bloom','nova','dream-orbit','aurora','celestial-wing','time-gate','cosmos','infinite-sylora'];

test('all ten gifts have unique physical-only audio choreography',()=>{
  assert.deepEqual(Object.keys(GIFT_SFX),ids);
  const fingerprints=new Set();
  for(const id of ids){
    const cues=GIFT_SFX[id];
    assert.ok(cues.length>=12,`${id} needs a layered physical sound story`);
    assert.equal(cues.some(c=>FORBIDDEN_AUDIO_CUE_TYPES.has(c.type)),false,`${id} contains forbidden music cue`);
    assert.equal(cues.every(c=>c.at>=0&&c.at<=1&&c.dur>0),true,`${id} cue timing is invalid`);
    assert.equal(cues.some(c=>c.x!==c.x2||c.z!==c.z2),true,`${id} needs spatial motion`);
    fingerprints.add(cues.map(c=>c.type).join('|'));
  }
  assert.equal(fingerprints.size,10,'gift sound stories must not be repeated');
});

test('signature gifts contain the requested causally-linked Foley',()=>{
  const types=id=>new Set(GIFT_SFX[id].map(c=>c.type));
  for(const t of ['eggCrack','fire','phoenixCry','giantFlap','cameraWingRush','fireRelease'])assert.ok(types('cosmos').has(t),`Phoenix missing ${t}`);
  for(const t of ['featherFriction','giantFlap','wingPressure','looseFeathers'])assert.ok(types('celestial-wing').has(t),`Wings missing ${t}`);
  for(const t of ['dimensionalCrack','portalSuction','portalRumble','collapseWhoomp'])assert.ok(types('time-gate').has(t),`Portal missing ${t}`);
  for(const t of ['waterDrop','waterRipple','butterflies'])assert.ok(types('lumen-bloom').has(t),`Lotus missing ${t}`);
  for(const t of ['heartbeat','vineGrow','smallFlybys'])assert.ok(types('pulse').has(t),`Heart missing ${t}`);
});

test('major physical events are layered and granular materials are scattered',()=>{
  for(const type of ['crystalFracture','supernovaPressure','giantFlap','portalSuction','shellBurst','fireRelease','infinityImpact'])assert.ok(FOLEY_LAYERING[type]>=3,`${type} needs mass/material/air layers`);
  for(const type of ['crystalAssembly','debris','petalClicks','looseFeathers','crystalDebris','gemLocks'])assert.ok(FOLEY_SCATTER[type]>=6,`${type} needs non-identical micro contacts`);
});

test('visual sync anchors correspond to physical audio cues',()=>{
  const near=(id,type,at)=>GIFT_SFX[id].some(c=>c.type===type&&Math.abs(c.at-at)<.012);
  for(const at of GIFT_SYNC.pulse.beats)assert.ok(near('pulse','heartbeat',at));
  assert.ok(near('nova','supernovaPressure',GIFT_SYNC.nova.bloom));
  assert.ok(near('dream-orbit','coreCrack',GIFT_SYNC['dream-orbit'].cracks[0]));
  assert.ok(near('celestial-wing','giantFlap',GIFT_SYNC['celestial-wing'].flap));
  assert.ok(near('time-gate','collapseWhoomp',GIFT_SYNC['time-gate'].collapse));
  assert.ok(near('cosmos','fireRelease',GIFT_SYNC.cosmos.release));
  assert.ok(near('infinite-sylora','infinityImpact',GIFT_SYNC['infinite-sylora'].impact));
});
