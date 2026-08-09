const ALLOWED_SHOTS=new Set(['macro','hero-low','flyby','parallax','dolly-in','dolly-out','rack-focus','particle-pass','near-camera','impact-response','slow-motion','wide-reveal','subject-orbit','boundary-cross']);

export class ShotDirector{
  constructor(shots=[]){this.shots=[...shots].sort((a,b)=>a.at-b.at);this.validate()}
  validate(){
    for(const shot of this.shots){if(!ALLOWED_SHOTS.has(shot.type))throw new Error(`Unknown shot type: ${shot.type}`);if(!Number.isFinite(shot.at)||!Number.isFinite(shot.duration)||shot.duration<=0)throw new Error('Invalid shot timing');if(!shot.motivation)throw new Error(`Shot ${shot.type} needs dramatic motivation`)}
  }
  current(time){return this.shots.findLast?.(x=>x.at<=time&&time<x.at+x.duration)||[...this.shots].reverse().find(x=>x.at<=time&&time<x.at+x.duration)||null}
  fingerprint(){return this.shots.map(x=>x.type).join('>')}
}
