/**
 * UI patches for Universal Command / Memory Center / honesty / Ask Sylora / Events.
 */
import fs from 'node:fs';

const appPath = 'public/app.js';
let app = fs.readFileSync(appPath, 'utf8');

function replaceOnce(src, find, repl, label) {
  if (!src.includes(find)) throw new Error(`patch miss: ${label}`);
  return src.replace(find, repl);
}

// Honesty label on LUMEN wallet
app = replaceOnce(
  app,
  'title="LUMEN">◈ ${(state.wallet?.balance||0).toLocaleString()}</button>',
  'title="LUMEN">◈ ${(state.wallet?.balance||0).toLocaleString()} <small class="muted">TEST</small></button>',
  'lumen-test'
);

// Ask Sylora on posts
app = replaceOnce(
  app,
  '${state.me&&p.author?.id!==state.me.id?`<button class="follow" data-user="${p.author.id}">＋ Підписатися</button><button class="report-post" data-post="${p.id}">⚑ Report</button><button class="block-user" data-user="${p.author.id}">⊘ Block</button>`:\'\'}</div>',
  '${state.me?`<button class="ask-sylora ghost" data-type="post" data-id="${p.id}">Ask Sylora</button>`:\'\'}${state.me&&p.author?.id!==state.me.id?`<button class="follow" data-user="${p.author.id}">＋ Підписатися</button><button class="report-post" data-post="${p.id}">⚑ Report</button><button class="block-user" data-user="${p.author.id}">⊘ Block</button>`:\'\'}</div>',
  'ask-post'
);

app = replaceOnce(
  app,
  'document.querySelectorAll(\'.block-user\').forEach(b=>b.onclick=async()=>{if(!confirm(\'Заблокувати цього користувача?\'))return;await api(`/api/users/${b.dataset.user}/block`,{method:\'POST\'});toast(\'Користувача заблоковано\');renderFeed()})}',
  `document.querySelectorAll('.block-user').forEach(b=>b.onclick=async()=>{if(!confirm('Заблокувати цього користувача?'))return;await api(\`/api/users/\${b.dataset.user}/block\`,{method:'POST'});toast('Користувача заблоковано');renderFeed()});document.querySelectorAll('.ask-sylora').forEach(b=>b.onclick=async()=>{if(!state.me)return renderAuth();const q=prompt('Ask Sylora','поясни')||'поясни';try{const out=await api('/api/ai/ask',{method:'POST',body:JSON.stringify({contentType:b.dataset.type,contentId:b.dataset.id,question:q,view:state.view})});toast(out.answer||'OK')}catch(e){toast(humanError(e.message))}})}`,
  'ask-bind'
);

// Explore → universal search
app = replaceOnce(
  app,
  'async function renderExplore(){app.innerHTML=`<div class="card hero"><span class="eyebrow">SYLORA DISCOVERY · CONNECTIONS</span><h1>Знайди своїх.</h1><p>Люди, ідеї, спільноти, наука та бізнес — через один простір відкриттів.</p><div class="discovery-orbits"><span>Люди</span><span>Ідеї</span><span>Science</span><span>Business</span></div></div><form id="search" class="card searchbar discovery-search"><input name="q" minlength="2" placeholder="Кого або що шукаємо у SYLORA?" autofocus><button class="primary">Знайти</button></form><div id="results" class="discovery-results"></div>`;document.querySelector(\'#search\').onsubmit=async e=>{e.preventDefault();const q=new FormData(e.currentTarget).get(\'q\');const r=await api(`/api/search?q=${encodeURIComponent(q)}`);const sections=[[\'Люди\',r.users,u=>`@${esc(u.username)} · ${esc(u.displayName)}`],[\'Публікації\',r.posts,p=>`${esc(p.author.username)}: ${esc(p.text)}`],[\'Спільноти\',r.communities,x=>esc(x.name)],[\'Курси\',r.courses,x=>esc(x.title)],[\'Бізнес\',r.businesses,x=>esc(x.name)]];document.querySelector(\'#results\').innerHTML=sections.map(([name,items,fn])=>`<div class="card item"><span class="eyebrow">${name}</span>${items.map(x=>`<p>${fn(x)}</p>`).join(\'\')||\'<p class="muted">Нічого не знайдено</p>\'}</div>`).join(\'\')}}',
  `async function renderExplore(){app.innerHTML=\`<div class="card hero"><span class="eyebrow">UNIVERSAL SEARCH</span><h1>Знайди своїх.</h1><p>People · Posts · Videos · LIVE · Messages · Communities · Projects · Companies · Courses · Research · Files</p><div class="discovery-orbits"><span>Люди</span><span>Ідеї</span><span>Science</span><span>Business</span></div></div><form id="search" class="card searchbar discovery-search"><input name="q" minlength="2" placeholder="Кого або що шукаємо у SYLORA?" autofocus><button class="primary">Знайти</button></form><div id="results" class="discovery-results"></div>\`;document.querySelector('#search').onsubmit=async e=>{e.preventDefault();const q=new FormData(e.currentTarget).get('q');const [r,u]=await Promise.all([api(\`/api/search?q=\${encodeURIComponent(q)}\`),state.me?api(\`/api/search/universal?q=\${encodeURIComponent(q)}\`).catch(()=>null):null]);const sections=[['Люди',r.users,x=>\`@\${esc(x.username)} · \${esc(x.displayName)}\`],['Публікації',r.posts,p=>\`\${esc(p.author?.username||'')}: \${esc(p.text)}\`],['Спільноти',r.communities,x=>esc(x.name)],['Курси',r.courses,x=>esc(x.title)],['Бізнес',r.businesses,x=>esc(x.name)],['LIVE',r.lives||[],x=>esc(x.title)],['Agents',r.agents||[],x=>esc(x.name)]];let html=sections.map(([name,items,fn])=>\`<div class="card item"><span class="eyebrow">\${name}</span>\${(items||[]).map(x=>\`<p>\${fn(x)}</p>\`).join('')||'<p class="muted">Нічого не знайдено</p>'}</div>\`).join('');if(u?.semantic?.length){html+=\`<div class="card item"><span class="eyebrow">SEMANTIC \${u.semanticHonesty?.state==='degraded'?'· lexical fallback':''}</span>\${u.semantic.slice(0,12).map(x=>\`<p><b>\${esc(x.type)}</b> · \${esc(x.label||'')}</p>\`).join('')}<p class="muted">\${esc(u.semanticHonesty?.note||'')}</p></div>\`;}document.querySelector('#results').innerHTML=html}}`,
  'explore-universal'
);

