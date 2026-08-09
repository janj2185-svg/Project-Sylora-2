import * as THREE from 'three';
import {StoryGraph} from './story-graph.js';
import {ShotDirector} from './shot-director.js';

const TAU=Math.PI*2;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ease=n=>{n=clamp(n);return 1-(1-n)**3};
const pulse=(time,at,width=.22)=>Math.exp(-(((time-at)/width)**2)*4.2);

export const PHOENIX_REBIRTH_DURATION=10;

export const PHOENIX_V3_KEYFRAMES=Object.freeze([
  Object.freeze({id:'phoenix-v3-seed',url:'/assets/phoenix-v3/01-seed.png',at:.65}),
  Object.freeze({id:'phoenix-v3-emergence',url:'/assets/phoenix-v3/02-emergence.png',at:2.55}),
  Object.freeze({id:'phoenix-v3-flight',url:'/assets/phoenix-v3/03-flight.png',at:5.15}),
  Object.freeze({id:'phoenix-v3-climax',url:'/assets/phoenix-v3/04-climax.png',at:7.75}),
  Object.freeze({id:'phoenix-v3-rebirth',url:'/assets/phoenix-v3/05-rebirth.png',at:9.32})
]);

export const PHOENIX_QUALITY_PROFILES=Object.freeze({
  HIGH:Object.freeze({farEmbers:220,lensEmbers:54,heroFlames:170,burstParticles:190,heroScale:1,pixelRatio:1.75}),
  MEDIUM:Object.freeze({farEmbers:144,lensEmbers:34,heroFlames:118,burstParticles:128,heroScale:.98,pixelRatio:1.35}),
  LOW:Object.freeze({farEmbers:84,lensEmbers:18,heroFlames:72,burstParticles:76,heroScale:.94,pixelRatio:1})
});

export function phoenixQualityForDevice({deviceMemory=8,hardwareConcurrency=8,reducedMotion=false}={}){
  if(reducedMotion||deviceMemory<=4||hardwareConcurrency<=4)return'LOW';
  if(deviceMemory<=6||hardwareConcurrency<=6)return'MEDIUM';
  return'HIGH';
}

export function phoenixFramingForAspect(aspect=16/9){
  if(aspect<.72)return Object.freeze({mode:'portrait',heroScale:.72,cameraZOffset:1.35,cameraYOffset:.18});
  if(aspect<1.18)return Object.freeze({mode:'compact',heroScale:.84,cameraZOffset:.72,cameraYOffset:.1});
  return Object.freeze({mode:'wide',heroScale:1,cameraZOffset:0,cameraYOffset:0});
}

export const PHOENIX_REBIRTH_EVENTS=Object.freeze([
  {at:.35,type:'PRESSURE_CHANGE',deltaPressure:.55,position:{x:0,y:-1.1,z:-2.4}},
  {at:1.05,type:'MATERIAL_CONTACT',material:'fire',position:{x:0,y:-.8,z:-1.8},impactForce:.7,mass:.15},
  {at:1.68,type:'PRESSURE_CHANGE',deltaPressure:1.25,position:{x:0,y:-.45,z:-1.1}},
  {at:2.12,type:'PHYSICS_IMPACT',material:'crystal',position:{x:.12,y:-.25,z:-.8},impactForce:8.5,mass:1.8},
  {at:2.48,type:'CREATURE_VOICE',position:{x:.1,y:.15,z:-.7},impactForce:4.5},
  {at:3.38,type:'WING_FLAP',material:'feather',position:{x:-.3,y:.45,z:-1.2},velocity:{x:0,y:1.2,z:3.8},mass:3.2},
  {at:4.08,type:'MATERIAL_CONTACT',material:'fire',position:{x:.3,y:.28,z:-1.6},impactForce:2.4,mass:.35},
  {at:4.55,type:'WING_FLAP',material:'feather',position:{x:.65,y:.35,z:-2.1},velocity:{x:2.2,y:.4,z:5.1},mass:3.2},
  {at:5.24,type:'PRESSURE_CHANGE',deltaPressure:2.8,position:{x:-.5,y:.18,z:-.8}},
  {at:5.58,type:'STREAM_INTERACTION',effect:'heat',energy:.5,duration:1.1,position:{x:-.4,y:.1,z:-.4}},
  {at:5.86,type:'PRESSURE_CHANGE',deltaPressure:2.15,position:{x:.28,y:.14,z:-.3}},
  {at:6.35,type:'WING_FLAP',material:'feather',position:{x:1.05,y:.1,z:.15},velocity:{x:-3.8,y:.2,z:7.2},mass:3.2},
  {at:7.12,type:'PRESSURE_CHANGE',material:'fire',deltaPressure:-7.8,position:{x:0,y:.2,z:-.25}},
  {at:7.42,type:'LIGHT_CHANGE',energy:.86,duration:.75,color:'#E8D9FF',position:{x:0,y:.15,z:-.1}},
  {at:7.72,type:'PHYSICS_IMPACT',material:'fire',impactForce:18,mass:4.2,position:{x:0,y:.2,z:.1}},
  {at:7.76,type:'HAPTIC',profile:'climax',position:{x:0,y:.2,z:.1}},
  {at:7.82,type:'STREAM_INTERACTION',effect:'heat',energy:.92,duration:.82,position:{x:0,y:.2,z:.05}},
  {at:8.22,type:'MATERIAL_CONTACT',material:'fire',position:{x:.15,y:.05,z:-.2},impactForce:4.8,mass:.55},
  {at:8.55,type:'MATERIAL_CONTACT',material:'fire',position:{x:-.45,y:-.1,z:-1},impactForce:1.2,mass:.2},
  {at:9.18,type:'CREATURE_VOICE',position:{x:.15,y:-.35,z:-1.8},impactForce:.42},
  {at:9.48,type:'MATERIAL_CONTACT',material:'fire',position:{x:.35,y:-.65,z:-2.5},impactForce:.18,mass:.05}
]);

