#!/usr/bin/env node
import fs from 'node:fs';

const path = 'public/app.js';
let text = fs.readFileSync(path, 'utf8');

function replaceBetween(startMarker, endMarker, replacement) {
  const i = text.indexOf(startMarker);
  if (i < 0) throw new Error(`Missing start: ${startMarker.slice(0, 80)}`);
  const j = text.indexOf(endMarker, i + startMarker.length);
  if (j < 0) throw new Error(`Missing end: ${endMarker.slice(0, 80)}`);
  text = text.slice(0, i) + replacement + text.slice(j);
}

// Degraded capabilities banner helper after launchCommandPalette
const helperMark = 'function launchCommandPalette(){openCommandPalette({t,esc,api,onNavigate:v=>nav(v),onCreate:launchCreateHub,onAiSearch:q=>{state.intent=q;nav(\'ai\')}})}\n';
if (!text.includes(helperMark)) throw new Error('launchCommandPalette missing');
if (!text.includes('async function refreshCapabilities')) {
  text = text.replace(helperMark, helperMark + `let syloraCapabilities=null;
async function refreshCapabilities(){try{syloraCapabilities=await api('/api/ai/capabilities')}catch{syloraCapabilities=null}const bar=document.querySelector('#syloraDegraded');if(!bar)return;if(syloraCapabilities?.degraded?.ai||syloraCapabilities?.degraded?.voice){bar.hidden=false;bar.textContent=syloraCapabilities.degraded.ai?'Sylora text AI temporarily unavailable — Inbox, LIVE and create still work.':('Voice unavailable — text still works.')}else bar.hidden=true}
function degradedBannerHtml(){return '<div id="syloraDegraded" class="sylora-degraded" hidden></div>'}
`);
}

// Inject banner mount into bootstrap after applyShellLanguage
text = text.replace(
  'applyShellLanguage();\n  account();',
  "applyShellLanguage();\n  if(!document.querySelector('#syloraDegraded'))document.body.insertAdjacentHTML('afterbegin',degradedBannerHtml());\n  refreshCapabilities();\n  account();"
);

