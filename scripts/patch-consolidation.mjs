#!/usr/bin/env node
import fs from 'node:fs';

const path = 'public/app.js';
let text = fs.readFileSync(path, 'utf8');

function replaceBetween(startMarker, endMarker, replacement, { inclusiveEnd = false } = {}) {
  const i = text.indexOf(startMarker);
  if (i < 0) throw new Error(`Missing start: ${startMarker.slice(0, 60)}`);
  const j = text.indexOf(endMarker, i + startMarker.length);
  if (j < 0) throw new Error(`Missing end after ${startMarker.slice(0, 40)}: ${endMarker.slice(0, 60)}`);
  text = text.slice(0, i) + replacement + text.slice(inclusiveEnd ? j + endMarker.length : j);
}

text = text.replace(
  "import { t, setLocale, getLocale } from './i18n.js';",
  "import { t, setLocale, getLocale, humanError } from './i18n.js';\nimport { openCreateHub } from './create-hub.js';\nimport { openCommandPalette } from './command-palette.js';"
);

text = text.replace(
  "const state={token:localStorage.getItem('sylora_token')||'',me:null,wallet:null,view:'feed'};",
  "const state={token:localStorage.getItem('sylora_token')||'',me:null,wallet:null,view:'feed',intent:null,inboxTab:'messages',liveTab:'discover'};"
);

const escLine = "const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));\n";
if (!text.includes(escLine)) throw new Error('esc line missing');
text = text.replace(escLine, escLine + `function launchCreateHub(){openCreateHub({t,esc,authed:!!state.me,onAuth:renderAuth,onComposer:()=>{nav('feed');requestAnimationFrame(()=>document.querySelector('#composer textarea')?.focus())},onNavigate:(view,opts={})=>{state.intent=opts.intent||null;nav(view)}})}
function launchCommandPalette(){openCommandPalette({t,esc,api,onNavigate:v=>nav(v),onCreate:launchCreateHub,onAiSearch:q=>{state.intent=q;nav('ai')}})}
`);

text = text.replace(
  '<select id="localeSwitch" class="ghost" aria-label="Language"><option value="uk">UA</option><option value="pl">PL</option><option value="en">EN</option></select>',
  '<select id="localeSwitch" class="ghost" aria-label="Language"><option value="uk">UA</option><option value="pl">PL</option><option value="en">EN</option><option value="de">DE</option><option value="es">ES</option><option value="fr">FR</option><option value="it">IT</option><option value="pt">PT</option><option value="cs">CS</option><option value="sk">SK</option><option value="ro">RO</option><option value="nl">NL</option><option value="tr">TR</option></select>'
);
text = text.replace('data-account-view="profile" title="Сповіщення"', 'data-account-view="messages" title="Inbox"');

text = text.replace(
  "document.querySelector('#globalSearch')?.addEventListener('click',()=>nav('explore'));",
  "document.querySelector('#globalSearch')?.addEventListener('click',launchCommandPalette);\ndocument.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();launchCommandPalette()}});\ndocument.querySelectorAll('[data-create-hub]').forEach(b=>b.addEventListener('click',launchCreateHub));"
);

// AI user-facing errors
text = text.replace(
  "${configured?'Говори зі мною природно. Я бачу лише дозволений тобою контекст, а важливі дії завжди залишаю під твоїм контролем.':'AI provider ще не налаштований на сервері.'}",
  "${configured?'Говори зі мною природно. Я бачу лише дозволений тобою контекст, а важливі дії завжди залишаю під твоїм контролем.':esc(t('syloraUnavailable'))}"
);
text = text.replace(
  "status.textContent=`Помилка: ${err.message}`;button.disabled=false}});",
  "status.textContent=humanError(err.message||err.data?.error);button.disabled=false}});"
);
text = text.replace(
  "toast(error.name==='NotAllowedError'?'Дозволь мікрофон для живої розмови':`Realtime: ${error.message}`)",
  "toast(error.name==='NotAllowedError'?'Дозволь мікрофон для живої розмови':humanError(error.message))"
);