export const PHOENIX_REBIRTH_V2=Object.freeze({
  id:'phoenix-rebirth',
  legacyId:'cosmos',
  name:'Phoenix Rebirth',
  tier:'legendary',
  duration:PHOENIX_REBIRTH_DURATION,
  climaxType:'inward-fire-release',
  endingType:'embers-newborn-chirp',
  streamDepthInteraction:true,
  audioLabels:['embers','hot-air','crystal-shell','feather-air','creature-voice','fire-pressure'],
  renderStyle:'cinematic-keyframe-v3',
  assets:Object.freeze(PHOENIX_V3_KEYFRAMES.map(frame=>Object.freeze({id:frame.id,url:frame.url,type:'binary',critical:true}))),
  story:new StoryGraph({id:'phoenix-rebirth',duration:PHOENIX_REBIRTH_DURATION,beats:[
    {id:'ember-breath',fn:'intrigue',at:0,duration:1.4,channels:['environment','particles','audio']},
    {id:'egg-condensation',fn:'arrival',at:.85,duration:1.65,channels:['material','camera','audio']},
    {id:'hatch-and-form',fn:'transformation',at:2.0,duration:2.25,channels:['physics','animation','light','audio']},
    {id:'first-flight',fn:'motion',at:3.35,duration:2.75,channels:['animation','camera','particles','audio']},
    {id:'stream-crossing',fn:'worldInteraction',at:5.25,duration:2.55,channels:['stream','light','camera','audio']},
    {id:'inward-fire-release',fn:'climax',at:7.05,duration:1.75,channels:['physics','light','stream','audio']},
    {id:'ash-and-newborn',fn:'exit',at:8.35,duration:1.65,channels:['particles','environment','audio']}
  ]}),
  shots:new ShotDirector([
    {type:'macro',at:0,duration:1.45,motivation:'read individual embers before the creature exists'},
    {type:'dolly-in',at:1.45,duration:1.15,motivation:'enter the condensing shell and make the hatch feel inevitable'},
    {type:'hero-low',at:2.6,duration:1.4,motivation:'give the newborn phoenix scale as the wings articulate'},
    {type:'subject-orbit',at:4.0,duration:1.55,motivation:'show independent wing and tail inertia during acceleration'},
    {type:'boundary-cross',at:5.55,duration:1.05,motivation:'move the creature behind the streamer before it crosses forward'},
    {type:'near-camera',at:6.6,duration:1.05,motivation:'make a wing pass displace the virtual lens and foreground air'},
    {type:'impact-response',at:7.65,duration:.95,motivation:'let the camera absorb the physical fire-release climax'},
    {type:'wide-reveal',at:8.6,duration:1.4,motivation:'leave room for ash decay and the tiny rebirth signal'}
  ])
});

const crystalMaterial=()=>new THREE.MeshPhysicalMaterial({color:'#FFE2A8',metalness:.04,roughness:.16,transmission:.28,thickness:.48,ior:1.5,clearcoat:1,clearcoatRoughness:.06,emissive:'#FF7A24',emissiveIntensity:.34,transparent:true,opacity:.94,side:THREE.DoubleSide});
const goldMaterial=()=>new THREE.MeshPhysicalMaterial({color:'#FFD98C',metalness:.34,roughness:.24,clearcoat:.92,clearcoatRoughness:.1,emissive:'#FF6B16',emissiveIntensity:.72,side:THREE.DoubleSide});
const fireMaterial=()=>new THREE.MeshStandardMaterial({color:'#FFB347',roughness:.38,metalness:.04,emissive:'#FF3D08',emissiveIntensity:1.75,transparent:true,opacity:.97,side:THREE.DoubleSide});
const emberPointsMaterial=(color='#FF7A24',size=.055,opacity=.82)=>new THREE.PointsMaterial({color,size,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true});

