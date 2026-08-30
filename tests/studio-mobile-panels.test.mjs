import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const runtime=await readFile(new URL('../public/studio-mobile-runtime.js',import.meta.url),'utf8');
const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');

test('Studio mobile runtime opens requested controls through the shared panel event',()=>{
  assert.match(app,/matchMedia\('\(max-width: 900px\)'\)\.matches/);
  assert.match(app,/new CustomEvent\('sylora:studio-open-panel',\{detail:\{panel\}\}\)/);
  assert.match(runtime,/document\.addEventListener\('sylora:studio-open-panel',event=>\{/);
  assert.match(runtime,/const panel=event\.detail\?\.panel/);
  assert.match(runtime,/if\(typeof panel==='string'\)openSheet\(panel\)/);
});