text = text.replace(
  '<section class="card ai-memory"><span class="eyebrow">КЕРОВАНА ПАМ’ЯТЬ</span><h3>Що Sylora може пам’ятати про тебе</h3>',
  "<section class=\"card ai-memory\"><span class=\"eyebrow\">КЕРОВАНА ПАМ’ЯТЬ</span><h3>${esc(t('memoryTitle'))}</h3><div class=\"row\" style=\"margin-bottom:10px\"><label>Proactive <select id=\"aiProactive\"><option value=\"OFF\">OFF</option><option value=\"IMPORTANT_ONLY\">IMPORTANT ONLY</option><option value=\"NORMAL\">NORMAL</option><option value=\"PROACTIVE\">PROACTIVE</option></select></label></div>"
);

const exportNeedle = "document.querySelector('#aiExportMem')?.addEventListener('click',async()=>{const out=await api('/api/ai/memory/export');const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sylora-ai-memory.json';a.click()});";
if (!text.includes(exportNeedle)) throw new Error('export mem missing');
text = text.replace(
  exportNeedle,
  exportNeedle + "\napi('/api/ai/intelligence').then(intel=>{const sel=document.querySelector('#aiProactive');if(!sel)return;sel.value=intel.proactive||intel.agent?.proactiveLevel||'IMPORTANT_ONLY';sel.onchange=async()=>{await api('/api/ai/proactive',{method:'PATCH',body:JSON.stringify({level:sel.value})});toast('OK')}}).catch(()=>{});"
);

// Gifts entry from More
text = text.replace(
  '<div class="card module" data-go="videos"><span class="icon">▻</span><h3>Медіа</h3><p>Відео, довгі формати та медіа-пайплайн.</p></div>',
  '<div class="card module" data-go="videos"><span class="icon">▻</span><h3>Медіа</h3><p>Відео, довгі формати та медіа-пайплайн.</p></div><div class="card module" data-go="gifts"><span class="icon">♢</span><h3>${esc?"":""}Gift Gallery</h3><p>Подарунки для LIVE, Battles і Creator Studio.</p></div>'
);
// fix botched gifts module - do proper replace
text = text.replace(
  '<div class="card module" data-go="gifts"><span class="icon">♢</span><h3>${esc?"":""}Gift Gallery</h3><p>Подарунки для LIVE, Battles і Creator Studio.</p></div>',
  '<div class="card module" data-go="gifts"><span class="icon">♢</span><h3>Gift Gallery</h3><p>Подарунки для LIVE, Battles і Creator Studio.</p></div>'
);

