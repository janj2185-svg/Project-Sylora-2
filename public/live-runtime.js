import {getLocale} from './i18n.js?v=20260829-reference2';

function semanticState(text=''){
  const value=String(text).trim().toLowerCase();
  if(!value)return 'connecting';
  if(value.includes('lost')||value.includes('failed')||value.includes('unavailable')||value.includes('limit'))return 'error';
  if(value.includes('disconnected')||value.includes('closed'))return 'disconnected';
  if(value.includes('degraded'))return 'degraded';
  if(value.includes('live video')||value==='connected')return 'connected';
  if(value.includes('waiting')||value.includes('connecting')||value.includes('checking')||value.includes('new'))return 'connecting';
  return 'connecting';
}

function syncStatus(node){
  if(!node)return false;
  const next=semanticState(node.textContent);
  if(node.dataset.connectionState===next)return false;
  node.dataset.connectionState=next;
  return true;
}

function setTextIfChanged(node,value){
  if(!node||node.textContent===value)return false;
  node.textContent=value;
  return true;
}

function syncLiveLabels(){
  if(document.body.dataset.view!=='live')return;
  const chat={uk:'Чат',en:'Chat',pl:'Czat',de:'Chat',ru:'Чат'}[getLocale()]||'Chat';
  document.querySelectorAll('.open-live').forEach(node=>setTextIfChanged(node,chat));
  document.querySelectorAll('.live-copilot').forEach(node=>setTextIfChanged(node,'Copilot'));
}

function syncAll(){document.querySelectorAll('#webrtcStatus').forEach(syncStatus);syncLiveLabels()}

let scheduled=false;
function scheduleSync(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;syncAll()});
}

function boot(){
  syncAll();
  const observer=new MutationObserver(records=>{
    for(const record of records){
      const target=record.target?.nodeType===1?record.target:record.target?.parentElement;
      if(target?.id==='webrtcStatus')syncStatus(target);
      else if(target?.querySelector)target.querySelectorAll('#webrtcStatus').forEach(syncStatus);
    }
    scheduleSync();
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  document.addEventListener('sylora:localechange',scheduleSync);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

export {semanticState};
