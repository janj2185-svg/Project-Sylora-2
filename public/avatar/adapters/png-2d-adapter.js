/**
 * 2D PNG Avatar Adapter — thin wrapper over SyloraLivingController / MotionRig.
 * Fallback for weak devices and until VRM/GLB digital human ships.
 * Does NOT claim skeletal/facial morph capabilities.
 */

import { SyloraLivingController, GESTURE_CATALOG } from '../../sylora-living.js';
import { normalizeBehavior, livingStateFrom, CAPABILITY } from '../contract.js';

export class Png2dAvatarAdapter {
  constructor(host, { motionRig = null, random = Math.random } = {}) {
    this.kind = '2d-png';
    this.host = host;
    this.motionRig = motionRig;
    this.random = random;
    this.controller = null;
    this.capabilities = Object.freeze({
      skeleton: CAPABILITY.NOT_SUPPORTED,
      facialBlendshapes: CAPABILITY.NOT_SUPPORTED,
      eyeBones: CAPABILITY.NOT_SUPPORTED,
      jaw: CAPABILITY.NOT_SUPPORTED,
      visemes: CAPABILITY.NOT_SUPPORTED,
      blink: CAPABILITY.PARTIAL,
      gaze: CAPABILITY.PARTIAL,
      breathing: CAPABILITY.WORKING,
      gestures: CAPABILITY.PARTIAL,
      hairPhysics: CAPABILITY.NOT_SUPPORTED,
      lipSync: CAPABILITY.PARTIAL,
      ik: CAPABILITY.NOT_SUPPORTED
    });
  }

  mount() {
    if (!this.host) return;
    this.controller = new SyloraLivingController(this.host, {
      motionRig: this.motionRig || this.host._syloraMotionRig || null,
      random: this.random
    });
    this.controller.layer = this.host._syloraGestureLayer || 0;
    this.controller.mountOverlays();
    this.controller.applyGesture(this.host.dataset.gesture || 'neutral', { force: true });
    this.host._syloraAvatarAdapter = this;
    this.host._syloraLiving = this.controller;
    this.host.dataset.avatarKind = this.kind;
  }

  dispose() {
    this.controller?.dispose?.();
    this.controller = null;
    if (this.host) {
      delete this.host._syloraAvatarAdapter;
      delete this.host._syloraLiving;
    }
  }

  applyBehavior(raw) {
    const b = normalizeBehavior(raw);
    if (b.presence) this.setPresence(b.presence);
    this.setEmotion(b.emotion, { cue: b.animationCue, intensity: b.intensity });
    if (b.gestureIntent && GESTURE_CATALOG[b.gestureIntent]) {
      this.controller?.applyGesture(b.gestureIntent, { force: true, duration: 1600 });
    } else if (b.animationCue && b.animationCue !== 'none') {
      this.controller?.applyCue(b.animationCue);
    }
    if (b.gazeIntent === 'soft') this.setGaze(-0.15, 0.05);
    else if (b.gazeIntent === 'away') this.setGaze(0.45, -0.2);
    else this.setGaze(0, 0);
  }

  setPresence(mode = 'ready', opts = {}) {
    this.controller?.setPresence(mode, opts);
  }

  setEmotion(emotion = 'neutral', opts = {}) {
    if (opts.intensity != null && this.controller) this.controller.intensity = opts.intensity;
    this.controller?.setEmotion(emotion, opts);
  }

  onAudioDelta(level = 0) {
    this.controller?.onAudioDelta();
    if (level > 0) this.controller?.setVoiceEnergy(level);
  }

  setVisemes() {
    // PNG plates have no morph targets — amplitude cue handled elsewhere
  }

  setGaze(x = 0, y = 0) {
    this.controller?.rig?.setGaze(x, y);
    if (this.host) {
      this.host.style.setProperty('--gaze-x', `${(x * 2.2).toFixed(2)}px`);
      this.host.style.setProperty('--gaze-y', `${(y * 1.4).toFixed(2)}px`);
    }
  }

  getStatus() {
    return {
      kind: this.kind,
      status: 'FALLBACK',
      livingState: livingStateFrom({
        presence: this.controller?.presence || 'ready',
        emotion: this.controller?.emotion || 'neutral'
      }),
      capabilities: this.capabilities,
      note: '2D PNG fallback. Digital human requires VRM/GLB asset (ASSET_REQUIRED).'
    };
  }
}
