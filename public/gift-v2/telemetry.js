export class GiftTelemetry{
  constructor({window=180}={}){this.window=window;this.frames=[];this.events=[]}
  frame(ms){this.frames.push(ms);if(this.frames.length>this.window)this.frames.shift()}
  event(type,data={}){this.events.push({type,...data});if(this.events.length>500)this.events.shift()}
  report(){const frames=this.frames,avg=frames.length?frames.reduce((a,b)=>a+b,0)/frames.length:0,sorted=[...frames].sort((a,b)=>a-b),p95=sorted.length?sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]:0;return{averageFrameMs:avg,p95FrameMs:p95,estimatedFps:avg?1000/avg:0,droppedBudgetFrames:this.events.filter(x=>x.type==='frame-budget-miss').length,audioDesyncs:this.events.filter(x=>x.type==='audio-desync').length,fallbacks:this.events.filter(x=>x.type==='fallback').map(x=>x.reason)}}
}
