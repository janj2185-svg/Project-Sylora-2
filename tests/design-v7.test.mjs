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

test('V7 keeps a continuous shoulder-elbow-wrist chain with calibrated sockets', () => {
  assert.match(css, /\.sylora-rig-arm-left\{[^}]*left:12\.8%/);
  assert.match(css, /\.sylora-rig-arm-right\{[^}]*right:12\.8%/);
  assert.match(css, /\.sylora-rig-forearm\{[^}]*top:78%/);
  assert.match(css, /\.sylora-ai-hero\.rig-live \.sylora-avatar-body/);
});

test('avatar mount creates gesture layers and enables the live kinematic rig', () => {
  assert.match(app, /sylora-avatar-gesture/);
  assert.match(app, /classList\.add\('rig-live'\)/);
  assert.match(app, /setGesture\(hero\.dataset\.gesture\|\|'neutral'\)/);
});
