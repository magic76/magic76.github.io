const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.resolve(__dirname,"..",name),"utf8");

test("Particle field is decorative while the invitation remains semantic HTML",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const field=read("web-spa/src/pages/PortalParticleField.tsx");
 const css=read("web-spa/src/pages/homePortal.css");
 assert.match(portal,/<h1>/);
 assert.match(portal,/<Link className="crew-portal-cta" to=\{target\}/);
 assert.match(portal,/mode==="chat"\?destination:mode==="learn"\?teacherDestination:/);
 assert.match(portal,/role="tabpanel"/);
 assert.match(portal,/role="tablist"/);
 assert.match(field,/aria-hidden="true"/);
 assert.match(field,/className="crew-portal-fallback"/);
 assert.match(field,/<svg/);
 assert.match(field,/mode==="fortune"/);
 assert.match(field,/mode==="play"/);
 assert.match(field,/mode==="learn"/);
 assert.match(css,/\.crew-portal-field\{[^}]*pointer-events:none/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test("Google Play area starts collapsed but remains accessible",()=>{
 const page=read("web-spa/src/pages/HomePage.tsx");
 assert.match(page,/<details className="crew-home-android">/);
 assert.match(page,/<summary>\{t\("android"\)\}/);
 const home=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/home.json"));
 assert.equal(home.android,"在 Android 上使用 Crew");
 for(const kind of ["teacher","story","fortune"]){
  assert.match(page,new RegExp('<PlayStoreLink product="'+kind+'"'));
 }
});