replaceBetween(
  'async function renderFeed(){',
  'function postHtml(p){',
  `async function renderFeed(){
  let posts=[],rooms=[],users=[],communities=[],courses=[],businesses=[];
  try{const feed=await api('/api/feed');posts=Array.isArray(feed.posts)?feed.posts:[]}catch(error){reportClientIssue('feed',error)}
  try{rooms=(await api('/api/live')).rooms||[]}catch{}
  try{users=((await api('/api/users')).users||[]).filter(u=>!state.me||u.id!==state.me.id).slice(0,8)}catch{}
  try{communities=(await api('/api/communities')).communities||[]}catch{}
  try{courses=(await api('/api/courses')).courses||[]}catch{}
  try{businesses=(await api('/api/businesses')).businesses||[]}catch{}
  const hour=new Date().getHours(),hello=hour<12?'Добрий ранок':hour<18?'Добрий день':'Добрий вечір',name=state.me?.displayName||'у SYLORA';
  const liveCards=rooms.slice(0,8).map(r=>\`<button type="button" class="eco-card live" data-eco-nav="live" data-live-id="\${r.id}"><b>● \${esc(r.title)}</b><small>@\${esc(r.host?.username||'creator')} · \${r.viewerCount||0}</small></button>\`);
  const peopleCards=users.map(u=>\`<button type="button" class="eco-card" data-eco-nav="explore"><b>\${esc(u.displayName||u.username)}</b><small>@\${esc(u.username)}</small></button>\`);
  const communityCards=(communities||[]).slice(0,6).map(c=>\`<button type="button" class="eco-card" data-eco-nav="communities"><b>\${esc(c.name)}</b><small>\${c.members||0}</small></button>\`);
  const courseCards=(courses||[]).slice(0,6).map(c=>\`<button type="button" class="eco-card" data-eco-nav="learning"><b>\${esc(c.title)}</b><small>\${c.price?\`◈ \${c.price}\`:'FREE'}</small></button>\`);
  const bizCards=(businesses||[]).slice(0,6).map(b=>\`<button type="button" class="eco-card" data-eco-nav="business"><b>\${esc(b.name)}</b><small>\${esc((b.description||'').slice(0,80))}</small></button>\`);
  const strip=(title,cards,more)=>\`<section class="eco-strip"><div class="eco-strip-head"><b>\${esc(title)}</b><button type="button" data-eco-nav="\${more}">→</button></div><div class="eco-carousel">\${cards.length?cards.join(''):\`<button type="button" class="eco-card" data-eco-nav="\${more}"><b>\${esc(t('explore'))}</b><small>\${esc(t('emptyFeed'))}</small></button>\`}</div></section>\`;
  app.innerHTML=\`<section class="living-horizon"><div class="horizon-copy"><span class="eyebrow">SYLORA · ONE WORLD</span><h1>\${hello}, \${esc(name)}! <span>✦</span></h1><p>Твій всесвіт. Твоя сцена. Твої правила.</p></div><span class="master-human" aria-hidden="true"></span><button class="sylora-presence" data-horizon-view="ai" type="button"><span class="sylora-presence-image"></span><span class="sylora-presence-copy"><small><i></i> SYLORA</small><b>Sylora</b><em>\${esc(t('syloraListening'))}</em><strong>\${esc(t('talkWithSylora'))} <span>→</span></strong></span></button><div class="horizon-flow" aria-label="Sylora"><button data-horizon-view="live"><i>◉</i><span>LIVE</span></button><button data-horizon-view="clips"><i>▷</i><span>Clips</span></button><button data-horizon-view="studio"><i>✦</i><span>Studio</span></button><button class="horizon-create" data-horizon-create type="button"><i>+</i><span>\${esc(t('createHub'))}</span></button><button data-horizon-view="learning"><i>⌬</i><span>\${esc(t('science'))}</span></button><button data-horizon-view="business"><i>▱</i><span>\${esc(t('business'))}</span></button><button data-horizon-view="explore"><i>⌕</i><span>\${esc(t('explore'))}</span></button></div></section>
  <div class="ecosystem-feed">\${strip(t('recommendedLive'),liveCards,'live')}\${strip(t('people'),peopleCards,'explore')}<section class="eco-strip"><div class="eco-strip-head"><b>\${esc(t('forYou'))}</b></div><div class="eco-carousel"><button type="button" class="eco-card" data-eco-nav="clips"><b>Clips</b><small>Vertical</small></button><button type="button" class="eco-card" data-eco-nav="videos"><b>\${esc(t('videos'))}</b><small>Long-form</small></button><button type="button" class="eco-card" data-eco-nav="ai"><b>Sylora</b><small>\${esc(t('syloraListening'))}</small></button></div></section>\${strip(t('communities'),communityCards,'communities')}\${strip(t('science'),courseCards,'learning')}\${strip(t('business'),bizCards,'business')}</div>
  \${state.me?\`<form id="composer" class="card composer"><textarea name="text" maxlength="4000" placeholder="\${esc(t('composer'))} \${esc(state.me.displayName)}?"></textarea><button class="primary">\${esc(t('publish'))}</button></form>\`:\`<div class="card auth"><b>\${esc(t('joinTitle'))}</b><p class="muted">\${esc(t('joinText'))}</p><button id="join" class="primary">\${esc(t('join'))}</button></div>\`}
  <div id="feed">\${posts.map(postHtml).join('')||\`<div class="card post muted">\${esc(t('emptyFeed'))}</div>\`}</div>\`;
  document.querySelectorAll('[data-horizon-view]').forEach(x=>x.onclick=()=>nav(x.dataset.horizonView));
  document.querySelector('[data-horizon-create]')?.addEventListener('click',launchCreateHub);
  document.querySelectorAll('[data-eco-nav]').forEach(x=>x.onclick=()=>{const v=x.dataset.ecoNav;if(v==='live'&&x.dataset.liveId){state.intent=x.dataset.liveId;nav('live');return}nav(v)});
  document.querySelector('#join')?.addEventListener('click',renderAuth);
  document.querySelector('#composer')?.addEventListener('submit',async e=>{e.preventDefault();const text=new FormData(e.currentTarget).get('text');if(!String(text).trim())return;await api('/api/posts',{method:'POST',body:JSON.stringify({text})});toast(t('publish'));renderFeed()});
  if(state.intent==='composer'||state.intent==='post'){state.intent=null;requestAnimationFrame(()=>document.querySelector('#composer textarea')?.focus())}
  bindPosts();
}
`
);

