/**
 * Canonical SYLORA Gift Runtime — single entry for catalog, playback, LIVE overlay.
 * Routes: Gift V2 (Phoenix) → GPU engine → 2D canvas fallback.
 */
import { GiftEngine } from './gift-engine.js';
import { GIFT_V2_CATALOG } from './gift-v2/catalog.js';
import { MediaPipePersonSegmentationProvider } from './gift-v2/mediapipe-segmentation-provider.js';

export { GiftEngine, GIFT_V2_CATALOG };

/** Replay-safe recent gift ids (shared with GiftEngine). */
const recentIds = new Map();

export function giftCatalog() {
  return GIFT_V2_CATALOG;
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

export class SyloraGiftRuntime {
  constructor(stage) {
    this.stage = stage;
    this.engine = new GiftEngine(stage);
    this.segmentationProvider = null;
  }

  async bindLiveVideo(video) {
    this.liveVideo = video || null;
    this.segmentationProvider = await resolveLiveSegmentationProvider(video);
    return { segmentation: !!this.segmentationProvider };
  }

  async play(event) {
    if (!event?.id || !event?.gift) return;
    const now = Date.now();
    for (const [id, expires] of recentIds) if (expires <= now) recentIds.delete(id);
    if (recentIds.has(event.id)) return;
    recentIds.set(event.id, now + 5 * 60_000);
    return this.engine.play(event, {
      video: this.liveVideo || document.querySelector('#liveVideo') || null,
      segmentationProvider: this.segmentationProvider
    });
  }

  dispose() {
    this.engine?.v2Phoenix?.dispose?.();
    this.segmentationProvider = null;
  }
}
