const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const read=p=>readFileSync(path.join(__dirname,"..",p),"utf8");
test("Crew World homepage keeps interactive portal before real Shorts and functional exploration",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 assert.ok(home.indexOf("<HomePortal/>")>=0);
 assert.ok(home.indexOf("<HomeShortsPreview/>")>home.indexOf("<HomePortal/>"));
 assert.ok(home.indexOf("<HomeShortsPreview/>")<home.indexOf('className="crew-home-search-summary"'));
 for(const path of ["/teacher/roles?mode=friends","/games","/learn","/story"])assert.ok(portal.includes('to:"'+path+'"'),path);
 assert.match(portal,/aria-selected=\{mode===item.id\}/);
 assert.match(portal,/role="tablist"/);
 assert.match(portal,/aria-controls="crew-portal-panel"/);
 assert.match(portal,/<PortalParticleField mode=\{mode\}/);
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

test("Crew World KV rotates through four tabs every 5 seconds and can be paused",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 for(const mode of ["chat","play","learn","story"])assert.match(portal,new RegExp('id:"'+mode+'"'));
 assert.match(portal,/setTimeout\(\(\)=>\{/);
 assert.match(portal,/\},5000\)/);
 assert.match(portal,/\(currentIndex\+1\)%MODES\.length/);
 assert.match(portal,/\[mode,paused,launching,canAnimate,interacting\]/);
 assert.match(portal,/onFocusCapture=\{\(\)=>setInteracting\(true\)\}/);
 assert.match(portal,/if\(paused\|\|launching\|\|window\.matchMedia/);
 assert.match(portal,/return\(\)=>window\.clearTimeout\(id\)/);
 assert.match(portal,/onClick=\{\(\)=>setPaused\(value=>!value\)\}/);
 assert.match(portal,/onClick=\{\(\)=>setMode\(item\.id\)\}/);
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
 assert.match(css,/@media\(max-width:700px\)\{\.crew-portal-copy\{animation:none\}/);
});
