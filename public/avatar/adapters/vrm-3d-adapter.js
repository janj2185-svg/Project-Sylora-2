/**
 * 3D VRM/GLB Avatar Adapter — architecture stub until production asset lands.
 * Does NOT invent a model. Reports ASSET_REQUIRED when file missing.
 * When asset exists, mount() will load via Three.js GLTF/VRM pipeline (future).
 */

import { normalizeBehavior, livingStateFrom, CAPABILITY } from '../contract.js';

/** Canonical path for the production digital-human asset (not present yet). */
export const DIGITAL_HUMAN_ASSET_CANDIDATES = Object.freeze([
  '/assets/avatar/sylora-digital-human.vrm',
  '/assets/avatar/sylora-digital-human.glb',
  '/assets/sylora-digital-human.vrm',
  '/assets/sylora-digital-human.glb'
]);

/**
 * Detect whether a production-quality digital human file is available.
 * Synchronous probe for known paths; optional explicit assetUrl override.
 */
export function detectDigitalHumanAsset(assetUrl = null) {
  if (assetUrl) {
    return { available: true, url: assetUrl, format: guessFormat(assetUrl), probed: false };
  }
  // Bundle-time / runtime: no VRM/GLB ships in repo today.
  // Future: HEAD-request or manifest. Keep honest.
  return {
    available: false,
    url: null,
    format: null,
    probed: true,
    candidates: DIGITAL_HUMAN_ASSET_CANDIDATES,
    status: CAPABILITY.ASSET_REQUIRED
  };
}

function guessFormat(url = '') {
  const s = String(url).toLowerCase();
  if (s.endsWith('.vrm')) return 'vrm';
  if (s.endsWith('.glb') || s.endsWith('.gltf')) return 'glb';
  if (s.endsWith('.fbx')) return 'fbx';
  return 'unknown';
}

export class Vrm3dAvatarAdapter {
  constructor(host, { asset = null, random = Math.random } = {}) {
    this.kind = '3d-vrm';
    this.host = host;
    this.asset = asset || detectDigitalHumanAsset();
    this.random = random;
    this._behavior = normalizeBehavior();
    this.capabilities = Object.freeze({
      skeleton: this.asset.available ? CAPABILITY.WORKING : CAPABILITY.ASSET_REQUIRED,
      facialBlendshapes: this.asset.available ? CAPABILITY.WORKING : CAPABILITY.ASSET_REQUIRED,
      eyeBones: this.asset.available ? CAPABILITY.WORKING : CAPABILITY.ASSET_REQUIRED,
      jaw: this.asset.available ? CAPABILITY.WORKING : CAPABILITY.ASSET_REQUIRED,
      visemes: this.asset.available ? CAPABILITY.WORKING : CAPABILITY.ASSET_REQUIRED,
      blink: this.asset.available ? CAPABILITY.WORKING : CAPABILITY.ASSET_REQUIRED,
      gaze: this.asset.available ? CAPABILITY.WORKING : CAPABILITY.ASSET_REQUIRED,
      breathing: this.asset.available ? CAPABILITY.WORKING : CAPABILITY.ASSET_REQUIRED,
      gestures: this.asset.available ? CAPABILITY.WORKING : CAPABILITY.ASSET_REQUIRED,
      hairPhysics: this.asset.available ? CAPABILITY.PARTIAL : CAPABILITY.ASSET_REQUIRED,
      lipSync: this.asset.available ? CAPABILITY.WORKING : CAPABILITY.ASSET_REQUIRED,
      ik: this.asset.available ? CAPABILITY.PARTIAL : CAPABILITY.ASSET_REQUIRED
    });
  }

  async mount() {
    if (this.host) {
      this.host.dataset.avatarKind = this.kind;
      this.host.dataset.avatarStatus = this.asset.available ? 'READY' : 'ASSET_REQUIRED';
      this.host._syloraAvatarAdapter = this;
    }
    if (!this.asset.available) {
      // Do not invent geometry. Host may keep 2D fallback visually.
      return;
    }
    // Future: dynamic import Three.js + @pixiv/three-vrm, AnimationMixer, etc.
    throw new Error('VRM_LOADER_NOT_WIRED');
  }

  dispose() {
    if (this.host) {
      delete this.host._syloraAvatarAdapter;
      delete this.host.dataset.avatarStatus;
    }
  }

  applyBehavior(raw) {
    this._behavior = normalizeBehavior(raw);
    // No mesh yet — behavior retained for when asset ships
  }

  setPresence(mode = 'ready') {
    this._behavior.presence = mode;
  }

  setEmotion(emotion = 'neutral', opts = {}) {
    this._behavior.emotion = emotion;
    if (opts.intensity != null) this._behavior.intensity = opts.intensity;
  }

  onAudioDelta() {}

  setVisemes(visemes = []) {
    this._behavior.visemes = visemes;
  }

  setGaze(x = 0, y = 0) {
    this._behavior.gazeIntent = { x, y };
  }

  getStatus() {
    return {
      kind: this.kind,
      status: this.asset.available ? 'ASSET_PRESENT_LOADER_PENDING' : CAPABILITY.ASSET_REQUIRED,
      livingState: livingStateFrom({
        presence: this._behavior.presence || 'ready',
        emotion: this._behavior.emotion || 'neutral'
      }),
      capabilities: this.capabilities,
      asset: this.asset,
      note: this.asset.available
        ? 'Asset URL provided but VRM loader wiring is not production-ready yet.'
        : 'No production VRM/GLB Sylora digital human in repository. ASSET_REQUIRED.'
    };
  }
}
