/**
 * Sylora Living Avatar Controller — presence, gestures, gaze, blink cues.
 * Bound to 2D PNG plates: no skeleton/blendshapes available.
 * Face morphs / true lip-sync / eye bones = NOT_SUPPORTED by current model.
 */

import { livingStateFrom, handPoseForGesture } from './sylora-motion.js';

export const GESTURE_CATALOG = Object.freeze({
  neutral: '/assets/gestures/sylora-gesture-neutral.png',
  explain: '/assets/gestures/sylora-gesture-explain.png',
  empathy: '/assets/gestures/sylora-gesture-empathy.png',
  welcome: '/assets/gestures/sylora-gesture-welcome.png',
  emphasis: '/assets/gestures/sylora-gesture-emphasis.png',
  wave: '/assets/gestures/sylora-gesture-wave.png',
  thinking: '/assets/gestures/sylora-gesture-thinking.png',
  positive: '/assets/gestures/sylora-gesture-positive.png'
});

const EMOTION_GESTURES = Object.freeze({
  happy: ['positive', 'welcome'],
  grateful: ['empathy', 'positive'],
  concerned: ['empathy', 'thinking'],
  sad: ['empathy'],
  playful: ['welcome', 'positive'],
  excited: ['welcome', 'emphasis'],
  surprised: ['welcome'],
  caring: ['empathy'],
  serious: ['neutral', 'explain'],
  neutral: ['neutral']
});

const PRESENCE_GESTURES = Object.freeze({
  thinking: ['thinking'],
  listening: ['neutral'],
  muted: ['neutral'],
  ready: ['neutral'],
  speaking: ['explain', 'positive', 'empathy']
});

const CUE_TO_GESTURE = Object.freeze({
  wave: 'wave',
  nod: 'neutral',
  celebrate: 'positive',
  think: 'thinking',
  none: null,
  highlight_gift: 'welcome',
  encourage_chat: 'explain',
  battle_hype: 'emphasis'
});

export class GestureEngine {
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.current = 'neutral';
    this.lastAt = 0;
    this.cooldownMs = 1600;
    this.recent = [];
  }

  pick({ presence = 'ready', emotion = 'neutral', cue = null, force = false, now = Date.now() } = {}) {
    if (cue && CUE_TO_GESTURE[cue]) {
      const fromCue = CUE_TO_GESTURE[cue];
      if (fromCue && (force || fromCue !== this.current || now - this.lastAt > this.cooldownMs)) {
        return this._commit(fromCue, now);
      }
    }
    if (!force && now - this.lastAt < this.cooldownMs) return this.current;

    let pool = PRESENCE_GESTURES[presence] || PRESENCE_GESTURES.ready;
    if (presence === 'speaking') {
      const emo = EMOTION_GESTURES[emotion] || EMOTION_GESTURES.neutral;
      pool = [...new Set([...emo, ...pool])];
    }
    // Avoid immediate repeat of the same gesture
    const filtered = pool.filter(g => g !== this.current || pool.length === 1);
    // Prefer not reusing last 2
    const avoid = new Set(this.recent.slice(-2));
    const preferred = filtered.filter(g => !avoid.has(g));
    const choices = preferred.length ? preferred : filtered;
    const next = choices[Math.floor(this.random() * choices.length)] || 'neutral';
    return this._commit(next, now);
  }

  _commit(name, now) {
    this.current = GESTURE_CATALOG[name] ? name : 'neutral';
    this.lastAt = now;
    this.recent.push(this.current);
    if (this.recent.length > 6) this.recent.shift();
    return this.current;
  }
}

