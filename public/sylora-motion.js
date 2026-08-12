/**
 * Sylora Living Motion Rig — 2D portrait presence (NOT skeletal 3D).
 * Single RAF. Soft breathing + posture. No thrashing gesture-lift.
 * Quality tiers reduce amplitude, never remove life entirely.
 */

export const QUALITY_TIERS = Object.freeze({
  HIGH: { breathAmp: 0.0028, leanMax: 0.06, swayMax: 0.35, gazeAmp: 0.55 },
  MEDIUM: { breathAmp: 0.0022, leanMax: 0.045, swayMax: 0.25, gazeAmp: 0.4 },
  MOBILE: { breathAmp: 0.0018, leanMax: 0.035, swayMax: 0.18, gazeAmp: 0.32 },
  LOW: { breathAmp: 0.0012, leanMax: 0.02, swayMax: 0.1, gazeAmp: 0.2 }
});

/** Semantic joint targets — computed for legacy CSS vars; assembled portrait ignores bones. */
export const POSES = {
  neutral:  { leftShoulder: 0,  leftElbow: 8,  leftWrist: 0,  rightShoulder: 0,  rightElbow: -8,  rightWrist: 0 },
  explain:  { leftShoulder: -4, leftElbow: 18, leftWrist: -3, rightShoulder: 7,  rightElbow: -26, rightWrist: 5 },
  empathy:  { leftShoulder: 5,  leftElbow: 28, leftWrist: -5, rightShoulder: -6, rightElbow: -32, rightWrist: 5 },
  welcome:  { leftShoulder: -10,leftElbow: 22, leftWrist: -7, rightShoulder: 10, rightElbow: -22, rightWrist: 7 },
  emphasis: { leftShoulder: -2, leftElbow: 14, leftWrist: -2, rightShoulder: 9,  rightElbow: -36, rightWrist: 3 },
  wave:     { leftShoulder: 0,  leftElbow: 10, leftWrist: 0,  rightShoulder: 14, rightElbow: -44, rightWrist: 10 },
  thinking: { leftShoulder: -2, leftElbow: 12, leftWrist: -2, rightShoulder: 5,  rightElbow: -28, rightWrist: -3 },
  positive: { leftShoulder: -8, leftElbow: 24, leftWrist: -5, rightShoulder: 8,  rightElbow: -24, rightWrist: 6 }
};

const HAND_POSES = {
  neutral: 'neutral', explain: 'curl', empathy: 'open', welcome: 'open',
  emphasis: 'emphasis', wave: 'open', thinking: 'curl', positive: 'open'
};

export function handPoseForGesture(name = 'neutral') {
  return HAND_POSES[name] || 'neutral';
}

export function detectQualityTier({ width = 1280, reducedMotion = false, lowMemory = false } = {}) {
  if (reducedMotion || lowMemory) return 'LOW';
  if (width <= 480) return 'MOBILE';
  if (width <= 900) return 'MEDIUM';
  return 'HIGH';
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
    const safeDt = Math.max(0.1, Math.min(1.6, dt));
    this.velocity = (this.velocity + (this.target - this.value) * this.stiffness * safeDt) * Math.pow(this.damping, safeDt);
    this.value += this.velocity * safeDt;
    if (Math.abs(this.velocity) < 0.00005 && Math.abs(this.target - this.value) < 0.0005) {
      this.value = this.target;
      this.velocity = 0;
    }
    return this.value;
  }
}

/**
 * Living presence state machine (2D-capable subset).
 * Full skeletal states require a 3D model — documented as NOT_SUPPORTED.
 */
export const LIVING_STATES = Object.freeze([
  'idle_neutral', 'idle_listening', 'idle_thinking',
  'speaking_calm', 'speaking_happy', 'speaking_excited',
  'speaking_sad', 'speaking_serious', 'speaking_caring', 'speaking_surprised'
]);

export function livingStateFrom({ presence = 'ready', emotion = 'neutral' } = {}) {
  if (presence === 'listening') return 'idle_listening';
  if (presence === 'thinking') return 'idle_thinking';
  if (presence === 'speaking') {
    const map = {
      happy: 'speaking_happy', grateful: 'speaking_happy', playful: 'speaking_excited',
      excited: 'speaking_excited', concerned: 'speaking_sad', sad: 'speaking_sad',
      serious: 'speaking_serious', caring: 'speaking_caring', surprised: 'speaking_surprised'
    };
    return map[emotion] || 'speaking_calm';
  }
  return 'idle_neutral';
}

