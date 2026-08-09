import {GiftPlaybackController} from './gift-v2/playback-controller.js';
import {PHOENIX_REBIRTH_DURATION,PHOENIX_REBIRTH_V2,createPhoenixRebirthPresenter,phoenixQualityForDevice} from './gift-v2/phoenix-rebirth.js';

const stage=document.querySelector('#phoenixStage');
const playButton=document.querySelector('#playPhoenix');
const recordButton=document.querySelector('#recordPhoenix');
const status=document.querySelector('#previewStatus');
const qualityLabel=document.querySelector('#qualityLabel');
const download=document.querySelector('#recordingDownload');
const sizeButtons=[...document.querySelectorAll('[data-size]')];
let activeController=null;
let activeAudio=null;
let recordingUrl='';

const quality=phoenixQualityForDevice({deviceMemory:navigator.deviceMemory,hardwareConcurrency:navigator.hardwareConcurrency,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
qualityLabel.textContent=quality;

function setBusy(busy,label=busy?'PLAYING':'READY'){
  playButton.disabled=busy;recordButton.disabled=busy;sizeButtons.forEach(button=>button.disabled=busy);status.textContent=label;
}

function cleanup(){
  activeController?.dispose?.();activeController=null;
  activeAudio?.close?.().catch(()=>{});activeAudio=null;
}

async function createRuntime(){
  cleanup();
  const Audio=window.AudioContext||window.webkitAudioContext;
  activeAudio=Audio?new Audio():null;
  if(activeAudio?.state==='suspended')await activeAudio.resume();
  activeController=new GiftPlaybackController(stage,{audioContext:activeAudio,presenter:createPhoenixRebirthPresenter({quality}),targetFps:120,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
  activeController.load(PHOENIX_REBIRTH_V2);
  await activeController.prepare();
  return activeController;
}

async function play({record=false}={}){
  setBusy(true,record?'RECORDING':'PLAYING');download.hidden=true;
  try{
    const controller=await createRuntime();
    let recorder=null,chunks=[],captureDestination=null;
    if(record){
      const canvasStream=controller.renderer.canvas.captureStream?.(60);
      if(!canvasStream||typeof MediaRecorder==='undefined')throw new Error('Цей браузер не підтримує запис WebGL preview');
      const tracks=[...canvasStream.getVideoTracks()];
      if(activeAudio?.createMediaStreamDestination){captureDestination=activeAudio.createMediaStreamDestination();controller.spatialAudio.master?.connect(captureDestination);tracks.push(...captureDestination.stream.getAudioTracks())}
      const stream=new MediaStream(tracks),preferred='video/webm;codecs=vp9,opus',mimeType=MediaRecorder.isTypeSupported?.(preferred)?preferred:'video/webm';
      recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:9_000_000});
      recorder.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data)};
      recorder.onstop=()=>{
        if(recordingUrl)URL.revokeObjectURL(recordingUrl);
        const blob=new Blob(chunks,{type:recorder.mimeType||'video/webm'});recordingUrl=URL.createObjectURL(blob);download.href=recordingUrl;download.download='SYLORA-Phoenix-Rebirth-V3-runtime.webm';download.textContent=`Завантажити V3 запис · ${(blob.size/1024/1024).toFixed(1)} MB`;download.hidden=false;
        stream.getTracks().forEach(track=>track.stop());captureDestination?.disconnect?.();cleanup();setBusy(false,'RECORDED');
      };
      recorder.start(250);
    }
    controller.play();
    window.setTimeout(()=>{
      if(recorder&&recorder.state!=='inactive')recorder.stop();
      else{cleanup();setBusy(false,'READY')}
    },(PHOENIX_REBIRTH_DURATION+.35)*1000);
  }catch(error){cleanup();setBusy(false,'ERROR');alert(error?.message||'Phoenix preview failed')}
}

playButton.addEventListener('click',()=>play());
recordButton.addEventListener('click',()=>play({record:true}));
sizeButtons.forEach(button=>button.addEventListener('click',()=>{
  sizeButtons.forEach(x=>x.classList.toggle('active',x===button));stage.classList.remove('tablet','phone');if(button.dataset.size!=='wide')stage.classList.add(button.dataset.size);
}));
if(matchMedia('(max-width: 600px)').matches){const phoneButton=sizeButtons.find(button=>button.dataset.size==='phone');sizeButtons.forEach(button=>button.classList.toggle('active',button===phoneButton));stage.classList.add('phone')}
window.addEventListener('beforeunload',()=>{cleanup();if(recordingUrl)URL.revokeObjectURL(recordingUrl)});