export class SyloraLivingController {
  constructor(hero, { motionRig = null, random = Math.random } = {}) {
    this.hero = hero;
    this.rig = motionRig;
    this.gestures = new GestureEngine({ random });
    this.presence = 'ready';
    this.emotion = 'neutral';
    this.intensity = 0.4;
    this.layer = 0;
    this._blinkTimer = 0;
    this._gazeTimer = 0;
    this._presenceLockUntil = 0;
    this._lastAudioPresenceAt = 0;
    this.reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  mountOverlays() {
    if (!this.hero || this.hero.querySelector('.sylora-life-overlays')) return;
    const box = document.createElement('div');
    box.className = 'sylora-life-overlays';
    box.setAttribute('aria-hidden', 'true');
    const blink = document.createElement('div');
    blink.className = 'sylora-life-blink';
    const gaze = document.createElement('div');
    gaze.className = 'sylora-life-gaze';
    box.append(blink, gaze);
    const motion = this.hero.querySelector('.sylora-avatar-motion');
    if (motion) motion.append(box);
    this._blinkEl = blink;
    this._scheduleBlink();
    this._scheduleGaze();
  }

  _scheduleBlink() {
    if (this.reduced) return;
    clearTimeout(this._blinkTimer);
    const wait = 2800 + Math.random() * 4200;
    this._blinkTimer = setTimeout(() => {
      if (!this.hero?.isConnected) return;
      this._blinkEl?.classList.add('blink-now');
      setTimeout(() => this._blinkEl?.classList.remove('blink-now'), 110);
      if (Math.random() < 0.12) {
        setTimeout(() => {
          this._blinkEl?.classList.add('blink-now');
          setTimeout(() => this._blinkEl?.classList.remove('blink-now'), 90);
        }, 180);
      }
      this._scheduleBlink();
    }, wait);
  }

  _scheduleGaze() {
    if (this.reduced) return;
    clearTimeout(this._gazeTimer);
    const wait = this.presence === 'thinking' ? 900 + Math.random() * 1400 : 1800 + Math.random() * 2800;
    this._gazeTimer = setTimeout(() => {
      if (!this.hero?.isConnected) return;
      let x = 0, y = 0;
      if (this.presence === 'thinking') {
        x = (Math.random() > 0.5 ? 1 : -1) * (0.35 + Math.random() * 0.4);
        y = -0.15 - Math.random() * 0.25;
      } else if (this.presence === 'listening') {
        x = (Math.random() - 0.5) * 0.25;
        y = (Math.random() - 0.5) * 0.12;
      } else if (this.presence === 'speaking') {
        x = (Math.random() - 0.5) * 0.18;
        y = (Math.random() - 0.5) * 0.1;
      } else {
        x = (Math.random() - 0.5) * 0.35;
        y = (Math.random() - 0.5) * 0.18;
      }
      this.rig?.setGaze(x, y);
      this.hero.style.setProperty('--gaze-x', `${(x * 2.2).toFixed(2)}px`);
      this.hero.style.setProperty('--gaze-y', `${(y * 1.4).toFixed(2)}px`);
      // Return toward user most of the time
      setTimeout(() => {
        if (!this.hero?.isConnected) return;
        if (Math.random() < 0.7) {
          this.rig?.setGaze(0, 0);
          this.hero.style.setProperty('--gaze-x', '0px');
          this.hero.style.setProperty('--gaze-y', '0px');
        }
      }, 220 + Math.random() * 280);
      this._scheduleGaze();
    }, wait);
  }

  setPresence(mode = 'ready', { forceGesture = false } = {}) {
    const now = Date.now();
    // Lock speaking presence briefly so audio deltas cannot thrash
    if (mode === 'speaking') this._presenceLockUntil = now + 420;
    else if (now < this._presenceLockUntil && mode !== 'thinking' && mode !== 'listening') {
      return this.presence;
    }
    const changed = this.presence !== mode;
    this.presence = mode;
    this.hero.dataset.presence = mode;
    this.rig?.setPresence(mode);
    this.hero.dataset.livingState = livingStateFrom({ presence: mode, emotion: this.emotion });
    if (changed || forceGesture) {
      const gesture = this.gestures.pick({
        presence: mode,
        emotion: this.emotion,
        force: forceGesture || mode === 'thinking',
        now
      });
      this.applyGesture(gesture, { force: true });
    }
    return mode;
  }

  /**
   * Throttled speaking presence for Realtime audio deltas — root-cause fix for gesture spam.
   */
  onAudioDelta() {
    const now = Date.now();
    if (now - this._lastAudioPresenceAt < 380) {
      this.rig?.setPresence('speaking');
      return;
    }
    this._lastAudioPresenceAt = now;
    this.setPresence('speaking');
  }

  setEmotion(emotion = 'neutral', { duration = 0, cue = null } = {}) {
    this.emotion = emotion || 'neutral';
    this.hero.dataset.emotion = this.emotion;
    this.rig?.setEmotion(this.emotion);
    const gesture = this.gestures.pick({
      presence: this.presence,
      emotion: this.emotion,
      cue,
      force: !!cue,
      now: Date.now()
    });
    this.applyGesture(gesture, { force: !!cue });
    clearTimeout(this._emotionTimer);
    if (duration) {
      this._emotionTimer = setTimeout(() => {
        if (!this.hero?.isConnected) return;
        this.emotion = 'neutral';
        this.hero.dataset.emotion = 'neutral';
        this.rig?.setEmotion('neutral');
        if (this.presence === 'ready') this.applyGesture('neutral', { force: true });
      }, duration);
    }
  }

  applyCue(cue) {
    if (!cue || cue === 'none') return;
    const gesture = this.gestures.pick({ presence: this.presence, emotion: this.emotion, cue, force: true });
    this.applyGesture(gesture, { force: true, duration: 1400 });
  }

  applyGesture(name = 'neutral', { force = false, duration = 0 } = {}) {
    const gestureName = GESTURE_CATALOG[name] ? name : 'neutral';
    if (!force && this.gestures.current === gestureName && this.hero.dataset.gesture === gestureName) return;
    this.gestures.current = gestureName;
    this.hero.dataset.gesture = gestureName;
    this.hero.dataset.handPose = handPoseForGesture(gestureName);
    this.rig?.setGesture(gestureName);
    this.hero.classList.toggle('gesture-active', gestureName !== 'neutral');

    const layers = [...this.hero.querySelectorAll('.sylora-avatar-gesture')];
    if (!layers.length) return;
    clearTimeout(this._gestureTimer);
    let next = layers.length === 1 ? 0 : (this.layer === 0 ? 1 : 0);
    const incoming = layers[next];
    const outgoing = layers[this.layer];
    // Avoid reloading identical src (browser decode thrash)
    const src = GESTURE_CATALOG[gestureName];
    if (incoming.getAttribute('src') !== src) incoming.src = src;
    incoming.classList.add('gesture-shown');
    if (outgoing && outgoing !== incoming) outgoing.classList.remove('gesture-shown');
    this.layer = next;
    if (duration) {
      this._gestureTimer = setTimeout(() => {
        if (!this.hero?.isConnected) return;
        const fallback = this.presence === 'thinking' ? 'thinking'
          : this.presence === 'speaking' ? 'explain' : 'neutral';
        this.applyGesture(fallback, { force: true });
      }, duration);
    }
  }

  setVoiceEnergy(level = 0) {
    this.rig?.setVoiceEnergy(level);
  }

  dispose() {
    clearTimeout(this._blinkTimer);
    clearTimeout(this._gazeTimer);
    clearTimeout(this._emotionTimer);
    clearTimeout(this._gestureTimer);
  }
}

export function detectEmotionFromText(text = '') {
  const s = String(text).toLowerCase();
  if (/[!]{2,}|(^|[^\p{L}])(wow|вау|ого)(?=[^\p{L}]|$)/u.test(s)) return 'surprised';
  if (/😂|🤣|😄|(ха-?ха|haha|żart|жарт)/i.test(s)) return 'playful';
  if (/(дякую|спасибі|thanks|thank you|dziękuję)/i.test(s)) return 'grateful';
  if (/(болить|погано|сумно|проблем|важко|sorry|sad|smutn)/i.test(s)) return 'concerned';
  if (/❤️|❤|(чудово|супер|класно|рада|радий|great|love|добре)/i.test(s)) return 'happy';
  if (/(серйозн|важлив|уважно|serious|важливо)/i.test(s)) return 'serious';
  return 'neutral';
}
