import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const css=await readFile(new URL('../public/design-scenes-v6.css',import.meta.url),'utf8');
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');

test('V6 scene layer is loaded last so it can correct legacy visual overrides',()=>{const v5=html.indexOf('/design-scenes-v5.css'),v6=html.indexOf('/design-scenes-v6.css');assert.ok(v5>=0&&v6>v5)});

test('major SYLORA destinations have distinct scene-specific visual rules',()=>{for(const view of ['live','learning','business','studio','clips','gifts','explore','messages','more','ai'])assert.ok(css.includes(`data-view="${view}"`),`missing V6 scene: ${view}`)});

test('V6 keeps responsive phone/tablet and reduced-motion treatments',()=>{assert.match(css,/@media\(max-width:980px\)/);assert.match(css,/@media\(max-width:720px\)/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/)});

test('generic destination heroes use scene emblems instead of repeating Sylora portrait',()=>{assert.match(css,/not\(\[data-view="ai"\]\).*hero:first-child:before/);assert.match(css,/content:var\(--scene-symbol\)!important/)});
