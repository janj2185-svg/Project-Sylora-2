const ORDER=Object.freeze(['offscreenParticles','secondaryParticles','volumetricSamples','reflectionRate','secondaryShadowResolution','nonHeroLod','postFxSamples']);
const NEVER_DROP=new Set(['storyBeat','signatureTransformation','signatureClimax','heroSilhouette','causalAudio','requiredStreamInteraction','endingGesture']);

export class QualityGovernor{
  constructor({targetFps=120,minPremiumFps=60}={}){this.targetFps=targetFps;this.minPremiumFps=minPremiumFps;this.level=0}
  update(frameMs){const target=1000/this.targetFps;if(frameMs>target*1.25)this.level=Math.min(ORDER.length,this.level+1);else if(frameMs<target*.82)this.level=Math.max(0,this.level-1);return this.profile()}
  profile(){return{level:this.level,reduced:ORDER.slice(0,this.level),protected:[...NEVER_DROP]}}
  static canDrop(feature){return!NEVER_DROP.has(feature)}
}

export const QUALITY_REDUCTION_ORDER=ORDER;
