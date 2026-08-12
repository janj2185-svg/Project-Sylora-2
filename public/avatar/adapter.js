/**
 * Avatar Adapter factory — selects 2D fallback or 3D VRM when asset exists.
 * Intelligence must never import a concrete renderer.
 */

import { Png2dAvatarAdapter } from './adapters/png-2d-adapter.js';
import { Vrm3dAvatarAdapter, detectDigitalHumanAsset } from './adapters/vrm-3d-adapter.js';

/**
 * @typedef {object} AvatarAdapter
 * @property {string} kind
 * @property {object} capabilities
 * @property {(host: HTMLElement, opts?: object) => Promise<void>|void} mount
 * @property {() => void} dispose
 * @property {(behavior: object) => void} applyBehavior
 * @property {(mode: string, opts?: object) => void} setPresence
 * @property {(emotion: string, opts?: object) => void} setEmotion
 * @property {(level?: number) => void} onAudioDelta
 * @property {(visemes: object[]) => void} setVisemes
 * @property {(x: number, y: number) => void} setGaze
 * @property {() => object} getStatus
 */

export function createAvatarAdapter(host, {
  prefer = 'auto',
  assetUrl = null,
  motionRig = null,
  random = Math.random
} = {}) {
  const asset = detectDigitalHumanAsset(assetUrl);
  const want3d = prefer === '3d' || (prefer === 'auto' && asset.available);
  if (want3d) {
    return new Vrm3dAvatarAdapter(host, { asset, random });
  }
  return new Png2dAvatarAdapter(host, { motionRig, random });
}

export { Png2dAvatarAdapter, Vrm3dAvatarAdapter, detectDigitalHumanAsset };
