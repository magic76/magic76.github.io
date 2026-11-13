const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
const mobile=read("web-spa/src/pages/MobileHomePage.tsx");
const desktop=read("web-spa/src/pages/HomePortal.tsx");
const home=read("web-spa/src/pages/HomePage.tsx");
const rail=read("web-spa/src/pages/HomeModeRail.tsx");
const css=read("web-spa/src/pages/homeLayout2.css");

test("Desktop Layout 2 stays fixed while mobile restores the four-slide carousel",()=>{
 assert.match(mobile,/const SLIDES=\["zoe","friends","game","learn"\]/);
 assert.match(mobile,/const CAROUSEL_INTERVAL_MS=11000/);
 assert.match(mobile,/className="cmh-carousel"/);
 assert.match(mobile,/className="cmh-carousel-dots"/);
 assert.doesNotMatch(mobile,/cmh-layout2-hero|cmh-layout2-other|cmh-layout2-primary/);
 assert.equal((desktop.match(/className="crew-portal-cta"/g)||[]).length,1);
 assert.match(mobile,/const ZOE_TEXT="\/friend\/live\?id=zoe&from=home&chat=text"/);
 assert.match(desktop,/const HOME_ZOE=ZOE\+"&from=home&chat=text"/);
 assert.match(desktop,/const destination=exhausted\?"\/account#settings-gemini"/);
 assert.match(desktop,/const target=destination/);
 assert.match(desktop,/onPointerDown=\{warmFriendStart\}/);
 assert.match(desktop,/window.setTimeout\(\(\)=>navigate\(target\),120\)/);
});