replaceBetween(
  'async function renderMessages(){',
  'async function openConversation(id){',
  `async function renderMessages(){
  const tab=state.inboxTab||'messages';
  const [{conversations},{users},notes]=await Promise.all([api('/api/conversations'),api('/api/users'),api('/api/notifications').catch(()=>({notifications:[]}))]);
  const notesList=notes.notifications||[];
  const invites=notesList.filter(n=>/invite|conference|room|connect/i.test(String(n.type||'')));
  const calls=notesList.filter(n=>/call|video|voice/i.test(String(n.type||'')));
  const social=notesList.filter(n=>!invites.includes(n)&&!calls.includes(n));
  app.innerHTML=\`<div class="card hero messages-hero"><span class="eyebrow">SYLORA · INBOX</span><h1>Inbox</h1><p>\${esc(t('inboxMessages'))} · \${esc(t('inboxNotifications'))} · \${esc(t('inboxInvites'))} · \${esc(t('inboxCalls'))}</p></div>
  <div class="inbox-tabs">
    <button type="button" data-inbox-tab="messages" class="\${tab==='messages'?'active':''}">\${esc(t('inboxMessages'))}</button>
    <button type="button" data-inbox-tab="notifications" class="\${tab==='notifications'?'active':''}">\${esc(t('inboxNotifications'))}</button>
    <button type="button" data-inbox-tab="invites" class="\${tab==='invites'?'active':''}">\${esc(t('inboxInvites'))}</button>
    <button type="button" data-inbox-tab="calls" class="\${tab==='calls'?'active':''}">\${esc(t('inboxCalls'))}</button>
  </div>
  <div class="inbox-panel" \${tab==='messages'?'':'hidden'}><div class="messages-shell"><aside class="card conversation-panel"><div class="new-message"><span class="eyebrow">\${esc(t('inboxMessages'))}</span><div class="fields"><select id="newRecipient"><option value="">@</option>\${users.map(u=>\`<option value="\${u.id}">@\${esc(u.username)}</option>\`).join('')}</select><button id="newChat" class="primary">＋</button></div></div><div class="conversation-list">\${conversations.map(c=>{const other=c.members.find(x=>x.id!==state.me.id);const letter=(other?.displayName||other?.username||'?')[0].toUpperCase();return\`<button class="convo" data-id="\${c.id}"><span class="conversation-avatar">\${esc(letter)}</span><span><b>@\${esc(other?.username||'chat')}</b><small>\${esc(c.lastMessage?.text||'…')}</small></span></button>\`}).join('')||'<p class="muted conversation-empty">—</p>'}</div></aside><div id="chat" class="chat-space"><div class="card chat-placeholder"><span>◌</span><b>Inbox</b><p class="muted">\${esc(t('inboxMessages'))}</p></div></div></div></div>
  <div class="inbox-panel card" \${tab==='notifications'?'':'hidden'}>\${social.map(n=>\`<div class="profile-event"><i>✦</i><span><b>\${esc(n.actor?.username||'SYLORA')}</b><small>\${esc(n.type)}</small></span></div>\`).join('')||'<p class="muted">—</p>'}</div>
  <div class="inbox-panel card" \${tab==='invites'?'':'hidden'}>\${invites.map(n=>\`<div class="profile-event"><i>◇</i><span><b>\${esc(n.actor?.username||'SYLORA')}</b><small>\${esc(n.type)}</small></span></div>\`).join('')||\`<p class="muted">\${esc(t('inboxInvites'))}</p>\`}<div class="row" style="margin-top:12px"><button class="ghost" data-go="business">\${esc(t('business'))}</button><button class="ghost" data-go="learning">\${esc(t('science'))}</button></div></div>
  <div class="inbox-panel card" \${tab==='calls'?'':'hidden'}>\${calls.map(n=>\`<div class="profile-event"><i>◉</i><span><b>\${esc(n.actor?.username||'SYLORA')}</b><small>\${esc(n.type)}</small></span></div>\`).join('')||\`<p class="muted">\${esc(t('inboxCalls'))}</p>\`}<div class="row" style="margin-top:12px"><button class="ghost" data-go="live">LIVE</button><button class="ghost" data-go="ai">Sylora</button></div></div>\`;
  document.querySelectorAll('[data-inbox-tab]').forEach(b=>b.onclick=()=>{state.inboxTab=b.dataset.inboxTab;renderMessages()});
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>nav(b.dataset.go));
  if(tab==='messages'){
    document.querySelector('#newChat').onclick=async()=>{const userId=document.querySelector('#newRecipient').value;if(!userId)return;const {conversation}=await api('/api/conversations',{method:'POST',body:JSON.stringify({userId})});openConversation(conversation.id)};
    document.querySelectorAll('.convo').forEach(b=>b.onclick=()=>openConversation(b.dataset.id));
    if(conversations[0])openConversation(conversations[0].id);
  }
}
`
);

