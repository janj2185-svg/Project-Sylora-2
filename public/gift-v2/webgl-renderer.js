import * as THREE from 'three';
import {DEPTH_PLANES} from './stream-compositor.js';

const VERT=`
varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}
`;

export const STREAM_COMPOSITE_FRAGMENT=`
precision highp float;
varying vec2 vUv;
uniform sampler2D tStream; uniform sampler2D tMask; uniform sampler2D tFar;
uniform sampler2D tBehind; uniform sampler2D tFront; uniform sampler2D tLens;
uniform vec3 tint; uniform float exposure; uniform float pressure; uniform vec2 pressureCenter;
uniform float volumetric; uniform vec2 volumetricCenter; uniform vec3 volumetricColor;
uniform float heat; uniform float heatPhase; uniform vec2 maskTexel; uniform float rimStrength;
vec4 over(vec4 a,vec4 b){return vec4(a.rgb*a.a+b.rgb*(1.0-a.a),a.a+b.a*(1.0-a.a));}
void main(){
  vec2 d=vUv-pressureCenter; float r=length(d); vec2 uv=vUv+d*pressure*exp(-18.0*r*r);
  uv.x+=sin((uv.y+heatPhase*.015)*92.0)*heat*.0025; uv.y+=cos((uv.x+heatPhase*.011)*77.0)*heat*.0018;
  vec4 stream=texture2D(tStream,uv); float person=texture2D(tMask,vUv).r;
  float mx=abs(texture2D(tMask,vUv+vec2(maskTexel.x,0.0)).r-texture2D(tMask,vUv-vec2(maskTexel.x,0.0)).r);
  float my=abs(texture2D(tMask,vUv+vec2(0.0,maskTexel.y)).r-texture2D(tMask,vUv-vec2(0.0,maskTexel.y)).r); float edge=clamp((mx+my)*2.4,0.0,1.0);
  vec4 farLayer=texture2D(tFar,vUv); vec4 behind=texture2D(tBehind,vUv); vec4 front=texture2D(tFront,vUv); vec4 lens=texture2D(tLens,vUv);
  vec4 world=over(farLayer,stream); behind.a*=1.0-person; world=over(behind,world);
  world.rgb*=mix(vec3(1.0),tint,0.16)*exposure; world.rgb+=edge*rimStrength*tint;
  float shaft=pow(max(0.0,1.0-length(vUv-volumetricCenter)*1.35),3.0)*volumetric; world.rgb+=volumetricColor*shaft*.32;
  world=over(front,world); world=over(lens,world);
  gl_FragColor=vec4(world.rgb,1.0);
}`;

const emptyTexture=(value=0)=>{const data=new Uint8Array([value,value,value,255]),t=new THREE.DataTexture(data,1,1,THREE.RGBAFormat);t.needsUpdate=true;return t};