replaceBetween(
  'async function renderFeed(){',
  'function postHtml(p){',
  `async function renderFeed(){
  let posts=[],rooms=[],users=[],communities=[],courses=[],businesses=[],hub=null;
  try{const feed=await api('/api/feed');posts=Array.isArray(feed.posts)?feed.posts:[]}catch(error){reportClientIssue('feed',error)}
  try{rooms=(await api('/api/live')).rooms||[]}catch{}
  try{users=((await api('/api/users')).users||[]).filter(u=>!state.me||u.id!==state.me.id).slice(0,8)}catch{}
  try{communities=(await api('/api/communities')).communities||[]}catch{}
  try{courses=(await api('/api/courses')).courses||[]}catch{}
  try{businesses=(await api('/api/businesses')).businesses||[]}catch{}
  if(state.me)try{hub=(await api('/api/home/hub')).hub}catch{}
  const hour=new Date().getHours(),hello=hour<12?'Добрий ранок':hour<18?'Добрий день':'Добрий вечір',name=state.me?.displayName||'у SYLORA';
  const liveCards=(hub?.live||rooms).slice(0,8).map(r=>\`<button type="button" class="eco-card live" data-eco-nav="live" data-live-id="\${r.id}"><b>● \${esc(r.title)}</b><small>@\${esc(r.host?.username||'creator')} · \${r.viewerCount||0}</small></button>\`);
  const peopleCards=users.map(u=>\`<button type="button" class="eco-card" data-eco-nav="explore"><b>\${esc(u.displayName||u.username)}</b><small>@\${esc(u.username)}</small></button>\`);
  const communityCards=(hub?.communities||communities||[]).slice(0,6).map(c=>\`<button type="button" class="eco-card" data-eco-nav="communities"><b>\${esc(c.name)}</b><small>\${c.members||0}</small></button>\`);
  const courseCards=(hub?.learning?.length?hub.learning:courses).slice(0,6).map(c=>\`<button type="button" class="eco-card" data-eco-nav="learning" data-course="\${c.id||''}"><b>\${esc(c.title)}</b><small>\${c.progress!=null?\`\${Math.round(c.progress*100)}%\`:(c.price?\`◈ \${c.price}\`:'FREE')}</small></button>\`);
  const bizCards=(hub?.projects?.length?hub.projects.map(o=>({name:o.name,description:'Workspace'})):businesses).slice(0,6).map(b=>\`<button type="button" class="eco-card" data-eco-nav="business"><b>\${esc(b.name)}</b><small>\${esc((b.description||'').slice(0,80))}</small></button>\`);
  const strip=(title,cards,more)=>\`<section class="eco-strip"><div class="eco-strip-head"><b>\${esc(title)}</b><button type="button" data-eco-nav="\${more}">→</button></div><div class="eco-carousel">\${cards.length?cards.join(''):\`<button type="button" class="eco-card" data-eco-nav="\${more}"><b>\${esc(t('explore'))}</b><small>\${esc(t('emptyFeed'))}</small></button>\`}</div></section>\`;
  const continueHtml=hub?.continue?.length?\`<section class="eco-strip home-continue"><div class="eco-strip-head"><b>Continue</b></div><div class="eco-carousel">\${hub.continue.map(item=>\`<button type="button" class="eco-card" data-eco-nav="\${item.view}" data-live-id="\${item.id||''}"><b>\${esc(item.kind)}</b><small>\${esc(item.label||'')}</small></button>\`).join('')}</div></section>\`:'';
  const inboxHtml=hub?\`<section class="eco-strip"><div class="eco-strip-head"><b>Inbox</b><button type="button" data-eco-nav="messages">→</button></div><div class="eco-carousel"><button type="button" class="eco-card" data-eco-nav="messages"><b>\${hub.inboxPreview.unreadNotifications} notifications</b><small>\${(hub.inboxPreview.conversations||[]).length} conversations</small></button>\${(hub.inboxPreview.conversations||[]).slice(0,3).map(c=>\`<button type="button" class="eco-card" data-eco-nav="messages"><b>Message</b><small>\${esc((c.preview||'').slice(0,60))}</small></button>\`).join('')}</div></section>\`:'';
  const syloraRec=(hub?.syloraRecommendations||[]).map(r=>\`<button type="button" class="eco-card" data-eco-nav="\${r.view}" data-live-id="\${r.id||''}"><b>Sylora</b><small>\${esc(r.text)}</small></button>\`).join('');
  app.innerHTML=\`<section class="living-horizon home-compact"><div class="horizon-copy"><span class="eyebrow">SYLORA · HOME</span><h1>\${hello}, \${esc(name)}!</h1><p>Твій персональний центр.</p></div><button class="sylora-presence" data-horizon-view="ai" type="button"><span class="sylora-presence-image"></span><span class="sylora-presence-copy"><small><i></i> SYLORA</small><b>Sylora</b><em>\${esc(t('syloraListening'))}</em><strong>\${esc(t('talkWithSylora'))} <span>→</span></strong></span></button><div class="horizon-flow" aria-label="Sylora"><button data-horizon-view="live"><i>◉</i><span>LIVE</span></button><button data-horizon-view="clips"><i>▷</i><span>Clips</span></button><button data-horizon-view="studio"><i>✦</i><span>Studio</span></button><button class="horizon-create" data-horizon-create type="button"><i>+</i><span>\${esc(t('createHub'))}</span></button><button data-horizon-view="messages"><i>◌</i><span>Inbox</span></button><button data-horizon-view="learning"><i>⌬</i><span>\${esc(t('science'))}</span></button><button data-horizon-view="business"><i>▱</i><span>\${esc(t('business'))}</span></button></div></section>
  <div class="ecosystem-feed">\${continueHtml}\${inboxHtml}\${strip(t('recommendedLive'),liveCards,'live')}\${strip(t('people'),peopleCards,'explore')}<section class="eco-strip"><div class="eco-strip-head"><b>\${esc(t('forYou'))}</b></div><div class="eco-carousel"><button type="button" class="eco-card" data-eco-nav="clips"><b>Clips</b><small>Vertical</small></button><button type="button" class="eco-card" data-eco-nav="videos"><b>\${esc(t('videos'))}</b><small>Long-form</small></button>\${syloraRec}</div></section>\${strip(t('communities'),communityCards,'communities')}\${strip(t('science'),courseCards,'learning')}\${strip(t('business'),bizCards,'business')}</div>
  \${state.me?\`<form id="composer" class="card composer"><textarea name="text" maxlength="4000" placeholder="\${esc(t('composer'))} \${esc(state.me.displayName)}?"></textarea><button class="primary">\${esc(t('publish'))}</button></form>\`:\`<div class="card auth"><b>\${esc(t('joinTitle'))}</b><p class="muted">\${esc(t('joinText'))}</p><button id="join" class="primary">\${esc(t('join'))}</button></div>\`}
  <div id="feed">\${posts.map(postHtml).join('')||\`<div class="card post muted">\${esc(t('emptyFeed'))}</div>\`}</div>\`;
  document.querySelectorAll('[data-horizon-view]').forEach(x=>x.onclick=()=>nav(x.dataset.horizonView));
  document.querySelector('[data-horizon-create]')?.addEventListener('click',launchCreateHub);
  document.querySelectorAll('[data-eco-nav]').forEach(x=>x.onclick=()=>{const v=x.dataset.ecoNav;if(v==='live'&&x.dataset.liveId){state.intent=x.dataset.liveId;nav('live');return}if(v==='learning'&&x.dataset.course){state.intent=x.dataset.course;nav('learning');return}nav(v)});
  document.querySelector('#join')?.addEventListener('click',renderAuth);
  document.querySelector('#composer')?.addEventListener('submit',async e=>{e.preventDefault();const text=new FormData(e.currentTarget).get('text');if(!String(text).trim())return;await api('/api/posts',{method:'POST',body:JSON.stringify({text})});toast(t('publish'));renderFeed()});
  if(state.intent==='composer'||state.intent==='post'){state.intent=null;requestAnimationFrame(()=>document.querySelector('#composer textarea')?.focus())}
  bindPosts();
}
`
);

