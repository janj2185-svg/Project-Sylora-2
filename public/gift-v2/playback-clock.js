export class PlaybackClock{
  constructor({audioContext=null,now=()=>performance.now()/1000}={}){this.audioContext=audioContext;this.now=now;this.started=false;this.origin=0;this.last=0}
  sourceNow(){return this.audioContext?.state==='running'?this.audioContext.currentTime:this.now()}
  start(){this.origin=this.sourceNow();this.last=0;this.started=true;return this}
  sample(){if(!this.started)this.start();const elapsed=Math.max(this.last,this.sourceNow()-this.origin),delta=Math.max(0,elapsed-this.last);this.last=elapsed;return{elapsed,delta}}
  reset(){this.started=false;this.origin=0;this.last=0}
}