export class SyloraMotionRig {
  constructor(random = Math.random) {
    this.random = random;
    this.presence = 'ready';
    this.emotion = 'neutral';
    this.livingState = 'idle_neutral';
    this.gesture = 'neutral';
    this.voiceEnergy = 0;
    this.voiceEnergySmoothed = 0;
    this.gazeX = 0;
    this.gazeY = 0;
    this.lastFrame = 0;
    this.breathStartedAt = 0;
    this.breathDuration = 6800;
    this.breathAmplitude = 0.0024;
    this.quality = 'HIGH';
    this.tier = QUALITY_TIERS.HIGH;
    this.bodyY = new SpringValue(0, 0.055, 0.88);
    this.bodyRot = new SpringValue(0, 0.048, 0.9);
    this.bodySway = new SpringValue(0, 0.04, 0.9);
    this.hairX = new SpringValue(0, 0.06, 0.88);
    this.hairY = new SpringValue(0, 0.055, 0.88);
    this.hairRot = new SpringValue(0, 0.05, 0.9);
    this.joints = Object.fromEntries(
      Object.keys(POSES.neutral).map(name => [name, new SpringValue(POSES.neutral[name], 0.055, 0.88)])
    );
    this._raf = 0;
    this._active = false;
    this._fpsSamples = [];
    this._lastAdaptAt = 0;
  }

  setQuality(tier = 'HIGH') {
    this.quality = QUALITY_TIERS[tier] ? tier : 'HIGH';
    this.tier = QUALITY_TIERS[this.quality];
  }

  /** Adaptive quality from measured FPS — reduce amplitude, never remove blink/breath/face cues. */
  adaptFromFps(fps) {
    if (!Number.isFinite(fps) || fps <= 0) return;
    this._fpsSamples.push(fps);
    if (this._fpsSamples.length > 45) this._fpsSamples.shift();
    const now = performance.now?.() || Date.now();
    if (now - this._lastAdaptAt < 1800) return;
    this._lastAdaptAt = now;
    const avg = this._fpsSamples.reduce((a, b) => a + b, 0) / this._fpsSamples.length;
    const order = ['HIGH', 'MEDIUM', 'MOBILE', 'LOW'];
    let idx = order.indexOf(this.quality);
    if (idx < 0) idx = 0;
    if (avg < 28 && idx < order.length - 1) this.setQuality(order[idx + 1]);
    else if (avg > 52 && idx > 0) this.setQuality(order[idx - 1]);
  }

  setPresence(mode = 'ready') {
    this.presence = mode;
    this.livingState = livingStateFrom({ presence: mode, emotion: this.emotion });
  }

  setEmotion(emotion = 'neutral') {
    this.emotion = emotion || 'neutral';
    this.livingState = livingStateFrom({ presence: this.presence, emotion: this.emotion });
  }

  setGaze(x = 0, y = 0) {
    this.gazeX = Math.max(-1, Math.min(1, x));
    this.gazeY = Math.max(-1, Math.min(1, y));
  }

  setVoiceEnergy(level = 0) {
    this.voiceEnergy = Math.max(0, Math.min(1, level));
  }

  setGesture(name = 'neutral') {
    this.gesture = POSES[name] ? name : 'neutral';
    const pose = POSES[this.gesture];
    for (const [joint, target] of Object.entries(pose)) this.joints[joint].target = target;
  }

  nextBreath(now) {
    const speaking = this.presence === 'speaking';
    const listening = this.presence === 'listening';
    const thinking = this.presence === 'thinking';
    const range = speaking ? [4800, 6400] : listening ? [5200, 7000] : thinking ? [6000, 8200] : [6200, 8600];
    this.breathDuration = range[0] + this.random() * (range[1] - range[0]);
    this.breathAmplitude = this.tier.breathAmp * (0.9 + this.random() * 0.2);
    this.breathStartedAt = now;
    this.bodyRot.target = (this.random() - 0.5) * this.tier.leanMax;
    this.bodySway.target = (this.random() - 0.5) * this.tier.swayMax;
  }

