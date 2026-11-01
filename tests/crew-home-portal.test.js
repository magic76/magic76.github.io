const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const read=p=>readFileSync(path.join(__dirname,"..",p),"utf8");
test("Crew homepage keeps a single chat portal before Shorts and exploration",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 assert.ok(home.indexOf("<HomePortal/>")>=0);
 assert.ok(home.indexOf("<HomeShortsPreview/>")>home.indexOf("<HomePortal/>"));
 assert.ok(home.indexOf("<HomeShortsPreview/>")<home.indexOf('className="crew-home-search-summary"'));
 assert.match(portal,/const ZOE="\/friend\/live\?id=zoe"/);
 assert.match(portal,/to=\{destination\}/);
 assert.match(portal,/to="\/friend\/live\?id=noah"/);
 assert.match(portal,/to="\/teacher\/live"/);
 assert.match(portal,/to="\/games\/1a2b"/);
 assert.doesNotMatch(portal,/role="tablist"|role="tabpanel"/);
 assert.match(portal,/<PortalParticleField mode="chat"/);
});
test("Crew World Shorts still use the real feed and their story/chat paths",()=>{
 const shorts=read("web-spa/src/teacher/HomeShortsPreview.tsx");
 assert.match(shorts,/fetchShortsFeed\(/);
 assert.match(shorts,/shortsChatUrl\(post,"details"\)/);
 assert.match(shorts,/\/teacher\/shorts\?post=/);
 assert.match(shorts,/maxPosts=3/);
 assert.match(shorts,/\.slice\(0,maxPosts\)/);
 assert.match(shorts,/excludeFriendIds\.includes\(post\.friendId\)/);
});
test("Crew World animated portal respects reduced motion",()=>{
 const css=read("web-spa/src/pages/homePortal.css");
 const canvas=read("web-spa/src/pages/portalField.mjs");
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(canvas,/prefers-reduced-motion: reduce/);
 assert.match(canvas,/saveData/);
 assert.match(canvas,/IntersectionObserver/);
});


test("Crew World does not repeat its KV tabs in a separate quick-start carousel",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const css=read("web-spa/src/pages/homeWorld.css");
 const kv=home.indexOf("<HomePortal/>");
 const recent=home.indexOf('className="crew-home-continue"');
 const shorts=home.indexOf("<HomeShortsPreview/>");
 assert.ok(kv>=0&&kv<recent&&recent<shorts);
 assert.doesNotMatch(home,/HomeQuickCarousel|crew-home-launchpad/);
 assert.match(home,/recent\.to/);
 assert.doesNotMatch(css,/crew-home-carousel|crew-home-quick-actions/);
 assert.match(css,/\.crew-home-world \.crew-home-continue/);
});

test("Crew World hero stays on chat without rotation, tabs or a pause control",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const css=read("web-spa/src/pages/homePortal.css");
 assert.match(portal,/data-mode="chat"/);
 assert.match(portal,/trial\.resolved&&trial\.enabled&&trial\.remaining===0/);
 assert.doesNotMatch(portal,/setMode|MODES|\},5000\)|role="tablist"|crew-portal-motion/);
 assert.doesNotMatch(css,/crew-portal-tabs|crew-portal-tab-progress|crew-portal-hint|crew-portal-motion/);
});

test("Mobile portal delays Canvas and recurring motion until eligible",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const field=read("web-spa/src/pages/PortalParticleField.tsx");
 const css=read("web-spa/src/pages/homePortal.css");
 assert.match(portal,/useState\(true\); \/\/ Static SSR fallback/);
 assert.match(portal,/requestIdleCallback/);
 assert.match(portal,/IntersectionObserver/);
 assert.match(portal,/visibilitychange/);
 assert.match(portal,/\!canAnimate/);
 assert.match(portal,/enabled=\{fieldEverEnabled\|\|fieldEligible\}/);
 assert.match(portal,/if\(!reducedMotion&&!saveData\)setPaused\(false\)/);
 assert.doesNotMatch(portal,/coarse\.matches/);
 assert.match(portal,/fieldEligible=idleReady&&inViewport&&foreground/);
 assert.match(field,/createPortalField\(canvas,host,state\.mode\)/);
 assert.match(field,/field\.setPaused\(state\.paused\)/);
 assert.match(field,/\[mode,enabled\]/);
 assert.match(field,/\[paused,enabled\]/);
 assert.match(field,/if\(!enabled\|\|!canvas\|\|!host\)return/);
 assert.doesNotMatch(css,/@keyframes crew-world-copy-in\{[^}]*filter:blur/);
 assert.match(css,/@media\(max-width:700px\)/);
});
