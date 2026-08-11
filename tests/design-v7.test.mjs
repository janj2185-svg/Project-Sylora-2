import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const css = await readFile(new URL('../public/design-sylora-human-v7.css', import.meta.url), 'utf8');
const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

test('V7 Digital Human layer loads after V6 so assembly overrides win', () => {
  const v6 = html.indexOf('/design-scenes-v6.css');
  const v7 = html.indexOf('/design-sylora-human-v7.css');
  assert.ok(v6 >= 0 && v7 > v6);
});

test('V7 presents an assembled portrait and hides detached limb sprites', () => {
  assert.match(css, /sylora-avatar-v2-base\.png/);
  assert.match(css, /\.sylora-rig-arm\{display:none!important\}/);
  assert.match(css, /\.sylora-avatar-gesture\.gesture-shown/);
  assert.match(css, /sylora-gestures-v2\.png/);
});

test('avatar mount creates gesture layers and enables the live kinematic rig', () => {
  assert.match(app, /sylora-avatar-gesture/);
  assert.match(app, /classList\.add\('rig-live'\)/);
  assert.match(app, /setGesture\(hero\.dataset\.gesture\|\|'neutral'\)/);
});
