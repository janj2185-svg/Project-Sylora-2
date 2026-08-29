import {SUPPORTED_UI_LOCALES,getLocale,setLocale,localeLabel,t} from './i18n.js?v=20260829-live5';

const expected=SUPPORTED_UI_LOCALES.join(',');

function normalizeLocaleSelector(root=document){
  const select=root.querySelector?.('#localeSwitch');
  if(!select)return false;
  const current=SUPPORTED_UI_LOCALES.includes(getLocale())?getLocale():'uk';
  if(select.dataset.syloraLocales!==expected){
    select.replaceChildren(...SUPPORTED_UI_LOCALES.map(code=>{
      const option=document.createElement('option');
      option.value=code;
      option.textContent=localeLabel(code);
      return option;
    }));
    select.dataset.syloraLocales=expected;
  }
  select.value=current;
  select.setAttribute('aria-label',t('language'));
  return true;
}

function announceLocaleChange(){
  document.documentElement.lang=getLocale();
  normalizeLocaleSelector();
  document.dispatchEvent(new CustomEvent('sylora:localechange',{detail:{locale:getLocale()}}));
}

function boot(){
  document.documentElement.lang=getLocale();
  normalizeLocaleSelector();
  const observer=new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='childList'&&(record.target?.id==='account'||record.target?.closest?.('#account'))){
        normalizeLocaleSelector();
        break;
      }
    }
  });
  const account=document.querySelector('#account');
  if(account)observer.observe(account,{childList:true,subtree:true});
  else observer.observe(document.documentElement,{childList:true,subtree:true});

  // The legacy app owns the selector's onchange handler. This listener runs after that
  // target handler and publishes a stable same-tab event for all localization runtimes.
  document.addEventListener('change',event=>{
    if(event.target?.id!=='localeSwitch')return;
    queueMicrotask(announceLocaleChange);
  });

  window.addEventListener('storage',event=>{
    if(event.key!=='sylora_locale')return;
    const code=SUPPORTED_UI_LOCALES.includes(event.newValue)?event.newValue:'uk';
    setLocale(code,{persist:false});
    announceLocaleChange();
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

export {normalizeLocaleSelector,announceLocaleChange};
