import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [app, html, system, living, tiktokPilot, bridge] = await Promise.all([
  readFile(new URL('../public/app.js', import.meta.url), 'utf8'),
  readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../public/design-system-2026.css', import.meta.url), 'utf8'),
  readFile(new URL('../public/design-living-horizon.css', import.meta.url), 'utf8'),
  readFile(new URL('../public/tiktok-live-pilot.js', import.meta.url), 'utf8'),
  readFile(new URL('../public/living-horizon-bridge.css', import.meta.url), 'utf8')
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

test('guest shell never leaks a real account identity or fabricates a LIVE host', () => {
  assert.doesNotMatch(html, /Ivan K\.|kvasnytsiaivan/);
  assert.match(html, /class="account-row"[^>]*hidden/);
  assert.doesNotMatch(app, /state\.me\?\.username\|\|'Іване'/);
  assert.doesNotMatch(app, /Eva Shine|Phoenix Rebirth/);
  assert.doesNotMatch(app, /Creator Future Meetup|\+840 LUMEN|5 підключень|24K переглядів/);
  assert.doesNotMatch(html, /class="nav-count"/);
});

test('primary navigation labels participate in runtime localization', () => {
  for (const key of ['navMain', 'navSpaces', 'navPersonal', 'learning', 'wallet', 'settings']) {
    assert.match(html, new RegExp(`data-i18n="${key}"`));
  }
});

test('LIVE setup reports real TikTok readiness instead of decorative integrations', () => {
  assert.match(app, /item\.enabled&&item\.provider==='tiktok'/);
  assert.match(app, /distribution\?\.configuration\?\.configured/);
  assert.match(app, /u\('liveStepTitle'\)/);
  assert.match(app, /u\('signInToConfigure'\)/);
  assert.match(app, /if\(state\.me&&tab==='create'\)tiktokPilotCleanup=/);
  assert.doesNotMatch(app, /<button class="active" type="button">Живий чат<\/button><button type="button">Гості<\/button><button type="button">Модерація<\/button>/);
  assert.doesNotMatch(app, /<div class="platform-pills"><i>TikTok<\/i><i>YouTube<\/i><i>OBS<\/i><i>TikFinity<\/i><\/div>/);
});

test('TikTok copilot uses the selected Sylora voice and core locale codes', () => {
  assert.match(app, /de:'de-DE',ru:'ru-RU'/);
  assert.match(app, /speak:text=>speakSylora\(text,\{autoDetect:true\}\)/);
  assert.match(tiktokPilot, /speak=\(\)=>false/);
  assert.doesNotMatch(tiktokPilot, /new SpeechSynthesisUtterance|function speakLocal/);
});

test('Sylora voice language can extend beyond the five fully localized UI languages', () => {
  assert.match(app, /es:'es-ES',fr:'fr-FR',it:'it-IT',pt:'pt-PT'/);
  assert.match(app, /id='aiVoiceLocale'/);
  assert.match(app, /sylora_voice_locale/);
  assert.match(app, /\^\(uk\|pl\|en\|de\|ru\|es\|fr\|it\|pt\)/);
});

test('LIVE chat replies auto-detect language before voice playback', () => {
  for (const locale of ['uk-UA','pl-PL','ru-RU','de-DE','es-ES','fr-FR','it-IT','pt-PT','en-US']) assert.match(app,new RegExp(locale));
  assert.match(app, /autoDetect\?detectSyloraSpeechLocale\(text\):syloraSpeechLocale\(\)/);
  assert.match(tiktokPilot, /client\.tiktokEvents\(cursor\)/);
  assert.match(tiktokPilot, /event\.type==='chat'\|\|event\.type==='question'/);
});

test('sidebar has a real persisted desktop collapse and a visible mobile close control', () => {
  assert.match(html, /id="sidebarToggle"/);
  assert.match(app, /sylora_sidebar_collapsed/);
  assert.match(app, /classList\.toggle\('sidebar-collapsed'/);
  assert.match(bridge, /body\.sidebar-collapsed\{--sy-reference-sidebar:76px\}/);
  assert.match(bridge, /\.sidebar-toggle:after\{content:"×"/);
});

test('learning business and settings have distinct depth and reduced-motion-safe animation', () => {
  for (const animation of ['scienceOrbit','businessPulse','settingsBreathe']) assert.match(bridge,new RegExp(`@keyframes ${animation}`));
  assert.match(bridge,/prefers-reduced-motion:reduce/);
  assert.match(bridge,/body\[data-view="learning"\] \.glass-card/);
  assert.match(bridge,/body\[data-view="business"\] \.glass-card/);
  assert.match(bridge,/body\[data-view="more"\] \.glass-card/);
});
