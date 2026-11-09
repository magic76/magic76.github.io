/** A bounded, dependency-free particle surface. All modes retain particle identity. */
export const PORTAL_MODES = ['chat', 'play', 'learn', 'story', 'fortune'];
const HUES = {chat: 270, play: 350, learn: 158, story: 332, fortune: 44};
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
  const breath = 1 + Math.sin(time * .65) * .055 + .04 * Math.sin(angle * 3 + time * .9 + band * 5);
  return [x * breath, y * breath, z];
}

/** Owns exactly one RAF. destroy() is safe during intro and mode morphs. */
export function createPortalField(canvas, host, initialMode = 'chat') {
  let ctx;
  try { ctx = canvas.getContext('2d', {alpha: true}); } catch { /* SVG remains visible. */ }
  if (!ctx) return null;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let mode = PORTAL_MODES.includes(initialMode) ? initialMode : 'chat';
  let hue = HUES[mode], paused = false, visible = typeof IntersectionObserver === 'undefined', destroyed = false;
  let frame = null, previous = null, clock = 0, intro = 0, morph = 1;
  let width = 0, height = 0, points = [], quality = 1, slowFrames = 0;
  let stage = {x: 0, y: 0, scale: 0, tall: 1}, centreX = 0, centreY = 0;
  let pointer = {x: 0, y: 0, active: false, strength: 0};
  let waves = [];
  // Small pre-rendered halos and a 32-color palette are reused by every point.
  // Cache hue in 2-degree steps; morphing never allocates per-particle colors.
  const palettes = new Map();
  function paletteFor(colorHue) {
    const color = Math.round(colorHue / 2) * 2;
    const saturation = mode === 'play' ? 90 : mode === 'fortune' ? 76 : 72;
    const key = color + ':' + saturation;
    if (palettes.has(key)) return palettes.get(key);
    let sprite = null;
    try {
      const surface = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(32, 32) : document.createElement('canvas');
      surface.width = surface.height = 32;
      const glow = surface.getContext('2d');
      if (glow) {
        const gradient = glow.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, `hsla(${color},${saturation}%,82%,.8)`);
        gradient.addColorStop(.28, `hsla(${color},${saturation}%,72%,.42)`);
        gradient.addColorStop(.58, `hsla(${color},${saturation}%,65%,.12)`);
        gradient.addColorStop(1, `hsla(${color},${saturation}%,60%,0)`);
        glow.fillStyle = gradient; glow.fillRect(0, 0, 32, 32); sprite = surface;
      }
    } catch { /* Bright core points remain when offscreen canvases are unavailable. */ }
    const palette = {sprite, colors: Array.from({length: 32}, (_, i) =>
      `hsl(${color + (i > 15 ? 8 : -8)},${saturation}%,${73 + (i % 16) * 1.2}%)`)};
    palettes.set(key, palette);
    if (palettes.size > 24) palettes.delete(palettes.keys().next().value);
    return palette;
  }
  const staticMode = () => paused || motion.matches || Boolean(connection?.saveData);
  const canAnimate = () => !destroyed && !staticMode() && visible && !document.hidden;
  const stop = () => { if (frame !== null) window.cancelAnimationFrame(frame); frame = null; previous = null; };
  const project = (x, y, z) => {
    const depth = 1 / (1 - z * .32);
    return [centreX + x * stage.scale * depth + (pointer.x - stage.x) * pointer.strength * .03,
      centreY + y * stage.scale * stage.tall * depth + (pointer.y - stage.y) * pointer.strength * .03, depth];
  };
  function draw(delta) {
    if (destroyed || !width || !height) return;
    const still = staticMode();
    clock += delta;
    // Static policies always show the same complete geometry, even after animation.
    const time = still ? 0 : clock;
    centreX = stage.x + (still ? 0 : Math.sin(time * .23) * width * .018);
    centreY = stage.y + (still ? 0 : Math.cos(time * .19) * height * .012);
    intro = still ? 1 : Math.min(1, intro + delta * .8);
    const entrance = 1 - Math.pow(1 - intro, 3);
    const ease = still ? 1 : 1 - Math.exp(-delta * 4.6);
    morph = still ? 1 : Math.min(1, morph + delta * .8);
    const hueDelta = ((HUES[mode] - hue + 540) % 360) - 180;
    hue = (hue + hueDelta * ease + 360) % 360;
    pointer.strength += ((pointer.active && !still ? 1 : 0) - pointer.strength) * Math.max(ease, .02);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    const palette = paletteFor(hue);
    // Fine filaments explain the surface; the points provide depth and motion.
    const lowQuality = !still && quality < .8;
    const strands = lowQuality ? 8 : 16;
    for (let strand = 0; strand < strands; strand++) {
      const band = strand / (strands - 1) * 2 - 1;
      ctx.beginPath();
      for (let step = 0; step <= 64; step++) {
        const q = portalShape(mode, step / 64 * TAU, band, time);
        const p = project(q[0] * (1 + (1 - entrance) * 1.7), q[1] * (1 + (1 - entrance) * 1.7), q[2]);
        if (!step) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      const bright = strand % 5 === 0;
      ctx.strokeStyle = `hsla(${hue + strand * 2 - 20},76%,78%,${(bright ? .64 : .16) * morph * entrance})`;
      ctx.lineWidth = bright ? 1.25 : .75;
      ctx.stroke();
    }
    if (mode === 'fortune') {
      // A faint constellation joins the inclined celestial orbits.
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const angle = i / 5 * TAU - Math.PI / 2;
        const p = project(Math.cos(angle) * .70, Math.sin(angle) * .70, 0);
        if (!i) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.strokeStyle = `hsla(${hue},85%,70%,${.20 * entrance * morph})`;
      ctx.lineWidth = .8; ctx.stroke();
    }
    const stride = lowQuality ? 2 : 1;
    const glowStride = Math.ceil(points.length / (lowQuality ? 90 : 180));
    for (let i = 0; i < points.length; i += stride) {
      const point = points[i];
      const angle = point.angle + time * (mode === 'fortune' ? .04 : mode === 'play' ? .014 : mode === 'learn' ? .032 : .025) * 1.7 * (point.band > 0 ? 1 : -.65);
      const target = portalShape(mode, angle, point.band, time);
      point.x = still ? target[0] : point.x + (target[0] - point.x) * ease;
      point.y = still ? target[1] : point.y + (target[1] - point.y) * ease;
      point.z = still ? target[2] : point.z + (target[2] - point.z) * ease;
      const p = project(point.x * (1 + (1 - entrance) * 1.5), point.y * (1 + (1 - entrance) * 1.5), point.z);
      let x = p[0], y = p[1];
      if (pointer.strength > .01) {
       const dx = x - pointer.x, dy = y - pointer.y, distance = Math.hypot(dx, dy);
       if (distance < 115) {
        const force = (1 - distance / 115) * pointer.strength * 21;
        x += dx / (distance + 1) * force; y += dy / (distance + 1) * force;
       }
      }
      for (const wave of still ? [] : waves) {
        const d = Math.hypot(x - wave.x, y - wave.y);
        const offset = Math.exp(-Math.pow((d - wave.age * 310) / 30, 2)) * (1 - wave.age) * 10;
        x += (x - wave.x) / (d + 1) * offset; y += (y - wave.y) / (d + 1) * offset;
      }
      const alpha = (.40 + point.size * .60) * (.65 + (point.z + .7) / 1.4 * .6) * entrance;
      const size = (point.size > .985 ? 3.4 : 1.25 + point.size * 1.75) * p[2];
      if (palette.sprite && i % glowStride === 0) {
        const radius = (7 + point.size * 6) * p[2];
        ctx.globalAlpha = Math.min(1, alpha * .9);
        ctx.drawImage(palette.sprite, x - radius, y - radius, radius * 2, radius * 2);
      }
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fillStyle = palette.colors[point.color];
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
      // Sparse, low-cost highlights ride the original particle field; no new renderer.
      if (!lowQuality && i % 137 === 0 && point.size > .35) {
        const glint = (2.5 + point.size * 2.4) * p[2];
        const shimmer = still ? .23 : .18 + .18 * Math.sin(time * 1.2 + i * .37);
        ctx.globalAlpha = Math.min(1, alpha * shimmer);
        ctx.fillRect(x - glint, y - .35, glint * 2, .7);
        ctx.fillRect(x - .35, y - glint, .7, glint * 2);
      }
      if (mode === 'fortune' && i % 29 === 0) {
        const radius = 2.5 + point.size * 2.5;
        ctx.beginPath(); ctx.moveTo(x, y - radius);
        ctx.lineTo(x + radius * .3, y - radius * .3); ctx.lineTo(x + radius, y);
        ctx.lineTo(x + radius * .3, y + radius * .3); ctx.lineTo(x, y + radius);
        ctx.lineTo(x - radius * .3, y + radius * .3); ctx.lineTo(x - radius, y);
        ctx.lineTo(x - radius * .3, y - radius * .3); ctx.closePath(); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    waves = waves.map(wave => ({...wave, age: wave.age + delta})).filter(wave => wave.age < 1);
  }
  function tick(now) {
    frame = null;
    if (!canAnimate()) return;
    // Cap updates at 30fps; rAF itself stays cheap on 90/120Hz Android screens.
    if (previous !== null && now - previous < 1000 / 30) { frame = window.requestAnimationFrame(tick); return; }
    const delta = previous !== null ? Math.min((now - previous) / 1000, .06) : 1 / 30;
    previous = now;
    const began = performance.now(); draw(delta);
    if (performance.now() - began > 1.5) { if (++slowFrames > 5) quality = .65; }
    else slowFrames = Math.max(0, slowFrames - 1);
    start();
  }
  function start() { if (canAnimate() && frame === null) frame = window.requestAnimationFrame(tick); }
  function refresh() {
    stop();
    if (destroyed || !visible || document.hidden) return;
    if (staticMode()) draw(0); else start();
  }
  function resize(redraw = true) {
    if (destroyed) return;
    const box = host.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    const w = Math.round(box.width), h = Math.round(box.height);
    // CSS is the single source of truth for breakpoints. Never read style per frame.
    const style = window.getComputedStyle?.(host);
    const value = (name, fallback, min, max) => {
      const n = Number.parseFloat(style?.getPropertyValue(name));
      return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
    };
    const mobile = w < 600;
    const nextStage = {
      x: w * value('--portal-stage-x', .5, 0, 1),
      y: h * value('--portal-stage-y', .45, 0, 1),
      scale: Math.min(w * value('--portal-stage-scale-w', mobile ? .465 : .34, .01, 10),
        h * value('--portal-stage-scale-h', mobile ? 10 : 375 / h, .01, 10)),
      tall: value('--portal-stage-tall', mobile ? 1.34 : 1, .1, 3)
    };
    const geometryChanged = Object.keys(nextStage).some(key => nextStage[key] !== stage[key]);
    stage = nextStage;
    if (w !== width || h !== height || geometryChanged) {
      width = w; height = h;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = width < 600 ? 900 : 1500;
      if (points.length !== count) points = Array.from({length: count}, (_, i) => {
        const angle = noise(i) * TAU, band = noise(i + count) * 2 - 1;
        const target = portalShape(mode, angle, band, clock);
        return {angle, band, color: (band > 0 ? 16 : 0) + Math.min(15, Math.floor(noise(i + count * 2) * 16)), size: noise(i + count * 2), x: target[0] * (intro ? 1 : 2.7), y: target[1] * (intro ? 1 : 2.7), z: target[2]};
      });
      if (redraw && visible && !document.hidden) draw(staticMode() ? 0 : 1 / 30);
    }
    if (redraw) start();
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
    setMode(next) { if (destroyed || !PORTAL_MODES.includes(next) || next === mode) return; mode = next; morph = 0; resize(false); refresh(); },
    setPaused(next) { if (destroyed || next === paused) return; paused = next; waves = []; leave(); refresh(); },
    // Navigation is immediate; compatibility only, with no launch animation.
    setLaunching() {},
    destroy() {
      if (destroyed) return;
      destroyed = true; stop(); observer?.disconnect(); intersection?.disconnect();
      host.removeEventListener('pointermove', move); host.removeEventListener('pointerdown', down);
      host.removeEventListener('pointerup', release); host.removeEventListener('pointerleave', leave); host.removeEventListener('pointercancel', leave);
      document.removeEventListener('visibilitychange', refresh); motion.removeEventListener('change', refresh);
      connection?.removeEventListener?.('change', refresh); window.removeEventListener('resize', resize);
      points = []; waves = []; palettes.clear(); ctx.clearRect(0, 0, width, height);
    }
  };
}
