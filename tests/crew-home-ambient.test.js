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
 assert.match(portal,/const target=destination/);
 assert.match(read("web-spa/src/pages/HomeModeRail.tsx"),/role="tabpanel"/);
 assert.match(read("web-spa/src/pages/HomeModeRail.tsx"),/role="tablist"/);
 assert.match(field,/aria-hidden="true"/);
 assert.match(field,/className="crew-portal-fallback"/);
 assert.match(field,/<svg/);
 assert.match(field,/mode==="fortune"/);
 assert.match(field,/mode==="play"/);
 assert.match(field,/mode==="learn"/);
 assert.match(css,/\.crew-portal-field\{[^}]*pointer-events:none/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test("Google Play area promotes one unified Crew app with localized copy",()=>{
 const page=read("web-spa/src/pages/HomePage.tsx");
 const store=read("web-spa/src/components/PlayStoreLink.tsx");
 assert.match(page,/<details className="crew-home-android">/);
 assert.match(page,/<summary>\{t\("android"\)\}/);
 assert.match(page,/t\("androidApp\.description"\)/);
 assert.match(page,/<PlayStoreLink product="teacher" onClick=/);
 assert.match(page,/trackUsageEvent\("home_entry_click","android_app_google_play"\)/);
 assert.doesNotMatch(page,/<PlayStoreLink product="(?:story|fortune)"/);
 assert.match(store,/t\("androidApp\.name"\)/);
 for(const locale of ["zh-TW","en","ja","es","pt-BR","id","ko","fr","de","vi","th"]){
  const home=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/home.json"));
  for(const field of [home.android,home.androidApp?.name,home.androidApp?.description])
   assert.ok(typeof field==="string"&&field.length>12,"Missing Android promotion text for "+locale);
 }
});

