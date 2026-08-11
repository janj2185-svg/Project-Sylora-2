import test from 'node:test';
import assert from 'node:assert/strict';
import { SpringValue, SyloraMotionRig, handPoseForGesture, gestureFrameForName } from '../public/sylora-motion.js';

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
  assert.ok(pose.joints.rightElbow < -8);
  assert.ok(pose.joints.rightShoulder > 4);
  assert.ok(pose.joints.rightWrist > 1);
  assert.ok(pose.gestureLift < -0.8);
  assert.ok(pose.hairX < 0);
  assert.ok(pose.bodyScale >= 1);
});

test('semantic gestures choose anatomical whole-hand poses and atlas frames', () => {
  assert.equal(handPoseForGesture('neutral'), 'neutral');
  assert.equal(handPoseForGesture('explain'), 'curl');
  assert.equal(handPoseForGesture('welcome'), 'open');
  assert.equal(handPoseForGesture('emphasis'), 'emphasis');
  assert.equal(handPoseForGesture('unknown'), 'neutral');
  assert.equal(gestureFrameForName('wave'), 5);
  assert.equal(gestureFrameForName('thinking'), 6);
  assert.equal(gestureFrameForName('positive'), 7);
});

test('assembled avatar markup contract uses one motion root', async () => {
  const css = await import('node:fs').then(fs => fs.readFileSync(new URL('../public/design-living-horizon.css', import.meta.url), 'utf8'));
  assert.match(css, /\.sylora-rig-root\{/);
  assert.match(css, /sylora-avatar-v2-base\.png/);
  assert.match(css, /sylora-gestures-v2\.png/);
  assert.match(css, /\.sylora-rig-arm,\.sylora-hand-pose\{display:none!important\}/);
  const app = await import('node:fs').then(fs => fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8'));
  assert.match(app, /sylora-rig-root/);
  assert.match(app, /sylora-avatar-gesture/);
  assert.doesNotMatch(app, /sylora-rig-arm-\$\{side\}/);
});
