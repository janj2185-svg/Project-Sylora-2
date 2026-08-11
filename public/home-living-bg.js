/**
 * Home living background controller.
 * CSS layers + lightweight canvas particles. GPU-friendly, adaptive, reduced-motion aware.
 */

const PRESENCES = new Set(['idle', 'listening', 'thinking', 'speaking', 'success', 'error']);

function atmosphereForHour(h = new Date().getHours()) {
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  return 'evening';
}

function detectLiteMode() {
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    if (navigator.connection?.saveData) return true;
    const mem = navigator.deviceMemory;
    const cores = navigator.hardwareConcurrency || 8;
    if (typeof mem === 'number' && mem <= 4) return true;
    if (cores <= 4 && matchMedia('(max-width: 820px)').matches) return true;
    if (matchMedia('(max-width: 480px)').matches && cores <= 6) return true;
  } catch { /* ignore */ }
  return false;
}

function particleBudget(lite) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  if (lite) return matchMedia('(max-width:720px)').matches ? 4 : 8;
  if (matchMedia('(max-width:720px)').matches) return 12;
  if (matchMedia('(max-width:980px)').matches) return 18;
  return 28;
}

export function mountHomeLivingBg(root, options = {}) {
  if (!root || root._hlb) return root._hlb;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lite = options.forceLite ?? detectLiteMode();
  if (lite) root.classList.add('hlb-lite');

  root.dataset.atmosphere = atmosphereForHour();
  root.dataset.presence = root.dataset.presence || 'idle';

  const wrap = document.createElement('div');
  wrap.className = 'home-living-bg';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `
    <div class="hlb-base"></div>
    <div class="hlb-opal" data-depth="0.18"></div>
    <div class="hlb-aurora" data-depth="0.28"></div>
    <div class="hlb-rays" data-depth="0.1"></div>
    <div class="hlb-orbits"></div>
    <canvas class="hlb-particles"></canvas>
    <div class="hlb-energy"></div>
    <div class="hlb-glass"></div>
  `;
  root.insertBefore(wrap, root.firstChild);

  const canvas = wrap.querySelector('.hlb-particles');
  const ctx = canvas.getContext('2d', { alpha: true });
  let particles = [];
  let raf = 0;
  let running = true;
  let last = performance.now();
  let px = 0, py = 0, tpx = 0, tpy = 0;
  let scrollY = 0;
  let level = 0;
  let presence = 'idle';
  let successTimer = 0;
  let fpsSamples = [];
  let lastFpsReport = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.75);
    const w = root.clientWidth || 1;
    const h = root.clientHeight || 1;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedParticles(w, h);
  }

  function seedParticles(w, h) {
    const n = particleBudget(lite);
    particles = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * (lite ? 1.4 : 2.2),
      a: 0.08 + Math.random() * 0.22,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -0.04 - Math.random() * 0.1,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random() < 0.45 ? 'gold' : (Math.random() < 0.5 ? 'lilac' : 'pearl')
    }));
  }

  function colorFor(p, alpha) {
    if (p.hue === 'gold') return `rgba(217,168,75,${alpha})`;
    if (p.hue === 'lilac') return `rgba(170,145,225,${alpha})`;
    return `rgba(255,255,255,${alpha})`;
  }

  function draw(dt) {
    const w = root.clientWidth;
    const h = root.clientHeight;
    ctx.clearRect(0, 0, w, h);
    if (!particles.length) return;

    const attract = presence === 'thinking' || presence === 'speaking';
    const cx = w * 0.72;
    const cy = h * 0.38;

    for (const p of particles) {
      p.phase += dt * 0.0012;
      let ax = 0, ay = 0;
      if (attract) {
        ax = (cx - p.x) * 0.00035;
        ay = (cy - p.y) * 0.00035;
      }
      if (presence === 'listening') {
        p.a = Math.min(0.35, p.a + level * 0.002);
      }
      p.vx += ax + Math.sin(p.phase) * 0.002;
      p.vy += ay;
      p.vx *= 0.99;
      p.vy *= 0.99;
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      if (p.y < -8) p.y = h + 6;
      if (p.y > h + 8) p.y = -4;
      if (p.x < -8) p.x = w + 4;
      if (p.x > w + 8) p.x = -4;

      const pulse = presence === 'speaking' ? 1 + level * 0.35 : 1;
      ctx.beginPath();
      ctx.fillStyle = colorFor(p, p.a * pulse);
      ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let frameSkip = 0;
  let lowFpsHits = 0;
  function tick(now) {
    if (!running || !root.isConnected) return;
    const dt = Math.min(34, now - last || 16);
    last = now;
    fpsSamples.push(1000 / (dt || 16));
    if (fpsSamples.length > 45) fpsSamples.shift();
    if (now - lastFpsReport > 2000) {
      lastFpsReport = now;
      const avg = fpsSamples.reduce((a, b) => a + b, 0) / (fpsSamples.length || 1);
      root.dataset.hlbFps = String(Math.round(avg));
      // Headless/CI often under-reports FPS — require sustained pressure before shedding particles.
      if (avg < 38) lowFpsHits += 1; else lowFpsHits = 0;
      if (lowFpsHits >= 3 && particles.length > 8) {
        particles.length = Math.max(8, Math.floor(particles.length * 0.7));
        root.classList.add('hlb-lite');
        frameSkip = 1;
      }
    }

    px += (tpx - px) * 0.06;
    py += (tpy - py) * 0.06;
    const scrollParallax = Math.min(18, scrollY * 0.04);
    root.style.setProperty('--hlb-px', `${px.toFixed(2)}px`);
    root.style.setProperty('--hlb-py', `${(py + scrollParallax).toFixed(2)}px`);
    root.style.setProperty('--hlb-level', level.toFixed(3));

    // Skip particle redraw on alternate frames when under pressure (CSS layers still animate).
    if (!reduced && (frameSkip === 0 || (Math.floor(now / 16) % 2 === 0))) draw(dt);
    raf = requestAnimationFrame(tick);
  }

  function setPresence(next = 'idle') {
    const p = PRESENCES.has(next) ? next : 'idle';
    presence = p;
    root.dataset.presence = p;
    if (p === 'success') {
      clearTimeout(successTimer);
      successTimer = setTimeout(() => {
        if (root.dataset.presence === 'success') setPresence('idle');
      }, 900);
    }
  }

  function setLevel(n = 0) {
    level = Math.max(0, Math.min(1, Number(n) || 0));
  }

  function pulse(kind = 'success') {
    setPresence(kind === 'error' ? 'error' : 'success');
  }

  function onPointerMove(e) {
    if (lite || reduced || matchMedia('(pointer: coarse)').matches) return;
    const rect = root.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    tpx = nx * 10;
    tpy = ny * 7;
  }

  function onTouch(e) {
    if (reduced || lite) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    const rect = root.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'hlb-ripple';
    ripple.style.left = `${t.clientX - rect.left}px`;
    ripple.style.top = `${t.clientY - rect.top}px`;
    wrap.appendChild(ripple);
    setTimeout(() => ripple.remove(), 950);
  }

  function onScroll() {
    scrollY = window.scrollY || 0;
  }

  function onVisibility() {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (root.isConnected) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }

  // Soft listening aura when hovering Sylora card
  const presenceBtn = root.querySelector('.sylora-presence');
  const onEnter = () => { if (presence === 'idle') setPresence('listening'); setLevel(0.25); };
  const onLeave = () => { if (presence === 'listening') { setPresence('idle'); setLevel(0); } };

  resize();
  if (!reduced) raf = requestAnimationFrame(tick);

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  root.addEventListener('pointermove', onPointerMove, { passive: true });
  root.addEventListener('touchstart', onTouch, { passive: true });
  presenceBtn?.addEventListener('pointerenter', onEnter);
  presenceBtn?.addEventListener('pointerleave', onLeave);
  presenceBtn?.addEventListener('focus', onEnter);
  presenceBtn?.addEventListener('blur', onLeave);

  // Hourly atmosphere refresh
  const hourTimer = setInterval(() => {
    root.dataset.atmosphere = atmosphereForHour();
  }, 60_000);

  const api = {
    setPresence,
    setLevel,
    pulse,
    getMetrics() {
      const avg = fpsSamples.reduce((a, b) => a + b, 0) / (fpsSamples.length || 1);
      return {
        fps: Math.round(avg || 0),
        particles: particles.length,
        lite,
        reduced,
        presence,
        atmosphere: root.dataset.atmosphere
      };
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      clearTimeout(successTimer);
      clearInterval(hourTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('touchstart', onTouch);
      presenceBtn?.removeEventListener('pointerenter', onEnter);
      presenceBtn?.removeEventListener('pointerleave', onLeave);
      presenceBtn?.removeEventListener('focus', onEnter);
      presenceBtn?.removeEventListener('blur', onLeave);
      wrap.remove();
      delete root._hlb;
    }
  };

  root._hlb = api;
  window.__syloraHomeBg = api;
  return api;
}

export function destroyHomeLivingBg(root) {
  root?._hlb?.destroy?.();
}
