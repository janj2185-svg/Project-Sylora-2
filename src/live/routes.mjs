/**
 * SYLORA LIVE HTTP routes — isolated from core LIVE room signaling.
 * Mounted from server.mjs; returns true when handled.
 */

export async function handleSyloraLiveRoutes(ctx) {
  const {
    req, res, url, json, body, requireUser, route, safeText, syloraLive
  } = ctx;
  if (!syloraLive) return false;
  const p = url.pathname;
  let m;

  if (req.method === 'GET' && p === '/api/sylora-live/overview') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, syloraLive.overview(user)), true;
  }

  if (req.method === 'GET' && p === '/api/sylora-live/capabilities') {
    const { capabilityMatrixRows } = await import('./platforms/capabilities.mjs');
    return json(res, 200, {
      matrix: capabilityMatrixRows(),
      note: 'Capability matrix is public. Connection actions require auth — no fake Connected states.'
    }), true;
  }

  if (req.method === 'GET' && p === '/api/sylora-live/connections') {
    const user = await requireUser(req, res); if (!user) return true;
    const s = syloraLive.sessionFor(user);
    return json(res, 200, { connections: s.registry.listConnections(), health: s.registry.healthAll() }), true;
  }

  m = route('/api/sylora-live/connections/:platform/connect', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    try {
      const snap = await syloraLive.connectPlatform(user, m.platform);
      const code = ['AUTH_REQUIRED', 'UNAVAILABLE', 'SETUP_REQUIRED'].includes(snap.state) ? 503 : 200;
      return json(res, code, { connection: snap }), true;
    } catch (e) {
      return json(res, 400, { error: e.code || e.message }), true;
    }
  }

  m = route('/api/sylora-live/connections/:platform/disconnect', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { connection: await syloraLive.disconnectPlatform(user, m.platform) }), true;
  }

  if (req.method === 'POST' && p === '/api/sylora-live/bind') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try {
      return json(res, 200, syloraLive.bindNativeLive(user, safeText(input.liveId, 80))), true;
    } catch (e) {
      return json(res, 404, { error: e.code || e.message }), true;
    }
  }

  if (req.method === 'GET' && p === '/api/sylora-live/chat') {
    const user = await requireUser(req, res); if (!user) return true;
    const platform = safeText(url.searchParams.get('platform') || '', 40) || null;
    const limit = Number(url.searchParams.get('limit') || 100);
    return json(res, 200, syloraLive.getUnifiedChat(user, { platform, limit })), true;
  }

  if (req.method === 'POST' && p === '/api/sylora-live/chat/ingest') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    // Bridge from existing Sylora chat message shape
    const out = syloraLive.ingestNativeChat(user, {
      liveId: safeText(input.liveId, 80),
      message: {
        id: safeText(input.id, 80) || undefined,
        userId: safeText(input.userId, 80) || user.id,
        username: safeText(input.username, 80),
        displayName: safeText(input.displayName, 80),
        text: safeText(input.text || input.message, 2000),
        language: safeText(input.language, 16) || null
      }
    });
    return json(res, out.accepted ? 201 : 200, out), true;
  }

  if (req.method === 'POST' && p === '/api/sylora-live/chat/slow-mode') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, syloraLive.sessionFor(user).chat.setSlowMode(input.seconds)), true;
  }

  if (req.method === 'POST' && p === '/api/sylora-live/chat/pin') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, syloraLive.sessionFor(user).chat.pin(safeText(input.messageId, 80))), true;
  }

  if (req.method === 'GET' && p === '/api/sylora-live/host') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { host: syloraLive.sessionFor(user).host.snapshot() }), true;
  }

  if (req.method === 'PATCH' && p === '/api/sylora-live/host') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, { controls: syloraLive.updateHostControls(user, input) }), true;
  }

  if (req.method === 'POST' && p === '/api/sylora-live/host/consider') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, { decision: syloraLive.considerAi(user, input.event || input, Number(input.priorityScore) || 0) }), true;
  }

  if (req.method === 'GET' && p === '/api/sylora-live/automation') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, {
      rules: syloraLive.listAutomation(user),
      templates: syloraLive.overview(user).automationTemplates,
      recent: syloraLive.sessionFor(user).automation.recent()
    }), true;
  }

  if (req.method === 'POST' && p === '/api/sylora-live/automation') {
    const user = await requireUser(req, res); if (!user) return true;
    try {
      return json(res, 201, { rule: syloraLive.saveAutomation(user, await body(req)) }), true;
    } catch (e) {
      return json(res, 400, { error: e.code || e.message }), true;
    }
  }

  m = route('/api/sylora-live/automation/:id', p);
  if (req.method === 'DELETE' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, syloraLive.deleteAutomation(user, m.id)), true;
  }

  if (req.method === 'GET' && p === '/api/sylora-live/broadcast') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, {
      prefs: syloraLive.getBroadcastPrefs(user),
      capabilities: broadcastCaps(),
      guests: syloraLive.overview(user).broadcast.guests
    }), true;
  }

  if (req.method === 'PUT' && p === '/api/sylora-live/broadcast') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { prefs: syloraLive.setBroadcastPrefs(user, await body(req)) }), true;
  }

  if (req.method === 'GET' && p === '/api/sylora-live/analytics') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { analytics: syloraLive.sessionFor(user).analytics.snapshot() }), true;
  }

  if (req.method === 'GET' && p === '/api/sylora-live/director') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, syloraLive.director(user)), true;
  }

  if (req.method === 'POST' && p === '/api/sylora-live/recap') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { recap: syloraLive.recap(user) }), true;
  }

  if (req.method === 'GET' && p === '/api/sylora-live/voice') {
    return json(res, 200, syloraLive.voiceStatus()), true;
  }

  if (req.method === 'POST' && p === '/api/sylora-live/voice/vad') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, syloraLive.applyVad(user, await body(req))), true;
  }

  if (req.method === 'POST' && p === '/api/sylora-live/voice/transcript') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, syloraLive.applyHostTranscript(user, input.transcript || input.text || '')), true;
  }

  if (req.method === 'PUT' && p === '/api/sylora-live/moderation') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { policy: syloraLive.setModerationPolicy(user, await body(req)) }), true;
  }

  if (req.method === 'GET' && p === '/api/sylora-live/memory') {
    const user = await requireUser(req, res); if (!user) return true;
    const q = safeText(url.searchParams.get('q') || '', 200);
    return json(res, 200, syloraLive.memoryPack(user, q)), true;
  }

  if (req.method === 'DELETE' && p === '/api/sylora-live/memory') {
    const user = await requireUser(req, res); if (!user) return true;
    const scope = safeText(url.searchParams.get('scope') || 'session', 20);
    return json(res, 200, syloraLive.clearMemory(user, scope)), true;
  }

  if (req.method === 'POST' && p === '/api/sylora-live/rtmp/destination') {
    const user = await requireUser(req, res); if (!user) return true;
    try {
      return json(res, 201, { destination: syloraLive.saveRtmp(user, await body(req)) }), true;
    } catch (e) {
      return json(res, 400, { error: e.code || e.message }), true;
    }
  }

  if (req.method === 'POST' && p === '/api/sylora-live/rtmp/key') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try {
      return json(res, 200, syloraLive.setRtmpKey(user, input.streamKey || input.key)), true;
    } catch (e) {
      return json(res, 400, { error: e.code || e.message }), true;
    }
  }

  if (req.method === 'GET' && p === '/api/sylora-live/events') {
    const user = await requireUser(req, res); if (!user) return true;
    const s = syloraLive.sessionFor(user);
    return json(res, 200, { events: s.bus.peek(Number(url.searchParams.get('limit') || 50)), stats: s.bus.stats() }), true;
  }

  if (req.method === 'POST' && p === '/api/sylora-live/dev/fixture') {
    const user = await requireUser(req, res); if (!user) return true;
    try {
      return json(res, 201, syloraLive.publishTestFixture(user, await body(req))), true;
    } catch (e) {
      return json(res, 403, { error: e.code || e.message }), true;
    }
  }

  return false;
}

function broadcastCaps() {
  return {
    cameraSelection: 'WORKING_BROWSER',
    microphoneSelection: 'WORKING_BROWSER',
    note: 'See overview.broadcast.capabilities for full matrix.'
  };
}
