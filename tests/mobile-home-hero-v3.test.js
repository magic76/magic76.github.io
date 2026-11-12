const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
test("Layout 2 keeps the Zoe hero fixed and replaces all four carousel scenes",()=>{
 const mobile=read("web-spa/src/pages/MobileHomePage.tsx");
 for(const old of ["SLIDES=","CAROUSEL_INTERVAL_MS","setInterval","cmh-carousel","cmh-slide-","onTouchStart={touchBegin}","cmh-carousel-dots"])
  assert.ok(!mobile.includes(old),"removed rotation: "+old);
 assert.match(mobile,/const ZOE_TEXT="\/friend\/live\?id=zoe&from=home&chat=text"/);
 assert.match(mobile,/const ZOE_VOICE="\/friend\/live\?id=zoe&from=home&entry=bubble"/);
 assert.equal((mobile.match(/className="cmh-layout2-primary"/g)||[]).length,1);
 assert.match(mobile,/crew_friend_zoe\.webp/);
 assert.match(mobile,/readLatestFriendResume\(\)/);
 assert.match(mobile,/resume\?\.friendId==="zoe"\?resume:null/);
 assert.match(mobile,/PREVIEW_HIDDEN_KEY/);
 assert.match(mobile,/setPreviewHidden\(next\)/);
 assert.doesNotMatch(mobile,/teacher-(?:alex|emma|james|mia|sophie)\.webp/);
});
test("The fixed primary CTA keeps exhausted redirect, voice and guest allowance",()=>{
 const mobile=read("web-spa/src/pages/MobileHomePage.tsx");
 assert.match(mobile,/const destination=exhausted\?"\/account#settings-gemini":shortsDestination/);
 assert.match(mobile,/className="cmh-layout2-primary" onClick=\{\(\)=>onNavigate\("chat"\)\}/);
 assert.ok(mobile.indexOf('className="cmh-layout2-primary"')<mobile.indexOf('className="cmh-allowance-slot"'));
 assert.ok(mobile.indexOf('className="cmh-allowance-slot"')<mobile.indexOf('<HomeModeRail'));
 assert.match(mobile,/className="cmh-layout2-voice"/);
 assert.match(mobile,/world\.freeAllowance\.full/);
 assert.match(mobile,/GUEST_TEXT_DAILY_TURNS/);
});
test("Phone art has a small portrait; the eight frosted shortcuts stay unchanged",()=>{
 const css=read("web-spa/src/pages/homeLayout2.css"),mobile=read("web-spa/src/pages/MobileHomePage.tsx"),apps=read("web-spa/src/pages/mobileHome.css");
 assert.match(css,/\.cmh-layout2-avatar\{width:88px;height:94px/);
 assert.match(css,/\.cmh-layout2-primary\{[^}]*min-height:52px/);
 assert.match(css,/@media\(max-width:375px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(mobile,/\{id:"timeline",zh:"時光機"/);
 assert.match(mobile,/\{id:"scenarios",zh:"情境課程"/);
 assert.match(apps,/\.cmh-app-grid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(read("web-spa/src/pages/mobileHomeHeroV3.css"),/cmh-carousel|cmh-slide|@keyframes/);
});
