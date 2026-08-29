import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';

const system=await readFile(new URL('../public/design-system-2026.css',import.meta.url),'utf8');
const home=await readFile(new URL('../public/design-home-2026.css',import.meta.url),'utf8');
const live=await readFile(new URL('../public/design-live-2026.css',import.meta.url),'utf8');
const studio=await readFile(new URL('../public/design-studio-2026.css',import.meta.url),'utf8');
const studioRuntime=await readFile(new URL('../public/studio-mobile-runtime.js',import.meta.url),'utf8');
const homeRuntime=await readFile(new URL('../public/home-runtime.js',import.meta.url),'utf8');
const ai=await readFile(new URL('../public/design-ai-2026.css',import.meta.url),'utf8');
const account=await readFile(new URL('../public/design-account-2026.css',import.meta.url),'utf8');
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const appJs=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const consolidation=await readFile(new URL('../public/design-consolidation.css',import.meta.url),'utf8');
const shellV3=await readFile(new URL('../public/design-living-horizon-v3.css',import.meta.url),'utf8');
const mobileTabs=await readFile(new URL('../apps/mobile/app/(tabs)/_layout.tsx',import.meta.url),'utf8');
const mobileBackground=await readFile(new URL('../apps/mobile/src/components/LivingBackground.tsx',import.meta.url),'utf8');
const mobileIntegrations=await readFile(new URL('../apps/mobile/app/integrations.tsx',import.meta.url),'utf8');
const mobileLogo=await readFile(new URL('../apps/mobile/src/components/BrandLogo.tsx',import.meta.url),'utf8');
const localizedRuntimeNames=['i18n-runtime','ui-localization-runtime','studio-mobile-runtime','live-runtime','ai-presence-runtime'];
const localizedRuntimes=await Promise.all(localizedRuntimeNames.map(name=>readFile(new URL(`../public/${name}.js`,import.meta.url),'utf8')));

test('canonical design system owns global tokens before route-specific composition files',()=>{
  const canonical=html.indexOf('/design-system-2026.css');
  assert.ok(canonical>=0,'canonical design system missing');
  for(const route of ['/design-home-2026.css','/design-ai-2026.css','/design-live-2026.css','/design-studio-2026.css','/design-account-2026.css']){
    assert.ok(html.indexOf(route)>canonical,`${route} must compose after canonical tokens`);
  }
  for(const obsolete of ['/design-v2.css','/design-reference-v3.css','/design-master-v4.css','/design-scenes-v5.css','/design-scenes-v6.css','/design-approved-2026.css']){
    assert.equal(html.includes(obsolete),false,`obsolete runtime layer still loaded: ${obsolete}`);
    assert.equal(existsSync(new URL(`../public${obsolete}`,import.meta.url)),false,`obsolete design layer still tracked: ${obsolete}`);
  }
});

test('canonical material system defines Pearl Frost Crystal Metal and Void',()=>{
  for(const token of ['--sy-pearl','--sy-frost','--sy-crystal','--sy-metal','--sy-void'])assert.ok(system.includes(token),`missing ${token}`);
  for(const recipe of ['material-pearl','material-frost','material-crystal','material-metal','material-void'])assert.ok(system.includes(recipe),`missing ${recipe}`);
  assert.match(system,/\.right \.shell-wallet\{[^}]*background:linear-gradient\(145deg,var\(--sy-void\),var\(--sy-void-2\)\)!important/);
});

