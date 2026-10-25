const test = require("node:test");
const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const {resolve} = require("node:path");
const file = path => readFileSync(resolve(__dirname,"..",path),"utf8");

test("home KV precedes swipeable actions and recent activity",()=>{
 const home=file("web-spa/src/pages/HomePage.tsx");
 const kv=home.indexOf("<HomePortal/>");
 const carousel=home.indexOf("<HomeQuickCarousel/>");
 const recent=home.indexOf('className="crew-home-continue"');
 const shorts=home.indexOf("<HomeShortsPreview/>");
 assert.ok(kv>=0&&kv<carousel&&carousel<recent&&recent<shorts);
 assert.equal((home.match(/<HomeQuickCarousel\/>/g)||[]).length,1);
 assert.doesNotMatch(home,/crew-home-launchpad/);
});

test("swipe actions preserve the four canonical routes with reduced motion",()=>{
 const carousel=file("web-spa/src/pages/HomeQuickCarousel.tsx");
 for(const route of ["/chat","/learn","/games","/explore"]){
  assert.match(carousel,new RegExp('to:"'+route+'"'));
 }
 assert.match(carousel,/scrollTo\(/);
 assert.match(carousel,/prefers-reduced-motion: reduce/);
 const css=file("web-spa/src/pages/homeWorld.css");
 assert.match(css,/\.crew-home-world \.crew-home-quick-actions\{[^}]*overflow-x:auto/);
 assert.match(css,/scroll-snap-type:x mandatory/);
 assert.match(css,/scroll-snap-align:start/);
 assert.match(css,/touch-action|webkit-overflow-scrolling/);
 assert.match(css,/\.crew-home-world \.crew-home-continue/);
});
