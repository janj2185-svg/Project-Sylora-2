import test from 'node:test';
import assert from 'node:assert/strict';
import { SpringValue, SyloraMotionRig, handPoseForGesture } from '../public/sylora-motion.js';

test('motion spring converges without snapping', () => {
  const spring = new SpringValue(0);
  spring.target = 20;
  const first = spring.step(1);
  assert.ok(first > 0 && first < 20);
  for (let i = 0; i < 180; i++) spring.step(1);
  assert.ok(Math.abs(spring.value - 20) < 0.01);
});

test('Sylora motion rig drives soft living posture without thrash lift', () => {
  const rig = new SyloraMotionRig(() => 0.5);
  rig.setPresence('speaking');
  rig.setGesture('emphasis');
  rig.setGaze(0.8, -0.4);
  rig.setVoiceEnergy(0.75);
  let pose;
  for (let frame = 0; frame < 90; frame++) pose = rig.step(frame * 16.667 + 1);
  assert.ok(pose.joints.rightElbow < -30);
  assert.ok(pose.joints.rightShoulder > 6);
  assert.ok(pose.gestureLift > -1); // anti-jitter: lift stays tiny
  assert.ok(pose.bodyScale >= 1);
  assert.equal(pose.livingState, 'speaking_calm');
});

test('semantic gestures choose anatomical whole-hand poses', () => {
  assert.equal(handPoseForGesture('neutral'), 'neutral');
  assert.equal(handPoseForGesture('explain'), 'curl');
  assert.equal(handPoseForGesture('welcome'), 'open');
  assert.equal(handPoseForGesture('emphasis'), 'emphasis');
  assert.equal(handPoseForGesture('unknown'), 'neutral');
});

test('assembled Digital Human uses whole-character images, not collage layers', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = path.resolve('public/assets');
  assert.ok(fs.existsSync(path.join(root, 'sylora-avatar-v2-base.png')));
  for (const name of ['neutral', 'explain', 'empathy', 'welcome', 'emphasis', 'wave', 'thinking', 'positive']) {
    assert.ok(fs.existsSync(path.join(root, 'gestures', `sylora-gesture-${name}.png`)), name);
  }
  const finalCss = fs.readFileSync('public/design-avatar-assembled.css', 'utf8');
  assert.match(finalCss, /position:absolute!important/);
  assert.match(finalCss, /object-fit:cover!important/);
  assert.match(finalCss, /\.sylora-rig-arm/);
  assert.match(finalCss, /display:none!important/);
  assert.doesNotMatch(finalCss, /background-size:400% 200%/);
  const html = fs.readFileSync('public/index.html', 'utf8');
  assert.match(html, /design-avatar-assembled\.css/);
  const app = fs.readFileSync('public/app.js', 'utf8');
  assert.match(app, /sylora-assembled/);
  assert.match(app, /createElement\('img'\)/);
  assert.match(app, /GESTURE_CATALOG|sylora-living/);
  assert.match(fs.readFileSync(path.join('public', 'sylora-living.js'), 'utf8'), /\/assets\/gestures\/sylora-gesture-/);
  const mount = app.split('function mountSyloraAvatarLayers')[1].split('function detectSyloraEmotion')[0];
  assert.doesNotMatch(mount, /sylora-rig-arm/);
  assert.doesNotMatch(mount, /sylora-avatar-head/);
  assert.doesNotMatch(mount, /['"]eyes['"]/);
  assert.doesNotMatch(mount, /createElement\('i'\)/);
});