function featherGeometry(length=.9,width=.18){
  const shape=new THREE.Shape();shape.moveTo(0,0);shape.bezierCurveTo(width*.78,length*.15,width*.64,length*.62,0,length);shape.bezierCurveTo(-width*.5,length*.66,-width*.7,length*.18,0,0);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.022,bevelEnabled:true,bevelSegments:2,bevelSize:.012,bevelThickness:.01,curveSegments:5});geometry.translate(0,0,-.011);return geometry;
}

function makeFeather(length,width,material,name='phoenix-feather'){
  const feather=new THREE.Mesh(featherGeometry(length,width),material);feather.name=name;return feather;
}

export function buildPhoenixRig(){
  const phoenix=new THREE.Group();phoenix.name='phoenix-rebirth-hero';phoenix.userData.phoenixV2=true;
  const crystal=crystalMaterial(),gold=goldMaterial(),fire=fireMaterial();
  const body=new THREE.Mesh(new THREE.SphereGeometry(.38,30,24),fire);body.name='phoenix-body';body.position.y=-.02;body.scale.set(.72,1.42,.68);phoenix.add(body);
  const chest=new THREE.Mesh(new THREE.SphereGeometry(.34,30,22),gold);chest.name='phoenix-chest';chest.position.set(0,.31,.04);chest.scale.set(.92,1.13,.72);phoenix.add(chest);
  const chestCore=new THREE.Mesh(new THREE.SphereGeometry(.22,24,18),new THREE.MeshBasicMaterial({color:'#FFF4C7',transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));chestCore.name='phoenix-fire-core';chestCore.position.set(0,.28,.16);phoenix.add(chestCore);
  const neck=new THREE.Mesh(new THREE.SphereGeometry(.19,24,18),fire);neck.name='phoenix-neck';neck.position.set(0,.7,.02);neck.scale.set(.72,1.55,.72);phoenix.add(neck);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.22,28,20),gold);head.name='phoenix-head';head.position.set(0,.98,.04);head.scale.set(.88,1,.88);phoenix.add(head);
  const beak=new THREE.Mesh(new THREE.ConeGeometry(.105,.34,12),crystal);beak.name='phoenix-beak';beak.position.set(0,.96,.27);beak.rotation.x=Math.PI/2;phoenix.add(beak);
  for(const side of[-1,1]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.035,12,10),new THREE.MeshBasicMaterial({color:'#FFF6CB'}));eye.position.set(side*.085,1.03,.205);eye.name=side<0?'phoenix-eye-left':'phoenix-eye-right';phoenix.add(eye)}
  for(let i=-2;i<=2;i++){const crest=makeFeather(.32+Math.abs(i)*.035,.055,fire,`phoenix-crest-${i+2}`);crest.position.set(i*.055,1.12,.015);crest.rotation.z=-i*.13;phoenix.add(crest)}
  for(const side of[-1,1]){
    const wing=new THREE.Group();wing.name=side<0?'phoenix-wing-left':'phoenix-wing-right';wing.userData.wingSide=side;
    const mantle=new THREE.Mesh(new THREE.SphereGeometry(.42,24,16),fire);mantle.position.set(side*.3,.35,-.02);mantle.scale.set(1.45,.42,.35);wing.add(mantle);
    for(let i=0;i<18;i++){
      const q=i/17,length=.72+q*.82+Math.sin(q*Math.PI)*.2,width=.13+(1-q)*.08,material=i%5===0?gold:i%3===0?fire:crystal,feather=makeFeather(length,width,material,`phoenix-wing-feather-${side}-${i}`);
      feather.position.set(side*(.2+q*1.52),.4+Math.sin(q*Math.PI)*.22-q*.18,-.02-q*.035);feather.rotation.z=side*(-Math.PI/2+.24-q*.28);feather.rotation.x=(q-.5)*.08;feather.userData.featherIndex=i;feather.userData.baseZ=feather.rotation.z;feather.userData.baseX=feather.rotation.x;wing.add(feather);
    }
    phoenix.add(wing);
  }
  for(let i=0;i<9;i++){
    const q=(i-4)/4,tail=makeFeather(1.12+(1-Math.abs(q))*.52,.12+(1-Math.abs(q))*.07,i%3===0?gold:i%2?fire:crystal,`phoenix-tail-${i}`);tail.userData.tailPhase=i*.62;tail.position.set(q*.27,-.48,-.1-Math.abs(q)*.035);tail.rotation.z=Math.PI-q*.2;tail.rotation.x=q*.05;tail.userData.baseZ=tail.rotation.z;phoenix.add(tail);
  }
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.39,.018,8,48),new THREE.MeshBasicMaterial({color:'#FFD979',transparent:true,opacity:.52,blending:THREE.AdditiveBlending,depthWrite:false}));halo.name='phoenix-halo';halo.position.set(0,.28,-.14);phoenix.add(halo);
  phoenix.scale.setScalar(.001);return phoenix;
}

