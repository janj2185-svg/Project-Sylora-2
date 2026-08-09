import { GiftEngine } from './gift-engine.js';

const token=new URLSearchParams(location.search).get('token')||'';
const status=document.querySelector('#overlayStatus'),chat=document.querySelector('#chatRail'),giftEngine=new GiftEngine(document.querySelector('#gift-stage'));
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

if(!token){status.textContent='SYLORA · SOURCE URL REQUIRED';status.dataset.error='1'}
else{
  const source=new EventSource(`/api/studio/browser-source/events?token=${encodeURIComponent(token)}`);
  source.addEventListener('presence',()=>{status.textContent='SYLORA · OBS OVERLAY LIVE'});
  source.addEventListener('gift',event=>{try{giftEngine.play(JSON.parse(event.data))}catch{}});
  source.addEventListener('chat',event=>{try{const message=JSON.parse(event.data),node=document.createElement('div');node.className='overlay-chat';node.innerHTML=`<b>@${esc(message.username)}</b><span>${esc(message.text)}</span>`;chat.append(node);while(chat.children.length>5)chat.firstElementChild.remove();setTimeout(()=>node.remove(),9000)}catch{}});
  source.onerror=()=>{status.textContent='SYLORA · SOURCE DISCONNECTED';status.dataset.error='1'};
}
