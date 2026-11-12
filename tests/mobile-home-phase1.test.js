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
 assert.match(css,/\.cmh-app-grid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});

test("mobile hero uses real device-local completed friend resume and never invents Zoe",()=>{
 const page=read("web-spa/src/pages/MobileHomePage.tsx");
 const resume=read("web-spa/src/live/sessionTranscript.ts");
 assert.match(page,/readLatestFriendResume\(\)/);
 assert.match(page,/resume\?\.friendId==="zoe"\?resume:null/);
 assert.match(page,/resume&&resume.friendId!=="zoe"\?resume:null/);
 assert.match(page,/otherFriend\.name/);
 assert.match(page,/\.slice\(0,84\)/);
 assert.match(page,/PREVIEW_HIDDEN_KEY/);
 assert.match(page,/setPreviewHidden\(next\)/);
 assert.match(resume,/messages\.at\(-1\)\?\.role!=="assistant"/);
 assert.match(page,/const ZOE_TEXT="\/friend\/live\?id=zoe&from=home&chat=text"/);
 assert.match(page,/const ZOE_VOICE="\/friend\/live\?id=zoe&from=home&entry=bubble"/);
});

test("eight one-tap app destinations, one Shorts strip and one daily recommendation",()=>{
 const page=read("web-spa/src/pages/MobileHomePage.tsx"),css=read("web-spa/src/pages/mobileHome.css");
 for(const route of ["/teacher/roles?mode=friends","/learn","/games","/story","/fortune","/teacher/shorts","/timeline","/teacher/course"])
  assert.ok(page.includes('to:"'+route+'"'),"missing shortcut "+route);
 assert.match(page,/className="cmh-app-grid">\{APPS\.map/);
 assert.match(page,/HomeShortsPreview maxPosts=\{8\} sharedFeed=\{shortsFeed\}/);
 assert.match(page,/className="cmh-seo"/);assert.match(page,/<GuideHub\/>/);
 assert.match(page,/const gameId=deepLink\.tab==="play"&&deepLink\.game\?deepLink\.game:featured/);
 assert.match(css,/\.cmh-shorts \.crew-home-short-card/);

});

test("the phone hero is four real one-tap slides with a stationary Zoe first slot",()=>{
 const page=read("web-spa/src/pages/MobileHomePage.tsx"),rail=read("web-spa/src/pages/HomeModeRail.tsx"),css=read("web-spa/src/pages/homeLayout2.css");
 assert.doesNotMatch(page,/SLIDES=|CAROUSEL_INTERVAL_MS|setInterval|cmh-carousel/);
 assert.match(page,/useState<HomeMode>\("chat"\)/);
 assert.match(page,/<HomeModeRail prefix="cmh-mode" mode=\{mode\}/);
 assert.match(rail,/aria-orientation="vertical"/);
 for(const mode of ["chat","learn","fortune","play"])assert.ok(rail.includes('id:"'+mode+'"'));
 for(const key of ["ArrowUp","ArrowDown","Home","End"])assert.ok(rail.includes('"'+key+'"'));
 assert.match(css,/min-height:44px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);

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
 assert.match(app,/<GlobalNav active=\{active\} mobileImmersive=\{pathname==="\/magic"\}\/>/);
 assert.doesNotMatch(app,/!pathname\.startsWith\("\/circle"\)/);
 assert.match(model,/pathname==="\/story\/me"\|\|pathname==="\/fortune\/history"/);
 assert.match(model,/if\(root==="teacher"\)/);
 assert.match(model,/return "learn";/);
 assert.match(model,/if\(pathname\.startsWith\("\/teacher\/me"\)\|\|pathname\.startsWith\("\/teacher\/memory"\)\)return "me"/);
 assert.doesNotMatch(model,/pathname\.startsWith\("\/teacher\/reports"\)\|\|pathname\.startsWith\("\/teacher\/phrasebook"\)/);
 assert.match(gate,/pathname==="\/"&&window\.matchMedia\("\(max-width:767px\)"\)\.matches\)return/);
 assert.match(gate,/media\.addEventListener\("change",dismiss\)/);
});

test("screenshot acceptance covers first/return at 360/390 and unchanged desktop 1440",()=>{
 const script=read("scripts/screenshot-mobile-home.mjs");
 for(const width of [360,390,1440])assert.match(script,new RegExp("width:"+width+"\\b"));
 assert.match(script,/\["first","return"\]/);
 assert.match(script,/crew_friend_text_resume_v1/);
 assert.match(script,/page\.screenshot/);
 assert.match(script,/if\(info\.onboardingOpen\)throw/);
});
