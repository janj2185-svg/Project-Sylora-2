import { SyloraMotionRig, handPoseForGesture } from './sylora-motion.js';

function mount() {
  const hero = document.querySelector('.sylora-ai-hero');
  if (!hero || hero.querySelector('.sylora-avatar-motion')) return hero;
  const motion = document.createElement('div');
  motion.className = 'sylora-avatar-motion';
  motion.setAttribute('aria-hidden', 'true');
  const body = document.createElement('i');
  body.className = 'sylora-avatar-body';
  motion.append(body);
  for (let i = 0; i < 2; i++) {
    const gesture = document.createElement('i');
    gesture.className = 'sylora-avatar-gesture';
    motion.append(gesture);
  }
  for (const side of ['left', 'right']) {
    const arm = document.createElement('div');
    arm.className = `sylora-rig-arm sylora-rig-arm-${side}`;
    const upper = document.createElement('span');
    const forearm = document.createElement('span');
    const hand = document.createElement('span');
    upper.className = 'sylora-rig-upper';
    forearm.className = 'sylora-rig-forearm';
    hand.className = 'sylora-rig-hand';
    for (const pose of ['neutral', 'open', 'curl', 'emphasis']) {
      const frame = document.createElement('span');
      frame.className = `sylora-hand-pose sylora-hand-pose-${pose}`;
      hand.append(frame);
    }
    forearm.append(hand);
    upper.append(forearm);
    arm.append(upper);
    motion.append(arm);
  }
  for (const name of ['head', 'hair', 'eyes', 'blink']) {
    const layer = document.createElement('i');
    layer.className = `sylora-avatar-${name}`;
    motion.append(layer);
  }
  hero.append(motion);
  hero.classList.add('rig-live');
  const rig = new SyloraMotionRig();
  hero._syloraMotionRig = rig;
  rig.setGesture('neutral');
  rig.attach(hero);
  return hero;
}

const hero = mount();
const poses = ['neutral', 'explain', 'empathy', 'welcome', 'emphasis', 'wave', 'thinking', 'positive'];
const presence = ['ready', 'listening', 'thinking', 'speaking'];
const box = document.querySelector('#controls');
for (const name of poses) {
  const btn = document.createElement('button');
  btn.textContent = name;
  btn.onclick = () => {
    hero.dataset.gesture = name;
    hero.dataset.handPose = handPoseForGesture(name);
    hero._syloraMotionRig.setGesture(name);
    hero.classList.toggle('gesture-active', name !== 'neutral');
    [...hero.querySelectorAll('.sylora-avatar-gesture')].forEach((layer, idx) => {
      const frames = {neutral:0,explain:1,empathy:2,welcome:3,emphasis:4,wave:5,thinking:6,positive:7};
      const frame = frames[name] || 0;
      if (!frame) layer.classList.remove('gesture-shown');
      else if (idx === 0) {
        layer.style.setProperty('--gesture-x', `${(frame % 4) * 33.333}%`);
        layer.style.setProperty('--gesture-y', frame > 3 ? '100%' : '0%');
        layer.classList.add('gesture-shown');
      }
    });
    [...box.querySelectorAll('[data-pose]')].forEach(b => b.classList.toggle('active', b.dataset.pose === name));
  };
  btn.dataset.pose = name;
  if (name === 'neutral') btn.classList.add('active');
  box.append(btn);
}
for (const mode of presence) {
  const btn = document.createElement('button');
  btn.textContent = `presence:${mode}`;
  btn.onclick = () => {
    hero.dataset.presence = mode;
    hero._syloraMotionRig.setPresence(mode);
    hero._syloraMotionRig.setVoiceEnergy(mode === 'speaking' ? 0.7 : 0);
  };
  box.append(btn);
}
