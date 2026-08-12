import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { SyloraLiveHost } from '../src/live/ai-host/host.mjs';
import { createLiveEvent } from '../src/live/core/types.mjs';
import { LiveEventBus } from '../src/live/events/bus.mjs';
import { UnifiedLiveChat } from '../src/live/chat/unified-chat.mjs';

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.isFile() && p.endsWith('.js')) out.push(p);
  }
  return out;
}

async function waitListening(port, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.status > 0) return;
    } catch {}
    await sleep(100);
  }
  throw new Error('server not listening');
}

test('vendor three addons never use bare specifier from \'three\'', () => {
  const files = walk('public/vendor/three/addons');
  assert.ok(files.length >= 9);
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(src, /from ['"]three['"]/, file);
  }
});

test('index.html has favicon + importmap; CSP allows importmap hash', async () => {
  const html = fs.readFileSync('public/index.html', 'utf8');
  assert.match(html, /rel="icon"[^>]+sylora-mark-v2\.svg/);
  assert.match(html, /type="importmap"/);
  assert.match(html, /\?v=20260812-ready1/);

  const port = 8793;
  const child = spawn(process.execPath, ['src/server.mjs'], {
    env: { ...process.env, PORT: String(port), DATABASE_URL: '', REDIS_URL: '', NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    await waitListening(port);
    const res = await fetch(`http://127.0.0.1:${port}/`);
    const csp = res.headers.get('content-security-policy') || '';
    assert.match(csp, /sha256-dkIVxJOkhk\+dsLekdBE1wjlHzMelv\+mUnkUYQRC39To=/);
    assert.match(csp, /worker-src 'self' blob:/);
    const icon = await fetch(`http://127.0.0.1:${port}/assets/sylora-mark-v2.svg`);
    assert.equal(icon.status, 200);
  } finally {
    child.kill('SIGTERM');
  }
});

test('session restore gate prevents false login redirect while booting', () => {
  const app = fs.readFileSync('public/app.js', 'utf8');
  assert.match(app, /sessionRestoring/);
  assert.match(app, /requireSession/);
  assert.match(app, /pendingNavView/);
  assert.match(app, /data-session-restore/);
  assert.match(app, /cleanupLiveStudio/);
  // Auth-gated views must use requireSession, not bare state.me?…:renderAuth for liveStudio/studio
  assert.match(app, /liveStudio'\)return run\(\(\)=>requireSession/);
  assert.match(app, /studio'\)return run\(\(\)=>requireSession/);
});

test('AI co-host reads message or text and reports AI_CONFIGURATION_REQUIRED without key', () => {
  const host = new SyloraLiveHost({
    controls: { autonomy: 'CO_HOST', chatReactions: true, interruptProtection: false, responseFrequency: 1, minimumSilenceMs: 0 },
    openai: null
  });
  const snap = host.snapshot();
  assert.equal(snap.aiState, 'AI_CONFIGURATION_REQUIRED');
  assert.ok(Array.isArray(snap.pipeline) && snap.pipeline.includes('event_bus'));

  const decision = host.considerEvent({
    eventType: 'chat_message',
    username: 'anna',
    text: 'hey Sylora what is up',
    mentionsSylora: true,
    platform: 'sylora'
  }, { priorityScore: 90 });
  assert.equal(decision.speak, true);
  assert.match(decision.reply.text, /anna/i);
  assert.match(decision.reply.text, /what is up/i);
  assert.equal(decision.aiState, 'AI_CONFIGURATION_REQUIRED');
});

test('live event aliases + unified chat keep platform metadata', () => {
  const bus = new LiveEventBus({ ratePerSec: 200 });
  const chat = new UnifiedLiveChat();
  const pub = bus.publish({
    type: 'comment',
    platform: 'twitch',
    userId: 'u1',
    username: 'bob',
    text: 'hello from twitch',
    isSubscriber: true,
    badges: ['sub']
  });
  assert.equal(pub.accepted, true);
  assert.equal(pub.event.eventType, 'chat_message');
  const ingested = chat.ingestNormalizedEvent(pub.event);
  assert.equal(ingested.accepted, true);
  assert.equal(ingested.message.platform, 'twitch');
  assert.equal(ingested.message.externalUserId, 'u1');
  assert.equal(ingested.message.isSubscriber, true);
  assert.ok(ingested.message.badge?.label);

  const guest = createLiveEvent({ platform: 'sylora', eventType: 'guest_join', username: 'guest1' });
  assert.equal(guest.eventType, 'guest_join');
});

test('live-studio UI is honest about AI/platform states and cleans up', () => {
  const ui = fs.readFileSync('public/live-studio.js', 'utf8');
  assert.match(ui, /AI_CONFIGURATION_REQUIRED/);
  assert.match(ui, /cleanupLiveStudio/);
  assert.match(ui, /AUTH_REQUIRED|CONFIGURATION_REQUIRED|SETUP_REQUIRED/);
  assert.doesNotMatch(ui, /fake Connected|mock chat|simulate.*CONNECTED/i);
  const css = fs.readFileSync('public/live-studio.css', 'utf8');
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /\.sl-bottom\{display:flex!important\}/);
});

test('external platform snapshots are AUTH_REQUIRED not fake Connected', async () => {
  const { PlatformRegistry } = await import('../src/live/platforms/registry.mjs');
  const store = { data: { liveRtmpDestinations: [] }, save() {} };
  const registry = new PlatformRegistry({ bus: null, store, userId: 'u' }).ensureDefaults();
  const rows = registry.listConnections();
  const tiktok = rows.find((r) => r.platform === 'tiktok');
  const ig = rows.find((r) => r.platform === 'instagram');
  assert.ok(tiktok);
  assert.equal(tiktok.state, 'AUTH_REQUIRED');
  assert.notEqual(tiktok.state, 'CONNECTED');
  assert.equal(ig.state, 'UNAVAILABLE');
});

test('deploy script supports backup, smoke markers, and rollback', () => {
  const sh = fs.readFileSync('scripts/deploy-prod.sh', 'utf8');
  assert.match(sh, /backup_tree/);
  assert.match(sh, /rollback_to/);
  assert.match(sh, /EXPECTED_CACHE_HINT=.*20260812/);
  assert.match(sh, /migrate\.mjs/);
  // Executable lines must not run destructive resets (comments may warn against them).
  const executable = sh.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  assert.doesNotMatch(executable, /git\s+reset\s+--hard/);
  assert.doesNotMatch(executable, /docker\s+compose\s+down\s+-v/);
  assert.ok(fs.existsSync('scripts/owner-deploy-getsylora.sh'));
});