test("Desktop keeps its keyboard-accessible mode rail; mobile no longer renders one",()=>{
 assert.doesNotMatch(mobile,/import \{HomeModeRail|<HomeModeRail/);
 assert.match(desktop,/import \{HomeModeRail,type HomeMode\} from "\.\/HomeModeRail"/);
 assert.match(desktop,/<HomeModeRail prefix="crew-portal-mode"/);
 assert.match(rail,/role="tablist" aria-orientation="vertical"/);
 assert.match(rail,/role="tab"/);assert.match(rail,/role="tabpanel"/);
 for(const mode of ["chat","learn","fortune","play"])assert.match(rail,new RegExp('id:"'+mode+'"'));
 for(const attr of ["aria-selected","aria-controls","aria-labelledby","tabIndex"])assert.ok(rail.includes(attr));
 for(const key of ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Home","End"])assert.ok(rail.includes('"'+key+'"'));
 assert.match(rail,/buttons\.current\[next\]\?\.focus\(\)/);
 assert.doesNotMatch(rail,/setInterval|setTimeout/);
});

test("Desktop modes and deep links stay intact; mobile slide actions use original destinations",()=>{
 assert.match(desktop,/<h1>\{canResume\?t\("layout2.resumeTitle",\{name:friendName\}\):t\("layout2.title"/);
 assert.match(rail,/const title=mode==="chat"/);
 assert.match(rail,/const description=mode==="chat"/);
 for(const route of ["/teacher/live?lesson=daily_u1_l1","/fortune/reading?mode=tarot","/games/1a2b"])
  assert.ok(rail.includes('to:"'+route+'"'));
 assert.match(desktop,/play:"\/games\/"\+gameId/);
 assert.match(desktop,/const link=readHomeDeepLink\(window.location.search\)/);
 for(const name of ["shortsPhotoQuestions","shortsChatUrl","HOME_FRIEND_NAMES","shorts_hook_click","shorts_chat_click"])
  assert.ok(desktop.includes(name),name);
 for(const path of ["/friend/live?id=noah&from=home&chat=text","/teacher/roles?mode=friends","/games","/learn","/teacher/roles?mode=teacher"])
  assert.ok(mobile.includes(path),path);
 assert.match(mobile,/onTouchStart=\{touchBegin\} onTouchEnd=\{touchFinish\}/);
 assert.match(mobile,/onKeyDown=\{event=>/);
});

test("Mobile quota follows carousel, hides for BYOK and preserves voice secondary action",()=>{
 const a=mobile.indexOf('className="cmh-zoe-primary"');
 const dots=mobile.indexOf('className="cmh-carousel-dots"');
 const q=mobile.indexOf('className="cmh-allowance-slot"');
 assert.ok(a>=0&&dots>a&&q>dots);
 assert.match(mobile,/!hasKey&&<div className="cmh-allowance-slot">/);
 assert.match(desktop,/!hasKey&&<div className="crew-portal-status-slot">/);
 assert.match(mobile,/trial.seconds\/60/);
 assert.match(desktop,/trial.seconds\/60/);
 for(const key of ["full","textOnly","voiceUsed"]){
  assert.ok(mobile.includes("world.freeAllowance."+key));
  assert.ok(desktop.includes("world.freeAllowance."+key));
 }
 assert.match(mobile,/className="cmh-zoe-secondary"/);
 assert.match(mobile,/className="cmh-zoe-primary"/);
 assert.match(mobile,/friendResume\?t\("layout2.resumeAction"\)/);
 assert.match(mobile,/文字聊天/);
 assert.match(desktop,/className="crew-portal-layout2-voice"/);
});

test("Last friend resumes in the first mobile slide and desktop without removing the old continue card",()=>{
 assert.match(mobile,/const resumeFriend=resume\?CREW_FRIENDS.find/);
 assert.match(mobile,/const friendResume=resumeFriend\?resume:null/);
 assert.match(mobile,/resumeFriend\?\.avatar\|\|zoePhoto/);
 assert.match(mobile,/textDestination=resumeId\?"\/friend\/live\?id="\+encodeURIComponent\(resumeId\)/);
 assert.doesNotMatch(mobile,/className="cmh-other-resume"/);
 assert.match(mobile,/PREVIEW_HIDDEN_KEY/);
 assert.match(mobile,/setPreviewHidden\(next\)/);
 assert.match(mobile,/className="cmh-preview-eye"/);
 assert.match(desktop,/readLatestFriendResume\(\)/);
 assert.match(desktop,/const canResume=Boolean\(resumeId&&!selectedPost/);
 assert.match(desktop,/\(!deepLink.friend\|\|deepLink.friend===resumeId\)/);
 assert.match(desktop,/PREVIEW_HIDDEN_KEY/);
 assert.match(home,/className="crew-home-continue"/);
});

test("Daily thought replaces topics, unchanged eight cards, Shorts and SEO remain",()=>{
 assert.match(mobile,/<DailyTopicCards variant="mobile"\/>/);
 assert.match(home,/<DailyTopicCards variant="desktop"\/>/);
 assert.equal((mobile.match(/\{id:"/g)||[]).length,8);
 assert.match(mobile,/className="cmh-app-grid">\{APPS.map/);
 assert.match(mobile,/HomeShortsPreview maxPosts=\{8\} sharedFeed=\{shortsFeed\}/);
 assert.match(home,/<HomeShortsPreview sharedFeed=\{shortsFeed\} sharedStatus=\{shortsStatus\}\/>/);
 assert.match(mobile,/className="cmh-seo"/);assert.match(mobile,/<GuideHub\/>/);
 assert.match(home,/className="crew-home-search-summary"/);
 assert.match(home,/<HomeLiveBubble\/>/);
 assert.match(read("web-spa/src/pages/mobileHome.css"),/\.cmh-app-grid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});

test("Desktop heading and CTA have a fixed layout across every rail mode",()=>{
 assert.match(rail,/export type HomeMode="chat"\|"learn"\|"fortune"\|"play"/);
 assert.doesNotMatch(rail,/type HomeMode=PortalMode/);
 assert.match(desktop,/<div className="crew-portal-discovery-slot">\{mode==="chat"&&!selectedPost&&<HomeDiscoveryLine/);
 assert.match(css,/\.crew-home-legacy \.crew-portal-content\.crew-portal-layout2\{[^}]*align-items:start/);
 assert.match(css,/\.crew-home-legacy \.crew-portal-layout2 \.crew-portal-discovery-slot\{[^}]*height:74px;min-height:74px/);
 assert.match(css,/\.crew-portal-layout2-rail \.home-mode-rail-panel p\{[^}]*-webkit-line-clamp:unset;overflow:visible/);
});

test("Accessible compact styling, reduced motion and translations across 11 locales",()=>{
 assert.match(css,/min-height:44px/);
 assert.doesNotMatch(css,/cmh-layout2-hero|cmh-layout2-other|cmh-layout2-primary/);
 assert.match(read("web-spa/src/pages/mobileHomeHeroV3.css"),/@media\(max-width:380px\)/);
 assert.match(css,/@media\(min-width:768px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(mobile,/threshold:0\.35/);
 assert.match(mobile,/document.visibilityState==="visible"/);
 assert.match(mobile,/prefers-reduced-motion: reduce/);
 for(const [,size] of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))assert.ok(Number(size)>=12,'under 12px font '+size);
 const keys=["title","action","description","voice","more","resumeTitle","resumeAction","previewLabel","chatTitle","chatDescription","previewHidden","showPreview","hidePreview"];
 for(const lang of locales){
  const data=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/home.json`));
  assert.deepEqual(Object.keys(data.layout2).sort(),keys.slice().sort(),lang+': keys');
  for(const k of keys)assert.ok(typeof data.layout2[k]==="string"&&data.layout2[k].trim(),lang+':'+k);
  for(const k of ["title","action","resumeTitle"])assert.match(data.layout2[k],/\{\{name\}\}/,lang+':'+k);
 }
 for(const f of ["HomePage.tsx","HomePortal.tsx","MobileHomePage.tsx","HomeModeRail.tsx"])
  assert.ok(Buffer.byteLength(read('web-spa/src/pages/'+f))<26000,f);
});
