export const REQUIRED_STORY_FUNCTIONS=Object.freeze(['intrigue','arrival','transformation','motion','worldInteraction','climax','exit']);

const finite=n=>Number.isFinite(n);

export class StoryGraph{
  constructor({id,duration,beats=[]}){
    if(!id||!finite(duration)||duration<=0)throw new Error('StoryGraph needs id and positive duration');
    this.id=id;this.duration=duration;
    this.beats=[...beats].map((beat,index)=>Object.freeze({...beat,index})).sort((a,b)=>a.at-b.at);
    this.validateShape();
  }
  validateShape(){
    for(const beat of this.beats){
      if(!beat.id||!REQUIRED_STORY_FUNCTIONS.includes(beat.fn))throw new Error(`Invalid story beat in ${this.id}`);
      if(!finite(beat.at)||!finite(beat.duration)||beat.at<0||beat.duration<=0||beat.at+beat.duration>this.duration+.001)throw new Error(`Invalid timing for ${beat.id}`);
      if(!Array.isArray(beat.channels)||beat.channels.length===0)throw new Error(`Beat ${beat.id} needs activity channels`);
    }
  }
  functions(){return new Set(this.beats.map(x=>x.fn))}
  activeAt(seconds){return this.beats.filter(x=>seconds>=x.at&&seconds<x.at+x.duration)}
  activityGaps(maxGap=1){
    if(!this.beats.length)return[{from:0,to:this.duration}];
    const spans=this.beats.map(x=>[x.at,x.at+x.duration]).sort((a,b)=>a[0]-b[0]);let end=0,gaps=[];
    for(const [start,stop] of spans){if(start-end>maxGap)gaps.push({from:end,to:start});end=Math.max(end,stop)}
    if(this.duration-end>maxGap)gaps.push({from:end,to:this.duration});return gaps;
  }
  eventsBetween(from,to){return this.beats.filter(x=>x.at>=from&&x.at<to)}
}