replaceBetween(
  'async function renderSecurityCenter(){',
  'function syloraSpeechLocale(){',
  `async function renderSecurityCenter(){
  const [security,reputation,activity,intel]=await Promise.all([
    api('/api/security-center'),
    api('/api/reputation'),
    api('/api/ai/activity').catch(()=>({activity:[]})),
    api('/api/ai/intelligence').catch(()=>({}))
  ]);
  const ai=security.aiControl||{};
  const controls=ai.privacyControls||{};
  const controlKeys=['memory','microphone','camera','location','contacts','files','notifications','personalization','aiActions','voice','translation'];
  app.innerHTML=\`<div class="card hero"><span class="eyebrow">PRIVACY & AI CONTROL</span><h1>Trust Center</h1><p>Одна Sylora · прозорі дозволи · твій контроль.</p></div>
  <section class="card"><span class="eyebrow">CONTROLS</span><div class="privacy-grid">\${controlKeys.map(k=>\`<label class="privacy-toggle"><input type="checkbox" data-privacy="\${k}" \${controls[k]!==false?'checked':''}> \${esc(k)}</label>\`).join('')}</div>
  <div class="row" style="margin-top:12px"><label>Proactive <select id="privacyProactive"><option value="OFF">OFF</option><option value="IMPORTANT_ONLY">IMPORTANT ONLY</option><option value="NORMAL">NORMAL</option><option value="PROACTIVE">PROACTIVE</option></select></label><button class="primary" id="savePrivacyControls">Save controls</button></div></section>
  <section class="card"><span class="eyebrow">WHAT SYLORA CAN SEE</span><p>\${(ai.canSee||[]).map(esc).join(' · ')||'—'}</p>
  <span class="eyebrow">MEMORY</span><div class="stack">\${(ai.remembers||[]).map(m=>\`<div class="item"><b>\${esc(m.label)}</b><small class="muted">\${esc(m.source||'')}</small></div>\`).join('')||'<p class="muted">—</p>'}</div>
  <span class="eyebrow">INTEGRATIONS</span><div class="stack">\${(ai.integrations||[]).map(i=>\`<div class="item row"><b>\${esc(i.name)}</b><button class="ghost revoke-agent" data-id="\${i.agentId}">Disconnect</button></div>\`).join('')||'<p class="muted">—</p>'}</div></section>
  <section class="card"><span class="eyebrow">ACTIVITY LOG</span><div class="stack">\${(activity.activity||ai.activity||[]).slice().reverse().slice(0,30).map(a=>\`<div class="item"><b>\${esc(a.summary||a.kind)}</b><p class="muted">\${esc(a.reason||'')} · \${esc(a.context||'')} · \${a.createdAt?new Date(a.createdAt).toLocaleString():''}</p></div>\`).join('')||'<p class="muted">Поки немає дій Sylora.</p>'}</div></section>
  <div class="grid2"><div class="card item"><span class="eyebrow">DATA</span>
  <button class="ghost" id="exportMemory">Export my data</button>
  <button class="ghost" id="clearMemory">Delete memories</button>
  <button class="ghost" id="clearHistory">Delete conversation history</button>
  <button class="ghost" id="privacyExport">Export account request</button>
  <button class="ghost" id="disablePersonalization">Disable personalization</button></div>
  <div class="card item"><span class="eyebrow">REPUTATION</span>\${Object.entries(reputation.reputation?.dimensions||{}).map(([k,v])=>\`<div><b>\${esc(k)}</b>: \${Number(v.score||0)}</div>\`).join('')}<button class="ghost" id="disputeRep">Dispute</button>
  <p class="muted">Capabilities: AI \${ai.capabilities?.aiText?'on':'off'} · Voice \${ai.capabilities?.aiRealtimeVoice?'on':'off'}</p></div></div>\`;
  document.querySelector('#privacyProactive').value=ai.proactiveLevel||intel.proactive||'IMPORTANT_ONLY';
  document.querySelector('#savePrivacyControls').onclick=async()=>{
    const patch={};document.querySelectorAll('[data-privacy]').forEach(el=>{patch[el.dataset.privacy]=el.checked});
    patch.proactiveLevel=document.querySelector('#privacyProactive').value;
    await api('/api/ai/privacy-controls',{method:'PATCH',body:JSON.stringify(patch)});
    toast('OK');renderSecurityCenter();
  };
  document.querySelector('#exportMemory').onclick=async()=>{const out=await api('/api/ai/memory/export');const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sylora-ai-memory.json';a.click();toast('Export ready')};
  document.querySelector('#clearMemory').onclick=async()=>{if(!confirm('Delete all AI memories?'))return;await api('/api/ai/memory',{method:'DELETE'});toast('Memories cleared');renderSecurityCenter()};
  document.querySelector('#clearHistory').onclick=async()=>{if(!confirm('Delete conversation history?'))return;await api('/api/ai/history',{method:'DELETE'});toast('History cleared');renderSecurityCenter()};
  document.querySelector('#privacyExport').onclick=async()=>{await api('/api/privacy/requests',{method:'POST',body:JSON.stringify({type:'export',details:'User requested account data export'})});toast('Request queued')};
  document.querySelector('#disablePersonalization').onclick=async()=>{await api('/api/ai/privacy-controls',{method:'PATCH',body:JSON.stringify({personalization:false,proactiveLevel:'OFF'})});toast('Personalization off');renderSecurityCenter()};
  document.querySelectorAll('.revoke-agent').forEach(b=>b.onclick=async()=>{await api(\`/api/agents/\${b.dataset.id}/install\`,{method:'DELETE'});toast('Disconnected');renderSecurityCenter()});
  document.querySelector('#disputeRep').onclick=async()=>{await api('/api/reputation/dispute',{method:'POST',body:JSON.stringify({dimension:'trust',reason:'User disputes trust score accuracy'})});toast('Dispute opened');renderSecurityCenter()};
}

`
);

