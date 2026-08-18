import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const system=await readFile(new URL('../public/design-system-2026.css',import.meta.url),'utf8');
const home=await readFile(new URL('../public/design-home-2026.css',import.meta.url),'utf8');
const live=await readFile(new URL('../public/design-live-2026.css',import.meta.url),'utf8');
const studio=await readFile(new URL('../public/design-studio-2026.css',import.meta.url),'utf8');
const studioRuntime=await readFile(new URL('../public/studio-mobile-runtime.js',import.meta.url),'utf8');
const ai=await readFile(new URL('../public/design-ai-2026.css',import.meta.url),'utf8');
const account=await readFile(new URL('../public/design-account-2026.css',import.meta.url),'utf8');
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');

test('canonical design system owns global tokens before route-specific composition files',()=>{
  const canonical=html.indexOf('/design-system-2026.css');
  assert.ok(canonical>=0,'canonical design system missing');
  for(const route of ['/design-home-2026.css','/design-ai-2026.css','/design-live-2026.css','/design-studio-2026.css','/design-account-2026.css']){
    assert.ok(html.indexOf(route)>canonical,`${route} must compose after canonical tokens`);
  }
  for(const obsolete of ['/design-v2.css','/design-reference-v3.css','/design-master-v4.css','/design-scenes-v5.css','/design-scenes-v6.css','/design-approved-2026.css']){
    assert.equal(html.includes(obsolete),false,`obsolete runtime layer still loaded: ${obsolete}`);
  }
});

test('canonical material system defines Pearl Frost Crystal Metal and Void',()=>{
  for(const token of ['--sy-pearl','--sy-frost','--sy-crystal','--sy-metal','--sy-void'])assert.ok(system.includes(token),`missing ${token}`);
  for(const recipe of ['material-pearl','material-frost','material-crystal','material-metal','material-void'])assert.ok(system.includes(recipe),`missing ${recipe}`);
});

test('route visual identities remain distinct without another global override layer',()=>{
  assert.match(home,/body\[data-view="feed"\]/);
  assert.match(live,/body\[data-view="live"\]/);
  assert.match(studio,/body\[data-view="studio"\]/);
  assert.match(ai,/body\[data-view="ai"\]/);
  assert.match(live,/--sy-void/);
  assert.match(studio,/PROGRAM PREVIEW/);
  assert.match(home,/sylora-presence-image/);
  assert.match(ai,/ai-presence-container/);
  for(const route of ['profile','messages','more'])assert.match(account,new RegExp(`body\\[data-view="${route}"\\]`));
});

test('canonical and route layers retain responsive and reduced-motion contracts',()=>{
  for(const css of [system,home,live,studio,ai,account]){
    assert.match(css,/@media\(max-width:/);
    assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  }
  assert.match(system,/safe-area-inset-bottom/);
  assert.match(system,/@media\(min-width:901px\) and \(max-width:980px\)\{\s*:root\{--sy-left-w:72px\}/);
  assert.match(system,/\.side-nav \.nav\[data-view="profile"\]::before\{content:"○"\}/);
  assert.match(system,/\.side-nav \.nav\[data-create-hub\]::before\{content:"\+"\}/);
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
});