// LIVE create tab: event form + Ask Sylora on rooms + honesty
app = replaceOnce(
  app,
  '${state.me&&tab===\'create\'?`<div class="card fields"><input id="liveTitle" maxlength="120" placeholder="LIVE"><button id="goLive" class="primary">＋ ${esc(t(\'createLive\'))}</button><button class="ghost" id="openStudioFromLive">Creator Studio</button></div>`:(state.me?\'\':`<button id="liveLogin" class="primary">${esc(t(\'signin\'))}</button>`)}',
  '${state.me&&tab===\'create\'?`<div class="card fields"><input id="liveTitle" maxlength="120" placeholder="LIVE"><button id="goLive" class="primary">＋ ${esc(t(\'createLive\'))}</button><button class="ghost" id="openStudioFromLive">Creator Studio</button><hr><input id="eventTitle" maxlength="160" placeholder="Event title"><input id="eventWhen" maxlength="80" placeholder="Starts (e.g. tomorrow 20:00)"><button id="createEventBtn" class="ghost">＋ ${esc(t(\'createEvent\'))}</button></div>`:(state.me?\'\':`<button id="liveLogin" class="primary">${esc(t(\'signin\'))}</button>`)}',
  'live-event-form'
);

app = replaceOnce(
  app,
  '<div class="live-tools"><button class="primary watch-live" data-id="${r.id}">Watch</button><button class="ghost open-live" data-id="${r.id}">Chat</button>${state.me?.id===r.host?.id&&opponent?`<button class="ghost resonance-start" data-id="${r.id}" data-opponent="${opponent.id}">✦ Battle</button>`:\'\'}</div></div>`',
  '<div class="live-tools"><button class="primary watch-live" data-id="${r.id}">Watch</button><button class="ghost open-live" data-id="${r.id}">Chat</button>${state.me?`<button class="ghost ask-live" data-id="${r.id}">Ask Sylora</button>`:\'\'}${state.me?.id===r.host?.id&&opponent?`<button class="ghost resonance-start" data-id="${r.id}" data-opponent="${opponent.id}">✦ Battle</button>`:\'\'}${state.me?.id===r.host?.id?`<button class="ghost live-copilot" data-id="${r.id}">Copilot</button>`:\'\'}</div></div>`',
  'live-ask'
);

app = replaceOnce(
  app,
  'document.querySelector(\'#goLive\')?.addEventListener(\'click\',async()=>{const title=document.querySelector(\'#liveTitle\')?.value||\'SYLORA LIVE\';await api(\'/api/live\',{method:\'POST\',body:JSON.stringify({title})});state.liveTab=\'discover\';renderLive()});',
  `document.querySelector('#goLive')?.addEventListener('click',async()=>{const title=document.querySelector('#liveTitle')?.value||'SYLORA LIVE';await api('/api/live',{method:'POST',body:JSON.stringify({title})});state.liveTab='discover';renderLive()});
  document.querySelector('#createEventBtn')?.addEventListener('click',async()=>{const title=document.querySelector('#eventTitle')?.value||'SYLORA Event';const startsAt=document.querySelector('#eventWhen')?.value||'tba';await api('/api/platform-events',{method:'POST',body:JSON.stringify({title,startsAt,mode:'online'})});toast('Event created');state.liveTab='discover';renderLive()});
  document.querySelectorAll('.ask-live').forEach(b=>b.onclick=async()=>{const q=prompt('Ask Sylora','що я пропустив?')||'що я пропустив?';try{const out=await api('/api/ai/ask',{method:'POST',body:JSON.stringify({contentType:'live',contentId:b.dataset.id,question:q,view:'live'})});toast(out.answer||'OK')}catch(e){toast(humanError(e.message))}});
  document.querySelectorAll('.live-copilot').forEach(b=>b.onclick=async()=>{try{const out=await api(\`/api/live/\${b.dataset.id}/copilot\`);toast((out.highlights||[]).slice(0,2).map(h=>h.text).join(' · ')||out.policy?.note||'Copilot ready')}catch(e){toast(humanError(e.message))}});
  if(state.intent==='event'){state.intent=null;state.liveTab='create';}`,
  'live-handlers'
);

