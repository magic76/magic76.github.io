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
function environment(width = 390, height = 480, stageStyles = {}) {
 const descriptors = new Map();
 const install = (name, value) => { descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, {value, configurable: true, writable: true}); };
 const frames = new Map(); let id = 0, fills = 0, styleReads = 0;
 const motion = events({matches: false}), connection = events({saveData: false});
 const doc = events({hidden: false});
 const win = events({devicePixelRatio: 3, matchMedia: () => motion,
  getComputedStyle() { styleReads++; return {getPropertyValue: name => stageStyles[name] ?? ''}; },
  requestAnimationFrame(fn) { const key = ++id; frames.set(key, fn); return key; },
  cancelAnimationFrame(key) { frames.delete(key); }
 });
 const observers = [];
 class Observer {
  constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
  observe() {}
  disconnect() { this.disconnected = true; }
 }
 const clears = [], painted = [], glows = [], spriteSurfaces = [];
 doc.createElement = tag => {
  assert.equal(tag,'canvas');
  const stops = [];
  const surface = {width:0,height:0,getContext:()=>({
   createRadialGradient:()=>({addColorStop:(...stop)=>stops.push(stop)}),fillRect(){}
  })};
  spriteSurfaces.push({surface,stops});
  return surface;
 };
 const ctx = {setTransform() {}, clearRect(...rect) { clears.push(rect); }, save() {}, restore() {}, rect() {}, clip() {}, closePath() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, arc() {}, fill() {}, drawImage(...args) { glows.push(args); }, fillRect(x,y,w,h) { fills++; painted.push([x,y,ctx.fillStyle,w,h,ctx.globalAlpha]); }};
 const canvas = {getContext: () => ctx, width: 0, height: 0};
 const host = events({getBoundingClientRect: () => ({width, height, left: 0, top: 0})});
 install('window', win); install('document', doc); install('navigator', {connection}); install('ResizeObserver', Observer); install('IntersectionObserver', Observer);
 return {canvas, host, motion, connection, doc, win, frames, observers, clears, painted, glows, spriteSurfaces, stageStyles, styleReads: () => styleReads, fills: () => fills,
  enter() { observers[1].callback([{isIntersecting: true}]); },
  tick(now) { const jobs = [...frames.values()]; frames.clear(); for (const fn of jobs) fn(now); },
  restore() { for (const [name, old] of descriptors) { if (old) Object.defineProperty(globalThis, name, old); else delete globalThis[name]; } }
 };
}

test('All particle modes including fortune are finite, bounded and geometrically distinct', async () => {
 const {PORTAL_MODES, portalShape} = await modulePromise;
 assert.deepEqual(PORTAL_MODES, ['chat', 'play', 'learn', 'story', 'fortune']);
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
  assert.ok(field); assert.equal(e.frames.size, 0, 'wait for confirmed viewport intersection');
  e.enter(); assert.equal(e.frames.size, 1);
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
  e.enter();
  assert.equal(e.frames.size, 0); assert.ok(e.fills() > 0);
  const pictures = new Set();
  for (const mode of ['chat','learn','fortune','play']) {
   e.painted.length = 0;
   field.setMode(mode === 'chat' ? 'story' : 'chat'); field.setMode(mode);
   assert.ok(e.painted.length > 0, 'a reduced-motion mode change paints a complete picture');
   pictures.add(JSON.stringify(e.painted));
   assert.equal(e.frames.size, 0, 'tab changes do not schedule RAF under reduced motion');
  }
  assert.equal(pictures.size, 4, 'all four static frames have distinct geometry and color');
  e.motion.matches = false; e.motion.dispatch('change'); assert.equal(e.frames.size, 1);
  field.setPaused(true); assert.equal(e.frames.size, 0);
  field.setPaused(false); assert.equal(e.frames.size, 1);
  e.connection.saveData = true; e.connection.dispatch('change'); assert.equal(e.frames.size, 0);
  const saved = e.fills(); field.setMode('fortune'); assert.ok(e.fills() > saved, 'Save-Data still updates on selection');
  assert.equal(e.frames.size, 0);
 } finally { field?.destroy(); e.restore(); }
});


