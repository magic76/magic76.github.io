const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const read=file=>readFileSync(path.resolve(__dirname,"..",file),"utf8");

test("mobile homepage is a separate responsive presentation; desktop keeps its portal",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const css=read("web-spa/src/pages/mobileHome.css");
 assert.match(home,/className="crew-home crew-home-legacy"/);
 assert.match(home,/<HomePortal shortsFeed=\{shortsFeed\}\/>/);
 assert.match(home,/<HomeLiveBubble\/>/);
 assert.match(home,/<MobileHomePage shortsFeed=\{shortsFeed\} shortsStatus=\{shortsStatus\}\/>/);
 assert.match(css,/\.crew-mobile-home\{display:none\}/);
 assert.match(css,/@media\(max-width:767px\)/);
 assert.match(css,/\.crew-home-legacy\{display:none!important\}/);
 assert.match(css,/\.cmh-app-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
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

test("six one-tap app destinations, one Shorts strip and one daily recommendation",()=>{
 const page=read("web-spa/src/pages/MobileHomePage.tsx");
 const css=read("web-spa/src/pages/mobileHome.css");
 for(const route of ["/teacher/roles?mode=friends","/learn","/games","/story","/fortune","/teacher/shorts"]){
  assert.ok(page.includes('to:"'+route+'"'),"missing direct app "+route);
 }
 assert.match(page,/className="cmh-app-grid"\>\{APPS\.map/);
 assert.match(page,/HomeShortsPreview maxPosts=\{8\} sharedFeed=\{shortsFeed\}/);
 assert.match(page,/className="cmh-featured"/);
 assert.match(page,/className="cmh-seo"/);
 assert.match(page,/<GuideHub\/>/);
 assert.match(page,/className="cmh-seo"[\s\S]*?to="\/learn"/);
 assert.match(css,/\.cmh-shorts \.crew-home-short-card/);
});

test("mobile four-tab navigation leaves desktop five-tab side rail intact",()=>{
 const nav=read("web-spa/src/components/AppChrome.tsx");
 const css=read("web-spa/src/components/mobileNavigation.css");
 const gate=read("web-spa/src/onboarding/OnboardingGate.tsx");
 assert.match(nav,/crew-nav-desktop/);
 assert.match(nav,/crew-nav-mobile/);
 assert.match(nav,/mobileActive=active==="learn"\?"explore":active/);
 for(const section of ["home","chat","explore","learn","me"])assert.ok(nav.includes('id:"'+section+'"'));
 assert.match(nav,/to:"\/friend\/live\?id=zoe&from=nav&chat=text"/);
 assert.match(css,/repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/\.app-header \.crew-feature-menu-trigger\{display:none!important\}/);
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
