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

test('assembled Digital Human assets and gesture sheet are present', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = path.resolve('public/assets');
  for (const file of ['sylora-avatar-v2-base.png', 'sylora-gestures-v2.png', 'sylora-visemes-v2.png', 'sylora-expressions-v2.png']) {
    assert.ok(fs.existsSync(path.join(root, file)), file);
  }
  const css = fs.readFileSync('public/design-living-horizon.css', 'utf8');
  assert.match(css, /Digital Human V3 — Assembled Sylora/);
  assert.match(css, /\.sylora-ai-hero\.sylora-assembled \.sylora-rig-arm\{display:none/);
  const app = fs.readFileSync('public/app.js', 'utf8');
  assert.match(app, /sylora-assembled/);
  assert.match(app, /sylora-avatar-gesture/);
  assert.doesNotMatch(app.split('function mountSyloraAvatarLayers')[1].split('function ')[0], /sylora-rig-arm/);
});
