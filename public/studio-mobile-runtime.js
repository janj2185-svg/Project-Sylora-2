import {getLocale} from './i18n.js?v=20260818-i18n3';
import {uiCopy} from './locales/ui-runtime.js?v=20260826-ui5';

const TOOL_KEYS={
  sources:'sources',
  audio:'audioMixer',
  scenes:'scenes',
  broadcast:'broadcast',
  distribution:'multistream',
  obs:'connectObs',
  browser:'browserSource',
  record:'record'
};
const PANEL_ORDER=['sources','audio','scenes','broadcast','distribution','obs','browser','record'];
const STUDIO_PORTAL_SELECTOR='.studio-mobile-tools,.studio-sheet-backdrop';
let mountedControls=null;

function toolLabel(name){return uiCopy(getLocale(),TOOL_KEYS[name]||name)}

function classify(card,index){
  return card.dataset.studioPanel||PANEL_ORDER[index]||`panel-${index}`;
}

function closeSheets(){
  document.body.classList.remove('sy-studio-sheet-open');
  document.querySelectorAll('.studio-controls>.card[data-studio-open="true"]').forEach(card=>card.dataset.studioOpen='false');
  document.querySelectorAll('.studio-mobile-tools button').forEach(button=>button.classList.remove('active'));
}

function openSheet(name){
  const card=document.querySelector(`.studio-controls>.card[data-studio-panel="${CSS.escape(name)}"]`);
  if(!card)return;
  closeSheets();
  card.dataset.studioOpen='true';
  document.body.classList.add('sy-studio-sheet-open');
  const active=document.querySelector(`.studio-mobile-tools button[data-studio-tool="${CSS.escape(name)}"]`);
  active?.classList.add('active');
  active?.scrollIntoView({block:'nearest',inline:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}

function updateToolLabels(){
  document.querySelectorAll('.studio-mobile-tools button[data-studio-tool]').forEach(button=>{
    const next=toolLabel(button.dataset.studioTool);
    if(button.textContent!==next)button.textContent=next;
  });
  document.querySelectorAll('.studio-sheet-close').forEach(button=>button.setAttribute('aria-label',uiCopy(getLocale(),'close')));
  document.querySelector('.studio-mobile-tools')?.setAttribute('aria-label',uiCopy(getLocale(),'creatorStudio'));
}

function portalsAreCurrent(){
  const tools=document.querySelectorAll('.studio-mobile-tools');
  const backdrops=document.querySelectorAll('.studio-sheet-backdrop');
  return tools.length===1&&backdrops.length===1&&tools[0].parentElement===document.body&&backdrops[0].parentElement===document.body;
}

function removePortalNodes(){
  document.querySelectorAll(STUDIO_PORTAL_SELECTOR).forEach(node=>node.remove());
  mountedControls=null;
}

function mount(){
  if(document.body.dataset.view!=='studio')return false;
  const controls=document.querySelector('.studio-controls');
  const stage=document.querySelector('.studio-stage');
  if(!controls||!stage){
    closeSheets();
    removePortalNodes();
    return false;
  }
  if(mountedControls===controls&&controls.dataset.mobileMounted==='1'&&portalsAreCurrent())return true;

  closeSheets();
  removePortalNodes();
  mountedControls=controls;
  controls.dataset.mobileMounted='1';

  const cards=[...controls.children].filter(node=>node.classList?.contains('card'));
  cards.forEach((card,index)=>{
    const name=classify(card,index);
    card.dataset.studioPanel=name;
    card.dataset.studioOpen='false';
    if(!card.querySelector('.studio-sheet-close')){
      const close=document.createElement('button');
      close.type='button';
      close.className='studio-sheet-close';
      close.setAttribute('aria-label',uiCopy(getLocale(),'close'));
      close.textContent='×';
      close.addEventListener('click',closeSheets);
      card.prepend(close);
    }
  });

  const tools=document.createElement('nav');
  tools.className='studio-mobile-tools';
  tools.dataset.studioPortal='tools';
  tools.setAttribute('aria-label',uiCopy(getLocale(),'creatorStudio'));
  for(const name of PANEL_ORDER){
    if(!controls.querySelector(`.card[data-studio-panel="${name}"]`))continue;
    const button=document.createElement('button');
    button.type='button';
    button.dataset.studioTool=name;
    button.textContent=toolLabel(name);
    if(name==='broadcast')button.classList.add('primary-tool');
    button.addEventListener('click',()=>openSheet(name));
    tools.append(button);
  }

  const backdrop=document.createElement('div');
  backdrop.className='studio-sheet-backdrop';
  backdrop.dataset.studioPortal='backdrop';
  backdrop.addEventListener('click',closeSheets);
  document.body.append(backdrop);
  document.body.append(tools);
  return true;
}

function cleanupIfNeeded(){
  if(document.body.dataset.view==='studio'){
    mount();
    updateToolLabels();
    return;
  }
  closeSheets();
  removePortalNodes();
  document.querySelectorAll('.studio-controls').forEach(node=>delete node.dataset.mobileMounted);
}

function boot(){
  const observer=new MutationObserver(()=>queueMicrotask(cleanupIfNeeded));
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-view']});
  cleanupIfNeeded();
  window.addEventListener('keydown',event=>{if(event.key==='Escape')closeSheets()});
  document.addEventListener('sylora:localechange',updateToolLabels);
  document.addEventListener('sylora:studio-panels-changed',()=>{
    if(document.body.dataset.view!=='studio')return;
    mountedControls=null;
    mount();
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
