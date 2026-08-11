const POSES = {
  neutral:  { leftShoulder: 0,  leftElbow: 0, leftWrist: 0,  rightShoulder: 0,  rightElbow: 0, rightWrist: 0 },
  explain:  { leftShoulder: -2, leftElbow: 4, leftWrist: -2, rightShoulder: 5,  rightElbow: -8, rightWrist: 4 },
  empathy:  { leftShoulder: 3,  leftElbow: 6, leftWrist: -3, rightShoulder: -4, rightElbow: -10, rightWrist: 3 },
  welcome:  { leftShoulder: -6, leftElbow: 8, leftWrist: -4, rightShoulder: 6,  rightElbow: -8, rightWrist: 4 },
  emphasis: { leftShoulder: -1, leftElbow: 3, leftWrist: -1, rightShoulder: 7,  rightElbow: -12, rightWrist: 2 },
  wave:     { leftShoulder: 0,  leftElbow: 2, leftWrist: 0,  rightShoulder: 8,  rightElbow: -14, rightWrist: 6 },
  thinking: { leftShoulder: -1, leftElbow: 3, leftWrist: -1, rightShoulder: 3,  rightElbow: -9, rightWrist: -2 },
  positive: { leftShoulder: -4, leftElbow: 6, leftWrist: -3, rightShoulder: 4,  rightElbow: -6, rightWrist: 3 }
};

const HAND_POSES = {
  neutral: 'neutral',
  explain: 'curl',
  empathy: 'open',
  welcome: 'open',
  emphasis: 'emphasis',
  wave: 'open',
  thinking: 'curl',
  positive: 'open'
};

const GESTURE_FRAMES = {
  neutral: 0,
  explain: 1,
  empathy: 2,
  welcome: 3,
  emphasis: 4,
  wave: 5,
  thinking: 6,
  positive: 7
};

export function handPoseForGesture(name = 'neutral') {
  return HAND_POSES[name] || 'neutral';
}

export function gestureFrameForName(name = 'neutral') {
  return GESTURE_FRAMES[name] ?? 0;
}

export class SpringValue {
  constructor(value = 0, stiffness = 0.09, damping = 0.82) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  step(dt = 1) {
    const safeDt = Math.max(0.1, Math.min(2, dt));
    this.velocity = (this.velocity + (this.target - this.value) * this.stiffness * safeDt) * Math.pow(this.damping, safeDt);
    this.value += this.velocity * safeDt;
    return this.value;
  }
}

export class SyloraMotionRig {
  constructor(random = Math.random) {
    this.random = random;
    this.presence = 'ready';
    this.gesture = 'neutral';
    this.voiceEnergy = 0;
    this.gazeX = 0;
    this.gazeY = 0;
    this.lastFrame = 0;
    this.breathStartedAt = 0;
    this.breathDuration = 6500;
    this.breathAmplitude = 0.0034;
    this.bodyY = new SpringValue(0, 0.075, 0.84);
    this.bodyRot = new SpringValue(0, 0.065, 0.86);
    this.hairX = new SpringValue(0, 0.085, 0.82);
    this.hairY = new SpringValue(0, 0.08, 0.83);
    this.hairRot = new SpringValue(0, 0.07, 0.84);
    this.joints = Object.fromEntries(Object.keys(POSES.neutral).map(name => [name, new SpringValue(POSES.neutral[name], 0.07, 0.84)]));
  }

  setPresence(mode = 'ready') { this.presence = mode; }
  setGaze(x = 0, y = 0) { this.gazeX = Math.max(-1, Math.min(1, x)); this.gazeY = Math.max(-1, Math.min(1, y)); }
  setVoiceEnergy(level = 0) { this.voiceEnergy = Math.max(0, Math.min(1, level)); }

  setGesture(name = 'neutral') {
    this.gesture = POSES[name] ? name : 'neutral';
    const pose = POSES[this.gesture];
    for (const [joint, target] of Object.entries(pose)) this.joints[joint].target = target;
  }

  nextBreath(now) {
    const range = this.presence === 'speaking' ? [4100, 5600] : this.presence === 'listening' ? [4500, 6200] : this.presence === 'thinking' ? [5400, 7600] : [5600, 7900];
    const baseAmplitude = this.presence === 'speaking' ? 0.0026 : this.presence === 'listening' ? 0.0032 : this.presence === 'thinking' ? 0.0038 : 0.0034;
    this.breathDuration = range[0] + this.random() * (range[1] - range[0]);
    this.breathAmplitude = baseAmplitude * (0.86 + this.random() * 0.28);
    this.breathStartedAt = now;
    this.bodyRot.target = (this.random() - 0.5) * 0.08;
  }

  step(now = 0) {
    if (!this.breathStartedAt) this.nextBreath(now || 1);
    if (now - this.breathStartedAt >= this.breathDuration) this.nextBreath(now);
    const dt = this.lastFrame ? Math.min(2, (now - this.lastFrame) / 16.667) : 1;
    this.lastFrame = now;
    const phase = Math.max(0, Math.min(1, (now - this.breathStartedAt) / this.breathDuration));
    const breath = (1 - Math.cos(phase * Math.PI * 2)) / 2;
    const easedBreath = breath * breath * (3 - 2 * breath);
    this.bodyY.target = -easedBreath * 0.9;
    this.hairX.target = -this.gazeX * 0.65 + Math.sin(now / 3100) * 0.14;
    this.hairY.target = this.gazeY * 0.18 - (this.presence === 'speaking' ? this.voiceEnergy * 0.32 : 0);
    this.hairRot.target = -this.hairX.target * 0.16;
    const jointValues = {};
    for (const [name, spring] of Object.entries(this.joints)) jointValues[name] = spring.step(dt);
    return {
      bodyScale: 1 + easedBreath * this.breathAmplitude,
      bodyY: this.bodyY.step(dt),
      bodyRot: this.bodyRot.step(dt) * Math.sin(phase * Math.PI),
      hairX: this.hairX.step(dt),
      hairY: this.hairY.step(dt),
      hairRot: this.hairRot.step(dt),
      gestureLift: this.presence === 'speaking' ? -this.voiceEnergy * 1.4 : 0,
      joints: jointValues
    };
  }

  attach(hero) {
    if (!hero || typeof requestAnimationFrame !== 'function') return () => {};
    let active = true;
    const root = () => hero.querySelector('.sylora-rig-root') || hero;
    const frame = now => {
      if (!active || !hero.isConnected) return;
      const pose = this.step(now);
      const target = root();
      target.style.setProperty('--body-scale', pose.bodyScale.toFixed(5));
      target.style.setProperty('--body-y', `${pose.bodyY.toFixed(3)}px`);
      target.style.setProperty('--body-rot', `${pose.bodyRot.toFixed(3)}deg`);
      target.style.setProperty('--hair-x', `${pose.hairX.toFixed(3)}px`);
      target.style.setProperty('--hair-y', `${pose.hairY.toFixed(3)}px`);
      target.style.setProperty('--hair-rot', `${pose.hairRot.toFixed(3)}deg`);
      target.style.setProperty('--hair-skew', `${(pose.hairRot * 0.42).toFixed(3)}deg`);
      target.style.setProperty('--gesture-lift', `${pose.gestureLift.toFixed(3)}px`);
      for (const [joint, value] of Object.entries(pose.joints)) {
        target.style.setProperty(`--rig-${joint}`, `${value.toFixed(3)}deg`);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return () => { active = false; };
  }
}

export { POSES as SYLORA_RIG_POSES, GESTURE_FRAMES as SYLORA_GESTURE_FRAMES };