// Enhance openCourse with quiz
text = text.replace(
  "document.querySelectorAll('.complete-lesson').forEach(b=>b.onclick=async()=>{await api(`/api/lessons/${b.dataset.id}/progress`,{method:'POST',body:'{}'});await openCourse(id)});",
  `document.querySelectorAll('.complete-lesson').forEach(b=>b.onclick=async()=>{await api(\`/api/lessons/\${b.dataset.id}/progress\`,{method:'POST',body:'{}'});await openCourse(id)});
    document.querySelectorAll('.lesson-quiz').forEach(b=>b.onclick=async()=>{
      const quizBox=document.querySelector('#lessonQuiz');
      const out=await api(\`/api/lessons/\${b.dataset.id}/quiz\`);
      const q=out.quiz.questions[0];
      quizBox.innerHTML=\`<div class="card"><span class="eyebrow">SYLORA LEARNING · QUIZ</span><p>\${esc(q.prompt)}</p><div class="stack">\${q.options.map(o=>\`<button class="ghost quiz-opt" data-qid="\${q.id}" data-oid="\${o.id}" data-quiz="\${out.quiz.id}">\${esc(o.text)}</button>\`).join('')}</div><p class="muted">Adaptive: \${esc(out.adaptive?.difficulty||'')}</p></div>\`;
      quizBox.querySelectorAll('.quiz-opt').forEach(opt=>opt.onclick=async()=>{
        const grade=await api(\`/api/quizzes/\${opt.dataset.quiz}/attempt\`,{method:'POST',body:JSON.stringify({answers:{[opt.dataset.qid]:opt.dataset.oid}})});
        toast(grade.correct?'Correct':'Try another explanation');
        quizBox.insertAdjacentHTML('beforeend',\`<p class="muted">\${esc(grade.explanation)} · next: \${esc(grade.adaptive?.nextStep||'')}</p>\`);
      });
    });`
);

