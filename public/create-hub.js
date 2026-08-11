/** Global Create Hub — permission-aware actions, no fake destinations. */
export function createHubActions({authed,canLive=true,canStudio=true}={}){
  return [
    {id:'post',labelKey:'createPost',view:null,needsAuth:true,enabled:authed,run:'composer'},
    {id:'clip',labelKey:'createClip',view:'clips',needsAuth:true,enabled:authed},
    {id:'live',labelKey:'createLive',view:'live',needsAuth:true,enabled:authed&&canLive,intent:'create'},
    {id:'room',labelKey:'createRoom',view:'business',needsAuth:true,enabled:authed,intent:'room'},
    {id:'project',labelKey:'createProject',view:'business',needsAuth:true,enabled:authed,intent:'project'},
    {id:'community',labelKey:'createCommunity',view:'communities',needsAuth:true,enabled:authed},
    {id:'course',labelKey:'createCourse',view:'learning',needsAuth:true,enabled:authed},
    {id:'event',labelKey:'createEvent',view:'live',needsAuth:true,enabled:authed,intent:'event'},
    {id:'studio',labelKey:'studio',view:'studio',needsAuth:true,enabled:authed&&canStudio}
  ];
}

export function openCreateHub({t,esc,authed,onNavigate,onComposer,onAuth}={}){
  document.querySelector('#syloraCreateHub')?.remove();
  const actions=createHubActions({authed});
  const overlay=document.createElement('div');
  overlay.id='syloraCreateHub';
  overlay.className='create-hub';
  overlay.innerHTML=`<div class="create-hub-sheet" role="dialog" aria-modal="true" aria-label="${esc(t('createHub'))}">
    <header><span class="eyebrow">SYLORA</span><h2>${esc(t('createHub'))}</h2><button type="button" class="ghost create-hub-close" aria-label="Close">✕</button></header>
    <div class="create-hub-grid">${actions.map(a=>`<button type="button" class="create-hub-item ${a.enabled?'':'is-disabled'}" data-id="${a.id}" ${a.enabled?'':'disabled'}><b>${esc(t(a.labelKey))}</b><small>${a.enabled?'':esc(t(a.reason||(a.needsAuth&&!authed?'disabledNeedAuth':'comingSoon')))}</small></button>`).join('')}</div>
  </div>`;
  document.body.append(overlay);
  const close=()=>overlay.remove();
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  overlay.querySelector('.create-hub-close').onclick=close;
  overlay.querySelectorAll('.create-hub-item:not([disabled])').forEach(btn=>{
    btn.onclick=()=>{
      const action=actions.find(x=>x.id===btn.dataset.id);
      close();
      if(!action)return;
      if(action.needsAuth&&!authed)return onAuth?.();
      if(action.run==='composer')return onComposer?.();
      onNavigate?.(action.view,{intent:action.intent||action.id});
    };
  });
  return overlay;
}
