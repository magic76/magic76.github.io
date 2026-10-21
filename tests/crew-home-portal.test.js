const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const read=p=>readFileSync(path.join(__dirname,"..",p),"utf8");
test("Crew V3 homepage keeps interactive portal before real Shorts and functional exploration",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 assert.ok(home.indexOf("<HomePortal/>")>=0);
 assert.ok(home.indexOf("<HomeShortsPreview/>")>home.indexOf("<HomePortal/>"));
 assert.ok(home.indexOf("<HomeShortsPreview/>")<home.indexOf('className="crew-home-layout"'));
 for(const path of ["/teacher/roles?mode=friends","/games","/teacher","/story"])assert.ok(portal.includes('to:"'+path+'"'),path);
 assert.match(portal,/aria-pressed=\{mode===item.id\}/);
 assert.match(portal,/HomeAtmosphere activeProduct=\{mode\}/);
});
test("Crew V3 Shorts still use the real feed and their story/chat paths",()=>{
 const shorts=read("web-spa/src/teacher/HomeShortsPreview.tsx");
 assert.match(shorts,/fetchShortsFeed\(/);
 assert.match(shorts,/shortsChatUrl\(post,"details"\)/);
 assert.match(shorts,/\/teacher\/shorts\?post=/);
 assert.match(shorts,/slice\(0,6\)/);
});
test("Crew V3 animated portal respects reduced motion",()=>{
 const css=read("web-spa/src/pages/homePortal.css");
 const canvas=read("web-spa/src/pages/HomeAtmosphere.tsx");
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(canvas,/prefers-reduced-motion: reduce/);
 assert.match(canvas,/saveData/);
 assert.match(canvas,/IntersectionObserver/);
});
