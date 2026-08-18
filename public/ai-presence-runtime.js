import {t} from './i18n.js';

function sourceStatus(){
  const source=document.querySelector('#syloraDegraded');
  if(!source||source.hidden)return null;
  const raw=String(source.textContent||'');
  return /voice/i.test(raw)&&!/text ai/i.test(raw)?{kind:'voice',text:t('voiceUnavailable')}:{kind:'ai',text:t('syloraUnavailable')};
}

function sync(){
  const source=document.querySelector('#syloraDegraded');
  if(source)source.classList.add('sy-ai-status-source');
  const hero=document.querySelector('.sylora-ai-hero');
  document.querySelectorAll('.sy-ai-context-status').forEach(node=>{if(node.closest('.sylora-ai-hero')!==hero)node.remove()});
  if(document.body.dataset.view!=='ai'||!hero)return;
  hero.classList.add('ai-presence-container');
  const status=sourceStatus();
  let node=hero.querySelector('.sy-ai-context-status');
  if(!status){node?.remove();return}
  if(!node){
    node=document.createElement('div');
    node.className='sy-ai-context-status';
    node.setAttribute('role','status');
    const eyebrow=hero.querySelector('.eyebrow');
    if(eyebrow)eyebrow.after(node);else hero.prepend(node);
  }
  node.dataset.kind=status.kind;
  node.textContent=status.text;
  hero.dataset.providerState=status.kind==='ai'?'offline':'degraded';
}

function boot(){
  sync();
  const observer=new MutationObserver(()=>queueMicrotask(sync));
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','data-view']});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
