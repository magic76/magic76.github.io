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

test("Home promotes one unified Crew Android app with a real Google Play link",()=>{
 const page=read("web-spa/src/pages/HomePage.tsx");
 const store=read("web-spa/src/components/PlayStoreLink.tsx");
 assert.match(page,/<section className="crew-home-android"/);
 assert.match(page,/href=\{CREW_ANDROID_PLAY_STORE_URL\}/);
 assert.match(page,/android_app_card_view/);
 assert.match(page,/android_app_google_play_click/);
 assert.doesNotMatch(page,/<details className="crew-home-android"/);
 assert.doesNotMatch(page,/<PlayStoreLink product=/);
 assert.match(store,/id=com.crewpocket.teacher/);
 const zh=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/home.json"));
 const en=JSON.parse(read("web-spa/src/i18n/locales/en/home.json"));
 assert.equal(zh.android.appName,"Crew：AI 朋友與外語對話");
 for(const locale of [zh,en])for(const key of ["title","description","appName","platform","download"])assert.ok(locale.android[key],key);
});
