const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {resolve}=require("node:path");
const read=path=>readFileSync(resolve(path),"utf8");

test("four illustrated slides preserve Zoe first and real destinations",()=>{
 const jsx=read("web-spa/src/pages/MobileHomePage.tsx");
 assert.match(jsx,/SLIDES=\["zoe","friends","game","learn"\]/);
 assert.match(jsx,/CAROUSEL_INTERVAL_MS=5200/);
 assert.match(jsx,/resume\?\.friendId==="zoe"\?resume:null/);
 assert.match(jsx,/otherResume=resume&&resume.friendId!=="zoe"/);
 assert.match(jsx,/cmh-zoe-scene/);
 assert.match(jsx,/cmh-chat-pop-first/);
 assert.match(jsx,/cmh-chat-pop-last/);
 assert.match(jsx,/cmh-friend-portrait-/);
 assert.match(jsx,/\["noah","iris","bella"\]/);
 assert.match(jsx,/cmh-game-board/);
 assert.match(jsx,/data-game=\{featured\}/);
 assert.match(jsx,/cmh-learn-portrait/);
 assert.match(jsx,/teacher-olivia\.jpg/);
 assert.doesNotMatch(jsx,/teacher-(?:alex|emma|james|mia|sophie)\.webp/);
 assert.match(jsx,/crew_friend_zoe\.webp/);
 for(const href of ["/friend/live?id=noah&from=home&chat=text","/teacher/roles?mode=friends","/games","/learn","/teacher/roles?mode=teacher"]){
  assert.ok(jsx.includes(href),"missing genuine destination "+href);
 }
 assert.match(jsx,/const todayLink="\/games\/"\+featured/);
 assert.match(jsx,/onTouchStart=\{touchBegin\} onTouchEnd=\{touchFinish\}/);
 assert.match(jsx,/setCarouselPaused\(true\)/);
 assert.match(jsx,/document\.visibilityState==="visible"/);
 assert.match(jsx,/aria-hidden=\{activeSlide!==0\}/);
 assert.match(jsx,/tabIndex=\{activeSlide===0\?0:-1\}/);
 assert.match(jsx,/className="cmh-carousel-dots"/);
 assert.doesNotMatch(jsx,/className="cmh-featured"/);
});
test("homepage entry modules do not import cartoon teacher avatars",()=>{
 for(const file of ["web-spa/src/pages/HomePage.tsx","web-spa/src/pages/HomePortal.tsx",
  "web-spa/src/pages/MobileHomePage.tsx","web-spa/src/teacher/HomeShortsPreview.tsx"]){
  const text=read(file);
  assert.doesNotMatch(text,/teacher-(?:alex|emma|james|mia|sophie)\.webp/,
   "Cartoon teacher artwork must not appear on the homepage: "+file);
 }
 assert.match(read("web-spa/src/teacher/teacherProfiles.ts"),/teacher-olivia\.jpg/);
});

test("mobile-only art has four color directions, layered motion and reduced-motion shutdown",()=>{
 const base=read("web-spa/src/pages/mobileHome.css");
 const art=read("web-spa/src/pages/mobileHomeHeroV3.css");
 const jsx=read("web-spa/src/pages/MobileHomePage.tsx");
 assert.ok(jsx.indexOf('import "./mobileHomeHeroV3.css"')>jsx.indexOf('import "./mobileHome.css"'));
 assert.match(art,/@media\(max-width:767px\)/);
 for(const selector of [".cmh-slide.cmh-zoe",".cmh-slide.cmh-slide-friends",".cmh-slide.cmh-slide-game",".cmh-slide.cmh-slide-learn",
 ".cmh-scene",".cmh-art-texture",".cmh-friend-portrait",".cmh-game-board",".cmh-learn-portrait"]){
  assert.ok(art.includes(selector),"missing art CSS "+selector);
 }
 for(const motion of ["cmh-editorial-copy","cmh-editorial-scene","cmh-editorial-actions","cmh-editorial-sheen","cmh-editorial-portrait"]){
  assert.ok(art.includes("@keyframes "+motion),"missing layered transition "+motion);
 }
 assert.match(art,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(art,/@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?\.cmh-carousel-track,[\s\S]*?animation:none!important;transition:none!important/);
 assert.match(base,/\.cmh-carousel-track\{display:flex/);
 assert.match(art,/min-height:46px/);
 for(const frame of ["cmh-v4-backdrop","cmh-v4-texture","cmh-v4-copy","cmh-v4-scene","cmh-v4-cta"]){
  assert.match(art,new RegExp("@keyframes "+frame));
 }
 assert.match(art,/\.cmh-slide-copy h1,\.cmh-slide-copy h2/);
 assert.match(art,/\.cmh-chat-pop-first\{top:179px/);
 assert.match(art,/\.cmh-friends-art\{width:151px/);
 const nav=read("web-spa/src/components/mobileNavigation.css");
 assert.match(nav,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
});
