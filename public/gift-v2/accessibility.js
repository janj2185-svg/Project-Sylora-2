export class GiftAccessibilityGovernor{
  constructor({reducedMotion=false,photosensitiveSafe=false}={}){this.reducedMotion=reducedMotion;this.photosensitiveSafe=photosensitiveSafe}
  camera({shake=0,nearAcceleration=1}={}){return{shake:this.reducedMotion?Math.min(shake,.08):shake,nearAcceleration:this.reducedMotion?Math.min(nearAcceleration,.45):nearAcceleration}}
  light({exposure=1,flashHz=0,contrast=1}={}){return{exposure:this.photosensitiveSafe?Math.min(exposure,1.16):exposure,flashHz:this.photosensitiveSafe?Math.min(flashHz,2.5):flashHz,contrast:this.photosensitiveSafe?Math.min(contrast,1.15):contrast}}
  preserveStory(state){return{...state,storyPreserved:true,signatureClimaxPreserved:true,endingPreserved:true}}
}
