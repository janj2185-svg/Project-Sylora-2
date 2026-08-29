import { createHash, randomBytes } from 'node:crypto';
import { normalizeTikTokLiveEvent } from './tiktok-live.mjs';

const TOKEN_PREFIX = 'slr_live_';
const DEFAULT_TTL_MS = 2 * 60 * 60_000;

function boundedNumber(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function clean(value, max = 180) {
  return String(value ?? '').trim().slice(0, max);
}

function digest(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

export class LiveConnectorRelayError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = 'LiveConnectorRelayError';
    this.code = code;
    this.status = status;
  }
}

export function relayErrorBody(error) {
  if (!(error instanceof LiveConnectorRelayError)) return null;
  return { status: error.status, body: { error: error.code } };
}

/**
 * Ephemeral owner pairing and bounded LIVE event journal.
 *
 * Pairing tokens are returned once, stored only as SHA-256 digests, scoped to a
 * single host + LIVE room, and automatically expire. PostgreSQL persistence is
 * intentionally not used: a process restart revokes every desktop bridge.
 */
export class LiveConnectorRelay {
  constructor({ now = () => Date.now(), ttlMs = DEFAULT_TTL_MS, maxPairings = 500, maxEventsPerRoom = 500 } = {}) {
    this.now = now;
    this.ttlMs = boundedNumber(ttlMs, DEFAULT_TTL_MS, 60_000, 24 * 60 * 60_000);
    this.maxPairings = boundedNumber(maxPairings, 500, 10, 5_000);
    this.maxEventsPerRoom = boundedNumber(maxEventsPerRoom, 500, 20, 5_000);
    this.pairings = new Map();
    this.rooms = new Map();
  }

  #cleanup() {
    const now = this.now();
    for (const [tokenHash, pairing] of this.pairings) {
      if (pairing.expiresAtMs <= now) this.pairings.delete(tokenHash);
    }
    if (this.pairings.size <= this.maxPairings) return;
    const oldest = [...this.pairings.entries()].sort((a, b) => a[1].createdAtMs - b[1].createdAtMs);
    for (const [tokenHash] of oldest.slice(0, this.pairings.size - this.maxPairings)) this.pairings.delete(tokenHash);
  }

  issue({ liveId, userId }) {
    const scopedLiveId = clean(liveId, 180);
    const scopedUserId = clean(userId, 180);
    if (!scopedLiveId || !scopedUserId) throw new LiveConnectorRelayError('LIVE_RELAY_SCOPE_REQUIRED');
    this.#cleanup();
    const token = `${TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
    const createdAtMs = this.now();
    const pairing = {
      id: randomBytes(12).toString('base64url'),
      liveId: scopedLiveId,
      userId: scopedUserId,
      provider: 'tikfinity',
      createdAtMs,
      expiresAtMs: createdAtMs + this.ttlMs,
      lastSeenAtMs: null
    };
    this.pairings.set(digest(token), pairing);
    return { token, pairing: this.#publicPairing(pairing) };
  }

  #publicPairing(pairing) {
    return {
      id: pairing.id,
      liveId: pairing.liveId,
      provider: pairing.provider,
      createdAt: new Date(pairing.createdAtMs).toISOString(),
      expiresAt: new Date(pairing.expiresAtMs).toISOString(),
      lastSeenAt: pairing.lastSeenAtMs ? new Date(pairing.lastSeenAtMs).toISOString() : null
    };
  }

  verify(token, liveId) {
    const supplied = clean(token, 160);
    if (!supplied.startsWith(TOKEN_PREFIX) || supplied.length < 48) {
      throw new LiveConnectorRelayError('LIVE_RELAY_TOKEN_INVALID', 401);
    }
    this.#cleanup();
    const pairing = this.pairings.get(digest(supplied));
    if (!pairing) throw new LiveConnectorRelayError('LIVE_RELAY_TOKEN_INVALID', 401);
    if (pairing.expiresAtMs <= this.now()) {
      this.pairings.delete(digest(supplied));
      throw new LiveConnectorRelayError('LIVE_RELAY_TOKEN_EXPIRED', 401);
    }
    if (pairing.liveId !== clean(liveId, 180)) throw new LiveConnectorRelayError('LIVE_RELAY_SCOPE_MISMATCH', 403);
    pairing.lastSeenAtMs = this.now();
    return this.#publicPairing(pairing);
  }

  ingest(token, liveId, input) {
    const pairing = this.verify(token, liveId);
    const event = normalizeTikTokLiveEvent(input?.event && typeof input.event === 'object' ? input.event : input);
    if (!event) throw new LiveConnectorRelayError('LIVE_RELAY_EVENT_UNSUPPORTED', 400);
    const roomId = pairing.liveId;
    let room = this.rooms.get(roomId);
    if (!room) {
      room = { cursor: 0, events: [], seen: new Map() };
      this.rooms.set(roomId, room);
    }
    const now = this.now();
    for (const [eventId, expiresAt] of room.seen) if (expiresAt <= now) room.seen.delete(eventId);
    if (room.seen.has(event.id)) {
      const duplicate = room.events.find(item => item.id === event.id) || null;
      return { accepted: false, duplicate: true, event: duplicate, pairing };
    }
    room.seen.set(event.id, now + this.ttlMs);
    const queued = { ...event, source: 'tikfinity-owner-relay', cursor: ++room.cursor };
    room.events.push(queued);
    if (room.events.length > this.maxEventsPerRoom) room.events.splice(0, room.events.length - this.maxEventsPerRoom);
    return { accepted: true, duplicate: false, event: queued, pairing };
  }

  eventsAfter(liveId, after = 0, limit = 100) {
    const roomId = clean(liveId, 180);
    const cursor = boundedNumber(after, 0, 0, Number.MAX_SAFE_INTEGER);
    const pageSize = boundedNumber(limit, 100, 1, 200);
    const room = this.rooms.get(roomId);
    if (!room) return { events: [], cursor };
    const events = room.events.filter(event => event.cursor > cursor).slice(0, pageSize);
    return { events, cursor: events.at(-1)?.cursor || cursor };
  }

  pairingsFor(liveId, userId) {
    this.#cleanup();
    const roomId = clean(liveId, 180);
    const ownerId = clean(userId, 180);
    return [...this.pairings.values()]
      .filter(pairing => pairing.liveId === roomId && pairing.userId === ownerId)
      .map(pairing => this.#publicPairing(pairing));
  }

  revoke({ liveId, userId, pairingId = '' }) {
    const roomId = clean(liveId, 180);
    const ownerId = clean(userId, 180);
    const targetId = clean(pairingId, 80);
    let revoked = 0;
    for (const [tokenHash, pairing] of this.pairings) {
      if (pairing.liveId !== roomId || pairing.userId !== ownerId || (targetId && pairing.id !== targetId)) continue;
      this.pairings.delete(tokenHash);
      revoked += 1;
    }
    return { revoked };
  }

  closeRoom(liveId) {
    const roomId = clean(liveId, 180);
    for (const [tokenHash, pairing] of this.pairings) if (pairing.liveId === roomId) this.pairings.delete(tokenHash);
    this.rooms.delete(roomId);
  }
}