export class GiftV2WebGLRenderer{
  constructor(stage,{video=null,mask=null,pixelRatio=Math.min(globalThis.devicePixelRatio||1,1.75)}={}){
    if(!stage)throw new Error('GiftV2WebGLRenderer requires a stage');this.stage=stage;this.canvas=document.createElement('canvas');this.canvas.className='sylora-gift-v2-canvas';this.canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5';stage.append(this.canvas);
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true,powerPreference:'high-performance'});this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.pixelRatio=pixelRatio;
    this.camera=new THREE.PerspectiveCamera(44,1,.05,120);this.camera.position.set(0,0,7);this.scenes=new Map(DEPTH_PLANES.map(p=>[p,new THREE.Scene()]));
    this.targets=new Map();this.fallbackStream=emptyTexture(248);this.fallbackMask=emptyTexture(0);this.streamTexture=video?new THREE.VideoTexture(video):this.fallbackStream;this.maskTexture=this.makeMaskTexture(mask);
    this.compositeScene=new THREE.Scene();this.compositeCamera=new THREE.Camera();this.uniforms={tStream:{value:this.streamTexture},tMask:{value:this.maskTexture},tFar:{value:null},tBehind:{value:null},tFront:{value:null},tLens:{value:null},tint:{value:new THREE.Color('#FFFFFF')},exposure:{value:1},pressure:{value:0},pressureCenter:{value:new THREE.Vector2(.5,.5)},volumetric:{value:0},volumetricCenter:{value:new THREE.Vector2(.5,.5)},volumetricColor:{value:new THREE.Color('#F5DEB3')},heat:{value:0},heatPhase:{value:0},maskTexel:{value:new THREE.Vector2(1/256,1/144)},rimStrength:{value:.12}};
    this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({vertexShader:VERT,fragmentShader:STREAM_COMPOSITE_FRAGMENT,uniforms:this.uniforms,depthTest:false,depthWrite:false}));this.compositeScene.add(this.quad);this.resize();
  }
  makeMaskTexture(source){if(!source)return this.fallbackMask;if(source.isTexture)return source;const t=new THREE.CanvasTexture(source);t.colorSpace=THREE.NoColorSpace;return t}
  setSegmentationMask(source){if(this.maskTexture!==this.fallbackMask&&!this.maskTexture.isRenderTargetTexture)this.maskTexture.dispose?.();this.maskTexture=this.makeMaskTexture(source);this.uniforms.tMask.value=this.maskTexture;const w=source?.width||256,h=source?.height||144;this.uniforms.maskTexel.value.set(1/w,1/h)}
  add(object,plane='front-streamer'){if(!this.scenes.has(plane))throw new Error(`Unknown V2 render plane: ${plane}`);this.scenes.get(plane).add(object);return object}
  remove(object){for(const scene of this.scenes.values())scene.remove(object)}
  resize(width=this.stage.clientWidth||innerWidth,height=this.stage.clientHeight||innerHeight){width=Math.max(1,width);height=Math.max(1,height);this.renderer.setPixelRatio(this.pixelRatio);this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();for(const target of this.targets.values())target.dispose();this.targets.clear();for(const plane of DEPTH_PLANES){const rt=new THREE.WebGLRenderTarget(Math.round(width*this.pixelRatio),Math.round(height*this.pixelRatio),{format:THREE.RGBAFormat,type:THREE.HalfFloatType,depthBuffer:true});rt.texture.colorSpace=THREE.SRGBColorSpace;this.targets.set(plane,rt)}this.uniforms.tFar.value=this.targets.get('far').texture;this.uniforms.tBehind.value=this.targets.get('behind-streamer').texture;this.uniforms.tFront.value=this.targets.get('front-streamer').texture;this.uniforms.tLens.value=this.targets.get('lens').texture}
  applyInteraction({exposure=1,tint='#FFFFFF',pressure=0,pressureCenter={x:.5,y:.5},volumetric=0,volumetricCenter={x:.5,y:.5},volumetricColor='#F5DEB3',heat=0,heatPhase=0,rimStrength=.12}={}){this.uniforms.exposure.value=Math.max(.7,Math.min(1.4,exposure));this.uniforms.tint.value.set(tint);this.uniforms.pressure.value=Math.max(-.08,Math.min(.08,pressure));this.uniforms.pressureCenter.value.set(pressureCenter.x,pressureCenter.y);this.uniforms.volumetric.value=Math.max(0,Math.min(1,volumetric));this.uniforms.volumetricCenter.value.set(volumetricCenter.x,volumetricCenter.y);this.uniforms.volumetricColor.value.set(volumetricColor);this.uniforms.heat.value=Math.max(0,Math.min(1,heat));this.uniforms.heatPhase.value=heatPhase;this.uniforms.rimStrength.value=Math.max(0,Math.min(.5,rimStrength))}
  render(){for(const plane of DEPTH_PLANES){this.renderer.setRenderTarget(this.targets.get(plane));this.renderer.setClearColor(0x000000,0);this.renderer.clear();this.renderer.render(this.scenes.get(plane),this.camera)}this.renderer.setRenderTarget(null);this.renderer.render(this.compositeScene,this.compositeCamera)}
  dispose(){for(const scene of this.scenes.values())scene.traverse(x=>{x.geometry?.dispose?.();if(Array.isArray(x.material))x.material.forEach(m=>m.dispose?.());else x.material?.dispose?.()});for(const t of this.targets.values())t.dispose();this.quad.geometry.dispose();this.quad.material.dispose();if(this.streamTexture!==this.fallbackStream)this.streamTexture.dispose();if(this.maskTexture!==this.fallbackMask)this.maskTexture.dispose?.();this.fallbackStream.dispose();this.fallbackMask.dispose();this.renderer.dispose();this.canvas.remove()}
}
