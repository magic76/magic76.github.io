const test = require("node:test");
const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const {resolve} = require("node:path");
const file = path => readFileSync(resolve(__dirname,"..",path),"utf8");

test("home shows the KV before recent activity without duplicate quick actions",()=>{
 const home=file("web-spa/src/pages/HomePage.tsx");
 const kv=home.indexOf("<HomePortal/>");
 const recent=home.indexOf('className="crew-home-continue"');
 const shorts=home.indexOf("<HomeShortsPreview/>");
 assert.ok(kv>=0&&kv<recent&&recent<shorts);
 assert.doesNotMatch(home,/HomeQuickCarousel|crew-home-launchpad/);
 assert.match(home,/recent\.to/);
 const css=file("web-spa/src/pages/homeWorld.css");
 assert.doesNotMatch(css,/crew-home-carousel|crew-home-quick-actions/);
 assert.match(css,/\.crew-home-world \.crew-home-continue/);
});

test("KV four mode tabs loop every five seconds and pause appropriately",()=>{
 const portal=file("web-spa/src/pages/HomePortal.tsx");
 for(const mode of ["chat","play","learn","story"])assert.match(portal,new RegExp('id:"'+mode+'"'));
 assert.match(portal,/setTimeout\(\(\)=>\{/);
 assert.match(portal,/\},5000\)/);
 assert.match(portal,/\(currentIndex\+1\)%MODES\.length/);
 assert.match(portal,/\[mode,paused,launching\]/);
 assert.match(portal,/if\(paused\|\|launching\|\|window\.matchMedia/);
 assert.match(portal,/return\(\)=>window\.clearTimeout\(id\)/);
 assert.match(portal,/onClick=\{\(\)=>setPaused\(value=>!value\)\}/);
 assert.match(portal,/onClick=\{\(\)=>setMode\(item\.id\)\}/);
});
