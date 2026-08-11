/** UI wiring for Daily Brief, Intelligent Inbox, Dashboard (125–164). */
import fs from 'node:fs';

const appPath = 'public/app.js';
let app = fs.readFileSync(appPath, 'utf8');

function replaceOnce(src, find, repl, label) {
  if (!src.includes(find)) throw new Error(`patch miss: ${label}`);
  return src.replace(find, repl);
}

// Inbox priority tab
app = replaceOnce(
  app,
  'const tab=state.inboxTab||\'messages\';\n  const [{conversations},{users},notes]=await Promise.all([api(\'/api/conversations\'),api(\'/api/users\'),api(\'/api/notifications\').catch(()=>({notifications:[]}))]);',
  `const tab=state.inboxTab||'messages';
  const [{conversations},{users},notes,smartInbox]=await Promise.all([
    api('/api/conversations'),
    api('/api/users'),
    api('/api/notifications').catch(()=>({notifications:[]})),
    api('/api/inbox/intelligent').catch(()=>null)
  ]);`,
  'inbox-fetch'
);

app = replaceOnce(
  app,
  '<button type="button" data-inbox-tab="calls" class="${tab===\'calls\'?\'active\':\'\'}">${esc(t(\'inboxCalls\'))}</button>\n  </div>',
  `<button type="button" data-inbox-tab="calls" class="\${tab==='calls'?'active':''}">\${esc(t('inboxCalls'))}</button>
    <button type="button" data-inbox-tab="priority" class="\${tab==='priority'?'active':''}">Priority</button>
  </div>`,
  'inbox-tab'
);

app = replaceOnce(
  app,
  '<div class="inbox-panel card" ${tab===\'calls\'?\'\':\'hidden\'}>${calls.map(n=>`<div class="profile-event"><i>◉</i><span><b>${esc(n.actor?.username||\'SYLORA\')}</b><small>${esc(n.type)}</small></span></div>`).join(\'\')||`<p class="muted">${esc(t(\'inboxCalls\'))}</p>`}<div class="row" style="margin-top:12px"><button class="ghost" data-go="live">LIVE</button><button class="ghost" data-go="ai">Sylora</button></div></div>`;',
  `<div class="inbox-panel card" \${tab==='calls'?'':'hidden'}>\${calls.map(n=>\`<div class="profile-event"><i>◉</i><span><b>\${esc(n.actor?.username||'SYLORA')}</b><small>\${esc(n.type)}</small></span></div>\`).join('')||\`<p class="muted">\${esc(t('inboxCalls'))}</p>\`}<div class="row" style="margin-top:12px"><button class="ghost" data-go="live">LIVE</button><button class="ghost" data-go="ai">Sylora</button></div></div>
  <div class="inbox-panel card" \${tab==='priority'?'':'hidden'}><p><b>\${esc(smartInbox?.inbox?.summary||'Priority view')}</b></p><p class="muted">AI priority is an extra filter — nothing is hidden.</p>\${Object.entries(smartInbox?.inbox?.buckets||{}).map(([k,items])=>\`<div class="item"><span class="eyebrow">\${esc(k)}</span>\${(items||[]).slice(0,8).map(i=>\`<p>\${esc(i.preview||i.type||i.kind||i.id)}</p>\`).join('')||'<p class="muted">—</p>'}</div>\`).join('')}</div>\`;`,
  'inbox-priority-panel'
);

// Home daily brief strip
app = replaceOnce(
  app,
  'if(state.me)try{hub=(await api(\'/api/home/hub\')).hub}catch{}',
  `if(state.me)try{hub=(await api('/api/home/hub')).hub}catch{}
  let brief=null;if(state.me)try{brief=(await api('/api/daily-brief')).brief}catch{}`,
  'brief-fetch'
);

app = replaceOnce(
  app,
  'const continueHtml=hub?.continue?.length?',
  `const briefHtml=brief&&brief.enabled!==false?\`<section class="eco-strip"><div class="eco-strip-head"><b>Daily Brief</b><button type="button" id="toggleBrief">\${brief.enabled===false?'Enable':'Disable'}</button></div><div class="eco-carousel"><button type="button" class="eco-card" data-eco-nav="ai"><b>Sylora</b><small>\${esc(brief.summary||'')}</small></button>\${(brief.sections||[]).slice(0,4).map(s=>\`<button type="button" class="eco-card" data-eco-nav="messages"><b>\${esc(s.title)}</b><small>\${s.items.length}</small></button>\`).join('')}</div></section>\`:'';
  const continueHtml=hub?.continue?.length?`,
  'brief-html'
);

app = replaceOnce(
  app,
  '<div class="ecosystem-feed">${continueHtml}${inboxHtml}',
  '<div class="ecosystem-feed">${briefHtml||\'\'}${continueHtml}${inboxHtml}',
  'brief-insert'
);

app = replaceOnce(
  app,
  'document.querySelector(\'#composer\')?.addEventListener(\'submit\',async e=>{e.preventDefault();const text=new FormData(e.currentTarget).get(\'text\');if(!String(text).trim())return;await api(\'/api/posts\',{method:\'POST\',body:JSON.stringify({text})});toast(t(\'publish\'));renderFeed()});',
  `document.querySelector('#composer')?.addEventListener('submit',async e=>{e.preventDefault();const text=new FormData(e.currentTarget).get('text');if(!String(text).trim())return;await api('/api/posts',{method:'POST',body:JSON.stringify({text})});toast(t('publish'));renderFeed()});
  document.querySelector('#toggleBrief')?.addEventListener('click',async()=>{await api('/api/daily-brief',{method:'PATCH',body:JSON.stringify({enabled:false})});toast('Daily Brief updated');renderFeed()});`,
  'brief-toggle'
);

