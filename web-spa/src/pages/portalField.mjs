/** A bounded, dependency-free surface shared by the home tiles. */
export const PORTAL_MODES = ['chat', 'play', 'learn', 'story', 'fortune'];
const HUES = {chat: 270, play: 28, learn: 158, story: 332, fortune: 44};
const TAU = Math.PI * 2;
const noise = i => { const n = Math.sin(i * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

export function portalShape(mode, angle, band, time) {
  let x, y, z;
  const c = Math.cos(angle), s = Math.sin(angle);
  if (mode === 'fortune') {
    // Three inclined celestial orbits, distinct from the chat ellipses.
    const layer = Math.min(2, Math.floor((band + 1) * 1.5));
    const r = .72 + layer * .14, tilt = (layer - 1) * .53;
    const q = c * r, p = s * r * .88;
    x = q * Math.cos(tilt) - p * Math.sin(tilt);
    y = q * Math.sin(tilt) + p * Math.cos(tilt);
    z = s * (layer - 1) * .30;
  } else if (mode === 'play') {
    const r = 1 + band * .14, turn = .16 + Math.sin(time * .25) * .025;
    const q = Math.sign(c) * Math.pow(Math.abs(c), 1.45) * r;
    const p = Math.sign(s) * Math.pow(Math.abs(s), 1.45) * r * .62;
    x = q * Math.cos(turn) - p * Math.sin(turn);
    y = q * Math.sin(turn) + p * Math.cos(turn);
    z = Math.sin(angle * 4) * .14 + band * .25;
  } else if (mode === 'learn') {
    const r = 1 + band * .075, twist = Math.sin(angle * 3 + time * .7 + band * 3) * .14;
    x = c * (r + twist);
    y = s * (.64 + band * .11) + Math.cos(angle * 2 + time * .7 + band * 4) * .12;
    z = Math.sin(angle * 3 + time * .7 + band * 4) * .35;
  } else if (mode === 'story') {
    const layer = Math.min(5, Math.floor((band + 1) * 3));
    const r = .80 + layer * .08, turn = (layer - 2.5) * .06;
    const q = Math.sign(c) * Math.pow(Math.abs(c), .36) * r;
    const p = Math.sign(s) * Math.pow(Math.abs(s), .36) * r * .61;
    x = q * Math.cos(turn) - p * Math.sin(turn);
    y = q * Math.sin(turn) + p * Math.cos(turn);
    z = (layer - 2.5) * .13 + Math.sin(angle + time * .2) * .12;
  } else {
    const r = 1 + band * .075, turn = band > 0 ? .16 : -.16;
    const q = c * r, p = s * r * .64;
    x = q * Math.cos(turn) - p * Math.sin(turn);
    y = q * Math.sin(turn) + p * Math.cos(turn);
    z = Math.sin(angle * 2 + time * .2) * .18 + band * .24;
  }
  const breath = 1 + Math.sin(time * .65) * .018;
  return [x * breath, y * breath, z];
}

/** Exactly one RAF; each update clears and paints only the focused tile. */
export function createPortalField(canvas, host, initialMode = 'chat') {
  let ctx;
  try { ctx = canvas.getContext('2d', {alpha: true}); } catch { /* Static SVG remains. */ }
  if (!ctx) return null;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let mode = PORTAL_MODES.includes(initialMode) ? initialMode : 'chat';
  let paused = false, visible = typeof IntersectionObserver === 'undefined', destroyed = false;
  let frame = null, previous = null, width = 0, height = 0, quality = 1, slowFrames = 0;
  let tiles = [], dirty = true;
  const points = Array.from({length: 320}, (_, i) => ({angle: noise(i) * TAU, band: noise(i + 320) * 2 - 1, size: noise(i + 640)}));
  const clocks = Object.fromEntries(PORTAL_MODES.map(key => [key, 0]));
  const staticMode = () => paused || motion.matches || Boolean(connection?.saveData);
  const canAnimate = () => !destroyed && !staticMode() && visible && !document.hidden;
  function stop() { if (frame !== null) window.cancelAnimationFrame(frame); frame = null; previous = null; }
  function project(tile, x, y, z) {
    const scale = Math.min(tile.width * .39, tile.height * .36), depth = 1 / (1 - z * .20);
    return [tile.x + tile.width / 2 + x * scale * depth, tile.y + tile.height * .34 + y * scale * depth, depth];
  }
  function paint(tile, active) {
    const time = clocks[tile.mode], hue = HUES[tile.mode], opacity = active ? 1 : .35;
    ctx.save?.();
    ctx.beginPath(); ctx.rect?.(tile.x, tile.y, tile.width, tile.height); ctx.clip?.();
    ctx.clearRect(tile.x, tile.y, tile.width, tile.height);
    // Source-over retains feature hues where particles overlap.
    ctx.globalCompositeOperation = 'source-over';
    const strands = tile.mode === 'fortune' ? 3 : 7;
    for (let strand = 0; strand < strands; strand++) {
      const band = strands === 3 ? strand - .9 : strand / 6 * 2 - 1;
      ctx.beginPath();
      for (let step = 0; step <= 64; step++) {
        const q = portalShape(tile.mode, step / 64 * TAU, band, time), p = project(tile, ...q);
        if (!step) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.strokeStyle = `hsla(${hue},96%,65%,${.12 * opacity})`; ctx.lineWidth = .65; ctx.stroke();
    }
    if (tile.mode === 'fortune') {
      // Faint constellation polyline complements the orbiting gold stars.
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const angle = i / 5 * TAU - Math.PI / 2, p = project(tile, Math.cos(angle) * .70, Math.sin(angle) * .70, 0);
        if (!i) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.strokeStyle = `hsla(${hue},96%,65%,${.26 * opacity})`; ctx.lineWidth = .8; ctx.stroke();
    }
    const stride = quality < .8 && active ? 2 : 1;
    for (let i = 0; i < points.length; i += stride) {
      const point = points[i];
      const speed = tile.mode === 'fortune' ? .10 : tile.mode === 'learn' ? .075 : .045;
      const angle = point.angle + time * speed * (point.band > 0 ? 1 : -.65);
      const q = portalShape(tile.mode, angle, point.band, time), p = project(tile, ...q);
      const alpha = (.36 + point.size * .60) * opacity;
      const size = (.55 + point.size * .85) * p[2];
      ctx.fillStyle = `hsla(${hue + (point.band > 0 ? 8 : -8)},96%,${60 + point.size * 12}%,${alpha})`;
      ctx.fillRect(p[0], p[1], size, size);
      if (tile.mode === 'fortune' && i % 19 === 0) {
        const radius = 2 + point.size * 2;
        ctx.beginPath(); ctx.moveTo(p[0], p[1] - radius);
        ctx.lineTo(p[0] + radius * .35, p[1] - radius * .35); ctx.lineTo(p[0] + radius, p[1]);
        ctx.lineTo(p[0] + radius * .35, p[1] + radius * .35); ctx.lineTo(p[0], p[1] + radius);
        ctx.lineTo(p[0] - radius * .35, p[1] + radius * .35); ctx.lineTo(p[0] - radius, p[1]);
        ctx.lineTo(p[0] - radius * .35, p[1] - radius * .35); ctx.closePath?.(); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.restore?.();
  }
  function drawAll() {
    if (destroyed || !width || !height || !visible || document.hidden) return;
    ctx.clearRect(0, 0, width, height);
    for (const tile of tiles) paint(tile, tile.mode === mode);
    dirty = false;
  }
  function tick(now) {
    frame = null;
    if (!canAnimate()) return;
    if (previous !== null && now - previous < 1000 / 30) { start(); return; }
    const delta = previous === null ? 1 / 30 : Math.min((now - previous) / 1000, .06);
    previous = now;
    const began = performance.now();
    clocks[mode] += delta;
    if (dirty) drawAll();
    else { const tile = tiles.find(item => item.mode === mode); if (tile) paint(tile, true); }
    if (performance.now() - began > 20) { if (++slowFrames > 25) quality = .65; }
    else slowFrames = Math.max(0, slowFrames - 1);
    start();
  }
  function start() { if (canAnimate() && frame === null) frame = window.requestAnimationFrame(tick); }
  function refresh() {
    stop();
    if (destroyed || !visible || document.hidden) return;
    if (dirty) drawAll();
    start();
  }
  function resize() {
    if (destroyed) return;
    const box = host.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    width = Math.round(box.width); height = Math.round(box.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const links = [...(host.querySelectorAll?.('[data-portal-tile]') || [])];
    tiles = links.map(link => {
      const rect = link.getBoundingClientRect();
      return {mode: link.dataset.mode, x: rect.left - box.left, y: rect.top - box.top, width: rect.width, height: rect.height};
    }).filter(tile => PORTAL_MODES.includes(tile.mode));
    if (!tiles.length) tiles = [{mode, x: 0, y: 0, width, height}];
    dirty = true; refresh();
  }
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    visible = Boolean(entries[0]?.isIntersecting); refresh();
  }, {threshold: .05});
  const visibility = () => refresh();
  observer?.observe(host); intersection?.observe(host);
  document.addEventListener('visibilitychange', visibility);
  motion.addEventListener('change', refresh); connection?.addEventListener?.('change', refresh);
  window.addEventListener('resize', resize, {passive: true});
  resize();
  return {
    setMode(next) {
      if (destroyed || !PORTAL_MODES.includes(next) || next === mode) return;
      mode = next;
      if (tiles.length === 1 && !host.querySelectorAll?.('[data-portal-tile]').length) tiles[0].mode = next;
      dirty = true; refresh();
    },
    setPaused(next) { if (destroyed || next === paused) return; paused = next; refresh(); },
    // Navigation is immediate; retained for compatibility with existing callers.
    setLaunching() {},
    destroy() {
      if (destroyed) return;
      destroyed = true; stop(); observer?.disconnect(); intersection?.disconnect();
      document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', refresh);
      connection?.removeEventListener?.('change', refresh); window.removeEventListener('resize', resize);
      tiles = []; ctx.clearRect(0, 0, width, height);
    }
  };
}