test('One hero surface draws only its selected mode within the mobile budget at at most 30fps', async () => {
 const {createPortalField} = await modulePromise;
 const e = environment(); let field;
 try {
  field = createPortalField(e.canvas, e.host); e.enter();
  e.clears.length = 0; e.painted.length = 0;
  e.tick(100);
  assert.deepEqual(e.clears, [[0, 0, 390, 480]], 'one complete hero surface is cleared');
  assert.ok(e.painted.length>0&&e.painted.length<=1800, 'mobile particle point work stays within the old budget');
  const drawn = e.fills(); e.tick(116); assert.equal(e.fills(), drawn, 'skip updates above 30fps');
  field.setMode('fortune');
  assert.equal(e.frames.size, 1, 'mode changes cannot add a second loop');
  e.clears.length = 0; e.painted.length = 0; e.tick(150);
  assert.deepEqual(e.clears, [[0, 0, 390, 480]], 'fortune morph uses the same full hero surface');
  assert.ok(e.painted.length>0&&e.painted.length<=1800);
  e.connection.saveData = true; e.connection.dispatch('change');
  const staticFills = e.fills(); e.tick(200); e.tick(300);
  assert.equal(e.fills(), staticFills); assert.equal(e.frames.size, 0);
 } finally { field?.destroy(); e.restore(); }
});

test('Desktop particle point work stays within the old 3000-point frame budget', async () => {
 const {createPortalField} = await modulePromise;
 const e = environment(1440, 842); let field;
 try {
  field = createPortalField(e.canvas, e.host); e.enter();
  e.painted.length = 0; e.tick(100);
  assert.ok(e.painted.length>0&&e.painted.length<=3000);
  assert.equal(e.frames.size,1);
 } finally { field?.destroy(); e.restore(); }
});

// Snapshot positions and colors, not just draw-call counts, for both static policies.
test('Every selected tab redraws a distinct complete static surface with zero RAF', async () => {
 const {createPortalField} = await modulePromise;
 for (const policy of ['motion','saveData']) {
  const e = environment(); let field;
  try {
   if (policy === 'motion') e.motion.matches = true; else e.connection.saveData = true;
   field = createPortalField(e.canvas,e.host); e.enter();
   const pictures = new Set();
   for (const mode of ['chat','learn','fortune','play']) {
    e.painted.length = 0; e.clears.length = 0;
    // Return through story so even default chat gets an explicit static redraw.
    field.setMode('story'); e.painted.length = 0; e.clears.length = 0;
    field.setMode(mode);
    assert.equal(e.frames.size,0,policy+': no RAF for '+mode);
    assert.deepEqual(e.clears,[[0,0,390,480]],policy+': complete frame for '+mode);
    assert.ok(e.painted.length > 0);
    pictures.add(JSON.stringify(e.painted));
   }
   assert.equal(pictures.size,4,policy+': all four shapes/colors differ');
  } finally { field?.destroy(); e.restore(); }
 }
});

// Inspect the colors and draw calls produced by the controller, rather than source constants.
test('Gold fortune and saturated rose play stay at least forty degrees apart in static core colors', async () => {
 const {createPortalField} = await modulePromise;
 const e = environment(); let field;
 try {
  e.motion.matches = true;
  field = createPortalField(e.canvas,e.host); e.enter();
  const palettes = {};
  for (const mode of ['fortune','play']) {
   e.painted.length=0; field.setMode(mode);
   const colors=e.painted.map(point=>point[2].match(/^hsl\(([-\d.]+),([\d.]+)%,([\d.]+)%\)$/));
   assert.ok(colors.length>0&&colors.every(Boolean),'cores use valid saturated palette colors');
   const hues=colors.map(color=>Number(color[1])*Math.PI/180);
   palettes[mode]={hue:(Math.atan2(hues.reduce((sum,h)=>sum+Math.sin(h),0),hues.reduce((sum,h)=>sum+Math.cos(h),0))*180/Math.PI+360)%360,saturation:colors.reduce((sum,color)=>sum+Number(color[2]),0)/colors.length};
  }
  const gap=Math.abs(((palettes.play.hue-palettes.fortune.hue+540)%360)-180);
  assert.ok(gap>=40,`rose and gold need distinct colors: ${gap} degrees`);
  assert.ok(palettes.play.saturation-palettes.fortune.saturation>=10,'rose also differs visibly in saturation');
  assert.equal(e.frames.size,0);
 } finally { field?.destroy(); e.restore(); }
});