replaceBetween(
  'async function renderLive(){',
  'async function liveRtcConfig(){',
  `async function renderLive(){
  cleanupLiveViewer();
  const tab=state.liveTab||'discover';
  const {rooms}=await api('/api/live');
  const viewers=rooms.reduce((sum,r)=>sum+(Number(r.viewerCount)||0),0);
  let followingIds=new Set();
  if(state.me){try{const st=await api('/api/me');void st}catch{}}
  const list=rooms;
  const battles=rooms.filter((r,idx)=>idx<rooms.length-1);
  app.innerHTML=\`<div class="card hero"><span class="eyebrow"><i class="live-dot"></i>SYLORA LIVE</span><h1>LIVE</h1><p>Discover · Following · Create · Battles · Guests · Chat · Gifts · Studio</p><div class="scene-readout"><span><small>LIVE</small><b>\${rooms.length}</b></span><span><small>VIEWERS</small><b>\${viewers.toLocaleString()}</b></span></div>
  <div class="live-hub-tabs">
    <button type="button" data-live-tab="discover" class="\${tab==='discover'?'active':''}">\${esc(t('discoverLive'))}</button>
    <button type="button" data-live-tab="following" class="\${tab==='following'?'active':''}">\${esc(t('following'))}</button>
    <button type="button" data-live-tab="create" class="\${tab==='create'?'active':''}">\${esc(t('createLive'))}</button>
    <button type="button" data-live-tab="battles" class="\${tab==='battles'?'active':''}">\${esc(t('battles'))}</button>
    <button type="button" data-live-tab="studio" class="\${tab==='studio'?'active':''}">Studio</button>
  </div>
  \${state.me&&tab==='create'?\`<div class="card fields"><input id="liveTitle" maxlength="120" placeholder="LIVE"><button id="goLive" class="primary">＋ \${esc(t('createLive'))}</button><button class="ghost" id="openStudioFromLive">Creator Studio</button></div>\`:(state.me?'':\`<button id="liveLogin" class="primary">\${esc(t('signin'))}</button>\`)}
  </div>
  <div class="live-room-grid">\${(tab==='battles'?battles:list).map(r=>{const opponent=rooms.find(x=>x.id!==r.id&&x.host?.id!==r.host?.id);return\`<div class="card live-room-card"><div class="row"><div><span class="badge">● LIVE · \${r.viewerCount||0}</span><h3>\${esc(r.title)}</h3><p class="muted">@\${esc(r.host.username)}</p></div></div><div class="live-tools"><button class="primary watch-live" data-id="\${r.id}">Watch</button><button class="ghost open-live" data-id="\${r.id}">Chat</button>\${state.me?.id===r.host?.id&&opponent?\`<button class="ghost resonance-start" data-id="\${r.id}" data-opponent="\${opponent.id}">✦ Battle</button>\`:''}</div></div>\`}).join('')||'<div class="card empty">—</div>'}</div>
  <div id="livePlayer"></div><div id="liveChat"></div>\`;
  document.querySelectorAll('[data-live-tab]').forEach(b=>b.onclick=()=>{const v=b.dataset.liveTab;if(v==='studio')return nav('studio');state.liveTab=v;renderLive()});
  document.querySelector('#liveLogin')?.addEventListener('click',renderAuth);
  document.querySelector('#openStudioFromLive')?.addEventListener('click',()=>nav('studio'));
  document.querySelector('#goLive')?.addEventListener('click',async()=>{const title=document.querySelector('#liveTitle')?.value||'SYLORA LIVE';await api('/api/live',{method:'POST',body:JSON.stringify({title})});state.liveTab='discover';renderLive()});
  document.querySelectorAll('.open-live').forEach(b=>b.onclick=()=>openLiveChat(b.dataset.id));
  document.querySelectorAll('.watch-live').forEach(b=>b.onclick=()=>watchLive(b.dataset.id));
  document.querySelectorAll('.resonance-start').forEach(b=>b.onclick=async()=>{try{await api(\`/api/live/\${b.dataset.id}/resonance\`,{method:'POST',body:JSON.stringify({opponentLiveId:b.dataset.opponent})});toast('Resonance Battle')}catch(e){toast(humanError(e.message))}});
  if(state.intent&&rooms.some(r=>r.id===state.intent)){const id=state.intent;state.intent=null;watchLive(id)}
}
`
);

