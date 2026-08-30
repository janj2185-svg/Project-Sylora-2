import { t, setLocale, getLocale, humanError } from './i18n.js?v=20260829-reference2';
import { openCreateHub } from './create-hub.js';
import { openCommandPalette } from './command-palette.js';
import { SyloraMotionRig, handPoseForGesture } from './sylora-motion.js';
import {
  SYLORA_AVATAR_VERSION,
  SYLORA_GESTURE_SEQUENCES,
  preloadSyloraAvatarFrames,
  syloraBlinkSequence,
  syloraFrameSrc,
  syloraGestureSequence,
  syloraRestingFrame
} from './sylora-avatar-runtime.js?v=20260826-avatar4';
import { ObsWebSocketClient, normalizeObsUrl } from './obs-client.js';
import { SyloraCompanionClient, normalizeCompanionUrl } from './companion-client.js';
import { mountTikTokOwnerPilot } from './tiktok-live-pilot.js';
import { isRtcConfigCacheFresh } from './rtc-config-cache.js';
import { bindMediaFilePicker, mediaFilePickerMarkup } from './media-file-picker.js';
import { authErrorKey, authText, validateAuthInput } from './auth-ui.js?v=20260827-auth1';
const state={token:localStorage.getItem('sylora_token')||'',me:null,wallet:null,view:'feed',intent:null,inboxTab:'messages',liveTab:'discover',incomingCall:null};const app=document.querySelector('#app');let giftEngine={play:async()=>{}};const recentRealtimeIds=new Map();let userEventsAbort=null,liveEventSource=null,liveViewerSource=null,liveViewerPeer=null,liveViewerId=null,liveViewerLiveId=null,liveViewerHostPeerId=null,liveViewerAnnounceTimer=null,liveRtcConfigCache=null,liveRtcConfigCachedAt=0,studioSourceStream=null,studioRecorder=null,studioChunks=[],studioRaf=0,studioLastBlob=null,studioLiveSource=null,studioBroadcastStream=null,studioHostPeerId=null,studioOverlayImage=null,syloraRecognition=null,syloraVoiceEnabled=localStorage.getItem('sylora_voice')==='1',syloraRealtimePeer=null,syloraRealtimeStream=null,syloraRealtimeChannel=null,syloraRealtimeAudio=null,syloraAudioContext=null,syloraAudioRaf=0,syloraCallTimer=null,syloraCallStartedAt=0,conferenceSessionCleanup=null,activeCallCleanup=null,tiktokPilotCleanup=null;const studioPeers=new Map();
let studioObsClient=null,studioCompanionClient=null,studioObsCredentials=null,studioObsReconnectTimer=null,studioObsReconnectAttempt=0,studioAudioContext=null,studioAudioGain=null,studioAudioAnalyser=null,studioAudioDestination=null,studioAudioMeterRaf=0,studioDistributionPoll=0;
const STUDIO_PROFILES={vertical720:{label:'Vertical · 720×1280 · 30 FPS',width:720,height:1280,fps:30},vertical1080:{label:'Vertical · 1080×1920 · 30 FPS',width:1080,height:1920,fps:30},vertical1080p60:{label:'Vertical · 1080×1920 · 60 FPS',width:1080,height:1920,fps:60},horizontal1080:{label:'Landscape · 1920×1080 · 30 FPS',width:1920,height:1080,fps:30}};
const STUDIO_P2P_PEER_LIMIT=6;
const CANONICAL_BRAND_ASSET='/assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png';
const SPA_SHELL_VIEWS=new Set(['feed','live','studio','clips','videos','explore','messages','ai','profile','gifts','more','identity','agents','developer','security','dashboard','canvas','communities','learning','business','admin']);
function viewFromPathname(pathname=location.pathname){const seg=String(pathname||'/').replace(/^\/+|\/+$/g,'').split('/')[0];return seg&&SPA_SHELL_VIEWS.has(seg)?seg:'feed'}
function syncPathForView(view){const next=view==='feed'?'/':`/${view}`;if(location.pathname!==next)history.replaceState({view},'',next)}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function launchCreateHub(){openCreateHub({t,esc,authed:!!state.me,onAuth:renderAuth,onComposer:()=>{nav('feed');requestAnimationFrame(()=>document.querySelector('#composer textarea')?.focus())},onNavigate:(view,opts={})=>{state.intent=opts.intent||null;nav(view)}})}
function launchCommandPalette(){openCommandPalette({t,esc,api,onNavigate:v=>nav(v),onCreate:launchCreateHub,onAiSearch:q=>{state.intent=q;nav('ai')}})}
let syloraCapabilities=null;let syloraVoiceId=localStorage.getItem('sylora_voice_id')||'',syloraVoiceLocale=localStorage.getItem('sylora_voice_locale')||'';
async function refreshCapabilities(){try{syloraCapabilities=await api('/api/ai/capabilities')}catch{syloraCapabilities=null}const bar=document.querySelector('#syloraDegraded');if(!bar)return;if(syloraCapabilities?.degraded?.ai||syloraCapabilities?.degraded?.voice){bar.hidden=false;bar.textContent=t(syloraCapabilities.degraded.ai?'aiTextDegraded':'voiceUnavailable')}else bar.hidden=true}
function degradedBannerHtml(){return '<div id="syloraDegraded" class="sylora-degraded" hidden></div>'}
async function api(path,opts={}){const h={'content-type':'application/json',...(opts.headers||{})};if(state.token)h.authorization=`Bearer ${state.token}`;const r=await fetch(path,{...opts,headers:h});const j=await r.json().catch(()=>({}));if(!r.ok){if(r.status===401)clearRtcConfigCache();throw Object.assign(new Error(j.message||j.error||'REQUEST_FAILED'),{status:r.status,data:j})}return j}
function toast(msg){const e=document.querySelector('#toast');e.textContent=msg;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2400)}
function applyShellLanguage(){document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n))}
function account(){
  const el=document.querySelector('#account');
  const localeOptions=[['uk','UA'],['en','EN'],['pl','PL'],['de','DE'],['ru','RU']]
    .map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
  const initials=state.me?String(state.me.displayName||state.me.username||'IK').split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase():'IK';
  const balance=Number(state.wallet?.balance||0).toLocaleString(getLocale()==='uk'?'uk-UA':undefined);
  el.innerHTML=`<select id="localeSwitch" class="top-locale" aria-label="${esc(t('language'))}" tabindex="-1">${localeOptions}</select>${state.me?`<button class="lumen-pill" data-account-view="gifts" title="${esc(t('gifts'))}"><span class="coin">✦</span><b>${balance}</b><span class="lumen-add">＋</span></button><button class="icon-action" data-account-view="messages" title="${esc(t('inbox'))}" aria-label="${esc(t('inbox'))}">♧<i class="notification-dot"></i></button><button class="profile-button" data-account-view="profile" title="${esc(t('profile'))}"><span class="avatar avatar--ivan">${esc(initials)}</span><span class="online-dot"></span></button><button class="header-exit" id="logout" title="${esc(t('signout'))}" aria-label="${esc(t('signout'))}">↪</button>`:`<button class="signin-reference" id="signin">${esc(t('signin'))}</button>`}`;
  el.querySelector('#localeSwitch').value=getLocale();
  el.querySelector('#localeSwitch').onchange=async e=>{const locale=setLocale(e.target.value);applyShellLanguage();if(state.me){const out=await api('/api/me',{method:'PATCH',body:JSON.stringify({locale})});state.me=out.user}account();refreshRightRail();render()};
  el.querySelectorAll('[data-account-view]').forEach(b=>b.onclick=()=>nav(b.dataset.accountView));
  el.querySelector(state.me?'#logout':'#signin').onclick=()=>state.me?logout():renderAuth();
  const sidebarAccount=document.querySelector('.account-row');
  if(sidebarAccount){
    sidebarAccount.hidden=!state.me;
    if(state.me){
      sidebarAccount.querySelector('.avatar').textContent=initials;
      sidebarAccount.querySelector('b').textContent=state.me.displayName||state.me.username;
      sidebarAccount.querySelector('small').textContent=`@${state.me.username}`;
    }
  }
}
async function refreshRightRail(){
  const rail=document.querySelector('aside.right');if(!rail)return;
  let users=[],rooms=[];
  try{rooms=(await api('/api/live')).rooms||[]}catch{}
  if(state.me)try{users=((await api('/api/users')).users||[]).filter(u=>u.id!==state.me.id).slice(0,3)}catch{}
  const people=users.map(u=>`<div class="shell-person"><span>${esc((u.displayName||u.username||'?').slice(0,1).toUpperCase())}</span><div><b>${esc(u.displayName||u.username)}</b><small>@${esc(u.username)}</small></div><button type="button" data-shell-view="explore" aria-label="${esc(t('follow'))}">＋</button></div>`).join('');
  const live=rooms.slice(0,4).map(r=>`<button type="button" class="shell-event" data-shell-view="live"><i>◉</i><span><b>${esc(r.title)}</b><small>@${esc(r.host?.username||'creator')} · ${r.viewerCount||0}</small></span><em>LIVE</em></button>`).join('');
  rail.innerHTML=`<div class="mini-card shell-people"><div class="shell-card-title"><b>${esc(t('peopleMayKnow'))}</b><button type="button" data-shell-view="explore">${esc(t('showAll'))}</button></div>${people||`<p class="shell-empty">${esc(t('newPeopleHere'))}</p>`}</div><div class="mini-card shell-events"><div class="shell-card-title"><b>${esc(t('popularNow'))}</b><button type="button" data-shell-view="live">${esc(t('watch'))}</button></div>${live||`<p class="shell-empty">${esc(t('waitingLive'))}</p>`}</div>${state.me?`<button type="button" class="mini-card shell-wallet" data-shell-view="gifts"><span><small>${esc(t('myLumen'))}</small><b>◈ ${(state.wallet?.balance||0).toLocaleString()}</b></span><i><img src="${CANONICAL_BRAND_ASSET}" width="1100" height="650" alt="" data-brand-sha256="dc50f228968b2cebe46a2030cb5b22789482f680caca58171f06b0f25db40f08" decoding="sync" loading="eager"></i></button>`:`<button type="button" class="mini-card shell-wallet" data-shell-view="explore"><span><small>SYLORA</small><b>${esc(t('explore'))}</b></span><i><img src="${CANONICAL_BRAND_ASSET}" width="1100" height="650" alt="" data-brand-sha256="dc50f228968b2cebe46a2030cb5b22789482f680caca58171f06b0f25db40f08" decoding="sync" loading="eager"></i></button>`}`;
  rail.querySelectorAll('[data-shell-view]').forEach(x=>x.onclick=()=>nav(x.dataset.shellView));
}
async function refreshRailProgress(){const box=document.querySelector('#railProgress');if(!box)return;if(!state.me){box.innerHTML='';return}try{const p=await api('/api/progress'),level=p.orbitLevel||1,xp=Number(p.donorXp)||0,start=120*(level-1)**2,next=120*level**2,pct=Math.max(2,Math.min(100,Math.round((xp-start)/Math.max(1,next-start)*100)));box.innerHTML=`<button class="rail-orbit" data-rail-progress><span class="rail-orbit-mark">✧</span><span><small>ORBIT РІВЕНЬ</small><b>${level}</b><i><em style="width:${pct}%"></em></i><u>${xp.toLocaleString()} XP</u></span></button>`;box.querySelector('[data-rail-progress]').onclick=()=>nav('profile')}catch{box.innerHTML=''}}
function reportClientIssue(phase,error){
  const message=error?.stack||error?.message||String(error||'unknown');
  console.error(`[SYLORA:${phase}]`,error);
  fetch('/__client_error?phase='+encodeURIComponent(phase)+'&m='+encodeURIComponent(message.slice(0,1800)),{cache:'no-store'}).catch(()=>{});
}
async function initGiftEngine(){
  window.__syloraGiftEngineState='loading';
  try{
    const {SyloraGiftRuntime}=await import('./gift-runtime.js');
    giftEngine=new SyloraGiftRuntime(document.querySelector('#gift-stage'));
    window.__syloraGiftEngineState='ready';
  }catch(error){window.__syloraGiftEngineState='failed';reportClientIssue('gift-runtime',error)}
}
async function bootstrap(){
  state.view=viewFromPathname();
  syncReferenceShell(state.view);
  if(state.token){
    try{const session=await api('/api/me');state.me=session.user;state.wallet=session.wallet||null;if(!localStorage.getItem('sylora_locale'))setLocale(state.me.locale)}
    catch(error){reportClientIssue('session',error);state.token='';clearRtcConfigCache();localStorage.removeItem('sylora_token')}
  }
  applyShellLanguage();
  if(!document.querySelector('#syloraDegraded'))document.body.insertAdjacentHTML('afterbegin',degradedBannerHtml());
  refreshCapabilities();
  account();
  await render();
  window.__syloraBooted=true;
  Promise.allSettled([refreshRightRail(),refreshRailProgress(),initGiftEngine()]);
  if(state.me)startUserEvents();
  try{
    const giftStream=new EventSource('/api/gifts/stream');
    giftStream.addEventListener('gift',e=>{try{showGift(JSON.parse(e.data))}catch(error){reportClientIssue('gift-event',error)}});
    giftStream.addEventListener('error',()=>console.warn('[SYLORA:gift-stream] reconnecting'));
  }catch(error){reportClientIssue('gift-stream',error)}
}
async function startUserEvents(){if(!state.token)return;if(userEventsAbort)userEventsAbort.abort();const controller=new AbortController();userEventsAbort=controller;try{const response=await fetch('/api/events',{headers:{authorization:`Bearer ${state.token}`},signal:controller.signal});if(!response.ok)throw new Error('EVENT_STREAM_FAILED');const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';while(!controller.signal.aborted){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let boundary;while((boundary=buffer.indexOf('\n\n'))>=0){const raw=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);let event='message',data='';for(const line of raw.split('\n')){if(line.startsWith('event:'))event=line.slice(6).trim();if(line.startsWith('data:'))data+=line.slice(5).trim()}if(data)try{handleUserEvent(event,JSON.parse(data))}catch{}}}}catch(e){if(e.name!=='AbortError'&&state.token&&userEventsAbort===controller)setTimeout(()=>{if(state.token)startUserEvents()},1800)}}
function realtimeDuplicate(scope,id){if(!id)return false;const key=`${scope}:${id}`,now=Date.now();for(const [candidate,expires] of recentRealtimeIds)if(expires<=now)recentRealtimeIds.delete(candidate);if(recentRealtimeIds.has(key))return true;recentRealtimeIds.set(key,now+5*60_000);return false}
function handleUserEvent(event,data){
  if(event==='notification'&&realtimeDuplicate('notification',data?.id))return;
  if(event==='notification'){
    const type=String(data.type||'');
    if(type==='voice_call'||type==='video_call'){
      state.incomingCall={callId:data.payload?.callId||data.callId,kind:data.payload?.kind||(type==='video_call'?'video':'voice'),actor:data.actor};
      showIncomingCallBanner();
      return;
    }
    if(type!=='message')toast(`${data.actor?.username||'SYLORA'} · ${type}`);
  }
  if(event==='message'){toast(`@${data.actor?.username||'user'} · ${t('newMessage')}`);if(state.view==='messages')renderMessagesReference()}
}
function showIncomingCallBanner(){
  const call=state.incomingCall;if(!call?.callId)return;
  document.querySelector('#incomingCallBanner')?.remove();
  const el=document.createElement('div');
  el.id='incomingCallBanner';
  el.className='incoming-call-banner';
  el.innerHTML=`<span><b>${esc(t(call.kind==='video'?'videoCall':'voiceCall'))}</b><small>@${esc(call.actor?.username||'user')}</small></span><div class="row"><button type="button" class="primary" id="acceptIncomingCall">${esc(t('accept'))}</button><button type="button" class="ghost" id="declineIncomingCall">${esc(t('decline'))}</button></div>`;
  document.body.append(el);
  document.querySelector('#acceptIncomingCall').onclick=async()=>{
    try{
      await api(`/api/calls/${call.callId}/accept`,{method:'POST',body:'{}'});
      state.incomingCall=null;el.remove();
      await openCallSession(call.callId,{asCallee:true});
    }catch(e){toast(humanError(e.message))}
  };
  document.querySelector('#declineIncomingCall').onclick=async()=>{
    try{await api(`/api/calls/${call.callId}/decline`,{method:'POST',body:'{}'})}catch{}
    state.incomingCall=null;el.remove();
  };
}
const REFERENCE_SCREEN_BY_VIEW={feed:'home',live:'live',clips:'clips',videos:'clips',studio:'studio',ai:'sylora',explore:'explore',communities:'communities',learning:'learning',business:'business',messages:'inbox',profile:'profile',gifts:'wallet',more:'settings'};
const REFERENCE_ROUTE_KEYS={feed:'home',live:'live',clips:'clips',videos:'videos',studio:'studio',ai:'ai',explore:'explore',communities:'communities',learning:'learning',business:'business',messages:'inbox',profile:'profile',gifts:'wallet',more:'settings'};
function syncReferenceShell(view){
  const screen=REFERENCE_SCREEN_BY_VIEW[view]||view;
  const shell=document.querySelector('.sylora-app');if(shell)shell.dataset.screen=screen;
  document.querySelectorAll('.nav[data-view]').forEach(item=>{const active=item.dataset.view===view;item.classList.toggle('active',active);item.classList.toggle('is-active',active);item.dataset.active=String(active);if(active)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current')});
  const routeTitle=document.querySelector('#routeTitle');if(routeTitle)routeTitle.textContent=t(REFERENCE_ROUTE_KEYS[view]||'home');
  document.body.classList.remove('mobile-menu-open');
}
function nav(view){if(conferenceSessionCleanup){conferenceSessionCleanup();conferenceSessionCleanup=null}if(activeCallCleanup){activeCallCleanup();activeCallCleanup=null}if(state.view==='studio'&&view!=='studio'){stopStudioTracks();disconnectStudioObs();stopStudioDistributionPolling()}if(state.view==='live'&&view!=='live'){cleanupLiveViewer();tiktokPilotCleanup?.();tiktokPilotCleanup=null}if(state.view==='ai'&&view!=='ai'){stopSyloraRealtime();stopSyloraVoice()}if(liveEventSource){liveEventSource.close();liveEventSource=null}state.view=view;syncPathForView(view);syncReferenceShell(view);render()}
document.addEventListener('click',event=>{const button=event.target.closest?.('.nav[data-view]');if(button)nav(button.dataset.view)});
document.querySelector('#globalSearch')?.addEventListener('click',launchCommandPalette);
document.querySelector('#mobileMenu')?.addEventListener('click',()=>document.body.classList.toggle('mobile-menu-open'));
const sidebarToggle=document.querySelector('#sidebarToggle');
function setSidebarCollapsed(collapsed){document.body.classList.toggle('sidebar-collapsed',collapsed);sidebarToggle?.setAttribute('aria-expanded',String(!collapsed));if(sidebarToggle){sidebarToggle.textContent=collapsed?'›':'‹';sidebarToggle.setAttribute('aria-label',t(collapsed?'expandSidebar':'collapseSidebar'))}try{localStorage.setItem('sylora_sidebar_collapsed',collapsed?'1':'0')}catch{}}
if(innerWidth>=1100)setSidebarCollapsed(localStorage.getItem('sylora_sidebar_collapsed')==='1');
sidebarToggle?.addEventListener('click',()=>{if(innerWidth<768){document.body.classList.remove('mobile-menu-open');return}setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'))});
document.addEventListener('click',event=>{if(document.body.classList.contains('mobile-menu-open')&&!event.target.closest('.left-rail')&&!event.target.closest('#mobileMenu'))document.body.classList.remove('mobile-menu-open')});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();launchCommandPalette()}});
document.querySelectorAll('[data-create-hub]').forEach(b=>b.addEventListener('click',launchCreateHub));
document.querySelector('.brand')?.addEventListener('click',e=>{e.preventDefault();nav('feed')});
document.querySelectorAll('[data-rail-view]').forEach(x=>x.onclick=()=>nav(x.dataset.railView));
addEventListener('popstate',()=>nav(viewFromPathname()));
async function render(){
  app.classList.remove('sylora-layout','sylora-runtime-layout','settings-runtime-page','clips-runtime-page','live-runtime-page','studio-runtime-page','explore-runtime-page','communities-runtime-page','learning-runtime-page','business-runtime-page','inbox-runtime-page','profile-runtime-page','wallet-runtime-page');
  document.body.dataset.view=state.view;
  if(state.view==='gifts'){app.classList.add('wallet-runtime-page');return renderWalletReference()}
  if(state.view==='profile'){app.classList.add('profile-runtime-page');return state.me?renderProfileReference():renderAuth()}
  if(state.view==='clips'){app.classList.add('clips-runtime-page');return renderClips()}
  if(state.view==='videos')return renderVideos();
  if(state.view==='explore'){app.classList.add('explore-runtime-page');return renderExploreReference()}
  if(state.view==='live'){app.classList.add('live-runtime-page');return renderLive()}
  if(state.view==='studio'){app.classList.add('studio-runtime-page');return state.me?renderStudio():renderAuth()}
  if(state.view==='messages'){app.classList.add('inbox-runtime-page');return state.me?renderMessagesReference():renderAuth()}
  if(state.view==='ai')return state.me?renderAI():renderAuth();
  if(state.view==='more'){app.classList.add('settings-runtime-page');return renderMore()}
  if(state.view==='identity')return state.me?renderIdentity():renderAuth();
  if(state.view==='agents')return state.me?renderAgents():renderAuth();
  if(state.view==='developer')return state.me?renderDeveloper():renderAuth();
  if(state.view==='security')return state.me?renderSecurityCenter():renderAuth();
  if(state.view==='dashboard')return state.me?renderPersonalDashboard():renderAuth();
  if(state.view==='canvas')return state.me?renderCanvas():renderAuth();
  if(state.view==='admin')return state.me?.role==='admin'?renderAdmin():nav('more');
  if(state.view==='communities'){app.classList.add('communities-runtime-page');return renderCommunitiesReference()}
  if(state.view==='learning'){app.classList.add('learning-runtime-page');return renderLearningReference()}
  if(state.view==='business'){app.classList.add('business-runtime-page');return renderBusinessReference()}
  return renderFeed();
}
const REFERENCE_ICON_PATHS={
  sparkles:'<path d="M11 3l1.3 5.7L18 10l-5.7 1.3L11 17l-1.3-5.7L4 10l5.7-1.3L11 3z"/><path d="M19 3v4M21 5h-4"/>',
  live:'<path d="M16.2 7.8a6 6 0 010 8.4M19.1 4.9a10 10 0 010 14.2M4.9 19.1a10 10 0 010-14.2M7.8 16.2a6 6 0 010-8.4"/><circle cx="12" cy="12" r="2"/>',
  studio:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M10 8l5 3-5 3V8zM12 17v4M8 21h8"/>',
  learning:'<path d="M3 10l9-4 9 4-9 4-9-4zM6 12v4c3 2 9 2 12 0v-4M21 10v6"/>',
  business:'<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M8 6V4h8v2M2 12c5 3 15 3 20 0M12 12h.01"/>',
  arrow:'<path d="M7 7h10v10M7 17L17 7"/>',
  clip:'<path d="M3 10h18v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9zM3 10l16-5M7 4l3 4M14 2l3 4"/>',
  mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-9 6a2 2 0 01-2 0L2 7"/>',
  wallet:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 8h18M15 14h4"/>',
  activity:'<path d="M2 12h4l3-9 6 18 3-9h4"/>',
  play:'<path d="M7 4l13 8-13 8V4z"/>',
  calendar:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18M8 13h.01M12 13h.01M16 13h.01"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  users:'<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',
  check:'<path d="M20 6L9 17l-5-5"/>',
  chevron:'<path d="M9 18l6-6-6-6"/>',
  camera:'<path d="M14.5 4l1.5 2H20a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h4l1.5-2h5z"/><circle cx="12" cy="13" r="4"/>',
  mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0M12 17v5M8 22h8"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  chart:'<path d="M3 3v18h18M7 16l4-5 4 3 5-8"/>'
};
function referenceIcon(name){return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${REFERENCE_ICON_PATHS[name]||REFERENCE_ICON_PATHS.sparkles}</svg>`}
async function renderFeed(){
  let posts=[],rooms=[],hub=null;
  try{const feed=await api('/api/feed');posts=Array.isArray(feed.posts)?feed.posts:[]}catch(error){reportClientIssue('feed',error)}
  try{rooms=(await api('/api/live')).rooms||[]}catch{}
  if(state.me)try{hub=(await api('/api/home/hub')).hub}catch{}
  const hour=new Date().getHours(),hello=t(hour<12?'goodMorning':hour<18?'goodAfternoon':'goodEvening');
  const unread=Number(hub?.inboxPreview?.unreadNotifications)||0,conversationCount=(hub?.inboxPreview?.conversations||[]).length,continueItem=hub?.continue?.[0]||null;
  const rawName=String(state.me?.displayName||state.me?.username||'').trim().split(/\s+/)[0];
  const greetingName=/^ivan$/i.test(rawName)?'Іване':rawName;
  const greeting=state.me&&greetingName?`${hello}, ${greetingName}`:hello;
  const totalViewers=rooms.reduce((sum,room)=>sum+Number(room.viewerCount||0),0);
  const featured=rooms[0]||null;
  const sparkline=heights=>`<div class="sparkline" aria-label="${esc(t('chartTrend'))}">${heights.map((height,index)=>`<i style="height:${height}%;animation-delay:${index*45}ms"></i>`).join('')}</div>`;
  app.innerHTML=`<div class="screen-grid home-screen">
    <section class="content-stack">
      <div class="hero-copy">
        <div class="home-horizon-scene" aria-hidden="true"><span class="home-horizon-orbit home-horizon-orbit--one"></span><span class="home-horizon-orbit home-horizon-orbit--two"></span><span class="home-horizon-crystal"></span><i class="home-horizon-star star-one"></i><i class="home-horizon-star star-two"></i><i class="home-horizon-star star-three"></i></div>
        <span class="status-pill status-pill--gold">${referenceIcon('sparkles')} LIVING HORIZON</span>
        <h1>${esc(greeting)}<span>✦</span></h1>
        <p>Усе важливе — в одному живому просторі. Без хаосу, зайвих панелей і прихованих дій.</p>
        <div class="hero-actions"><button class="depth-button" type="button" data-horizon-create><span>Створити</span>${referenceIcon('sparkles')}</button><button class="depth-button depth-button--secondary" type="button" data-horizon-view="live"><span>Відкрити LIVE</span>${referenceIcon('live')}</button></div>
      </div>

      <div class="quick-worlds">
        <button class="world-button" style="--world-accent:#e83b79" type="button" data-horizon-view="live"><span>${referenceIcon('live')}</span><b>LIVE</b><small>${rooms.length} ефірів</small>${referenceIcon('arrow')}</button>
        <button class="world-button" style="--world-accent:#16899b" type="button" data-horizon-view="studio"><span>${referenceIcon('studio')}</span><b>Studio</b><small>${state.me?'Відкрити':'Потрібен вхід'}</small>${referenceIcon('arrow')}</button>
        <button class="world-button" style="--world-accent:#28927d" type="button" data-horizon-view="learning"><span>${referenceIcon('learning')}</span><b>Навчання</b><small>${continueItem?.kind==='learning'?'Продовжити':'Відкрити'}</small>${referenceIcon('arrow')}</button>
        <button class="world-button" style="--world-accent:#ad7a28" type="button" data-horizon-view="business"><span>${referenceIcon('business')}</span><b>Бізнес</b><small>Відкрити</small>${referenceIcon('arrow')}</button>
      </div>

      <div class="section-title"><div><span>ЗАРАЗ У SYLORA</span><h2>Живий момент</h2></div><button type="button" data-horizon-view="live">Дивитися все${referenceIcon('arrow')}</button></div>
      <div class="home-feature-grid">
        <button type="button" class="glass-card featured-live reference-live-button" data-horizon-view="live"${featured?.id?` data-live-id="${esc(featured.id)}"`:''}>
          <div class="living-stage-art" aria-hidden="true"><i></i><i></i><i></i></div><div class="media-shade"></div>
          <div class="live-topline"><span class="status-pill status-pill--live">${referenceIcon('live')} LIVE</span><span>${totalViewers.toLocaleString()} дивляться</span></div>
          <div class="live-copy"><small>SYLORA LIVE</small><h3>${esc(featured?.title||t('startLive'))}</h3><p>${featured?esc(t('liveConnected')):esc(t('noLiveNow'))}</p>${featured?`<div><span class="avatar avatar--host">${esc((featured.host?.displayName||featured.host?.username||'S').slice(0,1).toUpperCase())}</span><b>${esc(featured.host?.displayName||featured.host?.username||'Creator')}</b><span>• LIVE</span></div>`:''}</div>
        </button>
        <div class="moment-list">
          <article class="glass-card moment-card" data-eco-nav="clips"><span class="moment-icon violet">${referenceIcon('clip')}</span><div><small>CLIPS</small><b>Переглянути справжні відео</b><span>${posts.length?`${posts.length} публікацій у стрічці`:'Поки без вигаданих переглядів'}</span></div>${referenceIcon('play')}</article>
          <article class="glass-card moment-card" data-eco-nav="learning"><span class="moment-icon mint">${referenceIcon('learning')}</span><div><small>${continueItem?'ПРОДОВЖИТИ':'НАВЧАННЯ'}</small><b>${esc(continueItem?.label||'Відкрити простір навчання')}</b><span>${continueItem?'Збережений прогрес':'Обрати курс'}</span></div>${referenceIcon('arrow')}</article>
          <article class="glass-card moment-card" data-eco-nav="business"><span class="moment-icon gold">${referenceIcon('business')}</span><div><small>БІЗНЕС</small><b>Аналітика без вигаданих цифр</b><span>Реальні показники після активації</span></div>${referenceIcon('arrow')}</article>
        </div>
      </div>

      <section class="dynamic-home-feed">
        <div class="section-title"><div><span>ВАШ ПРОСТІР</span><h2>${esc(t('forYou'))}</h2></div></div>
        ${state.me?`<form id="composer" class="composer"><textarea name="text" maxlength="4000" placeholder="${esc(t('composer'))} ${esc(state.me.displayName)}?"></textarea><button class="primary">${esc(t('publish'))}</button></form>`:`<div class="glass-card auth"><b>${esc(t('joinTitle'))}</b><p class="muted">${esc(t('joinText'))}</p><button id="join" class="depth-button">${esc(t('join'))}</button></div>`}
        <div id="feed">${posts.map(postHtml).join('')||`<div class="glass-card post muted">${esc(t('emptyFeed'))}</div>`}</div>
      </section>
    </section>

    <aside class="context-stack">
      <article class="glass-card pulse-card"><div class="card-top"><span>${referenceIcon('activity')} LIVE PULSE</span><span class="status-pill status-pill--success">online</span></div><div class="pulse-number"><b>${totalViewers.toLocaleString()}</b><small>глядачів у реальних LIVE зараз</small></div><div class="split-stats"><span><b>${rooms.length}</b><small>активних ефірів</small></span><span><b>${state.me?'ON':'—'}</b><small>особистий простір</small></span></div></article>
      <article class="glass-card"><div class="section-title"><div><h2>Важливе</h2></div></div><div class="focus-list">
        <button type="button" data-horizon-view="messages"><span class="focus-icon blue">${referenceIcon('mail')}</span><span><b>${unread} нові повідомлення</b><small>${conversationCount} активні розмови</small></span>${referenceIcon('arrow')}</button>
        <button type="button" data-integration-view="studio"><span class="focus-icon cyan">${referenceIcon('studio')}</span><span><b>Streaming Hub</b><small>TikTok · YouTube · OBS · TikFinity</small><span class="platform-pills"><i>TikTok</i><i>YouTube</i><i>OBS</i><i>TikFinity</i></span></span>${referenceIcon('arrow')}</button>
        <button type="button" data-horizon-view="gifts"><span class="focus-icon gold">${referenceIcon('wallet')}</span><span><b>${state.me?`${Number(state.wallet?.balance||0).toLocaleString()} LUMEN`:'Гаманець'}</b><small>${state.me?'поточний баланс':'увійди, щоб переглянути'}</small></span>${referenceIcon('arrow')}</button>
      </div></article>
    </aside>
  </div>`;
  document.querySelectorAll('[data-horizon-view]').forEach(x=>x.onclick=()=>{if(x.dataset.liveId)state.intent=x.dataset.liveId;nav(x.dataset.horizonView)});
  document.querySelectorAll('[data-integration-view]').forEach(x=>x.onclick=()=>nav(x.dataset.integrationView));
  document.querySelectorAll('[data-horizon-create],[data-focus-create]').forEach(button=>button.addEventListener('click',launchCreateHub));
  document.querySelectorAll('[data-eco-nav]').forEach(x=>x.onclick=()=>{const v=x.dataset.ecoNav;if(v==='live'&&x.dataset.liveId){state.intent=x.dataset.liveId;nav('live');return}if(v==='learning'&&x.dataset.course){state.intent=x.dataset.course;nav('learning');return}nav(v)});
  document.querySelector('#join')?.addEventListener('click',renderAuth);
  document.querySelector('#composer')?.addEventListener('submit',async e=>{e.preventDefault();const text=new FormData(e.currentTarget).get('text');if(!String(text).trim())return;await api('/api/posts',{method:'POST',body:JSON.stringify({text})});toast(t('publish'));renderFeed()});
  if(state.intent==='composer'||state.intent==='post'){state.intent=null;requestAnimationFrame(()=>document.querySelector('#composer textarea')?.focus())}
  bindPosts();
}
function postHtml(p){return `<article class="card post" data-id="${p.id}"><div class="user"><span class="avatar">${esc((p.author?.displayName||'?')[0].toUpperCase())}</span><div><b>${esc(p.author?.displayName||'User')}</b><small>@${esc(p.author?.username||'unknown')} · ${new Date(p.createdAt).toLocaleString()}</small></div></div><div class="post-text">${esc(p.text)}</div><div class="actions"><button class="react ${p.reacted?'on':''}">✦ ${p.reactionCount}</button><button class="comments">◌ ${p.commentCount}</button>${state.me?`<button class="ask-sylora ghost" data-type="post" data-id="${p.id}">Ask Sylora</button>`:''}${state.me&&p.author?.id!==state.me.id?`<button class="follow" data-user="${p.author.id}">＋ Підписатися</button><button class="report-post" data-post="${p.id}">⚑ Report</button><button class="block-user" data-user="${p.author.id}">⊘ Block</button>`:''}</div><div class="comment-zone"></div></article>`}
function bindPosts(){document.querySelectorAll('.react').forEach(b=>b.onclick=async()=>{if(!state.me)return renderAuth();await api(`/api/posts/${b.closest('.post').dataset.id}/react`,{method:'POST'});renderFeed()});document.querySelectorAll('.comments').forEach(b=>b.onclick=()=>loadComments(b.closest('.post')));document.querySelectorAll('.follow').forEach(b=>b.onclick=async()=>{await api(`/api/users/${b.dataset.user}/follow`,{method:'POST'});toast(t('followStatusChanged'))});document.querySelectorAll('.report-post').forEach(b=>b.onclick=async()=>{const reason=prompt(t('reportReason'));if(!reason)return;await api('/api/reports',{method:'POST',body:JSON.stringify({targetType:'post',targetId:b.dataset.post,reason})});toast(t('reportSent'))});document.querySelectorAll('.block-user').forEach(b=>b.onclick=async()=>{if(!confirm(t('blockUserConfirm')))return;await api(`/api/users/${b.dataset.user}/block`,{method:'POST'});toast(t('userBlocked'));renderFeed()});document.querySelectorAll('.ask-sylora').forEach(b=>b.onclick=async()=>{if(!state.me)return renderAuth();const q=prompt(t('askSyloraPrompt'),t('explain'))||t('explain');try{const out=await api('/api/ai/ask',{method:'POST',body:JSON.stringify({contentType:b.dataset.type,contentId:b.dataset.id,question:q,view:state.view})});toast(out.answer||'OK')}catch(e){toast(humanError(e.message))}})}
async function loadComments(post){const {comments}=await api(`/api/posts/${post.dataset.id}/comments`);const zone=post.querySelector('.comment-zone');zone.innerHTML=`<div style="margin-top:14px">${comments.map(c=>`<p><b>@${esc(c.author.username)}</b> ${esc(c.text)}</p>`).join('')}${state.me?`<form class="composer comment-form"><textarea name="text" maxlength="1000" placeholder="${esc(t('commentPlaceholder'))}"></textarea><button class="primary">${esc(t('send'))}</button></form>`:''}</div>`;zone.querySelector('form')?.addEventListener('submit',async e=>{e.preventDefault();const text=new FormData(e.currentTarget).get('text');await api(`/api/posts/${post.dataset.id}/comments`,{method:'POST',body:JSON.stringify({text})});loadComments(post)})}
function renderAuth(){
  const copy=key=>authText(getLocale(),key);
  app.innerHTML=`<div class="card auth auth-shell"><span class="eyebrow">SYLORA ID</span><h2>${esc(t('authTitle'))}</h2><div class="tabs auth-tabs" role="tablist"><button type="button" class="primary" id="regTab" role="tab" aria-selected="true" aria-controls="authForm">${esc(t('register'))}</button><button type="button" class="ghost" id="loginTab" role="tab" aria-selected="false" aria-controls="authForm">${esc(t('login'))}</button></div><form id="authForm" class="fields auth-fields" novalidate><div id="authFields" class="auth-field-list"></div><button type="submit" class="primary auth-submit" id="authSubmit">${esc(t('create'))}</button><p id="authError" class="auth-error" role="alert" aria-live="polite" hidden></p></form></div>`;
  const form=document.querySelector('#authForm'),fields=document.querySelector('#authFields'),submit=document.querySelector('#authSubmit'),error=document.querySelector('#authError'),registerTab=document.querySelector('#regTab'),loginTab=document.querySelector('#loginTab');
  let mode='register',busy=false;
  const fieldMarkup=()=>mode==='register'
    ?`<label class="auth-field"><span>${esc(copy('usernameLabel'))}</span><input name="username" minlength="3" maxlength="30" pattern="[A-Za-z0-9_]{3,30}" autocomplete="username" autocapitalize="none" spellcheck="false" aria-describedby="authUsernameHint" required><small id="authUsernameHint">${esc(copy('usernameHint'))}</small></label><label class="auth-field"><span>${esc(copy('emailLabel'))}</span><input name="email" type="email" maxlength="254" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="name@example.com" required></label><label class="auth-field"><span>${esc(copy('passwordLabel'))}</span><input name="password" type="password" minlength="10" maxlength="256" autocomplete="new-password" aria-describedby="authPasswordHint" required><small id="authPasswordHint">${esc(copy('passwordHint'))}</small></label>`
    :`<label class="auth-field"><span>${esc(copy('identityLabel'))}</span><input name="identity" maxlength="254" autocomplete="username" autocapitalize="none" spellcheck="false" required></label><label class="auth-field"><span>${esc(copy('passwordLabel'))}</span><input name="password" type="password" maxlength="256" autocomplete="current-password" required></label>`;
  const showError=message=>{error.textContent=message||'';error.hidden=!message};
  const setBusy=next=>{busy=next;form.setAttribute('aria-busy',String(next));submit.disabled=next;registerTab.disabled=next;loginTab.disabled=next;submit.textContent=next?copy('working'):t(mode==='register'?'create':'login')};
  const bindFields=()=>fields.querySelectorAll('input').forEach(field=>field.addEventListener('input',()=>{field.removeAttribute('aria-invalid');showError('')}));
  const setMode=(next,{focus=true}={})=>{
    if(busy)return;
    mode=next;
    registerTab.className=mode==='register'?'primary':'ghost';
    loginTab.className=mode==='login'?'primary':'ghost';
    registerTab.setAttribute('aria-selected',String(mode==='register'));
    loginTab.setAttribute('aria-selected',String(mode==='login'));
    fields.innerHTML=fieldMarkup();
    submit.textContent=t(mode==='register'?'create':'login');
    showError('');
    bindFields();
    if(focus)requestAnimationFrame(()=>fields.querySelector('input')?.focus());
  };
  registerTab.addEventListener('click',()=>setMode('register'));
  loginTab.addEventListener('click',()=>setMode('login'));
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy)return;
    fields.querySelectorAll('input').forEach(field=>field.removeAttribute('aria-invalid'));
    showError('');
    const validation=validateAuthInput(mode,Object.fromEntries(new FormData(form)));
    if(!validation.ok){
      const field=form.elements.namedItem(validation.field);
      field?.setAttribute('aria-invalid','true');
      showError(copy(validation.messageKey));
      field?.focus();
      return;
    }
    let authenticated=false;
    setBusy(true);
    try{
      const out=await api(`/api/auth/${mode}`,{method:'POST',body:JSON.stringify(validation.input)});
      if(!out?.token||!out?.user)throw Object.assign(new Error('AUTH_RESPONSE_INVALID'),{status:502});
      authenticated=true;
      state.token=out.token;state.me=out.user;state.wallet=null;
      clearRtcConfigCache();
      localStorage.setItem('sylora_token',state.token);
      try{
        const session=await api('/api/me');
        state.me=session.user||state.me;state.wallet=session.wallet||null;
      }catch(sessionError){
        if(sessionError?.status===401)throw sessionError;
        reportClientIssue('auth-session',sessionError);
      }
      if(state.me?.locale)setLocale(state.me.locale);
      applyShellLanguage();account();refreshRightRail();refreshRailProgress();startUserEvents();nav('feed');
    }catch(err){
      if(authenticated&&err?.status===401){state.token='';state.me=null;state.wallet=null;localStorage.removeItem('sylora_token')}
      showError(copy(authErrorKey(err)));
    }finally{
      if(form.isConnected)setBusy(false);
    }
  });
  setMode('register',{focus:false});
  requestAnimationFrame(()=>fields.querySelector('input')?.focus());
}
async function renderGifts(){
  const {gifts,creatorShareBps}=await api('/api/gifts');let meData=null,users=[];
  if(state.me){meData=await api('/api/me');state.wallet=meData.wallet;account();users=(await api('/api/users')).users}
  app.innerHTML=`<div class="card hero"><span class="eyebrow">${esc(t('giftConstellation'))}</span><h1>${esc(t('giftHero'))}</h1><p>${esc(t('giftGalleryIntro'))}</p><div class="scene-readout"><span><small>${esc(t('collection'))}</small><b>${gifts.length}</b></span><span><small>${esc(t('levels'))}</small><b>ORBIT</b></span><span><small>${esc(t('effects'))}</small><b>LIVE</b></span></div>${meData?`<div class="balance">◈ ${meData.wallet.balance.toLocaleString()} LUMEN</div>`:`<button id="giftLogin" class="primary">${esc(t('signinToSend'))}</button>`}</div>${state.me?`<div class="card auth"><div class="inline-fields"><label>${esc(t('recipient'))}<select id="giftRecipient"><option value="">${esc(t('chooseUser'))}</option>${users.map(u=>`<option value="${u.id}">@${esc(u.username)} — ${esc(u.displayName)}</option>`).join('')}</select></label><label>${esc(t('combo'))}<select id="giftQuantity"><option value="1">×1</option><option value="5">×5</option><option value="10">×10</option></select></label></div><p class="muted">${esc(t('creatorShareTest'))}: ${(creatorShareBps/100).toFixed(0)}%.</p></div>`:''}<div class="gifts gift-constellation">${gifts.map((g,i)=>`<div class="card gift" data-gift="${esc(g.id)}" style="--gift-index:${i}"><div class="gift-orb" style="background:${g.color};color:${g.color}"><i>${liveGiftGlyph(g.id)}</i></div><strong>${esc(g.name)}</strong><small>${esc(g.tier)} · ◈ ${g.price}</small></div>`).join('')}</div>`;
  document.querySelector('#giftLogin')?.addEventListener('click',renderAuth);
  document.querySelectorAll('.gift').forEach(x=>x.onclick=async()=>{if(!state.me)return renderAuth();const recipientId=document.querySelector('#giftRecipient').value,quantity=Number(document.querySelector('#giftQuantity').value);if(!recipientId)return toast(t('chooseRecipientFirst'));try{const out=await api('/api/gifts/send',{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({giftId:x.dataset.gift,recipientId,quantity})});if(state.wallet){state.wallet.balance=out.balance;account()}refreshRailProgress();toast(`${t('giftSent')} ×${quantity} · ${t('balance')} ◈ ${out.balance}`);renderGifts()}catch(e){toast(humanError(e.message))}})
}

async function renderProfile(){
  const [me,notes,ledger,stats,progress]=await Promise.all([api('/api/me'),api('/api/notifications'),api('/api/ledger'),api('/api/stats'),api('/api/progress')]);
  state.wallet=me.wallet;account();
  const level=progress.orbitLevel||1,xp=Number(progress.donorXp)||0,start=120*(level-1)**2,next=120*level**2,pct=Math.max(2,Math.min(100,Math.round((xp-start)/Math.max(1,next-start)*100))),initial=esc((me.user.displayName||me.user.username||'S').slice(0,1).toUpperCase());
  app.innerHTML=`<section class="card hero profile-hero"><div class="profile-aura"><span>${initial}</span></div><span class="eyebrow">MY SYLORA · PERSONAL ORBIT</span><h1>${esc(me.user.displayName)}</h1><p>@${esc(me.user.username)}${me.user.bio?` · ${esc(me.user.bio)}`:''}</p><div class="profile-orbit-level"><span>✧ ORBIT ${level}</span><i><em style="width:${pct}%"></em></i><small>${xp.toLocaleString()} XP · наступний рівень ${next.toLocaleString()} XP</small></div></section><section class="profile-vitals"><article class="card"><small>LUMEN</small><b>◈ ${me.wallet.balance.toLocaleString()}</b><span>доступний баланс</span></article><article class="card"><small>CREATOR</small><b>◈ ${stats.creatorEarnings.toLocaleString()}</b><span>заробіток</span></article><article class="card"><small>АУДИТОРІЯ</small><b>${stats.followers.toLocaleString()}</b><span>підписників</span></article><article class="card"><small>ПУБЛІКАЦІЇ</small><b>${stats.posts.toLocaleString()}</b><span>у SYLORA</span></article></section><div class="profile-columns"><section class="card profile-settings"><span class="eyebrow">ПЕРСОНАЛЬНИЙ ПРОСТІР</span><h3>Профіль</h3><form id="profile" class="fields"><label>Ім’я<input name="displayName" value="${esc(me.user.displayName)}" maxlength="60"></label><label>Про себе<textarea name="bio" maxlength="240" placeholder="Про себе">${esc(me.user.bio)}</textarea></label><label>Мова<select name="locale"><option value="uk">Українська</option><option value="pl">Polski</option><option value="en">English</option></select></label><button class="primary">Зберегти зміни</button></form><button id="profileLogout" class="ghost danger profile-mobile-signout" type="button">${esc(t('signout'))}</button></section><section class="card profile-activity"><span class="eyebrow">АКТИВНІСТЬ</span><h3>Сповіщення</h3><div class="profile-scroll">${notes.notifications.slice(0,8).map(n=>`<div class="profile-event"><i>✦</i><span><b>${esc(n.actor?.username||'SYLORA')}</b><small>${esc(n.type)}</small></span></div>`).join('')||'<p class="muted">Поки тихо.</p>'}</div><h3>Останні LUMEN-рухи</h3><div class="profile-scroll">${ledger.entries.slice(0,6).map(e=>`<div class="profile-event"><i>◈</i><span><b>${esc(e.type)} · ${e.amount}</b><small>${new Date(e.createdAt).toLocaleString()}</small></span></div>`).join('')||'<p class="muted">Транзакцій немає.</p>'}</div></section></div>`;
  const profileLocale=document.querySelector('#profile select[name="locale"]');
  profileLocale?.replaceChildren(...[['uk','Українська'],['en','English'],['pl','Polski'],['de','Deutsch'],['ru','Русский']].map(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;return option}));
  document.querySelector('#profile').locale.value=me.user.locale;
  document.querySelector('#profile').onsubmit=async e=>{e.preventDefault();const input=Object.fromEntries(new FormData(e.currentTarget));const out=await api('/api/me',{method:'PATCH',body:JSON.stringify(input)});state.me=out.user;account();toast('Профіль оновлено');renderProfile()};
  document.querySelector('#profileLogout')?.addEventListener('click',logout);
}

async function renderWalletReference(){
  const {gifts,creatorShareBps}=await api('/api/gifts');
  let meData=null,users=[],entries=[];
  if(state.me){
    const [session,userData,ledgerData]=await Promise.all([api('/api/me'),api('/api/users'),api('/api/ledger').catch(()=>({entries:[]}))]);
    meData=session;users=userData.users||[];entries=ledgerData.entries||[];state.wallet=session.wallet;account();
  }
  const balance=Number(meData?.wallet?.balance||0);
  app.innerHTML=`<div class="wallet-layout">
    <main class="wallet-main">
      <section class="wallet-balance">
        <div><span class="status-pill status-pill--gold">${referenceIcon('wallet')} SYLORA WALLET</span><small>${esc(t('availableBalance'))}</small><h1>${balance.toLocaleString()} <span>LUMEN</span></h1><p>${esc(t(state.me?'walletSignedIntro':'walletGuestIntro'))}</p>${state.me?'':`<button id="giftLogin" class="depth-button" type="button">${esc(t('openWallet'))}</button>`}</div>
        <span class="lumen-core" aria-hidden="true"><b>✦</b></span>
      </section>
      <section class="metric-grid wallet-metrics">
        <article class="glass-card metric-card"><span>${referenceIcon('wallet')}</span><small>${esc(t('balance'))}</small><b>${balance.toLocaleString()}</b><em>LUMEN</em></article>
        <article class="glass-card metric-card"><span>${referenceIcon('sparkles')}</span><small>${esc(t('gifts').toUpperCase())}</small><b>${gifts.length}</b><em>${esc(t('giftEffects'))}</em></article>
        <article class="glass-card metric-card"><span>${referenceIcon('activity')}</span><small>${esc(t('creatorShare'))}</small><b>${(creatorShareBps/100).toFixed(0)}%</b><em>${esc(t('testEconomy'))}</em></article>
      </section>
      ${state.me?`<section class="glass-card wallet-send-card"><div class="card-top"><div><small>${esc(t('sendGift'))}</small><h3>${esc(t('createLiveMoment'))}</h3></div></div><div class="wallet-send-controls"><label>${esc(t('recipient'))}<select id="giftRecipient"><option value="">${esc(t('chooseUser'))}</option>${users.map(u=>`<option value="${esc(u.id)}">@${esc(u.username)} — ${esc(u.displayName)}</option>`).join('')}</select></label><label>${esc(t('combo'))}<select id="giftQuantity"><option value="1">×1</option><option value="5">×5</option><option value="10">×10</option></select></label></div></section>`:''}
      <section class="gifts gift-constellation wallet-gifts">${gifts.map((gift,index)=>`<button class="glass-card gift" type="button" data-gift="${esc(gift.id)}" style="--gift-index:${index}"><span class="gift-orb" style="background:${gift.color};color:${gift.color}"><i>${liveGiftGlyph(gift.id)}</i></span><strong>${esc(gift.name)}</strong><small>${esc(gift.tier)} · ◈ ${gift.price}</small></button>`).join('')||`<div class="glass-card empty">${esc(t('giftCollectionPending'))}</div>`}</section>
      <section class="glass-card transactions-card"><div class="card-top"><div><small>${esc(t('lumenActivity'))}</small><h3>${esc(t('recentTransactions'))}</h3></div></div>${entries.slice(0,7).map(entry=>`<div class="transaction"><span class="transaction-icon">${referenceIcon(entry.amount>=0?'sparkles':'wallet')}</span><span><b>${esc(entry.type)}</b><small>${new Date(entry.createdAt).toLocaleString(getLocale()==='uk'?'uk-UA':getLocale())}</small></span><b class="${entry.amount>=0?'positive':''}">${entry.amount>=0?'+':''}${entry.amount}</b></div>`).join('')||`<p class="muted">${esc(t('noTransactions'))}</p>`}</section>
    </main>
    <aside class="context-stack">
      <section class="glass-card gift-preview"><span class="status-pill status-pill--gold">${esc(t('liveGifts'))}</span><div class="living-stage-art" aria-hidden="true"><i></i><i></i><i></i></div><h3>${esc(t('cinematicGifts'))}</h3><p>${esc(t('cinematicGiftsIntro'))}</p><button type="button" data-wallet-live>${esc(t('openLive'))} ${referenceIcon('arrow')}</button></section>
      <section class="glass-card security-mini">${referenceIcon('shield')}<div><b>${esc(t('secureWallet'))}</b><small>${esc(t('secureWalletIntro'))}</small></div>${referenceIcon('chevron')}</section>
    </aside>
  </div>`;
  document.querySelector('#giftLogin')?.addEventListener('click',renderAuth);
  document.querySelector('[data-wallet-live]')?.addEventListener('click',()=>nav('live'));
  document.querySelectorAll('.gift').forEach(button=>button.onclick=async()=>{
    if(!state.me)return renderAuth();
    const recipientId=document.querySelector('#giftRecipient')?.value,quantity=Number(document.querySelector('#giftQuantity')?.value||1);
    if(!recipientId)return toast(t('chooseRecipientFirst'));
    try{
      const out=await api('/api/gifts/send',{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({giftId:button.dataset.gift,recipientId,quantity})});
      if(state.wallet){state.wallet.balance=out.balance;account()}
      refreshRailProgress();toast(`${t('giftSent')} ×${quantity} · ${t('balance').toLocaleLowerCase()} ◈ ${out.balance}`);await renderWalletReference();
    }catch(error){toast(humanError(error.message))}
  });
}

async function renderProfileReference(){
  const [me,notes,ledger,stats,progress]=await Promise.all([api('/api/me'),api('/api/notifications'),api('/api/ledger'),api('/api/stats'),api('/api/progress')]);
  state.wallet=me.wallet;account();
  const level=progress.orbitLevel||1,xp=Number(progress.donorXp)||0,start=120*(level-1)**2,next=120*level**2,pct=Math.max(2,Math.min(100,Math.round((xp-start)/Math.max(1,next-start)*100)));
  const initial=esc((me.user.displayName||me.user.username||'S').slice(0,1).toUpperCase());
  app.innerHTML=`<section class="profile-page">
    <div class="profile-cover"><span class="cover-ribbons"></span><button type="button" id="profileCoverAction">${referenceIcon('camera')} ${esc(t('updateSpace'))}</button></div>
    <div class="profile-identity">
      <span class="profile-avatar">${initial}<i></i></span>
      <div><div><h1>${esc(me.user.displayName)} ${referenceIcon('sparkles')}</h1><span>@${esc(me.user.username)}</span></div><p>${esc(me.user.bio||t('profileLivingSpace'))}</p><div class="profile-meta"><span>${referenceIcon('sparkles')} ORBIT ${level}</span><span>${referenceIcon('wallet')} ${me.wallet.balance.toLocaleString()} LUMEN</span><span>${referenceIcon('check')} ${xp.toLocaleString()} XP</span></div></div>
      <div class="profile-buttons"><button type="button" class="depth-button" id="profileEdit">${esc(t('editProfile'))}</button><button type="button" id="profileMenu" aria-label="${esc(t('profileMenu'))}">•••</button></div>
    </div>
    <div class="profile-stats"><span><b>${stats.followers.toLocaleString()}</b><small>${esc(t('followersLabel'))}</small></span><span><b>${stats.posts.toLocaleString()}</b><small>${esc(t('postsLabel'))}</small></span><span><b>${stats.creatorEarnings.toLocaleString()}</b><small>${esc(t('earnedLabel'))}</small></span><span><b>${level}</b><small>${esc(t('orbitLevel'))}</small></span></div>
    <div class="profile-content">
      <main>
        <div class="segmented profile-tabs"><button class="active" type="button">${esc(t('mySpace'))}</button><button type="button" data-profile-go="clips">Clips</button><button type="button" data-profile-go="live">LIVE</button></div>
        <div class="profile-grid">
          <article class="profile-portal profile-portal--clips" data-profile-go="clips"><span><small>${esc(t('creatorWorkflow'))}</small><b>${esc(t('myClipsVideos'))}</b></span></article>
          <article class="profile-portal profile-portal--studio" data-profile-go="studio"><span><small>SYLORA STUDIO</small><b>${esc(t('createNew'))}</b></span></article>
          <article class="profile-portal profile-portal--live" data-profile-go="live"><span><small>LIVE</small><b>${esc(t('goLive'))}</b></span></article>
        </div>
        <section class="glass-card profile-editor" id="profileEditor">
          <div class="card-top"><div><small>${esc(t('personalSpace'))}</small><h3>${esc(t('profile'))}</h3></div><span class="status-pill status-pill--success">${pct}% · ORBIT ${level+1}</span></div>
          <form id="profile" class="fields"><label>${esc(t('name'))}<input name="displayName" value="${esc(me.user.displayName)}" maxlength="60"></label><label>${esc(t('about'))}<textarea name="bio" maxlength="240" placeholder="${esc(t('about'))}">${esc(me.user.bio)}</textarea></label><label>${esc(t('interfaceLanguageLabel'))}<select name="locale"><option value="uk">Українська</option><option value="en">English</option><option value="pl">Polski</option><option value="de">Deutsch</option><option value="ru">Русский</option></select></label><button class="depth-button">${esc(t('saveChanges'))}</button></form>
        </section>
      </main>
      <aside class="context-stack">
        <section class="glass-card"><div class="profile-completion"><span><b>ORBIT ${level}</b><small>${xp.toLocaleString()} / ${next.toLocaleString()} XP</small></span><b>${pct}%</b></div><div class="progress-track"><i style="width:${pct}%"></i></div></section>
        <section class="glass-card"><div class="card-top"><div><small>${esc(t('activity'))}</small><h3>${esc(t('recentEvents'))}</h3></div></div>${notes.notifications.slice(0,5).map(item=>`<div class="achievement-row"><span>✦</span><div><b>${esc(item.actor?.username||'SYLORA')}</b><small>${esc(item.type)}</small></div></div>`).join('')||`<p class="muted">${esc(t('quietNow'))}</p>`}</section>
        <section class="glass-card"><div class="card-top"><div><small>LUMEN</small><h3>${esc(t('recentMovements'))}</h3></div></div>${ledger.entries.slice(0,4).map(entry=>`<div class="achievement-row"><span>◈</span><div><b>${esc(entry.type)} · ${entry.amount}</b><small>${new Date(entry.createdAt).toLocaleString(getLocale()==='uk'?'uk-UA':getLocale())}</small></div></div>`).join('')||`<p class="muted">${esc(t('noTransactions'))}</p>`}<button id="profileLogout" class="plain-action" type="button">${esc(t('signout'))} ${referenceIcon('arrow')}</button></section>
      </aside>
    </div>
  </section>`;
  document.querySelector('#profile select[name="locale"]').value=me.user.locale;
  document.querySelector('#profile').onsubmit=async event=>{event.preventDefault();const input=Object.fromEntries(new FormData(event.currentTarget));const out=await api('/api/me',{method:'PATCH',body:JSON.stringify(input)});state.me=out.user;setLocale(out.user.locale);applyShellLanguage();account();toast(t('profileUpdated'));await renderProfileReference()};
  document.querySelector('#profileEdit')?.addEventListener('click',()=>document.querySelector('#profileEditor')?.scrollIntoView({behavior:'smooth',block:'center'}));
  document.querySelector('#profileCoverAction')?.addEventListener('click',()=>toast(t('coverAfterMedia')));
  document.querySelectorAll('[data-profile-go]').forEach(element=>element.addEventListener('click',()=>nav(element.dataset.profileGo)));
  document.querySelector('#profileLogout')?.addEventListener('click',logout);
}
async function logout(){if(userEventsAbort){userEventsAbort.abort();userEventsAbort=null}await api('/api/auth/logout',{method:'POST'}).catch(()=>{});state.token='';state.me=null;state.wallet=null;clearRtcConfigCache();localStorage.removeItem('sylora_token');account();refreshRightRail();refreshRailProgress();nav('feed')}
function showGift(e){if(realtimeDuplicate('gift',e?.id))return;giftEngine.play(e)}

async function renderClips(){
  const {videos}=await api('/api/videos?format=clip'),ready=videos.filter(v=>v.stream?.status==='ready').length;
  const cards=videos.map((v,index)=>{
    const layout=index%5===0?'clip-card--tall clip-card--portrait':index%5===2?'clip-card--wide':'';
    const pipeline=v.stream?.status==='ready'?'HLS READY':v.stream?.status==='failed'?'PROCESSING FAILED':'PROCESSING';
    const duration=v.media.duration?`${v.media.duration.toFixed(1)}s`:t('durationPending');
    return `<article class="clip-card ${layout}" data-clip-card="${index}">
      <video controls playsinline preload="${index===0?'auto':'metadata'}" src="${v.media.url}" aria-label="${esc(v.title)}"></video>
      <div class="live-stage-shade"></div><span class="clip-play" aria-hidden="true">${referenceIcon('play')}</span>
      <div class="clip-copy"><span><small>@${esc(v.author.username)} · ${pipeline}</small><b>${esc(v.title)}</b><small>${v.media.width||'?'}×${v.media.height||'?'} · ${duration}${v.stream?.progress?` · ${v.stream.progress}%`:''}</small></span><button type="button" data-clip-focus="${index}">${referenceIcon('play')} ${esc(t('watchVideo'))}</button></div>
    </article>`;
  }).join('');
  app.innerHTML=`<section class="route-hero-row compact clips-route-head"><div><span class="status-pill status-pill--violet">${referenceIcon('clip')} SYLORA CLIPS</span><h1>${esc(t('clipHero'))}</h1><p>${esc(t('clipIntro'))}</p></div><div class="hero-actions">${state.me?`<button id="openUpload" class="depth-button" type="button">＋ ${esc(t('uploadClip'))}</button>`:`<button id="clipLogin" class="depth-button" type="button">${esc(t('signinToPublish'))}</button>`}</div></section>
  <section class="media-runtime" aria-label="${esc(t('mediaPlayerStatus'))}"><span class="runtime-core">${referenceIcon('play')}</span><span><small>INSTANT MEDIA CORE</small><b>${videos.length} clips · ${ready} ${esc(t('clipsReady'))}</b></span><span class="preload-meter"><span><b>${esc(t('nextVideo'))}</b><small>${esc(t(videos.length>1?'preloading':'waiting'))}</small></span><i><em style="width:${videos.length>1?'86':'18'}%"></em></i></span><span class="status-pill status-pill--success">${ready===videos.length&&videos.length?'READY':'ADAPTIVE'}</span></section>
  <div id="uploader"></div><section class="clips-grid">${cards||`<div class="glass-card clips-empty"><span class="runtime-core">＋</span><div><small>CLIPS</small><b>${esc(t('firstClipTitle'))}</b><p>${esc(t('firstClipIntro'))}</p></div></div>`}</section>`;
  document.querySelector('#clipLogin')?.addEventListener('click',renderAuth);
  document.querySelector('#openUpload')?.addEventListener('click',renderClipUploader);
  const players=[...document.querySelectorAll('.clip-card video')];
  const warmNext=index=>{const next=players[index+1];if(next&&next.preload!=='auto'){next.preload='auto';next.load()}};
  players.forEach((video,index)=>{video.addEventListener('play',()=>warmNext(index),{once:true});video.addEventListener('loadeddata',()=>warmNext(index),{once:true})});
  if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const index=Number(entry.target.dataset.clipCard);players[index].preload='auto';warmNext(index)}},{rootMargin:'120% 0px'});document.querySelectorAll('[data-clip-card]').forEach(card=>observer.observe(card))}
  document.querySelectorAll('[data-clip-focus]').forEach(button=>button.onclick=()=>{const video=players[Number(button.dataset.clipFocus)];video?.scrollIntoView({behavior:'smooth',block:'center'});video?.play().catch(()=>{})});
  if(videos.some(v=>v.stream&&['queued','processing'].includes(v.stream.status)))setTimeout(()=>{if(state.view==='clips')renderClips()},1500);
}
function renderClipUploader(){const box=document.querySelector('#uploader');box.innerHTML=`<form id="clipUpload" class="card auth fields"><h3>${esc(t('newClip'))}</h3><input name="title" maxlength="120" aria-label="${esc(t('title'))}" placeholder="${esc(t('title'))}" required>${mediaFilePickerMarkup()}<p class="muted">${esc(t('mediaLimit'))}</p><button class="primary">${esc(t('uploadPublish'))}</button><p id="uploadStatus" class="muted"></p></form>`;const form=document.querySelector('#clipUpload');bindMediaFilePicker(form);form.onsubmit=async e=>{e.preventDefault();const data=new FormData(form),file=data.get('file'),status=document.querySelector('#uploadStatus');if(!(file instanceof File)||!file.size)return;status.textContent=t('uploading');try{const response=await fetch('/api/media/upload',{method:'POST',headers:{authorization:`Bearer ${state.token}`,'content-type':file.type},body:file});const uploaded=await response.json();if(!response.ok)throw new Error(uploaded.error||'UPLOAD_FAILED');status.textContent=t('publishing');await api('/api/videos',{method:'POST',body:JSON.stringify({mediaId:uploaded.media.id,title:data.get('title'),format:'clip'})});toast(t('clipPublished'));renderClips()}catch(err){status.textContent=`${t('error')}: ${humanError(err.message)}`}}}

async function renderVideos(){const {videos}=await api('/api/videos?format=video');app.innerHTML=`<div class="card hero"><span class="eyebrow">SYLORA VIDEO</span><h1>${esc(t('videoHero'))}</h1><p>${esc(t('videoIntro'))}</p>${state.me?`<button id="videoUploadOpen" class="primary">＋ ${esc(t('uploadVideo'))}</button>`:`<button id="videoLogin" class="primary">${esc(t('signin'))}</button>`}</div><div id="videoUploader"></div><div class="video-grid">${videos.map(v=>`<article class="card video-card"><video controls playsinline preload="metadata" src="${v.media.url}" aria-label="${esc(v.title)}"></video><div class="video-card-body"><span class="pipeline">${v.stream?.status==='ready'?'HLS READY':(v.stream?.status||'ORIGINAL').toUpperCase()}</span><h3>${esc(v.title)}</h3><p class="muted">@${esc(v.author.username)} · ${esc(v.description)}</p></div></article>`).join('')||`<div class="card empty">${esc(t('noLongVideos'))}</div>`}</div>`;document.querySelector('#videoLogin')?.addEventListener('click',renderAuth);document.querySelector('#videoUploadOpen')?.addEventListener('click',renderVideoUploader);if(videos.some(v=>v.stream&&['queued','processing'].includes(v.stream.status)))setTimeout(()=>{if(state.view==='videos')renderVideos()},1500)}
function renderVideoUploader(){const box=document.querySelector('#videoUploader');box.innerHTML=`<form id="videoUpload" class="card auth fields"><h3>${esc(t('newVideo'))}</h3><input name="title" maxlength="120" aria-label="${esc(t('title'))}" placeholder="${esc(t('title'))}" required><textarea name="description" maxlength="2000" aria-label="${esc(t('description'))}" placeholder="${esc(t('description'))}"></textarea>${mediaFilePickerMarkup()}<button class="primary">${esc(t('uploadPublish'))}</button><p id="videoUploadStatus" class="muted"></p></form>`;const form=document.querySelector('#videoUpload');bindMediaFilePicker(form);form.onsubmit=async e=>{e.preventDefault();const data=new FormData(form),file=data.get('file'),status=document.querySelector('#videoUploadStatus');if(!(file instanceof File)||!file.size)return;status.textContent=t('uploading');try{const response=await fetch('/api/media/upload',{method:'POST',headers:{authorization:`Bearer ${state.token}`,'content-type':file.type},body:file}),uploaded=await response.json();if(!response.ok)throw new Error(uploaded.error||'UPLOAD_FAILED');status.textContent=t('publishingHls');await api('/api/videos',{method:'POST',body:JSON.stringify({mediaId:uploaded.media.id,title:data.get('title'),description:data.get('description'),format:'video'})});toast(t('videoPublished'));renderVideos()}catch(err){status.textContent=`${t('error')}: ${humanError(err.message)}`}}}

async function renderExplore(){app.innerHTML=`<div class="card hero"><span class="eyebrow">UNIVERSAL SEARCH</span><h1>Знайди своїх.</h1><p>People · Posts · Videos · LIVE · Messages · Communities · Projects · Companies · Courses · Research · Files</p><div class="discovery-orbits"><span>Люди</span><span>Ідеї</span><span>Science</span><span>Business</span></div></div><form id="search" class="card searchbar discovery-search"><input name="q" minlength="2" placeholder="Кого або що шукаємо у SYLORA?" autofocus><button class="primary">Знайти</button></form><div id="results" class="discovery-results"></div>`;document.querySelector('#search').onsubmit=async e=>{e.preventDefault();const q=new FormData(e.currentTarget).get('q');const [r,u]=await Promise.all([api(`/api/search?q=${encodeURIComponent(q)}`),state.me?api(`/api/search/universal?q=${encodeURIComponent(q)}`).catch(()=>null):null]);const sections=[['Люди',r.users,x=>`@${esc(x.username)} · ${esc(x.displayName)}`],['Публікації',r.posts,p=>`${esc(p.author?.username||'')}: ${esc(p.text)}`],['Спільноти',r.communities,x=>esc(x.name)],['Курси',r.courses,x=>esc(x.title)],['Бізнес',r.businesses,x=>esc(x.name)],['LIVE',r.lives||[],x=>esc(x.title)],['Agents',r.agents||[],x=>esc(x.name)]];let html=sections.map(([name,items,fn])=>`<div class="card item"><span class="eyebrow">${name}</span>${(items||[]).map(x=>`<p>${fn(x)}</p>`).join('')||'<p class="muted">Нічого не знайдено</p>'}</div>`).join('');if(u?.semantic?.length){html+=`<div class="card item"><span class="eyebrow">SEMANTIC ${u.semanticHonesty?.state==='degraded'?'· lexical fallback':''}</span>${u.semantic.slice(0,12).map(x=>`<p><b>${esc(x.type)}</b> · ${esc(x.label||'')}</p>`).join('')}<p class="muted">${esc(u.semanticHonesty?.note||'')}</p></div>`;}document.querySelector('#results').innerHTML=html}}

async function renderExploreReference(){
  app.innerHTML=`<section class="route-hero-row compact explore-heading"><div><span class="status-pill status-pill--violet">${referenceIcon('search')} ${esc(t('universalDiscovery'))}</span><h1>${esc(t('exploreHero'))}</h1><p>${esc(t('exploreIntro'))}</p></div></section>
  <form id="search" class="explore-search"><span>${referenceIcon('search')}</span><input name="q" minlength="2" aria-label="${esc(t('searchQuery'))}" placeholder="${esc(t('searchQuery'))}" autocomplete="off" autofocus><button type="submit">${referenceIcon('sparkles')} ${esc(t('search'))}</button></form>
  <section id="discoveryDefault" class="discovery-grid">
    <article class="glass-card discovery-hero"><div class="living-stage-art" aria-hidden="true"><i></i><i></i><i></i></div><span class="live-stage-shade"></span><div><span class="status-pill status-pill--gold">LIVING HORIZON</span><h2>${esc(t('responsiveWorld'))}</h2><p>${esc(t('responsiveWorldIntro'))}</p></div></article>
    ${[
      ['users',t('people'),t('creatorsResearchers'),'creator'],
      ['live',t('liveNow'),t('liveEvents'),'live'],
      ['learning',t('learning'),t('coursesCircles'),'course'],
      ['business',t('business'),t('teamsProjects'),'company']
    ].map(([icon,title,description,query],index)=>`<article class="glass-card discovery-card"><span class="discovery-icon nav-icon-plate">${referenceIcon(icon)}</span><span class="status-pill ${index===1?'status-pill--rose':index===2?'status-pill--success':'status-pill--violet'}">${index===1?'REALTIME':'DISCOVER'}</span><h3>${esc(title)}</h3><p>${esc(description)}</p><button type="button" data-discovery-query="${query}">${esc(t('discoverAction'))} ${referenceIcon('arrow')}</button></article>`).join('')}
  </section>
  <section id="results" class="discovery-results reference-search-results" aria-live="polite"></section>`;
  const form=document.querySelector('#search'),input=form.elements.q,defaultGrid=document.querySelector('#discoveryDefault'),results=document.querySelector('#results');
  const runSearch=async query=>{
    const q=String(query||'').trim();if(q.length<2)return;
    results.innerHTML=`<div class="glass-card discovery-loading"><span class="runtime-core">✦</span><b>${esc(t('searching'))}</b></div>`;
    const [found,universal]=await Promise.all([api(`/api/search?q=${encodeURIComponent(q)}`),state.me?api(`/api/search/universal?q=${encodeURIComponent(q)}`).catch(()=>null):null]);
    const sections=[
      [t('people'),found.users,x=>`@${esc(x.username)} · ${esc(x.displayName)}`,'users'],
      [t('posts'),found.posts,item=>`${esc(item.author?.username||'')}: ${esc(item.text)}`,'clip'],
      [t('communities'),found.communities,item=>esc(item.name),'users'],
      [t('courses'),found.courses,item=>esc(item.title),'learning'],
      [t('business'),found.businesses,item=>esc(item.name),'business'],
      ['LIVE',found.lives||[],item=>esc(item.title),'live'],
      [t('agents'),found.agents||[],item=>esc(item.name),'sparkles']
    ];
    let html=sections.map(([name,items,format,icon],index)=>`<article class="glass-card discovery-card search-result-card"><span class="discovery-icon nav-icon-plate">${referenceIcon(icon)}</span><span class="status-pill ${index===5?'status-pill--rose':'status-pill--violet'}">${(items||[]).length} ${esc(t('resultsLabel'))}</span><h3>${esc(name)}</h3><div class="result-lines">${(items||[]).slice(0,8).map(item=>`<p>${format(item)}</p>`).join('')||`<p class="muted">${esc(t('nothingFound'))}</p>`}</div></article>`).join('');
    if(universal?.semantic?.length)html+=`<article class="glass-card discovery-card search-result-card semantic-result"><span class="discovery-icon nav-icon-plate">${referenceIcon('sparkles')}</span><span class="status-pill status-pill--success">SEMANTIC</span><h3>${esc(t('smartSearch'))}</h3><div class="result-lines">${universal.semantic.slice(0,12).map(item=>`<p><b>${esc(item.type)}</b> · ${esc(item.label||'')}</p>`).join('')}</div><small>${esc(universal.semanticHonesty?.note||'')}</small></article>`;
    defaultGrid.hidden=true;results.innerHTML=html;
  };
  form.onsubmit=event=>{event.preventDefault();runSearch(new FormData(form).get('q')).catch(error=>{results.innerHTML=`<div class="glass-card empty">${esc(humanError(error.message))}</div>`})};
  document.querySelectorAll('[data-discovery-query]').forEach(button=>button.onclick=()=>{input.value=button.dataset.discoveryQuery;runSearch(input.value).catch(error=>toast(humanError(error.message)))});
}

async function renderLive(){
  tiktokPilotCleanup?.();tiktokPilotCleanup=null;
  cleanupLiveViewer();
  if(state.intent==='event'||state.intent==='create'||state.intent==='live'){state.intent=null;state.liveTab='create'}
  const tab=state.liveTab||'discover';
  const [{rooms},ent,distribution]=await Promise.all([api('/api/live'),api('/api/live/entertainment').catch(()=>({battleModes:[],roomKinds:[]})),state.me?api('/api/studio/distribution').catch(()=>null):Promise.resolve(null)]);
  const viewers=rooms.reduce((sum,r)=>sum+(Number(r.viewerCount)||0),0);
  // Following tab: no following-hosts API yet — honest empty, not fake lives.
  const list=tab==='following'?[]:rooms;
  const battles=rooms.filter(r=>rooms.some(x=>x.id!==r.id&&x.host?.id!==r.host?.id));
  const emptyCopy=tab==='following'
    ?`<section class="live-empty-state"><span class="eyebrow">LIVE</span><h2>${esc(t('liveFollowingEmptyTitle'))}</h2><p>${esc(t('liveFollowingEmptyText'))}</p><button type="button" class="ghost" data-live-empty-action="discover">${esc(t('discoverLive'))}</button></section>`
    :`<section class="live-empty-state"><span class="eyebrow">LIVE</span><h2>${esc(t('liveEmptyTitle'))}</h2><p>${esc(t('liveEmptyText'))}</p><button type="button" class="primary" data-live-empty-action="create">${esc(t('createLive'))}</button></section>`;
  const visibleRooms=tab==='battles'?battles:list,stageRoom=visibleRooms[0]||rooms[0]||null;
  const hasTikTokDestination=Boolean(distribution?.destinations?.some(item=>item.enabled&&item.provider==='tiktok'));
  const routerReady=Boolean(distribution?.configuration?.configured);
  const setupSteps=[
    ['01',t('setupSignin'),t(state.me?'ready':'signinRequired'),Boolean(state.me),'login'],
    ['02',t('setupTikTokKey'),t(hasTikTokDestination?'destinationEnabled':'notAdded'),hasTikTokDestination,'studio'],
    ['03',t('setupObs'),t(routerReady?'routerReady':'serverNotConfigured'),routerReady,'studio'],
    ['04',t('setupTikTokChat'),t('viaCompanion'),false,'create'],
    ['05',t('setupSignal'),t('afterObs'),false,'studio'],
    ['06',t('setupRealLive'),t(hasTikTokDestination&&routerReady?'canPrepare':'blockedUntilReady'),hasTikTokDestination&&routerReady,'studio']
  ];
  const roomCards=visibleRooms.map(r=>{const opponent=rooms.find(x=>x.id!==r.id&&x.host?.id!==r.host?.id);return`<article class="live-room-card"><div><span class="status-pill status-pill--live">● LIVE · ${r.viewerCount||0}</span><h3>${esc(r.title)}</h3><p>@${esc(r.host.username)}</p></div><div class="live-tools"><button class="depth-button watch-live" data-id="${esc(r.id)}">${esc(t('watchVideo'))}</button><button class="ghost open-live" data-id="${esc(r.id)}">${esc(t('liveChat'))}</button>${state.me?`<button class="ghost ask-live" data-id="${esc(r.id)}">Sylora</button>`:''}${state.me?.id===r.host?.id&&opponent?`<button class="ghost resonance-start" data-id="${esc(r.id)}" data-opponent="${esc(opponent.id)}">✦ Battle</button>`:''}${state.me?.id===r.host?.id?`<button class="ghost live-copilot" data-id="${esc(r.id)}">Copilot</button>`:''}</div></article>`}).join('');
  app.innerHTML=`<section class="route-hero-row compact live-route-head"><div><span class="status-pill status-pill--live">${referenceIcon('live')} SYLORA LIVE</span><h1>${esc(t('liveHero'))}</h1><p>${esc(t('liveIntro'))}</p></div><div class="live-tabs filter-row"><button type="button" data-live-tab="discover" class="${tab==='discover'?'active':''}">${esc(t('discoverLive'))}</button><button type="button" data-live-tab="following" class="${tab==='following'?'active':''}">${esc(t('following'))}</button><button type="button" data-live-tab="create" class="${tab==='create'?'active':''}">${esc(t('createLive'))}</button><button type="button" data-live-tab="battles" class="${tab==='battles'?'active':''}">${esc(t('battles'))}</button><button type="button" data-live-tab="studio">Studio</button></div></section>
  <div class="live-layout">
    <section class="live-lifecycle live-readiness"><div class="lifecycle-heading"><div><small>${esc(t('tiktokStepLaunch'))}</small><b>${esc(t(state.me?'explicitLiveAction':'signinLiveSetup'))}</b></div><span class="status-pill ${hasTikTokDestination&&routerReady?'status-pill--success':''}">${esc(t(hasTikTokDestination&&routerReady?'readyToVerify':'setupIncomplete'))}</span></div><div class="live-setup-grid">${setupSteps.map(([number,label,status,ready,target])=>`<button type="button" class="live-setup-step ${ready?'is-ready':'is-pending'}" data-live-setup="${target}"><span>${number}</span><span><b>${esc(label)}</b><small>${esc(status)}</small></span><i>${ready?'✓':'→'}</i></button>`).join('')}</div></section>
    <section class="live-stage-card"><div class="living-stage-art" aria-hidden="true"><i></i><i></i><i></i></div><div class="live-stage-shade"></div><div class="live-stage-top"><div><span class="status-pill status-pill--live">${referenceIcon('live')} LIVE</span><span class="status-pill">${Number(stageRoom?.viewerCount||0).toLocaleString()} ${esc(t('viewersWatching'))}</span></div><button type="button" data-live-tab="studio" aria-label="${esc(t('openStudio'))}">${referenceIcon('studio')}</button></div><div class="live-stage-copy"><small>SYLORA ORIGINAL · LIVING HORIZON</small><h1>${esc(stageRoom?.title||t('startLive'))}</h1><p>${esc(t(stageRoom?'liveSpaceActive':'liveSpaceReady'))}</p><div class="host-line"><span class="avatar">${esc((stageRoom?.host?.username||state.me?.username||'S').slice(0,1).toUpperCase())}</span><span><b>${esc(stageRoom?.host?.username||state.me?.displayName||'SYLORA Creator')}</b><small>${esc(t(stageRoom?'liveHost':'futureStage'))}</small></span></div></div><div class="stage-controls">${stageRoom?`<button class="watch-live" data-id="${esc(stageRoom.id)}">${referenceIcon('play')} ${esc(t('watchVideo'))}</button><button class="open-live" data-id="${esc(stageRoom.id)}">${referenceIcon('mail')} ${esc(t('liveChat'))}</button>${state.me?`<button class="ask-live" data-id="${esc(stageRoom.id)}">✦ Sylora</button>`:''}`:`<button data-live-empty-action="create">＋ ${esc(t('createLive'))}</button><button data-live-tab="studio">${referenceIcon('studio')} Studio</button>`}</div></section>
    <aside class="live-chat-panel"><div class="panel-tabs"><span>${esc(t('liveChat'))}</span></div><div class="chat-stream"><div class="chat-event">${referenceIcon('activity')}<span><b>${esc(t(stageRoom?'chatAvailable':'chatUnavailable'))}</b><small>${esc(t(stageRoom?'chatOpenRealtime':'chatAfterLaunch'))}</small></span></div><div class="sylora-chat"><span class="ai-mark">✦</span><p><b>Sylora</b><small>${esc(t('syloraRules'))}</small></p></div>${stageRoom?`<button class="depth-button open-live live-chat-open" data-id="${esc(stageRoom.id)}">${esc(t('openChat'))} →</button>`:''}</div>${state.me&&tab==='create'?'<div id="tiktokPilotMount"></div>':''}</aside>
    <div class="live-lower"><section class="glass-card live-director"><div class="card-top"><span>LIVE DIRECTOR</span><b>${(ent.battleModes||[]).length} ${esc(t('modes'))}</b></div>${state.me&&tab==='create'?`<div class="card fields live-creator-launchpad"><input id="liveTitle" maxlength="120" placeholder="${esc(t('liveTitle'))}"><button id="goLive" class="depth-button">＋ ${esc(t('createLive'))}</button><button class="ghost" id="openStudioFromLive">Creator Studio</button><input id="eventTitle" maxlength="160" placeholder="${esc(t('eventTitle'))}"><input id="eventWhen" maxlength="80" placeholder="${esc(t('eventStart'))}"><button id="createEventBtn" class="ghost">＋ ${esc(t('createEvent'))}</button></div>`:(state.me?`<div class="director-grid"><button data-live-tab="create"><span>＋</span><span><b>${esc(t('newLive'))}</b><small>${esc(t('cameraOrStudio'))}</small></span></button><button data-live-tab="battles"><span>✦</span><span><b>${esc(t('battles'))}</b><small>${esc(t('cohostMode'))}</small></span></button><button data-live-tab="studio"><span>▣</span><span><b>Studio</b><small>OBS · multistream</small></span></button></div>`:`<button id="liveLogin" class="depth-button">${esc(t('signin'))}</button>`)}</section><section class="glass-card live-room-browser"><div class="card-top"><span>${tab==='following'?esc(t('following')):tab==='battles'?esc(t('battles')):esc(t('liveNowLabel'))}</span><b>${visibleRooms.length}</b></div><div class="live-room-grid">${roomCards||emptyCopy}</div></section></div>
  </div><div id="livePlayer"></div><div id="liveChat"></div>`;
  document.querySelectorAll('[data-live-tab]').forEach(b=>b.onclick=()=>{const v=b.dataset.liveTab;if(v==='studio')return nav('studio');state.liveTab=v;renderLive()});
  document.querySelectorAll('[data-live-setup]').forEach(button=>button.onclick=()=>{const target=button.dataset.liveSetup;if(target==='login')return state.me?toast(t('signinDone')):renderAuth();if(target==='studio')return nav('studio');state.liveTab='create';renderLive()});
  document.querySelector('[data-live-empty-action]')?.addEventListener('click',e=>{const action=e.currentTarget.dataset.liveEmptyAction;if(action==='discover'){state.liveTab='discover';return renderLive()}if(!state.me)return renderAuth();state.liveTab='create';renderLive()});
  document.querySelector('#liveLogin')?.addEventListener('click',renderAuth);
  document.querySelector('#openStudioFromLive')?.addEventListener('click',()=>nav('studio'));
  document.querySelector('#goLive')?.addEventListener('click',async()=>{const title=document.querySelector('#liveTitle')?.value||'SYLORA LIVE';await api('/api/live',{method:'POST',body:JSON.stringify({title})});state.liveTab='discover';renderLive()});
  document.querySelector('#createEventBtn')?.addEventListener('click',async()=>{const title=document.querySelector('#eventTitle')?.value||'SYLORA Event';const startsAt=document.querySelector('#eventWhen')?.value||'tba';await api('/api/platform-events',{method:'POST',body:JSON.stringify({title,startsAt,mode:'online'})});toast(t('eventCreated'));state.liveTab='discover';renderLive()});
  document.querySelectorAll('.ask-live').forEach(b=>b.onclick=async()=>{const q=prompt(t('talkWithSylora'),t('missedPrompt'))||t('missedPrompt');try{const out=await api('/api/ai/ask',{method:'POST',body:JSON.stringify({contentType:'live',contentId:b.dataset.id,question:q,view:'live'})});toast(out.answer||'OK')}catch(e){toast(humanError(e.message))}});
  document.querySelectorAll('.live-copilot').forEach(b=>b.onclick=async()=>{try{const out=await api(`/api/live/${b.dataset.id}/copilot`);toast((out.highlights||[]).slice(0,2).map(h=>h.text).join(' · ')||out.policy?.note||t('copilotReady'))}catch(e){toast(humanError(e.message))}});
  document.querySelectorAll('.open-live').forEach(b=>b.onclick=()=>openLiveChat(b.dataset.id));
  document.querySelectorAll('.watch-live').forEach(b=>b.onclick=()=>watchLive(b.dataset.id));
  document.querySelectorAll('.resonance-start').forEach(b=>b.onclick=async()=>{
    try{
      const {battle}=await api('/api/live/battles',{method:'POST',body:JSON.stringify({hostLiveId:b.dataset.id,opponentLiveId:b.dataset.opponent,mode:'1v1'})});
      toast(`Battles 2.0 · ${battle.rounds.length} rounds · multi-factor`);
    }catch(e){
      try{
        await api(`/api/live/${b.dataset.id}/resonance`,{method:'POST',body:JSON.stringify({opponentLiveId:b.dataset.opponent})});
        toast('Legacy Resonance Battle');
      }catch(err){toast(humanError(e.message||err.message))}
    }
  });
  if(state.me&&tab==='create')tiktokPilotCleanup=mountTikTokOwnerPilot({root:document.querySelector('#tiktokPilotMount'),api,speak:text=>speakSylora(text,{autoDetect:true}),toast,humanError});
  if(state.intent&&rooms.some(r=>r.id===state.intent)){const id=state.intent;state.intent=null;watchLive(id)}
}
function clearRtcConfigCache(){liveRtcConfigCache=null;liveRtcConfigCachedAt=0}
async function liveRtcConfig(){if(isRtcConfigCacheFresh(liveRtcConfigCache,{fetchedAt:liveRtcConfigCachedAt}))return liveRtcConfigCache;try{const config=await api('/api/live/rtc-config');liveRtcConfigCache=config;liveRtcConfigCachedAt=Date.now();return config}catch{clearRtcConfigCache();return{iceServers:[],turnConfigured:false}}}
async function refreshRtcPeerConfiguration(peer){const rtc=await liveRtcConfig();if(peer&&peer.signalingState!=='closed'&&rtc.iceServers?.length)peer.setConfiguration({iceServers:rtc.iceServers});return rtc}
const liveGiftGlyph=id=>({'spark':'✦','pulse':'♡','lumen-bloom':'❈','nova':'✺','dream-orbit':'◎','aurora':'♕','celestial-wing':'⌁','time-gate':'◉','cosmos':'♨','infinite-sylora':'∞'}[id]||'✦');
async function watchLive(id){
  if(!state.me)return renderAuth();
  cleanupLiveViewer();
  const [rtc,liveData,giftData,engageData]=await Promise.all([liveRtcConfig(),api('/api/live'),api('/api/gifts'),api(`/api/live/${id}/engagement`)]),room=liveData.rooms.find(r=>r.id===id);
  if(!room)return toast(t('liveEnded'));
  liveViewerLiveId=id;liveViewerId=crypto.randomUUID();liveViewerPeer=new RTCPeerConnection({iceServers:rtc.iceServers});
  const player=document.querySelector('#livePlayer'),battle=engageData.battle,total=battle?Math.max(1,battle.hostScore+battle.opponentScore):1,battlePct=battle?Math.round(battle.hostScore/total*100):50;
  player.innerHTML=`<div class="card auth"><div class="row"><div><span class="eyebrow">SYLORA LIVE</span><h3>${esc(room.title)}</h3></div><span id="webrtcStatus" class="badge">${esc(t('waitingForHost'))}</span></div><video id="liveVideo" autoplay playsinline controls style="width:100%;margin-top:14px;border-radius:18px;background:#080b18;min-height:240px"></video><div class="live-tools"><button id="liveLike" class="ghost like-burst">♡ <b id="liveLikeCount">${engageData.engagement.likes}</b></button><button id="openGiftTray" class="ghost">♢ ${esc(t('gift'))}</button><span class="badge">${esc(t('orbitSupport'))}</span></div>${battle?`<div class="resonance-panel"><div class="resonance-title"><b>✦ Resonance Battle</b><span><b id="battleA">${battle.hostScore}</b> : <b id="battleB">${battle.opponentScore}</b></span></div><div class="resonance-meter"><i id="battleMeter" style="width:${battlePct}%"></i></div><small class="muted">${esc(t('likesResonance'))}</small></div>`:''}<div id="liveGiftTray" class="live-gift-tray" hidden><div class="live-gift-head"><div><b>${esc(t('syloraGifts'))}</b><small class="muted"> · ${esc(t('tenLiveEffects'))}</small></div><select id="liveGiftQty"><option value="1">×1</option><option value="5">×5 combo</option><option value="10">×10 combo</option></select></div><div class="live-gift-scroll">${giftData.gifts.map(g=>`<button class="live-gift" data-live-gift="${esc(g.id)}" style="--gift-color:${esc(g.color)}"><span class="live-gift-symbol">${liveGiftGlyph(g.id)}</span><b>${esc(g.name)}</b><small>◈ ${g.price}</small></button>`).join('')}</div></div><p class="muted">${esc(t(rtc.turnConfigured?'turnReady':'p2pDevelopment'))}</p></div>`;
  document.querySelector('#openGiftTray').onclick=()=>{const tray=document.querySelector('#liveGiftTray');tray.hidden=!tray.hidden};
  document.querySelector('#liveLike').onclick=async e=>{try{const out=await api(`/api/live/${id}/like`,{method:'POST',body:'{"amount":1}'});document.querySelector('#liveLikeCount').textContent=out.engagement.likes;e.currentTarget.classList.remove('bump');requestAnimationFrame(()=>e.currentTarget.classList.add('bump'))}catch(error){toast(humanError(error.message))}};
  document.querySelectorAll('[data-live-gift]').forEach(b=>b.onclick=async()=>{const quantity=Number(document.querySelector('#liveGiftQty').value);try{const out=await api('/api/gifts/send',{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({giftId:b.dataset.liveGift,recipientId:room.host.id,liveId:id,quantity})});toast(`${t('giftSentOrbit')} ${Math.max(1,1+Math.floor(Math.sqrt((out.progress?.donorXp||0)/120)))}`)}catch(error){toast(humanError(error.message))}});
  liveViewerPeer.ontrack=e=>{const video=document.querySelector('#liveVideo');if(video){video.srcObject=e.streams[0];giftEngine.bindLiveVideo?.(video).catch(()=>{})}const s=document.querySelector('#webrtcStatus');if(s)s.textContent=t('liveVideoStatus')};
  liveViewerPeer.onconnectionstatechange=()=>{const s=document.querySelector('#webrtcStatus'),stateNow=liveViewerPeer?.connectionState||'connecting',key=stateNow==='connected'?'connected':stateNow==='connecting'||stateNow==='new'?'connecting':'connectionLost';if(s)s.textContent=t(key)};
  liveViewerPeer.onicecandidate=e=>{if(e.candidate&&liveViewerHostPeerId)sendLiveSignal(id,'ice',liveViewerId,liveViewerHostPeerId,e.candidate.toJSON()).catch(()=>{})};
  liveViewerSource=new EventSource(`/api/live/${id}/events`);
  liveViewerSource.addEventListener('like',e=>{const x=JSON.parse(e.data),el=document.querySelector('#liveLikeCount');if(el)el.textContent=x.likes});
  liveViewerSource.addEventListener('gift',e=>showGift(JSON.parse(e.data)));
  liveViewerSource.addEventListener('resonance',()=>watchLive(id).catch(()=>{}));
  liveViewerSource.addEventListener('signal',async e=>{const s=JSON.parse(e.data);if(s.toPeerId!==liveViewerId)return;if(s.kind==='viewer-rejected'){if(liveViewerAnnounceTimer){clearInterval(liveViewerAnnounceTimer);liveViewerAnnounceTimer=null}const status=document.querySelector('#webrtcStatus');if(status)status.textContent=t(s.data?.reason==='P2P_PEER_LIMIT'?'p2pLimit':'hostUnavailable');return}if(s.kind==='offer'){if(liveViewerAnnounceTimer){clearInterval(liveViewerAnnounceTimer);liveViewerAnnounceTimer=null}liveViewerHostPeerId=s.fromPeerId;await refreshRtcPeerConfiguration(liveViewerPeer);await liveViewerPeer.setRemoteDescription(s.data);const answer=await liveViewerPeer.createAnswer();await liveViewerPeer.setLocalDescription(answer);await sendLiveSignal(id,'answer',liveViewerId,liveViewerHostPeerId,liveViewerPeer.localDescription)}else if(s.kind==='ice'){try{await liveViewerPeer.addIceCandidate(s.data)}catch{}}});
  const announce=()=>{if(liveViewerPeer&&!liveViewerPeer.remoteDescription)sendLiveSignal(id,'viewer-ready',liveViewerId,null,{}).catch(()=>{})};announce();liveViewerAnnounceTimer=setInterval(announce,2000)
}
async function sendLiveSignal(liveId,kind,fromPeerId,toPeerId,data){return api(`/api/live/${liveId}/signal`,{method:'POST',body:JSON.stringify({kind,fromPeerId,toPeerId,data})})}
function cleanupLiveViewer(){if(liveViewerLiveId&&liveViewerId)sendLiveSignal(liveViewerLiveId,'viewer-left',liveViewerId,liveViewerHostPeerId,null).catch(()=>{});if(liveViewerAnnounceTimer){clearInterval(liveViewerAnnounceTimer);liveViewerAnnounceTimer=null}if(liveViewerSource){liveViewerSource.close();liveViewerSource=null}if(liveViewerPeer){liveViewerPeer.close();liveViewerPeer=null}liveViewerId=null;liveViewerLiveId=null;liveViewerHostPeerId=null}
async function openLiveChat(id){
  if(liveEventSource)liveEventSource.close();
  const r=await api(`/api/live/${id}/chat`),box=document.querySelector('#liveChat');
  box.innerHTML=`<div class="card auth"><div class="row"><h3>${esc(t('liveChat'))}</h3><span class="badge" id="viewerCount">● ${esc(t('realtime'))}</span></div><div id="liveMessages">${r.messages.map(liveMessageHtml).join('')||`<p class="muted empty-chat">${esc(t('quietChat'))}</p>`}</div>${state.me?`<form id="liveChatForm" class="fields"><input name="text" maxlength="500" placeholder="${esc(t('writeInLive'))}"><button class="primary">${esc(t('send'))}</button></form>`:''}</div>`;
  liveEventSource=new EventSource(`/api/live/${id}/events`);
  liveEventSource.addEventListener('chat',e=>{const msg=JSON.parse(e.data),messages=document.querySelector('#liveMessages');messages?.querySelector('.empty-chat')?.remove();messages?.insertAdjacentHTML('beforeend',liveMessageHtml(msg))});
  liveEventSource.addEventListener('viewers',e=>{const v=JSON.parse(e.data),el=document.querySelector('#viewerCount');if(el)el.textContent=`● ${v.count} ${t('connectedLabel')}`});
  document.querySelector('#liveChatForm')?.addEventListener('submit',async e=>{e.preventDefault();const field=e.currentTarget.elements.text,text=field.value.trim();if(!text)return;field.value='';await api(`/api/live/${id}/chat`,{method:'POST',body:JSON.stringify({text})})})
}
function liveMessageHtml(m){return`<p><b>@${esc(m.username)}</b> ${esc(m.text)} <small class="muted">${new Date(m.createdAt).toLocaleTimeString()}</small></p>`}

function localizeStudioCore(ownRooms){
  const setText=(selector,key)=>{const el=app.querySelector(selector);if(el)el.textContent=t(key)};
  const setPlaceholder=(selector,key)=>{const el=app.querySelector(selector);if(el)el.placeholder=t(key)};
  setText(':scope>.hero h1','studioHero');setText(':scope>.hero p','studioIntro');
  setText('#studioProfileHelp','outputProfileHelp');setText('#cameraBtn','cameraMic');setText('#screenBtn','screenShare');
  const imageLabel=app.querySelector('#overlayImage')?.closest('label');if(imageLabel?.firstChild)imageLabel.firstChild.textContent=`＋ ${t('addLogoImage')}`;
  setText('#clearImage','removeImage');setText('#stopSource','stopSource');setText('.studio-mixer-label span','micSource');setText('#studioMicMute','mute');setText('#studioAudioStatus','enableAudioSource');
  const savedOption=app.querySelector('#savedScene option');if(savedOption)savedOption.textContent=t('savedScene');
  setPlaceholder('#sceneName','sceneName');setText('#saveScene','saveScene');setText('#deleteScene','deleteScene');
  const liveOption=app.querySelector('#studioLiveRoom option');if(liveOption)liveOption.textContent=t('chooseLive');
  setText('#createStudioLive','createLive');setText('#broadcastBtn','startWebrtcLive');setText('#stopBroadcast','stopBroadcast');
  setText('#broadcastStatus',ownRooms.length?'liveReadyChoose':'createLiveFirst');setText('#recordBtn','startRecording');setText('#stopRecord','stopRecording');setText('#recordStatus','waitingSource');
  const privacy=app.querySelector(':scope>.studio-note');if(privacy)privacy.textContent=t('studioPrivacy');
}

async function renderStudio(){
  stopStudioDistributionPolling();
  const [{rooms},{scenes},distribution]=await Promise.all([api('/api/live'),api('/api/studio/scenes'),api('/api/studio/distribution')]),ownRooms=rooms.filter(r=>r.host?.id===state.me.id);
  app.innerHTML=`<div class="card hero"><span class="eyebrow">SYLORA CREATOR STUDIO</span><h1>Твоя сцена.</h1><p>Scenes, sources, audio, recording, WebRTC і OBS workflow в одному робочому просторі.</p></div><div class="studio-layout"><div class="studio-stage"><video id="studioSource" autoplay muted playsinline hidden></video><canvas id="studioCanvas" width="720" height="1280"></canvas></div><div class="studio-controls"><div class="card fields"><span class="eyebrow">SOURCES</span><select id="studioProfile">${Object.entries(STUDIO_PROFILES).map(([id,p])=>`<option value="${id}">${p.label}</option>`).join('')}</select><div id="studioProfileHelp" class="studio-note">Output profile для canvas, запису та LIVE.</div><button id="cameraBtn" class="primary">Камера + мікрофон</button><button id="screenBtn" class="ghost">Screen share</button><label class="ghost">＋ Logo / image<input id="overlayImage" type="file" accept="image/png,image/jpeg,image/webp" hidden></label><button id="clearImage" class="ghost">Прибрати image</button><button id="stopSource" class="ghost">Вимкнути source</button></div><div class="card fields"><span class="eyebrow">AUDIO MIXER</span><label class="studio-mixer-label"><span>Mic / source</span><strong id="studioGainValue">100%</strong></label><input id="studioMicGain" type="range" min="0" max="150" value="100" step="1" disabled><div class="studio-meter"><i id="studioAudioMeter"></i></div><button id="studioMicMute" class="ghost" disabled>Mute</button><div id="studioAudioStatus" class="studio-note">Увімкни source з аудіо.</div></div><div class="card fields"><span class="eyebrow">SCENES</span><select id="savedScene"><option value="">Saved scene…</option>${scenes.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select><input id="sceneName" placeholder="Назва scene" maxlength="60"><input id="overlayTitle" value="SYLORA LIVE" maxlength="60"><select id="overlayStyle"><option value="violet">Violet Glow</option><option value="cyan">Cyan Pulse</option><option value="clean">Clean</option></select><button id="saveScene" class="ghost">Зберегти Scene</button><button id="deleteScene" class="ghost">Видалити Scene</button></div><div class="card fields"><span class="eyebrow">BROADCAST</span><select id="studioLiveRoom"><option value="">Оберіть LIVE</option>${ownRooms.map(r=>`<option value="${r.id}">${esc(r.title)}</option>`).join('')}</select><button id="createStudioLive" class="ghost">＋ Створити LIVE</button><button id="broadcastBtn" class="primary">Почати WebRTC LIVE</button><button id="stopBroadcast" class="ghost" disabled>Зупинити broadcast</button><div id="broadcastStatus" class="studio-note">${ownRooms.length?'LIVE готовий до вибору.':'Спочатку створи LIVE.'}</div></div><div class="card fields"><span class="eyebrow">OBS WEBSOCKET 5.x</span><input id="obsUrl" value="${esc(localStorage.getItem('sylora_obs_url')||'ws://127.0.0.1:4455')}" aria-label="OBS WebSocket URL"><input id="obsPassword" type="password" placeholder="OBS WebSocket password" autocomplete="off"><button id="obsConnect" class="ghost">Підключити OBS</button><select id="obsScenes" disabled><option value="">OBS scenes…</option></select><button id="obsVirtualStart" class="ghost" disabled>Запустити Virtual Camera</button><button id="obsVirtualStop" class="ghost" disabled>Зупинити Virtual Camera</button><button id="obsStreamStart" class="primary" disabled>Почати OBS Stream</button><button id="obsStreamStop" class="ghost" disabled>Зупинити OBS Stream</button><div id="obsStatus" class="studio-note">Пароль використовується лише локально в браузері й не зберігається.</div><div class="studio-note">OBS Stream використовує сервіс/ключ, налаштований у самому OBS. SYLORA не передає ключ трансляції.</div></div><div class="card fields"><span class="eyebrow">OBS BROWSER SOURCE</span><button id="browserSourceCreate" class="ghost">Створити URL для вибраного LIVE</button><input id="browserSourceUrl" readonly placeholder="URL з’явиться тут"><button id="browserSourceCopy" class="ghost" disabled>Копіювати URL</button><div id="browserSourceStatus" class="studio-note">URL тимчасовий (2 години) і показує LIVE chat + gifts у прозорому OBS overlay.</div></div><div class="card"><span class="eyebrow">RECORD</span><button id="recordBtn" class="primary">● Почати запис</button><button id="stopRecord" class="ghost" disabled>Зупинити</button><div id="recordStatus" class="studio-note">Очікує source.</div><div id="recordResult"></div></div></div></div><p class="studio-note">Scene presets зберігаються на сервері. OBS пароль не відправляється в SYLORA API. Browser Source URL містить тимчасовий access token — не публікуй його.</p>`;
  localizeStudioCore(ownRooms);
  const legacyHero=app.querySelector(':scope>.hero'),legacyLayout=app.querySelector(':scope>.studio-layout'),stage=legacyLayout?.querySelector('.studio-stage'),controls=legacyLayout?.querySelector('.studio-controls');
  if(legacyLayout&&stage&&controls){
    const connectedProviders=new Set((distribution.destinations||[]).filter(item=>item.enabled).map(item=>item.provider));
    const destinationChip=(id,mark,label,tone)=>`<button type="button" class="destination-chip ${tone} ${connectedProviders.has(id)?'active':''}" data-studio-panel-target="distribution"><span>${mark}</span><b>${label}</b><i></i></button>`;
    const referenceLayout=document.createElement('div');referenceLayout.className='studio-layout studio-reference-layout';
    referenceLayout.innerHTML=`<header class="studio-modebar"><div class="studio-suite"><span>${referenceIcon('studio')}</span><div><small>SYLORA CREATOR SUITE</small><b>Studio · ${scenes.length} scenes · ${ownRooms.length} LIVE</b></div></div><nav><button class="active" type="button" data-studio-panel-target="sources"><i>01</i> Program</button><button type="button" data-studio-panel-target="scenes"><i>02</i> Scenes</button><button type="button" data-studio-panel-target="distribution"><i>03</i> Multistream</button><button type="button" data-studio-panel-target="obs"><i>04</i> Integrations</button></nav><div class="connection-health"><i></i><span><b>${distribution.configuration?.configured?'ROUTER READY':'LOCAL STUDIO READY'}</b><small>OBS · TikTok · YouTube · TikFinity</small></span></div></header><aside class="scene-rail"><div class="scene-rail-title"><b>Сцени</b><button type="button" data-studio-panel-target="scenes">＋</button></div>${scenes.length?scenes.slice(0,6).map((scene,index)=>`<button type="button" class="scene-thumb ${index===0?'active':''}" data-studio-scene="${scene.id}"><span class="scene-preview"><span class="scene-art" aria-hidden="true">✦</span></span><span><b>${esc(scene.name)}</b><small>saved scene</small></span>${index===0?'<i></i>':''}</button>`).join(''):`<button type="button" class="scene-thumb active" data-studio-panel-target="scenes"><span class="scene-preview">＋</span><span><b>Поточна сцена</b><small>не збережена</small></span><i></i></button>`}</aside><main class="program-panel"><div class="program-header"><span><i></i> PROGRAM · LIVING HORIZON</span><div><button type="button" data-studio-proxy="screen" aria-label="Поділитися екраном">▣</button><button type="button" data-studio-panel-target="sources" aria-label="Джерела">＋</button></div></div><div data-program-slot></div><div class="destination-strip"><span class="destination-label">${referenceIcon('live')}<span><small>MULTISTREAM</small><b>${connectedProviders.size} active</b></span></span><div class="destination-items">${destinationChip('tiktok','TT','TikTok','tone-tiktok')}${destinationChip('youtube','YT','YouTube','tone-youtube')}${destinationChip('twitch','TW','Twitch','tone-twitch')}${destinationChip('facebook','FB','Facebook','tone-facebook')}</div></div><div class="transport"><button type="button" data-studio-proxy="camera" aria-label="Камера">▣</button><button type="button" data-studio-proxy="screen" aria-label="Екран">▱</button><button type="button" data-studio-proxy="record" aria-label="Запис">●</button><button type="button" data-studio-panel-target="audio" aria-label="Мікшер">≋</button><button type="button" class="depth-button" data-studio-proxy="broadcast">${referenceIcon('live')} Почати LIVE</button></div></main><aside data-inspector-slot></aside>`;
    stage.classList.add('program-canvas');stage.insertAdjacentHTML('beforeend',`<span class="program-safe-zone" aria-hidden="true"></span><span class="program-badge"><span class="ai-mark">✦</span><span><small>SYLORA AI DIRECTOR</small><b>готова допомогти за запитом</b></span></span><span class="multistream-badge">${referenceIcon('activity')}<span><small>OUTPUT</small><b>${distribution.configuration?.configured?'RTMPS ROUTER READY':'LOCAL / WEBRTC'}</b></span></span>`);
    controls.classList.add('inspector-panel');controls.insertAdjacentHTML('afterbegin',`<div class="panel-tabs"><button class="active" type="button">Controls</button><button type="button">Connectors</button></div><div class="integration-flow"><span>TF</span><div><b>TikFinity → SYLORA Companion</b><small>Pairing створюється всередині LIVE; локальні ключі не передаються стороннім сервісам.</small></div>${referenceIcon('arrow')}</div>`);
    referenceLayout.querySelector('[data-program-slot]').replaceWith(stage);referenceLayout.querySelector('[data-inspector-slot]').replaceWith(controls);legacyHero?.remove();legacyLayout.replaceWith(referenceLayout);
  }
  mountStudioDistribution(distribution);
  for(const [selector,panel] of [['#studioProfile','sources'],['#studioMicGain','audio'],['#savedScene','scenes'],['#studioLiveRoom','broadcast'],['#obsUrl','obs'],['#browserSourceCreate','browser'],['#recordBtn','record']]){
    document.querySelector(selector)?.closest('.studio-controls>.card')?.setAttribute('data-studio-panel',panel);
  }
  document.querySelector('#app>.hero')?.insertAdjacentHTML('beforeend',`<div class="scene-readout studio-readout"><span><small>СЦЕНИ</small><b>${scenes.length}</b></span><span><small>МОЇ LIVE</small><b>${ownRooms.length}</b></span><span><small>OUTPUT</small><b>4 PROFILES</b></span></div>`);
  document.querySelector('#obsConnect').insertAdjacentHTML('beforebegin',`<input id="companionUrl" value="${esc(localStorage.getItem('sylora_companion_url')||'http://127.0.0.1:43179')}" aria-label="SYLORA Companion URL"><input id="companionToken" type="password" placeholder="Companion pairing token" autocomplete="off"><button id="companionConnect" class="primary">Підключити через Companion</button><div class="studio-note">Рекомендовано для production: pairing token і OBS password залишаються на цьому ПК.</div>`);
  const profileSelect=document.querySelector('#studioProfile'),savedProfile=localStorage.getItem('sylora_studio_profile');profileSelect.value=STUDIO_PROFILES[savedProfile]?savedProfile:'vertical720';restoreStudioRecovery();profileSelect.onchange=e=>{localStorage.setItem('sylora_studio_profile',e.target.value);persistStudioRecovery();configureStudioCanvas();const help=document.querySelector('#studioProfileHelp');if(help)help.textContent=studioSourceStream?'Output змінено. Перезапусти camera/source, щоб застосувати нові capture constraints.':'Output profile для canvas, запису та LIVE.';if(studioSourceStream)composeStudioFrame();else drawStudioPlaceholder()};document.querySelector('#cameraBtn').onclick=()=>startStudioSource('camera');document.querySelector('#screenBtn').onclick=()=>startStudioSource('screen');document.querySelector('#stopSource').onclick=stopStudioTracks;document.querySelector('#recordBtn').onclick=startStudioRecording;document.querySelector('#stopRecord').onclick=stopStudioRecording;document.querySelector('#broadcastBtn').onclick=startStudioBroadcast;document.querySelector('#stopBroadcast').onclick=stopStudioBroadcast;document.querySelector('#overlayImage').onchange=loadStudioOverlayImage;document.querySelector('#clearImage').onclick=()=>{studioOverlayImage=null};document.querySelector('#savedScene').onchange=()=>loadStudioScene(scenes);document.querySelector('#saveScene').onclick=saveStudioScene;document.querySelector('#deleteScene').onclick=deleteStudioScene;document.querySelector('#studioMicGain').oninput=updateStudioAudioGain;document.querySelector('#studioMicMute').onclick=toggleStudioAudioMute;document.querySelector('#overlayTitle').oninput=persistStudioRecovery;document.querySelector('#overlayStyle').onchange=persistStudioRecovery;document.querySelector('#companionConnect').onclick=connectStudioCompanion;document.querySelector('#obsConnect').onclick=connectStudioObs;document.querySelector('#obsScenes').onchange=changeStudioObsScene;document.querySelector('#obsVirtualStart').onclick=()=>setStudioVirtualCamera(true);document.querySelector('#obsVirtualStop').onclick=()=>setStudioVirtualCamera(false);document.querySelector('#obsStreamStart').onclick=()=>setStudioObsStream(true);document.querySelector('#obsStreamStop').onclick=()=>setStudioObsStream(false);document.querySelector('#browserSourceCreate').onclick=createStudioBrowserSource;document.querySelector('#browserSourceCopy').onclick=copyStudioBrowserSource;
  document.querySelector('#createStudioLive').onclick=async()=>{const title=prompt(t('liveTitle'))||'SYLORA Studio LIVE';const {live}=await api('/api/live',{method:'POST',body:JSON.stringify({title})});const select=document.querySelector('#studioLiveRoom'),option=document.createElement('option');option.value=live.id;option.textContent=live.title;select.append(option);select.value=live.id;document.querySelector('#broadcastStatus').textContent=t('liveCreatedEnable');await refreshStudioDistributionStatus()};
  const studioProxy={camera:'#cameraBtn',screen:'#screenBtn',record:'#recordBtn',broadcast:'#broadcastBtn'};
  document.querySelectorAll('[data-studio-proxy]').forEach(button=>button.onclick=()=>document.querySelector(studioProxy[button.dataset.studioProxy])?.click());
  document.querySelectorAll('[data-studio-panel-target]').forEach(button=>button.onclick=()=>{document.querySelectorAll('.studio-modebar nav button').forEach(item=>item.classList.toggle('active',item===button));document.querySelector(`[data-studio-panel="${button.dataset.studioPanelTarget}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest'})});
  document.querySelectorAll('[data-studio-scene]').forEach(button=>button.onclick=()=>{const select=document.querySelector('#savedScene');select.value=button.dataset.studioScene;select.dispatchEvent(new Event('change'));document.querySelectorAll('[data-studio-scene]').forEach(item=>item.classList.toggle('active',item===button))});
  configureStudioCanvas();drawStudioPlaceholder();mountStudioIntelligence(ownRooms)
}

function stopStudioDistributionPolling(){if(studioDistributionPoll){clearInterval(studioDistributionPoll);studioDistributionPoll=0}}
function distributionSelectedIds(){return[...document.querySelectorAll('[data-distribution-destination]:checked')].map(x=>x.value)}
function rememberDistributionSelection(){try{localStorage.setItem('sylora_distribution_destination_ids',JSON.stringify(distributionSelectedIds()))}catch{}}
function distributionErrorText(error){
  const code=String(error?.message||'LIVE_DISTRIBUTION_ERROR'),reasons=error?.data?.details?.reasons;
  const labels={
    MEDIA_ROUTER_NOT_CONFIGURED:t('distRouterNotConfigured'),
    MEDIA_ROUTER_CONTROL_CREDENTIALS_INVALID:t('distRouterCredentials'),
    MEDIA_ROUTER_UNAVAILABLE:t('distRouterUnavailable'),
    STREAM_SECRET_STORAGE_NOT_CONFIGURED:t('distSecretStorage'),
    STREAM_SECRET_KEY_INVALID:t('distSecretInvalid'),
    PUBLIC_RTMP_INGEST_NOT_CONFIGURED:t('distPublicIngest'),
    RTMPS_INGEST_REQUIRED_IN_PRODUCTION:t('distRtmpsIngest'),
    RTMPS_REQUIRED_IN_PRODUCTION:t('distRtmpsDestination'),
    STREAM_DESTINATION_REQUIRED:t('distDestinationRequired'),
    STREAM_DESTINATION_LIMIT:t('distDestinationLimit'),
    STREAM_DESTINATION_NOT_FOUND:t('distNotFound'),
    STREAM_DESTINATION_NOT_READY:t('distNotReady'),
    STREAM_DESTINATION_SECRET_UNREADABLE:t('distSecretUnreadable'),
    STREAM_DESTINATION_HOST_NOT_ALLOWED:t('distHostNotAllowed'),
    PRIVATE_STREAM_DESTINATION_FORBIDDEN:t('distPrivateForbidden'),
    RTMP_SERVER_URL_INVALID:t('distUrlInvalid'),
    RTMP_PROTOCOL_REQUIRED:t('distProtocolRequired'),
    STREAM_KEY_INVALID:t('distKeyInvalid'),
    DISTRIBUTION_ALREADY_ACTIVE:t('distAlreadyActive'),
    STREAM_DESTINATION_IN_ACTIVE_SESSION:t('distActiveLocked'),
    DISTRIBUTION_SESSION_NOT_ACTIVE:t('distNotActive')
  };
  if(Array.isArray(reasons)&&reasons.length)return reasons.map(x=>labels[x]||x).join(' · ');
  return labels[code]||code;
}
function formatDistributionBytes(value){const n=Number(value)||0;if(n<1024)return`${n} B`;if(n<1024**2)return`${(n/1024).toFixed(1)} KB`;if(n<1024**3)return`${(n/1024**2).toFixed(1)} MB`;return`${(n/1024**3).toFixed(2)} GB`}
function distributionDestinationMarkup(item,selected){return`<div class="distribution-destination" data-distribution-row="${esc(item.id)}"><label><input type="checkbox" data-distribution-destination value="${esc(item.id)}" ${item.enabled&&selected.has(item.id)?'checked':''} ${item.enabled?'':'disabled'}><span><b>${esc(item.label)}</b><small>${esc(item.providerLabel)} · ${esc(item.ingestHost)} · key ${esc(item.keyFingerprint)}</small></span></label><button type="button" class="ghost" data-distribution-toggle="${esc(item.id)}" data-enabled="${item.enabled?'1':'0'}">${esc(t(item.enabled?'pause':'enable'))}</button><button type="button" class="ghost danger" data-distribution-delete="${esc(item.id)}" aria-label="${esc(t('delete'))} ${esc(item.label)}">×</button></div>`}
function localizeStudioDistributionPanel(panel,distribution){
  const text=(selector,key)=>{const el=panel.querySelector(selector);if(el)el.textContent=t(key)};
  text('h3','distAllChannels');text('h3+p','distSecureIntro');text('.distribution-add summary','distAdd');
  const empty=panel.querySelector('#distributionDestinations>.studio-note');if(empty)empty.textContent=t('distEmpty');
  const keyInput=panel.querySelector('[name="streamKey"]');if(keyInput)keyInput.placeholder=t('distPasteKey');
  text('#distributionDestinationForm button','distEncryptAdd');text('.distribution-record span','distBackup');text('#distributionPreflight','distPreflight');text('#distributionStart','distPrepare');text('#distributionStop','stopBroadcast');text('#distributionStatus','distSelectInstruction');
}
function mountStudioDistribution(distribution){
  const obsCard=document.querySelector('#obsUrl')?.closest('.studio-controls>.card');if(!obsCard)return;
  document.querySelector('#studioDistributionPanel')?.remove();
  let remembered=null;try{const raw=localStorage.getItem('sylora_distribution_destination_ids');remembered=raw===null?null:JSON.parse(raw)}catch{}
  const enabledIds=distribution.destinations.filter(x=>x.enabled).map(x=>x.id),selected=new Set(Array.isArray(remembered)?remembered.filter(id=>enabledIds.includes(id)):enabledIds);
  const panel=document.createElement('div');panel.id='studioDistributionPanel';panel.className='card fields distribution-card';panel.dataset.studioPanel='distribution';
  panel.innerHTML=`<div class="distribution-heading"><span class="eyebrow">MULTISTREAM DISTRIBUTION</span><span class="badge ${distribution.configuration.configured?'is-ready':'is-blocked'}">${distribution.configuration.configured?'ROUTER READY':'SETUP REQUIRED'}</span></div><h3>Один ефір → усі канали</h3><p class="studio-note">Власний media router SYLORA розподіляє один OBS-потік до вибраних платформ. Кожний stream key шифрується та ніколи не повертається з API.</p><div id="distributionDestinations" class="distribution-destinations">${distribution.destinations.map(item=>distributionDestinationMarkup(item,selected)).join('')||'<p class="studio-note">Напрямків ще немає. Додай YouTube, Twitch, TikTok, Vimeo або інший RTMP-канал.</p>'}</div><details class="distribution-add"><summary>＋ Додати напрямок</summary><form id="distributionDestinationForm" class="fields"><label>Платформа<select name="provider" required>${distribution.providers.map(item=>`<option value="${esc(item.id)}">${esc(item.label)}</option>`).join('')}</select></label><label>Назва<input name="label" maxlength="60" placeholder="Мій YouTube" required></label><label>RTMPS server<input name="serverUrl" maxlength="600" inputmode="url" placeholder="rtmps://a.rtmp.youtube.com/live2" required></label><label>Stream key<input name="streamKey" type="password" maxlength="512" autocomplete="new-password" placeholder="Встав ключ платформи" required></label><button class="primary" type="submit">Зашифрувати й додати</button></form></details><label class="distribution-record"><input id="distributionRecord" type="checkbox" checked><span>Зберегти резервний запис ефіру (7 днів)</span></label><div class="distribution-actions"><button id="distributionPreflight" class="ghost" type="button">Перевірити готовність</button><button id="distributionStart" class="primary" type="button">Підготувати multistream</button><button id="distributionStop" class="ghost danger" type="button" disabled>Зупинити multistream</button></div><div id="distributionStatus" class="studio-note" aria-live="polite">Оберіть LIVE і напрямки. Потім SYLORA видасть одноразовий OBS server + stream key.</div><div id="distributionIngest" class="distribution-ingest" hidden><strong>OBS → Settings → Stream → Custom</strong><label>Server<input id="distributionIngestServer" readonly></label><label>Stream key · показано один раз<input id="distributionIngestKey" type="password" readonly></label><div class="distribution-actions"><button id="distributionCopyServer" class="ghost" type="button">Копіювати server</button><button id="distributionCopyKey" class="primary" type="button">Копіювати key</button><button id="distributionForgetKey" class="ghost" type="button">Приховати key</button></div></div>`;
  localizeStudioDistributionPanel(panel,distribution);
  obsCard.before(panel);
  panel.querySelectorAll('[data-distribution-destination]').forEach(x=>x.onchange=rememberDistributionSelection);rememberDistributionSelection();
  panel.querySelector('#distributionDestinationForm').onsubmit=createStudioDistributionDestination;
  panel.querySelectorAll('[data-distribution-toggle]').forEach(button=>button.onclick=()=>toggleStudioDistributionDestination(button));
  panel.querySelectorAll('[data-distribution-delete]').forEach(button=>button.onclick=()=>deleteStudioDistributionDestination(button.dataset.distributionDelete));
  panel.querySelector('#distributionPreflight').onclick=preflightStudioDistribution;
  panel.querySelector('#distributionStart').onclick=startStudioDistribution;
  panel.querySelector('#distributionStop').onclick=stopStudioDistribution;
  panel.querySelector('#distributionCopyServer').onclick=()=>copyStudioDistributionValue('#distributionIngestServer','OBS server скопійовано');
  panel.querySelector('#distributionCopyKey').onclick=()=>copyStudioDistributionValue('#distributionIngestKey','OBS stream key скопійовано');
  panel.querySelector('#distributionForgetKey').onclick=forgetStudioDistributionKey;
  const liveSelect=document.querySelector('#studioLiveRoom');if(liveSelect&&!liveSelect.dataset.distributionBound){liveSelect.dataset.distributionBound='1';liveSelect.addEventListener('change',refreshStudioDistributionStatus)}
  document.dispatchEvent(new CustomEvent('sylora:studio-panels-changed'));
  refreshStudioDistributionStatus().catch(()=>{});
}
async function reloadStudioDistributionPanel(){const distribution=await api('/api/studio/distribution');mountStudioDistribution(distribution)}
async function createStudioDistributionDestination(event){event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type="submit"]'),input=Object.fromEntries(new FormData(form));button.disabled=true;button.textContent=t('encrypting');try{await api('/api/studio/distribution/destinations',{method:'POST',body:JSON.stringify(input)});form.reset();toast(t('destinationAdded'));await reloadStudioDistributionPanel()}catch(error){toast(distributionErrorText(error));button.disabled=false;button.textContent=t('distEncryptAdd')}}
async function toggleStudioDistributionDestination(button){button.disabled=true;try{await api(`/api/studio/distribution/destinations/${button.dataset.distributionToggle}`,{method:'PATCH',body:JSON.stringify({enabled:button.dataset.enabled!=='1'})});await reloadStudioDistributionPanel()}catch(error){toast(distributionErrorText(error));button.disabled=false}}
async function deleteStudioDistributionDestination(id){if(!confirm(t('deleteDestinationConfirm')))return;try{await api(`/api/studio/distribution/destinations/${id}`,{method:'DELETE'});await reloadStudioDistributionPanel();toast(t('destinationDeleted'))}catch(error){toast(distributionErrorText(error))}}
async function preflightStudioDistribution(){const liveId=document.querySelector('#studioLiveRoom')?.value,status=document.querySelector('#distributionStatus');if(!liveId)return toast(t('chooseLive'));status.textContent=t('distChecking');try{const out=await api(`/api/live/${liveId}/distribution/preflight`,{method:'POST',body:JSON.stringify({destinationIds:distributionSelectedIds()})});status.textContent=out.ready?`${t('distReadyCount')} · ${out.destinations.length} ${t('distDestinations')}`:distributionErrorText({data:{details:{reasons:out.reasons}}})}catch(error){status.textContent=distributionErrorText(error)}}
function renderStudioDistributionStatus(out){
  const status=document.querySelector('#distributionStatus'),start=document.querySelector('#distributionStart'),stop=document.querySelector('#distributionStop'),session=out?.session;
  if(!status||!start||!stop)return;
  const active=session&&['preparing','waiting_for_source','live','degraded'].includes(session.status);start.disabled=!!active;stop.disabled=!active;
  if(!session){status.textContent=t('distNotPrepared');stopStudioDistributionPolling();return}
  if(session.status==='live'){
    const forwarding=session.destinations.filter(x=>x.status==='forwarding').length;
    status.textContent=`● MULTISTREAM LIVE · ${forwarding}/${session.destinations.length} ${t('distDestinations')} · in ${formatDistributionBytes(session.inboundBytes)} · out ${formatDistributionBytes(session.outboundBytes)}`
  }else if(session.status==='degraded'){
    const failed=session.destinations.filter(x=>x.status==='error'||x.hasError).map(x=>x.label);
    status.textContent=`⚠ MULTISTREAM DEGRADED · ${t('error')}: ${failed.join(', ')||t('distExternalTarget')}`
  }else if(session.status==='waiting_for_source')status.textContent=`${t('distWaitingObs')} · ${session.destinations.length} ${t('distDestinations')} · key ${session.ingestKeyFingerprint}`;
  else if(session.status==='failed')status.textContent=`⚠ ${t('distSessionFailed')}`;
  else if(session.status==='stopped')status.textContent=`${t('distStopped')} · ${new Date(session.stoppedAt).toLocaleString()}`;
  else status.textContent=`Multistream ${session.status} · router ${t(session.routerReachable===false?'offline':'coreOnline')}`;
  if(active&&!studioDistributionPoll)studioDistributionPoll=setInterval(()=>refreshStudioDistributionStatus().catch(()=>{}),5000);if(!active)stopStudioDistributionPolling()
}
async function refreshStudioDistributionStatus(){const liveId=document.querySelector('#studioLiveRoom')?.value;if(!liveId){renderStudioDistributionStatus({session:null});return}try{renderStudioDistributionStatus(await api(`/api/live/${liveId}/distribution`))}catch(error){const status=document.querySelector('#distributionStatus');if(status)status.textContent=distributionErrorText(error)}}
async function startStudioDistribution(){const liveId=document.querySelector('#studioLiveRoom')?.value,status=document.querySelector('#distributionStatus'),button=document.querySelector('#distributionStart');if(!liveId)return toast(t('chooseLive'));const destinationIds=distributionSelectedIds();button.disabled=true;status.textContent=t('distCreatingIngest');try{const out=await api(`/api/live/${liveId}/distribution/start`,{method:'POST',body:JSON.stringify({destinationIds,record:document.querySelector('#distributionRecord')?.checked!==false})}),ingest=document.querySelector('#distributionIngest');document.querySelector('#distributionIngestServer').value=out.ingest.serverUrl;document.querySelector('#distributionIngestKey').value=out.ingest.streamKey;ingest.hidden=false;renderStudioDistributionStatus({session:out.session});toast(t('distPreparedObs'))}catch(error){button.disabled=false;status.textContent=distributionErrorText(error)}}
async function stopStudioDistribution(){const liveId=document.querySelector('#studioLiveRoom')?.value;if(!liveId)return;if(!confirm(t('stopBroadcast')))return;const button=document.querySelector('#distributionStop');button.disabled=true;try{const out=await api(`/api/live/${liveId}/distribution/stop`,{method:'POST',body:'{}'});forgetStudioDistributionKey();renderStudioDistributionStatus(out);toast(t('distStoppedAll'))}catch(error){button.disabled=false;toast(distributionErrorText(error))}}
async function copyStudioDistributionValue(selector,message){const input=document.querySelector(selector);if(!input?.value)return;try{await navigator.clipboard.writeText(input.value);toast(message)}catch{input.select();toast(t('distValueSelected'))}}
function forgetStudioDistributionKey(){const key=document.querySelector('#distributionIngestKey'),box=document.querySelector('#distributionIngest');if(key)key.value='';if(box)box.hidden=true}

function applyStudioObsCapabilities(caps,label='OBS'){const scenes=document.querySelector('#obsScenes');if(!scenes)return;scenes.innerHTML=`<option value="">${esc(t('obsScenes'))}</option>${(caps.scenes||[]).map(scene=>`<option value="${esc(scene.sceneName)}">${esc(scene.sceneName)}</option>`).join('')}`;scenes.disabled=false;scenes.value=caps.currentProgramSceneName||'';const canVirtual=!!caps.virtualCamera?.available,canStream=!!caps.stream?.available;document.querySelector('#obsVirtualStart').disabled=!canVirtual||caps.virtualCamera.active;document.querySelector('#obsVirtualStop').disabled=!canVirtual||!caps.virtualCamera.active;document.querySelector('#obsStreamStart').disabled=!canStream||caps.stream.active;document.querySelector('#obsStreamStop').disabled=!canStream||!caps.stream.active;const status=document.querySelector('#obsStatus');if(status)status.textContent=`${label} ${caps.obsVersion||''} · ${(caps.scenes||[]).length} ${t('modes')} · ${t('virtualCamera')} ${canVirtual?(caps.virtualCamera.active?'ON':t('available')):t('unavailable')} · ${t('streamLabel')} ${canStream?(caps.stream.active?'LIVE':t('available')):t('unavailable')}`}
function mountStudioIntelligence(ownRooms){
  try{const planBox=document.createElement("section");planBox.className="card studio-ai-card";planBox.innerHTML=`<span class="eyebrow">AI CREATOR STUDIO</span><h3>${esc(t('createLiveForMe'))}</h3><form id="aiLivePlan" class="fields"><input name="topic" required maxlength="200" placeholder="${esc(t('liveTopic'))}"><button class="primary">${esc(t('prepareWithSylora'))}</button></form><pre id="aiLivePlanOut" hidden style="white-space:pre-wrap;font-size:12px"></pre>`;const appRoot=document.querySelector("#app");if(appRoot&&!document.querySelector("#aiLivePlan"))appRoot.append(planBox);document.querySelector("#aiLivePlan")?.addEventListener("submit",async e=>{e.preventDefault();const topic=new FormData(e.currentTarget).get("topic");const out=await api("/api/studio/ai/plan",{method:"POST",body:JSON.stringify({topic})});const pre=document.querySelector("#aiLivePlanOut");pre.hidden=false;pre.textContent=JSON.stringify(out.plan,null,2);pre.dataset.actionId=out.action?.id||'';let btn=document.querySelector('#aiLivePlanConfirm');if(!btn){btn=document.createElement('button');btn.id='aiLivePlanConfirm';btn.className='primary';btn.type='button';btn.textContent=t('confirmPlanScene');pre.after(btn)}btn.onclick=async()=>{const id=pre.dataset.actionId;if(!id)return toast(t('missingActionId'));const conf=await api(`/api/studio/ai/plan/${id}/confirm`,{method:'POST',body:'{}'});toast(t(conf.ok?'planConfirmed':'planConfirmFailed'))};toast(t('planNeedsConfirmation'));});}catch(err){console.warn(err)}
  try{
    const intel=document.createElement('section');intel.className='card studio-intelligence-card';intel.innerHTML=`<span class="eyebrow">${esc(t('creatorIntelligence'))}</span><h3>${esc(t('liveInsightsPack'))}</h3><div class="studio-intelligence-actions"><select id="creatorLiveSelect"><option value="">${esc(t('chooseLive'))}</option>${ownRooms.map(r=>`<option value="${esc(r.id)}">${esc(r.title)}</option>`).join('')}</select><button id="creatorInsightsBtn" class="primary" type="button">${esc(t('analyzeLive'))}</button><button id="creatorPackBtn" class="ghost" type="button">${esc(t('contentPack'))}</button></div><pre id="creatorIntelOut" hidden style="white-space:pre-wrap;font-size:12px"></pre>`;
    document.querySelector('#app')?.append(intel);
    document.querySelector('#creatorInsightsBtn')?.addEventListener('click',async()=>{const id=document.querySelector('#creatorLiveSelect').value;if(!id)return toast(t('selectLiveFirst'));const out=await api(`/api/live/${id}/creator-insights`);const pre=document.querySelector('#creatorIntelOut');pre.hidden=false;pre.textContent=JSON.stringify(out,null,2)});
    document.querySelector('#creatorPackBtn')?.addEventListener('click',async()=>{const topic=document.querySelector('#overlayTitle')?.value||'SYLORA LIVE';const out=await api('/api/studio/ai/content-pack',{method:'POST',body:JSON.stringify({topic})});const pre=document.querySelector('#creatorIntelOut');pre.hidden=false;pre.textContent=JSON.stringify(out.pack,null,2);toast(t('draftPackConfirmation'))});
  }catch(err){console.warn(err)}
}

async function connectStudioCompanion(){const status=document.querySelector('#obsStatus'),bridgeInput=document.querySelector('#companionUrl'),tokenInput=document.querySelector('#companionToken'),obsUrl=document.querySelector('#obsUrl'),password=document.querySelector('#obsPassword');if(!status||!bridgeInput)return;try{const url=normalizeCompanionUrl(bridgeInput.value),token=tokenInput?.value||'';if(token.length<24)throw new Error('PAIRING_TOKEN_REQUIRED');localStorage.setItem('sylora_companion_url',url);studioObsClient?.disconnect();studioObsClient=null;studioObsCredentials=null;clearTimeout(studioObsReconnectTimer);const client=new SyloraCompanionClient({url,token});await client.health();const out=await client.connectObs({url:normalizeObsUrl(obsUrl?.value),password:password?.value||''});studioCompanionClient=client;applyStudioObsCapabilities(out.capabilities,'Companion · OBS');if(tokenInput)tokenInput.value='';if(password)password.value=''}catch(error){studioCompanionClient=null;status.textContent=`Companion: ${obsErrorText(error)}`}}
async function connectStudioObs(){const status=document.querySelector('#obsStatus'),urlInput=document.querySelector('#obsUrl'),password=document.querySelector('#obsPassword');if(!status||!urlInput)return;try{studioCompanionClient?.disconnectObs().catch(()=>{});studioCompanionClient=null;const url=normalizeObsUrl(urlInput.value);localStorage.setItem('sylora_obs_url',url);studioObsCredentials={url,password:password?.value||''};studioObsReconnectAttempt=0;await openStudioObs(false)}catch(error){status.textContent=`OBS: ${obsErrorText(error)}`}}
async function openStudioObs(reconnecting){if(!studioObsCredentials||state.view!=='studio')return;clearTimeout(studioObsReconnectTimer);studioObsClient?.disconnect();const status=document.querySelector('#obsStatus');if(status)status.textContent=reconnecting?`${t('obsReconnectAttempt')} ${studioObsReconnectAttempt}…`:t('obsConnecting');try{const client=new ObsWebSocketClient({...studioObsCredentials,onDisconnect:scheduleStudioObsReconnect});studioObsClient=client;await client.connect();const caps=await client.capabilities();if(studioObsClient!==client)return;studioObsReconnectAttempt=0;applyStudioObsCapabilities(caps,'OBS')}catch(error){if(status)status.textContent=`OBS: ${obsErrorText(error)}`;scheduleStudioObsReconnect()}}
function scheduleStudioObsReconnect(){if(!studioObsCredentials||state.view!=='studio'||studioObsReconnectTimer)return;studioObsReconnectAttempt=Math.min(6,studioObsReconnectAttempt+1);const delay=Math.min(10000,750*2**(studioObsReconnectAttempt-1));studioObsReconnectTimer=setTimeout(()=>{studioObsReconnectTimer=null;openStudioObs(true)},delay);const status=document.querySelector('#obsStatus');if(status)status.textContent=`${t('obsOfflineReconnect')} ${(delay/1000).toFixed(1)}s`}
function obsErrorText(error){const keys={OBS_LOCALHOST_ONLY:'obsLocalOnly',OBS_URL_PROTOCOL:'obsUrlProtocol',OBS_PASSWORD_REQUIRED:'obsPasswordRequired',OBS_CONNECTION_FAILED:'obsConnectionFailed',OBS_CONNECT_TIMEOUT:'obsTimeout',COMPANION_LOCALHOST_ONLY:'companionLocalOnly',COMPANION_URL_PROTOCOL:'companionUrlProtocol',PAIRING_TOKEN_REQUIRED:'pairingTokenRequired',PAIRING_REQUIRED:'pairingRequired',ORIGIN_NOT_ALLOWED:'originNotAllowed'};return keys[error?.message]?t(keys[error.message]):humanError(error?.message||t('connectionError'))}
function disconnectStudioObs(){clearTimeout(studioObsReconnectTimer);studioObsReconnectTimer=null;studioObsCredentials=null;studioObsReconnectAttempt=0;studioObsClient?.disconnect();studioObsClient=null;studioCompanionClient?.disconnectObs().catch(()=>{});studioCompanionClient=null}
async function studioObsCommand(action,sceneName){if(studioCompanionClient)return studioCompanionClient.obsAction(action,sceneName);if(!studioObsClient)throw new Error('OBS_NOT_CONNECTED');if(action==='setScene')return studioObsClient.setProgramScene(sceneName);if(action==='startVirtualCamera')return studioObsClient.startVirtualCamera();if(action==='stopVirtualCamera')return studioObsClient.stopVirtualCamera();if(action==='startStream')return studioObsClient.startStream();if(action==='stopStream')return studioObsClient.stopStream();throw new Error('OBS_ACTION_NOT_ALLOWED')}
async function changeStudioObsScene(event){if(!event.target.value)return;try{await studioObsCommand('setScene',event.target.value);document.querySelector('#obsStatus').textContent=`OBS · ${t('sceneName')} → ${event.target.value}`}catch(error){document.querySelector('#obsStatus').textContent=`OBS · ${t('error')}: ${humanError(error.message)}`}}
async function setStudioVirtualCamera(active){try{await studioObsCommand(active?'startVirtualCamera':'stopVirtualCamera');document.querySelector('#obsVirtualStart').disabled=active;document.querySelector('#obsVirtualStop').disabled=!active;document.querySelector('#obsStatus').textContent=`OBS · ${t('virtualCamera')} ${active?t('on'):t('off')}`}catch(error){document.querySelector('#obsStatus').textContent=`${t('virtualCamera')} · ${t('error')}: ${humanError(error.message)}`}}
async function setStudioObsStream(active){try{await studioObsCommand(active?'startStream':'stopStream');document.querySelector('#obsStreamStart').disabled=active;document.querySelector('#obsStreamStop').disabled=!active;document.querySelector('#obsStatus').textContent=`OBS · ${t('streamLabel')} ${active?'LIVE':t('off')}`}catch(error){document.querySelector('#obsStatus').textContent=`OBS · ${t('streamLabel')} · ${t('error')}: ${humanError(error.message)}`}}
async function createStudioBrowserSource(){const liveId=document.querySelector('#studioLiveRoom')?.value,status=document.querySelector('#browserSourceStatus');if(!liveId)return toast(t('chooseLive'));try{const out=await api('/api/studio/browser-source',{method:'POST',body:JSON.stringify({liveId})}),url=new URL(out.path,location.origin).toString(),input=document.querySelector('#browserSourceUrl');input.value=url;document.querySelector('#browserSourceCopy').disabled=false;status.textContent=`${t('browserReadyUntil')} ${new Date(out.expiresAt).toLocaleTimeString()}. ${t('addBrowserSource')}`}catch(error){status.textContent=`Browser Source: ${humanError(error.message)}`}}
async function copyStudioBrowserSource(){const input=document.querySelector('#browserSourceUrl');if(!input?.value)return;try{await navigator.clipboard.writeText(input.value);toast(t('browserSourceCopied'))}catch{input.select();toast(t('urlSelected'))}}

function loadStudioOverlayImage(e){const file=e.target.files?.[0];if(!file)return;const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{studioOverlayImage=img;URL.revokeObjectURL(url)};img.src=url}
function studioPresetState(){return{profileId:document.querySelector('#studioProfile')?.value||'vertical720',overlayTitle:document.querySelector('#overlayTitle')?.value||'SYLORA LIVE',overlayStyle:document.querySelector('#overlayStyle')?.value||'violet',micGain:Number(document.querySelector('#studioMicGain')?.value||100),micMuted:document.querySelector('#studioMicMute')?.dataset.muted==='1'}}
function persistStudioRecovery(){try{localStorage.setItem('sylora_studio_recovery',JSON.stringify({...studioPresetState(),savedAt:new Date().toISOString()}))}catch{}}
function restoreStudioRecovery(){try{const saved=JSON.parse(localStorage.getItem('sylora_studio_recovery')||'null');if(!saved)return;if(STUDIO_PROFILES[saved.profileId])document.querySelector('#studioProfile').value=saved.profileId;if(typeof saved.overlayTitle==='string')document.querySelector('#overlayTitle').value=saved.overlayTitle;if(['violet','cyan','clean'].includes(saved.overlayStyle))document.querySelector('#overlayStyle').value=saved.overlayStyle;const gain=Math.max(0,Math.min(150,Number(saved.micGain)));if(Number.isFinite(gain))document.querySelector('#studioMicGain').value=String(gain);const mute=document.querySelector('#studioMicMute');if(mute){mute.dataset.muted=saved.micMuted?'1':'0';mute.textContent=t(saved.micMuted?'unmute':'mute')}}catch{}}
function loadStudioScene(scenes){const id=document.querySelector('#savedScene').value,scene=scenes.find(x=>x.id===id);if(!scene)return;document.querySelector('#sceneName').value=scene.name;document.querySelector('#overlayTitle').value=scene.overlayTitle;document.querySelector('#overlayStyle').value=scene.overlayStyle;if(STUDIO_PROFILES[scene.profileId])document.querySelector('#studioProfile').value=scene.profileId;const gain=document.querySelector('#studioMicGain'),mute=document.querySelector('#studioMicMute');if(gain)gain.value=String(Math.max(0,Math.min(150,Number(scene.micGain??100))));if(mute){mute.dataset.muted=scene.micMuted?'1':'0';mute.textContent=t(scene.micMuted?'unmute':'mute')}localStorage.setItem('sylora_studio_profile',document.querySelector('#studioProfile').value);persistStudioRecovery();configureStudioCanvas();updateStudioAudioGain();if(studioSourceStream)composeStudioFrame();else drawStudioPlaceholder()}
async function saveStudioScene(){const id=document.querySelector('#savedScene').value,name=document.querySelector('#sceneName').value,preset=studioPresetState();try{await api(id?`/api/studio/scenes/${id}`:'/api/studio/scenes',{method:id?'PATCH':'POST',body:JSON.stringify({name,...preset})});persistStudioRecovery();toast(t(id?'sceneUpdated':'sceneSaved'));renderStudio()}catch(e){toast(humanError(e.message))}}
async function deleteStudioScene(){const id=document.querySelector('#savedScene').value;if(!id)return toast(t('chooseSavedScene'));await api(`/api/studio/scenes/${id}`,{method:'DELETE'});toast(t('sceneDeleted'));renderStudio()}

async function startStudioBroadcast(){const liveId=document.querySelector('#studioLiveRoom')?.value;if(!liveId)return toast(t('chooseLive'));if(!studioSourceStream)return toast(t('enableCameraScreen'));stopStudioBroadcast();studioHostPeerId=crypto.randomUUID();const canvas=document.querySelector('#studioCanvas'),profile=currentStudioProfile();studioBroadcastStream=canvas.captureStream(profile.fps);for(const track of studioOutputAudioTracks())studioBroadcastStream.addTrack(track);try{await sendLiveSignal(liveId,'host-ready',studioHostPeerId,null,{transport:'p2p',peerLimit:STUDIO_P2P_PEER_LIMIT})}catch(error){stopStudioBroadcast();return toast(`${t('liveSignalingError')}: ${humanError(error.message)}`)}studioLiveSource=new EventSource(`/api/live/${liveId}/events?control=host`);studioLiveSource.addEventListener('signal',async e=>{const s=JSON.parse(e.data);if(s.kind==='viewer-ready'){if(studioPeers.size>=STUDIO_P2P_PEER_LIMIT){sendLiveSignal(liveId,'viewer-rejected',studioHostPeerId,s.fromPeerId,{reason:'P2P_PEER_LIMIT'}).catch(()=>{});return}await createStudioViewerPeer(liveId,s.fromPeerId)}else if(s.kind==='viewer-left'){const entry=studioPeers.get(s.fromPeerId);entry?.pc.close();studioPeers.delete(s.fromPeerId);updateStudioPeerStatus()}else if(s.toPeerId===studioHostPeerId&&s.kind==='answer'){const entry=studioPeers.get(s.fromPeerId);if(entry){await entry.pc.setRemoteDescription(s.data);for(const c of entry.pending.splice(0))try{await entry.pc.addIceCandidate(c)}catch{}}}else if(s.toPeerId===studioHostPeerId&&s.kind==='ice'){const entry=studioPeers.get(s.fromPeerId);if(entry){if(entry.pc.remoteDescription)try{await entry.pc.addIceCandidate(s.data)}catch{}else entry.pending.push(s.data)}}});document.querySelector('#broadcastBtn').disabled=true;document.querySelector('#stopBroadcast').disabled=false;document.querySelector('#broadcastStatus').innerHTML=`<span class="recording">LIVE WEBRTC</span> · ${profile.width}×${profile.height} @ ${profile.fps} · 0/${STUDIO_P2P_PEER_LIMIT} ${esc(t('peersLabel'))}`}
async function createStudioViewerPeer(liveId,viewerPeerId){if(studioPeers.has(viewerPeerId))return;const rtc=await liveRtcConfig(),pc=new RTCPeerConnection({iceServers:rtc.iceServers}),entry={pc,pending:[]};studioPeers.set(viewerPeerId,entry);for(const track of studioBroadcastStream.getTracks())pc.addTrack(track,studioBroadcastStream);pc.onicecandidate=e=>{if(e.candidate)sendLiveSignal(liveId,'ice',studioHostPeerId,viewerPeerId,e.candidate.toJSON())};pc.onconnectionstatechange=()=>{if(['failed','closed','disconnected'].includes(pc.connectionState)){pc.close();studioPeers.delete(viewerPeerId)}updateStudioPeerStatus()};const offer=await pc.createOffer();await pc.setLocalDescription(offer);await sendLiveSignal(liveId,'offer',studioHostPeerId,viewerPeerId,pc.localDescription);updateStudioPeerStatus()}
function updateStudioPeerStatus(){const el=document.querySelector('#broadcastStatus');if(el)el.innerHTML=`<span class="recording">LIVE WEBRTC</span> · ${studioPeers.size}/${STUDIO_P2P_PEER_LIMIT} ${esc(t('peersLabel'))} · ${esc(t('p2pSafetyLimit'))}`}
function stopStudioBroadcast(){if(studioLiveSource){studioLiveSource.close();studioLiveSource=null}for(const {pc} of studioPeers.values())pc.close();studioPeers.clear();studioBroadcastStream?.getVideoTracks().forEach(t=>t.stop());studioBroadcastStream=null;studioHostPeerId=null;const start=document.querySelector('#broadcastBtn'),stop=document.querySelector('#stopBroadcast'),status=document.querySelector('#broadcastStatus');if(start)start.disabled=false;if(stop)stop.disabled=true;if(status)status.textContent=t('broadcastStopped')}
function currentStudioProfile(){return STUDIO_PROFILES[document.querySelector('#studioProfile')?.value]||STUDIO_PROFILES.vertical720}
function configureStudioCanvas(){const canvas=document.querySelector('#studioCanvas');if(!canvas)return;const profile=currentStudioProfile();canvas.width=profile.width;canvas.height=profile.height}
function drawStudioPlaceholder(){const canvas=document.querySelector('#studioCanvas');if(!canvas)return;const ctx=canvas.getContext('2d'),dw=canvas.width,dh=canvas.height,g=ctx.createLinearGradient(0,0,dw,dh),unit=Math.min(dw/720,dh/1280);g.addColorStop(0,'#171a33');g.addColorStop(.5,'#312766');g.addColorStop(1,'#113f54');ctx.fillStyle=g;ctx.fillRect(0,0,dw,dh);ctx.fillStyle='#ffffff';ctx.font=`700 ${Math.max(26,42*unit)}px system-ui`;ctx.textAlign='center';ctx.fillText('SYLORA STUDIO',dw/2,dh*.48);ctx.font=`${Math.max(16,24*unit)}px system-ui`;ctx.fillStyle='#cfd3ff';ctx.fillText(t('chooseCameraScreen'),dw/2,dh*.52)}
async function startStudioSource(kind){stopStudioTracks();try{const profile=currentStudioProfile(),videoConstraints={width:{ideal:profile.width},height:{ideal:profile.height},frameRate:{ideal:profile.fps,max:profile.fps}};studioSourceStream=kind==='screen'?await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:profile.fps,max:profile.fps}},audio:true}):await navigator.mediaDevices.getUserMedia({video:videoConstraints,audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});const video=document.querySelector('#studioSource');video.srcObject=studioSourceStream;await video.play();await setupStudioAudio();studioSourceStream.getVideoTracks()[0]?.addEventListener('ended',stopStudioTracks,{once:true});const actual=studioSourceStream.getVideoTracks()[0]?.getSettings?.()||{};document.querySelector('#recordStatus').textContent=`${t(kind==='screen'?'screenShare':'cameraMic')} · ${actual.width||profile.width}×${actual.height||profile.height} · ${actual.frameRate||profile.fps} FPS`;composeStudioFrame()}catch(err){document.querySelector('#recordStatus').textContent=`${t('sourceOpenFailed')}: ${err.name||err.message}`}}
async function setupStudioAudio(){stopStudioAudio();const tracks=studioSourceStream?.getAudioTracks()||[],gainInput=document.querySelector('#studioMicGain'),mute=document.querySelector('#studioMicMute'),status=document.querySelector('#studioAudioStatus');if(!tracks.length){if(status)status.textContent=t('sourceNoAudio');return}const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){if(status)status.textContent=t('webAudioUnavailable');return}studioAudioContext=new Audio();await studioAudioContext.resume();const source=studioAudioContext.createMediaStreamSource(new MediaStream(tracks));studioAudioGain=studioAudioContext.createGain();studioAudioAnalyser=studioAudioContext.createAnalyser();studioAudioDestination=studioAudioContext.createMediaStreamDestination();studioAudioAnalyser.fftSize=512;source.connect(studioAudioGain).connect(studioAudioAnalyser).connect(studioAudioDestination);if(gainInput)gainInput.disabled=false;if(mute)mute.disabled=false;if(status)status.textContent=t('audioProcessingActive');updateStudioAudioGain();startStudioAudioMeter()}
function studioOutputAudioTracks(){const processed=studioAudioDestination?.stream?.getAudioTracks?.()||[];return processed.length?processed:(studioSourceStream?.getAudioTracks()||[])}
function updateStudioAudioGain(){const input=document.querySelector('#studioMicGain'),value=document.querySelector('#studioGainValue'),mute=document.querySelector('#studioMicMute');if(!input)return;const amount=Math.max(0,Math.min(1.5,Number(input.value)/100));if(value)value.textContent=`${input.value}%`;if(studioAudioGain){const target=mute?.dataset.muted==='1'?0:amount;studioAudioGain.gain.setTargetAtTime(target,studioAudioContext.currentTime,.015)}persistStudioRecovery()}
function toggleStudioAudioMute(){const button=document.querySelector('#studioMicMute');if(!button)return;const muted=button.dataset.muted!=='1';button.dataset.muted=muted?'1':'0';button.textContent=t(muted?'unmute':'mute');updateStudioAudioGain()}
function startStudioAudioMeter(){cancelAnimationFrame(studioAudioMeterRaf);const data=studioAudioAnalyser?new Uint8Array(studioAudioAnalyser.fftSize):null;const frame=()=>{if(!studioAudioAnalyser||!data)return;studioAudioAnalyser.getByteTimeDomainData(data);let sum=0;for(const value of data){const n=(value-128)/128;sum+=n*n}const rms=Math.sqrt(sum/data.length),level=Math.min(100,Math.round(rms*260)),meter=document.querySelector('#studioAudioMeter');if(meter)meter.style.width=`${level}%`;studioAudioMeterRaf=requestAnimationFrame(frame)};frame()}
function stopStudioAudio(){cancelAnimationFrame(studioAudioMeterRaf);studioAudioMeterRaf=0;studioAudioContext?.close?.().catch(()=>{});studioAudioContext=null;studioAudioGain=null;studioAudioAnalyser=null;studioAudioDestination=null;const input=document.querySelector('#studioMicGain'),mute=document.querySelector('#studioMicMute'),meter=document.querySelector('#studioAudioMeter');if(input)input.disabled=true;if(mute)mute.disabled=true;if(meter)meter.style.width='0%'}
function composeStudioFrame(){cancelAnimationFrame(studioRaf);const video=document.querySelector('#studioSource'),canvas=document.querySelector('#studioCanvas');if(!video||!canvas||!studioSourceStream)return;const ctx=canvas.getContext('2d');const frame=()=>{if(!studioSourceStream||!document.body.contains(canvas))return;const sw=video.videoWidth||1280,sh=video.videoHeight||720,dw=canvas.width,dh=canvas.height,scale=Math.max(dw/sw,dh/sh),w=sw*scale,h=sh*scale,x=(dw-w)/2,y=(dh-h)/2,unit=Math.min(dw/720,dh/1280);ctx.drawImage(video,x,y,w,h);if(studioOverlayImage){const maxW=dw*.25,maxH=dh*.11,s=Math.min(maxW/studioOverlayImage.width,maxH/studioOverlayImage.height,1),iw=studioOverlayImage.width*s,ih=studioOverlayImage.height*s,pad=42*unit;ctx.save();ctx.globalAlpha=.92;ctx.shadowColor='rgba(0,0,0,.28)';ctx.shadowBlur=16*unit;ctx.drawImage(studioOverlayImage,dw-iw-pad,pad,iw,ih);ctx.restore()}const style=document.querySelector('#overlayStyle')?.value||'violet',title=document.querySelector('#overlayTitle')?.value||'SYLORA LIVE',color=style==='cyan'?'#34d7de':style==='clean'?'#ffffff':'#8b77ff',grad=ctx.createLinearGradient(0,dh*.64,0,dh);grad.addColorStop(0,'transparent');grad.addColorStop(1,'rgba(6,8,25,.86)');ctx.fillStyle=grad;ctx.fillRect(0,dh*.59,dw,dh*.41);ctx.fillStyle=color;ctx.fillRect(48*unit,dh*.86,7*unit,96*unit);ctx.textAlign='left';ctx.fillStyle='#fff';ctx.font=`800 ${42*unit}px system-ui`;ctx.fillText(title.slice(0,38),78*unit,dh*.9);ctx.font=`${24*unit}px system-ui`;ctx.fillStyle='#d9ddff';ctx.fillText(`@${state.me?.username||'creator'}  ·  SYLORA`,78*unit,dh*.932);studioRaf=requestAnimationFrame(frame)};frame()}
function stopStudioTracks(){stopStudioBroadcast();cancelAnimationFrame(studioRaf);studioRaf=0;if(studioRecorder&&studioRecorder.state==='recording')studioRecorder.stop();stopStudioAudio();studioSourceStream?.getTracks().forEach(t=>t.stop());studioSourceStream=null;const video=document.querySelector('#studioSource');if(video)video.srcObject=null;if(document.querySelector('#studioCanvas'))drawStudioPlaceholder();const status=document.querySelector('#recordStatus');if(status)status.textContent=t('sourceOff')}
function startStudioRecording(){if(!studioSourceStream)return toast(t('enableCameraScreen'));const canvas=document.querySelector('#studioCanvas'),profile=currentStudioProfile(),composed=canvas.captureStream(profile.fps);for(const track of studioOutputAudioTracks())composed.addTrack(track);const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')?'video/webm;codecs=vp9,opus':'video/webm',pixels=profile.width*profile.height*profile.fps,bitrate=Math.max(4_000_000,Math.min(12_000_000,Math.round(pixels*.07)));studioChunks=[];studioLastBlob=null;studioRecorder=new MediaRecorder(composed,{mimeType:mime,videoBitsPerSecond:bitrate});studioRecorder.ondataavailable=e=>{if(e.data.size)studioChunks.push(e.data)};studioRecorder.onstop=()=>{studioLastBlob=new Blob(studioChunks,{type:'video/webm'});const url=URL.createObjectURL(studioLastBlob),result=document.querySelector('#recordResult');if(result){result.innerHTML=`<a class="primary download-recording" href="${url}" download="sylora-studio-${Date.now()}.webm">${esc(t('downloadRecording'))}</a><button id="publishRecording" class="ghost">${esc(t('publishAsClip'))}</button>`;document.querySelector('#publishRecording').onclick=publishStudioRecording}const status=document.querySelector('#recordStatus');if(status)status.textContent=`${t('recordingReady')} · ${(studioLastBlob.size/1024/1024).toFixed(1)} MB · ${profile.width}×${profile.height} @ ${profile.fps}`};studioRecorder.start(1000);document.querySelector('#recordBtn').disabled=true;document.querySelector('#stopRecord').disabled=false;document.querySelector('#recordStatus').innerHTML=`<span class="recording">REC</span> · ${profile.width}×${profile.height} @ ${profile.fps}`}
function stopStudioRecording(){if(studioRecorder?.state==='recording')studioRecorder.stop();const start=document.querySelector('#recordBtn'),stop=document.querySelector('#stopRecord');if(start)start.disabled=false;if(stop)stop.disabled=true}
async function publishStudioRecording(){if(!studioLastBlob)return;const button=document.querySelector('#publishRecording');if(button){button.disabled=true;button.textContent=t('publishing')}try{const response=await fetch('/api/media/upload',{method:'POST',headers:{authorization:`Bearer ${state.token}`,'content-type':'video/webm'},body:studioLastBlob});const uploaded=await response.json();if(!response.ok)throw new Error(uploaded.error||'UPLOAD_FAILED');const title=document.querySelector('#overlayTitle')?.value||'SYLORA Studio';await api('/api/videos',{method:'POST',body:JSON.stringify({mediaId:uploaded.media.id,title,format:'clip'})});toast(t('recordingPublished'));nav('clips')}catch(e){toast(humanError(e.message));if(button){button.disabled=false;button.textContent=t('tryAgain')}}}

async function renderMessages(){
  const tab=state.inboxTab||'messages';
  const [{conversations},{users},notes,smartInbox]=await Promise.all([
    api('/api/conversations'),
    api('/api/users'),
    api('/api/notifications').catch(()=>({notifications:[]})),
    api('/api/inbox/intelligent').catch(()=>null)
  ]);
  const notesList=notes.notifications||[];
  const invites=notesList.filter(n=>/invite|conference|room|connect/i.test(String(n.type||'')));
  const calls=notesList.filter(n=>/call|video|voice/i.test(String(n.type||'')));
  const social=notesList.filter(n=>!invites.includes(n)&&!calls.includes(n));
  const callHistory=tab==='calls'?await api('/api/calls/history').catch(()=>({history:[]})):{history:[]};
  app.innerHTML=`<div class="card hero messages-hero"><span class="eyebrow">SYLORA · INBOX</span><h1>Inbox</h1><p>${esc(t('inboxMessages'))} · ${esc(t('inboxNotifications'))} · ${esc(t('inboxInvites'))} · ${esc(t('inboxCalls'))}</p></div>
  <div class="inbox-tabs">
    <button type="button" data-inbox-tab="messages" class="${tab==='messages'?'active':''}">${esc(t('inboxMessages'))}</button>
    <button type="button" data-inbox-tab="notifications" class="${tab==='notifications'?'active':''}">${esc(t('inboxNotifications'))}</button>
    <button type="button" data-inbox-tab="invites" class="${tab==='invites'?'active':''}">${esc(t('inboxInvites'))}</button>
    <button type="button" data-inbox-tab="calls" class="${tab==='calls'?'active':''}">${esc(t('inboxCalls'))}</button>
    <button type="button" data-inbox-tab="priority" class="${tab==='priority'?'active':''}">Priority</button>
  </div>
  <div class="inbox-panel" ${tab==='messages'?'':'hidden'}><div class="messages-shell"><aside class="card conversation-panel"><div class="new-message"><span class="eyebrow">${esc(t('inboxMessages'))}</span><div class="fields"><select id="newRecipient"><option value="">@</option>${users.map(u=>`<option value="${u.id}">@${esc(u.username)}</option>`).join('')}</select><button id="newChat" class="primary">＋</button></div></div><div class="conversation-list">${conversations.map(c=>{const other=c.members.find(x=>x.id!==state.me.id);const letter=(other?.displayName||other?.username||'?')[0].toUpperCase();return`<button class="convo" data-id="${c.id}"><span class="conversation-avatar">${esc(letter)}</span><span><b>@${esc(other?.username||'chat')}</b><small>${esc(c.lastMessage?.text||'…')}</small></span></button>`}).join('')||'<p class="muted conversation-empty">—</p>'}</div></aside><div id="chat" class="chat-space"><div class="card chat-placeholder"><span>◌</span><b>Inbox</b><p class="muted">${esc(t('inboxMessages'))}</p></div></div></div></div>
  <div class="inbox-panel card" ${tab==='notifications'?'':'hidden'}>${social.map(n=>`<div class="profile-event"><i>✦</i><span><b>${esc(n.actor?.username||'SYLORA')}</b><small>${esc(n.type)}</small></span></div>`).join('')||'<p class="muted">—</p>'}</div>
  <div class="inbox-panel card" ${tab==='invites'?'':'hidden'}>${invites.map(n=>`<div class="profile-event"><i>◇</i><span><b>${esc(n.actor?.username||'SYLORA')}</b><small>${esc(n.type)}</small></span></div>`).join('')||`<p class="muted">${esc(t('inboxInvites'))}</p>`}<div class="row" style="margin-top:12px"><button class="ghost" data-go="business">${esc(t('business'))}</button><button class="ghost" data-go="learning">${esc(t('science'))}</button></div></div>
  <div class="inbox-panel card" ${tab==='calls'?'':'hidden'}>
    <div class="fields" style="margin-bottom:12px">
      <select id="callRecipient"><option value="">@</option>${users.map(u=>`<option value="${u.id}">@${esc(u.username)}</option>`).join('')}</select>
      <div class="row"><button type="button" class="primary" id="startVoiceCall">Voice call</button><button type="button" class="ghost" id="startVideoCall">Video call</button><button type="button" class="ghost" id="startSyloraCall">Call Sylora</button></div>
    </div>
    <span class="eyebrow">HISTORY</span>
    ${(callHistory.history||[]).map(h=>`<div class="profile-event"><i>◉</i><span><b>${esc(h.kind)}</b><small>${esc(h.status)} · ${h.durationSec||0}s${h.missed?' · missed':''}</small></span></div>`).join('')||`<p class="muted">${esc(t('inboxCalls'))}</p>`}
    ${calls.map(n=>`<div class="profile-event"><i>✦</i><span><b>${esc(n.actor?.username||'SYLORA')}</b><small>${esc(n.type)}</small></span></div>`).join('')}
  </div>
  <div class="inbox-panel card" ${tab==='priority'?'':'hidden'}><p><b>${esc(smartInbox?.inbox?.summary||'Priority view')}</b></p><p class="muted">AI priority is an extra filter — nothing is hidden.</p>${Object.entries(smartInbox?.inbox?.buckets||{}).map(([k,items])=>`<div class="item"><span class="eyebrow">${esc(k)}</span>${(items||[]).slice(0,8).map(i=>`<p>${esc(i.preview||i.type||i.kind||i.id)}</p>`).join('')||'<p class="muted">—</p>'}</div>`).join('')}</div>`;
  document.querySelectorAll('[data-inbox-tab]').forEach(b=>b.onclick=()=>{state.inboxTab=b.dataset.inboxTab;renderMessages()});
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>nav(b.dataset.go));
  if(tab==='calls'){
    const startCall=async kind=>{
      if(kind==='sylora'){nav('ai');requestAnimationFrame(()=>document.querySelector('#aiRealtime')?.click());return}
      const userId=document.querySelector('#callRecipient')?.value;if(!userId)return toast('Select recipient');
      const {call}=await api('/api/calls',{method:'POST',body:JSON.stringify({kind,userId})});
      await openCallSession(call.id,{asCallee:false,kind});
    };
    document.querySelector('#startVoiceCall')?.addEventListener('click',()=>startCall('voice'));
    document.querySelector('#startVideoCall')?.addEventListener('click',()=>startCall('video'));
    document.querySelector('#startSyloraCall')?.addEventListener('click',()=>startCall('sylora'));
  }
  if(tab==='messages'){
    document.querySelector('#newChat').onclick=async()=>{const userId=document.querySelector('#newRecipient').value;if(!userId)return;const {conversation}=await api('/api/conversations',{method:'POST',body:JSON.stringify({userId})});openConversation(conversation.id)};
    document.querySelectorAll('.convo').forEach(b=>b.onclick=()=>openConversation(b.dataset.id));
    if(conversations[0])openConversation(conversations[0].id);
  }
}

async function renderMessagesReference(){
  const tab=state.inboxTab||'messages';
  const [{conversations},{users},notes,smartInbox]=await Promise.all([
    api('/api/conversations'),api('/api/users'),api('/api/notifications').catch(()=>({notifications:[]})),api('/api/inbox/intelligent').catch(()=>null)
  ]);
  const notesList=notes.notifications||[],invites=notesList.filter(item=>/invite|conference|room|connect/i.test(String(item.type||''))),calls=notesList.filter(item=>/call|video|voice/i.test(String(item.type||''))),social=notesList.filter(item=>!invites.includes(item)&&!calls.includes(item));
  const callHistory=tab==='calls'?await api('/api/calls/history').catch(()=>({history:[]})):{history:[]};
  const rows=conversations.map((conversation,index)=>{
    const other=conversation.members.find(member=>member.id!==state.me.id),letter=(other?.displayName||other?.username||'?').slice(0,1).toUpperCase();
    return `<button class="conversation-row" type="button" data-id="${esc(conversation.id)}" data-search="${esc(`${other?.displayName||''} ${other?.username||''}`.toLowerCase())}"><span class="avatar convo-${index%5+1}">${esc(letter)}</span><span><b>${esc(other?.displayName||other?.username||t('conversation'))}</b><small>${esc(conversation.lastMessage?.text||t('startConversation'))}</small></span><span><time>${conversation.lastMessage?.createdAt?new Date(conversation.lastMessage.createdAt).toLocaleTimeString(getLocale()==='uk'?'uk-UA':getLocale(),{hour:'2-digit',minute:'2-digit'}):''}</time>${referenceIcon('chevron')}</span></button>`;
  }).join('');
  app.innerHTML=`<section class="inbox-layout">
    <aside class="conversation-list">
      <div class="inbox-heading"><div><h2>${esc(t('inbox'))}</h2><span class="status-pill status-pill--violet">${conversations.length}</span></div><button type="button" id="newChat" aria-label="${esc(t('newConversation'))}">＋</button></div>
      <div class="inbox-tabs segmented">${[['messages',t('chats')],['notifications',t('events')],['invites',t('inboxInvites')],['calls',t('inboxCalls')],['priority',t('priority')]].map(([value,label])=>`<button type="button" data-inbox-tab="${value}" class="${tab===value?'active':''}">${esc(label)}</button>`).join('')}</div>
      ${tab==='messages'?`<div class="conversation-search">${referenceIcon('search')}<input id="conversationSearch" placeholder="${esc(t('searchConversations'))}" autocomplete="off"></div><div class="new-chat-select"><select id="newRecipient"><option value="">${esc(t('choosePerson'))}</option>${users.map(user=>`<option value="${esc(user.id)}">@${esc(user.username)}</option>`).join('')}</select></div><div id="conversationRows">${rows||`<p class="muted conversation-empty">${esc(t('noConversations'))}</p>`}</div>`:`<div class="inbox-side-state"><span class="nav-icon-plate">${referenceIcon(tab==='calls'?'mic':tab==='invites'?'calendar':'activity')}</span><b>${esc(tab==='notifications'?t('events'):tab==='invites'?t('inboxInvites'):tab==='calls'?t('inboxCalls'):t('priority'))}</b><small>${esc(t('importantVisible'))}</small></div>`}
    </aside>
    <main id="chat" class="active-chat">${tab==='messages'?`<div class="chat-placeholder"><span class="runtime-core">✦</span><b>${esc(t('selectConversation'))}</b><p>${esc(t('inboxFlowIntro'))}</p></div>`:renderInboxReferencePanel(tab,{social,invites,calls,callHistory,smartInbox,users})}</main>
    <aside id="contactPanel" class="contact-panel"><span class="contact-avatar avatar">SY</span><h3>SYLORA ${esc(t('inbox'))}</h3><p>${esc(t('conversationContext'))}</p><div class="contact-details"><small>${esc(t('privacy'))}</small><p>${esc(t('conversationParticipantsOnly'))}</p></div></aside>
  </section>`;
  document.querySelectorAll('[data-inbox-tab]').forEach(button=>button.onclick=()=>{state.inboxTab=button.dataset.inboxTab;renderMessagesReference()});
  document.querySelectorAll('[data-inbox-go]').forEach(button=>button.onclick=()=>nav(button.dataset.inboxGo));
  if(tab==='messages'){
    const recipient=document.querySelector('#newRecipient');
    document.querySelector('#newChat').onclick=async()=>{const userId=recipient.value;if(!userId)return recipient.focus();const {conversation}=await api('/api/conversations',{method:'POST',body:JSON.stringify({userId})});await openConversationReference(conversation.id)};
    document.querySelectorAll('.conversation-row').forEach(button=>button.onclick=()=>openConversationReference(button.dataset.id));
    document.querySelector('#conversationSearch').oninput=event=>{const query=event.target.value.trim().toLowerCase();document.querySelectorAll('.conversation-row').forEach(row=>{row.hidden=query&&!row.dataset.search.includes(query)})};
    if(conversations[0])await openConversationReference(conversations[0].id);
  }else if(tab==='calls'){
    const startCall=async kind=>{
      if(kind==='sylora'){nav('ai');requestAnimationFrame(()=>document.querySelector('#aiRealtime')?.click());return}
      const userId=document.querySelector('#callRecipient')?.value;if(!userId)return toast(t('selectRecipient'));
      const {call}=await api('/api/calls',{method:'POST',body:JSON.stringify({kind,userId})});await openCallSession(call.id,{asCallee:false,kind});
    };
    document.querySelector('#startVoiceCall')?.addEventListener('click',()=>startCall('voice'));
    document.querySelector('#startVideoCall')?.addEventListener('click',()=>startCall('video'));
    document.querySelector('#startSyloraCall')?.addEventListener('click',()=>startCall('sylora'));
  }
}

function renderInboxReferencePanel(tab,{social,invites,calls,callHistory,smartInbox,users}){
  if(tab==='notifications')return `<div class="chat-head"><div><span class="avatar convo-3">✦</span><span><b>${esc(t('events'))}</b><small><i></i> ${esc(t('liveUpdates'))}</small></span></div></div><div class="dm-thread inbox-event-thread">${social.map(item=>`<article class="glass-card inbox-event"><span>✦</span><div><b>${esc(item.actor?.username||'SYLORA')}</b><small>${esc(item.type)}</small></div></article>`).join('')||`<p class="muted">${esc(t('noNewEvents'))}</p>`}</div>`;
  if(tab==='invites')return `<div class="chat-head"><div><span class="avatar convo-4">◇</span><span><b>${esc(t('inboxInvites'))}</b><small><i></i> ${esc(t('roomsAndEvents'))}</small></span></div></div><div class="dm-thread inbox-event-thread">${invites.map(item=>`<article class="glass-card inbox-event"><span>◇</span><div><b>${esc(item.actor?.username||'SYLORA')}</b><small>${esc(item.type)}</small></div></article>`).join('')||`<p class="muted">${esc(t('noActiveInvites'))}</p>`}<div class="inbox-route-actions"><button type="button" data-inbox-go="business">${esc(t('businessRooms'))}</button><button type="button" data-inbox-go="learning">${esc(t('scienceCircles'))}</button></div></div>`;
  if(tab==='calls')return `<div class="chat-head"><div><span class="avatar convo-5">◉</span><span><b>${esc(t('inboxCalls'))}</b><small><i></i> WebRTC · ${esc(t('voiceLabel'))} & ${esc(t('videoLabel'))}</small></span></div></div><div class="dm-thread calls-reference"><section class="glass-card call-launcher"><span class="status-pill status-pill--success">${esc(t('realWebrtc'))}</span><h2>${esc(t('startTalking'))}</h2><select id="callRecipient"><option value="">${esc(t('selectRecipient'))}</option>${users.map(user=>`<option value="${esc(user.id)}">@${esc(user.username)}</option>`).join('')}</select><div><button type="button" id="startVoiceCall">${referenceIcon('mic')} ${esc(t('voiceLabel'))}</button><button type="button" id="startVideoCall">${referenceIcon('camera')} ${esc(t('videoLabel'))}</button><button type="button" id="startSyloraCall">${referenceIcon('sparkles')} Sylora</button></div></section>${(callHistory.history||[]).map(item=>`<article class="glass-card inbox-event"><span>${referenceIcon(item.kind==='video'?'camera':'mic')}</span><div><b>${esc(item.kind)}</b><small>${esc(item.status)} · ${item.durationSec||0}s${item.missed?` · ${esc(t('missed'))}`:''}</small></div></article>`).join('')}${calls.map(item=>`<article class="glass-card inbox-event"><span>✦</span><div><b>${esc(item.actor?.username||'SYLORA')}</b><small>${esc(item.type)}</small></div></article>`).join('')}</div>`;
  const buckets=Object.entries(smartInbox?.inbox?.buckets||{});
  return `<div class="chat-head"><div><span class="avatar convo-1">AI</span><span><b>${esc(t('priorityInbox'))}</b><small><i></i> ${esc(t('nothingHidden'))}</small></span></div></div><div class="dm-thread inbox-event-thread"><section class="glass-card priority-summary"><span class="status-pill status-pill--violet">SYLORA AI</span><h2>${esc(smartInbox?.inbox?.summary||t('importantOnePlace'))}</h2><p>${esc(t('aiGroupsOnly'))}</p></section>${buckets.map(([name,items])=>`<article class="glass-card priority-bucket"><small>${esc(name)}</small>${(items||[]).slice(0,8).map(item=>`<p>${esc(item.preview||item.type||item.kind||item.id)}</p>`).join('')||`<p class="muted">${esc(t('empty'))}</p>`}</article>`).join('')}</div>`;
}

async function openConversationReference(id){
  const [{messages},convoList]=await Promise.all([api(`/api/conversations/${id}/messages`),api('/api/conversations')]);
  document.querySelectorAll('.conversation-row').forEach(row=>row.classList.toggle('active',row.dataset.id===id));
  const conversation=(convoList.conversations||[]).find(item=>item.id===id),other=(conversation?.members||[]).find(member=>member.id!==state.me.id),box=document.querySelector('#chat');if(!box)return;
  const letter=esc((other?.displayName||other?.username||'?').slice(0,1).toUpperCase());
  box.innerHTML=`<div class="chat-head"><div><span class="avatar convo-2">${letter}</span><span><b>${esc(other?.displayName||other?.username||t('conversation'))}</b><small><i></i> @${esc(other?.username||'user')}</small></span></div><div><button type="button" id="dmVoiceCall" aria-label="${esc(t('voiceCall'))}">${referenceIcon('mic')}</button><button type="button" id="dmVideoCall" aria-label="${esc(t('videoCall'))}">${referenceIcon('camera')}</button></div></div><div class="dm-thread">${messages.map(message=>`<article class="dm ${message.userId===state.me.id?'sent':''}">${esc(message.text)}<small>${new Date(message.createdAt||Date.now()).toLocaleTimeString(getLocale()==='uk'?'uk-UA':getLocale(),{hour:'2-digit',minute:'2-digit'})}${message.userId===state.me.id?' · ✓':''}</small></article>`).join('')||`<p class="muted chat-empty">${esc(t('startTalking'))}</p>`}</div><form id="messageForm" class="dm-composer"><button type="button" aria-label="${esc(t('attachment'))}">＋</button><input name="text" maxlength="2000" placeholder="${esc(t('writeMessage'))}" required autocomplete="off"><button type="button" aria-label="${esc(t('voiceLabel'))}">${referenceIcon('mic')}</button><button class="send-button" aria-label="${esc(t('send'))}">↑</button></form>`;
  const contact=document.querySelector('#contactPanel');if(contact)contact.innerHTML=`<span class="contact-avatar avatar convo-2">${letter}</span><h3>${esc(other?.displayName||other?.username||t('contact'))}</h3><p>@${esc(other?.username||'user')}</p><div class="contact-actions"><button type="button" id="contactVoice">${referenceIcon('mic')}<small>${esc(t('voiceLabel'))}</small></button><button type="button" id="contactVideo">${referenceIcon('camera')}<small>${esc(t('videoLabel'))}</small></button><button type="button" data-contact-profile>${referenceIcon('users')}<small>${esc(t('profile'))}</small></button></div><div class="contact-details"><small>${esc(t('privacy'))}</small><p>${esc(t('thisConversationOnly'))}</p></div>`;
  document.querySelector('#messageForm').onsubmit=async event=>{event.preventDefault();const text=new FormData(event.currentTarget).get('text');await api(`/api/conversations/${id}/messages`,{method:'POST',body:JSON.stringify({text})});await openConversationReference(id)};
  const startDmCall=async kind=>{if(!other)return toast(t('selectRecipient'));const {call}=await api('/api/calls',{method:'POST',body:JSON.stringify({kind,userId:other.id,conversationId:id})});await openCallSession(call.id,{asCallee:false,kind})};
  ['#dmVoiceCall','#contactVoice'].forEach(selector=>document.querySelector(selector)?.addEventListener('click',()=>startDmCall('voice')));
  ['#dmVideoCall','#contactVideo'].forEach(selector=>document.querySelector(selector)?.addEventListener('click',()=>startDmCall('video')));
  document.querySelector('[data-contact-profile]')?.addEventListener('click',()=>nav('profile'));
}
async function openConversation(id){
  const [{messages},convoList]=await Promise.all([api(`/api/conversations/${id}/messages`),api('/api/conversations')]);
  document.querySelectorAll('.convo').forEach(x=>x.classList.toggle('active',x.dataset.id===id));
  const box=document.querySelector('#chat');if(!box)return;
  const conversation=(convoList.conversations||[]).find(c=>c.id===id);
  const other=(conversation?.members||[]).find(x=>x.id!==state.me.id);
  box.innerHTML=`<div class="card chat-card"><div class="chat-head"><span><i></i> приватна розмова</span><b>Sylora Messages</b><div class="row"><button type="button" class="ghost" id="dmVoiceCall">Voice</button><button type="button" class="ghost" id="dmVideoCall">Video</button></div></div><div class="message-stream">${messages.map(m=>`<div class="message-bubble ${m.userId===state.me.id?'mine':'theirs'}"><small>${m.userId===state.me.id?'Я':'Співрозмовник'}</small><p>${esc(m.text)}</p></div>`).join('')||'<p class="muted chat-empty">Почни розмову.</p>'}</div><form id="messageForm" class="message-compose"><input name="text" maxlength="2000" placeholder="Написати повідомлення…" required autocomplete="off"><button class="primary" aria-label="Надіслати">↑</button></form></div>`;
  document.querySelector('#messageForm').onsubmit=async e=>{e.preventDefault();const text=new FormData(e.currentTarget).get('text');await api(`/api/conversations/${id}/messages`,{method:'POST',body:JSON.stringify({text})});openConversation(id)};
  const startDmCall=async kind=>{
    if(!other)return toast('Peer required');
    const {call}=await api('/api/calls',{method:'POST',body:JSON.stringify({kind,userId:other.id,conversationId:id})});
    await openCallSession(call.id,{asCallee:false,kind});
  };
  document.querySelector('#dmVoiceCall')?.addEventListener('click',()=>startDmCall('voice'));
  document.querySelector('#dmVideoCall')?.addEventListener('click',()=>startDmCall('video'));
}

/** Shared Call Engine UI — real WebRTC (same ICE path as LIVE/conference). */
async function openCallSession(callId,{asCallee=false,kind='voice'}={}){
  if(!state.me)return renderAuth();
  if(activeCallCleanup){activeCallCleanup();activeCallCleanup=null}
  if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)return toast(t('webRtcUnsupported'));
  const [{call},rtc]=await Promise.all([
    api(`/api/calls/${callId}`),
    api('/api/calls/rtc-config').catch(()=>liveRtcConfig())
  ]);
  const wantVideo=String(call.kind||kind).includes('video');
  const peerId=crypto.randomUUID();
  let localStream=null,pc=null,remoteStream=new MediaStream(),closed=false,controller=new AbortController();
  const startedAt=Date.now();
  app.innerHTML=`<section class="card call-stage" id="callStage"><span class="eyebrow">SYLORA · ${esc(t('callEngine'))}</span><h1>${esc(t(wantVideo?'videoCall':'voiceCall'))}</h1><p class="muted">${esc(call.status)} · WebRTC · ${esc(t(rtc.turnConfigured?'turnReadyCall':'p2pConfigureTurn'))}</p>
  <div class="call-media"><video id="callRemote" autoplay playsinline ${wantVideo?'':'hidden'}></video><video id="callLocal" autoplay muted playsinline ${wantVideo?'':'hidden'}></video><audio id="callRemoteAudio" autoplay></audio></div>
  <div class="row call-controls"><button type="button" class="ghost" id="callMute">${esc(t('mute'))}</button>${wantVideo?`<button type="button" class="ghost" id="callCam">${esc(t('camera'))}</button>`:''}<button type="button" class="primary" id="callEnd">${esc(t('endCall'))}</button><span class="badge" id="callNet">${esc(t('connecting').toUpperCase())}</span><span class="badge" id="callTimer">00:00</span></div></section>`;
  state.view='messages';state.inboxTab='calls';
  const tick=()=>{const el=document.querySelector('#callTimer');if(!el)return;const s=Math.floor((Date.now()-startedAt)/1000);el.textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
  const timerIv=setInterval(tick,1000);tick();
  const cleanup=()=>{closed=true;clearInterval(timerIv);controller.abort();try{localStream?.getTracks().forEach(t=>t.stop())}catch{}try{pc?.close()}catch{};activeCallCleanup=null};
  activeCallCleanup=cleanup;
  const setNet=t=>{const el=document.querySelector('#callNet');if(el)el.textContent=t};
  const sendSignal=async(kind,toPeerId,data)=>api(`/api/calls/${callId}/signal`,{method:'POST',body:JSON.stringify({kind,fromPeerId:peerId,toPeerId,data})});
  try{
    localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:wantVideo});
    const localVideo=document.querySelector('#callLocal');
    if(localVideo&&wantVideo){localVideo.srcObject=localStream;localVideo.hidden=false}
  }catch{toast(t('microphoneCameraPermission'));cleanup();return renderMessagesReference()}
  pc=new RTCPeerConnection({iceServers:rtc.iceServers||[]});
  for(const track of localStream.getTracks())pc.addTrack(track,localStream);
  pc.ontrack=e=>{
    remoteStream.addTrack(e.track);
    const v=document.querySelector('#callRemote'),a=document.querySelector('#callRemoteAudio');
    if(wantVideo&&v){v.srcObject=remoteStream;v.hidden=false}
    if(a)a.srcObject=remoteStream;
    setNet(t('connected').toUpperCase());
  };
  pc.onicecandidate=e=>{if(e.candidate&&window.__syloraCallRemotePeer)sendSignal('ice',window.__syloraCallRemotePeer,e.candidate.toJSON()).catch(()=>{})};
  pc.onconnectionstatechange=()=>setNet((pc.connectionState||'').toUpperCase());
  document.querySelector('#callMute').onclick=()=>{const track=localStream.getAudioTracks()[0];if(!track)return;track.enabled=!track.enabled;document.querySelector('#callMute').textContent=t(track.enabled?'mute':'unmute')};
  document.querySelector('#callCam')?.addEventListener('click',()=>{const t=localStream.getVideoTracks()[0];if(!t)return;t.enabled=!t.enabled});
  document.querySelector('#callEnd').onclick=async()=>{try{await api(`/api/calls/${callId}/end`,{method:'POST',body:'{}'})}catch{}cleanup();renderMessagesReference()};
  const onSignal=async s=>{
    if(closed||s.fromPeerId===peerId)return;
    if(s.kind==='peer-left'){setNet(t('peerLeft'));return}
    if(s.kind==='peer-join'){
      window.__syloraCallRemotePeer=s.fromPeerId;
      await refreshRtcPeerConfiguration(pc);
      const offer=await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal('offer',s.fromPeerId,pc.localDescription);
      return;
    }
    if(s.toPeerId&&s.toPeerId!==peerId)return;
    window.__syloraCallRemotePeer=s.fromPeerId;
    if(s.kind==='offer'){
      await refreshRtcPeerConfiguration(pc);
      await pc.setRemoteDescription(s.data);
      const answer=await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal('answer',s.fromPeerId,pc.localDescription);
    }else if(s.kind==='answer'){
      await pc.setRemoteDescription(s.data);
    }else if(s.kind==='ice'){
      try{await pc.addIceCandidate(s.data)}catch{}
    }
  };
  (async()=>{
    try{
      const response=await fetch(`/api/calls/${callId}/events`,{headers:{authorization:`Bearer ${state.token}`},signal:controller.signal});
      if(!response.ok)throw new Error('CALL_EVENT_STREAM_FAILED');
      setNet(t('signaling'));
      await sendSignal('peer-join',null,{media:wantVideo?'video':'audio'});
      const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
      while(!closed){
        const {done,value}=await reader.read();if(done)break;
        buffer+=decoder.decode(value,{stream:true});
        let boundary;
        while((boundary=buffer.indexOf('\n\n'))>=0){
          const raw=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);
          let event='',data='';
          for(const line of raw.split('\n')){if(line.startsWith('event:'))event=line.slice(6).trim();else if(line.startsWith('data:'))data+=line.slice(5).trim()}
          if(event==='signal'&&data)try{await onSignal(JSON.parse(data))}catch{}
          if(event==='call'&&data){try{const payload=JSON.parse(data);if(['ended','missed'].includes(payload.call?.status)||payload.action==='end'){cleanup();toast(t('callEnded'));renderMessagesReference()}}catch{}}
        }
      }
    }catch(e){if(e.name!=='AbortError'){setNet('ERROR');toast(humanError(e.message))}}
  })();
}

function localizeSettingsLanguageCenter(){
  const index=document.querySelector('.settings-index');
  if(index){
    index.setAttribute('aria-label',t('settingsSections'));
    const label=index.querySelector(':scope>small');if(label)label.textContent=t('settingsLabel');
    const buttons=[...index.querySelectorAll(':scope>button')];
    const values=[
      [t('interfaceLanguage'),t('fiveLocales')],
      ['LIVE & Studio','OBS · TikTok · multistream'],
      ['Sylora AI',t('voiceMemoryPermissions')],
      [t('securityCenter'),t('sessionsPrivacy')],
      [t('systemTools'),t('identityCanvasAgents')]
    ];
    buttons.forEach((button,i)=>{const title=button.querySelector('b'),copy=button.querySelector('small');if(title)title.textContent=values[i][0];if(copy)copy.textContent=values[i][1]});
  }
  const heading=document.querySelector('#languageSettings');
  if(heading){const pill=heading.querySelector('.status-pill'),status=heading.querySelector('.locale-orbit small');if(pill)pill.textContent=`SYLORA · ${t('personalSystem')}`;if(status)status.textContent=t('active')}
  const card=document.querySelector('.language-card');
  if(card){const title=card.querySelector('.card-top>span');if(title)title.textContent=t('interfaceLanguage').toUpperCase();card.querySelectorAll('.language-option').forEach(button=>{const detail=button.querySelector('small'),action=button.querySelector('i');if(detail)detail.textContent=`${button.dataset.settingsLocale.toUpperCase()} · ${t('fullInterface')}`;if(action)action.textContent=t(button.classList.contains('active')?'active':'select')})}
  const preview=document.querySelector('.translation-preview');
  if(preview){const copy=preview.querySelector('div');if(copy){const label=copy.querySelector('small'),title=copy.querySelector('b'),text=copy.querySelector('p');if(label)label.textContent=t('interfaceTranslation');if(title)title.textContent=t('menusErrorsHints');if(text)text.textContent=t('userContentOriginalSync')}const status=preview.querySelector('.status-pill');if(status)status.textContent=`${getLocale().toUpperCase()} ${t('active')}`}
  const setHeading=(selector,titleKey,introKey,statusKey)=>{const section=document.querySelector(selector);if(!section)return null;const title=section.querySelector('h1'),intro=section.querySelector('p'),status=section.querySelector('.locale-orbit small');if(title)title.textContent=t(titleKey);if(intro)intro.textContent=t(introKey);if(status)status.textContent=t(statusKey);return section};
  const setRows=(card,values)=>{if(!card)return;card.querySelectorAll('.setting-row').forEach((row,index)=>{const value=values[index];if(!value)return;const title=row.querySelector('span:nth-child(2)>b'),copy=row.querySelector('span:nth-child(2)>small'),action=row.querySelector('button'),status=row.querySelector('.status-pill');if(title&&value[0])title.textContent=t(value[0]);if(copy&&value[1])copy.textContent=t(value[1]);if(action&&value[2])action.textContent=t(value[2]);if(status&&value[3])status.textContent=t(value[3])})};
  const live=setHeading('#liveSettings','broadcastsWithoutChaos','broadcastsSettingsIntro','safe');
  setRows(live?.nextElementSibling,[['weakNetworkMode','adaptiveRecovery',null,'automatic'],[null,'localCompanionPairing',null,'local'],[null,'protectedStreamKeys','openStudio',null],[null,'controlledDestinations',null,'featureFlag']]);
  const sylora=setHeading('#syloraSettings','aliveControlled','syloraSettingsIntro','voice');
  setRows(sylora?.nextElementSibling,[['naturalVoice','voiceStateCycle',null,'readyLabel'],['doNotCoverMain','availableOnRequest',null,'onRequest'],['memoryPermissions','importantActionsConfirm','openSylora',null]]);
  const system=document.querySelector('#systemSettings');
  if(system){const pill=system.querySelector('.status-pill'),status=system.querySelector('.flag-vault small');if(pill)pill.textContent=t('safeFeatureFlags');if(status)status.textContent=t('flags')}
  document.querySelectorAll('.settings-group-head .eyebrow').forEach(label=>{label.textContent=t('controlGroup')});
}

function renderMore(){
  const groups=[
    {title:t('personalSecurity'),copy:t('personalSecurityCopy'),items:[['identity','◈',t('identityTitle'),t('identityCopy')],['dashboard','▣',t('dashboardTitle'),t('dashboardCopy')],['security','⛨',t('securityCenter'),t('securityCenterCopy')]]},
    {title:t('systemTools'),copy:t('systemToolsCopy'),items:[['canvas','▭',t('canvasTitle'),t('canvasCopy')],['agents','⬡',t('agentMarketplace'),t('agentMarketplaceCopy')],['developer','⌁',t('developerPlatform'),t('developerPlatformCopy')]]},
    ...(state.me?.role==='admin'?[{title:t('administration'),copy:t('administrationCopy'),items:[['admin','⚙',t('moderation'),t('moderationCopy')]]}]:[])
  ];
  const locales=[['uk','🇺🇦','Українська','UA'],['en','🇬🇧','English','EN'],['pl','🇵🇱','Polski','PL'],['de','🇩🇪','Deutsch','DE'],['ru','◌','Русский','RU']];
  const localeOptions=locales.map(([value,,label])=>`<option value="${value}">${label}</option>`).join('');
  const module=([view,icon,title,copy])=>`<button type="button" class="card module" data-go="${view}"><span class="icon">${icon}</span><span><h3>${esc(title)}</h3><p>${esc(copy)}</p></span><i>→</i></button>`;
  const current=getLocale();
  app.innerHTML=`<div class="settings-layout"><nav class="settings-index" aria-label="Розділи налаштувань"><small>НАЛАШТУВАННЯ</small><button class="active" type="button" data-settings-jump="languageSettings">${referenceIcon('sparkles')}<span><b>Мова інтерфейсу</b><small>5 повних локалізацій</small></span>${referenceIcon('arrow')}</button><button type="button" data-settings-jump="liveSettings">${referenceIcon('live')}<span><b>LIVE & Studio</b><small>OBS · TikTok · multistream</small></span>${referenceIcon('arrow')}</button><button type="button" data-settings-jump="syloraSettings">✦<span><b>Sylora AI</b><small>голос, пам’ять, дозволи</small></span>${referenceIcon('arrow')}</button><button type="button" data-go="security">⛨<span><b>Безпека</b><small>сесії та приватність</small></span>${referenceIcon('arrow')}</button><button type="button" data-settings-jump="systemSettings">⚙<span><b>Система</b><small>identity, canvas, agents</small></span>${referenceIcon('arrow')}</button></nav><main class="settings-content"><section id="languageSettings" class="settings-heading language-heading settings-scene"><div><span class="status-pill status-pill--violet">SYLORA · PERSONAL SYSTEM</span><h1>${esc(t('interfaceLanguage'))}</h1><p>${esc(t('interfaceLanguageHint'))}</p></div><span class="locale-orbit"><b>${esc(current.toUpperCase())}</b><small>ACTIVE</small></span></section><section class="glass-card language-card"><div class="card-top"><span>МОВА ІНТЕРФЕЙСУ</span><label class="select-compact">${referenceIcon('sparkles')}<select id="settingsLocaleSwitch" aria-label="${esc(t('interfaceLanguage'))}">${localeOptions}</select></label></div><div class="language-grid">${locales.map(([value,flag,label,iso])=>`<button type="button" class="language-option ${value===current?'active':''}" data-settings-locale="${value}"><span>${flag}</span><span><b>${label}</b><small>${iso} · повний інтерфейс</small></span><i>${value===current?'ACTIVE':'SELECT'}</i>${value===current?referenceIcon('activity'):''}</button>`).join('')}</div></section><section class="translation-preview"><span>文</span><div><small>ПЕРЕКЛАД ІНТЕРФЕЙСУ</small><b>Меню, системні кнопки, помилки й підказки</b><p>Контент користувачів залишається мовою оригіналу; вибір синхронізується з профілем.</p></div><span class="status-pill status-pill--success">${esc(current.toUpperCase())} ACTIVE</span></section><section id="liveSettings" class="settings-heading live-settings-heading"><div><span class="status-pill status-pill--live">${referenceIcon('live')} LIVE & STUDIO</span><h1>Трансляції без хаосу.</h1><p>Слабка мережа, reconnect, OBS, TikFinity та зовнішні платформи видно в одному місці.</p></div><span class="locale-orbit"><b>LIVE</b><small>SAFE</small></span></section><section class="glass-card settings-card"><div class="setting-row"><span class="setting-icon">⌁</span><span><b>Режим слабкої мережі</b><small>adaptive quality і автоматичне відновлення</small></span><span class="status-pill status-pill--success">AUTO</span>${referenceIcon('arrow')}</div><div class="setting-row"><span class="setting-icon">▣</span><span><b>OBS Studio + TikFinity</b><small>локальний SYLORA Companion, pairing у LIVE</small></span><span class="status-pill">LOCAL</span>${referenceIcon('arrow')}</div><div class="setting-row"><span class="setting-icon">◉</span><span><b>TikTok · YouTube · Twitch · Facebook</b><small>захищені stream keys через RTMP(S) router</small></span><button class="depth-button" type="button" data-go="studio">Відкрити Studio</button>${referenceIcon('arrow')}</div><div class="setting-row"><span class="setting-icon">↗</span><span><b>Restream + Custom RTMP</b><small>додаються як окремі контрольовані напрямки</small></span><span class="status-pill">FEATURE FLAG</span>${referenceIcon('arrow')}</div></section><section id="syloraSettings" class="settings-heading sylora-settings-heading"><div><span class="status-pill status-pill--violet">✦ SYLORA AI</span><h1>Жива, але під контролем.</h1><p>Natural Luna voice, емоційна українська інтонація, lip-sync, пам’ять і прозорі дозволи.</p></div><span class="locale-orbit"><b>AI</b><small>VOICE</small></span></section><section class="glass-card settings-card"><div class="setting-row"><span class="setting-icon">◖))</span><span><b>Природний голос</b><small>Idle → Listening → Thinking → Speaking</small></span><span class="status-pill status-pill--success">READY</span>${referenceIcon('arrow')}</div><div class="setting-row"><span class="setting-icon">✦</span><span><b>Не перекривати головний екран</b><small>Sylora доступна за запитом, голосом і через mobile dock</small></span><span class="status-pill">ON REQUEST</span>${referenceIcon('arrow')}</div><div class="setting-row"><span class="setting-icon">⛨</span><span><b>Пам’ять і дозволи</b><small>важливі дії завжди потребують підтвердження</small></span><button class="depth-button" type="button" data-go="ai">Відкрити Sylora</button>${referenceIcon('arrow')}</div></section><section id="systemSettings" class="settings-heading flags-heading"><div><span class="status-pill status-pill--gold">SAFE FEATURE FLAGS</span><h1>${esc(t('settingsTitle'))}</h1><p>${esc(t('settingsIntro'))}</p></div><span class="flag-vault">⚑<small>FLAGS</small></span></section><div class="settings-groups">${groups.map(group=>`<section class="settings-group glass-card"><div class="settings-group-head"><span class="eyebrow">CONTROL GROUP</span><h2>${esc(group.title)}</h2><p>${esc(group.copy)}</p></div><div class="settings-grid">${group.items.map(module).join('')}</div></section>`).join('')}</div></main></div>`;
  localizeSettingsLanguageCenter();
  document.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>nav(x.dataset.go));
  const settingsLocale=document.querySelector('#settingsLocaleSwitch');
  settingsLocale.value=getLocale();
  settingsLocale.onchange=async event=>{
    const locale=setLocale(event.target.value);
    applyShellLanguage();
    if(state.me){
      try{const out=await api('/api/me',{method:'PATCH',body:JSON.stringify({locale})});state.me=out.user}
      catch(error){toast(humanError(error.message))}
    }
    account();refreshRightRail();renderMore();
  };
  document.querySelectorAll('[data-settings-locale]').forEach(button=>button.onclick=()=>{settingsLocale.value=button.dataset.settingsLocale;settingsLocale.dispatchEvent(new Event('change'))});
  document.querySelectorAll('[data-settings-jump]').forEach(button=>button.onclick=()=>{document.querySelectorAll('.settings-index>button').forEach(item=>item.classList.toggle('active',item===button));document.querySelector(`#${button.dataset.settingsJump}`)?.scrollIntoView({behavior:'smooth',block:'start'})});
}
async function renderIdentity(){
  const [{identity},kg]=await Promise.all([api('/api/identity'),api('/api/kg').catch(()=>({nodes:[],edges:[]}))]);
  const p=identity.privacy||{};
  const nodes=Array.isArray(kg.nodes)?kg.nodes:[];
  const fields=['profile','professional','portfolio','skills','interests','reputation','agent','assets'];
  const privacyLevels=['public','followers','connections','business','private','ai_only'];
  const privacyText=value=>t(`privacy${value.split('_').map(x=>x[0].toUpperCase()+x.slice(1)).join('')}`);
  app.innerHTML=`<div class="card hero"><span class="eyebrow">${esc(t('identityEyebrow'))}</span><h1>${esc(identity.displayName||state.me.displayName)}</h1><p>${esc(t('identityIntro'))}</p></div>
  <form id="identityForm" class="card fields"><span class="eyebrow">${esc(t('identityProfessional'))}</span>
  <input name="title" aria-label="${esc(t('jobTitle'))}" placeholder="${esc(t('jobTitle'))}" value="${esc(identity.professional?.title||'')}">
  <input name="company" aria-label="${esc(t('company'))}" placeholder="${esc(t('company'))}" value="${esc(identity.professional?.company||'')}">
  <input name="skills" aria-label="${esc(t('skillsComma'))}" placeholder="${esc(t('skillsComma'))}" value="${esc((identity.professional?.skills||[]).join(', '))}">
  <input name="interests" aria-label="${esc(t('interestsComma'))}" placeholder="${esc(t('interestsComma'))}" value="${esc((identity.interests||[]).join(', '))}">
  <input name="headline" aria-label="${esc(t('creatorHeadline'))}" placeholder="${esc(t('creatorHeadline'))}" value="${esc(identity.creatorPersona?.headline||'')}">
  <span class="eyebrow">${esc(t('fieldPrivacy'))}</span>
  ${fields.map(k=>`<label>${esc(t(`privacy${k[0].toUpperCase()+k.slice(1)}`))}<select name="privacy_${k}">${privacyLevels.map(v=>`<option value="${v}" ${p[k]===v?'selected':''}>${esc(privacyText(v))}</option>`).join('')}</select></label>`).join('')}
  <button class="primary">${esc(t('saveIdentity'))}</button></form>
  <section class="card"><span class="eyebrow">${esc(t('knowledgeGraph'))}</span><h3>${esc(t('knowledgeGraphIntro'))}</h3>
  <form id="kgForm" class="fields"><input name="label" maxlength="120" aria-label="${esc(t('knowledgeLabelExample'))}" placeholder="${esc(t('knowledgeLabelExample'))}" required><input name="value" maxlength="1000" aria-label="${esc(t('value'))}" placeholder="${esc(t('value'))}" required>
  <select name="privacy" aria-label="${esc(t('fieldPrivacy'))}">${['private','ai_only','connections','public'].map(v=>`<option value="${v}">${esc(privacyText(v))}</option>`).join('')}</select>
  <button class="ghost">${esc(t('addNode'))}</button></form>
  <div class="stack">${nodes.slice(-20).reverse().map(n=>`<div class="item row"><div><b>${esc(n.label||n.type||'node')}</b><p class="muted">${esc(n.data?.value||n.data?.summary||n.type||'')} · ${esc(privacyText(n.privacy||'private'))}</p></div><button class="ghost kg-del" data-id="${esc(n.id)}">${esc(t('delete'))}</button></div>`).join('')||`<p class="muted">${esc(t('graphEmpty'))}</p>`}</div></section>`;
  document.querySelector('#identityForm').onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const privacy={};for(const k of['profile','professional','portfolio','skills','interests','reputation','agent','assets'])privacy[k]=fd.get('privacy_'+k);
    await api('/api/identity',{method:'PATCH',body:JSON.stringify({
      creatorPersona:{headline:fd.get('headline')},
      professional:{title:fd.get('title'),company:fd.get('company'),skills:String(fd.get('skills')||'').split(',').map(x=>x.trim()).filter(Boolean)},
      interests:String(fd.get('interests')||'').split(',').map(x=>x.trim()).filter(Boolean),
      privacy
    })});
    toast(t('identityUpdated'));renderIdentity();
  };
  document.querySelector('#kgForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    await api('/api/kg/nodes',{method:'POST',body:JSON.stringify({label:fd.get('label'),privacy:fd.get('privacy'),type:'knowledge',data:{value:String(fd.get('value')||'')}})});
    toast(t('nodeAdded'));renderIdentity();
  });
  document.querySelectorAll('.kg-del').forEach(b=>b.onclick=async()=>{await api(`/api/kg/nodes/${b.dataset.id}`,{method:'DELETE'});toast(t('nodeDeleted'));renderIdentity()});
}
async function renderAgents(){
  const [{agents},{installs}]=await Promise.all([api('/api/agents'),api('/api/agents/installed')]);
  const installed=new Set(installs.map(i=>i.agentId));
  app.innerHTML=`<div class="card hero"><span class="eyebrow">${esc(t('agentsEyebrow'))}</span><h1>${esc(t('agentsHero'))}</h1><p>${esc(t('agentsIntro'))}</p></div>
  <div class="stack">${agents.map(a=>`<div class="card item"><span class="eyebrow">${esc(a.category)} · ${esc(a.pricing?.model==='free'?t('free'):a.pricing?.model||t('free'))}</span><h3>${esc(a.name)}</h3><p>${esc(a.summary)}</p><small>${esc(t('permissions'))}: ${(a.permissions||[]).map(esc).join(', ')||'—'}</small><div class="row">${installed.has(a.id)?`<button class="ghost uninstall-agent" data-id="${esc(a.id)}">${esc(t('uninstall'))}</button><button class="ghost start-negotiate" data-id="${esc(a.id)}">${esc(t('aiProposal'))}</button>`:`<button class="primary install-agent" data-id="${esc(a.id)}">${esc(t('install'))}</button>`}</div></div>`).join('')}</div>`;
  document.querySelectorAll('.install-agent').forEach(b=>b.onclick=async()=>{await api(`/api/agents/${b.dataset.id}/install`,{method:'POST',body:'{}'});toast(t('agentInstalled'));renderAgents()});
  document.querySelectorAll('.uninstall-agent').forEach(b=>b.onclick=async()=>{await api(`/api/agents/${b.dataset.id}/install`,{method:'DELETE'});toast(t('agentUninstalled'));renderAgents()});
  document.querySelectorAll('.start-negotiate').forEach(b=>b.onclick=async()=>{const out=await api('/api/agents/negotiations',{method:'POST',body:JSON.stringify({toAgentId:b.dataset.id,topic:'proposal',message:t('personalAiRequest')})});toast(out.ok?t('negotiationProposed'):t('negotiationFailed'));renderAgents()});
}
async function renderDeveloper(){
  const {apps,oauth}=await api('/api/developer/apps');
  app.innerHTML=`<div class="card hero"><span class="eyebrow">${esc(t('developerEyebrow'))}</span><h1>${esc(t('developerHero'))}</h1><p>${esc(t('developerIntro'))}</p></div>
  <form id="devAppForm" class="card fields"><span class="eyebrow">${esc(t('newApp'))}</span><input name="name" required maxlength="80" aria-label="${esc(t('appName'))}" placeholder="${esc(t('appName'))}"><input name="scopes" value="identity.read" aria-label="${esc(t('scopesComma'))}" placeholder="${esc(t('scopesComma'))}"><button class="primary">${esc(t('createApp'))}</button></form>
  <div class="card"><span class="eyebrow">${esc(t('oauthStatus'))}</span><pre style="white-space:pre-wrap;font-size:12px">${esc(JSON.stringify(oauth,null,2))}</pre></div>
  <div class="stack" id="devApps">${apps.map(a=>`<div class="card item"><b>${esc(a.name)}</b><p class="muted">${esc((a.scopes||[]).join(', '))}</p><button class="ghost create-key" data-id="${esc(a.id)}">${esc(t('createApiKey'))}</button></div>`).join('')||`<p class="muted">${esc(t('noApps'))}</p>`}</div>
  <pre id="devKeyOut" class="card" hidden></pre>`;
  document.querySelector('#devAppForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await api('/api/developer/apps',{method:'POST',body:JSON.stringify({name:fd.get('name'),scopes:String(fd.get('scopes')||'').split(',').map(x=>x.trim()).filter(Boolean)})});toast(t('appCreated'));renderDeveloper()};
  document.querySelectorAll('.create-key').forEach(b=>b.onclick=async()=>{const out=await api(`/api/developer/apps/${b.dataset.id}/keys`,{method:'POST',body:JSON.stringify({label:t('defaultKeyLabel')})});const box=document.querySelector('#devKeyOut');box.hidden=false;box.textContent=`${t('saveKeyOnce')}\n${out.raw}`;});
}
async function renderSecurityCenter(){
  const [security,reputation,activity,intel,memoryCenter,caps]=await Promise.all([
    api('/api/security-center'),
    api('/api/reputation'),
    api('/api/ai/activity').catch(()=>({activity:[]})),
    api('/api/ai/intelligence').catch(()=>({})),
    api('/api/ai/memory/center').catch(()=>({memories:[],categories:[],byCategory:{}})),
    api('/api/ai/capabilities').catch(()=>({}))
  ]);
  const ai=security.aiControl||{};
  const controls=ai.privacyControls||{};
  const controlKeys=['memory','microphone','camera','location','contacts','files','notifications','personalization','aiActions','voice','translation'];
  app.innerHTML=`<div class="card hero"><span class="eyebrow">${esc(t('privacyAiControl'))}</span><h1>${esc(t('trustCenter'))}</h1><p>${esc(t('trustIntro'))}</p></div>
  <section class="card"><span class="eyebrow">${esc(t('controls'))}</span><div class="privacy-grid">${controlKeys.map(k=>`<label class="privacy-toggle"><input type="checkbox" data-privacy="${k}" ${controls[k]!==false?'checked':''}> ${esc(t(`control${k[0].toUpperCase()+k.slice(1)}`))}</label>`).join('')}</div>
  <div class="row" style="margin-top:12px"><label>${esc(t('proactive'))} <select id="privacyProactive"><option value="OFF">${esc(t('off'))}</option><option value="IMPORTANT_ONLY">${esc(t('importantOnly'))}</option><option value="NORMAL">${esc(t('normal'))}</option><option value="PROACTIVE">${esc(t('proactive'))}</option></select></label><button class="primary" id="savePrivacyControls">${esc(t('saveControls'))}</button></div></section>
  <section class="card"><span class="eyebrow">${esc(t('whatSyloraCanSee'))}</span><p>${(ai.canSee||[]).map(esc).join(' · ')||'—'}</p>
  <span class="eyebrow">${esc(t('memory'))}</span><div class="stack">${(ai.remembers||[]).map(m=>`<div class="item"><b>${esc(m.label)}</b><small class="muted">${esc(m.source||'')}</small></div>`).join('')||'<p class="muted">—</p>'}</div>
  <span class="eyebrow">${esc(t('integrations'))}</span><div class="stack">${(ai.integrations||[]).map(i=>`<div class="item row"><b>${esc(i.name)}</b><button class="ghost revoke-agent" data-id="${esc(i.agentId)}">${esc(t('disconnect'))}</button></div>`).join('')||'<p class="muted">—</p>'}</div></section>
  <section class="card"><span class="eyebrow">${esc(t('activityLog'))}</span><div class="stack">${(activity.activity||ai.activity||[]).slice().reverse().slice(0,30).map(a=>`<div class="item"><b>${esc(a.summary||a.kind)}</b><p class="muted">${esc(a.reason||'')} · ${esc(a.context||'')} · ${a.createdAt?new Date(a.createdAt).toLocaleString(getLocale()==='uk'?'uk-UA':getLocale()):''}</p></div>`).join('')||`<p class="muted">${esc(t('noSyloraActivity'))}</p>`}</div></section>
  <div class="grid2"><div class="card item"><span class="eyebrow">${esc(t('data'))}</span>
  <button class="ghost" id="exportMemory">${esc(t('exportMyData'))}</button><button class="ghost" id="clearMemory">${esc(t('deleteMemories'))}</button><button class="ghost" id="clearHistory">${esc(t('deleteHistory'))}</button><button class="ghost" id="privacyExport">${esc(t('requestAccountExport'))}</button><button class="ghost" id="disablePersonalization">${esc(t('disablePersonalization'))}</button></div>
  <div class="card item"><span class="eyebrow">${esc(t('reputation'))}</span>${Object.entries(reputation.reputation?.dimensions||{}).map(([k,v])=>`<div><b>${esc(k)}</b>: ${Number(v.score||0)}</div>`).join('')}<button class="ghost" id="disputeRep">${esc(t('dispute'))}</button>
  <p class="muted">${esc(t('capabilities'))}: AI ${esc(t(ai.capabilities?.aiText?'on':'off'))} · ${esc(t('voice'))} ${esc(t(ai.capabilities?.aiRealtimeVoice?'on':'off'))} · LUMEN ${esc(caps?.honesty?.lumenWallet?.label||'TEST / DEMO')}</p></div></div>
  <section class="card"><span class="eyebrow">${esc(t('memoryCenter'))}</span><h3>${esc(t('controlledMemory'))}</h3>
  <p class="muted">${esc(memoryCenter.honesty||t('memoryHonesty'))}</p>
  <label class="privacy-toggle"><input type="checkbox" id="memoryEnabled" ${memoryCenter.enabled!==false?'checked':''}> ${esc(t('memoryEnabled'))}</label>
  <div class="stack">${(memoryCenter.categories||[]).map(cat=>{const items=(memoryCenter.byCategory&&memoryCenter.byCategory[cat])||[];return `<div class="item"><b>${esc(cat)}</b><p class="muted">${items.length?items.map(m=>esc(m.label)).join(' · '):'—'}</p></div>`;}).join('')}</div>
  <div class="stack">${(memoryCenter.memories||[]).slice(0,20).map(m=>`<div class="item row"><div><b>${esc(m.label)}</b><p class="muted">${esc(m.value)} · ${esc(m.category||'preferences')}</p></div><button class="ghost edit-mem" data-id="${esc(m.id)}">${esc(t('edit'))}</button><button class="ghost del-mem" data-id="${esc(m.id)}">${esc(t('delete'))}</button></div>`).join('')||`<p class="muted">${esc(t('empty'))}</p>`}</div></section>`;
  document.querySelector('#privacyProactive').value=ai.proactiveLevel||intel.proactive||'IMPORTANT_ONLY';
  document.querySelector('#savePrivacyControls').onclick=async()=>{
    const patch={};document.querySelectorAll('[data-privacy]').forEach(el=>{patch[el.dataset.privacy]=el.checked});
    patch.proactiveLevel=document.querySelector('#privacyProactive').value;
    await api('/api/ai/privacy-controls',{method:'PATCH',body:JSON.stringify(patch)});
    toast(t('controlsSaved'));renderSecurityCenter();
  };
  document.querySelector('#exportMemory').onclick=async()=>{const out=await api('/api/ai/memory/export');const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sylora-ai-memory.json';a.click();toast(t('exportReady'))};
  document.querySelector('#clearMemory').onclick=async()=>{if(!confirm(t('confirmDeleteMemories')))return;await api('/api/ai/memory',{method:'DELETE'});toast(t('memoriesCleared'));renderSecurityCenter()};
  document.querySelector('#clearHistory').onclick=async()=>{if(!confirm(t('confirmDeleteHistory')))return;await api('/api/ai/history',{method:'DELETE'});toast(t('historyCleared'));renderSecurityCenter()};
  document.querySelector('#privacyExport').onclick=async()=>{await api('/api/privacy/requests',{method:'POST',body:JSON.stringify({type:'export',details:'User requested account data export'})});toast(t('requestQueued'))};
  document.querySelector('#disablePersonalization').onclick=async()=>{await api('/api/ai/privacy-controls',{method:'PATCH',body:JSON.stringify({personalization:false,proactiveLevel:'OFF'})});toast(t('personalizationOff'));renderSecurityCenter()};
  document.querySelectorAll('.revoke-agent').forEach(b=>b.onclick=async()=>{await api(`/api/agents/${b.dataset.id}/install`,{method:'DELETE'});toast(t('disconnected'));renderSecurityCenter()});
  document.querySelector('#disputeRep').onclick=async()=>{await api('/api/reputation/dispute',{method:'POST',body:JSON.stringify({dimension:'trust',reason:'User disputes trust score accuracy'})});toast(t('disputeOpened'));renderSecurityCenter()};
  document.querySelector('#memoryEnabled')?.addEventListener('change',async e=>{await api('/api/ai/memory/enabled',{method:'PATCH',body:JSON.stringify({enabled:e.target.checked})});toast(t(e.target.checked?'memoryOn':'memoryOff'))});
  document.querySelectorAll('.edit-mem').forEach(b=>b.onclick=async()=>{const value=prompt(t('newValue'));if(value==null)return;const category=prompt(t('memoryCategory'),'preferences');await api(`/api/ai/memory/${b.dataset.id}`,{method:'PATCH',body:JSON.stringify({value,category})});toast(t('updated'));renderSecurityCenter()});
  document.querySelectorAll('.del-mem').forEach(b=>b.onclick=async()=>{await api(`/api/ai/memory/${b.dataset.id}`,{method:'DELETE'});toast(t('deleted'));renderSecurityCenter()});
}

async function renderPersonalDashboard(){
  const {dashboard}=await api('/api/dashboard');
  const d=dashboard||{};
  app.innerHTML=`<div class="card hero"><span class="eyebrow">${esc(t('personalDashboard'))}</span><h1>${esc(t('today'))}</h1><p>${esc(d.today?.summary||t('adaptiveOverview'))}</p></div>
  <div class="grid2">
    <section class="card"><span class="eyebrow">TASKS</span>${(d.tasks||[]).map(t=>`<p><b>${esc(t.title)}</b><small class="muted"> · ${esc(t.status)}</small></p>`).join('')||'<p class="muted">—</p>'}</section>
    <section class="card"><span class="eyebrow">${esc(t('goals'))}</span>${(d.goals||[]).map(g=>`<p><b>${esc(g.title)}</b><small class="muted"> · ${Math.round((g.progress||0)*100)}%</small></p>`).join('')||'<p class="muted">—</p>'}</section>
  </div>
  <section class="card"><span class="eyebrow">${esc(t('dailyBrief'))}</span><p>${esc(d.today?.summary||'—')}</p></section>
  <section class="card"><span class="eyebrow">${esc(t('continueSection'))}</span>${(d.continue||[]).map(c=>`<p>${esc(c.kind||'')} · ${esc(c.key||c.label||'')}</p>`).join('')||'<p class="muted">—</p>'}</section>
  <section class="card"><span class="eyebrow">SYLORA</span>${(d.syloraSuggestions||[]).map(s=>`<p>${esc(s.text||'')}</p>`).join('')||'<p class="muted">—</p>'}
  <form id="osCmd" class="fields"><input name="text" aria-label="${esc(t('dashboardPrompt'))}" placeholder="${esc(t('dashboardPrompt'))}" required><button class="primary">${esc(t('askSyloraOs'))}</button></form><pre id="osOut" hidden style="white-space:pre-wrap;font-size:12px"></pre></section>`;
  document.querySelector('#osCmd').onsubmit=async e=>{e.preventDefault();const text=new FormData(e.currentTarget).get('text');const out=await api('/api/ai/command',{method:'POST',body:JSON.stringify({text})});const pre=document.querySelector('#osOut');pre.hidden=false;pre.textContent=JSON.stringify(out,null,2).slice(0,2000)};
}
async function renderCanvas(){
  const [{workspaces},]=await Promise.all([api('/api/canvas'),api('/api/skills').catch(()=>({skills:[]}))]);
  app.innerHTML=`<div class="card hero"><span class="eyebrow">${esc(t('canvasEyebrow'))}</span><h1>${esc(t('canvasWorkspace'))}</h1><p>${esc(t('canvasIntro'))}</p></div>
  <div class="studio-layout canvas-layout"><div class="card" id="canvasArtifact"><span class="eyebrow">${esc(t('artifact'))}</span><form id="canvasForm" class="fields"><input name="title" aria-label="${esc(t('title'))}" placeholder="${esc(t('title'))}" required><select name="kind" aria-label="${esc(t('artifact'))}"><option value="document">${esc(t('document'))}</option><option value="plan">${esc(t('plan'))}</option><option value="research">${esc(t('research'))}</option><option value="project">${esc(t('project'))}</option><option value="business">${esc(t('business'))}</option></select><textarea name="body" rows="10" aria-label="${esc(t('writeWithSylora'))}" placeholder="${esc(t('writeWithSylora'))}"></textarea><button class="primary">${esc(t('saveWorkspace'))}</button></form></div>
  <aside class="card"><span class="eyebrow">SYLORA</span><div class="stack">${(workspaces||[]).slice(0,8).map(w=>`<div class="item"><b>${esc(w.title)}</b><small class="muted">${esc(w.kind)}</small></div>`).join('')||`<p class="muted">${esc(t('empty'))}</p>`}</div>
  <form id="canvasAsk" class="fields"><input name="q" aria-label="${esc(t('summarizeRewrite'))}" placeholder="${esc(t('summarizeRewrite'))}" required><button class="ghost">${esc(t('ask'))}</button></form><pre id="canvasAskOut" hidden style="white-space:pre-wrap;font-size:12px"></pre></aside></div>`;
  document.querySelector('#canvasForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await api('/api/canvas',{method:'POST',body:JSON.stringify({title:fd.get('title'),kind:fd.get('kind'),artifact:{body:fd.get('body')}})});toast(t('workspaceSaved'));renderCanvas()};
  document.querySelector('#canvasAsk').onsubmit=async e=>{e.preventDefault();const q=new FormData(e.currentTarget).get('q');const out=await api('/api/ai/command',{method:'POST',body:JSON.stringify({text:q,view:'canvas'})});const pre=document.querySelector('#canvasAskOut');pre.hidden=false;pre.textContent=JSON.stringify(out.result||out.plan||out,null,2).slice(0,1800)};
}
const SYLORA_SPEECH_LOCALES=Object.freeze({uk:'uk-UA',pl:'pl-PL',en:'en-US',de:'de-DE',ru:'ru-RU',es:'es-ES',fr:'fr-FR',it:'it-IT',pt:'pt-PT'});
function syloraSpeechLocale(){return SYLORA_SPEECH_LOCALES[syloraVoiceLocale]||SYLORA_SPEECH_LOCALES[getLocale()]||'uk-UA'}
function detectSyloraSpeechLocale(text=''){
  const value=String(text).toLowerCase();
  if(/[іїєґ]/.test(value)||/\b(привіт|дякую|будь ласка|добрий|вечір|ранок)\b/u.test(value))return'uk-UA';
  if(/[ąćęłńóśźż]/.test(value)||/\b(cześć|dziękuję|proszę|dobry|wieczór)\b/u.test(value))return'pl-PL';
  if(/[а-яё]/.test(value))return'ru-RU';
  if(/[äöüß]/.test(value)||/\b(hallo|danke|bitte|guten|abend)\b/u.test(value))return'de-DE';
  if(/[¿¡]/.test(value)||/\b(hola|gracias|por favor|buenos|buenas)\b/u.test(value))return'es-ES';
  if(/[àâçéèêëîïôùûüÿœ]/.test(value)||/\b(bonjour|merci|salut)\b/u.test(value))return'fr-FR';
  if(/\b(ciao|grazie|buongiorno|buonasera|per favore)\b/u.test(value))return'it-IT';
  if(/[ãõ]/.test(value)||/\b(olá|obrigad[oa]|bom dia|boa noite)\b/u.test(value))return'pt-PT';
  return'en-US';
}
function setSyloraPresence(mode='ready'){
  const hero=document.querySelector('.sylora-ai-hero'),label=document.querySelector('#aiPresenceStatus');if(hero)hero.dataset.presence=mode;
  hero?._syloraMotionRig?.setPresence(mode);
  if(hero&&mode!=='speaking')hero._syloraHairVoice=0;
  if(label)label.textContent=t(mode==='listening'?'aiListening':mode==='thinking'?'aiThinking':mode==='speaking'?'aiSpeaking':mode==='muted'?'microphoneOff':'aiReady');
  if(mode==='thinking')setSyloraGesture('thinking');else if(mode==='speaking')setSyloraGesture('explain');else if(mode==='listening')setSyloraGesture('empathy');else if(mode==='muted')setSyloraGesture('neutral');else if(hero?.dataset.emotion==='neutral'||!hero?.dataset.emotion)setSyloraGesture('neutral');
}
function stopSyloraVoice(){syloraRecognition?.stop?.();syloraRecognition=null;window.speechSynthesis?.cancel();setSyloraPresence('ready')}
function speakSylora(text,{force=false,autoDetect=false}={}){
  if((!syloraVoiceEnabled&&!force)||!text||!('speechSynthesis'in window))return false;setSyloraEmotion(detectSyloraEmotion(text),5200);window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang=autoDetect?detectSyloraSpeechLocale(text):syloraSpeechLocale();utterance.rate=.98;utterance.pitch=1.03;
  const voices=window.speechSynthesis.getVoices(),selected=voices.find(v=>v.voiceURI===syloraVoiceId),exact=voices.find(v=>v.lang?.toLowerCase()===utterance.lang.toLowerCase()),family=voices.find(v=>v.lang?.toLowerCase().startsWith(utterance.lang.slice(0,2).toLowerCase()));if(selected||exact||family)utterance.voice=selected||exact||family;
  utterance.onstart=()=>setSyloraPresence('speaking');utterance.onend=()=>setSyloraPresence('ready');utterance.onerror=()=>setSyloraPresence('ready');window.speechSynthesis.speak(utterance);return true;
}
function startSyloraListening(){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition,input=document.querySelector('#aiForm textarea');if(!Recognition||!input)return toast(t('speechInputUnsupported'));
  syloraRecognition?.stop?.();window.speechSynthesis?.cancel();const recognition=new Recognition();syloraRecognition=recognition;recognition.lang=syloraSpeechLocale();recognition.continuous=false;recognition.interimResults=true;let finalText='';
  recognition.onstart=()=>setSyloraPresence('listening');recognition.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const part=e.results[i][0].transcript;if(e.results[i].isFinal)finalText+=part;else interim+=part}input.value=(finalText||interim).trim();input.dispatchEvent(new Event('input'))};
  recognition.onerror=e=>{if(e.error!=='aborted')toast(t(e.error==='not-allowed'?'allowMicrophone':'voiceRecognitionFailed'));setSyloraPresence('ready')};recognition.onend=()=>{syloraRecognition=null;setSyloraPresence('ready');input.focus()};recognition.start();
}
function setRealtimeButton(active,label){const button=document.querySelector('#aiRealtime');if(!button)return;button.classList.toggle('active',active);button.querySelector('span').textContent=label||t(active?'endLive':'liveConversation')}
function realtimeClock(){const elapsed=Math.max(0,Date.now()-syloraCallStartedAt),minutes=String(Math.floor(elapsed/60000)).padStart(2,'0'),seconds=String(Math.floor(elapsed/1000)%60).padStart(2,'0'),el=document.querySelector('#realtimeTimer');if(el)el.textContent=`${minutes}:${seconds}`}
function setRealtimeUi(active){const hero=document.querySelector('.sylora-ai-hero'),deck=document.querySelector('#realtimeDeck');hero?.classList.toggle('realtime-live',active);if(deck)deck.hidden=!active;if(active){syloraCallStartedAt=Date.now();clearInterval(syloraCallTimer);syloraCallTimer=setInterval(realtimeClock,1000);realtimeClock()}else{clearInterval(syloraCallTimer);syloraCallTimer=null}}
function toggleSyloraRealtimeMute(){const track=syloraRealtimeStream?.getAudioTracks?.()[0],button=document.querySelector('#aiMute');if(!track)return;track.enabled=!track.enabled;if(button){button.classList.toggle('muted',!track.enabled);button.textContent=t(track.enabled?'microphone':'microphoneOff')}setSyloraPresence(track.enabled?'ready':'muted')}
function scheduleSyloraLife(hero){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const doBlink=()=>{
    if(!hero.isConnected||performance.now()<(hero._syloraGestureBusyUntil||0))return;
    const frames=syloraBlinkSequence(hero.dataset.gesture||'neutral');
    if(!frames.length||hero.dataset.presence==='speaking')return;
    playSyloraFrameSequence(hero,frames);
    if(Math.random()<.14)setTimeout(()=>{if(hero.isConnected)doBlink()},280);
  };
  const nextBlink=()=>{
    hero._syloraBlinkTimer=setTimeout(()=>{
      if(!hero.isConnected)return;
      doBlink();
      nextBlink();
    },2500+Math.random()*4100);
  };
  nextBlink();
}
function setSyloraAvatarFrame(hero,frameName='neutral'){
  const frame=hero?.querySelector('.sylora-avatar-frame');
  if(!frame)return;
  const safeName=Object.hasOwn(SYLORA_GESTURE_SEQUENCES,frameName)?syloraRestingFrame(frameName):frameName;
  const src=syloraFrameSrc(safeName);
  if(frame.dataset.frame===safeName&&frame.getAttribute('src')===src)return;
  frame.dataset.frame=safeName;
  frame.src=src;
}
function cancelSyloraFrameSequence(hero){
  hero._syloraFrameToken=(hero._syloraFrameToken||0)+1;
  for(const timer of hero._syloraFrameTimers||[])clearTimeout(timer);
  hero._syloraFrameTimers=[];
  hero._syloraGestureBusyUntil=0;
}
function playSyloraFrameSequence(hero,steps){
  cancelSyloraFrameSequence(hero);
  const token=hero._syloraFrameToken;
  let finalAt=0;
  for(const step of steps){
    finalAt=Math.max(finalAt,step.atMs);
    const show=()=>{if(hero.isConnected&&hero._syloraFrameToken===token)setSyloraAvatarFrame(hero,step.frame)};
    if(step.atMs===0)show();else hero._syloraFrameTimers.push(setTimeout(show,step.atMs));
  }
  hero._syloraGestureBusyUntil=performance.now()+finalAt+70;
  return finalAt;
}
function mountSyloraAvatarLayers(){
  const hero=document.querySelector('.sylora-ai-hero');
  if(!hero||hero.querySelector('.sylora-avatar-motion'))return;
  hero.classList.add('sylora-assembled');
  const motion=document.createElement('div');
  motion.className='sylora-avatar-motion';
  motion.setAttribute('aria-hidden','true');
  motion.dataset.avatarVersion=SYLORA_AVATAR_VERSION;
  motion.dataset.renderMode='single-plate-2d';
  // One coherent full-body plate at a time: no detached logo overlay and no body crossfade.
  const frame=document.createElement('img');
  frame.className='sylora-avatar-body sylora-avatar-frame';
  frame.src=syloraFrameSrc('neutral');
  frame.dataset.frame='neutral';
  frame.width=940;
  frame.height=1254;
  frame.alt='';
  frame.decoding='async';
  frame.fetchPriority='high';
  frame.draggable=false;
  frame.addEventListener('load',()=>{delete hero.dataset.avatarError});
  frame.addEventListener('error',()=>{hero.dataset.avatarError='asset-load'});
  motion.append(frame);
  hero.append(motion);
  hero._syloraPreloadedFrames=preloadSyloraAvatarFrames();
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const rig=new SyloraMotionRig();
    hero._syloraMotionRig=rig;
    rig.setPresence(hero.dataset.presence||'ready');
    hero._syloraMotionDetach=rig.attach(hero);
  }
  setSyloraGesture(hero.dataset.gesture||'neutral');
  scheduleSyloraLife(hero);
}
function detectSyloraEmotion(text=''){const s=String(text).toLowerCase();if(/[!]{2,}|\b(wow|вау|ого|wow)\b/.test(s))return'surprised';if(/😂|🤣|😄|\b(ха-?ха|haha|żart|жарт)/.test(s))return'playful';if(/\b(дякую|спасибі|thanks|thank you|dziękuję|dziekuje)\b/.test(s))return'grateful';if(/\b(болить|погано|сумно|проблем|важко|sorry|sad|problem|martwi|smutn)/.test(s))return'concerned';if(/❤️|❤|\b(чудово|супер|класно|рада|радий|great|good|love|świetnie|dobrze)\b/.test(s))return'happy';return'neutral'}
function setSyloraGesture(name='neutral',duration=0){
  const hero=document.querySelector('.sylora-ai-hero');
  if(!hero)return;
  const gestureName=Object.hasOwn(SYLORA_GESTURE_SEQUENCES,name)?name:'neutral';
  clearTimeout(hero._syloraGestureTimer);
  hero.dataset.gesture=gestureName;
  hero.dataset.handPose=handPoseForGesture(gestureName);
  hero._syloraMotionRig?.setGesture(gestureName);
  hero.classList.toggle('gesture-active',gestureName!=='neutral');
  hero._syloraVisemeFrame=0;
  const transitionMs=playSyloraFrameSequence(hero,syloraGestureSequence(gestureName));
  if(duration)hero._syloraGestureTimer=setTimeout(()=>{
    if(hero.isConnected)setSyloraGesture(hero.dataset.presence==='thinking'?'thinking':hero.dataset.presence==='speaking'?'explain':hero.dataset.presence==='listening'?'empathy':'neutral');
  },Math.max(duration,transitionMs+80));
}
function updateSyloraSpeakingGesture(level=0){const hero=document.querySelector('.sylora-ai-hero');if(!hero||hero.dataset.presence!=='speaking'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;hero._syloraMotionRig?.setVoiceEnergy(level);if(!hero._syloraMotionRig){hero.style.setProperty('--gesture-lift',`${(-Math.min(1,level)*2.2).toFixed(2)}px`);hero._syloraHairVoice=-Math.min(1,level)*.32}const now=performance.now();if(level>.48&&now>(hero._syloraNextEmphasis||0)){hero._syloraNextEmphasis=now+1900+Math.random()*1200;setSyloraGesture('emphasis',620)}}
function setSyloraEmotion(emotion='neutral',duration=0){const hero=document.querySelector('.sylora-ai-hero');if(!hero)return;hero.dataset.emotion=emotion;clearTimeout(hero._syloraEmotionTimer);const gesture={happy:'positive',grateful:'empathy',concerned:'empathy',playful:'wave',surprised:'welcome'}[emotion];if(gesture)setSyloraGesture(gesture,duration);if(duration)hero._syloraEmotionTimer=setTimeout(()=>{if(hero.isConnected){hero.dataset.emotion='neutral';if(hero.dataset.presence==='ready')setSyloraGesture('neutral')}},duration)}
function setSyloraViseme(level=0,bands=null){
  const hero=document.querySelector('.sylora-ai-hero');
  if(!hero)return;
  const now=performance.now(),energy=Math.max(level,bands?.mid||0),frame=energy>=.075?1:0;
  if(frame===hero._syloraVisemeFrame||frame!==0&&now-(hero._syloraVisemeAt||0)<72)return;
  hero._syloraVisemeAt=now;
  hero._syloraVisemeFrame=frame;
  hero.classList.toggle('avatar-speaking',frame!==0);
  if(hero.dataset.presence!=='speaking'||!['explain','emphasis'].includes(hero.dataset.gesture))return;
  cancelSyloraFrameSequence(hero);
  setSyloraAvatarFrame(hero,frame?'explain-speaking':syloraRestingFrame(hero.dataset.gesture));
}
function startSyloraAudioReactive(stream){
  try{cancelAnimationFrame(syloraAudioRaf);syloraAudioContext?.close?.();const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;const ctx=new AudioCtx(),analyser=ctx.createAnalyser(),source=ctx.createMediaStreamSource(stream),wave=new Uint8Array(128),freq=new Uint8Array(128);analyser.fftSize=256;analyser.smoothingTimeConstant=.68;source.connect(analyser);syloraAudioContext=ctx;ctx.resume?.().catch(()=>{});const avg=(from,to)=>{let sum=0;for(let i=from;i<to;i++)sum+=freq[i]||0;return sum/Math.max(1,to-from)/255};const tick=()=>{if(!syloraRealtimePeer||ctx.state==='closed')return;analyser.getByteTimeDomainData(wave);analyser.getByteFrequencyData(freq);let energy=0;for(const value of wave)energy+=Math.abs(value-128);const level=Math.min(1,energy/wave.length/24),bands={low:avg(1,12),mid:avg(12,40),high:avg(40,88)},hero=document.querySelector('.sylora-ai-hero');if(hero){hero.style.setProperty('--voice-scale',(1+level*.008).toFixed(4));hero.style.setProperty('--voice-glow',`${Math.round(12+level*30)}px`);setSyloraViseme(level,bands);updateSyloraSpeakingGesture(level)}syloraAudioRaf=requestAnimationFrame(tick)};tick()}catch{}
}
function appendRealtimeTranscript(role,text){const clean=String(text||'').trim();if(!clean)return;const caption=document.querySelector('#realtimeCaption');if(caption)caption.textContent=`${role==='assistant'?'Sylora':t('you')}: ${clean}`;const list=document.querySelector('#aiMessages');if(!list)return;list.querySelector('.ai-first-message')?.remove();const item=document.createElement('div');item.className=`item ${role==='assistant'?'ai-answer':'ai-user-message'} realtime-transcript`;const label=document.createElement('span');label.className='eyebrow';label.textContent=role==='assistant'?'SYLORA · VOICE':`${t('you').toUpperCase()} · VOICE`;const p=document.createElement('p');p.textContent=clean;item.append(label,p);list.append(item);list.scrollTop=list.scrollHeight}
function persistRealtimeTranscript(role,text,event){const clean=String(text||'').trim();if(!clean)return;const sourceEventId=String(event?.event_id||`${event?.type||'realtime'}:${event?.item_id||event?.response_id||crypto.randomUUID()}:${event?.content_index??0}`);setSyloraEmotion(detectSyloraEmotion(clean),role==='assistant'?5200:3600);appendRealtimeTranscript(role,clean);api('/api/ai/realtime/transcript',{method:'POST',body:JSON.stringify({role,text:clean,sourceEventId})}).catch(()=>{})}
function stopSyloraRealtime(){
  try{syloraRealtimeChannel?.close()}catch{}try{syloraRealtimePeer?.close()}catch{}syloraRealtimeStream?.getTracks().forEach(t=>t.stop());if(syloraRealtimeAudio){syloraRealtimeAudio.srcObject=null;syloraRealtimeAudio.remove()}cancelAnimationFrame(syloraAudioRaf);syloraAudioRaf=0;syloraAudioContext?.close?.().catch?.(()=>{});syloraAudioContext=null;
  syloraRealtimeChannel=null;syloraRealtimePeer=null;syloraRealtimeStream=null;syloraRealtimeAudio=null;setSyloraViseme(0);setRealtimeButton(false,t('liveConversation'));setRealtimeUi(false);setSyloraPresence('ready');
}
async function startSyloraRealtime(){
  if(syloraRealtimePeer)return stopSyloraRealtime();if(!state.token)return renderAuth();if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)return toast(t('liveVoiceUnsupported'));
  stopSyloraVoice();setRealtimeButton(true,t('connecting'));setSyloraPresence('thinking');
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}),pc=new RTCPeerConnection();syloraRealtimeStream=stream;syloraRealtimePeer=pc;
    const audio=document.createElement('audio');audio.autoplay=true;audio.setAttribute('playsinline','');audio.hidden=true;document.body.append(audio);syloraRealtimeAudio=audio;pc.ontrack=e=>{audio.srcObject=e.streams[0];startSyloraAudioReactive(e.streams[0])};pc.onconnectionstatechange=()=>{if(['failed','disconnected','closed'].includes(pc.connectionState))stopSyloraRealtime()};pc.addTrack(stream.getAudioTracks()[0],stream);
    const dc=pc.createDataChannel('oai-events');syloraRealtimeChannel=dc;dc.onopen=()=>{setRealtimeButton(true,t('endLive'));setRealtimeUi(true);setSyloraPresence('ready');setSyloraGesture('wave',1350)};dc.onmessage=e=>{try{const event=JSON.parse(e.data),type=event.type||'';if(type==='input_audio_buffer.speech_started')setSyloraPresence('listening');else if(type==='input_audio_buffer.speech_stopped'||type==='response.created')setSyloraPresence('thinking');else if(type.includes('output_audio')&&type.endsWith('.delta'))setSyloraPresence('speaking');else if(type==='response.done'||type==='response.cancelled')setSyloraPresence('ready');if(type==='conversation.item.input_audio_transcription.completed')persistRealtimeTranscript('user',event.transcript,event);if(type==='response.output_audio_transcript.done')persistRealtimeTranscript('assistant',event.transcript,event)}catch{}};
    const offer=await pc.createOffer();await pc.setLocalDescription(offer);const response=await fetch('/api/ai/realtime',{method:'POST',headers:{authorization:`Bearer ${state.token}`,'content-type':'application/sdp'},body:offer.sdp});if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.error||'REALTIME_SESSION_FAILED')}await pc.setRemoteDescription({type:'answer',sdp:await response.text()});
  }catch(error){stopSyloraRealtime();toast(error.name==='NotAllowedError'?t('allowLiveMicrophone'):humanError(error.message))}
}

function localizeAiPage({configured,dashboard,messages,memories}={}){
  const hero=document.querySelector('.sylora-ai-hero');
  if(hero){const toggle=hero.querySelector('#aiVisualToggle'),title=hero.querySelector(':scope>h1'),intro=hero.querySelector(':scope>p'),presence=hero.querySelector('.ai-human-presence, .voice-state-card'),caption=hero.querySelector('#realtimeCaption'),mute=hero.querySelector('#aiMute'),endButton=hero.querySelector('#aiEndCall');if(toggle)toggle.textContent=t(hero.classList.contains('sylora-visual-hidden')?'showSylora':'hideSylora');if(title)title.textContent=t('aiReady');if(intro&&configured)intro.textContent=t('aiHeroIntro');if(presence){const status=presence.querySelector('#aiPresenceStatus'),detail=presence.querySelector('small');if(status)status.textContent=t(syloraRealtimePeer?'aiListening':'aiReady');if(detail)detail.textContent=t('voiceTextMemory')}if(caption)caption.textContent=t('interruptAnytime');if(mute)mute.textContent=t('microphone');if(endButton)endButton.textContent=t('end')}
  const approvals=document.querySelector('.ai-approvals');
  if(approvals){const eyebrow=approvals.querySelector(':scope>.eyebrow'),title=approvals.querySelector(':scope>h3');if(eyebrow)eyebrow.textContent=t('needsYourDecision');if(title)title.textContent=t('aiActions');approvals.querySelectorAll('.ai-confirm').forEach(button=>{button.textContent=t('confirm')});approvals.querySelectorAll('.ai-cancel').forEach(button=>{button.textContent=t('cancel')})}
  const transparency=document.querySelector('.ai-transparency');
  if(transparency){const eyebrow=transparency.querySelector(':scope>.eyebrow'),title=transparency.querySelector(':scope>h3'),intro=transparency.querySelector(':scope>p'),items=[...transparency.querySelectorAll('.stack>.item')];if(eyebrow)eyebrow.textContent=t('whatSyloraKnowsCan');if(title)title.textContent=t('personalAiTransparency');if(intro)intro.textContent=t('oneAssistantGraph');[['knows',!(dashboard?.knows||[]).length?'emptySoFar':null],['access',null],['recentActions',!(dashboard?.did||[]).length?'noActionsYet':null]].forEach(([label,emptyKey],index)=>{const item=items[index],heading=item?.querySelector('b'),copy=item?.querySelector('p');if(heading)heading.textContent=t(label);if(copy&&emptyKey)copy.textContent=t(emptyKey)});const live=transparency.querySelector('#aiPermLive'),exportButton=transparency.querySelector('#aiExportMem');if(live)live.textContent=t('liveAssist');if(exportButton)exportButton.textContent=t('exportMemory')}
  document.querySelectorAll('#aiMessages .ai-user-message .eyebrow').forEach(label=>{label.textContent=label.textContent.includes('VOICE')?`${t('you').toUpperCase()} · VOICE`:t('you').toUpperCase()});
  const first=document.querySelector('#aiMessages .ai-first-message');if(first){const title=first.querySelector('b'),copy=first.querySelector('p');if(title)title.textContent=t('iAmListening');if(copy)copy.textContent=t('writeOrTalk')}
  const form=document.querySelector('#aiForm');
  if(form){const context=form.querySelector('label:first-child');if(context?.firstChild)context.firstChild.nodeValue=`${t('context')} `;const contextOptions=form.querySelectorAll('#aiContextView option'),realtime=form.querySelector('#aiRealtime span'),micButton=form.querySelector('#aiMic'),mic=micButton?.querySelector('span'),voiceToggle=form.querySelector('#aiVoiceToggle span'),voicePicker=form.querySelector('.voice-picker'),textarea=form.querySelector('textarea'),sendButton=form.querySelector('.ai-send');const contextKeys=['commandCenter','live','studio','business','learning','inboxMessages'];contextOptions.forEach((option,index)=>{if(contextKeys[index])option.textContent=t(contextKeys[index])});if(realtime)realtime.textContent=t(syloraRealtimePeer?'endLive':'liveConversation');if(mic)mic.textContent=t('dictate');if(micButton)micButton.setAttribute('aria-label',t('talkToSylora'));if(voiceToggle)voiceToggle.textContent=t(syloraVoiceEnabled?'narrationOn':'narrationOff');if(voicePicker?.firstChild)voicePicker.firstChild.nodeValue=`${t('voice')} `;const automatic=voicePicker?.querySelector('option[value=""]');if(automatic)automatic.textContent=t('automaticVoice');if(textarea)textarea.placeholder=`${t('talkToSylora')}…`;if(sendButton)sendButton.setAttribute('aria-label',t('send'))}
  const memory=document.querySelector('.ai-memory');
  if(memory){const eyebrow=memory.querySelector(':scope>.eyebrow'),proactiveLabel=memory.querySelector('#aiProactive')?.parentElement;if(eyebrow)eyebrow.textContent=t('controlledMemoryLabel');if(proactiveLabel?.firstChild)proactiveLabel.firstChild.nodeValue=`${t('proactive')} `;const proactiveKeys=['off','importantOnly','normal','proactive'];memory.querySelectorAll('#aiProactive option').forEach((option,index)=>{option.textContent=t(proactiveKeys[index])});memory.querySelectorAll('.delete-memory').forEach(button=>{button.textContent=t('forget')});if(!memories?.length){const empty=memory.querySelector('.stack>.muted');if(empty)empty.textContent=t('noPersistentMemories')}const inputs=memory.querySelectorAll('#memoryForm input'),submit=memory.querySelector('#memoryForm button');if(inputs[0])inputs[0].placeholder=t('exampleLanguage');if(inputs[1])inputs[1].placeholder=t('whatToRemember');if(submit)submit.textContent=t('addManually')}
  const language=document.querySelector('.voice-language-picker');if(language?.firstChild)language.firstChild.nodeValue=`${t('voiceLanguage')} `;const same=language?.querySelector('option[value=""]');if(same)same.textContent=t('sameAsInterface');
  const conversation=document.querySelector('.conversation-head');if(conversation){const eyebrow=conversation.querySelector('small'),title=conversation.querySelector('h1'),intro=conversation.querySelector('p'),menu=conversation.querySelector('#aiConversationMenu');if(eyebrow)eyebrow.textContent=`SYLORA · ${t('naturalConversation')}`;if(title)title.textContent=t('talkWithMe');if(intro)intro.textContent=t('conversationIntro');if(menu)menu.setAttribute('aria-label',t('conversationSettings'))}
  const prompt=document.querySelector('#aiVoicePrompt');if(prompt)prompt.textContent=t(syloraRealtimePeer?'end':'speakAction');
}

async function renderAI(speakText=''){
  const [{messages,memories,pendingActions,model,configured},dashboard]=await Promise.all([api('/api/ai/history'),api('/api/ai/dashboard')]);
  const actionPreview=a=>a.type==='publish_post'?`${t('publishPostPreview')}: “${esc(a.payload?.text||'')}”`:`${t('rememberPreview')} ${esc(a.payload?.label||'')}: ${esc(a.payload?.value||'')}`;
  const availableVoices=('speechSynthesis'in window?window.speechSynthesis.getVoices():[]).filter(v=>/^(uk|pl|en|de|ru|es|fr|it|pt)/i.test(v.lang||''));
  const voiceOptions=availableVoices.map(v=>`<option value="${esc(v.voiceURI)}" ${v.voiceURI===syloraVoiceId?'selected':''}>${esc(v.name)} · ${esc(v.lang)}</option>`).join('');
  app.innerHTML=`<div class="card hero sylora-ai-hero ${syloraRealtimePeer?'realtime-live':''}" data-presence="ready"><button id="aiVisualToggle" class="ghost ai-visual-toggle" type="button">${localStorage.getItem('sylora_visual_hidden')==='1'?'Показати Sylora':'Сховати Sylora'}</button><span class="eyebrow">SYLORA · ${esc(model)}</span><h1>Я поруч.</h1><p>${configured?'Говори зі мною природно. Я бачу лише дозволений тобою контекст, а важливі дії завжди залишаю під твоїм контролем.':esc(t('syloraUnavailable'))}</p><div class="ai-human-presence"><span><i></i> <span id="aiPresenceStatus">Я ПОРУЧ</span></span><b>Sylora</b><small>голос · текст · пам’ять</small><div class="voice-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div><div id="realtimeDeck" class="realtime-call-deck" ${syloraRealtimePeer?'':'hidden'}><div><span class="live-call-dot"></span><small>SYLORA LIVE VOICE</small><strong id="realtimeTimer">00:00</strong></div><p id="realtimeCaption">Говори природно. Можеш перебити мене у будь-який момент.</p><div class="realtime-controls"><button id="aiMute" type="button">Мікрофон</button><button id="aiEndCall" class="end-call" type="button">Завершити</button></div></div></div>${pendingActions.length?`<section class="card"><span class="eyebrow">ПОТРІБНЕ ТВОЄ РІШЕННЯ</span><h3>Дії SYLORA AI</h3><div class="stack">${pendingActions.map(a=>`<div class="item"><p>${actionPreview(a)}</p><div class="row"><button class="primary ai-confirm" data-id="${a.id}">Підтвердити</button><button class="ghost ai-cancel" data-id="${a.id}">Скасувати</button></div></div>`).join('')}</div></section>`:''}${`<section class="card"><span class="eyebrow">ЩО SYLORA ЗНАЄ І МОЖЕ</span><h3>Прозорість Personal AI</h3><p class="muted">Один асистент · один граф пам’яті · різні контексти.</p><div class="stack"><div class="item"><b>Знає</b><p>${(dashboard.knows||[]).slice(-5).map(m=>esc(m.label)).join(' · ')||'Поки порожньо'}</p></div><div class="item"><b>Доступ</b><p>${Object.entries(dashboard.access||{}).filter(([,v])=>v).map(([k])=>esc(k)).slice(0,8).join(' · ')||'—'}</p></div><div class="item"><b>Останні дії</b><p>${(dashboard.did||[]).slice(-3).map(a=>esc(a.summary)).join(' · ')||'Ще немає дій'}</p></div></div><div class="row"><button class="ghost" type="button" id="aiPermLive">LIVE assist</button><button class="ghost" type="button" id="aiExportMem">Експорт пам’яті</button></div></section>`}<div id="aiMessages" class="card stack ai-conversation">${messages.map(m=>`<div class="item ${m.role==='assistant'?'ai-answer':'ai-user-message'}"><span class="eyebrow">${m.role==='assistant'?'SYLORA':'ТИ'}${m.source==='realtime_voice'?' · VOICE':''}</span><p>${esc(m.text)}</p></div>`).join('')||'<div class="ai-first-message"><span>✦</span><b>Я слухаю.</b><p class="muted">Напиши або натисни «Жива розмова» і говори природно.</p></div>'}</div><form id="aiForm" class="card ai-compose"><div class="voice-toolbar"><label class="voice-hint" style="display:flex;align-items:center;gap:6px">Контекст <select id="aiContextView"><option value="command_center">Command Center</option><option value="live">LIVE</option><option value="studio">Studio</option><option value="business">Business</option><option value="learning">Learning</option><option value="messages">Messages</option></select></label><button id="aiRealtime" class="voice-action realtime-action ${syloraRealtimePeer?'active':''}" type="button">◉ <span>${syloraRealtimePeer?'Завершити LIVE':'Жива розмова'}</span></button><button id="aiMic" class="voice-action" type="button" aria-label="Говорити з Sylora">● <span>Диктувати</span></button><button id="aiVoiceToggle" class="voice-action ${syloraVoiceEnabled?'active':''}" type="button">◖)) <span>Озвучення ${syloraVoiceEnabled?'увімкнено':'вимкнено'}</span></button><label class="voice-hint voice-picker">Голос <select id="aiVoiceSelect"><option value="">Автоматично</option>${voiceOptions}</select></label><span class="voice-hint">REALTIME · UA · PL · EN</span></div><div class="ai-input-row"><textarea name="text" maxlength="6000" placeholder="Поговорити з Sylora…" required></textarea><button class="primary ai-send" ${configured?'':'disabled'} aria-label="Надіслати">↑</button></div><p id="aiStatus" class="muted"></p></form><section class="card ai-memory"><span class="eyebrow">КЕРОВАНА ПАМ’ЯТЬ</span><h3>${esc(t('memoryTitle'))}</h3><div class="row" style="margin-bottom:10px"><label>Proactive <select id="aiProactive"><option value="OFF">OFF</option><option value="IMPORTANT_ONLY">IMPORTANT ONLY</option><option value="NORMAL">NORMAL</option><option value="PROACTIVE">PROACTIVE</option></select></label></div><div class="stack">${memories.map(m=>`<div class="item row"><div><b>${esc(m.label)}</b><p class="muted">${esc(m.value)}</p></div><button class="ghost delete-memory" data-id="${m.id}">Забути</button></div>`).join('')||'<p class="muted">Постійних спогадів поки немає.</p>'}</div><form id="memoryForm" class="fields"><input name="label" maxlength="80" placeholder="Напр. Мова" required><input name="value" maxlength="1000" placeholder="Що запам’ятати" required><button class="ghost">Додати вручну</button></form></section>`;
  const voicePicker=document.querySelector('.voice-picker');
  if(voicePicker){const languagePicker=document.createElement('label');languagePicker.className='voice-hint voice-language-picker';languagePicker.textContent=`${t('voiceLanguage')} `;const select=document.createElement('select');select.id='aiVoiceLocale';select.innerHTML=`<option value="">${esc(t('sameAsInterface'))}</option>${Object.entries({uk:'Українська',en:'English',pl:'Polski',de:'Deutsch',ru:'Русский',es:'Español',fr:'Français',it:'Italiano',pt:'Português'}).map(([code,label])=>`<option value="${code}" ${code===syloraVoiceLocale?'selected':''}>${label}</option>`).join('')}`;languagePicker.append(select);voicePicker.after(languagePicker)}
  for(const section of document.querySelectorAll('#app>section.card')){
    const label=section.querySelector(':scope>.eyebrow')?.textContent||'';
    if(label.includes('ПОТРІБНЕ ТВОЄ РІШЕННЯ'))section.classList.add('ai-approvals');
    if(label.includes('ЩО SYLORA ЗНАЄ І МОЖЕ'))section.classList.add('ai-transparency');
  }
  const transparency=document.querySelector('#app>.ai-transparency'),conversation=document.querySelector('#aiMessages'),compose=document.querySelector('#aiForm'),memory=document.querySelector('#app>.ai-memory'),presenceHero=document.querySelector('.sylora-ai-hero');
  if(presenceHero&&transparency&&conversation&&compose&&memory){
    app.classList.add('sylora-layout','sylora-runtime-layout');presenceHero.classList.add('ai-presence-container','sylora-presence');
    const presenceTop=document.createElement('div');presenceTop.className='presence-top';presenceTop.innerHTML=`<span class="status-pill status-pill--violet">✦ ${esc(model)} · ${configured?'ONLINE':'DEGRADED'}</span>`;
    const visualToggle=presenceHero.querySelector('#aiVisualToggle');if(visualToggle)presenceTop.append(visualToggle);presenceHero.prepend(presenceTop);
    presenceHero.insertAdjacentHTML('beforeend','<div class="avatar-halo" aria-hidden="true"><span></span><span></span><span></span></div>');
    const voiceState=presenceHero.querySelector('.ai-human-presence');if(voiceState){voiceState.className='voice-state-card';voiceState.innerHTML=`<span class="voice-core">${referenceIcon('activity')}</span><div><b id="aiPresenceStatus">${syloraRealtimePeer?'Я слухаю':'Я поруч'}</b><small>Idle → Listening → Thinking → Speaking · UA voice</small></div><button id="aiVoicePrompt" type="button">${syloraRealtimePeer?'Завершити':'Говорити'}</button>`}
    const conversationPanel=document.createElement('section');conversationPanel.className='conversation-panel';conversationPanel.innerHTML=`<header class="conversation-head"><div><small>SYLORA · NATURAL CONVERSATION</small><h1>Поговори зі мною.</h1><p>Голосом або текстом. Можеш перебити мене, змінити тему чи попросити допомогти з LIVE — я не перекриваю твій простір.</p></div><button type="button" id="aiConversationMenu" aria-label="Налаштування розмови">•••</button></header>`;
    conversation.classList.remove('card','stack','ai-conversation');conversation.classList.add('conversation-thread');compose.classList.remove('card');compose.classList.add('voice-composer-runtime');conversationPanel.append(conversation,compose);
    const memoryPanel=document.createElement('aside');memoryPanel.className='memory-panel';transparency.classList.add('glass-card');memory.classList.add('glass-card');memoryPanel.append(transparency,memory);
    const approvals=document.querySelector('#app>.ai-approvals');presenceHero.after(conversationPanel);conversationPanel.after(memoryPanel);if(approvals){approvals.classList.add('glass-card','ai-approvals-wide');app.append(approvals)}
  }
  localizeAiPage({configured,dashboard,messages,memories});
  mountSyloraAvatarLayers();
  const hero=document.querySelector('.sylora-ai-hero');hero?.classList.toggle('sylora-visual-hidden',localStorage.getItem('sylora_visual_hidden')==='1');localizeAiPage({configured,dashboard,messages,memories});document.querySelector('#aiVisualToggle')?.addEventListener('click',event=>{const hidden=!hero.classList.contains('sylora-visual-hidden');hero.classList.toggle('sylora-visual-hidden',hidden);localStorage.setItem('sylora_visual_hidden',hidden?'1':'0');event.currentTarget.textContent=t(hidden?'showSylora':'hideSylora')});
  document.querySelector('#aiPermLive')?.addEventListener('click',async()=>{await api('/api/ai/permissions',{method:'PATCH',body:JSON.stringify({permissions:{live_assist:!(dashboard.access||{}).live_assist}})});toast(t('permissionsUpdated'));renderAI()});
  document.querySelector('#aiExportMem')?.addEventListener('click',async()=>{const out=await api('/api/ai/memory/export');const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sylora-ai-memory.json';a.click()});
api('/api/ai/intelligence').then(intel=>{const sel=document.querySelector('#aiProactive');if(!sel)return;sel.value=intel.proactive||intel.agent?.proactiveLevel||'IMPORTANT_ONLY';sel.onchange=async()=>{await api('/api/ai/proactive',{method:'PATCH',body:JSON.stringify({level:sel.value})});toast('OK')}}).catch(()=>{});
  document.querySelector('#aiVoiceSelect')?.addEventListener('change',event=>{syloraVoiceId=event.target.value;localStorage.setItem('sylora_voice_id',syloraVoiceId);toast(t(syloraVoiceId?'voiceChanged':'automaticVoiceEnabled'))});
  document.querySelector('#aiVoiceLocale')?.addEventListener('change',event=>{syloraVoiceLocale=event.target.value;localStorage.setItem('sylora_voice_locale',syloraVoiceLocale);syloraVoiceId='';localStorage.removeItem('sylora_voice_id');toast(`${t('voiceLanguageChanged')}: ${event.target.selectedOptions[0]?.textContent||t('sameAsInterface')}`);renderAI()});
  const form=document.querySelector('#aiForm');document.querySelector('#aiRealtime')?.addEventListener('click',startSyloraRealtime);document.querySelector('#aiVoicePrompt')?.addEventListener('click',startSyloraRealtime);document.querySelector('#aiMute')?.addEventListener('click',toggleSyloraRealtimeMute);document.querySelector('#aiEndCall')?.addEventListener('click',stopSyloraRealtime);document.querySelector('#aiMic')?.addEventListener('click',startSyloraListening);document.querySelector('#aiVoiceToggle')?.addEventListener('click',()=>{syloraVoiceEnabled=!syloraVoiceEnabled;localStorage.setItem('sylora_voice',syloraVoiceEnabled?'1':'0');if(!syloraVoiceEnabled)stopSyloraVoice();renderAI()});if(syloraRealtimePeer){clearInterval(syloraCallTimer);syloraCallTimer=setInterval(realtimeClock,1000);realtimeClock()}
  form?.addEventListener('submit',async e=>{e.preventDefault();const data=new FormData(form),button=form.querySelector('.ai-send'),status=document.querySelector('#aiStatus');button.disabled=true;status.textContent=t('syloraThinking');setSyloraPresence('thinking');try{const view=document.querySelector('#aiContextView')?.value||'command_center';const out=await api('/api/ai/chat',{method:'POST',body:JSON.stringify({text:data.get('text'),view})});await renderAI(out.message)}catch(err){setSyloraPresence('ready');status.textContent=humanError(err.message||err.data?.error);button.disabled=false}});
  if(speakText)requestAnimationFrame(()=>speakSylora(speakText));
  document.querySelector('#memoryForm')?.addEventListener('submit',async e=>{e.preventDefault();await api('/api/ai/memory',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});toast(t('memoryAdded'));await renderAI()});
  document.querySelectorAll('.delete-memory').forEach(b=>b.onclick=async()=>{await api(`/api/ai/memory/${b.dataset.id}`,{method:'DELETE'});toast(t('memoryForgotten'));await renderAI()});
  document.querySelectorAll('.ai-confirm').forEach(b=>b.onclick=async()=>{const out=await api(`/api/ai/actions/${b.dataset.id}/confirm`,{method:'POST',body:'{}'});toast(t(out.action.type==='publish_post'?'postPublished':'memoryConfirmed'));await renderAI()});
  document.querySelectorAll('.ai-cancel').forEach(b=>b.onclick=async()=>{await api(`/api/ai/actions/${b.dataset.id}/cancel`,{method:'POST',body:'{}'});toast(t('actionCancelled'));await renderAI()});
}

async function renderAdmin(){const [{reports},{entries}]=await Promise.all([api('/api/admin/reports?status=all'),api('/api/admin/audit')]);app.innerHTML=`<div class="card hero"><span class="eyebrow">${esc(t('adminSafety'))}</span><h1>${esc(t('moderationConsole'))}</h1><p>${esc(t('moderationIntro'))}</p></div><div class="stack">${reports.map(r=>`<div class="card item"><div class="row"><div><span class="badge">${esc(r.status)}</span><h3>${esc(r.targetType)} · ${esc(r.reason)}</h3><p class="muted">${esc(r.details||t('noDetails'))}</p></div><div><button class="ghost resolve-report" data-id="${esc(r.id)}" data-status="resolved">${esc(t('resolve'))}</button><button class="ghost resolve-report" data-id="${esc(r.id)}" data-status="dismissed">${esc(t('dismiss'))}</button></div></div></div>`).join('')||`<div class="card empty">${esc(t('noReports'))}</div>`}</div><div class="card auth"><h3>${esc(t('auditLog'))}</h3>${entries.slice(0,30).map(x=>`<p class="muted">${new Date(x.createdAt).toLocaleString(getLocale()==='uk'?'uk-UA':getLocale())} · ${esc(x.action)} · ${esc(x.metadata?.status||'')}</p>`).join('')||`<p class="muted">${esc(t('auditEmpty'))}</p>`}</div>`;document.querySelectorAll('.resolve-report').forEach(b=>b.onclick=async()=>{await api(`/api/admin/reports/${b.dataset.id}`,{method:'PATCH',body:JSON.stringify({status:b.dataset.status,resolution:t('adminResolution')})});renderAdmin()})}

async function renderCommunities(){
  const [{communities},ach]=await Promise.all([
    api('/api/communities'),
    state.me?api('/api/achievements').catch(()=>({unlocked:[],mine:[]})):Promise.resolve({mine:[]})
  ]);
  app.innerHTML=`<div class="card hero"><span class="eyebrow">COMMUNITIES</span><h1>Будуй коло своїх.</h1><p>Events · fun rooms · safe discovery · domain achievements</p></div>
  ${state.me?`<section class="card"><span class="eyebrow">SOCIAL · NO GIFTS REQUIRED</span>
  <div class="row"><button type="button" class="primary" id="funCoffee">Coffee Room</button><button type="button" class="ghost" id="funQuizNight">Quiz Night</button><button type="button" class="ghost" id="communityWorkshop">Workshop event</button><button type="button" class="ghost" id="discoveryOptIn">Safe discovery opt-in</button></div>
  <p class="muted" style="margin-top:8px">Achievements (no global ranking): ${(ach.mine||[]).map(a=>a.title).slice(0,4).join(' · ')||'—'}</p>
  </section>`:''}
  ${state.me?'<form id="communityForm" class="card auth fields"><input name="name" placeholder="Назва спільноти" required minlength="3"><textarea name="description" placeholder="Про що вона?"></textarea><button class="primary">Створити</button></form>':''}${communities.map(c=>`<div class="card item"><div class="row"><div><h3>${esc(c.name)}</h3><p class="muted">${esc(c.description)} · ${c.members} учасників</p></div><div class="row"><button class="ghost open-community" data-id="${c.id}">Відкрити</button>${state.me&&c.visibility==='public'?`<button class="ghost join-community" data-id="${c.id}">Приєднатися</button>`:''}</div></div></div>`).join('')||'<div class="card empty">Створи першу спільноту.</div>'}`;
  document.querySelector('#communityForm')?.addEventListener('submit',async e=>{e.preventDefault();await api('/api/communities',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});renderCommunities()});
  document.querySelector('#funCoffee')?.addEventListener('click',async()=>{await api('/api/social/fun-rooms',{method:'POST',body:JSON.stringify({kind:'coffee',title:'Coffee Room'})});toast('Coffee Room · free social')});
  document.querySelector('#funQuizNight')?.addEventListener('click',async()=>{const q=await api('/api/quizzes',{method:'POST',body:JSON.stringify({context:'community',title:'Quiz Night',open:true,timerSec:60,questions:[{type:'multiple_choice',prompt:'2+2?',options:['3','4'],answer:1}]})});await api('/api/social/fun-rooms',{method:'POST',body:JSON.stringify({kind:'quiz_night',title:'Quiz Night'})});toast(`Quiz Night · shared quiz engine · ${q.quiz.id.slice(0,8)}`)});
  document.querySelector('#communityWorkshop')?.addEventListener('click',async()=>{await api('/api/social/community-events',{method:'POST',body:JSON.stringify({kind:'workshop',title:'Community Workshop'})});toast('Workshop · LIVE+Event+Timer+Quiz primitives')});
  document.querySelector('#discoveryOptIn')?.addEventListener('click',async()=>{await api('/api/social/discovery',{method:'POST',body:JSON.stringify({optIn:true,languages:['uk','en'],interests:['science','music'],topics:['learning']})});const m=await api('/api/social/discovery/matches');toast(`Discovery opt-in · matches ${m.matches?.length||0} · no anonymous video chat`)});
  document.querySelectorAll('.join-community').forEach(b=>b.onclick=async()=>{try{await api(`/api/communities/${b.dataset.id}/join`,{method:'POST'});toast('Ви у спільноті');await openCommunity(b.dataset.id)}catch(e){toast(e.message)}});
  document.querySelectorAll('.open-community').forEach(b=>b.onclick=()=>openCommunity(b.dataset.id));
}

function localizeCommunitiesPage({communities=[],ach={}}={}){
  const hero=document.querySelector('.community-heading');if(hero){const title=hero.querySelector('h1'),intro=hero.querySelector('p'),action=hero.querySelector('.depth-button');if(title)title.textContent=t('communityHero');if(intro)intro.textContent=t('communityIntro');if(action)action.textContent=state.me?`＋ ${t('createCommunity')}`:t('signin')}
  document.querySelectorAll('.community-card').forEach((card,index)=>{const community=communities[index],meta=card.querySelector('div>span'),description=card.querySelector(':scope>p'),circle=card.querySelector('.member-stack small'),open=card.querySelector('.open-community'),join=card.querySelector('.join-community');if(meta)meta.textContent=`${community?.members||0} ${t('members')} · ${community?.visibility||'community'}`;if(description&&!community?.description)description.textContent=t('communityFallback');if(circle)circle.textContent=`${community?.members||0} ${t('inCircle')}`;if(open){open.textContent=`${t('openSpace')} `;open.insertAdjacentHTML('beforeend',referenceIcon('arrow'))}if(join){join.textContent='';join.insertAdjacentHTML('afterbegin',`${referenceIcon('users')} ${esc(t('joinCommunity'))}`)}});
  const empty=document.querySelector('.community-empty');if(empty){const title=empty.querySelector('h3'),copy=empty.querySelector('p');if(title)title.textContent=t('firstCircle');if(copy)copy.textContent=t('firstCircleIntro')}
  const create=document.querySelector('.community-create-card');if(create){const label=create.querySelector('.card-top small'),title=create.querySelector('.card-top h3'),status=create.querySelector('.status-pill'),name=create.querySelector('input[name="name"]'),about=create.querySelector('textarea[name="description"]'),button=create.querySelector('form button');if(label)label.textContent=t('newCommunity');if(title)title.textContent=t('openOwnSpace');if(status)status.textContent=t('safeByDesign');if(name)name.placeholder=t('communityName');if(about)about.placeholder=t('communityAbout');if(button)button.textContent=t('create')}
  const aside=[...document.querySelectorAll('.community-layout>.context-stack>.glass-card')];const formats=aside[0];if(formats){const label=formats.querySelector('.card-top small'),title=formats.querySelector('.card-top h3'),details=formats.querySelectorAll('.event-list-row small');if(label)label.textContent=t('liveFormats');if(title)title.textContent=t('createEvent');[t('freeConversation'),t('sharedQuizEngine'),t('eventTimerLive')].forEach((value,index)=>{if(details[index])details[index].textContent=value})}
  const join=aside[1];if(join){const title=join.querySelector('h3'),copy=join.querySelector('p'),button=join.querySelector('button');if(title)title.textContent=t(state.me?'findYourPeople':'yourCircleNearby');if(copy)copy.textContent=t(state.me?'discoveryIntro':'communityGuestIntro');if(button)button.textContent=t(state.me?'enableDiscovery':'signin')}
  const achievements=aside[2];if(achievements){const label=achievements.querySelector('.card-top small'),title=achievements.querySelector('.card-top h3'),empty=achievements.querySelector(':scope>.muted');if(label)label.textContent=t('myAchievements');if(title)title.textContent=t('noGlobalRanking');if(empty)empty.textContent=t('achievementsFromParticipation');if((ach.mine||[]).length)achievements.querySelectorAll('.achievement-row small').forEach((copy,index)=>{if(!ach.mine[index]?.description)copy.textContent=t('communityAchievement')})}
}

async function renderCommunitiesReference(){
  const [{communities},ach]=await Promise.all([api('/api/communities'),state.me?api('/api/achievements').catch(()=>({unlocked:[],mine:[]})):Promise.resolve({mine:[]})]);
  const cards=communities.map((community,index)=>`<article class="glass-card community-card"><span class="community-mark mark-${index%4+1}">${esc(community.name.slice(0,2).toUpperCase())}</span><div><h3>${esc(community.name)} ${community.visibility==='public'?referenceIcon('check'):''}</h3><span>${community.members} учасників · ${esc(community.visibility||'community')}</span></div><p>${esc(community.description||'Спільнота SYLORA')}</p><div class="member-stack"><span class="avatar convo-${index%5+1}">${esc(community.name.slice(0,1).toUpperCase())}</span><span class="avatar convo-${(index+1)%5+1}">✦</span><small>${community.members} у колі</small></div><button type="button" class="open-community" data-id="${community.id}">Відкрити простір ${referenceIcon('arrow')}</button>${state.me&&community.visibility==='public'?`<button type="button" class="join-community community-secondary" data-id="${community.id}">${referenceIcon('users')} Приєднатися</button>`:''}</article>`).join('');
  app.innerHTML=`<div class="community-layout">
    <main class="community-main">
      <section class="route-hero-row compact community-heading"><div><span class="status-pill status-pill--rose">${referenceIcon('users')} SYLORA COMMUNITIES</span><h1>Будуй коло своїх.</h1><p>Живі спільноти, безпечне відкриття, події й приватні канали — без глобального рейтингу та примусових подарунків.</p></div>${state.me?'<button type="button" class="depth-button" id="communityCreateFocus">＋ Створити спільноту</button>':'<button type="button" class="depth-button" id="communityLogin">Увійти</button>'}</section>
      <section class="community-grid">${cards||'<div class="glass-card community-empty"><span class="community-mark mark-1">SY</span><div><h3>Перше коло чекає</h3><p>Створіть спільноту з реальними каналами та приватністю.</p></div></div>'}</section>
      ${state.me?`<section class="glass-card community-create-card" id="communityCreate"><div class="card-top"><div><small>НОВА СПІЛЬНОТА</small><h3>Відкрийте власний простір.</h3></div><span class="status-pill status-pill--success">SAFE BY DESIGN</span></div><form id="communityForm" class="fields"><input name="name" placeholder="Назва спільноти" required minlength="3"><textarea name="description" placeholder="Про що вона?"></textarea><button class="depth-button">Створити</button></form></section>`:''}
    </main>
    <aside class="context-stack">
      <section class="glass-card"><div class="card-top"><div><small>ЖИВІ ФОРМАТИ</small><h3>Створити подію</h3></div></div><button type="button" class="event-list-row" id="funCoffee"><span>COFFEE</span><span><b>Coffee Room</b><small>вільна розмова</small></span>${referenceIcon('chevron')}</button><button type="button" class="event-list-row" id="funQuizNight"><span>QUIZ</span><span><b>Quiz Night</b><small>спільний quiz engine</small></span>${referenceIcon('chevron')}</button><button type="button" class="event-list-row" id="communityWorkshop"><span>LIVE</span><span><b>Workshop</b><small>подія + таймер + LIVE</small></span>${referenceIcon('chevron')}</button></section>
      ${state.me?`<section class="glass-card join-card">${referenceIcon('sparkles')}<h3>Знайди своїх.</h3><p>Безпечний opt-in підбір за мовами й інтересами. Жодного анонімного відеочату.</p><button type="button" id="discoveryOptIn">Увімкнути discovery</button></section>`:'<section class="glass-card join-card">'+referenceIcon('users')+'<h3>Ваше коло поруч.</h3><p>Увійдіть, щоб створювати простори, приєднуватися й писати у приватних каналах.</p><button type="button" id="communityLoginAside">Увійти</button></section>'}
      <section class="glass-card"><div class="card-top"><div><small>МОЇ ДОСЯГНЕННЯ</small><h3>Без глобального рейтингу</h3></div></div>${(ach.mine||[]).slice(0,5).map(item=>`<div class="achievement-row"><span>✦</span><div><b>${esc(item.title)}</b><small>${esc(item.description||'Досягнення спільноти')}</small></div></div>`).join('')||'<p class="muted">Досягнення з’являться від реальної участі.</p>'}</section>
    </aside>
  </div>`;
  localizeCommunitiesPage({communities,ach});
  document.querySelector('#communityLogin')?.addEventListener('click',renderAuth);document.querySelector('#communityLoginAside')?.addEventListener('click',renderAuth);
  document.querySelector('#communityCreateFocus')?.addEventListener('click',()=>document.querySelector('#communityCreate')?.scrollIntoView({behavior:'smooth',block:'center'}));
  document.querySelector('#communityForm')?.addEventListener('submit',async event=>{event.preventDefault();await api('/api/communities',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});await renderCommunitiesReference()});
  document.querySelector('#funCoffee')?.addEventListener('click',async()=>{if(!state.me)return renderAuth();await api('/api/social/fun-rooms',{method:'POST',body:JSON.stringify({kind:'coffee',title:'Coffee Room'})});toast(t('coffeeCreated'))});
  document.querySelector('#funQuizNight')?.addEventListener('click',async()=>{if(!state.me)return renderAuth();const quiz=await api('/api/quizzes',{method:'POST',body:JSON.stringify({context:'community',title:'Quiz Night',open:true,timerSec:60,questions:[{type:'multiple_choice',prompt:'2+2?',options:['3','4'],answer:1}]})});await api('/api/social/fun-rooms',{method:'POST',body:JSON.stringify({kind:'quiz_night',title:'Quiz Night'})});toast(`Quiz Night · ${quiz.quiz.id.slice(0,8)}`)});
  document.querySelector('#communityWorkshop')?.addEventListener('click',async()=>{if(!state.me)return renderAuth();await api('/api/social/community-events',{method:'POST',body:JSON.stringify({kind:'workshop',title:'Community Workshop'})});toast(t('workshopCreated'))});
  document.querySelector('#discoveryOptIn')?.addEventListener('click',async()=>{await api('/api/social/discovery',{method:'POST',body:JSON.stringify({optIn:true,languages:['uk','en'],interests:['science','music'],topics:['learning']})});const result=await api('/api/social/discovery/matches');toast(`${t('discoveryEnabled')} · ${t('matches')} ${result.matches?.length||0}`)});
  document.querySelectorAll('.join-community').forEach(button=>button.onclick=async()=>{try{await api(`/api/communities/${button.dataset.id}/join`,{method:'POST'});toast(t('joinedCommunity'));await openCommunity(button.dataset.id)}catch(error){toast(humanError(error.message))}});
  document.querySelectorAll('.open-community').forEach(button=>button.onclick=()=>openCommunity(button.dataset.id));
}

async function openCommunity(id){
  try{
    const {community,membership,channels}=await api(`/api/communities/${id}`);
    const canManage=state.me&&(state.me.role==='admin'||community.ownerId===state.me.id||membership?.role==='owner');
    app.innerHTML=`<button id="backCommunities" class="ghost">← ${esc(t('backToCommunities'))}</button><div class="card hero"><span class="eyebrow">${esc(t('communityLabel'))}</span><h1>${esc(community.name)}</h1><p class="muted">${esc(community.description)} · ${community.members} ${esc(t('members'))}</p></div>${canManage?`<form id="channelForm" class="card auth fields"><input name="name" placeholder="${esc(t('newChannel'))}" required minlength="2"><button class="primary">${esc(t('addChannel'))}</button></form>`:''}<div class="card"><h3>${esc(t('channels'))}</h3><div class="row wrap">${channels.map(c=>`<button class="ghost community-channel" data-id="${esc(c.id)}"># ${esc(c.name)}</button>`).join('')}</div></div><div id="communityChannel"></div>`;
    document.querySelector('#backCommunities').onclick=renderCommunitiesReference;
    document.querySelector('#channelForm')?.addEventListener('submit',async e=>{e.preventDefault();await api(`/api/communities/${id}/channels`,{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});await openCommunity(id)});
    document.querySelectorAll('.community-channel').forEach(b=>b.onclick=()=>openCommunityChannel(b.dataset.id,id,membership,community));
    if(channels[0])await openCommunityChannel(channels[0].id,id,membership,community);
  }catch(e){toast(humanError(e.message));renderCommunitiesReference()}
}

async function openCommunityChannel(channelId,communityId,membership,community){
  const {posts}=await api(`/api/community-channels/${channelId}/posts`);
  const target=document.querySelector('#communityChannel');if(!target)return;
  const canPost=state.me&&(membership||community.ownerId===state.me.id||state.me.role==='admin');
  target.innerHTML=`<div class="card"><div class="stack">${posts.map(p=>`<article class="item"><strong>@${esc(p.author?.username||'user')}</strong><p>${esc(p.text)}</p></article>`).join('')||`<p class="muted">${esc(t('quietChannel'))}</p>`}</div>${canPost?`<form id="communityPostForm" class="fields"><textarea name="text" placeholder="${esc(t('writeChannel'))}" required maxlength="4000"></textarea><button class="primary">${esc(t('publish'))}</button></form>`:`<p class="muted">${esc(t('joinToWrite'))}</p>`}</div>`;
  document.querySelector('#communityPostForm')?.addEventListener('submit',async e=>{e.preventDefault();await api(`/api/community-channels/${channelId}/posts`,{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});await openCommunityChannel(channelId,communityId,membership,community)});
}

function conferenceHubHtml(kind,rooms){const science=kind==='science';return`<section class="conference-hub"><div class="conference-head"><div><span class="eyebrow">${science?'SYLORA SCIENCE CIRCLES':'SYLORA BUSINESS ROOMS'}</span><h2>${science?'Закриті наукові конференції':'Приватні бізнес-конференції'}</h2><p>${science?'Студенти, викладачі й дослідники — тільки за запрошенням.':'Партнери й команди працюють у закритому колі.'}</p></div><span class="conference-seal">${science?'⌬':'◈'}</span></div><form class="conference-create fields" data-conference-create="${kind}"><div class="inline-fields"><input name="title" required minlength="2" maxlength="120" placeholder="Назва конференції"><input name="description" maxlength="800" placeholder="Коротка мета"></div><button class="primary">＋ Створити закриту кімнату</button></form><div class="conference-grid">${rooms.map(r=>`<article class="conference-room"><div class="conference-room-top"><span class="conference-room-icon">${science?'⌬':'◈'}</span><span class="badge">🔒 PRIVATE · ${r.memberCount}</span></div><h3>${esc(r.title)}</h3><p>${esc(r.description||'Приватна конференція SYLORA')}</p>${r.inviteId&&!r.role?`<button class="primary conference-accept" data-invite="${r.inviteId}">Прийняти запрошення</button>`:`<div class="conference-actions"><button class="ghost conference-open" data-room="${r.id}" data-kind="${kind}">Увійти</button>${r.role==='owner'?`<button class="ghost conference-sylora" data-room="${r.id}" data-enabled="${r.syloraEnabled?'1':'0'}">✦ Sylora ${r.syloraEnabled?'увімкнена':'вимкнена'}</button>`:''}</div>${r.role==='owner'?`<form class="conference-invite" data-room="${r.id}"><input name="username" placeholder="@username" required><button class="ghost">Запросити</button></form>`:''}`}</article>`).join('')||'<div class="conference-empty">Тут з’являться твої приватні кімнати.</div>'}</div></section>`}
function bindConferenceHub(kind,refresh){document.querySelector(`[data-conference-create="${kind}"]`)?.addEventListener('submit',async e=>{e.preventDefault();const input=Object.fromEntries(new FormData(e.currentTarget));try{await api('/api/conferences',{method:'POST',body:JSON.stringify({...input,kind})});toast('Закриту конференцію створено');refresh()}catch(error){toast(error.message)}});document.querySelectorAll('.conference-invite').forEach(f=>f.addEventListener('submit',async e=>{e.preventDefault();try{await api(`/api/conferences/${f.dataset.room}/invite`,{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(f)))});f.reset();toast('Запрошення надіслано')}catch(error){toast(error.message)}}));document.querySelectorAll('.conference-accept').forEach(b=>b.onclick=async()=>{try{await api(`/api/conference-invites/${b.dataset.invite}/accept`,{method:'POST',body:'{}'});toast('Ти в закритій групі');refresh()}catch(error){toast(error.message)}});document.querySelectorAll('.conference-sylora').forEach(b=>b.onclick=async()=>{try{const enabled=b.dataset.enabled!=='1';await api(`/api/conferences/${b.dataset.room}/sylora`,{method:'PATCH',body:JSON.stringify({enabled})});toast(enabled?'Sylora приєднана до кімнати':'Sylora вимкнена');refresh()}catch(error){toast(error.message)}});document.querySelectorAll('.conference-open').forEach(b=>b.onclick=()=>openConferenceRoomRtc(b.dataset.room,kind,refresh))}
async function openConferenceRoom(roomId,kind,back){const [{participants},{rooms}]=await Promise.all([api(`/api/conferences/${roomId}/participants`),api(`/api/conferences?kind=${kind}`)]),room=rooms.find(r=>r.id===roomId),current=participants.find(p=>p.id===state.me.id);app.innerHTML=`<button id="conferenceBack" class="ghost">← Назад</button><section class="conference-stage"><div class="conference-stage-bar"><div><span class="eyebrow">🔒 PRIVATE · SYLORA ${kind==='science'?'SCIENCE':'BUSINESS'}</span><h2>${esc(room?.title||'Conference Room')}</h2></div><span class="badge">${participants.length} учасн.</span></div><div class="conference-tiles">${participants.map(p=>`<article class="conference-tile ${p.id===state.me.id?'is-me':''}" data-participant="${p.id}">${p.id===state.me.id?'<video id="conferenceLocalVideo" autoplay muted playsinline hidden></video>':''}<div class="conference-avatar">${esc((p.displayName||p.username||'S').slice(0,1).toUpperCase())}</div><div class="conference-person"><b>${esc(p.displayName||p.username)}</b><small>@${esc(p.username)} · ${p.role}</small></div></article>`).join('')}</div><div class="conference-controls"><button id="conferenceCamera" class="control-orb">▣<span>Камера</span></button><button id="conferenceMic" class="control-orb">◉<span>Мікрофон</span></button><button id="conferenceSyloraAsk" class="control-orb sylora-control ${room?.syloraEnabled?'on':''}">✦<span>Sylora</span></button><button id="conferenceLeave" class="control-orb leave-control">×<span>Вийти</span></button></div><p class="conference-note">Закрита кімната · доступ мають лише запрошені учасники. ${room?.syloraEnabled?'Sylora дозволена власником.':'Sylora зараз вимкнена.'} ${current?.role==='owner'?'Ти керуєш цією конференцією.':''}</p></section>`;let localStream=null;const leave=()=>{localStream?.getTracks().forEach(t=>t.stop());back()};document.querySelector('#conferenceBack').onclick=leave;document.querySelector('#conferenceLeave').onclick=leave;document.querySelector('#conferenceCamera').onclick=async e=>{try{if(localStream){localStream.getVideoTracks().forEach(t=>t.enabled=!t.enabled);e.currentTarget.classList.toggle('on',localStream.getVideoTracks()[0]?.enabled);return}localStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});const video=document.querySelector('#conferenceLocalVideo');video.srcObject=localStream;video.hidden=false;document.querySelector(`[data-participant="${state.me.id}"] .conference-avatar`)?.remove();e.currentTarget.classList.add('on');document.querySelector('#conferenceMic').classList.add('on')}catch{toast('Потрібен доступ до камери й мікрофона')}};document.querySelector('#conferenceMic').onclick=e=>{if(!localStream)return toast('Спочатку увімкни камеру/мікрофон');const track=localStream.getAudioTracks()[0];if(track){track.enabled=!track.enabled;e.currentTarget.classList.toggle('on',track.enabled)}};document.querySelector('#conferenceSyloraAsk').onclick=()=>{if(!room?.syloraEnabled)return toast('Власник кімнати ще не увімкнув Sylora');localStream?.getTracks().forEach(t=>t.stop());nav('ai')}}

async function openConferenceRoomRtc(roomId,kind,back){
  if(conferenceSessionCleanup){conferenceSessionCleanup();conferenceSessionCleanup=null}
  const [{participants},{rooms},rtc]=await Promise.all([api(`/api/conferences/${roomId}/participants`),api(`/api/conferences?kind=${kind}`),liveRtcConfig()]),room=rooms.find(r=>r.id===roomId),peerId=crypto.randomUUID(),peers=new Map(),controller=new AbortController();
  let localStream=null,closed=false;
  const tileFor=userId=>document.querySelector(`[data-participant="${userId}"]`);
  app.innerHTML=`<button id="conferenceBack" class="ghost">← Назад</button><section class="conference-stage"><div class="conference-stage-bar"><div><span class="eyebrow">🔒 PRIVATE · SYLORA ${kind==='science'?'SCIENCE':'BUSINESS'}</span><h2>${esc(room?.title||'Conference Room')}</h2></div><div class="conference-live-state"><i></i><span id="conferenceNetwork">ПІДКЛЮЧЕННЯ</span><b>${participants.length} учасн.</b></div></div><div class="conference-tiles">${participants.map(p=>`<article class="conference-tile ${p.id===state.me.id?'is-me':''}" data-participant="${p.id}">${p.id===state.me.id?'<video id="conferenceLocalVideo" autoplay muted playsinline hidden></video>':''}<div class="conference-avatar">${esc((p.displayName||p.username||'S').slice(0,1).toUpperCase())}</div><div class="conference-person"><b>${esc(p.displayName||p.username)}</b><small>@${esc(p.username)} · ${p.role}</small><em class="conference-peer-state">${p.id===state.me.id?'ТИ':'очікуємо'}</em></div></article>`).join('')}</div><aside id="conferenceSyloraPanel" class="conference-sylora-panel" hidden><div><span>✦</span><p><b>Sylora</b><small>${kind==='science'?'Science copilot':'Business copilot'} · тільки за запитом</small></p></div><div id="conferenceSyloraMessages" class="conference-sylora-messages"><p>Я приєднаюся лише коли ви мене запитаєте.</p></div><form id="conferenceSyloraForm"><input name="text" maxlength="4000" placeholder="Запитати Sylora…" required><button class="primary">↑</button></form></aside><div class="conference-controls"><button id="conferenceCamera" class="control-orb">▣<span>Камера</span></button><button id="conferenceMic" class="control-orb">◉<span>Мікрофон</span></button><button id="conferenceSyloraAsk" class="control-orb sylora-control ${room?.syloraEnabled?'on':''}">✦<span>Sylora</span></button><button id="conferenceLeave" class="control-orb leave-control">×<span>Вийти</span></button></div><p class="conference-note">Зашифрований WebRTC media transport · тільки запрошені учасники. ${rtc.turnConfigured?'TURN fallback готовий.':'TURN ще не налаштований — частина NAT/мобільних мереж може не з’єднатися.'} ${room?.syloraEnabled?'Sylora дозволена власником.':'Sylora вимкнена власником.'}</p></section>`;
  const sendSignal=(kind,toPeerId,data)=>api(`/api/conferences/${roomId}/signal`,{method:'POST',body:JSON.stringify({kind,fromPeerId:peerId,toPeerId,data})});
  const ensureRemoteVideo=(userId,stream)=>{const tile=tileFor(userId);if(!tile)return;let video=tile.querySelector('video');if(!video){video=document.createElement('video');video.autoplay=true;video.playsInline=true;tile.prepend(video)}video.srcObject=stream;video.hidden=false;tile.querySelector('.conference-avatar')?.remove();const status=tile.querySelector('.conference-peer-state');if(status)status.textContent='В ЕФІРІ'};
  const ensurePeer=async(remotePeerId,remoteUserId)=>{if(peers.has(remotePeerId))return peers.get(remotePeerId);const peerRtc=await liveRtcConfig(),pc=new RTCPeerConnection({iceServers:peerRtc.iceServers||[]}),entry={pc,userId:remoteUserId,pending:[],stream:new MediaStream(),video:pc.addTransceiver('video',{direction:'sendrecv'}),audio:pc.addTransceiver('audio',{direction:'sendrecv'})};peers.set(remotePeerId,entry);if(localStream){await entry.video.sender.replaceTrack(localStream.getVideoTracks()[0]||null);await entry.audio.sender.replaceTrack(localStream.getAudioTracks()[0]||null)}pc.ontrack=e=>{entry.stream.addTrack(e.track);ensureRemoteVideo(remoteUserId,entry.stream)};pc.onicecandidate=e=>{if(e.candidate)sendSignal('ice',remotePeerId,e.candidate.toJSON()).catch(()=>{})};pc.onconnectionstatechange=()=>{const tile=tileFor(remoteUserId),status=tile?.querySelector('.conference-peer-state');if(status)status.textContent=pc.connectionState==='connected'?'В ЕФІРІ':pc.connectionState.toUpperCase();if(['failed','closed'].includes(pc.connectionState)){pc.close();peers.delete(remotePeerId)}};return entry};
  const makeOffer=async(remotePeerId,remoteUserId)=>{const entry=await ensurePeer(remotePeerId,remoteUserId);await refreshRtcPeerConfiguration(entry.pc);const offer=await entry.pc.createOffer();await entry.pc.setLocalDescription(offer);await sendSignal('offer',remotePeerId,entry.pc.localDescription)};
  const onSignal=async s=>{if(closed||s.fromPeerId===peerId)return;if(s.kind==='peer-left'){const entry=peers.get(s.fromPeerId);entry?.pc.close();peers.delete(s.fromPeerId);const status=tileFor(s.userId)?.querySelector('.conference-peer-state');if(status)status.textContent='ВИЙШОВ';return}if(s.kind==='peer-join'){await makeOffer(s.fromPeerId,s.userId);return}if(s.toPeerId!==peerId)return;const entry=await ensurePeer(s.fromPeerId,s.userId);if(s.kind==='offer'){await refreshRtcPeerConfiguration(entry.pc);await entry.pc.setRemoteDescription(s.data);const answer=await entry.pc.createAnswer();await entry.pc.setLocalDescription(answer);await sendSignal('answer',s.fromPeerId,entry.pc.localDescription);for(const ice of entry.pending.splice(0))try{await entry.pc.addIceCandidate(ice)}catch{}}else if(s.kind==='answer'){await entry.pc.setRemoteDescription(s.data);for(const ice of entry.pending.splice(0))try{await entry.pc.addIceCandidate(ice)}catch{}}else if(s.kind==='ice'){if(entry.pc.remoteDescription)try{await entry.pc.addIceCandidate(s.data)}catch{}else entry.pending.push(s.data)}};
  const appendSylora=event=>{const box=document.querySelector('#conferenceSyloraMessages');if(!box)return;box.insertAdjacentHTML('beforeend',`<article><small>@${esc(event.askedBy?.username||'учасник')}</small><p>${esc(event.question||'')}</p><b>✦ Sylora</b><p>${esc(event.text||'')}</p></article>`);box.scrollTop=box.scrollHeight};
  const consumeEvents=async()=>{const response=await fetch(`/api/conferences/${roomId}/events`,{headers:{authorization:`Bearer ${state.token}`},signal:controller.signal});if(!response.ok)throw new Error('CONFERENCE_EVENT_STREAM_FAILED');const network=document.querySelector('#conferenceNetwork');if(network)network.textContent='ЗАХИЩЕНО · WEBRTC';const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';sendSignal('peer-join',null,{media:'webrtc'}).catch(()=>{});while(!closed){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let boundary;while((boundary=buffer.indexOf('\n\n'))>=0){const raw=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);let event='',data='';for(const line of raw.split('\n')){if(line.startsWith('event:'))event=line.slice(6).trim();else if(line.startsWith('data:'))data+=line.slice(5).trim()}if(event==='signal'&&data)try{await onSignal(JSON.parse(data))}catch{}else if(event==='sylora'&&data)try{appendSylora(JSON.parse(data))}catch{}}}};
  const cleanup=()=>{if(closed)return;closed=true;sendSignal('peer-left',null,null).catch(()=>{});controller.abort();for(const {pc} of peers.values())pc.close();peers.clear();localStream?.getTracks().forEach(t=>t.stop());localStream=null};conferenceSessionCleanup=cleanup;
  const leave=()=>{cleanup();conferenceSessionCleanup=null;back()};document.querySelector('#conferenceBack').onclick=leave;document.querySelector('#conferenceLeave').onclick=leave;
  const acquireMedia=async({video=false,audio=false}={})=>{const needVideo=video&&!localStream?.getVideoTracks().length,needAudio=audio&&!localStream?.getAudioTracks().length;if(needVideo||needAudio){const fresh=await navigator.mediaDevices.getUserMedia({video:needVideo,audio:needAudio});if(!localStream)localStream=new MediaStream();for(const track of fresh.getTracks())localStream.addTrack(track)}const videoTrack=localStream?.getVideoTracks()[0]||null,audioTrack=localStream?.getAudioTracks()[0]||null;for(const entry of peers.values()){await entry.video.sender.replaceTrack(videoTrack);await entry.audio.sender.replaceTrack(audioTrack)}return{videoTrack,audioTrack}};
  document.querySelector('#conferenceCamera').onclick=async()=>{try{const hadVideo=!!localStream?.getVideoTracks().length,{videoTrack,audioTrack}=await acquireMedia({video:true,audio:true});if(!hadVideo&&videoTrack){const video=document.querySelector('#conferenceLocalVideo');video.srcObject=localStream;video.hidden=false;tileFor(state.me.id)?.querySelector('.conference-avatar')?.remove();document.querySelector('#conferenceCamera').classList.add('on');document.querySelector('#conferenceMic').classList.toggle('on',!!audioTrack?.enabled)}else if(videoTrack){videoTrack.enabled=!videoTrack.enabled;document.querySelector('#conferenceCamera').classList.toggle('on',videoTrack.enabled)}}catch{toast('Потрібен доступ до камери й мікрофона')}};
  document.querySelector('#conferenceMic').onclick=async()=>{try{const hadAudio=!!localStream?.getAudioTracks().length,{audioTrack}=await acquireMedia({audio:true});if(audioTrack){if(hadAudio)audioTrack.enabled=!audioTrack.enabled;document.querySelector('#conferenceMic').classList.toggle('on',audioTrack.enabled)}}catch{toast('Потрібен доступ до мікрофона')}};
  document.querySelector('#conferenceSyloraAsk').onclick=()=>{if(!room?.syloraEnabled)return toast('Власник кімнати ще не увімкнув Sylora');const panel=document.querySelector('#conferenceSyloraPanel');panel.hidden=!panel.hidden;if(!panel.hidden)panel.querySelector('input')?.focus()};
  document.querySelector('#conferenceSyloraForm').onsubmit=async e=>{e.preventDefault();const input=e.currentTarget.elements.text,text=input.value.trim();if(!text)return;input.value='';input.disabled=true;try{await api(`/api/conferences/${roomId}/ai`,{method:'POST',body:JSON.stringify({text})})}catch(error){toast(error.message)}finally{input.disabled=false;input.focus()}};
  consumeEvents().catch(error=>{if(error.name!=='AbortError'){const network=document.querySelector('#conferenceNetwork');if(network)network.textContent='ПОМИЛКА З’ЄДНАННЯ';toast('Не вдалося підключити конференцію')}});
}

async function renderLearning(){
  const [{courses},conferenceData,users,learnHub,sciHub]=await Promise.all([
    api('/api/courses'),
    state.me?api('/api/conferences?kind=science'):Promise.resolve({rooms:[]}),
    api('/api/users').catch(()=>({users:[]})),
    api('/api/learning/hub').catch(()=>({sections:[]})),
    api('/api/science/hub').catch(()=>({sections:[]}))
  ]);
  const researchers=(users.users||[]).slice(0,6);
  app.innerHTML=`<div class="card hero"><span class="eyebrow">SYLORA SCIENCE · RESEARCH</span><h1>${esc(t('science'))}</h1><p>Researchers · Circles · courses · collaboration · AI research workspace</p><div class="scene-readout"><span><small>COURSES</small><b>${courses.length}</b></span><span><small>CIRCLES</small><b>${conferenceData.rooms.length}</b></span><span><small>PEOPLE</small><b>${researchers.length}</b></span></div></div>
  ${state.me?`<section class="card"><span class="eyebrow">LEARNING HUB</span><p class="muted">${(learnHub.sections||[]).slice(0,8).join(' · ')}</p>
  <div class="row"><button type="button" class="primary" id="startTutor">Sylora Tutor</button><button type="button" class="ghost" id="makeDeck">Flashcards</button><button type="button" class="ghost" id="examPlan">Exam plan</button><button type="button" class="ghost" id="focusStudy">Focus 25/5</button></div>
  <p class="muted" style="margin-top:8px">Science: ${(sciHub.sections||[]).slice(0,6).join(' · ')}</p>
  <div class="row"><button type="button" class="ghost" id="addPaper">Library item</button><button type="button" class="ghost" id="newDataset">Dataset</button><button type="button" class="ghost" id="newBoard">Whiteboard</button></div>
  <div class="row" style="margin-top:8px"><button type="button" class="ghost" id="newExperiment">Experiment log</button><button type="button" class="ghost" id="runCalc">Physics KE calc</button><button type="button" class="ghost" id="runStats">Stats assist</button><button type="button" class="ghost" id="newCircle">Science Circle</button><button type="button" class="ghost" id="newFormula">Formula</button></div></section>`:''}
  <div class="science-research-grid">
    <section class="card"><span class="eyebrow">RESEARCHERS</span><div class="stack">${researchers.map(u=>`<div class="item"><b>${esc(u.displayName||u.username)}</b><p class="muted">@${esc(u.username)}</p></div>`).join('')||'<p class="muted">—</p>'}</div></section>
    <section class="card"><span class="eyebrow">RESOURCES</span><p class="muted">Papers / resources attach to courses & circles. Shared communications for private research rooms.</p><button class="ghost" data-go-ai>Sylora Research</button></section>
  </div>
  ${state.me?conferenceHubHtml('science',conferenceData.rooms):''}
  ${state.me?'<form id="courseForm" class="card auth fields"><input name="title" placeholder="Course" required><textarea name="description" placeholder="…"></textarea><input name="price" type="number" min="0" value="0"><button class="primary">'+esc(t('createCourse'))+'</button></form>':''}
  ${courses.map(c=>`<div class="card item"><span class="badge">${c.price?`◈ ${c.price}`:'FREE'}</span><h3>${esc(c.title)}</h3><p class="muted">${esc(c.description)} · ${c.lessonCount} lessons</p><button class="ghost open-course" data-id="${c.id}">Open</button></div>`).join('')||'<div class="card empty">—</div>'}`;
  if(state.me)bindConferenceHub('science',renderLearning);
  document.querySelector('[data-go-ai]')?.addEventListener('click',()=>{state.intent=null;nav('ai')});
  document.querySelector('#startTutor')?.addEventListener('click',async()=>{const out=await api('/api/learning/tutor',{method:'POST',body:JSON.stringify({subject:'General',mode:'teach_me'})});toast(`Tutor · ${out.session.mode} · no silent graded answers`)});
  document.querySelector('#makeDeck')?.addEventListener('click',async()=>{await api('/api/learning/flashcards',{method:'POST',body:JSON.stringify({title:'Quick deck',cards:[{front:'Concept',back:'Definition'}],aiAssisted:false})});toast('Flashcard deck created')});
  document.querySelector('#examPlan')?.addEventListener('click',async()=>{const d=new Date(Date.now()+7*864e5).toISOString().slice(0,10);await api('/api/learning/exam-plan',{method:'POST',body:JSON.stringify({subject:'Exam',examDate:d,availableMinutesPerDay:45})});toast('Exam plan ready')});
  document.querySelector('#focusStudy')?.addEventListener('click',async()=>{await api('/api/focus',{method:'POST',body:JSON.stringify({preset:'25_5'})});toast('Focus 25/5 · server timer')});
  document.querySelector('#addPaper')?.addEventListener('click',async()=>{await api('/api/science/library',{method:'POST',body:JSON.stringify({type:'paper',title:'Untitled paper'})});toast('Library item added')});
  document.querySelector('#newDataset')?.addEventListener('click',async()=>{await api('/api/science/datasets',{method:'POST',body:JSON.stringify({name:'Dataset',columns:[{name:'x',type:'number'}],previewRows:[]})});toast('Dataset workspace')});
  document.querySelector('#newBoard')?.addEventListener('click',async()=>{await api('/api/whiteboard',{method:'POST',body:JSON.stringify({space:'learning',title:'Study board'})});toast('Whiteboard created')});
  document.querySelector('#newExperiment')?.addEventListener('click',async()=>{const {experiment}=await api('/api/science/experiments',{method:'POST',body:JSON.stringify({title:'Trial',procedure:'Step 1',parameters:{T:25},observations:'',results:''})});toast(`Experiment v${experiment.currentVersion} · append-only history`)});
  document.querySelector('#runCalc')?.addEventListener('click',async()=>{const {result}=await api('/api/science/calculators/run',{method:'POST',body:JSON.stringify({moduleId:'physics',op:'kinetic_energy',inputs:{mass:2,velocity:3}})});toast(`KE=${result.value} ${result.unit} · ${result.assumptions[0]}`)});
  document.querySelector('#runStats')?.addEventListener('click',async()=>{const {analysis}=await api('/api/science/statistics',{method:'POST',body:JSON.stringify({data:[2,4,4,4,5,5,7,9]})});toast(analysis.explanation.slice(0,140))});
  document.querySelector('#newCircle')?.addEventListener('click',async()=>{await api('/api/science/circles',{method:'POST',body:JSON.stringify({title:'Paper discussion'})});toast('Science Circle · moderation + source linking')});
  document.querySelector('#newFormula')?.addEventListener('click',async()=>{await api('/api/science/formulas',{method:'POST',body:JSON.stringify({title:'Energy',latex:'E=mc^2',units:['J']})});toast('Formula workspace')});
  document.querySelector('#courseForm')?.addEventListener('submit',async e=>{e.preventDefault();const {course}=await api('/api/courses',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});await api(`/api/courses/${course.id}/lessons`,{method:'POST',body:JSON.stringify({title:'Intro',content:'Lesson 1'})});await api(`/api/courses/${course.id}/publish`,{method:'POST'});renderLearning()});
  document.querySelectorAll('.open-course').forEach(b=>b.onclick=()=>openCourse(b.dataset.id));
  if(state.intent==='course'){state.intent=null;document.querySelector('#courseForm input[name="title"]')?.focus()}
}

function localizeLearningPage({courses=[],researchers=[]}={}){
  const hero=document.querySelector('.learning-hero');if(hero){const title=hero.querySelector('h1'),intro=hero.querySelector('p'),progress=hero.querySelector('.course-progress span');if(title)title.textContent=t('learningHero');if(intro)intro.textContent=t('learningIntro');if(progress){const count=progress.querySelector('b'),copy=progress.querySelector('small');if(count)count.textContent=`${courses.length} ${t('coursesAvailable')}`;if(copy)copy.textContent=t('availableNow')}}
  const heading=document.querySelector('.learning-heading');if(heading){const title=heading.querySelector('h1'),intro=heading.querySelector('p'),button=heading.querySelector('.depth-button');if(title)title.textContent=t('learningAlive');if(intro)intro.textContent=t('learningHonesty');if(button)button.textContent=state.me?`✦ ${t('launchTutor')}`:t('signin')}
  document.querySelectorAll('.course-card').forEach((card,index)=>{const course=courses[index],badge=card.querySelector('.status-pill'),copy=card.querySelector('p'),button=card.querySelector('.open-course');if(badge&&!course?.price)badge.textContent=t('free');if(copy)copy.textContent=`${course?.description||t('courseFallback')} · ${course?.lessonCount||0} ${t('lessons')}`;if(button){button.textContent=`${t('openCourse')} `;button.insertAdjacentHTML('beforeend',referenceIcon('arrow'))}});
  const catalog=document.querySelector('.learning-main>section:not(.learning-heading) .section-title');if(catalog){const label=catalog.querySelector('small'),title=catalog.querySelector('h2');if(label)label.textContent=t('catalog');if(title)title.textContent=t('continueLearning')}const empty=document.querySelector('.course-grid>.empty');if(empty)empty.textContent=t('noPublishedCourses');
  const study=document.querySelector('.study-live');if(study){const status=study.querySelector('.status-pill'),title=study.querySelector('h3'),button=study.querySelector('button');if(status)status.textContent=t('focusMode');if(title)title.textContent=t('studySpace');if(button)button.textContent=t('startFocus')}
  const tools=document.querySelectorAll('.learning-tool-card');if(tools[0]){const label=tools[0].querySelector('small'),title=tools[0].querySelector('h3'),copy=tools[0].querySelector('p');if(label)label.textContent=t('aiSupport');if(title)title.textContent=t('preparation');if(copy)copy.textContent=t('flashcardsPlan')}if(tools[1]){const label=tools[1].querySelector('small'),title=tools[1].querySelector('h3');if(label)label.textContent=t('scienceWorkspace');if(title)title.textContent=t('researchLabel')}
  const people=document.querySelector('.researchers-card');if(people){const label=people.querySelector('.card-top small'),title=people.querySelector('.card-top h3'),empty=people.querySelector('.researcher-row>.muted');if(label)label.textContent=t('researchers');if(title)title.textContent=t('peopleNearby');if(empty)empty.textContent=t('noResearchers')}
  const create=document.querySelector('.course-create');if(create){const label=create.querySelector('.card-top small'),title=create.querySelector('.card-top h3'),name=create.querySelector('input[name="title"]'),description=create.querySelector('textarea[name="description"]');if(label)label.textContent=t('creatorLearning');if(title)title.textContent=t('newCourse');if(name)name.placeholder=t('courseName');if(description)description.placeholder=t('description')}
}

async function renderLearningReference(){
  const [{courses},conferenceData,users,learnHub,sciHub]=await Promise.all([
    api('/api/courses'),state.me?api('/api/conferences?kind=science'):Promise.resolve({rooms:[]}),api('/api/users').catch(()=>({users:[]})),api('/api/learning/hub').catch(()=>({sections:[]})),api('/api/science/hub').catch(()=>({sections:[]}))
  ]);
  const researchers=(users.users||[]).slice(0,6),courseCards=courses.map((course,index)=>`<article class="glass-card course-card"><span class="nav-icon-plate">${referenceIcon(index%2?'sparkles':'learning')}</span><span class="status-pill ${course.price?'status-pill--gold':'status-pill--success'}">${course.price?`◈ ${course.price}`:'FREE'}</span><h3>${esc(course.title)}</h3><p>${esc(course.description||'Курс SYLORA')} · ${course.lessonCount} уроків</p><div class="progress-track"><i style="width:${course.lessonCount?'100':'4'}%"></i></div><button class="open-course" type="button" data-id="${course.id}">Відкрити курс ${referenceIcon('arrow')}</button></article>`).join('');
  app.innerHTML=`<div class="learning-layout">
    <aside class="learning-hero"><span class="learning-orbit" aria-hidden="true">${referenceIcon('learning')}</span><div><span class="status-pill status-pill--success">${referenceIcon('learning')} SYLORA LEARNING</span><h1>Рости у власному ритмі.</h1><p>Курси, Tutor, science circles, research workspace і Focus — в одному безпечному потоці.</p><div class="course-progress"><span><b>${courses.length} курсів</b><small>доступно зараз</small></span><div><i style="width:${courses.length?'100':'5'}%"></i></div><b>${conferenceData.rooms.length}</b></div></div></aside>
    <main class="learning-main content-stack">
      <section class="route-hero-row compact learning-heading"><div><span class="status-pill status-pill--violet">SCIENCE · RESEARCH</span><h1>Навчання, що оживає.</h1><p>AI допомагає пояснювати й планувати, але не приховує оцінювання й не підміняє вашу роботу.</p></div>${state.me?'<button type="button" class="depth-button" id="startTutor">✦ Запустити Tutor</button>':'<button type="button" class="depth-button" id="learningLogin">Увійти</button>'}</section>
      <section><div class="section-title"><div><small>КАТАЛОГ</small><h2>Продовжити навчання</h2></div></div><div class="course-grid">${courseCards||'<div class="glass-card empty">Опублікованих курсів поки немає.</div>'}</div></section>
      ${state.me?`<section class="glass-card study-live"><div><span class="status-pill status-pill--success">FOCUS MODE</span><h3>Навчальний простір</h3><p>${esc((learnHub.sections||[]).slice(0,8).join(' · ')||'Tutor · Flashcards · Exam plan · Focus')}</p></div><span class="focus-clock">25:00</span><button type="button" id="focusStudy">Почати 25/5</button></section>
      <section class="learning-tools-grid"><article class="glass-card learning-tool-card"><span class="nav-icon-plate">${referenceIcon('sparkles')}</span><div><small>AI SUPPORT</small><h3>Підготовка</h3><p>Flashcards та план до іспиту.</p></div><button type="button" id="makeDeck">Flashcards</button><button type="button" id="examPlan">Exam plan</button></article><article class="glass-card learning-tool-card"><span class="nav-icon-plate">${referenceIcon('chart')}</span><div><small>SCIENCE WORKSPACE</small><h3>Дослідження</h3><p>${esc((sciHub.sections||[]).slice(0,5).join(' · ')||'Library · Dataset · Experiment')}</p></div><button type="button" id="addPaper">Paper</button><button type="button" id="newDataset">Dataset</button><button type="button" id="newExperiment">Experiment</button><button type="button" id="runCalc">KE calc</button><button type="button" id="runStats">Stats</button><button type="button" id="newFormula">Formula</button><button type="button" id="newBoard">Whiteboard</button><button type="button" id="newCircle">Circle</button></article></section>`:''}
      <section class="glass-card researchers-card"><div class="card-top"><div><small>ДОСЛІДНИКИ</small><h3>Люди поруч</h3></div></div><div class="researcher-row">${researchers.map((user,index)=>`<span><i class="avatar convo-${index%5+1}">${esc((user.displayName||user.username).slice(0,1).toUpperCase())}</i><b>${esc(user.displayName||user.username)}</b><small>@${esc(user.username)}</small></span>`).join('')||'<p class="muted">Дослідників ще немає.</p>'}</div></section>
      ${state.me?conferenceHubHtml('science',conferenceData.rooms):''}
      ${state.me?`<form id="courseForm" class="glass-card course-create fields"><div class="card-top"><div><small>CREATOR LEARNING</small><h3>Новий курс</h3></div></div><input name="title" placeholder="Назва курсу" required><textarea name="description" placeholder="Опис"></textarea><input name="price" type="number" min="0" value="0"><button class="depth-button">${esc(t('createCourse'))}</button></form>`:''}
    </main>
  </div>`;
  localizeLearningPage({courses,researchers});
  document.querySelector('#learningLogin')?.addEventListener('click',renderAuth);
  if(state.me)bindConferenceHub('science',renderLearningReference);
  document.querySelector('#startTutor')?.addEventListener('click',async()=>{const out=await api('/api/learning/tutor',{method:'POST',body:JSON.stringify({subject:'General',mode:'teach_me'})});toast(`Tutor · ${out.session.mode} · ${t('tutorHonesty')}`)});
  document.querySelector('#makeDeck')?.addEventListener('click',async()=>{await api('/api/learning/flashcards',{method:'POST',body:JSON.stringify({title:'Quick deck',cards:[{front:'Concept',back:'Definition'}],aiAssisted:false})});toast(t('deckCreated'))});
  document.querySelector('#examPlan')?.addEventListener('click',async()=>{const date=new Date(Date.now()+7*864e5).toISOString().slice(0,10);await api('/api/learning/exam-plan',{method:'POST',body:JSON.stringify({subject:'Exam',examDate:date,availableMinutesPerDay:45})});toast(t('examPlanReady'))});
  document.querySelector('#focusStudy')?.addEventListener('click',async()=>{await api('/api/focus',{method:'POST',body:JSON.stringify({preset:'25_5'})});toast(t('focusStarted'))});
  document.querySelector('#addPaper')?.addEventListener('click',async()=>{await api('/api/science/library',{method:'POST',body:JSON.stringify({type:'paper',title:'Untitled paper'})});toast(t('paperAdded'))});
  document.querySelector('#newDataset')?.addEventListener('click',async()=>{await api('/api/science/datasets',{method:'POST',body:JSON.stringify({name:'Dataset',columns:[{name:'x',type:'number'}],previewRows:[]})});toast(t('datasetCreated'))});
  document.querySelector('#newBoard')?.addEventListener('click',async()=>{await api('/api/whiteboard',{method:'POST',body:JSON.stringify({space:'learning',title:'Study board'})});toast(t('whiteboardCreated'))});
  document.querySelector('#newExperiment')?.addEventListener('click',async()=>{const {experiment}=await api('/api/science/experiments',{method:'POST',body:JSON.stringify({title:'Trial',procedure:'Step 1',parameters:{T:25},observations:'',results:''})});toast(`Experiment v${experiment.currentVersion}`)});
  document.querySelector('#runCalc')?.addEventListener('click',async()=>{const {result}=await api('/api/science/calculators/run',{method:'POST',body:JSON.stringify({moduleId:'physics',op:'kinetic_energy',inputs:{mass:2,velocity:3}})});toast(`KE=${result.value} ${result.unit}`)});
  document.querySelector('#runStats')?.addEventListener('click',async()=>{const {analysis}=await api('/api/science/statistics',{method:'POST',body:JSON.stringify({data:[2,4,4,4,5,5,7,9]})});toast(analysis.explanation.slice(0,140))});
  document.querySelector('#newCircle')?.addEventListener('click',async()=>{await api('/api/science/circles',{method:'POST',body:JSON.stringify({title:'Paper discussion'})});toast(t('circleCreated'))});
  document.querySelector('#newFormula')?.addEventListener('click',async()=>{await api('/api/science/formulas',{method:'POST',body:JSON.stringify({title:'Energy',latex:'E=mc^2',units:['J']})});toast(t('formulaCreated'))});
  document.querySelector('#courseForm')?.addEventListener('submit',async event=>{event.preventDefault();const {course}=await api('/api/courses',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});await api(`/api/courses/${course.id}/lessons`,{method:'POST',body:JSON.stringify({title:'Intro',content:'Lesson 1'})});await api(`/api/courses/${course.id}/publish`,{method:'POST'});await renderLearningReference()});
  document.querySelectorAll('.open-course').forEach(button=>button.onclick=()=>openCourse(button.dataset.id));
  if(state.intent==='course'){state.intent=null;document.querySelector('#courseForm input[name="title"]')?.focus()}
}
async function openCourse(id){
  try{
    const {course,enrollment,lessons,locked}=await api(`/api/courses/${id}`);
    const progress=Math.round((enrollment?.progress||0)*100);
    app.innerHTML=`<button id="backLearning" class="ghost">← Курси</button><div class="card hero"><span class="eyebrow">SYLORA LEARNING</span><h1>${esc(course.title)}</h1><p>${esc(course.description)}</p>${enrollment?`<p class="muted">Прогрес: ${progress}%</p><div class="progress"><span style="width:${progress}%"></span></div>`:''}${locked&&state.me&&course.price===0?'<button id="enrollCourse" class="primary">Записатися безкоштовно</button>':''}${locked&&!state.me?'<p class="muted">Увійди, щоб записатися і відкрити уроки.</p>':''}${locked&&course.price>0?'<p class="muted">Платні курси будуть доступні після підключення платежів.</p>':''}</div><div class="stack">${lessons.map(l=>`<article class="card item"><span class="badge">Урок ${l.position}${l.completed?' · ✓ виконано':''}</span><h3>${esc(l.title)}</h3>${locked?'<p class="muted">🔒 Запишись на курс, щоб відкрити матеріал.</p>':`<p>${esc(l.content||'')}</p>${!l.completed?`<button class="ghost complete-lesson" data-id="${l.id}">Позначити виконаним</button>`:''}<button class="ghost lesson-quiz" data-id="${l.id}">Quiz</button>`}</article>`).join('')}</div><div id="lessonQuiz"></div>`;
    document.querySelector('#backLearning').onclick=renderLearningReference;
    document.querySelector('#enrollCourse')?.addEventListener('click',async()=>{await api(`/api/courses/${id}/enroll`,{method:'POST',body:'{}'});toast('Записано на курс');await openCourse(id)});
    document.querySelectorAll('.complete-lesson').forEach(b=>b.onclick=async()=>{await api(`/api/lessons/${b.dataset.id}/progress`,{method:'POST',body:'{}'});await openCourse(id)});
    document.querySelectorAll('.lesson-quiz').forEach(b=>b.onclick=async()=>{
      const quizBox=document.querySelector('#lessonQuiz');
      const out=await api(`/api/lessons/${b.dataset.id}/quiz`);
      const q=out.quiz.questions[0];
      quizBox.innerHTML=`<div class="card"><span class="eyebrow">SYLORA LEARNING · QUIZ</span><p>${esc(q.prompt)}</p><div class="stack">${q.options.map(o=>`<button class="ghost quiz-opt" data-qid="${q.id}" data-oid="${o.id}" data-quiz="${out.quiz.id}">${esc(o.text)}</button>`).join('')}</div><p class="muted">Adaptive: ${esc(out.adaptive?.difficulty||'')}</p></div>`;
      quizBox.querySelectorAll('.quiz-opt').forEach(opt=>opt.onclick=async()=>{
        const grade=await api(`/api/quizzes/${opt.dataset.quiz}/attempt`,{method:'POST',body:JSON.stringify({answers:{[opt.dataset.qid]:opt.dataset.oid}})});
        toast(grade.correct?'Correct':'Try another explanation');
        quizBox.insertAdjacentHTML('beforeend',`<p class="muted">${esc(grade.explanation)} · next: ${esc(grade.adaptive?.nextStep||'')}</p>`);
      });
    });
  }catch(e){toast(e.message);renderLearningReference()}
}

async function renderBusiness(){
  const [{businesses},conferenceData,orgData,hub,country,invoices]=await Promise.all([
    api('/api/businesses'),
    state.me?api('/api/conferences?kind=business'):Promise.resolve({rooms:[]}),
    state.me?api('/api/orgs'):Promise.resolve({organizations:[]}),
    api('/api/business/hub').catch(()=>({sections:[]})),
    state.me?api('/api/business/country').catch(()=>({profile:{}})):Promise.resolve({profile:{}}),
    state.me?api('/api/business/invoices').catch(()=>({invoices:[]})):Promise.resolve({invoices:[]})
  ]);
  const orgs=orgData.organizations||[];
  app.innerHTML=`<div class="card hero"><span class="eyebrow">SYLORA BUSINESS · WORKSPACE</span><h1>${esc(t('workspace'))}</h1><p>Companies · finance · CRM · contracts · teams · Sylora Business</p><div class="scene-readout"><span><small>ORGS</small><b>${orgs.length}</b></span><span><small>COMPANIES</small><b>${businesses.length}</b></span><span><small>INVOICES</small><b>${(invoices.invoices||[]).length}</b></span></div></div>
  ${state.me?`<section class="card"><span class="eyebrow">BUSINESS HUB · ${(country.profile?.countryCode||'DEFAULT')} · not a bank</span>
  <p class="muted">${(hub.sections||[]).slice(0,10).join(' · ')}</p>
  <div class="row"><button type="button" class="primary" id="bizInvoice">Draft invoice</button><button type="button" class="ghost" id="bizCrm">Add client</button><button type="button" class="ghost" id="bizQuote">Quote</button><button type="button" class="ghost" id="bizTime">Start work timer</button><button type="button" class="ghost" id="bizFinanceAsk">Ask finance</button></div>
  <form id="countryForm" class="fields" style="margin-top:10px"><select name="countryCode"><option value="PL">PL</option><option value="UA">UA</option><option value="DE">DE</option><option value="US">US</option><option value="DEFAULT">DEFAULT</option></select><button class="ghost">Set country profile</button></form>
  </section>`:''}
  ${state.me?`<section class="card org-workspace"><span class="eyebrow">BUSINESS OS</span><h3>${esc(t('workspace'))}</h3>
  <form id="orgForm" class="fields"><input name="name" required placeholder="Organization"><button class="primary">${esc(t('createHub'))}</button></form>
  <div class="stack">${orgs.map(o=>`<div class="item"><b>${esc(o.name)}</b><div class="row"><button type="button" class="primary open-org-workspace" data-id="${o.id}">${esc(t('workspace'))}</button><button type="button" class="ghost add-org-team" data-id="${o.id}">+ ${esc(t('teams'))}</button><button type="button" class="ghost add-org-doc" data-id="${o.id}">+ ${esc(t('documents'))}</button><button type="button" class="ghost add-org-task" data-id="${o.id}">+ ${esc(t('tasks'))}</button></div></div>`).join('')||'<p class="muted">—</p>'}</div>
  <div id="orgWorkspacePanel" class="org-workspace"></div></section>`:''}
  ${state.me?conferenceHubHtml('business',conferenceData.rooms):''}
  ${state.me?'<form id="businessForm" class="card auth fields"><input name="name" placeholder="Company" required><textarea name="description"></textarea><input name="website" placeholder="https://"><button class="primary">Company profile</button></form>':''}
  ${businesses.map(b=>`<div class="card item business-company"><span class="business-emblem">◈</span><div><span class="eyebrow">COMPANY</span><h3>${esc(b.name)}</h3><p class="muted">${esc(b.description)}</p>${b.website?`<span class="badge">${esc(b.website)}</span>`:''}</div></div>`).join('')||'<div class="card empty">—</div>'}`;
  if(state.me)bindConferenceHub('business',renderBusiness);
  document.querySelector('#bizInvoice')?.addEventListener('click',async()=>{await api('/api/business/invoices',{method:'POST',body:JSON.stringify({items:[{description:'Service',quantity:1,unitNetPrice:100,taxRate:23}],seller:{name:'Me'},buyer:{name:'Client'}})});toast('Invoice draft');renderBusiness()});
  document.querySelector('#bizCrm')?.addEventListener('click',async()=>{const name=prompt('Client name');if(!name)return;await api('/api/business/crm',{method:'POST',body:JSON.stringify({type:'client',name})});toast('CRM record')});
  document.querySelector('#bizQuote')?.addEventListener('click',async()=>{await api('/api/business/quotes',{method:'POST',body:JSON.stringify({items:[{description:'Estimate',quantity:1,unitNetPrice:50,taxRate:0}]})});toast('Quote draft')});
  document.querySelector('#bizTime')?.addEventListener('click',async()=>{await api('/api/business/time',{method:'POST',body:JSON.stringify({action:'start',note:'Work'})});toast('Time tracking visible to worker')});
  document.querySelector('#bizFinanceAsk')?.addEventListener('click',async()=>{const out=await api('/api/business/finance/ask',{method:'POST',body:JSON.stringify({query:'неоплачені фактури'})});toast(`Unpaid: ${out.answer?.unpaidCount??0} · confirm before send`)});
  document.querySelector('#countryForm')?.addEventListener('submit',async e=>{e.preventDefault();await api('/api/business/country',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});toast('Country set by user (not IP)');renderBusiness()});
  document.querySelector('#orgForm')&&(document.querySelector('#orgForm').onsubmit=async e=>{e.preventDefault();const name=new FormData(e.currentTarget).get('name');await api('/api/orgs',{method:'POST',body:JSON.stringify({name})});toast('OK');renderBusiness()});
  const showWorkspace=async id=>{
    const out=await api(`/api/orgs/${id}/workspace`);
    const panel=document.querySelector('#orgWorkspacePanel');if(!panel)return;
    panel.innerHTML=`<div class="grid3"><div class="card item"><span class="eyebrow">${esc(t('teams'))}</span>${(out.teams||[]).map(x=>`<p><b>${esc(x.name)}</b></p>`).join('')||'<p class="muted">—</p>'}</div><div class="card item"><span class="eyebrow">${esc(t('documents'))}</span>${(out.documents||[]).map(d=>`<p><b>${esc(d.title)}</b></p>`).join('')||'<p class="muted">—</p>'}</div><div class="card item"><span class="eyebrow">${esc(t('tasks'))}</span>${(out.tasks||[]).map(x=>`<p><b>${esc(x.title)}</b></p>`).join('')||'<p class="muted">—</p>'}</div></div>`;
  };
  document.querySelectorAll('.open-org-workspace').forEach(b=>b.onclick=async()=>{await showWorkspace(b.dataset.id);const panel=document.querySelector('#orgWorkspacePanel');if(!panel)return;panel.insertAdjacentHTML('beforeend',`<div class="card fields"><span class="eyebrow">SYLORA BUSINESS</span><input id="meetTitle" placeholder="Meeting title"><textarea id="meetNotes" placeholder="Notes / transcript"></textarea><div class="row"><button type="button" class="ghost" id="meetBrief">Meeting brief</button><button type="button" class="primary" id="meetSummary">Summary + decisions</button></div><pre id="meetOut" hidden style="white-space:pre-wrap;font-size:12px"></pre></div>`);
    document.querySelector('#meetBrief').onclick=async()=>{const out=await api(`/api/orgs/${b.dataset.id}/meeting-brief`,{method:'POST',body:JSON.stringify({title:document.querySelector('#meetTitle').value||'Brief',agenda:document.querySelector('#meetNotes').value||''})});const pre=document.querySelector('#meetOut');pre.hidden=false;pre.textContent=JSON.stringify(out.brief,null,2);toast('Brief saved as document')};
    document.querySelector('#meetSummary').onclick=async()=>{const out=await api(`/api/orgs/${b.dataset.id}/meeting-summary`,{method:'POST',body:JSON.stringify({title:document.querySelector('#meetTitle').value||'Summary',notes:document.querySelector('#meetNotes').value||''})});const pre=document.querySelector('#meetOut');pre.hidden=false;pre.textContent=JSON.stringify({summary:out.summary,proposedTasks:out.proposedTasks},null,2);if(out.proposedTasks?.length&&confirm('Create proposed tasks? (legal/financial skipped unless confirmed)')){await api(`/api/orgs/${b.dataset.id}/proposed-tasks/confirm`,{method:'POST',body:JSON.stringify({tasks:out.proposedTasks.map(t=>({...t,confirmed:!t.financialOrLegal}))})});toast('Tasks created');showWorkspace(b.dataset.id)}};
  });
  document.querySelectorAll('.add-org-team').forEach(b=>b.onclick=async()=>{const name=prompt(t('teams'));if(!name)return;await api(`/api/orgs/${b.dataset.id}/teams`,{method:'POST',body:JSON.stringify({name})});toast('OK');showWorkspace(b.dataset.id)});
  document.querySelectorAll('.add-org-doc').forEach(b=>b.onclick=async()=>{const title=prompt(t('documents'));if(!title)return;await api(`/api/orgs/${b.dataset.id}/documents`,{method:'POST',body:JSON.stringify({title})});toast('OK');showWorkspace(b.dataset.id)});
  document.querySelectorAll('.add-org-task').forEach(b=>b.onclick=async()=>{const title=prompt(t('tasks'));if(!title)return;await api(`/api/orgs/${b.dataset.id}/tasks`,{method:'POST',body:JSON.stringify({title})});toast('OK');showWorkspace(b.dataset.id)});
  document.querySelector('#businessForm')?.addEventListener('submit',async e=>{e.preventDefault();await api('/api/businesses',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});renderBusiness()});
  if(state.intent==='room'||state.intent==='project'){state.intent=null;document.querySelector('[data-conference-create="business"] input[name="title"]')?.focus()}
}

function localizeBusinessPage({orgs=[],businesses=[],paidGross=0,unpaid=[],invoiceList=[],currency='EUR',conferenceRooms=[]}={}){
  const heading=document.querySelector('.business-heading');if(heading){const title=heading.querySelector('h1'),intro=heading.querySelector('p'),button=heading.querySelector('.depth-button');if(title)title.textContent=t('businessHero');if(intro)intro.textContent=t('businessIntro');if(button)button.textContent=state.me?`＋ ${t('draftInvoice')}`:t('signin')}
  const metrics=document.querySelectorAll('.business-overview>.metric-grid .metric-card');const metricValues=[['organizations',orgs.length,'workspaces'],['paid',paidGross.toLocaleString(),'byInvoices'],['unpaid',unpaid.length,'needAttention'],['companiesLabel',businesses.length,'inCatalog']];metrics.forEach((card,index)=>{const value=metricValues[index],label=card.querySelector('small'),number=card.querySelector('b'),copy=card.querySelector('em');if(label)label.textContent=t(value[0]);if(number)number.textContent=value[1];if(copy)copy.textContent=index===1?`${currency} · ${t(value[2])}`:t(value[2])});
  const revenue=document.querySelector('.revenue-card');if(revenue){const label=revenue.querySelector('.card-top small'),title=revenue.querySelector('.card-top h3'),ask=revenue.querySelector('#bizFinanceAsk');if(label)label.textContent=t('invoicesRealData');if(title)title.textContent=t('recentAmounts');if(ask){ask.textContent='';ask.insertAdjacentHTML('afterbegin',`${referenceIcon('sparkles')} ${esc(t('askSylora'))}`)}const footer=revenue.querySelector('.chart-footer');if(footer){const sum=footer.querySelector('span'),count=footer.querySelector('b');if(sum)sum.textContent=t('grossAmount');if(count)count.textContent=`${invoiceList.length} ${t('invoiceCount')}`}const empty=revenue.querySelector('.business-empty-chart');if(empty){const emptyTitle=empty.querySelector('b'),copy=empty.querySelector('p');if(emptyTitle)emptyTitle.textContent=t('noInvoices');if(copy)copy.textContent=t('createDraftChart')}}
  const actions=document.querySelector('.business-actions-card');if(actions){const title=actions.querySelector('.card-top h3'),status=actions.querySelector('.status-pill'),buttons=actions.querySelectorAll('.business-action-grid button'),countryLabel=actions.querySelector('.country-form label'),save=actions.querySelector('.country-form button');if(title)title.textContent=t('quickActions');if(status)status.textContent=t('notBank');[t('addClient'),'Quote',t('workTimer')].forEach((value,index)=>{if(buttons[index]){const svg=buttons[index].querySelector('svg')?.outerHTML||'';buttons[index].innerHTML=`${svg} ${esc(value)}`}});if(countryLabel?.firstChild)countryLabel.firstChild.nodeValue=t('countryProfile');if(save){save.textContent=`${t('saveCountry')} `;save.insertAdjacentHTML('beforeend',referenceIcon('arrow'))}}
  const orgCard=document.querySelector('.org-reference-card');if(orgCard){const title=orgCard.querySelector('.card-top h3'),name=orgCard.querySelector('#orgForm input'),empty=orgCard.querySelector('.org-reference-list>.muted');if(title)title.textContent=t('organizationsTitle');if(name)name.placeholder=t('organizationName');if(empty)empty.textContent=t('createFirstOrg');orgCard.querySelectorAll('.org-reference-list article>div>small').forEach(copy=>{copy.textContent=t('orgFeatures')})}
  const companyForm=document.querySelector('.business-company-form');if(companyForm){const label=companyForm.querySelector('.card-top small'),title=companyForm.querySelector('.card-top h3'),name=companyForm.querySelector('input[name="name"]'),description=companyForm.querySelector('textarea'),button=companyForm.querySelector('button');if(label)label.textContent=t('companyProfile');if(title)title.textContent=t('addCompany');if(name)name.placeholder=t('company');if(description)description.placeholder=t('description');if(button)button.textContent=t('saveProfile')}const noCompanies=document.querySelector('.business-company-grid>.empty');if(noCompanies)noCompanies.textContent=t('noCompanies');
  const aside=document.querySelectorAll('.business-layout>.context-stack>.glass-card');if(aside[0]){const label=aside[0].querySelector('.card-top small'),title=aside[0].querySelector('.card-top h3'),rows=aside[0].querySelectorAll('.task-list label');if(label)label.textContent=t('systemStatus');if(title)title.textContent=t('businessControl');const values=[['financialConfirmation','requiredBeforeSending'],['countryProfile','manualCountry'],['privateRooms',null]];rows.forEach((row,index)=>{const heading=row.querySelector('b'),copy=row.querySelector('small');if(heading)heading.textContent=t(values[index][0]);if(copy)copy.textContent=index===2?`${conferenceRooms.length} ${t('availableCount')}`:t(values[index][1])})}if(aside[1]){const title=aside[1].querySelector('b'),copy=aside[1].querySelector('p'),button=aside[1].querySelector('button');if(title)title.textContent=t('helpNoHidden');if(copy)copy.textContent=t('businessAiIntro');if(button)button.textContent=t('openSylora')}
}

async function renderBusinessReference(){
  const [{businesses},conferenceData,orgData,hub,country,invoices]=await Promise.all([
    api('/api/businesses'),state.me?api('/api/conferences?kind=business'):Promise.resolve({rooms:[]}),state.me?api('/api/orgs'):Promise.resolve({organizations:[]}),api('/api/business/hub').catch(()=>({sections:[]})),state.me?api('/api/business/country').catch(()=>({profile:{}})):Promise.resolve({profile:{}}),state.me?api('/api/business/invoices').catch(()=>({invoices:[]})):Promise.resolve({invoices:[]})
  ]);
  const orgs=orgData.organizations||[],invoiceList=invoices.invoices||[],paid=invoiceList.filter(item=>item.status==='paid'),unpaid=invoiceList.filter(item=>['issued','sent','overdue','partially_paid'].includes(item.status)),paidGross=paid.reduce((sum,item)=>sum+Number(item.gross||0),0),currency=country.profile?.currency||invoiceList[0]?.currency||'EUR';
  const values=invoiceList.slice(0,10).reverse().map(item=>Number(item.gross||0)),maxValue=Math.max(1,...values),chartBars=values.map((value,index)=>`<i style="height:${Math.max(4,Math.round(value/maxValue*100))}%;animation-delay:${index*45}ms" title="${value.toLocaleString()} ${esc(currency)}"><span></span></i>`).join('');
  app.innerHTML=`<div class="business-layout">
    <main class="business-overview">
      <section class="route-hero-row compact business-heading"><div><span class="status-pill status-pill--gold">${referenceIcon('business')} SYLORA BUSINESS</span><h1>Робота в одному ритмі.</h1><p>Компанії, фінанси, CRM, договори, команди й приватні rooms. SYLORA не є банком і не надсилає фінансові дії без підтвердження.</p></div>${state.me?'<button type="button" class="depth-button" id="bizInvoice">＋ Draft invoice</button>':'<button type="button" class="depth-button" id="businessLogin">Увійти</button>'}</section>
      <section class="metric-grid">
        <article class="glass-card metric-card"><span>${referenceIcon('business')}</span><small>ОРГАНІЗАЦІЇ</small><b>${orgs.length}</b><em>робочих просторів</em></article>
        <article class="glass-card metric-card"><span>${referenceIcon('chart')}</span><small>ОПЛАЧЕНО</small><b>${paidGross.toLocaleString()}</b><em>${esc(currency)} · за фактурами</em></article>
        <article class="glass-card metric-card"><span>${referenceIcon('activity')}</span><small>НЕОПЛАЧЕНО</small><b>${unpaid.length}</b><em>потребують уваги</em></article>
        <article class="glass-card metric-card"><span>${referenceIcon('users')}</span><small>КОМПАНІЇ</small><b>${businesses.length}</b><em>у каталозі</em></article>
      </section>
      <section class="glass-card revenue-card"><div class="card-top"><div><small>ФАКТУРИ · РЕАЛЬНІ ДАНІ</small><h3>Останні суми</h3></div><button type="button" id="bizFinanceAsk">${referenceIcon('sparkles')} Запитати Sylora</button></div>${chartBars?`<div class="revenue-chart"><div class="chart-y"><span>${maxValue.toLocaleString()}</span><span>${Math.round(maxValue/2).toLocaleString()}</span><span>0</span></div><div class="chart-bars">${chartBars}</div></div><div class="chart-footer"><span><i></i> Сума gross</span><b>${invoiceList.length} фактур</b></div>`:'<div class="business-empty-chart"><span class="runtime-core">◈</span><b>Фактур ще немає.</b><p>Створіть draft — графік покаже лише реальні суми.</p></div>'}</section>
      ${state.me?`<section class="glass-card business-actions-card"><div class="card-top"><div><small>BUSINESS HUB · ${esc(country.profile?.countryCode||'DEFAULT')}</small><h3>Швидкі дії</h3></div><span class="status-pill status-pill--success">NOT A BANK</span></div><p class="muted">${esc((hub.sections||[]).slice(0,10).join(' · '))}</p><div class="business-action-grid"><button type="button" id="bizCrm">${referenceIcon('users')} Додати клієнта</button><button type="button" id="bizQuote">${referenceIcon('wallet')} Quote</button><button type="button" id="bizTime">${referenceIcon('activity')} Робочий таймер</button></div><form id="countryForm" class="country-form"><label>Профіль країни<select name="countryCode"><option value="PL">PL</option><option value="UA">UA</option><option value="DE">DE</option><option value="US">US</option><option value="DEFAULT">DEFAULT</option></select></label><button class="plain-action">Зберегти ${referenceIcon('arrow')}</button></form></section>
      <section class="glass-card org-reference-card"><div class="card-top"><div><small>BUSINESS OS</small><h3>Організації</h3></div></div><form id="orgForm" class="org-create"><input name="name" required placeholder="Назва організації"><button class="depth-button">${esc(t('createHub'))}</button></form><div class="org-reference-list">${orgs.map(org=>`<article><span class="business-emblem">◈</span><div><b>${esc(org.name)}</b><small>Команди · документи · задачі</small></div><div><button type="button" class="open-org-workspace" data-id="${org.id}">${esc(t('workspace'))}</button><button type="button" class="add-org-team" data-id="${org.id}">+ ${esc(t('teams'))}</button><button type="button" class="add-org-doc" data-id="${org.id}">+ ${esc(t('documents'))}</button><button type="button" class="add-org-task" data-id="${org.id}">+ ${esc(t('tasks'))}</button></div></article>`).join('')||'<p class="muted">Створіть першу організацію.</p>'}</div><div id="orgWorkspacePanel" class="org-workspace-reference"></div></section>
      ${conferenceHubHtml('business',conferenceData.rooms)}
      <form id="businessForm" class="glass-card business-company-form fields"><div class="card-top"><div><small>ПРОФІЛЬ КОМПАНІЇ</small><h3>Додати компанію</h3></div></div><input name="name" placeholder="Company" required><textarea name="description" placeholder="Опис"></textarea><input name="website" placeholder="https://"><button class="depth-button">Зберегти профіль</button></form>`:''}
      <section class="business-company-grid">${businesses.map(company=>`<article class="glass-card business-company"><span class="business-emblem">◈</span><div><small>COMPANY</small><h3>${esc(company.name)}</h3><p>${esc(company.description)}</p>${company.website?`<span class="status-pill">${esc(company.website)}</span>`:''}</div></article>`).join('')||'<div class="glass-card empty">Компаній поки немає.</div>'}</section>
    </main>
    <aside class="context-stack">
      <section class="glass-card"><div class="card-top"><div><small>СТАН СИСТЕМИ</small><h3>Business control</h3></div></div><div class="task-list"><label><input type="checkbox" checked disabled><span><b>Фінансове підтвердження</b><small>обов’язкове перед надсиланням</small></span>${referenceIcon('shield')}</label><label><input type="checkbox" checked disabled><span><b>Country profile</b><small>обирається вручну, не за IP</small></span>${referenceIcon('check')}</label><label><input type="checkbox" ${state.me?'checked':''} disabled><span><b>Private rooms</b><small>${conferenceData.rooms.length} доступно</small></span>${referenceIcon('camera')}</label></div></section>
      <section class="glass-card sylora-business">${referenceIcon('sparkles')}<div><small>SYLORA BUSINESS</small><b>Допомога без прихованих дій.</b><p>Підготує brief, summary, рішення й запропонує задачі; фінансове та юридичне потребує вашого підтвердження.</p><button type="button" data-business-ai>Відкрити Sylora</button></div></section>
    </aside>
  </div>`;
  localizeBusinessPage({orgs,businesses,paidGross,unpaid,invoiceList,currency,conferenceRooms:conferenceData.rooms});
  document.querySelector('#businessLogin')?.addEventListener('click',renderAuth);document.querySelector('[data-business-ai]')?.addEventListener('click',()=>nav('ai'));
  if(state.me)bindConferenceHub('business',renderBusinessReference);
  document.querySelector('#bizInvoice')?.addEventListener('click',async()=>{await api('/api/business/invoices',{method:'POST',body:JSON.stringify({items:[{description:'Service',quantity:1,unitNetPrice:100,taxRate:23}],seller:{name:'Me'},buyer:{name:'Client'}})});toast(t('invoiceCreated'));await renderBusinessReference()});
  document.querySelector('#bizCrm')?.addEventListener('click',async()=>{const name=prompt(t('clientName'));if(!name)return;await api('/api/business/crm',{method:'POST',body:JSON.stringify({type:'client',name})});toast(t('crmCreated'))});
  document.querySelector('#bizQuote')?.addEventListener('click',async()=>{await api('/api/business/quotes',{method:'POST',body:JSON.stringify({items:[{description:'Estimate',quantity:1,unitNetPrice:50,taxRate:0}]})});toast(t('quoteCreated'))});
  document.querySelector('#bizTime')?.addEventListener('click',async()=>{await api('/api/business/time',{method:'POST',body:JSON.stringify({action:'start',note:'Work'})});toast(t('timerStarted'))});
  document.querySelector('#bizFinanceAsk')?.addEventListener('click',async()=>{if(!state.me)return renderAuth();const out=await api('/api/business/finance/ask',{method:'POST',body:JSON.stringify({query:'unpaid invoices'})});toast(`${t('unpaidCount')}: ${out.answer?.unpaidCount??0} · ${t('confirmationRequired')}`)});
  const countrySelect=document.querySelector('#countryForm select');if(countrySelect)countrySelect.value=country.profile?.countryCode||'DEFAULT';
  document.querySelector('#countryForm')?.addEventListener('submit',async event=>{event.preventDefault();await api('/api/business/country',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});toast(t('countrySaved'));await renderBusinessReference()});
  document.querySelector('#orgForm')?.addEventListener('submit',async event=>{event.preventDefault();const name=new FormData(event.currentTarget).get('name');await api('/api/orgs',{method:'POST',body:JSON.stringify({name})});toast(t('organizationCreated'));await renderBusinessReference()});
  const showWorkspace=async id=>{const out=await api(`/api/orgs/${id}/workspace`),panel=document.querySelector('#orgWorkspacePanel');if(!panel)return;panel.innerHTML=`<div class="org-workspace-grid"><section><small>${esc(t('teams'))}</small>${(out.teams||[]).map(item=>`<p><b>${esc(item.name)}</b></p>`).join('')||'<p class="muted">—</p>'}</section><section><small>${esc(t('documents'))}</small>${(out.documents||[]).map(item=>`<p><b>${esc(item.title)}</b></p>`).join('')||'<p class="muted">—</p>'}</section><section><small>${esc(t('tasks'))}</small>${(out.tasks||[]).map(item=>`<p><b>${esc(item.title)}</b></p>`).join('')||'<p class="muted">—</p>'}</section></div><div class="meeting-assistant fields"><input id="meetTitle" placeholder="Meeting title"><textarea id="meetNotes" placeholder="Notes / transcript"></textarea><div><button type="button" id="meetBrief">Meeting brief</button><button type="button" id="meetSummary">Summary + decisions</button></div><pre id="meetOut" hidden></pre></div>`;document.querySelector('#meetBrief').onclick=async()=>{const result=await api(`/api/orgs/${id}/meeting-brief`,{method:'POST',body:JSON.stringify({title:document.querySelector('#meetTitle').value||'Brief',agenda:document.querySelector('#meetNotes').value||''})}),pre=document.querySelector('#meetOut');pre.hidden=false;pre.textContent=JSON.stringify(result.brief,null,2)};document.querySelector('#meetSummary').onclick=async()=>{const result=await api(`/api/orgs/${id}/meeting-summary`,{method:'POST',body:JSON.stringify({title:document.querySelector('#meetTitle').value||'Summary',notes:document.querySelector('#meetNotes').value||''})}),pre=document.querySelector('#meetOut');pre.hidden=false;pre.textContent=JSON.stringify({summary:result.summary,proposedTasks:result.proposedTasks},null,2)}};
  document.querySelectorAll('.open-org-workspace').forEach(button=>button.onclick=()=>showWorkspace(button.dataset.id));
  document.querySelectorAll('.add-org-team').forEach(button=>button.onclick=async()=>{const name=prompt(t('teams'));if(!name)return;await api(`/api/orgs/${button.dataset.id}/teams`,{method:'POST',body:JSON.stringify({name})});toast(t('teamAdded'));showWorkspace(button.dataset.id)});
  document.querySelectorAll('.add-org-doc').forEach(button=>button.onclick=async()=>{const title=prompt(t('documents'));if(!title)return;await api(`/api/orgs/${button.dataset.id}/documents`,{method:'POST',body:JSON.stringify({title})});toast(t('documentAdded'));showWorkspace(button.dataset.id)});
  document.querySelectorAll('.add-org-task').forEach(button=>button.onclick=async()=>{const title=prompt(t('tasks'));if(!title)return;await api(`/api/orgs/${button.dataset.id}/tasks`,{method:'POST',body:JSON.stringify({title})});toast(t('taskAdded'));showWorkspace(button.dataset.id)});
  document.querySelector('#businessForm')?.addEventListener('submit',async event=>{event.preventDefault();await api('/api/businesses',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});await renderBusinessReference()});
  if(state.intent==='room'||state.intent==='project'){state.intent=null;document.querySelector('[data-conference-create="business"] input[name="title"]')?.focus()}
}

function mountSyloraPressInteractions(){
  document.addEventListener('pointerdown',event=>{
    if(event.button!=null&&event.button!==0)return;
    const button=event.target.closest('button,.primary,.ghost,.module,.gift');if(!button||button.disabled)return;
    const rect=button.getBoundingClientRect(),size=Math.max(rect.width,rect.height)*1.35,ripple=document.createElement('span');
    ripple.className='sylora-press-ripple';ripple.style.width=ripple.style.height=`${size}px`;ripple.style.left=`${event.clientX-rect.left-size/2}px`;ripple.style.top=`${event.clientY-rect.top-size/2}px`;button.append(ripple);setTimeout(()=>ripple.remove(),680);
  },{passive:true});
}
mountSyloraPressInteractions();
bootstrap().catch(error=>{
  reportClientIssue('bootstrap',error);
  window.__syloraBooted=false;
  app.innerHTML=`<section class="card hero"><span class="eyebrow">SYLORA · RECOVERY</span><h1>Не вдалося завершити запуск.</h1><p>Інтерфейс захищено від зависання. Онови сторінку — ми повторимо завантаження.</p><button id="retryBootstrap" class="primary" type="button">Спробувати знову</button></section>`;
  document.querySelector('#retryBootstrap')?.addEventListener('click',()=>location.reload());
});
