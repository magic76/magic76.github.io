const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.resolve(__dirname,"..",name),"utf8");

test("Crew Hub uses bounded decorative particles and retains real clickable cards",()=>{
 const page=read("web-spa/src/pages/HomePage.tsx");
 const ambience=read("web-spa/src/pages/HomeAtmosphere.tsx");
 assert.match(page,/import \{HomeAtmosphere\} from "\.\/HomeAtmosphere"/);
 assert.match(page,/<HomeAtmosphere\/>/);
 assert.match(page,/crew-home-intro-copy/);
 assert.match(ambience,/aria-hidden="true"/);
 assert.match(ambience,/MOTES\.map/);
 assert.doesNotMatch(ambience,/requestAnimationFrame|setInterval|<canvas|window\.addEventListener/);
 for(const kind of ["teacher","story","fortune"]){
  assert.match(page,new RegExp('crew-home-product crew-home-'+kind));
 }
});
test("motion respects reduced-motion, cannot catch taps and never covers the text",()=>{
 const css=read("web-spa/src/pages/home.css");
 assert.match(css,/\.crew-home-atmosphere\{[^}]*pointer-events:none/);
 assert.match(css,/\.crew-home-intro-copy\{[^}]*z-index:1/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.crew-home-mote,\.crew-home-atmosphere-ring\{animation:none!important\}/);
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
