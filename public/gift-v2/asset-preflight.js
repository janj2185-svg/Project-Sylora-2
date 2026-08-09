export class GiftAssetPreflight{
  constructor({loader=defaultLoader}={}){this.loader=loader;this.entries=new Map();this.loaded=new Map();this.locked=false}
  register({id,url,type='binary',critical=true}){if(this.locked)throw new Error('Cannot register assets after playback lock');if(!id||!url)throw new Error('Gift asset needs id and url');if(this.entries.has(id))throw new Error(`Duplicate gift asset: ${id}`);this.entries.set(id,Object.freeze({id,url,type,critical}));return this}
  async preload(){const jobs=[...this.entries.values()].map(async entry=>{const asset=await this.loader(entry);this.loaded.set(entry.id,asset);return asset});await Promise.all(jobs);return this}
  assertReady(){const missing=[...this.entries.values()].filter(x=>x.critical&&!this.loaded.has(x.id));if(missing.length)throw new Error(`Gift preflight missing critical assets: ${missing.map(x=>x.id).join(', ')}`);return true}
  lockForPlayback(){this.assertReady();this.locked=true;return this}
  get(id){return this.loaded.get(id)??null}
}

async function defaultLoader(entry){const response=await fetch(entry.url,{cache:'force-cache'});if(!response.ok)throw new Error(`Gift asset failed: ${entry.id}`);if(entry.type==='json')return response.json();if(entry.type==='text'||entry.type==='shader')return response.text();return response.arrayBuffer()}

export function detectGiftCapabilities({canvas=null,audioContext=null,segmentationProvider=null}={}){let webgl2=false;try{const c=canvas||(typeof document!=='undefined'?document.createElement('canvas'):null);webgl2=!!c?.getContext?.('webgl2',{failIfMajorPerformanceCaveat:true})}catch{}return{webgl2,spatialAudio:!!audioContext?.createPanner,segmentation:!!segmentationProvider,haptics:typeof navigator!=='undefined'&&typeof navigator.vibrate==='function',reducedMotion:typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches}}

export function choosePlaybackProfile(capabilities,{photosensitiveSafe=false}={}){if(!capabilities.webgl2)return{mode:'legacy',reason:'webgl2-unavailable'};return{mode:'v2',depthInteraction:capabilities.segmentation,spatialAudio:capabilities.spatialAudio,haptics:capabilities.haptics,reducedMotion:capabilities.reducedMotion,photosensitiveSafe}}
