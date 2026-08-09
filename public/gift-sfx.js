// SYLORA physical gift sound choreography. `at`/`dur` are normalized to the visual timeline.
// There are intentionally no music, score, song, choir or melodic-note cue types here.
const c=(type,at,dur=.08,x=0,x2=x,z=-1,z2=z,level=1)=>({type,at,dur,x,x2,z,z2,level});

export const GIFT_SFX={
  spark:[
    c('air',.01,.12,-.8,-.7,-2,-1.8,.12),c('crystalMicro',.07,.06,-.72,-.68,-1.8,-1.7,.25),
    c('comet',.10,.19,-.75,.92,-1.8,-.22,.78),c('cameraRush',.245,.055,.25,.95,-.16,.7,1),
    c('silence',.29,.055),c('crystalFracture',.35,.12,0,-.45,-.7,-.45,1),c('pressure',.36,.12,0,0,-.7,.35,.72),
    c('debris',.38,.17,-.85,.9,-.4,.65,.8),c('inwardWind',.51,.16,-.8,.8,.2,-.75,.6),
    c('crystalAssembly',.56,.17,-.55,.55,-.6,-.6,.58),c('goldLock',.64,.05,.25,.25,-.7,-.7,.36),
    c('crystalResonance',.69,.15,0,0,-.6,-.6,.38),c('energyTravel',.73,.10,-.75,.78,-.65,-.65,.44),
    c('shockwave',.79,.13,0,0,-.45,.65,.9),c('crystalSeparate',.88,.08,-.4,.5,-.5,.4,.35),
    c('particleTicks',.91,.065,-.65,.66,-.45,.5,.25),c('finalTink',.975,.018,0,0,-.65,-.65,.3)
  ],
  pulse:[
    c('air',.01,.16,0,0,-1.6,-1.1,.14),c('vineGrow',.12,.32,-.32,.35,-.8,-.65,.34),c('crystalAssembly',.19,.23,-.5,.5,-.9,-.65,.36),
    c('heartbeat',.29,.07,0,0,-.55,-.45,.58),c('pressure',.30,.09,0,0,-.5,.35,.28),
    c('heartbeat',.43,.075,0,0,-.48,-.38,.74),c('crystalRattle',.45,.09,-.6,.6,-.5,-.4,.28),
    c('heartbeat',.59,.085,0,0,-.38,-.24,.94),c('pressure',.60,.11,0,0,-.35,.5,.62),c('vineOpen',.67,.12,-.6,.6,-.7,-.55,.42),
    c('smallFlybys',.72,.15,-.9,.9,-.5,.25,.48),c('silence',.825,.035),c('heartbeat',.86,.095,0,0,-.24,-.12,1),
    c('shockwave',.87,.11,0,0,-.2,.7,.88),c('debris',.89,.09,-.9,.9,-.15,.5,.52),c('heartbeatSoft',.95,.025,0,0,-.7,-.7,.28),c('finalTink',.982,.015,.1,.1,-.8,-.8,.2)
  ],
  'lumen-bloom':[
    c('air',.01,.13,.1,.1,-1.5,-1.2,.14),c('seedFall',.08,.10,.28,.06,-1.2,-.5,.22),c('waterDrop',.18,.035,.04,.04,-.42,-.42,.48),c('waterRipple',.20,.12,0,0,-.55,-.5,.38),
    c('rootGrow',.26,.16,-.12,.1,-.9,-.7,.3),c('plantGrow',.34,.18,0,0,-.85,-.55,.34),c('petalFriction',.46,.22,-.5,.5,-.7,-.5,.42),
    c('petalClicks',.52,.18,-.55,.58,-.62,-.5,.4),c('chargedAir',.64,.16,0,0,-.75,-.45,.38),c('butterflies',.69,.19,-.7,.8,-.8,-.22,.34),
    c('petalWind',.74,.13,-.6,.6,-.55,-.3,.54),c('upRush',.81,.12,0,.12,-.55,.25,.7),c('fallingPetals',.89,.075,.6,-.5,-.4,.1,.3),c('butterflyClose',.955,.035,-.7,.45,-.55,-.12,.48),c('finalTink',.982,.012,.38,.38,-.18,-.18,.18)
  ],
  nova:[
    c('electricCrackle',.04,.13,0,0,-1.1,-.9,.22),c('pressureRumble',.13,.32,0,0,-1.5,-.7,.36),c('orbitalAir',.23,.26,-.8,.8,-.7,-.5,.42),
    c('crystalGrinding',.37,.18,-.45,.5,-.75,-.5,.45),c('formationCracks',.47,.13,-.5,.55,-.6,-.45,.4),c('gravityStress',.56,.17,0,0,-.7,-.35,.55),
    c('inwardWind',.66,.10,.8,-.8,-.2,-.7,.58),c('silence',.73,.06),c('supernovaPressure',.79,.13,0,0,-.3,.75,1),c('crystalFracture',.80,.12,-.2,.3,-.3,.35,.82),
    c('energyDischarge',.81,.10,-.5,.55,-.45,.5,.72),c('distantDebris',.88,.09,-.85,.85,.2,1.2,.32),c('rotatingAir',.94,.045,-.45,.45,-1,-1.3,.18)
  ],
  'dream-orbit':[
    c('energyVibration',.03,.19,0,0,-1.1,-.8,.28),c('goldFriction',.13,.17,-.55,.55,-.8,-.55,.4),c('planetForm',.24,.16,-.65,.72,-.7,-.55,.43),
    c('orbitPass',.34,.12,-.9,.9,-.55,-.18,.56),c('orbitPass',.46,.10,.85,-.85,-.5,-.16,.65),c('mechanicalFriction',.39,.25,-.5,.5,-.85,-.5,.32),
    c('turbulence',.53,.13,-.8,.8,-.45,-.22,.54),c('silence',.64,.045),c('coreCrack',.70,.025,-.15,-.15,-.5,-.5,.72),c('coreCrack',.75,.027,.12,.12,-.46,-.46,.82),c('coreCrack',.80,.032,-.05,-.05,-.4,-.4,.92),
    c('pressureLeak',.71,.14,-.2,.2,-.4,-.25,.46),c('pressureRelease',.84,.075,0,0,-.3,.35,.78),c('distantRumble',.86,.08,0,0,-1.8,-2.4,.3),c('inwardWind',.93,.035,.5,-.5,-.25,-.8,.5),c('energySnap',.972,.016,0,0,-.7,-.7,.3)
  ],
  aurora:[
    c('air',.03,.18,0,.1,-1.8,-.8,.2),c('goldDescend',.15,.19,-.45,.5,-1.1,-.4,.42),c('goldLock',.32,.07,-.55,-.2,-.55,-.45,.62),c('goldLock',.39,.07,.42,.1,-.5,-.42,.68),
    c('gemFly',.43,.10,-.9,-.2,-.8,-.3,.5),c('gemLock',.49,.04,-.1,-.1,-.35,-.35,.58),c('gemFly',.51,.10,.85,.2,-.8,-.28,.53),c('gemLock',.57,.04,.12,.12,-.3,-.3,.62),
    c('materialFriction',.59,.10,-.25,.3,-.45,-.3,.3),c('crownDrop',.66,.10,0,0,-.8,-.12,.84),c('airStop',.74,.07,0,0,-.14,.55,.8),c('crystalResonance',.76,.10,-.4,.4,-.4,-.3,.4),
    c('verticalRush',.83,.10,0,0,-.5,.35,.72),c('liquidMetal',.89,.07,-.4,.5,-.35,-.3,.5),c('gemFlyAway',.95,.035,-.35,.65,-.4,-1.7,.28)
  ],
  'celestial-wing':[
    c('singleFeather',.03,.12,.35,.25,-1.1,-.6,.16),c('featherBed',.13,.30,-.75,.78,-1.2,-.55,.3),c('featherConnect',.32,.15,-.7,.7,-.65,-.48,.32),c('goldArticulation',.40,.11,-.45,.48,-.65,-.45,.3),
    c('featherFriction',.48,.20,-.8,.8,-.7,-.38,.44),c('wingOpen',.56,.16,-.2,.2,-.6,-.25,.58),c('silence',.70,.035),
    c('giantFlap',.74,.14,-.9,.9,-.25,.45,1),c('wingPressure',.75,.16,0,0,-.18,.8,.88),c('cameraWind',.79,.13,-.2,.15,-.1,.95,.82),
    c('looseFeathers',.84,.11,-.85,.86,-.25,.45,.42),c('singleFeather',.95,.035,.55,.2,-.4,-.15,.24)
  ],
  'time-gate':[
    c('roomWarp',.03,.17,-.2,.25,-1.2,-.9,.2),c('dimensionalCrack',.18,.045,-.2,.1,-.7,-.55,.55),c('pressureLeak',.21,.13,-.2,.2,-.7,-.4,.4),
    c('portalMechanics',.29,.22,-.65,.65,-.75,-.48,.5),c('electricPulses',.38,.15,-.5,.55,-.6,-.45,.38),c('portalSurface',.48,.17,0,0,-.6,-.38,.46),
    c('boundaryPops',.56,.11,-.7,.72,-.5,-.28,.42),c('inwardWind',.61,.22,-.9,.9,-.15,-.65,.74),c('portalRumble',.64,.20,0,0,-.75,-.25,.62),
    c('portalSuction',.72,.15,.8,-.8,-.12,-.45,.9),c('pressure',.81,.10,0,0,-.25,.6,.82),c('muffle',.855,.045),c('snap',.90,.025,0,0,-.25,-.25,.72),
    c('collapseWhoomp',.92,.045,.2,-.2,-.1,-.85,.8),c('fastLocks',.94,.035,-.5,.52,-.55,-.6,.48),c('electricCrack',.976,.015,0,0,-.7,-.7,.25)
  ],
  cosmos:[
    c('embers',.02,.20,-.45,.48,-.9,-.62,.34),c('fire',.11,.23,-.55,.55,-.8,-.5,.48),c('vortexWind',.17,.19,-.85,.85,-.72,-.42,.48),c('muffledFire',.25,.10,0,0,-.8,-.6,.32),c('organicHeartbeat',.28,.055,0,0,-.75,-.6,.25),
    c('eggCrack',.34,.035,-.15,-.15,-.55,-.5,.62),c('eggCrack',.39,.045,.16,.16,-.5,-.44,.78),c('hotLeak',.40,.09,.12,.2,-.46,-.32,.54),c('shellBurst',.45,.09,-.25,.28,-.4,.35,.9),c('fireEruption',.455,.12,0,0,-.35,.45,.76),
    c('phoenixCry',.51,.12,-.15,.25,-.45,-.22,.9),c('wingOpen',.57,.09,-.65,.65,-.4,-.22,.6),c('fire',.58,.13,-.5,.5,-.4,-.24,.55),c('giantFlap',.63,.10,-.75,.78,-.22,.45,.92),
    c('flightWing',.68,.075,-.8,.55,-.7,-.28,.58),c('flightWing',.74,.07,.65,-.75,-.62,-.24,.64),c('phoenixCry',.77,.07,.7,.05,-.55,-.25,.54),c('cameraWingRush',.80,.10,-.8,.92,-.12,.42,1),c('crystalRattle',.81,.09,-.75,.82,-.2,.25,.4),
    c('hoverFlaps',.85,.075,-.35,.35,-.3,-.18,.7),c('inwardFire',.895,.035,.55,-.5,-.2,-.48,.6),c('silence',.925,.018),c('fireRelease',.945,.09,0,0,-.2,.65,1),c('crystalDebris',.95,.055,-.9,.9,-.15,.6,.7),
    c('embers',.972,.022,-.25,.3,-.55,-.8,.22),c('babyPhoenix',.982,.012,.05,.05,-.65,-.65,.18),c('flameCrackle',.992,.007,.1,.1,-.72,-.72,.14)
  ],
  'infinite-sylora':[
    c('sphereSharp',.03,.12,-.7,.7,-.9,-.5,.3),c('sphereDense',.05,.12,.7,-.7,-1,-.55,.3),c('dualOrbit',.16,.25,-.9,.9,-.7,-.2,.52),c('crystalTrails',.24,.22,-.75,.78,-.65,-.3,.34),
    c('goldStructure',.37,.20,-.6,.62,-.8,-.48,.45),c('crystalTension',.46,.18,0,0,-.7,-.4,.4),c('gemLocks',.53,.12,-.55,.58,-.55,-.38,.34),c('rapidPasses',.61,.16,-.95,.95,-.48,-.12,.76),
    c('structureStress',.69,.12,0,0,-.5,-.22,.54),c('silence',.79,.032),c('infinityImpact',.83,.09,0,0,-.18,.45,.95),c('splitWave',.845,.10,0,0,-.3,.3,.68),c('cameraExpansion',.88,.08,0,0,-.3,.7,.8),
    c('particleTicks',.93,.05,-.7,.72,-.3,.5,.3),c('finalApproach',.972,.015,-.25,.25,-.5,-.35,.16),c('finalTink',.988,.010,0,0,-.4,-.4,.22)
  ]
};

