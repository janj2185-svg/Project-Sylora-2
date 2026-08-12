/**
 * Canonical SYLORA Gift Runtime — single entry for catalog, playback, LIVE overlay.
 * Routes: Gift V2 (Phoenix) → GPU engine → 2D canvas fallback.
 */
import { GiftEngine } from './gift-engine.js';
import { GIFT_V2_CATALOG } from './gift-v2/catalog.js';
import { MediaPipePersonSegmentationProvider } from './gift-v2/mediapipe-segmentation-provider.js';
import { detectGiftCapabilities } from './gift-v2/asset-preflight.js';

export { GiftEngine, GIFT_V2_CATALOG };

/** Capability matrix: Legacy → Runtime adapter, GPU/Canvas/V2 renderers. */
export const GIFT_RUNTIME_MATRIX = Object.freeze({
  legacy: { adapter: 'GiftEngine.play', renderer: 'canvas+artifact', schema: 'gift-v1' },
  gpu: { adapter: 'GiftGpuEngine', renderer: 'webgl', schema: 'gift-v1' },
  canvas: { adapter: 'GiftEngine', renderer: '2d-canvas', schema: 'gift-v1', fallback: true },
  v2: { adapter: 'GiftPlaybackController', renderer: 'phoenix-v2', schema: 'gift-v2', canonical: true },
  phoenix: { adapter: 'SyloraGiftRuntime.play', renderer: 'v2+gpu+canvas', schema: 'gift-v2' }
});

/** Replay-safe recent gift ids (shared with GiftEngine). */
const recentIds = new Map();

export function giftCatalog() {
  return GIFT_V2_CATALOG;
}

export function detectRuntimeEnvironment() {
  const hasWebGL = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('webgl2'));
    } catch { return false; }
  })();
  const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowMemory = typeof navigator !== 'undefined' && navigator.deviceMemory && navigator.deviceMemory <= 2;
  const mobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);
  return { hasWebGL, reducedMotion, lowMemory, mobile, segmentation: !!window.SYLORA_MEDIAPIPE_SEGMENTER };
}

/**
 * Resolve LIVE video segmentation for depth interaction.
 * - Uses injected `window.SYLORA_MEDIAPIPE_SEGMENTER` when present (Companion / future bundle).
 * - Otherwise returns null → Gift V2 plays without depth mask (honest fallback).
 */
export async function resolveLiveSegmentationProvider(video) {
  if (!video || !video.videoWidth) return null;
  const segmenter = typeof window !== 'undefined' ? window.SYLORA_MEDIAPIPE_SEGMENTER : null;
  if (!segmenter) return null;
  try {
    return new MediaPipePersonSegmentationProvider(segmenter);
  } catch {
    return null;
  }
}

export class GiftRuntimeTelemetry {
  constructor() {
    this.frames = 0;
    this.dropped = 0;
    this.lastFps = 0;
    this.renderDurationMs = 0;
    this.fallbackReason = null;
    this.startedAt = null;
  }

  begin(renderer) {
    this.startedAt = performance.now();
    this.renderer = renderer;
    this.frames = 0;
    this.dropped = 0;
  }

  tickFrame(dropped = false) {
    this.frames += 1;
    if (dropped) this.dropped += 1;
    const elapsed = (performance.now() - (this.startedAt || performance.now())) / 1000;
    if (elapsed > 0) this.lastFps = Math.round(this.frames / elapsed);
  }

  finish({ fallbackReason = null } = {}) {
    this.renderDurationMs = Math.round(performance.now() - (this.startedAt || performance.now()));
    if (fallbackReason) this.fallbackReason = fallbackReason;
    return this.snapshot();
  }

  snapshot() {
    return {
      fps: this.lastFps,
      droppedFrames: this.dropped,
      renderDurationMs: this.renderDurationMs,
      fallbackReason: this.fallbackReason,
      renderer: this.renderer || 'unknown'
    };
  }
}

export class SyloraGiftRuntime {
  constructor(stage) {
    this.stage = stage;
    this.engine = new GiftEngine(stage);
    this.segmentationProvider = null;
    this.telemetry = new GiftRuntimeTelemetry();
    this.lastPlayback = null;
  }

  async bindLiveVideo(video) {
    this.liveVideo = video || null;
    this.segmentationProvider = await resolveLiveSegmentationProvider(video);
    return {
      segmentation: !!this.segmentationProvider,
      environment: detectRuntimeEnvironment()
    };
  }

  chooseRenderer(event, env) {
    if (event?.gift?.id === 'cosmos' && !env.reducedMotion) return 'phoenix';
    if (env.hasWebGL && !env.lowMemory) return 'gpu';
    return 'canvas';
  }

  async play(event) {
    if (!event?.id || !event?.gift) return;
    const now = Date.now();
    for (const [id, expires] of recentIds) if (expires <= now) recentIds.delete(id);
    if (recentIds.has(event.id)) return;
    recentIds.set(event.id, now + 5 * 60_000);

    const env = detectRuntimeEnvironment();
    const renderer = this.chooseRenderer(event, env);
    const fallbackReason = !this.segmentationProvider ? 'segmentation_unavailable' : env.lowMemory ? 'low_memory' : env.reducedMotion ? 'reduced_motion' : null;
    this.telemetry.begin(renderer);

    const result = await this.engine.play(event, {
      video: this.liveVideo || document.querySelector('#liveVideo') || null,
      segmentationProvider: this.segmentationProvider,
      onFrame: (dropped) => this.telemetry.tickFrame(dropped)
    });

    this.lastPlayback = {
      giftId: event.gift.id,
      renderer,
      matrix: GIFT_RUNTIME_MATRIX[renderer === 'phoenix' ? 'phoenix' : renderer] || GIFT_RUNTIME_MATRIX.canvas,
      telemetry: this.telemetry.finish({ fallbackReason: result === false && renderer === 'phoenix' ? 'phoenix_fallback' : fallbackReason }),
      environment: env
    };
    return this.lastPlayback;
  }

  dispose() {
    this.engine?.v2Phoenix?.dispose?.();
    this.segmentationProvider = null;
  }
}
