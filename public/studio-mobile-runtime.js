const TOOL_LABELS={sources:'Sources',audio:'Audio',scenes:'Scenes',broadcast:'LIVE',obs:'OBS',browser:'Overlay',record:'Record'};

function classify(card,index){
  const label=String(card.querySelector('.eyebrow')?.textContent||'').trim().toLowerCase();
  if(label.includes('source'))return 'sources';
  if(label.includes('audio'))return 'audio';
  if(label.includes('scene'))return 'scenes';
  if(label.includes('broadcast'))return 'broadcast';
  if(label.includes('browser source'))return 'browser';
  if(label.includes('obs'))return index>4?'browser':'obs';
  if(label.includes('record'))return 'record';
  return `panel-${index}`;
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
  document.querySelector(`.studio-mobile-tools button[data-studio-tool="${CSS.escape(name)}"]`)?.classList.add('active');
}

function mount(){
  if(document.body.dataset.view!=='studio')return;
  const controls=document.querySelector('.studio-controls');
  const stage=document.querySelector('.studio-stage');
  if(!controls||!stage||controls.dataset.mobileMounted==='1')return;
  controls.dataset.mobileMounted='1';

  const cards=[...controls.children].filter(node=>node.classList?.contains('card'));
  cards.forEach((card,index)=>{
    const name=classify(card,index);
    card.dataset.studioPanel=name;
    card.dataset.studioOpen='false';
    if(!card.querySelector('.studio-sheet-close')){
      const close=document.createElement('button');
      close.type='button';close.className='studio-sheet-close';close.setAttribute('aria-label','Close');close.textContent='×';
      close.addEventListener('click',closeSheets);card.prepend(close);
    }
  });

  const tools=document.createElement('nav');
  tools.className='studio-mobile-tools';
  tools.setAttribute('aria-label','Studio controls');
  const order=['sources','audio','scenes','broadcast','obs','browser','record'];
  for(const name of order){
    if(!controls.querySelector(`.card[data-studio-panel="${name}"]`))continue;
    const button=document.createElement('button');
    button.type='button';button.dataset.studioTool=name;button.textContent=TOOL_LABELS[name]||name;
    if(name==='broadcast')button.classList.add('primary-tool');
    button.addEventListener('click',()=>openSheet(name));tools.append(button);
  }

  const backdrop=document.createElement('div');
  backdrop.className='studio-sheet-backdrop';backdrop.addEventListener('click',closeSheets);
  document.body.append(backdrop);
  stage.after(tools);
}

function cleanupIfNeeded(){
  if(document.body.dataset.view==='studio'){mount();return}
  closeSheets();
  document.querySelector('.studio-mobile-tools')?.remove();
  document.querySelector('.studio-sheet-backdrop')?.remove();
  document.querySelectorAll('.studio-controls').forEach(node=>delete node.dataset.mobileMounted);
}

function boot(){
  const observer=new MutationObserver(()=>queueMicrotask(cleanupIfNeeded));
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-view']});
  cleanupIfNeeded();
  window.addEventListener('keydown',event=>{if(event.key==='Escape')closeSheets()});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