// Add quiz button in openCourse lesson template
text = text.replace(
  "${!l.completed?`<button class=\"ghost complete-lesson\" data-id=\"${l.id}\">Позначити виконаним</button>`:''}`}</article>`).join('')}</div>`;",
  "${!l.completed?`<button class=\"ghost complete-lesson\" data-id=\"${l.id}\">Позначити виконаним</button>`:''}<button class=\"ghost lesson-quiz\" data-id=\"${l.id}\">Quiz</button>`}</article>`).join('')}</div><div id=\"lessonQuiz\"></div>`;"
);

// Business meeting tools after org workspace panel open
text = text.replace(
  "document.querySelectorAll('.open-org-workspace').forEach(b=>b.onclick=()=>showWorkspace(b.dataset.id));",
  `document.querySelectorAll('.open-org-workspace').forEach(b=>b.onclick=async()=>{await showWorkspace(b.dataset.id);const panel=document.querySelector('#orgWorkspacePanel');if(!panel)return;panel.insertAdjacentHTML('beforeend',\`<div class="card fields"><span class="eyebrow">SYLORA BUSINESS</span><input id="meetTitle" placeholder="Meeting title"><textarea id="meetNotes" placeholder="Notes / transcript"></textarea><div class="row"><button type="button" class="ghost" id="meetBrief">Meeting brief</button><button type="button" class="primary" id="meetSummary">Summary + decisions</button></div><pre id="meetOut" hidden style="white-space:pre-wrap;font-size:12px"></pre></div>\`);
    document.querySelector('#meetBrief').onclick=async()=>{const out=await api(\`/api/orgs/\${b.dataset.id}/meeting-brief\`,{method:'POST',body:JSON.stringify({title:document.querySelector('#meetTitle').value||'Brief',agenda:document.querySelector('#meetNotes').value||''})});const pre=document.querySelector('#meetOut');pre.hidden=false;pre.textContent=JSON.stringify(out.brief,null,2);toast('Brief saved as document')};
    document.querySelector('#meetSummary').onclick=async()=>{const out=await api(\`/api/orgs/\${b.dataset.id}/meeting-summary\`,{method:'POST',body:JSON.stringify({title:document.querySelector('#meetTitle').value||'Summary',notes:document.querySelector('#meetNotes').value||''})});const pre=document.querySelector('#meetOut');pre.hidden=false;pre.textContent=JSON.stringify({summary:out.summary,proposedTasks:out.proposedTasks},null,2);if(out.proposedTasks?.length&&confirm('Create proposed tasks? (legal/financial skipped unless confirmed)')){await api(\`/api/orgs/\${b.dataset.id}/proposed-tasks/confirm\`,{method:'POST',body:JSON.stringify({tasks:out.proposedTasks.map(t=>({...t,confirmed:!t.financialOrLegal}))})});toast('Tasks created');showWorkspace(b.dataset.id)}};
  });`
);

// Studio creator insights panel - append after AI LIVE plan block try/catch
text = text.replace(
  '}catch(err){console.warn(err)}\n\n',
  `}catch(err){console.warn(err)}
  try{
    const intel=document.createElement('section');intel.className='card';intel.innerHTML=\`<span class="eyebrow">CREATOR INTELLIGENCE</span><h3>LIVE insights · clips · captions</h3><select id="creatorLiveSelect"><option value="">Select your LIVE</option>\${ownRooms.map(r=>\`<option value="\${r.id}">\${esc(r.title)}</option>\`).join('')}</select><button id="creatorInsightsBtn" class="primary" type="button">Analyze LIVE</button><button id="creatorPackBtn" class="ghost" type="button">Content pack</button><pre id="creatorIntelOut" hidden style="white-space:pre-wrap;font-size:12px"></pre>\`;
    document.querySelector('#app')?.append(intel);
    document.querySelector('#creatorInsightsBtn')?.addEventListener('click',async()=>{const id=document.querySelector('#creatorLiveSelect').value;if(!id)return toast('Select LIVE');const out=await api(\`/api/live/\${id}/creator-insights\`);const pre=document.querySelector('#creatorIntelOut');pre.hidden=false;pre.textContent=JSON.stringify(out,null,2)});
    document.querySelector('#creatorPackBtn')?.addEventListener('click',async()=>{const topic=document.querySelector('#overlayTitle')?.value||'SYLORA LIVE';const out=await api('/api/studio/ai/content-pack',{method:'POST',body:JSON.stringify({topic})});const pre=document.querySelector('#creatorIntelOut');pre.hidden=false;pre.textContent=JSON.stringify(out.pack,null,2);toast('Draft pack — confirmation required to publish')});
  }catch(err){console.warn(err)}

`
);

fs.writeFileSync(path, text);
console.log('patched platform intel UI', text.length);