const buildEmberField=(count=180)=>{
  const positions=new Float32Array(count*3),seed=new Float32Array(count);
  for(let i=0;i<count;i++){const q=(i+.5)/count,a=q*TAU*8.73,r=.25+(i%23)/23*3.6,j=i*3;positions[j]=Math.cos(a)*r;positions[j+1]=-1.5+(i%37)/37*3.4;positions[j+2]=-2.8+(i%19)/19*4.2;seed[i]=q}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const points=new THREE.Points(geometry,emberPointsMaterial('#FF8B38',.052,.78));points.userData.seed=seed;points.userData.base=new Float32Array(positions);return points;
};

const buildShell=()=>{
  const shell=new THREE.Group();shell.name='phoenix-egg-shell';shell.position.y=-.38;
  const inner=new THREE.Mesh(new THREE.SphereGeometry(.48,28,20),new THREE.MeshBasicMaterial({color:'#FF7A22',transparent:true,opacity:.66,blending:THREE.AdditiveBlending,depthWrite:false}));inner.name='phoenix-egg-fire-core';inner.scale.set(.78,1.18,.78);shell.add(inner);
  for(let i=0;i<10;i++){const angle=i*TAU/10,material=crystalMaterial();material.opacity=.9;const shard=new THREE.Mesh(new THREE.SphereGeometry(.73,18,16,angle,TAU/10+.045,0,Math.PI),material);shard.scale.set(.79,1.1,.79);shard.userData.shardAngle=angle;shard.userData.shardIndex=i;shell.add(shard)}
  return shell;
};

const buildPhoenixFlameField=(count=140)=>{
  const positions=new Float32Array(count*3),seed=new Float32Array(count);for(let i=0;i<count;i++){const s=(i+.5)/count,a=s*TAU*11.7,r=.1+(i%17)/17*.5,j=i*3;positions[j]=Math.cos(a)*r;positions[j+1]=-.52+(i%29)/29*1.65;positions[j+2]=-.15+Math.sin(a)*r*.45;seed[i]=s}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const points=new THREE.Points(geometry,emberPointsMaterial('#FF5A18',.078,.88));points.name='phoenix-living-fire';points.userData.seed=seed;points.userData.base=new Float32Array(positions);return points;
};

const buildRadialBurst=(count=160)=>{
  const positions=new Float32Array(count*3),direction=new Float32Array(count*3),speed=new Float32Array(count);for(let i=0;i<count;i++){const s=(i+.5)/count,a=s*TAU*13.37,elevation=-.8+(i%31)/30*1.6,j=i*3,r=Math.sqrt(Math.max(.05,1-elevation*elevation));direction[j]=Math.cos(a)*r;direction[j+1]=elevation;direction[j+2]=Math.sin(a)*r;speed[i]=.7+(i%19)/19*2.1}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const points=new THREE.Points(geometry,emberPointsMaterial('#FFD66E',.072,0));points.name='phoenix-climax-burst';points.userData.direction=direction;points.userData.speed=speed;return points;
};

const buildNewborn=()=>{const group=new THREE.Group();group.name='phoenix-newborn';const glow=new THREE.Mesh(new THREE.SphereGeometry(.11,18,14),new THREE.MeshBasicMaterial({color:'#FFF0A5',transparent:true,opacity:.92,blending:THREE.AdditiveBlending,depthWrite:false}));group.add(glow);for(const side of[-1,1]){const wing=makeFeather(.3,.075,fireMaterial(),`newborn-wing-${side}`);wing.userData.newbornWing=side;wing.rotation.z=side*(-Math.PI/2+.18);wing.position.x=side*.06;group.add(wing)}group.visible=false;group.scale.setScalar(.001);return group};