  step(now = 0) {
    if (!this.breathStartedAt) this.nextBreath(now || 1);
    if (now - this.breathStartedAt >= this.breathDuration) this.nextBreath(now);
    const dt = this.lastFrame ? Math.min(1.6, (now - this.lastFrame) / 16.667) : 1;
    this.lastFrame = now;

    this.voiceEnergySmoothed += (this.voiceEnergy - this.voiceEnergySmoothed) * Math.min(1, 0.12 * dt);

    const phase = Math.max(0, Math.min(1, (now - this.breathStartedAt) / this.breathDuration));
    const breath = (1 - Math.cos(phase * Math.PI * 2)) / 2;
    const easedBreath = breath * breath * (3 - 2 * breath);

    // Subtle posture only — never amplify voice into vertical thrash
    this.bodyY.target = -easedBreath * 0.55;
    const gazeAmp = this.tier.gazeAmp;
    this.hairX.target = -this.gazeX * gazeAmp + Math.sin(now / 4200) * 0.08;
    this.hairY.target = this.gazeY * 0.12 - (this.presence === 'speaking' ? this.voiceEnergySmoothed * 0.08 : 0);
    this.hairRot.target = -this.hairX.target * 0.12;

    const jointValues = {};
    for (const [name, spring] of Object.entries(this.joints)) jointValues[name] = spring.step(dt);

    return {
      livingState: this.livingState,
      bodyScale: 1 + easedBreath * this.breathAmplitude,
      bodyY: this.bodyY.step(dt),
      bodyX: this.bodySway.step(dt),
      bodyRot: this.bodyRot.step(dt) * Math.sin(phase * Math.PI),
      hairX: this.hairX.step(dt),
      hairY: this.hairY.step(dt),
      hairRot: this.hairRot.step(dt),
      // Kept near-zero: large gestureLift was a primary jitter source on static PNGs
      gestureLift: this.presence === 'speaking' ? -this.voiceEnergySmoothed * 0.35 : 0,
      voiceEnergy: this.voiceEnergySmoothed,
      joints: jointValues
    };
  }

  attach(hero) {
    if (!hero || typeof requestAnimationFrame !== 'function') return () => {};
    if (hero._syloraMotionDetach) {
      try { hero._syloraMotionDetach(); } catch {}
    }
    this._active = true;
    const width = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowMemory = typeof navigator !== 'undefined' && navigator.deviceMemory && navigator.deviceMemory <= 2;
    this.setQuality(detectQualityTier({ width, reducedMotion: reduced, lowMemory }));

    const frame = now => {
      if (!this._active || !hero.isConnected) return;
      if (this.lastFrame) {
        const delta = now - this.lastFrame;
        if (delta > 0) this.adaptFromFps(1000 / delta);
      }
      const pose = this.step(now);
      hero.style.setProperty('--body-scale', pose.bodyScale.toFixed(5));
      hero.style.setProperty('--body-y', `${pose.bodyY.toFixed(3)}px`);
      hero.style.setProperty('--body-x', `${pose.bodyX.toFixed(3)}px`);
      hero.style.setProperty('--body-rot', `${pose.bodyRot.toFixed(3)}deg`);
      hero.style.setProperty('--hair-x', `${pose.hairX.toFixed(3)}px`);
      hero.style.setProperty('--hair-y', `${pose.hairY.toFixed(3)}px`);
      hero.style.setProperty('--hair-rot', `${pose.hairRot.toFixed(3)}deg`);
      hero.style.setProperty('--hair-skew', `${(pose.hairRot * 0.35).toFixed(3)}deg`);
      hero.style.setProperty('--gesture-lift', `${pose.gestureLift.toFixed(3)}px`);
      hero.dataset.livingState = pose.livingState;
      hero.dataset.qualityTier = this.quality;
      for (const [joint, value] of Object.entries(pose.joints)) {
        hero.style.setProperty(`--rig-${joint}`, `${value.toFixed(3)}deg`);
      }
      this._raf = requestAnimationFrame(frame);
    };
    this._raf = requestAnimationFrame(frame);
    const detach = () => {
      this._active = false;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
    };
    hero._syloraMotionDetach = detach;
    return detach;
  }
}

export { POSES as SYLORA_RIG_POSES };
