import {inflateSync} from 'node:zlib';

export const VISUAL_RASTER_SIGNIFICANT_CHANNEL_DELTA=2;
export const VISUAL_RASTER_MAX_SIGNIFICANT_MISMATCH_RATIO=0.0001;
export const VISUAL_RASTER_MAX_SIGNIFICANT_MISMATCH_PIXELS=100;
export const VISUAL_RASTER_MAX_CHANNEL_DELTA=40;
// Chromium can repaint a few hundred antialiased edge pixels by one channel
// step after a composited full-page capture. Keep a small absolute budget for
// that renderer noise while the significant-pixel and max-delta gates still
// fail closed on real visual drift.
export const VISUAL_RASTER_MAX_TOTAL_CHANNEL_DELTA=2048;

const PNG_SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);
const MAX_DECODED_BYTES=512*1024*1024;
const CHANNELS_BY_COLOR_TYPE=new Map([
  [0,1],
  [2,3],
  [4,2],
  [6,4]
]);

export class VisualRasterContractError extends Error{
  constructor(message){super(message);this.name='VisualRasterContractError'}
}

function fail(message){throw new VisualRasterContractError(message)}

function paethPredictor(left,up,upperLeft){
  const estimate=left+up-upperLeft;
  const leftDistance=Math.abs(estimate-left);
  const upDistance=Math.abs(estimate-up);
  const upperLeftDistance=Math.abs(estimate-upperLeft);
  if(leftDistance<=upDistance&&leftDistance<=upperLeftDistance)return left;
  if(upDistance<=upperLeftDistance)return up;
  return upperLeft;
}

function decodePng(buffer,label){
  if(!Buffer.isBuffer(buffer)||buffer.length<45||!buffer.subarray(0,8).equals(PNG_SIGNATURE)){
    fail(`${label} has an invalid PNG signature`);
  }
  let offset=8;
  let header=null;
  let seenData=false;
  let seenEnd=false;
  const dataChunks=[];
  while(offset+12<=buffer.length){
    const length=buffer.readUInt32BE(offset);
    const type=buffer.subarray(offset+4,offset+8).toString('ascii');
    const dataStart=offset+8;
    const next=dataStart+length+4;
    if(next>buffer.length)fail(`${label} contains a truncated ${type||'unknown'} chunk`);
    if(type==='IHDR'){
      if(header||length!==13||offset!==8)fail(`${label} has an invalid IHDR chunk`);
      header={
        width:buffer.readUInt32BE(dataStart),
        height:buffer.readUInt32BE(dataStart+4),
        bitDepth:buffer[dataStart+8],
        colorType:buffer[dataStart+9],
        compression:buffer[dataStart+10],
        filter:buffer[dataStart+11],
        interlace:buffer[dataStart+12]
      };
    }else if(type==='IDAT'){
      if(!header||seenEnd)fail(`${label} has an out-of-order IDAT chunk`);
      seenData=true;
      dataChunks.push(buffer.subarray(dataStart,dataStart+length));
    }else if(type==='IEND'){
      if(length!==0||seenEnd)fail(`${label} has an invalid IEND chunk`);
      seenEnd=true;
      offset=next;
      break;
    }
    offset=next;
  }
  if(!header||!seenData||!seenEnd||offset!==buffer.length)fail(`${label} is not a complete PNG stream`);
  const {width,height,bitDepth,colorType,compression,filter,interlace}=header;
  if(!width||!height)fail(`${label} has invalid dimensions`);
  if(bitDepth!==8||!CHANNELS_BY_COLOR_TYPE.has(colorType)){
    fail(`${label} must use 8-bit grayscale, RGB, grayscale-alpha or RGBA pixels`);
  }
  if(compression!==0||filter!==0||interlace!==0)fail(`${label} uses an unsupported PNG encoding`);

  const channels=CHANNELS_BY_COLOR_TYPE.get(colorType);
  const rowBytes=width*channels;
  const inflatedBytes=(rowBytes+1)*height;
  if(!Number.isSafeInteger(rowBytes)||!Number.isSafeInteger(inflatedBytes)||inflatedBytes>MAX_DECODED_BYTES){
    fail(`${label} decoded dimensions exceed the visual raster safety limit`);
  }
  let encoded;
  try{
    encoded=inflateSync(Buffer.concat(dataChunks),{maxOutputLength:inflatedBytes});
  }catch(error){
    fail(`${label} IDAT stream cannot be decoded: ${error.message}`);
  }
  if(encoded.length!==inflatedBytes){
    fail(`${label} decoded byte count ${encoded.length} does not match ${inflatedBytes}`);
  }

  const pixels=Buffer.allocUnsafe(rowBytes*height);
  for(let y=0;y<height;y+=1){
    const encodedRow=y*(rowBytes+1);
    const outputRow=y*rowBytes;
    const filterType=encoded[encodedRow];
    if(filterType>4)fail(`${label} contains unsupported PNG filter ${filterType}`);
    for(let x=0;x<rowBytes;x+=1){
      const raw=encoded[encodedRow+1+x];
      const left=x>=channels?pixels[outputRow+x-channels]:0;
      const up=y>0?pixels[outputRow-rowBytes+x]:0;
      const upperLeft=y>0&&x>=channels?pixels[outputRow-rowBytes+x-channels]:0;
      let value=raw;
      if(filterType===1)value+=left;
      else if(filterType===2)value+=up;
      else if(filterType===3)value+=Math.floor((left+up)/2);
      else if(filterType===4)value+=paethPredictor(left,up,upperLeft);
      pixels[outputRow+x]=value&0xff;
    }
  }

  const rgba=Buffer.allocUnsafe(width*height*4);
  for(let pixel=0,source=0,target=0;pixel<width*height;pixel+=1,target+=4){
    if(colorType===0){
      const gray=pixels[source];source+=1;
      rgba[target]=gray;rgba[target+1]=gray;rgba[target+2]=gray;rgba[target+3]=255;
    }else if(colorType===2){
      rgba[target]=pixels[source];rgba[target+1]=pixels[source+1];rgba[target+2]=pixels[source+2];rgba[target+3]=255;
      source+=3;
    }else if(colorType===4){
      const gray=pixels[source];
      rgba[target]=gray;rgba[target+1]=gray;rgba[target+2]=gray;rgba[target+3]=pixels[source+1];
      source+=2;
    }else{
      rgba[target]=pixels[source];rgba[target+1]=pixels[source+1];rgba[target+2]=pixels[source+2];rgba[target+3]=pixels[source+3];
      source+=4;
    }
  }
  return {width,height,rgba};
}

