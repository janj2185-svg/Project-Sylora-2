import {SUPPORTED_UI_LOCALES,getLocale,setLocale,localeLabel} from './i18n.js';

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
  select.setAttribute('aria-label','Language');
  return true;
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

  window.addEventListener('storage',event=>{
    if(event.key!=='sylora_locale')return;
    const code=SUPPORTED_UI_LOCALES.includes(event.newValue)?event.newValue:'uk';
    setLocale(code,{persist:false});
    document.documentElement.lang=code;
    normalizeLocaleSelector();
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

export {normalizeLocaleSelector};