replaceBetween(
  'async function renderLearning(){',
  'async function openCourse(id){',
  `async function renderLearning(){
  const [{courses},conferenceData,users]=await Promise.all([
    api('/api/courses'),
    state.me?api('/api/conferences?kind=science'):Promise.resolve({rooms:[]}),
    api('/api/users').catch(()=>({users:[]}))
  ]);
  const researchers=(users.users||[]).slice(0,6);
  app.innerHTML=\`<div class="card hero"><span class="eyebrow">SYLORA SCIENCE · RESEARCH</span><h1>\${esc(t('science'))}</h1><p>Researchers · Circles · courses · collaboration · AI research workspace</p><div class="scene-readout"><span><small>COURSES</small><b>\${courses.length}</b></span><span><small>CIRCLES</small><b>\${conferenceData.rooms.length}</b></span><span><small>PEOPLE</small><b>\${researchers.length}</b></span></div></div>
  <div class="science-research-grid">
    <section class="card"><span class="eyebrow">RESEARCHERS</span><div class="stack">\${researchers.map(u=>\`<div class="item"><b>\${esc(u.displayName||u.username)}</b><p class="muted">@\${esc(u.username)}</p></div>\`).join('')||'<p class="muted">—</p>'}</div></section>
    <section class="card"><span class="eyebrow">RESOURCES</span><p class="muted">Papers / resources attach to courses & circles. Shared communications for private research rooms.</p><button class="ghost" data-go-ai>Sylora Research</button></section>
  </div>
  \${state.me?conferenceHubHtml('science',conferenceData.rooms):''}
  \${state.me?'<form id="courseForm" class="card auth fields"><input name="title" placeholder="Course" required><textarea name="description" placeholder="…"></textarea><input name="price" type="number" min="0" value="0"><button class="primary">'+esc(t('createCourse'))+'</button></form>':''}
  \${courses.map(c=>\`<div class="card item"><span class="badge">\${c.price?\`◈ \${c.price}\`:'FREE'}</span><h3>\${esc(c.title)}</h3><p class="muted">\${esc(c.description)} · \${c.lessonCount} lessons</p><button class="ghost open-course" data-id="\${c.id}">Open</button></div>\`).join('')||'<div class="card empty">—</div>'}\`;
  if(state.me)bindConferenceHub('science',renderLearning);
  document.querySelector('[data-go-ai]')?.addEventListener('click',()=>{state.intent=null;nav('ai')});
  document.querySelector('#courseForm')?.addEventListener('submit',async e=>{e.preventDefault();const {course}=await api('/api/courses',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});await api(\`/api/courses/\${course.id}/lessons\`,{method:'POST',body:JSON.stringify({title:'Intro',content:'Lesson 1'})});await api(\`/api/courses/\${course.id}/publish\`,{method:'POST'});renderLearning()});
  document.querySelectorAll('.open-course').forEach(b=>b.onclick=()=>openCourse(b.dataset.id));
  if(state.intent==='course'){state.intent=null;document.querySelector('#courseForm input[name="title"]')?.focus()}
}
`
);