export function visualRasterDifferenceWithinTolerance(difference){
  if(!difference||difference.dimensionsMatch!==true)return false;
  const {
    width,height,repeatWidth,repeatHeight,pixelCount,mismatchPixels,mismatchRatio,
    significantMismatchPixels,significantMismatchRatio,maxChannelDelta,totalChannelDelta
  }=difference;
  if(
    !Number.isSafeInteger(width)||width<=0||!Number.isSafeInteger(height)||height<=0||
    repeatWidth!==width||repeatHeight!==height||
    !Number.isSafeInteger(pixelCount)||pixelCount!==width*height||
    !Number.isSafeInteger(mismatchPixels)||mismatchPixels<0||mismatchPixels>pixelCount||
    !Number.isFinite(mismatchRatio)||mismatchRatio<0||
    Math.abs(mismatchRatio-mismatchPixels/pixelCount)>Number.EPSILON||
    !Number.isSafeInteger(significantMismatchPixels)||significantMismatchPixels<0||significantMismatchPixels>mismatchPixels||
    !Number.isFinite(significantMismatchRatio)||significantMismatchRatio<0||
    Math.abs(significantMismatchRatio-significantMismatchPixels/pixelCount)>Number.EPSILON||
    !Number.isSafeInteger(maxChannelDelta)||maxChannelDelta<0||
    !Number.isSafeInteger(totalChannelDelta)||totalChannelDelta<mismatchPixels||
    maxChannelDelta>totalChannelDelta||totalChannelDelta>mismatchPixels*4*255
  )return false;
  return significantMismatchPixels<=VISUAL_RASTER_MAX_SIGNIFICANT_MISMATCH_PIXELS&&
    significantMismatchRatio<=VISUAL_RASTER_MAX_SIGNIFICANT_MISMATCH_RATIO&&
    maxChannelDelta<=VISUAL_RASTER_MAX_CHANNEL_DELTA&&
    totalChannelDelta<=VISUAL_RASTER_MAX_TOTAL_CHANNEL_DELTA;
}

export function comparePngBuffers(first,second){
  const before=decodePng(first,'candidate PNG');
  const after=decodePng(second,'repeat PNG');
  const dimensionsMatch=before.width===after.width&&before.height===after.height;
  if(!dimensionsMatch){
    return {
      dimensionsMatch:false,
      width:before.width,
      height:before.height,
      repeatWidth:after.width,
      repeatHeight:after.height,
      pixelCount:0,
      mismatchPixels:0,
      mismatchRatio:1,
      significantMismatchPixels:0,
      significantMismatchRatio:1,
      maxChannelDelta:255,
      totalChannelDelta:1020,
      withinTolerance:false
    };
  }
  const pixelCount=before.width*before.height;
  let mismatchPixels=0;
  let significantMismatchPixels=0;
  let maxChannelDelta=0;
  let totalChannelDelta=0;
  for(let offset=0;offset<before.rgba.length;offset+=4){
    let pixelMismatch=false;
    let pixelMaxChannelDelta=0;
    for(let channel=0;channel<4;channel+=1){
      const delta=Math.abs(before.rgba[offset+channel]-after.rgba[offset+channel]);
      if(delta>0)pixelMismatch=true;
      if(delta>pixelMaxChannelDelta)pixelMaxChannelDelta=delta;
      if(delta>maxChannelDelta)maxChannelDelta=delta;
      totalChannelDelta+=delta;
    }
    if(pixelMismatch)mismatchPixels+=1;
    if(pixelMaxChannelDelta>VISUAL_RASTER_SIGNIFICANT_CHANNEL_DELTA)significantMismatchPixels+=1;
  }
  const difference={
    dimensionsMatch:true,
    width:before.width,
    height:before.height,
    repeatWidth:after.width,
    repeatHeight:after.height,
    pixelCount,
    mismatchPixels,
    mismatchRatio:mismatchPixels/pixelCount,
    significantMismatchPixels,
    significantMismatchRatio:significantMismatchPixels/pixelCount,
    maxChannelDelta,
    totalChannelDelta
  };
  return {...difference,withinTolerance:visualRasterDifferenceWithinTolerance(difference)};
}
