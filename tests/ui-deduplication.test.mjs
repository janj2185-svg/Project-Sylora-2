import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [app, html, system, living] = await Promise.all([
  readFile(new URL('../public/app.js', import.meta.url), 'utf8'),
  readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../public/design-system-2026.css', import.meta.url), 'utf8'),
  readFile(new URL('../public/design-living-horizon.css', import.meta.url), 'utf8')
]);

test('global shell exposes one header gift action and one contextual wallet action', () => {
  assert.equal((app.match(/data-account-view="gifts"/g) || []).length, 1);
  assert.equal((app.match(/data-shell-view="gifts"/g) || []).length, 1);
  assert.doesNotMatch(app, /header-balance/);
  assert.doesNotMatch(system, /header-balance/);
});

test('settings keeps unique control surfaces instead of repeating primary navigation', () => {
  const more = app.match(/function renderMore\(\)\{[\s\S]*?\n\}\nasync function renderIdentity/)?.[0];
  assert.ok(more, 'renderMore source not found');

  for (const view of ['identity', 'dashboard', 'security', 'canvas', 'agents', 'developer']) {
    assert.equal((more.match(new RegExp(`\\['${view}'`, 'g')) || []).length, 1, `${view} must appear once`);
  }
  for (const duplicate of ['profile', 'ai', 'messages', 'videos', 'gifts', 'communities', 'learning', 'business']) {
    assert.doesNotMatch(more, new RegExp(`\\['${duplicate}'`), `${duplicate} already has a canonical navigation surface`);
  }
});

test('legacy right-rail placeholders and retired Sylora cards are absent', () => {
  assert.doesNotMatch(html, /pulse-card|id="live-events"/);
  assert.doesNotMatch(app, /querySelector\('#live-events'\)/);
  assert.doesNotMatch(living, /\.(?:pulse-card|ai-rail|sylora-mini|sylora-presence|module-grid)(?:\b|-)/);
});