test('route visual identities remain distinct without another global override layer',()=>{
  assert.match(home,/body\[data-view="feed"\]/);
  assert.match(live,/body\[data-view="live"\]/);
  assert.match(live,/body\[data-view="live"\] \.live-dot\{background:#d95068;box-shadow:none\}/);
  assert.match(appJs,/class="card fields live-creator-launchpad"/);
  assert.match(live,/body\[data-view="live"\] \.live-creator-launchpad\{[\s\S]*?backdrop-filter:none!important;/);
  assert.match(live,/\.live-creator-launchpad :is\(#goLive,#openStudioFromLive,#createEventBtn\)\{[\s\S]*?border:2px solid rgba\(255,255,255,\.94\)!important;[\s\S]*?background-clip:padding-box!important;/);
  assert.match(studio,/body\[data-view="studio"\]/);
  assert.match(ai,/body\[data-view="ai"\]/);
  assert.match(live,/--sy-void/);
  assert.match(studio,/PROGRAM PREVIEW/);
  assert.doesNotMatch(home,/sylora-presence-image/);
  assert.match(system,/body\[data-view="live"\]\{--sy-route-accent:/);
  assert.match(system,/body\[data-view="ai"\]\{--sy-route-accent:/);
  assert.match(ai,/ai-presence-container/);
  assert.match(ai,/\.sy-ai-context-status\{pointer-events:none\}/);
  assert.match(ai,/@media\(max-width:620px\)\{\s*body\[data-view="ai"\] \.ai-visual-toggle\{top:14px/);
  assert.doesNotMatch(home,/@media\(max-width:390px\)\{\s*body\[data-view="feed"\] \.living-horizon\.home-compact\{border-radius:/);
  for(const route of ['profile','messages','more'])assert.match(account,new RegExp(`body\\[data-view="${route}"\\]`));
});

test('Home stays unobstructed while mobile navigation exposes one on-demand Sylora destination',()=>{
  assert.doesNotMatch(html,/sylora-mini|ai-rail/);
  assert.doesNotMatch(appJs,/class="sylora-presence"/);
  const dock=html.split('class="mobile-dock"')[1].split('</nav>')[0];
  assert.equal((dock.match(/data-view="ai"/g)||[]).length,1);
  assert.doesNotMatch(dock,/data-create-hub|mobile-create/);
  assert.match(appJs,/id="aiVisualToggle"/);
});

test('flagship routes prioritize outcomes over repetitive card stacks',()=>{
  assert.match(appJs,/class="home-focus-panel"/);
  assert.match(appJs,/class="home-brief-meta"/);
  assert.equal((appJs.match(/data-horizon-create/g)||[]).length,2,'one Home trigger plus its binding must remain deterministic');
  assert.match(appJs,/data-focus-create/);
  assert.match(home,/\.ecosystem-feed\{display:grid;grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
  assert.match(home,/\.home-focus-panel\{/);
  assert.match(home,/\.horizon-copy\{[^}]*max-width:none;[^}]*width:auto/);
  assert.match(consolidation,/\.create-hub-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(appJs,/className='ai-workspace-grid'/);
  assert.match(ai,/\.ai-workspace-grid\{[\s\S]*?grid-template-columns:minmax\(0,1\.48fr\) minmax\(292px,\.72fr\)/);
  assert.match(account,/body\[data-view="more"\] \.settings-scene\{/);
  assert.equal((appJs.match(/SYLORA · PERSONAL SYSTEM/g)||[]).length,1,'settings must render one canonical hero');
});

test('Home activation remains stable through the complete touch click',()=>{
  assert.match(homeRuntime,/document\.addEventListener\('click',event=>\{/);
  assert.doesNotMatch(homeRuntime,/document\.addEventListener\('pointerdown'/);
  assert.match(consolidation,/\.create-hub\{[\s\S]*?background:rgba\(18,24,26,\.32\);backdrop-filter:blur\(10px\) saturate\(\.9\);/);
});

test('media creation keeps translucent paint outside rounded gradient controls',()=>{
  assert.match(system,/body:is\(\[data-view="clips"\],\[data-view="videos"\]\) #app>\.hero\{backdrop-filter:none!important\}/);
  assert.match(system,/body:is\(\[data-view="clips"\],\[data-view="videos"\]\) :is\([^}]+\)\{\s*border:2px solid rgba\(255,255,255,\.94\)!important;\s*background-clip:padding-box!important;/);
  assert.match(system,/body:is\(\[data-view="clips"\],\[data-view="videos"\]\) :is\(#clipUpload>button,#videoUpload>button\)\{\s*background:#26383a!important;/);
});

test('canonical and route layers retain responsive and reduced-motion contracts',()=>{
  for(const css of [system,home,live,studio,ai,account,shellV3]){
    assert.match(css,/@media\(max-width:/);
    assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  }
  assert.match(system,/safe-area-inset-bottom/);
  assert.match(system,/@media\(max-width:900px\)\{[\s\S]*?body\{background-attachment:scroll\}/);
  assert.match(system,/@media\(min-width:901px\) and \(max-width:980px\)\{\s*:root\{--sy-left-w:72px\}/);
  assert.match(system,/\.side-nav \.nav\[data-view="profile"\]::before\{content:"○"\}/);
  assert.match(system,/\.side-nav \.nav\[data-create-hub\]::before\{content:"\+"\}/);
  assert.match(system,/\.rail-orbit\{width:100%/);
  assert.match(system,/\.rail-orbit i em\{display:block;height:100%/);
  assert.match(system,/\.sylora-press-ripple\{[\s\S]*position:absolute!important;[\s\S]*pointer-events:none!important;/);
  assert.match(system,/:is\(button,\.primary,\.ghost,\.module,\.gift\)\{position:relative;isolation:isolate\}/);
  assert.match(shellV3,/\.brand-lockup\{[\s\S]*?object-fit:contain!important;[\s\S]*?clip-path:none!important;/);
  assert.match(shellV3,/\.route-atmosphere/);
  assert.match(shellV3,/body\[data-view="live"\] \.route-atmosphere/);
  assert.match(shellV3,/body\[data-view="ai"\] \.route-atmosphere/);
});

test('native shell keeps the same five destinations, master logo and semantic motion contract',()=>{
  const screens=[...mobileTabs.matchAll(/<Tabs\.Screen name="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(screens,['home','live','sylora','inbox','profile']);
  assert.match(mobileLogo,/SYLORA_CANONICAL_LOGO_MASTER\.png/);
  assert.match(mobileLogo,/resizeMode="contain"/);
  for(const variant of ['home','live','sylora','inbox','profile','studio'])assert.match(mobileBackground,new RegExp(`scene === '${variant}'`));
  assert.match(mobileBackground,/AccessibilityInfo\.isReduceMotionEnabled/);
});

test('native creator connections are interactive and report actual distribution readiness',()=>{
  for(const service of ['TikTok','YouTube','OBS','TikFinity','RTMP\\(S\\)'])assert.match(mobileIntegrations,new RegExp(service));
  assert.match(mobileIntegrations,/\/api\/studio\/distribution/);
  assert.match(mobileIntegrations,/configuration\?\.configured === true/);
  assert.match(mobileIntegrations,/router\.replace\('\/\(tabs\)\/live'\)/);
});

test('immutable shell modules share one cache version and one localization instance',()=>{
  const shellVersion=html.match(/design-living-horizon-v3\.css\?v=([^"']+)/)?.[1];
  assert.ok(shellVersion);
  for(const name of [...localizedRuntimeNames,'app'])assert.match(html,new RegExp(`${name}\\.js\\?v=${shellVersion}`));
  for(const source of [appJs,...localizedRuntimes])assert.match(source,new RegExp(`i18n\\.js\\?v=${shellVersion}`));
});

test('Studio mobile runtime keeps one current body portal across in-place rerenders',()=>{
  assert.match(studioRuntime,/let mountedControls=null/);
  assert.match(studioRuntime,/function portalsAreCurrent\(\)/);
  assert.match(studioRuntime,/tools\.length===1&&backdrops\.length===1/);
  assert.match(studioRuntime,/mountedControls===controls&&controls\.dataset\.mobileMounted==='1'&&portalsAreCurrent\(\)/);
  assert.match(studioRuntime,/document\.querySelectorAll\(STUDIO_PORTAL_SELECTOR\)\.forEach\(node=>node\.remove\(\)\)/);
  assert.match(studioRuntime,/document\.body\.append\(backdrop\)/);
  assert.match(studioRuntime,/document\.body\.append\(tools\)/);
  assert.doesNotMatch(studioRuntime,/document\.querySelector\('\.studio-(?:mobile-tools|sheet-backdrop)'\)\?\.remove\(\)/);
  assert.match(studio,/\.studio-sheet-close\{display:none\}/);
  assert.match(studio,/@media\(max-width:900px\)\{[\s\S]*?\.studio-sheet-close\{[^}]*display:grid;/);
  assert.match(studio,/\.studio-controls>\.card\{[^}]*z-index:92;[^}]*bottom:calc\(154px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(studio,/\.studio-mobile-tools\{\s*position:fixed;z-index:94;/);
  assert.match(studio,/input\[type="range"\]\{[\s\S]*?appearance:none;[\s\S]*?border-radius:999px!important;/);
});

test('shell navigation uses delegation so runtime copy updates cannot orphan nav buttons',()=>{
  assert.match(appJs,/document\.addEventListener\('click',event=>\{const button=event\.target\.closest\?\.\('\.nav\[data-view\]'\);if\(button\)nav\(button\.dataset\.view\)\}\)/);
  assert.doesNotMatch(appJs,/document\.querySelectorAll\('\.nav'\)\.forEach\(x=>x\.onclick=/);
});