export const FORBIDDEN_AUDIO_CUE_TYPES=new Set(['music','score','song','choir','melody','note','fanfare']);

// Number of simultaneous physical bands used for events that must carry mass + material + air detail.
export const FOLEY_LAYERING=Object.freeze({
  crystalFracture:4,pressure:2,shockwave:3,heartbeat:3,supernovaPressure:4,pressureRelease:3,
  crownDrop:2,airStop:2,giantFlap:4,wingPressure:3,portalRumble:2,portalSuction:3,
  collapseWhoomp:3,shellBurst:4,fireEruption:3,phoenixCry:3,cameraWingRush:4,fireRelease:4,
  infinityImpact:4,cameraExpansion:3
});

// Material actions made from multiple small contacts. The engine scatters these in time and 3D space.
export const FOLEY_SCATTER=Object.freeze({
  crystalFracture:7,debris:8,crystalAssembly:9,particleTicks:8,crystalRattle:7,smallFlybys:6,
  petalClicks:7,butterflies:7,formationCracks:5,distantDebris:6,planetForm:5,coreCrack:3,
  gemFly:4,gemLock:4,gemFlyAway:5,featherConnect:7,looseFeathers:9,electricPulses:6,
  boundaryPops:6,fastLocks:6,embers:8,eggCrack:4,crystalDebris:9,gemLocks:7,crystalTrails:8
});

// Shared visual/audio anchor points. GPU and Canvas motion use these same normalized moments.
export const GIFT_SYNC=Object.freeze({
  pulse:{beats:[.29,.43,.59,.86]},
  nova:{pull:.66,silence:.73,bloom:.79},
  'dream-orbit':{stop:.64,cracks:[.70,.75,.80],open:.84,collapse:.93},
  'celestial-wing':{open:.56,calm:.70,flap:.74,wind:.79},
  'time-gate':{suction:.72,wave:.81,collapse:.92},
  cosmos:{hatch:.34,cry:.51,flaps:[.63,.68,.74,.80,.85],release:.945},
  'infinite-sylora':{silence:.79,impact:.83,expand:.88,dissolve:.93}
});
