/**
 * SYLORA LIVE Command Center UI — desktop + mobile adaptive sheets.
 * Uses real /api/sylora-live/* endpoints. Never invents Connected/chat/gifts.
 */

let liveStudioCleanup = null;

export function cleanupLiveStudio() {
  if (typeof liveStudioCleanup === 'function') {
    liveStudioCleanup();
    liveStudioCleanup = null;
  }
}

export async function renderLiveStudio({ app, api, esc, toast, state, nav, t }) {
  if (!state.me) return nav('live');
  cleanupLiveStudio();

  let sheet = localStorage.getItem('sylora_live_sheet') || 'preview';
  let overview, chat, director, analytics, voice;
  try {
    [overview, chat, director, analytics, voice] = await Promise.all([
      api('/api/sylora-live/overview'),
      api('/api/sylora-live/chat?limit=80').catch(() => ({ messages: [], priority: [] })),
      api('/api/sylora-live/director').catch(() => ({ suggestions: [] })),
      api('/api/sylora-live/analytics').catch(() => ({ analytics: {} })),
      api('/api/sylora-live/voice').catch(() => ({ status: {} }))
    ]);
  } catch (e) {
    toast(e.message || 'LIVE studio failed');
    return nav('live');
  }

  const host = overview.host || {};
  const controls = host.controls || {};
  const conns = overview.connections || [];
  const a = analytics.analytics || {};
  const msgs = chat.messages || [];
  const tips = director.suggestions || [];
  const avatarState = host.avatarState || 'idle';
  const aiState = host.aiState || overview.honesty?.ai || 'AI_CONFIGURATION_REQUIRED';
  const voiceStatus = voice.status || overview.voice || {};
  const broadcast = overview.broadcast || {};

  const connCards = conns.map(c => {
    const stateLabel = c.state || 'DISCONNECTED';
    const honest = ['AUTH_REQUIRED', 'CONFIGURATION_REQUIRED', 'SETUP_REQUIRED', 'UNAVAILABLE', 'API_LIMITED', 'DISCONNECTED', 'ERROR'].includes(stateLabel);
    const canConnect = !['CONNECTED', 'UNAVAILABLE'].includes(stateLabel);
    return `<article class="sl-card" data-platform="${esc(c.platform)}">
      <div class="row"><b>${esc(c.name || c.platform)}</b><span class="sl-badge ${esc(stateLabel)}">${esc(stateLabel)}</span></div>
      <small class="muted">${esc(c.capabilities?.notes || c.lastError || (honest ? 'Credentials / platform approval required' : ''))}</small>
      <div class="row">
        ${canConnect ? `<button type="button" class="ghost sl-connect" data-p="${esc(c.platform)}">Connect</button>` : ''}
        ${stateLabel === 'CONNECTED' ? `<button type="button" class="ghost sl-disconnect" data-p="${esc(c.platform)}">Disconnect</button>` : ''}
      </div>
    </article>`;
  }).join('');

  const chatHtml = msgs.length
    ? msgs.map(m => {
      const badge = m.badge || { label: m.platform, color: '#888' };
      const flags = [
        m.isSubscriber ? 'sub' : '',
        m.isFollower ? 'fol' : '',
        m.moderation?.action ? `mod:${m.moderation.action}` : ''
      ].filter(Boolean).join(' · ');
      return `<div class="sl-msg ${m.highlighted ? 'hi' : ''}" data-mid="${esc(m.id)}" data-platform="${esc(m.platform || '')}">
        <div class="meta"><span class="sl-platform" style="background:${esc(badge.color)}">${esc(badge.label)}</span>
        <b>@${esc(m.username || 'user')}</b>
        ${m.language ? `<span>${esc(m.language)}</span>` : ''}
        ${m.priority ? `<span>P${m.priority}</span>` : ''}
        ${flags ? `<span>${esc(flags)}</span>` : ''}</div>
        <div>${esc(m.text || m.message || '')}</div>
        ${m.donation ? `<small class="muted">donation ${esc(String(m.donation.amount))} ${esc(m.donation.currency || '')}</small>` : ''}
        ${m.gift ? `<small class="muted">gift ${esc(m.gift.name || m.gift.id || '')}</small>` : ''}
      </div>`;
    }).join('')
    : `<p class="sl-empty">Unified chat is empty. Bind a SYLORA LIVE room or wait for real platform events — nothing is simulated.</p>`;

  if (state.view !== 'liveStudio') return;
  app.innerHTML = `
  <section class="sl-shell">
    <div class="sl-top">
      <div>
        <span class="eyebrow">SYLORA LIVE · COMMAND CENTER</span>
        <h1>Центр керування ефіром</h1>
        <p class="muted" style="margin:4px 0 0">Unified platforms · honest connections · Sylora co-host</p>
      </div>
      <div class="row" style="gap:10px;align-items:center;flex-wrap:wrap">
        <span class="sl-status-dot" aria-hidden="true"></span>
        <button type="button" class="ghost" id="slBackLive">← LIVE hub</button>
        <button type="button" class="ghost" id="slOpenStudio">Studio / OBS</button>
        <button type="button" class="primary" id="slGoLive">Go Live (SYLORA)</button>
      </div>
    </div>

    <div class="sl-banner ${aiState === 'AI_CONFIGURATION_REQUIRED' ? 'warn' : ''}" id="slAiBanner">
      AI co-host: <b>${esc(aiState)}</b>${overview.honesty?.aiNote && overview.honesty.aiNote !== aiState ? ` · ${esc(overview.honesty.aiNote)}` : (aiState === 'AI_CONFIGURATION_REQUIRED' ? ' · Local tool replies only until OPENAI_API_KEY is set.' : '')}
    </div>

    <div class="sl-tabs" role="tablist">
      ${['preview', 'chat', 'platforms', 'ai', 'controls'].map(id =>
        `<button type="button" data-sheet="${id}" class="${sheet === id ? 'primary' : 'ghost'}">${labelSheet(id)}</button>`
      ).join('')}
    </div>

    <div class="sl-grid">
      <aside class="sl-panel sl-left" data-sheet="platforms">
        <h3>Platforms</h3>
        <div class="sl-conn">${connCards || '<p class="sl-empty">No adapters registered</p>'}</div>
        <button type="button" class="ghost" id="slRefreshConn">Refresh status</button>
      </aside>

      <section class="sl-panel sl-center" data-sheet="preview">
        <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px">
          <h3>LIVE preview</h3>
          <small class="muted">viewers ${esc(String(a.viewers ?? 0))} · peak ${esc(String(a.peakViewers ?? 0))} · chat/min ${esc(String(a.chatPerMin ?? 0))}</small>
        </div>
        <div class="sl-health" aria-label="Stream health">
          <span><small>Network</small><b>${esc(a.network || 'local')}</b></span>
          <span><small>Bitrate</small><b>${esc(a.bitrate || 'n/a')}</b></span>
          <span><small>FPS</small><b>${esc(String(a.fps ?? 'n/a'))}</b></span>
          <span><small>Bound room</small><b>${esc(overview.boundLiveId || '—')}</b></span>
        </div>
        <div class="sl-preview" id="slPreview">
          <div>
            <p style="margin:0;opacity:.8">Camera preview uses Studio devices</p>
            <p style="margin:6px 0 0;font-size:12px;opacity:.65">WebRTC P2P is the native path · RTMP/CDN stay CONFIGURATION_REQUIRED without owner infra</p>
          </div>
          <div class="sl-ai-orb" data-state="${esc(avatarState)}" title="Sylora avatar state">✦</div>
        </div>
        ${tips[0] ? `<div class="sl-director"><b>Director</b> · ${esc(tips[0].text)}</div>` : `<div class="sl-director"><b>Director</b> · Listening for real engagement signals…</div>`}
      </section>

      <aside class="sl-panel sl-right" data-sheet="chat">
        <div class="row" style="justify-content:space-between;align-items:center">
          <h3>Unified chat</h3>
          <button type="button" class="ghost" id="slRefreshChat">↻</button>
        </div>
        <div class="sl-chat" id="slChat">${chatHtml}</div>
      </aside>

      <footer class="sl-panel sl-bottom" data-sheet="controls">
        <div class="sl-controls">
          <button type="button" class="ghost" id="slMic">Mic</button>
          <button type="button" class="ghost" id="slCam">Camera</button>
          <button type="button" class="ghost" id="slScreen">Screen</button>
          <div class="sl-meter" title="Mic meter"><i id="slMeterFill"></i></div>
          <button type="button" class="ghost" id="slObs">OBS</button>
          <button type="button" class="ghost" id="slRecap">Recap</button>
        </div>
        <div class="sl-stream-controls">
          <div class="item"><b>Scenes / overlays</b><small>Managed in Studio · alerts & gift animations on gift engine</small></div>
          <div class="item"><b>AI avatar</b><small>State: ${esc(avatarState)} · ${esc(aiState)}</small></div>
          <div class="item"><b>Guests</b><small>${esc(broadcast.guests?.note || 'Guest layout stub — native WebRTC path')}</small></div>
          <div class="item"><b>RTMP / multi-dest</b><small>${esc((broadcast.capabilities && broadcast.capabilities.rtmp) || 'CONFIGURATION_REQUIRED without owner RTMP/CDN')}</small></div>
          <div class="item"><b>Voice STT/TTS</b><small>${esc(voiceStatus.stt || voiceStatus.state || 'BLOCKED_EXTERNAL without keys')}</small></div>
          <div class="item"><b>Recording</b><small>Use Studio recorder · no fake cloud archive</small></div>
        </div>
      </footer>
    </div>

    <section class="sl-panel" data-sheet="ai" id="slAiPanel">
      <div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <h3>Sylora AI Co-Host</h3>
        <span class="sl-badge ${esc(aiState)}">${esc(aiState)}</span>
      </div>
      <p class="muted" style="margin:0;font-size:12px">Pipeline: LIVE events → normalize → bus → context → decision → chat/TTS/avatar/action. Interrupt protection avoids talking over the host.</p>
      <div class="sl-autonomy" id="slAutonomy">
        ${['OFF', 'ASSIST', 'CO_HOST', 'AUTONOMOUS'].map(level =>
          `<button type="button" data-autonomy="${level}" class="${controls.autonomy === level ? 'on' : 'ghost'}">${level.replace('_', '-')}</button>`
        ).join('')}
      </div>
      <div class="fields" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px">
        <label>Frequency <input id="slFreq" type="range" min="0" max="100" value="${Math.round((controls.responseFrequency || 0.35) * 100)}"></label>
        <label>Silence ms <input id="slSilence" type="number" min="500" max="30000" value="${controls.minimumSilenceMs || 2500}"></label>
        <label>Language <select id="slLang"><option value="auto">auto</option><option value="uk">uk</option><option value="pl">pl</option><option value="en">en</option><option value="de">de</option></select></label>
      </div>
      <div class="row" style="flex-wrap:wrap;gap:8px">
        <label><input type="checkbox" id="slGiftReact" ${controls.giftReactions !== false ? 'checked' : ''}> Gift / donate reactions</label>
        <label><input type="checkbox" id="slChatReact" ${controls.chatReactions !== false ? 'checked' : ''}> Chat / follow / join reactions</label>
        <label><input type="checkbox" id="slInterrupt" ${controls.interruptProtection !== false ? 'checked' : ''}> Interrupt protection</label>
        <button type="button" class="primary" id="slSaveHost">Save AI controls</button>
      </div>
    </section>
  </section>`;

  const langSel = document.querySelector('#slLang');
  if (langSel) langSel.value = controls.language || 'auto';

  applySheet(sheet);
  const onResize = () => applySheet(sheet);
  window.addEventListener('resize', onResize);

  document.querySelectorAll('[data-sheet]').forEach(btn => {
    if (btn.tagName === 'BUTTON' && btn.dataset.sheet && btn.closest('.sl-tabs')) {
      btn.onclick = () => {
        sheet = btn.dataset.sheet;
        localStorage.setItem('sylora_live_sheet', sheet);
        applySheet(sheet);
      };
    }
  });

  document.querySelector('#slBackLive')?.addEventListener('click', () => nav('live'));
  document.querySelector('#slOpenStudio')?.addEventListener('click', () => nav('studio'));
  document.querySelector('#slRefreshConn')?.addEventListener('click', () => renderLiveStudio({ app, api, esc, toast, state, nav, t }));
  document.querySelector('#slRefreshChat')?.addEventListener('click', () => renderLiveStudio({ app, api, esc, toast, state, nav, t }));

  document.querySelectorAll('.sl-connect').forEach(b => b.onclick = async () => {
    try {
      const out = await api(`/api/sylora-live/connections/${b.dataset.p}/connect`, { method: 'POST', body: '{}' });
      const st = out.connection?.state;
      if (st === 'CONNECTED') toast(`${b.dataset.p} connected`);
      else toast(`${b.dataset.p}: ${st} — ${out.connection?.lastError || 'needs owner credentials'}`);
      renderLiveStudio({ app, api, esc, toast, state, nav, t });
    } catch (e) { toast(e.message); }
  });
  document.querySelectorAll('.sl-disconnect').forEach(b => b.onclick = async () => {
    await api(`/api/sylora-live/connections/${b.dataset.p}/disconnect`, { method: 'POST', body: '{}' });
    renderLiveStudio({ app, api, esc, toast, state, nav, t });
  });

  document.querySelector('#slGoLive')?.addEventListener('click', async () => {
    try {
      const title = prompt('LIVE title', 'SYLORA LIVE') || 'SYLORA LIVE';
      const created = await api('/api/live', { method: 'POST', body: JSON.stringify({ title }) });
      const liveId = created.live?.id || created.room?.id || created.id;
      if (!liveId) throw new Error('LIVE_CREATE_FAILED');
      await api('/api/sylora-live/bind', { method: 'POST', body: JSON.stringify({ liveId }) });
      toast('SYLORA LIVE bound to Command Center');
      nav('studio');
    } catch (e) { toast(e.message); }
  });

  document.querySelector('#slSaveHost')?.addEventListener('click', async () => {
    const autonomy = document.querySelector('#slAutonomy .on')?.dataset.autonomy || 'ASSIST';
    const body = {
      autonomy,
      responseFrequency: Number(document.querySelector('#slFreq').value) / 100,
      minimumSilenceMs: Number(document.querySelector('#slSilence').value),
      language: document.querySelector('#slLang').value,
      giftReactions: document.querySelector('#slGiftReact').checked,
      chatReactions: document.querySelector('#slChatReact').checked,
      interruptProtection: document.querySelector('#slInterrupt').checked
    };
    await api('/api/sylora-live/host', { method: 'PATCH', body: JSON.stringify(body) });
    toast('AI co-host controls saved');
  });
  document.querySelectorAll('#slAutonomy button').forEach(b => b.onclick = () => {
    document.querySelectorAll('#slAutonomy button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
  });

  document.querySelector('#slObs')?.addEventListener('click', () => nav('studio'));
  document.querySelector('#slRecap')?.addEventListener('click', async () => {
    const out = await api('/api/sylora-live/recap', { method: 'POST', body: '{}' });
    toast(`Recap ready · peak ${out.recap?.summary?.peakViewers ?? 0} (not published)`);
  });

  let micRaf = 0;
  let micStream = null;
  let micCtx = null;
  document.querySelector('#slMic')?.addEventListener('click', async () => {
    try {
      if (micStream) {
        micStream.getTracks().forEach(tr => tr.stop());
        micStream = null;
        if (micCtx) { micCtx.close().catch(() => {}); micCtx = null; }
        cancelAnimationFrame(micRaf);
        toast('Microphone meter stopped');
        return;
      }
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      micCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = micCtx.createMediaStreamSource(micStream);
      const analyser = micCtx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const fill = document.querySelector('#slMeterFill');
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        if (fill) fill.style.width = `${Math.min(100, Math.round(rms * 280))}%`;
        api('/api/sylora-live/voice/vad', {
          method: 'POST',
          body: JSON.stringify({ speaking: rms > 0.04, rms })
        }).catch(() => {});
        micRaf = requestAnimationFrame(tick);
      };
      tick();
      toast('Microphone meter active');
    } catch {
      toast('Microphone permission required');
    }
  });

  document.querySelector('#slCam')?.addEventListener('click', () => nav('studio'));
  document.querySelector('#slScreen')?.addEventListener('click', () => nav('studio'));

  // Soft refresh unified chat without full remount (keeps controls stable).
  const chatTimer = setInterval(async () => {
    if (state.view !== 'liveStudio') return;
    try {
      const fresh = await api('/api/sylora-live/chat?limit=80');
      const box = document.querySelector('#slChat');
      if (!box || !fresh.messages) return;
      if ((fresh.messages || []).length === msgs.length) return;
      const html = (fresh.messages || []).map(m => {
        const badge = m.badge || { label: m.platform, color: '#888' };
        return `<div class="sl-msg ${m.highlighted ? 'hi' : ''}" data-mid="${esc(m.id)}">
          <div class="meta"><span class="sl-platform" style="background:${esc(badge.color)}">${esc(badge.label)}</span>
          <b>@${esc(m.username || 'user')}</b></div><div>${esc(m.text || '')}</div></div>`;
      }).join('') || `<p class="sl-empty">Unified chat is empty.</p>`;
      box.innerHTML = html;
    } catch { /* keep UI */ }
  }, 8000);

  liveStudioCleanup = () => {
    window.removeEventListener('resize', onResize);
    clearInterval(chatTimer);
    cancelAnimationFrame(micRaf);
    if (micStream) micStream.getTracks().forEach(tr => tr.stop());
    if (micCtx) micCtx.close().catch(() => {});
  };

  function applySheet(id) {
    document.querySelectorAll('.sl-tabs [data-sheet]').forEach(b => {
      b.className = b.dataset.sheet === id ? 'primary' : 'ghost';
    });
    const narrow = window.matchMedia('(max-width:820px)').matches;
    document.querySelectorAll('.sl-panel[data-sheet]').forEach(p => {
      if (!narrow) {
        p.classList.add('on');
        return;
      }
      const sheetId = p.dataset.sheet;
      const show = sheetId === id || sheetId === 'controls' || (id === 'preview' && sheetId === 'preview');
      p.classList.toggle('on', show);
    });
  }

  function labelSheet(id) {
    return ({ preview: 'Preview', chat: 'Chat', platforms: 'Platforms', ai: 'AI', controls: 'Controls' })[id] || id;
  }
}
