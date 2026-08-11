/** Universal Search + Command Palette — natural language + slash commands. */
const COMMANDS=[
  {cmd:'/live',view:'live',label:'Open LIVE'},
  {cmd:'/create',view:null,label:'Create Hub',action:'create'},
  {cmd:'/search',view:'explore',label:'Discover'},
  {cmd:'/project',view:'business',label:'Business projects'},
  {cmd:'/call',view:'messages',label:'Inbox / calls'},
  {cmd:'/learn',view:'learning',label:'Science & Learning'},
  {cmd:'/ai',view:'ai',label:'Talk with Sylora'},
  {cmd:'/translate',view:'messages',label:'Inbox translation'},
];

export function openCommandPalette({t,esc,api,onNavigate,onCreate,onAiSearch}={}){
  document.querySelector('#syloraCommandPalette')?.remove();
  const overlay=document.createElement('div');
  overlay.id='syloraCommandPalette';
  overlay.className='command-palette';
  overlay.innerHTML=`<div class="command-palette-sheet" role="dialog" aria-modal="true" aria-label="${esc(t('searchPlaceholder'))}">
    <input id="cmdq" autocomplete="off" placeholder="${esc(t('searchPlaceholder'))}" autofocus>
    <div class="command-palette-results" id="cmdResults">${COMMANDS.map(c=>`<button type="button" data-cmd="${esc(c.cmd)}"><b>${esc(c.cmd)}</b> · ${esc(c.label)}</button>`).join('')}</div>
  </div>`;
  document.body.append(overlay);
  const close=()=>overlay.remove();
  const input=overlay.querySelector('#cmdq');
  const results=overlay.querySelector('#cmdResults');
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  document.addEventListener('keydown',function onKey(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',onKey)}});

  const runCommand=c=>{
    close();
    if(c.action==='create')return onCreate?.();
    if(c.view)onNavigate?.(c.view);
  };

  results.querySelectorAll('[data-cmd]').forEach(btn=>{
    btn.onclick=()=>{
      const c=COMMANDS.find(x=>x.cmd===btn.dataset.cmd);
      if(c)runCommand(c);
    };
  });

  let timer=null;
  input.oninput=()=>{
    clearTimeout(timer);
    const q=input.value.trim();
    if(q.startsWith('/')){
      const hits=COMMANDS.filter(c=>c.cmd.startsWith(q.toLowerCase())||c.label.toLowerCase().includes(q.slice(1).toLowerCase()));
      results.innerHTML=hits.map(c=>`<button type="button" data-cmd="${esc(c.cmd)}"><b>${esc(c.cmd)}</b> · ${esc(c.label)}</button>`).join('')||`<p class="muted">No commands</p>`;
      results.querySelectorAll('[data-cmd]').forEach(btn=>btn.onclick=()=>runCommand(COMMANDS.find(x=>x.cmd===btn.dataset.cmd)));
      return;
    }
    if(q.length<2){
      results.innerHTML=COMMANDS.map(c=>`<button type="button" data-cmd="${esc(c.cmd)}"><b>${esc(c.cmd)}</b> · ${esc(c.label)}</button>`).join('');
      results.querySelectorAll('[data-cmd]').forEach(btn=>btn.onclick=()=>runCommand(COMMANDS.find(x=>x.cmd===btn.dataset.cmd)));
      return;
    }
    timer=setTimeout(async()=>{
      results.innerHTML=`<p class="muted">${esc(t('loading'))}</p>`;
      try{
        const [classic,ai]=await Promise.all([
          api(`/api/search?q=${encodeURIComponent(q)}`),
          api(`/api/search/ai?q=${encodeURIComponent(q)}`).catch(()=>null)
        ]);
        const blocks=[];
        const push=(title,items,fn,view)=>{
          if(!items?.length)return;
          blocks.push(`<div><small class="eyebrow">${esc(title)}</small>${items.slice(0,5).map(x=>`<button type="button" data-go="${view||'explore'}">${esc(fn(x))}</button>`).join('')}</div>`);
        };
        push('People',classic.users,u=>`@${u.username} · ${u.displayName}`,'explore');
        push('Posts',classic.posts,p=>`${p.author?.username||''}: ${p.text}`,'feed');
        push('Communities',classic.communities,c=>c.name,'communities');
        push('Courses',classic.courses,c=>c.title,'learning');
        push('Business',classic.businesses,b=>b.name,'business');
        if(ai?.plan)blocks.unshift(`<button type="button" data-ai="1"><b>Sylora</b> · ${esc(ai.plan.summary||ai.plan.intent||q)}</button>`);
        results.innerHTML=blocks.join('')||`<p class="muted">—</p>`;
        results.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{close();onNavigate?.(b.dataset.go)});
        results.querySelector('[data-ai]')?.addEventListener('click',()=>{close();onAiSearch?.(q)});
      }catch{
        results.innerHTML=`<p class="muted">${esc(t('syloraBusy'))}</p>`;
      }
    },220);
  };
  input.onkeydown=e=>{
    if(e.key==='Enter'){
      const q=input.value.trim();
      const cmd=COMMANDS.find(c=>c.cmd===q.toLowerCase());
      if(cmd){e.preventDefault();runCommand(cmd)}
    }
  };
  return overlay;
}
