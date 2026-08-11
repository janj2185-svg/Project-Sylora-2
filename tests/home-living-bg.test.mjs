import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('home living background assets and light-theme constraints exist', () => {
  const css = fs.readFileSync('public/home-living-bg.css', 'utf8');
  const js = fs.readFileSync('public/home-living-bg.js', 'utf8');
  const html = fs.readFileSync('public/index.html', 'utf8');
  const app = fs.readFileSync('public/app.js', 'utf8');

  assert.match(html, /home-living-bg\.css/);
  assert.match(app, /mountHomeLivingBg/);
  assert.match(js, /prefers-reduced-motion/);
  assert.match(js, /setPresence/);
  assert.match(js, /particleBudget/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /data-presence="idle"/);
  assert.match(css, /data-atmosphere="morning"/);
  // Must stay light — no dark home takeover
  assert.doesNotMatch(css, /background:\s*#0{2,6}\b/i);
  assert.doesNotMatch(css, /background:\s*#111\b/i);
  assert.match(css, /#fffaf4|#fffefb|ivory|pearl/i);
});