export class PhoenixRebirthPresenter{
  constructor({quality=null}={}){this.phoenix=null;this.shell=null;this.embers=null;this.lensEmbers=null;this.heroFire=null;this.climaxBurst=null;this.climaxRing=null;this.newborn=null;this.lights=[];this.nextCue=0;this.plane='behind-streamer';this.mounted=false;this.quality=quality}
  mount(definition,controller){
    const navigatorLike=globalThis.navigator||{},quality=this.quality||phoenixQualityForDevice({deviceMemory:navigatorLike.deviceMemory,hardwareConcurrency:navigatorLike.hardwareConcurrency,reducedMotion:controller.accessibility?.reducedMotion}),profile=PHOENIX_QUALITY_PROFILES[quality]||PHOENIX_QUALITY_PROFILES.HIGH;
    this.quality=quality;this.profile=profile;this.definition=definition;this.controller=controller;this.nextCue=0;this.phoenix=buildPhoenixRig();this.shell=buildShell();this.embers=buildEmberField(profile.farEmbers);this.lensEmbers=buildEmberField(profile.lensEmbers);this.heroFire=buildPhoenixFlameField(profile.heroFlames);this.climaxBurst=buildRadialBurst(profile.burstParticles);this.newborn=buildNewborn();this.climaxRing=new THREE.Mesh(new THREE.TorusGeometry(.72,.028,10,72),new THREE.MeshBasicMaterial({color:'#FFD56A',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));this.climaxRing.name='phoenix-fire-release-ring';this.climaxRing.visible=false;this.phoenix.add(this.heroFire);this.lensEmbers.scale.setScalar(1.7);
    if(controller.renderer.pixelRatio>profile.pixelRatio){controller.renderer.pixelRatio=profile.pixelRatio;controller.renderer.resize()}
    controller.renderer.add(this.embers,'far');controller.renderer.add(this.shell,'front-streamer');controller.renderer.add(this.phoenix,'behind-streamer');controller.renderer.add(this.climaxBurst,'front-streamer');controller.renderer.add(this.climaxRing,'front-streamer');controller.renderer.add(this.newborn,'front-streamer');controller.renderer.add(this.lensEmbers,'lens');
    for(const plane of['far','behind-streamer','front-streamer','lens']){const warm=new THREE.PointLight('#FF8A35',plane==='lens'?2.8:6.4,14,1.8);warm.position.set(1.6,2.2,3.8);const fill=new THREE.HemisphereLight('#FFF0D2','#40121A',1.65);controller.renderer.add(warm,plane);controller.renderer.add(fill,plane);this.lights.push(warm,fill)}
    this.mounted=true;
  }
  prepare(){return this}
  emitDue(time){while(this.nextCue<PHOENIX_REBIRTH_EVENTS.length&&PHOENIX_REBIRTH_EVENTS[this.nextCue].at<=time){const cue=PHOENIX_REBIRTH_EVENTS[this.nextCue++];const {at,type,...payload}=cue;this.controller.runtime.events.emit(type,payload,at)}}
  setPlane(plane){if(this.plane===plane)return;this.plane=plane;this.controller.renderer.add(this.phoenix,plane)}
  animateEmbers(time){for(const field of[this.embers,this.lensEmbers]){const attr=field.geometry.attributes.position,arr=attr.array,base=field.userData.base,seed=field.userData.seed;for(let i=0;i<seed.length;i++){const j=i*3,s=seed[i],curl=time*(.3+s*.7)+s*TAU*5;arr[j]=base[j]+Math.sin(curl)*(.12+s*.18);arr[j+1]=base[j+1]+((time*(.12+s*.22)+s*2)%2.8);arr[j+2]=base[j+2]+Math.cos(curl*.8)*.1}attr.needsUpdate=true}}
  animateHeroFire(time,inward=0,release=0){const field=this.heroFire,attr=field.geometry.attributes.position,arr=attr.array,base=field.userData.base,seed=field.userData.seed,collapse=1-inward*.78;for(let i=0;i<seed.length;i++){const j=i*3,s=seed[i],curl=time*(2.4+s*2.2)+s*TAU*7;arr[j]=base[j]*collapse+Math.sin(curl)*(.025+s*.06)*(1-inward);arr[j+1]=base[j+1]*collapse+((time*(.18+s*.34)+s)%1.1)*.16+release*(.15+s*.45);arr[j+2]=base[j+2]*collapse+Math.cos(curl*.7)*.035}attr.needsUpdate=true;field.material.opacity=.5+release*.44}
  animateBurst(time){const progress=clamp((time-7.68)/.88),attr=this.climaxBurst.geometry.attributes.position,arr=attr.array,direction=this.climaxBurst.userData.direction,speed=this.climaxBurst.userData.speed;for(let i=0;i<speed.length;i++){const j=i*3,d=progress*speed[i]*1.45;arr[j]=direction[j]*d;arr[j+1]=direction[j+1]*d;arr[j+2]=direction[j+2]*d}attr.needsUpdate=true;this.climaxBurst.material.opacity=progress>0&&progress<1?Math.sin(progress*Math.PI)*.96:0}
  update(state,controller){
    const t=state.time;this.emitDue(t);this.animateEmbers(t);
    const hatch=ease((t-1.72)/1.05),form=ease((t-2.12)/1.48),flight=ease((t-3.3)/2.45),inward=ease((t-7.05)/.58)*(1-ease((t-7.64)/.12)),release=ease((t-7.65)/.42),climax=pulse(t,7.76,.42),decay=ease((t-8.28)/1.22);
    this.animateHeroFire(t,inward,release);this.animateBurst(t);
    this.shell.visible=t<3.18;this.shell.rotation.y=t*.3;this.shell.rotation.z=Math.sin(t*2.7)*.018;for(const piece of this.shell.children){if(piece.userData.shardAngle===undefined){piece.scale.setScalar(1+hatch*.32);piece.material.opacity=.66*(1-hatch*.8);continue}const a=piece.userData.shardAngle,force=hatch*(.55+(piece.userData.shardIndex%4)*.11);piece.position.set(Math.cos(a)*force,Math.sin(a)*force*.7,force*.22);piece.rotation.x=hatch*Math.sin(a)*.75;piece.rotation.y=hatch*Math.cos(a)*.9;piece.material.opacity=.9-hatch*.68}
    const framing=phoenixFramingForAspect(controller.renderer.camera.aspect),adaptiveScale=this.profile.heroScale*framing.heroScale;
    this.phoenix.visible=t>=2.02&&t<8.9;this.phoenix.scale.setScalar(Math.max(.001,.1+form*.76+flight*.18+climax*.26-decay*.46)*adaptiveScale);
    this.phoenix.position.set(Math.sin(flight*TAU*1.05)*(1-flight)*1.05,-.65+form*.84+Math.sin(t*1.65)*.075,flight>.64?ease((flight-.64)/.36)*1.25:0);
    this.phoenix.rotation.y=Math.sin(flight*TAU)*.28;this.phoenix.rotation.z=Math.sin(t*1.4)*.045;
    const flap=.08+pulse(t,3.38,.24)*.54+pulse(t,4.55,.24)*.48+pulse(t,6.35,.2)*.68-inward*.22;
    for(const child of this.phoenix.children){if(child.userData.wingSide){child.rotation.z=child.userData.wingSide*flap;for(const feather of child.children){if(feather.userData.featherIndex!==undefined){feather.rotation.z=feather.userData.baseZ+child.userData.wingSide*Math.sin(t*3.5+feather.userData.featherIndex*.21)*.025;feather.rotation.x=feather.userData.baseX+Math.sin(t*4.1+feather.userData.featherIndex*.3)*.035}}}if(child.userData.tailPhase!==undefined)child.rotation.z=child.userData.baseZ+Math.sin(t*3.25+child.userData.tailPhase)*.11}
    if(t<5.55)this.setPlane('behind-streamer');else if(t<8.3)this.setPlane('front-streamer');
    this.climaxBurst.position.copy(this.phoenix.position);this.climaxRing.position.copy(this.phoenix.position);this.climaxRing.visible=t>7.5&&t<8.62;const ring=ease((t-7.58)/.72);this.climaxRing.scale.setScalar(.22+ring*3.4);this.climaxRing.material.opacity=ring<1?Math.sin(ring*Math.PI)*.9:0;
    const rebirth=ease((t-9.02)/.55);this.newborn.visible=t>=9.02;this.newborn.position.set(.06,-.18+rebirth*.34+Math.sin(t*4)*.025,-.1);this.newborn.scale.setScalar(Math.max(.001,rebirth*(.8+.08*Math.sin(t*5))));for(const child of this.newborn.children)if(child.userData.newbornWing)child.rotation.z=child.userData.newbornWing*(-Math.PI/2+.18+Math.sin(t*9)*.22);
    const camera=controller.renderer.camera,shot=state.shot?.type;
    const paths={
      'macro':[0,-.35,5.8],'dolly-in':[.1,-.15,5.25],'hero-low':[-.28,-.45,6.2],'subject-orbit':[Math.sin(t*.72)*1.05,.12,6.45],'boundary-cross':[-.72,.08,6.05],'near-camera':[.62,-.02,5.15],'impact-response':[Math.sin((t-7.65)*20)*.07,Math.cos((t-7.65)*17)*.04,5.85],'wide-reveal':[0,.12,7.25]
    },p=paths[shot]||[0,0,7];camera.position.set(p[0],p[1]+framing.cameraYOffset,p[2]+framing.cameraZOffset);camera.lookAt(0,framing.cameraYOffset*.35,0);
    this.embers.material.opacity=.2+.58*(1-decay);this.lensEmbers.material.opacity=t>5.65&&t<8.7?.82:.1;
  }
  streamInteraction(state){const t=state.time,climax=pulse(t,7.76,.44),near=pulse(t,6.35,.34);return{exposure:1+climax*.34,tint:climax>.12?'#FF9A45':'#FFF1DD',heat:clamp(pulse(t,5.8,.8)*.38+climax*.82),heatPhase:t*10,rimStrength:.15+climax*.31,pressure:clamp(near*.05+climax*.07,0,.078),pressureCenter:{x:.5,y:.44},volumetric:clamp(.14+climax*.82),volumetricCenter:{x:.5,y:.4},volumetricColor:'#FF9A45'} }
  unmount(controller){if(!this.mounted)return;const roots=[this.phoenix,this.shell,this.embers,this.climaxBurst,this.climaxRing,this.newborn,this.lensEmbers,...this.lights].filter(Boolean);for(const object of roots)controller.renderer.remove(object);const geometries=new Set(),materials=new Set();for(const root of roots)root.traverse?.(node=>{if(node.geometry)geometries.add(node.geometry);if(Array.isArray(node.material))node.material.forEach(x=>materials.add(x));else if(node.material)materials.add(node.material)});for(const geometry of geometries)geometry.dispose?.();for(const material of materials)material.dispose?.();this.mounted=false}
  dispose(){this.phoenix=null;this.shell=null;this.embers=null;this.lensEmbers=null;this.heroFire=null;this.climaxBurst=null;this.climaxRing=null;this.newborn=null;this.lights=[]}
}

const V3_KEY_VERTEX=`
varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
`;

const V3_KEY_FRAGMENT=`
precision highp float;
varying vec2 vUv;
uniform sampler2D map;
uniform float opacity;
void main(){
  vec4 tex=texture2D(map,vUv);
  float luminance=max(tex.r,max(tex.g,tex.b));
  float keyed=smoothstep(.012,.105,luminance);
  float alpha=keyed*opacity;
  if(alpha<.004)discard;
  gl_FragColor=vec4(tex.rgb,alpha);
}
`;

const buildV3Placeholder=()=>{const data=new Uint8Array([0,0,0,255]),texture=new THREE.DataTexture(data,1,1,THREE.RGBAFormat);texture.needsUpdate=true;return texture};

const buildV3FrameMaterial=map=>new THREE.ShaderMaterial({
  vertexShader:V3_KEY_VERTEX,
  fragmentShader:V3_KEY_FRAGMENT,
  uniforms:{map:{value:map},opacity:{value:0}},
  transparent:true,
  depthTest:false,
  depthWrite:false,
  toneMapped:false,
  side:THREE.DoubleSide
});

async function decodeV3Texture(buffer){
  const blob=new Blob([buffer],{type:'image/png'});
  let source=null;
  if(typeof createImageBitmap==='function')source=await createImageBitmap(blob);
  else source=await new Promise((resolve,reject)=>{const url=URL.createObjectURL(blob),image=new Image();image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};image.onerror=error=>{URL.revokeObjectURL(url);reject(error)};image.src=url});
  const texture=new THREE.Texture(source);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;return texture;
}