// Memory Center block in Privacy
app = replaceOnce(
  app,
  'async function renderSecurityCenter(){\n  const [security,reputation,activity,intel]=await Promise.all([\n    api(\'/api/security-center\'),\n    api(\'/api/reputation\'),\n    api(\'/api/ai/activity\').catch(()=>({activity:[]})),\n    api(\'/api/ai/intelligence\').catch(()=>({}))\n  ]);',
  `async function renderSecurityCenter(){
  const [security,reputation,activity,intel,memoryCenter,caps]=await Promise.all([
    api('/api/security-center'),
    api('/api/reputation'),
    api('/api/ai/activity').catch(()=>({activity:[]})),
    api('/api/ai/intelligence').catch(()=>({})),
    api('/api/ai/memory/center').catch(()=>({memories:[],categories:[],byCategory:{}})),
    api('/api/ai/capabilities').catch(()=>({}))
  ]);`,
  'security-fetch'
);

app = replaceOnce(
  app,
  '<p class="muted">Capabilities: AI ${ai.capabilities?.aiText?\'on\':\'off\'} · Voice ${ai.capabilities?.aiRealtimeVoice?\'on\':\'off\'}</p></div></div>`;',
  `<p class="muted">Capabilities: AI \${ai.capabilities?.aiText?'on':'off'} · Voice \${ai.capabilities?.aiRealtimeVoice?'on':'off'} · LUMEN \${esc(caps?.honesty?.lumenWallet?.label||'TEST / DEMO')}</p></div></div>
  <section class="card"><span class="eyebrow">MEMORY CENTER</span><h3>Контрольована пам’ять</h3>
  <p class="muted">\${esc(memoryCenter.honesty||'AI does not secretly accumulate personal data.')}</p>
  <label class="privacy-toggle"><input type="checkbox" id="memoryEnabled" \${memoryCenter.enabled!==false?'checked':''}> Memory enabled</label>
  <div class="stack">\${(memoryCenter.categories||[]).map(cat=>{const items=(memoryCenter.byCategory&&memoryCenter.byCategory[cat])||[];return \`<div class="item"><b>\${esc(cat)}</b><p class="muted">\${items.length?items.map(m=>esc(m.label)).join(' · '):'—'}</p></div>\`;}).join('')}</div>
  <div class="stack">\${(memoryCenter.memories||[]).slice(0,20).map(m=>\`<div class="item row"><div><b>\${esc(m.label)}</b><p class="muted">\${esc(m.value)} · \${esc(m.category||'preferences')}</p></div><button class="ghost edit-mem" data-id="\${m.id}">Edit</button><button class="ghost del-mem" data-id="\${m.id}">Delete</button></div>\`).join('')||'<p class="muted">Порожньо</p>'}</div></section>\`;`,
  'memory-center-html'
);

app = replaceOnce(
  app,
  'document.querySelector(\'#disputeRep\').onclick=async()=>{await api(\'/api/reputation/dispute\',{method:\'POST\',body:JSON.stringify({dimension:\'trust\',reason:\'User disputes trust score accuracy\'})});toast(\'Dispute opened\');renderSecurityCenter()};\n}',
  `document.querySelector('#disputeRep').onclick=async()=>{await api('/api/reputation/dispute',{method:'POST',body:JSON.stringify({dimension:'trust',reason:'User disputes trust score accuracy'})});toast('Dispute opened');renderSecurityCenter()};
  document.querySelector('#memoryEnabled')?.addEventListener('change',async e=>{await api('/api/ai/memory/enabled',{method:'PATCH',body:JSON.stringify({enabled:e.target.checked})});toast(e.target.checked?'Memory on':'Memory off')});
  document.querySelectorAll('.edit-mem').forEach(b=>b.onclick=async()=>{const value=prompt('New value');if(value==null)return;const category=prompt('Category (preferences/people/projects/professional/learning/conversation)','preferences');await api(\`/api/ai/memory/\${b.dataset.id}\`,{method:'PATCH',body:JSON.stringify({value,category})});toast('Updated');renderSecurityCenter()});
  document.querySelectorAll('.del-mem').forEach(b=>b.onclick=async()=>{await api(\`/api/ai/memory/\${b.dataset.id}\`,{method:'DELETE'});toast('Deleted');renderSecurityCenter()});
}`,
  'memory-center-handlers'
);

fs.writeFileSync(appPath, app);
console.log('patched', appPath);
