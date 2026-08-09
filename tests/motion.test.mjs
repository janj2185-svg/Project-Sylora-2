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
