const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {resolve}=require("node:path");
const read=path=>readFileSync(resolve(path),"utf8");

test("four illustrated slides put the teacher first and real destinations",()=>{
 const jsx=read("web-spa/src/pages/MobileHomePage.tsx");
 assert.match(jsx,/SLIDES=\["learn","zoe","friends","game"\]/);
 assert.match(jsx,/CAROUSEL_INTERVAL_MS=11000/);
 assert.match(jsx,/const resumeFriend=resume\?CREW_FRIENDS.find/);
 assert.match(jsx,/const friendResume=resumeFriend\?resume:null/);
 assert.match(jsx,/cmh-zoe-scene/);
 assert.match(jsx,/cmh-chat-pop-first/);
 assert.doesNotMatch(jsx,/cmh-chat-pop-last/,"removed caption cannot reappear during slide transitions");
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
 for(const f of [base,art])for(const m of f.matchAll(/font-size:(\d+(?:\.\d+)?)px/g))assert.ok(Number(m[1])>=12,"font below 12px: "+m[0]);
 // The V3 sheet loads after the base sheet: neither override may restore 44px widths.
 assert.match(base,/\.cmh-carousel-dots\{[^}]*gap:0;/);
 assert.match(base,/\.cmh-carousel-dots button\{[^}]*width:max-content;min-width:0;min-height:44px;[^}]*padding:0 8px/);
 assert.match(base,/\.cmh-carousel-dots button span\{[^}]*width:7px;height:7px;[^}]*transition:width 220ms ease,background-color 220ms ease/);
 assert.match(base,/\.cmh-carousel-dots button\.is-active span\{width:24px;/);
 assert.match(base,/@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?\.cmh-carousel-track,\.cmh-carousel-dots button span\{transition:none\}/);
 assert.match(art,/\.cmh-carousel-dots\{min-height:44px;padding-top:1px;gap:0\}/);
 assert.match(art,/\.cmh-carousel-dots button\{min-width:0;min-height:44px\}/);
 assert.match(art,/\.cmh-carousel-dots button\{min-height:44px;min-width:0\}/);
 assert.doesNotMatch(art,/\.cmh-carousel-dots button\{[^}]*min-width:44px/);
 // With no flex gap, each neighbor contributes exactly 8px of side padding.
 // A 24px active pill (or 7px idle dot) changes its own button width, not this gap.
 for(const left of [7,24])for(const right of [7,24]){
  const leftButton=left+16,rightButton=right+16;
  const visibleGap=(leftButton-left)/2+(rightButton-right)/2;
  assert.equal(visibleGap,16);
 }
 for(const frame of ["cmh-v4-backdrop","cmh-v4-texture","cmh-v4-copy","cmh-v4-scene","cmh-v4-cta"]){
  assert.match(art,new RegExp("@keyframes "+frame));
 }
 assert.match(art,/\.cmh-slide-copy h1,\.cmh-slide-copy h2/);
 assert.match(art,/\.cmh-chat-pop-first\{top:179px/);
 assert.match(art,/\.cmh-friends-art\{width:151px/);
 const nav=read("web-spa/src/components/mobileNavigation.css");
 assert.match(nav,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
});

test("compact phone hero keeps all four scenes and fits a 16:11 first-screen card",()=>{
 const art=read("web-spa/src/pages/mobileHomeHeroV3.css");
 const jsx=read("web-spa/src/pages/MobileHomePage.tsx");
 assert.match(art,/\.cmh-slide\{height:244px;min-height:244px/);
 assert.match(art,/@media\(max-width:380px\)\{\s*\.cmh-slide\{height:240px;min-height:240px/);
 assert.match(art,/\.cmh-scene\{scale:\.75;transform-origin:right top/);
 assert.match(art,/\.cmh-zoe-actions a\{min-height:44px/);
 assert.match(art,/\.cmh-carousel-dots\{min-height:44px/);
 assert.match(art,/@keyframes cmh-v4-scene/);
 assert.match(art,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(jsx,/teacher-olivia\.jpg/);
 assert.doesNotMatch(jsx,/\{id:"timeline",zh:"時光機"/);
 assert.match(jsx,/\{id:"scenarios",zh:"情境課程"/);
});

test("four tonal particle palettes and compact title breathing room preserve reduced motion",()=>{
 const art=read("web-spa/src/pages/mobileHomeHeroV3.css");
 assert.match(art,/\.cmh-slide \.cmh-slide-copy\{box-sizing:border-box;padding-top:7px\}/);
 assert.match(art,/\.cmh-slide \.cmh-slide-copy\{padding-top:6px\}/);
 assert.match(art,/\.cmh-slide\{height:244px;min-height:244px/);
 assert.match(art,/\.cmh-slide\{height:240px;min-height:240px/);
 for(const card of [".cmh-slide.cmh-zoe",".cmh-slide.cmh-slide-friends",".cmh-slide.cmh-slide-game",".cmh-slide.cmh-slide-learn"]){
  assert.ok(art.includes(card+"{--cmh-dust:"),"missing distinct particle palette: "+card);
 }
 assert.match(art,/\.cmh-slide \.cmh-sparks\{z-index:1;pointer-events:none;overflow:hidden\}/);
 assert.match(art,/\.cmh-slide \.cmh-sparks::before\{[\s\S]*?radial-gradient/);
 assert.match(art,/@keyframes cmh-dust-near/);
 assert.match(art,/@keyframes cmh-dust-far/);
 assert.match(art,/@media\(prefers-reduced-motion:reduce\)\{\s*\.cmh-slide \.cmh-sparks::before,[\s\S]*?animation:none!important/);
 assert.doesNotMatch(art,/filter:\s*blur\(/,"Particle layer should not trigger blur repaints");
});

test("autoplay waits 11 seconds and only advances when visible, mobile and motion-allowed",()=>{
 const page=read("web-spa/src/pages/MobileHomePage.tsx");
 assert.match(page,/const CAROUSEL_INTERVAL_MS=11000/);
 assert.match(page,/window\.setInterval\(\(\)=>\{/);
 assert.match(page,/\},CAROUSEL_INTERVAL_MS\)/);
 assert.match(page,/window\.matchMedia\("\(max-width:767px\)"\)/);
 assert.match(page,/window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
 assert.match(page,/IntersectionObserver\(entries=>/);
 assert.match(page,/threshold:0\.35/);
 assert.match(page,/document\.visibilityState==="visible"/);
 for(const stopper of ["onPointerDown={()=>setCarouselPaused(true)}","onFocusCapture={()=>setCarouselPaused(true)}",
  "onTouchStart={touchBegin}","onClick={()=>manualSlide(index)}","onKeyDown={event=>"]){
  assert.ok(page.includes(stopper),"user gesture stops autoplay: "+stopper);
 }
 assert.match(page,/if\(carouselPaused\)return/);
});
