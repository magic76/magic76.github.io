const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.resolve(__dirname,"..",name),"utf8");

test("Crew Hub keeps decorative canvas separate from readable, clickable content",()=>{
 const page=read("web-spa/src/pages/HomePage.tsx");
 const ambience=read("web-spa/src/pages/HomeAtmosphere.tsx");
 assert.match(page,/import \{HomeAtmosphere,type HomeProduct\} from "\.\/HomeAtmosphere"/);
 assert.match(page,/<HomeAtmosphere activeProduct=\{activeProduct\}\/>/);
 assert.match(page,/crew-home-intro-copy/);
 assert.match(ambience,/aria-hidden="true"/);
 assert.match(ambience,/<canvas ref=\{canvasRef\}/);
 assert.match(ambience,/pointermove/);
 for(const kind of ["teacher","story","fortune"]){
  assert.match(page,new RegExp('crew-home-product crew-home-'+kind));
  assert.match(page,new RegExp('setActiveProduct\\("'+kind+'"\\)'));
 }
 assert.match(page,/onPointerLeave=\{\(\)=>setActiveProduct\(null\)\}/);
 assert.match(page,/onFocus=\{\(\)=>setActiveProduct/);
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
