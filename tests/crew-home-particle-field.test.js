const test = require('node:test');
const assert = require('node:assert/strict');
const modulePromise = import('../web-spa/src/pages/portalField.mjs');

function events(extra = {}) {
 const listeners = new Map();
 return Object.assign({
  listeners,
  addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
  removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
  dispatch(type, value) { for (const fn of listeners.get(type) || []) fn(value); },
  count() { return [...listeners.values()].reduce((n, s) => n + s.size, 0); }
 }, extra);
}
function environment() {
 const descriptors = new Map();
 const install = (name, value) => { descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, {value, configurable: true, writable: true}); };
 const frames = new Map(); let id = 0, fills = 0;
 const motion = events({matches: false}), connection = events({saveData: false});
 const doc = events({hidden: false});
 const win = events({devicePixelRatio: 3, matchMedia: () => motion,
  requestAnimationFrame(fn) { const key = ++id; frames.set(key, fn); return key; },
  cancelAnimationFrame(key) { frames.delete(key); }
 });
 const observers = [];
 class Observer {
  constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
  observe() {}
  disconnect() { this.disconnected = true; }
 }
 const ctx = {setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, arc() {}, fill() {}, fillRect() { fills++; }};
 const canvas = {getContext: () => ctx, width: 0, height: 0};
 const host = events({getBoundingClientRect: () => ({width: 390, height: 480, left: 0, top: 0})});
 install('window', win); install('document', doc); install('navigator', {connection}); install('ResizeObserver', Observer); install('IntersectionObserver', Observer);
 return {canvas, host, motion, connection, doc, win, frames, observers, fills: () => fills,
  tick(now) { const jobs = [...frames.values()]; frames.clear(); for (const fn of jobs) fn(now); },
  restore() { for (const [name, old] of descriptors) { if (old) Object.defineProperty(globalThis, name, old); else delete globalThis[name]; } }
 };
}

test('Four particle surfaces are finite, bounded and geometrically distinct', async () => {
 const {PORTAL_MODES, portalShape} = await modulePromise;
 assert.deepEqual(PORTAL_MODES, ['chat', 'play', 'learn', 'story']);
 const samples = PORTAL_MODES.map(mode => Array.from({length: 120}, (_, i) => portalShape(mode, i / 120 * Math.PI * 2, (i % 11) / 5 - 1, 2.1)));
 for (const surface of samples) for (const point of surface) for (const value of point) assert.ok(Number.isFinite(value) && Math.abs(value) < 2);
 for (let a = 0; a < samples.length; a++) for (let b = a + 1; b < samples.length; b++) {
  const distance = samples[a].reduce((sum, p, i) => sum + Math.hypot(...p.map((v, k) => v - samples[b][i][k])), 0) / samples[a].length;
  assert.ok(distance > .1, `${PORTAL_MODES[a]} and ${PORTAL_MODES[b]} should differ in geometry, not only color`);
 }
});

test('Canvas failure returns cleanly so the React SVG fallback remains available', async () => {
 const {createPortalField} = await modulePromise;
 assert.equal(createPortalField({getContext: () => null}, {}), null);
 assert.equal(createPortalField({getContext() { throw new Error('disabled'); }}, {}), null);
});

test('Controller owns one frame, suspends offscreen/background, and releases every listener on destroy', async () => {
 const {createPortalField} = await modulePromise;
 const e = environment(); let field;
 try {
  field = createPortalField(e.canvas, e.host);
  assert.ok(field); assert.equal(e.frames.size, 1);
  assert.equal(e.canvas.width, 624, 'device pixel ratio is capped at 1.6');
  field.setMode('play'); field.setMode('learn'); field.setLaunching(true);
  assert.equal(e.frames.size, 1, 'rapid changes cannot accumulate RAF loops');
  e.tick(100); assert.equal(e.frames.size, 1);
  const intersection = e.observers[1];
  intersection.callback([{isIntersecting: false}]);
  assert.equal(e.frames.size, 0);
  const offscreenFills = e.fills(); field.setMode('story');
  assert.equal(e.fills(), offscreenFills, 'mode updates do not draw offscreen');
  intersection.callback([{isIntersecting: true}]); assert.equal(e.frames.size, 1);
  e.doc.hidden = true; e.doc.dispatch('visibilitychange'); assert.equal(e.frames.size, 0);
  e.doc.hidden = false; e.doc.dispatch('visibilitychange'); assert.equal(e.frames.size, 1);
  field.destroy(); field.destroy();
  assert.equal(e.frames.size, 0); assert.ok(e.observers.every(o => o.disconnected));
  for (const target of [e.host, e.doc, e.win, e.motion, e.connection]) assert.equal(target.count(), 0);
  field.setMode('chat'); field.setPaused(false); field.setLaunching(true);
  assert.equal(e.frames.size, 0, 'destroyed fields cannot restart');
 } finally { field?.destroy(); e.restore(); }
});

test('Reduced motion, manual pause and Save-Data render mode changes without animation loops', async () => {
 const {createPortalField} = await modulePromise;
 const e = environment(); let field;
 try {
  e.motion.matches = true;
  field = createPortalField(e.canvas, e.host);
  assert.equal(e.frames.size, 0); assert.ok(e.fills() > 0);
  const previous = e.fills(); field.setMode('story');
  assert.ok(e.fills() > previous, 'a reduced-motion mode change still updates the picture');
  assert.equal(e.frames.size, 0);
  e.motion.matches = false; e.motion.dispatch('change'); assert.equal(e.frames.size, 1);
  field.setPaused(true); assert.equal(e.frames.size, 0);
  field.setPaused(false); assert.equal(e.frames.size, 1);
  e.connection.saveData = true; e.connection.dispatch('change'); assert.equal(e.frames.size, 0);
 } finally { field?.destroy(); e.restore(); }
});