replaceBetween(
  'async function renderBusiness(){',
  'function mountSyloraPressInteractions(){',
  `async function renderBusiness(){
  const [{businesses},conferenceData,orgData]=await Promise.all([
    api('/api/businesses'),
    state.me?api('/api/conferences?kind=business'):Promise.resolve({rooms:[]}),
    state.me?api('/api/orgs'):Promise.resolve({organizations:[]})
  ]);
  const orgs=orgData.organizations||[];
  app.innerHTML=\`<div class="card hero"><span class="eyebrow">SYLORA BUSINESS · WORKSPACE</span><h1>\${esc(t('workspace'))}</h1><p>Companies · teams · projects · deal rooms · documents · tasks · Sylora</p><div class="scene-readout"><span><small>ORGS</small><b>\${orgs.length}</b></span><span><small>COMPANIES</small><b>\${businesses.length}</b></span><span><small>ROOMS</small><b>\${conferenceData.rooms.length}</b></span></div></div>
  \${state.me?\`<section class="card org-workspace"><span class="eyebrow">BUSINESS OS</span><h3>\${esc(t('workspace'))}</h3>
  <form id="orgForm" class="fields"><input name="name" required placeholder="Organization"><button class="primary">\${esc(t('createHub'))}</button></form>
  <div class="stack">\${orgs.map(o=>\`<div class="item"><b>\${esc(o.name)}</b><div class="row"><button type="button" class="primary open-org-workspace" data-id="\${o.id}">\${esc(t('workspace'))}</button><button type="button" class="ghost add-org-team" data-id="\${o.id}">+ \${esc(t('teams'))}</button><button type="button" class="ghost add-org-doc" data-id="\${o.id}">+ \${esc(t('documents'))}</button><button type="button" class="ghost add-org-task" data-id="\${o.id}">+ \${esc(t('tasks'))}</button></div></div>\`).join('')||'<p class="muted">—</p>'}</div>
  <div id="orgWorkspacePanel" class="org-workspace"></div></section>\`:''}
  \${state.me?conferenceHubHtml('business',conferenceData.rooms):''}
  \${state.me?'<form id="businessForm" class="card auth fields"><input name="name" placeholder="Company" required><textarea name="description"></textarea><input name="website" placeholder="https://"><button class="primary">Company profile</button></form>':''}
  \${businesses.map(b=>\`<div class="card item business-company"><span class="business-emblem">◈</span><div><span class="eyebrow">COMPANY</span><h3>\${esc(b.name)}</h3><p class="muted">\${esc(b.description)}</p>\${b.website?\`<span class="badge">\${esc(b.website)}</span>\`:''}</div></div>\`).join('')||'<div class="card empty">—</div>'}\`;
  if(state.me)bindConferenceHub('business',renderBusiness);
  document.querySelector('#orgForm')&&(document.querySelector('#orgForm').onsubmit=async e=>{e.preventDefault();const name=new FormData(e.currentTarget).get('name');await api('/api/orgs',{method:'POST',body:JSON.stringify({name})});toast('OK');renderBusiness()});
  const showWorkspace=async id=>{
    const out=await api(\`/api/orgs/\${id}/workspace\`);
    const panel=document.querySelector('#orgWorkspacePanel');if(!panel)return;
    panel.innerHTML=\`<div class="grid3"><div class="card item"><span class="eyebrow">\${esc(t('teams'))}</span>\${(out.teams||[]).map(x=>\`<p><b>\${esc(x.name)}</b></p>\`).join('')||'<p class="muted">—</p>'}</div><div class="card item"><span class="eyebrow">\${esc(t('documents'))}</span>\${(out.documents||[]).map(d=>\`<p><b>\${esc(d.title)}</b></p>\`).join('')||'<p class="muted">—</p>'}</div><div class="card item"><span class="eyebrow">\${esc(t('tasks'))}</span>\${(out.tasks||[]).map(x=>\`<p><b>\${esc(x.title)}</b></p>\`).join('')||'<p class="muted">—</p>'}</div></div>\`;
  };
  document.querySelectorAll('.open-org-workspace').forEach(b=>b.onclick=()=>showWorkspace(b.dataset.id));
  document.querySelectorAll('.add-org-team').forEach(b=>b.onclick=async()=>{const name=prompt(t('teams'));if(!name)return;await api(\`/api/orgs/\${b.dataset.id}/teams\`,{method:'POST',body:JSON.stringify({name})});toast('OK');showWorkspace(b.dataset.id)});
  document.querySelectorAll('.add-org-doc').forEach(b=>b.onclick=async()=>{const title=prompt(t('documents'));if(!title)return;await api(\`/api/orgs/\${b.dataset.id}/documents\`,{method:'POST',body:JSON.stringify({title})});toast('OK');showWorkspace(b.dataset.id)});
  document.querySelectorAll('.add-org-task').forEach(b=>b.onclick=async()=>{const title=prompt(t('tasks'));if(!title)return;await api(\`/api/orgs/\${b.dataset.id}/tasks\`,{method:'POST',body:JSON.stringify({title})});toast('OK');showWorkspace(b.dataset.id)});
  document.querySelector('#businessForm')?.addEventListener('submit',async e=>{e.preventDefault();await api('/api/businesses',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});renderBusiness()});
  if(state.intent==='room'||state.intent==='project'){state.intent=null;document.querySelector('[data-conference-create="business"] input[name="title"]')?.focus()}
}

`

);

fs.writeFileSync(path, text);
console.log('patched', path, 'bytes', text.length);