test('The luminous halo reuses cached radial sprites with bounded draws and complete bright cores', async () => {
 const {createPortalField} = await modulePromise;
 for (const width of [390,1440]) {
  const e=environment(width,716); let field;
  try {
   e.motion.matches=true;
   field=createPortalField(e.canvas,e.host); e.enter();
   assert.equal(e.spriteSurfaces.length,1,'one hue sprite is built for the first static frame');
   const sprite=e.spriteSurfaces[0];
   assert.ok(sprite.stops.length>=3,'halo is pre-rendered with a radial falloff');
   assert.ok(e.glows.length>0&&e.glows.length<=180,'sprite overhead is capped independently of point count');
   assert.ok(e.glows.every(call=>call[0]===sprite.surface),'points reuse the same cached bitmap');
   assert.ok(e.painted.every(point=>point[3]>=1&&point[4]>=1),'complete core points remain visible at normal quality');
   const firstSprite=sprite.surface;
   field.setMode('fortune'); e.glows.length=0; field.setMode('chat');
   assert.equal(e.spriteSurfaces.length,2,'returning to a hue reuses its cached glow');
   assert.ok(e.glows.length>0&&e.glows.every(call=>call[0]===firstSprite));
   assert.equal(e.frames.size,0,'cached glow redraws never schedule static animation');
  } finally { field?.destroy(); e.restore(); }
 }
});

