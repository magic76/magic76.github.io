/** A bounded, dependency-free particle surface. All modes retain particle identity. */
export const PORTAL_MODES = ['chat', 'play', 'learn', 'story'];
const HUES = {chat: 270, play: 28, learn: 158, story: 332};
const TAU = Math.PI * 2;
const noise = i => { const n = Math.sin(i * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

export function portalShape(mode, angle, band, time) {
  let x, y, z;
  const c = Math.cos(angle), s = Math.sin(angle);
  if (mode === 'play') {
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

/** Owns exactly one RAF. destroy() is safe during intro, morph and launch. */
export function createPortalField(canvas, host, initialMode = 'chat') {
  let ctx;
  try { ctx = canvas.getContext('2d', {alpha: true}); } catch { /* SVG remains visible. */ }
  if (!ctx) return null;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let mode = initialMode, hue = HUES[mode], paused = false, visible = true, destroyed = false;
  let frame = null, previous = 0, clock = 0, intro = 0, morph = 1, launching = false, launch = 0;
  let width = 0, height = 0, points = [], quality = 1, slowFrames = 0;
  let pointer = {x: 0, y: 0, active: false, strength: 0};
  let waves = [];
  const staticMode = () => paused || motion.matches || Boolean(connection?.saveData);
  const canAnimate = () => !destroyed && !staticMode() && visible && !document.hidden;
  const stop = () => { if (frame !== null) window.cancelAnimationFrame(frame); frame = null; previous = 0; };
  const project = (x, y, z) => {
    const mobile = width < 600, scale = (mobile ? width * .465 : Math.min(width * .34, 375)) * (1 + launch * 1.8);
    const depth = 1 / (1 - z * .20);
    return [width / 2 + x * scale * depth + (pointer.x - width / 2) * pointer.strength * .018,
      height * .45 + y * scale * (mobile ? 1.34 : 1) * depth + (pointer.y - height * .45) * pointer.strength * .018, depth];
  };
  function draw(delta) {
    if (destroyed || !width || !height) return;
    const still = staticMode();
    clock += delta;
    intro = still ? 1 : Math.min(1, intro + delta * .8);
    const entrance = 1 - Math.pow(1 - intro, 3);
    const ease = still ? 1 : 1 - Math.exp(-delta * 4.6);
    morph = still ? 1 : Math.min(1, morph + delta * .8);
    launch = launching && !still ? Math.min(1, launch + delta / .48) : 0;
    hue += (HUES[mode] - hue) * ease;
    pointer.strength += ((pointer.active && !still ? 1 : 0) - pointer.strength) * Math.max(ease, .02);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    // Fine filaments explain the surface; the points provide depth and motion.
    for (let strand = 0; strand < 28; strand++) {
      const band = strand / 27 * 2 - 1;
      ctx.beginPath();
      for (let step = 0; step <= 100; step++) {
        const q = portalShape(mode, step / 100 * TAU, band, clock);
        const p = project(q[0] * (1 + (1 - entrance) * 1.7), q[1] * (1 + (1 - entrance) * 1.7), q[2]);
        if (!step) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      const bright = strand % 9 === 0;
      ctx.strokeStyle = `hsla(${hue + strand * 2 - 20},65%,78%,${(bright ? .38 : .065) * morph * entrance})`;
      ctx.lineWidth = bright ? 1.1 : .65;
      ctx.shadowColor = `hsla(${hue},75%,70%,.5)`;
      ctx.shadowBlur = bright ? 8 : 0;
      ctx.stroke(); ctx.shadowBlur = 0;
    }
    const stride = quality < .8 ? 2 : 1;
    for (let i = 0; i < points.length; i += stride) {
      const point = points[i];
      const angle = point.angle + clock * (mode === 'play' ? .014 : mode === 'learn' ? .032 : .025) * (point.band > 0 ? 1 : -.65);
      const target = portalShape(mode, angle, point.band, clock);
      point.x += (target[0] - point.x) * ease;
      point.y += (target[1] - point.y) * ease;
      point.z += (target[2] - point.z) * ease;
      const p = project(point.x * (1 + (1 - entrance) * 1.5), point.y * (1 + (1 - entrance) * 1.5), point.z);
      let x = p[0], y = p[1];
      const dx = x - pointer.x, dy = y - pointer.y, distance = Math.hypot(dx, dy);
      if (pointer.strength && distance < 115) {
        const force = (1 - distance / 115) * pointer.strength * 21;
        x += dx / (distance + 1) * force; y += dy / (distance + 1) * force;
      }
      for (const wave of waves) {
        const d = Math.hypot(x - wave.x, y - wave.y);
        const offset = Math.exp(-Math.pow((d - wave.age * 310) / 30, 2)) * (1 - wave.age) * 10;
        x += (x - wave.x) / (d + 1) * offset; y += (y - wave.y) / (d + 1) * offset;
      }
      const alpha = (.40 + point.size * .60) * (.65 + (point.z + .7) / 1.4 * .6) * entrance;
      const color = hue + (point.band > 0 ? 30 : -26);
      const size = (point.size > .985 ? 2.2 : .55 + point.size * .7) * p[2];
      ctx.fillStyle = `hsla(${color},${48 + point.size * 30}%,${72 + point.size * 24}%,${alpha})`;
      ctx.fillRect(x, y, size, size);
      if (point.size > .87) {
        ctx.strokeStyle = `hsla(${color},70%,80%,${alpha * .30})`; ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.sin(angle) * 5, y + Math.cos(angle) * 3); ctx.stroke();
      }
      if (point.size > .985) {
        ctx.fillStyle = `hsla(${color},75%,75%,${alpha * .08})`;
        ctx.beginPath(); ctx.arc(x, y, size * 2.3, 0, TAU); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    waves = waves.map(wave => ({...wave, age: wave.age + delta})).filter(wave => wave.age < 1);
  }
  function tick(now) {
    frame = null;
    if (!canAnimate()) return;
    // Cap updates at 30fps; rAF itself stays cheap on 90/120Hz Android screens.
    if (previous && now - previous < 1000 / 30) { frame = window.requestAnimationFrame(tick); return; }
    const delta = previous ? Math.min((now - previous) / 1000, .06) : 1 / 30;
    previous = now;
    const began = performance.now(); draw(delta);
    if (performance.now() - began > 20) { if (++slowFrames > 25) quality = .65; }
    else slowFrames = Math.max(0, slowFrames - 1);
    start();
  }
  function start() { if (canAnimate() && frame === null) frame = window.requestAnimationFrame(tick); }
  function refresh() {
    stop();
    if (destroyed || !visible || document.hidden) return;
    if (staticMode()) draw(0); else start();
  }
  function resize() {
    if (destroyed) return;
    const box = host.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    const w = Math.round(box.width), h = Math.round(box.height);
    if (w !== width || h !== height) {
      width = w; height = h;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = width < 600 ? 1800 : 3000;
      if (points.length !== count) points = Array.from({length: count}, (_, i) => {
        const angle = noise(i) * TAU, band = noise(i + count) * 2 - 1;
        const target = portalShape(mode, angle, band, clock);
        return {angle, band, size: noise(i + count * 2), x: target[0] * (intro ? 1 : 2.7), y: target[1] * (intro ? 1 : 2.7), z: target[2]};
      });
      if (visible && !document.hidden) draw(staticMode() ? 0 : 1 / 30);
    }
    start();
  }
  function move(event) {
    if (staticMode()) return;
    const box = host.getBoundingClientRect();
    pointer.x = event.clientX - box.left; pointer.y = event.clientY - box.top; pointer.active = true;
  }
  const leave = () => { pointer.active = false; };
  const release = event => { if (event.pointerType !== 'mouse') leave(); };
  function down(event) { if (staticMode()) return; move(event); waves.push({x: pointer.x, y: pointer.y, age: 0}); waves = waves.slice(-4); }
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    visible = Boolean(entries[0]?.isIntersecting); refresh();
  }, {threshold: .05});
  observer?.observe(host); intersection?.observe(host);
  host.addEventListener('pointermove', move, {passive: true});
  host.addEventListener('pointerdown', down, {passive: true});
  host.addEventListener('pointerup', release, {passive: true});
  host.addEventListener('pointerleave', leave); host.addEventListener('pointercancel', leave);
  document.addEventListener('visibilitychange', refresh);
  motion.addEventListener('change', refresh); connection?.addEventListener?.('change', refresh);
  window.addEventListener('resize', resize, {passive: true});
  resize();
  return {
    setMode(next) { if (destroyed || !PORTAL_MODES.includes(next) || next === mode) return; mode = next; morph = 0; refresh(); },
    setPaused(next) { paused = next; waves = []; leave(); refresh(); },
    setLaunching(next) { launching = next; if (!next) launch = 0; refresh(); },
    destroy() {
      if (destroyed) return;
      destroyed = true; stop(); observer?.disconnect(); intersection?.disconnect();
      host.removeEventListener('pointermove', move); host.removeEventListener('pointerdown', down);
      host.removeEventListener('pointerup', release); host.removeEventListener('pointerleave', leave); host.removeEventListener('pointercancel', leave);
      document.removeEventListener('visibilitychange', refresh); motion.removeEventListener('change', refresh);
      connection?.removeEventListener?.('change', refresh); window.removeEventListener('resize', resize);
      points = []; waves = []; ctx.clearRect(0, 0, width, height);
    }
  };
}