// More menu: Dashboard + Canvas
app = replaceOnce(
  app,
  '<div class="card module" data-go="ai"><span class="icon">✦</span><h3>Sylora AI</h3><p>Один Personal AI, пам’ять, дозволи та прозора історія дій.</p></div>',
  `<div class="card module" data-go="ai"><span class="icon">✦</span><h3>Sylora AI</h3><p>Один Personal AI, пам’ять, дозволи та прозора історія дій.</p></div>
<div class="card module" data-go="dashboard"><span class="icon">▣</span><h3>Personal Dashboard</h3><p>Today · Tasks · Goals · Brief · Continuity.</p></div>
<div class="card module" data-go="canvas"><span class="icon">▭</span><h3>Sylora Canvas</h3><p>AI workspace for documents, plans and research.</p></div>`,
  'more-modules'
);

app = replaceOnce(
  app,
  'if(state.view===\'security\')return state.me?renderSecurityCenter():renderAuth();',
  `if(state.view==='security')return state.me?renderSecurityCenter():renderAuth();if(state.view==='dashboard')return state.me?renderPersonalDashboard():renderAuth();if(state.view==='canvas')return state.me?renderCanvas():renderAuth();`,
  'render-routes'
);

// Append renderers before syloraSpeechLocale
app = replaceOnce(
  app,
  'function syloraSpeechLocale(){',
  `async function renderPersonalDashboard(){
  const {dashboard}=await api('/api/dashboard');
  const d=dashboard||{};
  app.innerHTML=\`<div class="card hero"><span class="eyebrow">PERSONAL DASHBOARD</span><h1>Today</h1><p>\${esc(d.today?.summary||'Your adaptive overview.')}</p></div>
  <div class="grid2">
    <section class="card"><span class="eyebrow">TASKS</span>\${(d.tasks||[]).map(t=>\`<p><b>\${esc(t.title)}</b><small class="muted"> · \${esc(t.status)}</small></p>\`).join('')||'<p class="muted">—</p>'}</section>
    <section class="card"><span class="eyebrow">GOALS</span>\${(d.goals||[]).map(g=>\`<p><b>\${esc(g.title)}</b><small class="muted"> · \${Math.round((g.progress||0)*100)}%</small></p>\`).join('')||'<p class="muted">—</p>'}</section>
  </div>
  <section class="card"><span class="eyebrow">CONTINUE</span>\${(d.continue||[]).map(c=>\`<p>\${esc(c.kind||'')} · \${esc(c.key||c.label||'')}</p>\`).join('')||'<p class="muted">—</p>'}</section>
  <section class="card"><span class="eyebrow">SYLORA</span>\${(d.syloraSuggestions||[]).map(s=>\`<p>\${esc(s.text||'')}</p>\`).join('')||'<p class="muted">—</p>'}
  <form id="osCmd" class="fields"><input name="text" placeholder="Sylora, що сьогодні важливого?" required><button class="primary">Ask Sylora OS</button></form><pre id="osOut" hidden style="white-space:pre-wrap;font-size:12px"></pre></section>\`;
  document.querySelector('#osCmd').onsubmit=async e=>{e.preventDefault();const text=new FormData(e.currentTarget).get('text');const out=await api('/api/ai/command',{method:'POST',body:JSON.stringify({text})});const pre=document.querySelector('#osOut');pre.hidden=false;pre.textContent=JSON.stringify(out,null,2).slice(0,2000)};
}
async function renderCanvas(){
  const [{workspaces},]=await Promise.all([api('/api/canvas'),api('/api/skills').catch(()=>({skills:[]}))]);
  app.innerHTML=\`<div class="card hero"><span class="eyebrow">SYLORA CANVAS</span><h1>Workspace</h1><p>Conversation + artifact. Mobile stacks vertically.</p></div>
  <div class="studio-layout canvas-layout"><div class="card" id="canvasArtifact"><span class="eyebrow">ARTIFACT</span><form id="canvasForm" class="fields"><input name="title" placeholder="Title" required><select name="kind"><option value="document">Document</option><option value="plan">Plan</option><option value="research">Research</option><option value="project">Project</option><option value="business">Business</option></select><textarea name="body" rows="10" placeholder="Write with Sylora…"></textarea><button class="primary">Save workspace</button></form></div>
  <aside class="card"><span class="eyebrow">SYLORA</span><div class="stack">\${(workspaces||[]).slice(0,8).map(w=>\`<div class="item"><b>\${esc(w.title)}</b><small class="muted">\${esc(w.kind)}</small></div>\`).join('')||'<p class="muted">Порожньо</p>'}</div>
  <form id="canvasAsk" class="fields"><input name="q" placeholder="Summarize / rewrite / extract tasks" required><button class="ghost">Ask</button></form><pre id="canvasAskOut" hidden style="white-space:pre-wrap;font-size:12px"></pre></aside></div>\`;
  document.querySelector('#canvasForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await api('/api/canvas',{method:'POST',body:JSON.stringify({title:fd.get('title'),kind:fd.get('kind'),artifact:{body:fd.get('body')}})});toast('Saved');renderCanvas()};
  document.querySelector('#canvasAsk').onsubmit=async e=>{e.preventDefault();const q=new FormData(e.currentTarget).get('q');const out=await api('/api/ai/command',{method:'POST',body:JSON.stringify({text:q,view:'canvas'})});const pre=document.querySelector('#canvasAskOut');pre.hidden=false;pre.textContent=JSON.stringify(out.result||out.plan||out,null,2).slice(0,1800)};
}
function syloraSpeechLocale(){`,
  'renderers'
);

fs.writeFileSync(appPath, app);
console.log('patched', appPath);
