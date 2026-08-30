export const DEFAULT_SSE_MAX_QUEUED_BYTES = 72 * 1024;
export const DEFAULT_SSE_DRAIN_TIMEOUT_MS = 1_500;

function responseClosed(response) {
  return !response || response.destroyed || response.writableEnded;
}

export function createBoundedSseWriter({
  maxQueuedBytes = DEFAULT_SSE_MAX_QUEUED_BYTES,
  drainTimeoutMs = DEFAULT_SSE_DRAIN_TIMEOUT_MS
} = {}) {
  const queueByteLimit = Math.max(1, Math.floor(Number(maxQueuedBytes) || DEFAULT_SSE_MAX_QUEUED_BYTES));
  const drainDeadline = Math.max(10, Math.floor(Number(drainTimeoutMs) || DEFAULT_SSE_DRAIN_TIMEOUT_MS));
  const states = new WeakMap();

  const dispose = response => {
    const state = states.get(response);
    if (!state) return;
    states.delete(response);
    state.closed = true;
    state.queued = null;
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
    if (state.onDrain) response.off?.('drain', state.onDrain);
    state.onDrain = null;
  };

  const forceClose = response => {
    dispose(response);
    if (responseClosed(response)) return;
    try {
      if (typeof response.destroy === 'function') response.destroy();
      else response.end();
    } catch {}
  };

  const armDrain = (response, state) => {
    if (state.timer || state.closed) return;
    state.onDrain = () => {
      if (states.get(response) !== state || state.closed) return;
      if (state.timer) clearTimeout(state.timer);
      state.timer = null;
      state.onDrain = null;
      if (responseClosed(response)) {
        dispose(response);
        return;
      }
      const queued = state.queued;
      state.queued = null;
      state.blocked = false;
      if (!queued) {
        dispose(response);
        return;
      }
      if (queued.terminal) {
        dispose(response);
        try { response.end(queued.payload); } catch { forceClose(response); }
        return;
      }
      try {
        if (!response.write(queued.payload)) {
          state.blocked = true;
          armDrain(response, state);
        } else dispose(response);
      } catch {
        forceClose(response);
      }
    };
    response.once('drain', state.onDrain);
    state.timer = setTimeout(() => forceClose(response), drainDeadline);
    state.timer.unref?.();
  };

  const payloadBytes = payload => Buffer.byteLength(String(payload), 'utf8');

  const write = (response, payload) => {
    if (responseClosed(response)) return false;
    const normalized = String(payload);
    if (payloadBytes(normalized) > queueByteLimit) return false;
    const current = states.get(response);
    if (current?.blocked) {
      if (current.queued) return false;
      current.queued = { payload: normalized, terminal: false };
      return true;
    }
    const state = current || { blocked: false, queued: null, timer: null, onDrain: null, closed: false };
    if (!current) states.set(response, state);
    try {
      if (!response.write(normalized)) {
        state.blocked = true;
        armDrain(response, state);
      } else dispose(response);
      return true;
    } catch {
      forceClose(response);
      return false;
    }
  };

  const end = (response, payload = '') => {
    if (responseClosed(response)) return false;
    const normalized = String(payload);
    if (payloadBytes(normalized) > queueByteLimit) {
      forceClose(response);
      return false;
    }
    const state = states.get(response);
    if (state?.blocked) {
      state.queued = { payload: normalized, terminal: true };
      return true;
    }
    dispose(response);
    try {
      response.end(normalized);
      return true;
    } catch {
      forceClose(response);
      return false;
    }
  };

  return { write, end, dispose };
}
