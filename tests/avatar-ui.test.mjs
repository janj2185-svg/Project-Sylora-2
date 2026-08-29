import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('assembled avatar mounts whole-character images before the shell convergence layer', () => {
  const html = fs.readFileSync('public/index.html', 'utf8');
  assert.match(html, /design-avatar-assembled\.css\?v=/);
  assert.match(html, /design-living-horizon-v3\.css\?v=/);
  assert.ok(html.indexOf('design-ai-2026.css') < html.indexOf('design-avatar-assembled.css'));
  assert.ok(html.indexOf('design-avatar-assembled.css') < html.indexOf('design-living-horizon-v3.css'));
  assert.doesNotMatch(html, /design-scenes-v[56]\.css/);
  assert.match(html, /data-view="more"/);
  const dock = html.split('mobile-dock')[1].split('</nav>')[0];
  assert.match(dock, /data-view="profile"/);
  assert.match(dock, /data-view="messages"/);
  assert.match(dock, /data-view="ai"/);
  assert.match(dock, /data-i18n="inbox"/);
  assert.doesNotMatch(dock, /data-view="more"/);
  assert.doesNotMatch(dock, /data-view="gifts"/);

  const app = fs.readFileSync('public/app.js', 'utf8');
  assert.match(app, /createElement\('img'\)/);
  assert.match(app, /sylora-avatar-runtime\.js/);
  assert.doesNotMatch(app, /\/assets\/gestures\/sylora-gesture-/);
  assert.match(app, /\/api\/kg/);
  assert.match(app, /type:'knowledge'/);
  const mount = app.split('function mountSyloraAvatarLayers')[1].split('function ')[0];
  assert.equal((mount.match(/createElement\('img'\)/g)||[]).length, 1);
  assert.doesNotMatch(mount, /sylora-rig-arm/);
  assert.doesNotMatch(mount, /createElement\('i'\)/);

  const css = fs.readFileSync('public/design-avatar-assembled.css', 'utf8');
  assert.match(css, /object-fit:cover!important/);
  assert.match(css, /\.sylora-avatar-gesture\{[\s\S]*display:none!important/);
  assert.match(css, /sylora-visual-hidden \.sylora-avatar-motion,[\s\S]*sylora-visual-hidden \.ai-human-presence\{[\s\S]*display:none!important/);
  assert.match(css, /max-width:980px/);
  assert.match(css, /realtime-live/);
});

test('gift engines resolve Three.js via relative vendor path (not bare specifier)', () => {
  const expected = {
    'public/gift-gpu-engine.js': "./vendor/three/three.module.js",
    'public/gift-v2/webgl-renderer.js': "../vendor/three/three.module.js",
    'public/gift-v2/phoenix-rebirth.js': "../vendor/three/three.module.js"
  };
  for (const [file, from] of Object.entries(expected)) {
    const src = fs.readFileSync(file, 'utf8');
    assert.match(src, new RegExp(`from '${from.replace(/\./g, '\\.')}'`));
    assert.doesNotMatch(src, /from 'three'/);
  }
  assert.ok(fs.existsSync('public/vendor/three/three.module.js'));
});

test('deploy prep artifacts exist without inventing SSH secrets', () => {
  assert.ok(fs.existsSync('infra/nginx/sylora.conf.example'));
  assert.ok(fs.existsSync('docs/DEPLOY-HETZNER.md'));
  assert.ok(fs.existsSync('scripts/deploy-prod.sh'));
  const deployDoc = fs.readFileSync('docs/DEPLOY-HETZNER.md', 'utf8');
  assert.match(deployDoc, /77\.42\.42\.246/);
  assert.match(deployDoc, /Do not invent/);
  assert.doesNotMatch(deployDoc, /BEGIN (OPENSSH |RSA )?PRIVATE KEY/);
});
