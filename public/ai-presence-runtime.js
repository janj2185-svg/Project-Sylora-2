import {t} from './i18n.js?v=20260829-shell1';

function sourceStatus(){
  const source=document.querySelector('#syloraDegraded');
  if(!source||source.hidden)return null;
  const raw=String(source.textContent||'');
  return /voice/i.test(raw)&&!/text ai/i.test(raw)?{kind:'voice',text:t('voiceUnavailable')}:{kind:'ai',text:t('syloraUnavailable')};
}

function setTextIfChanged(node,value){
  if(!node||node.textContent===value)return false;
  node.textContent=value;
  return true;
}

function sync(){
  const source=document.querySelector('#syloraDegraded');
  if(source&&!source.classList.contains('sy-ai-status-source'))source.classList.add('sy-ai-status-source');
  const hero=document.querySelector('.sylora-ai-hero');
  document.querySelectorAll('.sy-ai-context-status').forEach(node=>{if(node.closest('.sylora-ai-hero')!==hero)node.remove()});
  if(document.body.dataset.view!=='ai'||!hero)return;
  if(!hero.classList.contains('ai-presence-container'))hero.classList.add('ai-presence-container');
  const status=sourceStatus();
  let node=hero.querySelector('.sy-ai-context-status');
  if(!status){node?.remove();delete hero.dataset.providerState;return}
  if(!node){
    node=document.createElement('div');
    node.className='sylora-degraded sy-ai-context-status';
    node.setAttribute('role','status');
    node.style.cssText='display:flex;align-items:center;gap:8px;width:max-content;max-width:min(92%,620px);margin:10px 0 0;padding:8px 11px;border-radius:999px;font-size:11px;line-height:1.35;box-shadow:none;';
    const eyebrow=hero.querySelector('.eyebrow');
    if(eyebrow)eyebrow.after(node);else hero.prepend(node);
  }
  if(node.dataset.kind!==status.kind)node.dataset.kind=status.kind;
  setTextIfChanged(node,status.text);
  const providerState=status.kind==='ai'?'offline':'degraded';
  if(hero.dataset.providerState!==providerState)hero.dataset.providerState=providerState;
}

let scheduled=false;
function scheduleSync(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;sync()});
}

function boot(){
  sync();
  const observer=new MutationObserver(scheduleSync);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','data-view']});
  document.addEventListener('sylora:localechange',scheduleSync);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
