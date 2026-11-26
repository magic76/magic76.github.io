const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const read=file=>readFileSync(path.resolve(__dirname,"..",file),"utf8");

test("mobile homepage is a separate responsive presentation; desktop keeps its portal",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const css=read("web-spa/src/pages/mobileHome.css");
 assert.match(home,/className="crew-home-legacy"/);
 assert.match(home,/className="crew-home"/);
 assert.match(home,/<HomePortal shortsFeed=\{shortsFeed\}\/>/);
 assert.match(home,/<HomeLiveBubble\/>/);
 assert.match(home,/<MobileHomePage shortsFeed=\{shortsFeed\} shortsStatus=\{shortsStatus\}\/>/);
 assert.match(css,/\.crew-mobile-home\{display:none\}/);
 assert.match(css,/@media\(max-width:767px\)/);
 assert.match(css,/\.crew-home-legacy\{display:none!important\}/);
 assert.match(css,/\.cmh-app-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});

test("mobile hero follows last active friend identity without storing any transcript",()=>{
 const page=read("web-spa/src/pages/MobileHomePage.tsx");
 const resume=read("web-spa/src/live/sessionTranscript.ts");
 assert.match(page,/readLatestFriendActivity\(\)/);
 assert.match(page,/activity\?CREW_FRIENDS.find\(friend=>friend.id===activity.friendId\)/);
 assert.match(page,/resumeFriend\?activity:null/);
 assert.match(page,/resumeFriend\?\.avatar\|\|zoePhoto/);
 assert.match(page,/friendResume\?t\("layout2.resumeTitle",\{name:resumeFriend!/);
 assert.doesNotMatch(page,/cmh-resume-preview-row|PREVIEW_HIDDEN_KEY|setPreviewHidden/);
 assert.doesNotMatch(page,/cmh-other-resume/);
 assert.match(resume,/mode:entry.mode,resume:null/);
  assert.doesNotMatch(resume,/export function saveFriendResume/);
 assert.match(page,/const ZOE_VOICE="\/friend\/live\?id=zoe&from=home&entry=bubble"/);
});

test("six one-tap app destinations, one Shorts strip and one daily recommendation",()=>{
 const page=read("web-spa/src/pages/MobileHomePage.tsx");
 const css=read("web-spa/src/pages/mobileHome.css");
 for(const route of ["/teacher/roles?mode=friends","/learn","/games","/fortune","/teacher/shorts","/teacher/course"]){
  assert.ok(page.includes('to:"'+route+'"'),"missing direct app "+route);
 }
 assert.match(page,/className="cmh-app-grid"\>\{APPS\.map/);
 assert.doesNotMatch(page,/\{id:"(?:story|timeline)",/);
 assert.ok(page.includes('id:"scenarios",zh:"情境課程",en:"Scenarios",icon:"scene",to:"/teacher/course",event:"learn"'));
 const shortcuts=page.slice(page.indexOf("const APPS:"),page.indexOf("/** Mobile-only"));
 assert.equal((shortcuts.match(/\{id:"/g)||[]).length,6,"exactly six shortcuts");
 assert.ok(!shortcuts.includes('to:"/magic"'),"Magic must not be added");
 assert.match(page,/HomeShortsPreview maxPosts=\{6\} sharedFeed=\{shortsFeed\}/);
 assert.match(page,/className="cmh-slide cmh-slide-game"/);
 assert.doesNotMatch(page,/className="cmh-featured"/);
 assert.match(page,/className="cmh-seo"/);
 assert.match(page,/<GuideHub\/>/);
 assert.match(page,/className="cmh-seo"><GuideHub\/>/);
 assert.match(css,/\.cmh-shorts \.crew-home-short-card/);
});

test("the phone hero is four real one-tap slides with the teacher in the first slot",()=>{
 const page=read("web-spa/src/pages/MobileHomePage.tsx");
 const css=read("web-spa/src/pages/mobileHome.css");
 assert.match(page,/SLIDES=\["learn","zoe","friends","game"\]/);
 assert.match(page,/CAROUSEL_INTERVAL_MS=11000/);
 assert.ok(page.indexOf('<section className="cmh-slide cmh-slide-learn"')<page.indexOf('<section className={"cmh-slide cmh-zoe"'));
 assert.match(page,/className="cmh-slide cmh-slide-learn" data-active=\{activeSlide===0\} aria-hidden=\{activeSlide!==0\}/);
 assert.match(page,/<Link to="\/teacher\/live" tabIndex=\{activeSlide===0\?0:-1\}/);
 assert.match(page,/cmh-carousel-track/);
 for(const className of ["cmh-slide cmh-zoe","cmh-slide cmh-slide-friends","cmh-slide cmh-slide-game","cmh-slide cmh-slide-learn"]){
  assert.ok(page.includes(className),"missing carousel slide "+className);
 }
 assert.match(page,/className="cmh-carousel-dots"/);
 assert.match(page,/onTouchStart=\{touchBegin\} onTouchEnd=\{touchFinish\}/);
 assert.match(page,/setCarouselPaused\(true\)/);
 assert.match(page,/document.visibilityState==="visible"/);
 assert.match(page,/prefers-reduced-motion: reduce/);
 assert.match(page,/Math.abs\(dx\)>45/);
 assert.match(page,/onClickCapture=\{event=>/);
 assert.match(page,/tabIndex=\{activeSlide===0\?0:-1\}/);
 for(const route of ["/friend/live?id=noah&from=home&chat=text","/teacher/roles?mode=friends","/games","/learn","/teacher/roles?mode=teacher"]){
  assert.ok(page.includes(route),"slide action missing: "+route);
 }
 assert.match(css,/\.cmh-carousel-track\{display:flex/);
 assert.match(css,/@keyframes cmh-glow-drift/);
 assert.match(css,/@keyframes cmh-spark-float/);
 assert.match(css,/@keyframes cmh-avatar-breathe/);
 assert.match(css,/@keyframes cmh-content-enter/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/\.cmh-featured\{/);
});

test("every ordinary mobile route uses one shared five-tab dock and desktop retains five",()=>{
 const nav=read("web-spa/src/components/AppChrome.tsx");
 const css=read("web-spa/src/components/mobileNavigation.css");
 const app=read("web-spa/src/App.tsx");
 const model=read("web-spa/src/pages/crewNavigation.ts");
 const gate=read("web-spa/src/onboarding/OnboardingGate.tsx");
 assert.match(nav,/export function MobileBottomNav/);
 assert.match(nav,/export function GlobalNav/);
 assert.match(nav,/<MobileBottomNav active=\{active\} hiddenOnMobile=\{mobileImmersive\}\/>/);
 assert.match(nav,/const NAV_SECTIONS=\[/);
 assert.match(nav,/data-active=\{active\}/);
 assert.match(nav,/NAV_SECTIONS\.map/);
 for(const section of ["home","chat","explore","learn","me"])assert.ok(nav.includes('id:"'+section+'"'));
 for(const path of ["/","/chat","/explore","/learn","/me"])assert.ok(nav.includes('to:"'+path+'"'));
 assert.doesNotMatch(nav,/to:"\/friend\/live\?id=zoe&from=nav/);
 assert.match(nav,/crew-mobile-dock-item/);
 assert.match(nav,/aria-current=\{active===item.id\?"page":undefined\}/);
 assert.match(css,/\.global-nav\{display:none!important\}/);
 assert.match(css,/\.crew-mobile-dock-inner\{/);
 assert.match(css,/repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/\.crew-mobile-dock-item\.active/);
 assert.match(css,/\.app-header \.crew-feature-menu-trigger\{display:none!important\}/);
 assert.match(css,/\.crew-mobile-dock--immersive\{display:none!important\}/);
 assert.match(app,/<GlobalNav active=\{active\} mobileImmersive=\{false\}\/>/);
 assert.doesNotMatch(app,/!pathname\.startsWith\("\/circle"\)/);
 assert.match(model,/pathname==="\/story\/me"\|\|pathname==="\/fortune\/history"/);
 assert.match(model,/if\(root==="teacher"\)/);
 assert.match(model,/return "learn";/);
 assert.match(model,/if\(pathname\.startsWith\("\/teacher\/me"\)\|\|pathname\.startsWith\("\/teacher\/memory"\)\)return "me"/);
 assert.doesNotMatch(model,/pathname\.startsWith\("\/teacher\/reports"\)\|\|pathname\.startsWith\("\/teacher\/phrasebook"\)/);
 assert.match(gate,/if\(pathname!=="\/"\)return/);
 assert.match(gate,/if\(pathname!=="\/settings"\)return/);
 assert.doesNotMatch(gate,/window\.matchMedia|media\.addEventListener\("change",dismiss\)/);
});

test("screenshot acceptance covers first/return at 360/390 and unchanged desktop 1440",()=>{
 const script=read("scripts/screenshot-mobile-home.mjs");
 for(const width of [360,390,1440])assert.match(script,new RegExp("width:"+width+"\\b"));
 assert.match(script,/\["first","return"\]/);
 assert.match(script,/crew_friend_text_resume_v1/);
 assert.match(script,/page\.screenshot/);
 assert.match(script,/if\(info\.onboardingOpen\)throw/);
});
