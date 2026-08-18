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
  if(!node)return;
  node.dataset.connectionState=semanticState(node.textContent);
}

function syncAll(){document.querySelectorAll('#webrtcStatus').forEach(syncStatus)}

function boot(){
  syncAll();
  const observer=new MutationObserver(records=>{
    for(const record of records){
      const target=record.target?.nodeType===1?record.target:record.target?.parentElement;
      if(target?.id==='webrtcStatus')syncStatus(target);
      else if(target?.querySelector)target.querySelectorAll('#webrtcStatus').forEach(syncStatus);
    }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

export {semanticState};
