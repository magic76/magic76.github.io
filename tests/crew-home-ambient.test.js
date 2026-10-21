const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.resolve(__dirname,"..",name),"utf8");

test("Crew KV keeps decorative canvas behind accessible, clickable content",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const ambience=read("web-spa/src/pages/HomeAtmosphere.tsx");
 assert.match(home,/<HomePortal\/>/);
 assert.match(portal,/<HomeAtmosphere activeProduct=\{mode\}\/>/);
 assert.match(portal,/crew-home-intro-copy/);
 assert.match(portal,/aria-pressed=\{mode===item.id\}/);
 assert.match(ambience,/aria-hidden="true"/);
 assert.match(ambience,/<canvas ref=\{canvasRef\}/);
 assert.match(ambience,/pointermove/);
 for(const kind of ["teacher","story","fortune","play"])assert.match(home,new RegExp("crew-home-product crew-home-"+kind));
 for(const mode of ["chat","play","learn","story"])assert.match(portal,new RegExp('id:"'+mode+'"'));
});

test("network rendering is bounded, throttled, visibility-aware, and cleanly disposed",()=>{
 const ambience=read("web-spa/src/pages/HomeAtmosphere.tsx");
 assert.match(ambience,/createParticles\(mobile\?22:52\)/);
 assert.match(ambience,/mobile\?1000\/18:1000\/30/);
 assert.match(ambience,/requestAnimationFrame/);
 assert.match(ambience,/Math\.min\(window\.devicePixelRatio\|\|1,2\)/);
 assert.match(ambience,/IntersectionObserver/);
 assert.match(ambience,/visibilitychange/);
 assert.match(ambience,/saveData/);
 assert.match(ambience,/cancelAnimationFrame/);
 assert.match(ambience,/observer\?\.disconnect\(\)/);
 assert.match(ambience,/intersection\?\.disconnect\(\)/);
 assert.doesNotMatch(ambience,/setInterval\(/);
});

test("aurora and core stay behind the text, cannot catch taps, and honor reduced motion",()=>{
 const css=read("web-spa/src/pages/home.css");
 const ambience=read("web-spa/src/pages/HomeAtmosphere.tsx");
 assert.match(css,/\.crew-home-atmosphere\{[\s\S]*?pointer-events:none/);
 assert.match(css,/\.crew-home-intro-copy\{[^}]*z-index:2/);
 assert.match(css,/\.crew-home-network\{/);
 assert.match(css,/\.crew-home-aurora\.first\{/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.crew-home-aurora,\.crew-home-atmosphere-ring,\.crew-home-atmosphere-core::before\{animation:none!important\}/);
 assert.match(ambience,/prefers-reduced-motion: reduce/);
 assert.match(ambience,/if\(!animated\(\)\)/);
});


test("mode selection morphs the same Canvas network into selected icons",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const ambience=read("web-spa/src/pages/HomeAtmosphere.tsx");
 const css=read("web-spa/src/pages/homePortal.css");
 for(const mode of ["chat","play","learn","story"]){
  assert.ok(ambience.includes(mode+":["));
  assert.ok(portal.includes('id:"'+mode+'"'));
 }
 assert.ok(portal.includes("onClick={()=>setMode(item.id)}"));
 assert.ok(ambience.includes("GLYPH_STROKES"));
 assert.ok(ambience.includes("sampleGlyph(active,particles.length)"));
 assert.ok(ambience.includes("fromNodes=(renderedNodes.length===idleNodes.length"));
 assert.ok(ambience.includes("const duration=active?420:620"));
 assert.ok(ambience.includes("smoothstep(progress)"));
 assert.ok(ambience.includes("const progress=reduced?1:"));
 assert.ok(ambience.includes("ripple={x:width*"));
 assert.ok(css.includes(".crew-home-portal-ring.outer"));
 assert.ok(css.includes("@media(prefers-reduced-motion:reduce)"));
});

test("Google Play area starts expanded but stays collapsible",()=>{
 const page=read("web-spa/src/pages/HomePage.tsx");
 assert.match(page,/<details className="crew-home-android" open>/);
 assert.match(page,/<summary>\{t\("android"\)\}/);
 const home=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/home.json"));
 assert.equal(home.android,"在 Android 上使用 Crew");
 for(const kind of ["teacher","story","fortune"]){
  assert.match(page,new RegExp('<PlayStoreLink product="'+kind+'"'));
 }
});
