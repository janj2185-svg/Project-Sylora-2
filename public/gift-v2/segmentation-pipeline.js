const clamp01=n=>Math.max(0,Math.min(1,n));

export class SegmentationMaskPipeline{
  constructor({provider=null,video=null,width=256,height=144,smoothing=.72,featherPasses=1,maxFps=30}={}){this.provider=provider;this.video=video;this.width=width;this.height=height;this.smoothing=smoothing;this.featherPasses=featherPasses;this.interval=1000/maxFps;this.mask=new Float32Array(width*height);this.work=new Float32Array(width*height);this.lastAt=-Infinity;this.pending=false;this.canvas=this.createCanvas(width,height);this.ctx=this.canvas?.getContext?.('2d',{willReadFrequently:false})||null}
  createCanvas(width,height){if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(width,height);if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=width;c.height=height;return c}return null}
  setProvider(provider){this.provider=provider}
  ingest(raw,{width=this.width,height=this.height}={}){if(!raw||raw.length!==width*height)throw new Error('Invalid segmentation mask');const source=width===this.width&&height===this.height?raw:this.resample(raw,width,height),a=this.smoothing,b=1-a;for(let i=0;i<source.length;i++)this.mask[i]=clamp01(this.mask[i]*a+Number(source[i])*b);for(let pass=0;pass<this.featherPasses;pass++)this.feather();this.writeCanvas();return this.mask}
  resample(raw,sw,sh){const out=new Float32Array(this.width*this.height);for(let y=0;y<this.height;y++){const sy=(y+.5)*sh/this.height-.5,y0=Math.max(0,Math.floor(sy)),y1=Math.min(sh-1,y0+1),fy=Math.max(0,sy-y0);for(let x=0;x<this.width;x++){const sx=(x+.5)*sw/this.width-.5,x0=Math.max(0,Math.floor(sx)),x1=Math.min(sw-1,x0+1),fx=Math.max(0,sx-x0),a=Number(raw[y0*sw+x0]),b=Number(raw[y0*sw+x1]),c=Number(raw[y1*sw+x0]),d=Number(raw[y1*sw+x1]);out[y*this.width+x]=(a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy}}return out}
  feather(){const w=this.width,h=this.height,src=this.mask,dst=this.work;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,l=y*w+Math.max(0,x-1),r=y*w+Math.min(w-1,x+1),u=Math.max(0,y-1)*w+x,d=Math.min(h-1,y+1)*w+x;dst[i]=(src[i]*4+src[l]+src[r]+src[u]+src[d])/8}this.mask.set(dst)}
  writeCanvas(){if(!this.ctx)return;const image=this.ctx.createImageData(this.width,this.height);for(let i=0;i<this.mask.length;i++){const v=Math.round(clamp01(this.mask[i])*255),j=i*4;image.data[j]=v;image.data[j+1]=v;image.data[j+2]=v;image.data[j+3]=255}this.ctx.putImageData(image,0,0)}
  async update(now=performance.now()){if(!this.provider||!this.video||this.pending||now-this.lastAt<this.interval)return false;this.pending=true;this.lastAt=now;try{const result=await this.provider.segment(this.video,now,{width:this.width,height:this.height});if(result?.mask)this.ingest(result.mask,{width:result.width||this.width,height:result.height||this.height});return true}finally{this.pending=false}}
}

export class FunctionalSegmentationProvider{
  constructor(segment){if(typeof segment!=='function')throw new Error('FunctionalSegmentationProvider needs segment()');this.fn=segment}
  segment(video,time,size){return this.fn(video,time,size)}
}