function v3FrameWeights(time){
  const weights=new Array(PHOENIX_V3_KEYFRAMES.length).fill(0),boundaries=[1.72,3.88,6.62,8.68],half=.38;
  let index=boundaries.findIndex(boundary=>time<boundary);if(index<0)index=boundaries.length;
  weights[index]=1;
  for(let i=0;i<boundaries.length;i++){
    const boundary=boundaries[i];if(time<boundary-half||time>boundary+half)continue;
    const n=clamp((time-(boundary-half))/(half*2)),blend=n*n*(3-2*n);weights.fill(0);weights[i]=1-blend;weights[i+1]=blend;break;
  }
  return weights;
}

export class PhoenixRebirthV3Presenter{
  constructor({quality=null}={}){this.quality=quality;this.profile=null;this.definition=null;this.controller=null;this.frameGroup=null;this.frameMeshes=[];this.textures=[];this.placeholder=null;this.nextCue=0;this.plane='behind-streamer';this.mounted=false}
  mount(definition,controller){
    const navigatorLike=globalThis.navigator||{},quality=this.quality||phoenixQualityForDevice({deviceMemory:navigatorLike.deviceMemory,hardwareConcurrency:navigatorLike.hardwareConcurrency,reducedMotion:controller.accessibility?.reducedMotion}),profile=PHOENIX_QUALITY_PROFILES[quality]||PHOENIX_QUALITY_PROFILES.HIGH;
    this.quality=quality;this.profile=profile;this.definition=definition;this.controller=controller;this.nextCue=0;this.placeholder=buildV3Placeholder();this.frameGroup=new THREE.Group();this.frameGroup.name='phoenix-v3-cinematic-keyframes';
    const geometry=new THREE.PlaneGeometry(2.64,4.7);
    this.frameMeshes=PHOENIX_V3_KEYFRAMES.map((frame,index)=>{const material=buildV3FrameMaterial(this.placeholder),mesh=new THREE.Mesh(geometry,material);mesh.name=frame.id;mesh.userData.frameIndex=index;mesh.renderOrder=index;this.frameGroup.add(mesh);return mesh});
    if(controller.renderer.pixelRatio>profile.pixelRatio){controller.renderer.pixelRatio=profile.pixelRatio;controller.renderer.resize()}
    controller.renderer.add(this.frameGroup,'behind-streamer');this.mounted=true;
  }
  async prepare(controller=this.controller){
    const textures=await Promise.all(PHOENIX_V3_KEYFRAMES.map(async(frame,index)=>{const buffer=controller.assets.get(frame.id);if(!buffer)throw new Error(`Phoenix V3 keyframe missing after preflight: ${frame.id}`);const texture=await decodeV3Texture(buffer);this.frameMeshes[index].material.uniforms.map.value=texture;return texture}));
    this.textures=textures;return this;
  }
  emitDue(time){while(this.nextCue<PHOENIX_REBIRTH_EVENTS.length&&PHOENIX_REBIRTH_EVENTS[this.nextCue].at<=time){const cue=PHOENIX_REBIRTH_EVENTS[this.nextCue++],{at,type,...payload}=cue;this.controller.runtime.events.emit(type,payload,at)}}
  setPlane(plane){if(this.plane===plane)return;this.plane=plane;this.controller.renderer.add(this.frameGroup,plane)}
  update(state,controller){
    const t=state.time;this.emitDue(t);const weights=v3FrameWeights(t),framing=phoenixFramingForAspect(controller.renderer.camera.aspect),portrait=framing.mode==='portrait',compact=framing.mode==='compact';
    this.frameMeshes.forEach((mesh,index)=>{mesh.material.uniforms.opacity.value=weights[index];mesh.visible=weights[index]>.002});
    const motion=[
      {scale:.86+.11*ease(t/1.72),x:0,y:-.12+.09*Math.sin(t*1.4),r:.006*Math.sin(t*.7)},
      {scale:.92+.1*ease((t-1.32)/2.4),x:-.03+.05*Math.sin(t*.9),y:-.07+.11*ease((t-1.6)/1.9),r:-.008},
      {scale:.84+.19*ease((t-3.45)/3.1),x:-.12+.22*ease((t-3.7)/2.7),y:-.02+.05*Math.sin(t*1.3),r:.012*Math.sin(t*.8)},
      {scale:.9+.12*pulse(t,7.78,.72),x:.015*Math.sin(t*3),y:.01,r:.006*Math.sin(t*2.1)},
      {scale:1.03-.08*ease((t-8.65)/1.35),x:0,y:.04+.05*Math.sin(t*1.8),r:-.006*Math.sin(t)}
    ];
    const responsive=portrait?1:(compact ? .88 : .72);
    this.frameMeshes.forEach((mesh,index)=>{const m=motion[index],s=m.scale*responsive;mesh.scale.set(s,s,1);mesh.position.set(m.x*responsive,m.y*responsive,0);mesh.rotation.z=m.r});
    this.setPlane(t<5.55||t>8.55?'behind-streamer':'front-streamer');
    const camera=controller.renderer.camera;camera.position.set(0,0,portrait?5.15:5.75);camera.lookAt(0,0,0);
  }
  streamInteraction(state){
    const t=state.time,climax=pulse(t,7.78,.56),pass=pulse(t,6.18,.55);return{exposure:1+climax*.22,tint:climax>.08?'#E9DFFF':'#FFF3DC',heat:clamp(pass*.13+climax*.2),heatPhase:t*8,rimStrength:.12+climax*.28,pressure:clamp(pass*.025+climax*.045,0,.055),pressureCenter:{x:.5,y:.44},volumetric:clamp(.08+climax*.72),volumetricCenter:{x:.5,y:.43},volumetricColor:'#F0DEFF'};
  }
  unmount(controller){
    if(!this.mounted)return;controller.renderer.remove(this.frameGroup);const geometry=this.frameMeshes[0]?.geometry;for(const mesh of this.frameMeshes)mesh.material?.dispose?.();geometry?.dispose?.();for(const texture of this.textures){texture.image?.close?.();texture.dispose?.()}this.placeholder?.dispose?.();this.mounted=false;
  }
  dispose(){this.frameGroup=null;this.frameMeshes=[];this.textures=[];this.placeholder=null;this.controller=null;this.definition=null}
}

export const createPhoenixRebirthPresenter=options=>new PhoenixRebirthV3Presenter(options);
