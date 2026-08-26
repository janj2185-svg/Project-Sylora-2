import test from 'node:test';
import assert from 'node:assert/strict';
import { SpringValue, SyloraMotionRig, handPoseForGesture } from '../public/sylora-motion.js';
import {
  SYLORA_AVATAR_VERSION,
  SYLORA_FRAME_SRC,
  SYLORA_GESTURE_SEQUENCES,
  syloraBlinkSequence,
  syloraFrameSrc,
  syloraGestureSequence,
  syloraRestingFrame
} from '../public/sylora-avatar-runtime.js';

test('motion spring converges without snapping', () => {
  const spring = new SpringValue(0);
  spring.target = 20;
  const first = spring.step(1);
  assert.ok(first > 0 && first < 20);
  for (let i = 0; i < 180; i++) spring.step(1);
  assert.ok(Math.abs(spring.value - 20) < 0.01);
});

test('Sylora motion rig drives semantic joints and voice-reactive posture', () => {
  const rig = new SyloraMotionRig(() => 0.5);
  rig.setPresence('speaking');
  rig.setGesture('emphasis');
  rig.setGaze(0.8, -0.4);
  rig.setVoiceEnergy(0.75);
  let pose;
  for (let frame = 0; frame < 90; frame++) pose = rig.step(frame * 16.667 + 1);
  assert.ok(pose.joints.rightElbow < -35);
  assert.ok(pose.joints.rightShoulder > 8);
  assert.ok(pose.joints.rightWrist > 3);
  assert.ok(pose.joints.leftWrist < -2);
  assert.ok(pose.gestureLift < -1.5);
  assert.ok(pose.hairX < 0);
  assert.ok(pose.bodyScale >= 1);
});

test('semantic gestures choose anatomical whole-hand poses', () => {
  assert.equal(handPoseForGesture('neutral'), 'neutral');
  assert.equal(handPoseForGesture('explain'), 'curl');
  assert.equal(handPoseForGesture('welcome'), 'open');
  assert.equal(handPoseForGesture('emphasis'), 'emphasis');
  assert.equal(handPoseForGesture('unknown'), 'neutral');
});

test('canonical avatar runtime uses validated single-plate full-body assets', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  assert.equal(SYLORA_AVATAR_VERSION, '2.1.0');
  assert.equal(Object.keys(SYLORA_GESTURE_SEQUENCES).length, 8);
  for (const [frame, source] of Object.entries(SYLORA_FRAME_SRC)) {
    const file = path.resolve('public', source.replace(/^\//, ''));
    assert.ok(fs.existsSync(file), frame);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF', frame);
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP', frame);
  }
  assert.equal(syloraFrameSrc('unknown'), SYLORA_FRAME_SRC.neutral);
  assert.equal(syloraRestingFrame('wave'), 'greeting');
  assert.equal(syloraGestureSequence('unknown'), SYLORA_GESTURE_SEQUENCES.neutral);
  assert.deepEqual(syloraBlinkSequence('thinking'), []);

  const manifest = JSON.parse(fs.readFileSync('public/assets/avatar/sylora-v2/runtime.json', 'utf8'));
  assert.equal(manifest.renderMode, 'single_plate_2d_fallback');
  assert.equal(manifest.isRigged3DModel, false);
  assert.equal(manifest.logo.separateOverlay, false);
  assert.equal(manifest.motion.crossFadeBetweenBodyPlates, false);
  assert.equal(manifest.threeD.runtimeGlb, null);

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
  assert.match(app, /single-plate-2d/);
  assert.doesNotMatch(app, /\/assets\/gestures\/sylora-gesture-/);
  const mount = app.split('function mountSyloraAvatarLayers')[1].split('function ')[0];
  assert.equal((mount.match(/createElement\('img'\)/g)||[]).length, 1);
  assert.doesNotMatch(mount, /sylora-rig-arm/);
  assert.doesNotMatch(mount, /sylora-avatar-head/);
  assert.doesNotMatch(mount, /['"]eyes['"]/);
  assert.doesNotMatch(mount, /createElement\('i'\)/);
});
