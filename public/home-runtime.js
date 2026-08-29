const KEY='sylora_home_engaged_v1';
const HOME_HERO_SELECTOR='.home-screen .hero-copy,.living-horizon.home-compact';

function isFeed(){return document.body?.dataset?.view==='feed'}
function engaged(){try{return localStorage.getItem(KEY)==='1'}catch{return false}}
function markEngaged(){
  if(!isFeed())return;
  document.body.classList.add('sy-home-engaged');
  try{localStorage.setItem(KEY,'1')}catch{}
}
function sync(){
  if(!document.body)return;
  document.body.classList.toggle('sy-home-engaged',isFeed()&&engaged());
}

function boot(){
  sync();
  const bodyObserver=new MutationObserver(sync);
  bodyObserver.observe(document.body,{attributes:true,attributeFilter:['data-view']});
  window.addEventListener('scroll',()=>{if(window.scrollY>72)markEngaged()},{passive:true});
  document.addEventListener('click',event=>{
    if(event.target?.closest?.(HOME_HERO_SELECTOR))markEngaged();
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