test('Play color morph takes the short arc from violet toward rose without passing through green', async () => {
 const {createPortalField} = await modulePromise;
 const e=environment(); let field;
 try {
  field=createPortalField(e.canvas,e.host); e.enter(); e.tick(100);
  field.setMode('play'); e.painted.length=0; e.tick(150);
  assert.ok(e.painted.length>0);
  const hues=e.painted.map(point=>Number(point[2].match(/^hsl\(([-\d.]+)/)[1]));
  assert.ok(hues.every(hue=>hue>=260&&hue<=360),'violet-to-rose hues stay on the shortest arc');
  assert.equal(e.frames.size,1);
 } finally { field?.destroy(); e.restore(); }
});

// Feed the same geometry tokens that CSS chooses; inspect actual painted cores.
test('CSS stage geometry projects the complete static surface for desktop, portrait and compact landscape', async () => {
 const {createPortalField, portalShape} = await modulePromise;
 const noise = i => { const n = Math.sin(i * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
 for (const [width,height,x,y,scaleW,scaleH,tall] of [
  [1440,842,.70,.50,.25,.56,1],
  [390,716,.50,.47,.60,10,1.62],
  [844,262,.70,.50,.25,.62,1],
  [768,896,.50,.50,.47,.60,1]
 ]) {
  const e=environment(width,height,{
   '--portal-stage-x':String(x),'--portal-stage-y':String(y),
   '--portal-stage-scale-w':String(scaleW),'--portal-stage-scale-h':String(scaleH),
   '--portal-stage-tall':String(tall)
  }); let field;
  try {
   e.motion.matches=true;
   field=createPortalField(e.canvas,e.host); e.enter();
   const count=width<600?900:1500, scale=Math.min(width*scaleW,height*scaleH);
   assert.equal(e.painted.length,count,'larger geometry keeps the existing point count');
   for (const index of [0,47,231,count-1]) {
    const q=portalShape('chat',noise(index)*Math.PI*2,noise(index+count)*2-1,0);
    const depth=1/(1-q[2]*.32), paint=e.painted[index];
    assert.ok(Math.abs(paint[0]+paint[3]/2-(width*x+q[0]*scale*depth))<1e-8,'horizontal stage centre, scale and depth');
    assert.ok(Math.abs(paint[1]+paint[4]/2-(height*y+q[1]*scale*tall*depth))<1e-8,'vertical stage centre, scale and tall factor');
   }
   assert.equal(e.frames.size,0,'new geometry is complete without RAF');
   const picture=JSON.stringify(e.painted);
   field.setMode('fortune'); e.painted.length=0; field.setMode('chat');
   assert.equal(JSON.stringify(e.painted),picture,'static redraw has no drift or elapsed-time offset');
  } finally { field?.destroy(); e.restore(); }
 }
});

test('Stage tokens are read only on resize, accept same-size breakpoint changes and reject invalid values', async () => {
 const {createPortalField} = await modulePromise;
 const e=environment(1440,842,{
  '--portal-stage-x':'NaN','--portal-stage-y':'Infinity',
  '--portal-stage-scale-w':'-1','--portal-stage-scale-h':'0','--portal-stage-tall':'invalid'
 }); let field;
 try {
  e.motion.matches=true;
  field=createPortalField(e.canvas,e.host); e.enter();
  assert.ok(e.painted.every(p=>p.every((v,i)=>i===2||Number.isFinite(v))),'invalid tokens fall back to finite centred defaults');
  const original=e.painted.map(p=>[p[0],p[1]]);
  const reads=e.styleReads();
  e.motion.matches=false; e.motion.dispatch('change'); e.tick(100); e.tick(150);
  field.setMode('learn'); e.tick(200);
  assert.equal(e.styleReads(),reads+1,'only the tab geometry refresh reads style; draw never does');
  e.motion.matches=true; e.motion.dispatch('change'); field.setMode('chat');
  const beforeResize=e.styleReads();
  e.stageStyles['--portal-stage-x']='.7'; e.stageStyles['--portal-stage-y']='.5';
  e.painted.length=0; e.win.dispatch('resize');
  assert.equal(e.styleReads(),beforeResize+1);
  assert.equal(e.painted.length,1500,'same-size CSS geometry changes redraw a complete static frame');
  for (const index of [0,47,231,1499]) {
   assert.ok(Math.abs(e.painted[index][0]-original[index][0]-1440*.2)<1e-8);
   assert.ok(Math.abs(e.painted[index][1]-original[index][1]-842*.05)<1e-8);
  }
  assert.equal(e.frames.size,0);
 } finally { field?.destroy(); e.restore(); }
});

test('Ring motion now visibly breathes and undulates without changing the mode shapes', async () => {
 const {portalShape} = await modulePromise;
 // At a fixed chat angle the underlying ellipse is stable, so its radius records
 // the visible combined breathing/wave envelope rather than z or orbit rotation.
 const radii=Array.from({length:500},(_,i)=>Math.hypot(...portalShape('chat',0,0,i*.1).slice(0,2)));
 assert.ok(Math.max(...radii)/Math.min(...radii)>1.12,'motion exceeds the former near-static 3.6% envelope');
 const atZero=portalShape('chat',0,0,0), atWave=portalShape('chat',0,0,Math.PI/.9/2);
 assert.ok(Math.hypot(...atWave.slice(0,2))-Math.hypot(...atZero.slice(0,2))>.06,'angle wave contributes visible radial travel');
});


test('Switching an animated field to a static policy removes drift and pointer/tap displacement', async () => {
 const {createPortalField} = await modulePromise;
 const styles={'--portal-stage-x':'.7','--portal-stage-y':'.5','--portal-stage-scale-w':'.25','--portal-stage-scale-h':'.56','--portal-stage-tall':'1'};
 const e=environment(1440,842,styles); let field;
 try {
  e.motion.matches=true; field=createPortalField(e.canvas,e.host); e.enter();
  const staticPicture=JSON.stringify(e.painted);
  e.motion.matches=false; e.motion.dispatch('change');
  for (let i=0;i<30;i++) e.tick(100+i*40);
  e.host.dispatch('pointerdown',{clientX:1000,clientY:420,pointerType:'mouse'}); e.tick(1340);
  e.painted.length=0; e.motion.matches=true; e.motion.dispatch('change');
  assert.equal(JSON.stringify(e.painted),staticPicture,'static rendering is independent of elapsed motion and live interaction');
  assert.equal(e.frames.size,0,'the transition cancels the one active loop');
 } finally { field?.destroy(); e.restore(); }
});


test('Tab changes refresh mode-specific CSS scale with one complete static draw and no extra loop', async () => {
 const {createPortalField,portalShape}=await modulePromise;
 const styles={'--portal-stage-x':'.7','--portal-stage-y':'.5','--portal-stage-scale-w':'.23','--portal-stage-scale-h':'.56','--portal-stage-tall':'1'};
 const e=environment(1440,842,styles); let field;
 try {
  e.motion.matches=true; field=createPortalField(e.canvas,e.host); e.enter();
  const reads=e.styleReads();
  // React commits data-mode before the controller effect; emulate its new CSS.
  e.stageStyles['--portal-stage-scale-w']='.22';
  e.painted.length=0; e.clears.length=0; field.setMode('learn');
  assert.equal(e.styleReads(),reads+1,'tab selection resolves the current CSS geometry once via resize');
  assert.deepEqual(e.clears,[[0,0,1440,842]],'mode selection draws exactly once');
  assert.equal(e.painted.length,1500,'the static frame is complete');
  const noise=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
  const q=portalShape('learn',noise(0)*Math.PI*2,noise(1500)*2-1,0),depth=1/(1-q[2]*.32),p=e.painted[0];
  assert.ok(Math.abs(p[0]+p[3]/2-(1440*.7+q[0]*1440*.22*depth))<1e-8,'paint uses the selected mode scale immediately');
  assert.equal(e.frames.size,0);
  e.motion.matches=false; e.motion.dispatch('change');
  e.stageStyles['--portal-stage-scale-w']='.228'; field.setMode('play');
  assert.equal(e.frames.size,1,'animated mode changes retain exactly one loop');
 } finally { field?.destroy(); e.restore(); }
});
