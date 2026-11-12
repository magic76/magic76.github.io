const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
const mobile=read("web-spa/src/pages/MobileHomePage.tsx");
const desktop=read("web-spa/src/pages/HomePortal.tsx");
const home=read("web-spa/src/pages/HomePage.tsx");
const rail=read("web-spa/src/pages/HomeModeRail.tsx");
const css=read("web-spa/src/pages/homeLayout2.css");

test("Layout 2 uses one stable Zoe invitation and no mobile auto-rotation",()=>{
 for(const old of ["SLIDES","CAROUSEL_INTERVAL_MS","setInterval","cmh-carousel","cmh-carousel-dots","onTouchStart={touchBegin}"])
  assert.doesNotMatch(mobile,new RegExp(old));
 assert.equal((mobile.match(/className="cmh-layout2-primary"/g)||[]).length,1);
 assert.equal((desktop.match(/className="crew-portal-cta"/g)||[]).length,1);
 assert.match(mobile,/const ZOE_TEXT="\/friend\/live\?id=zoe&from=home&chat=text"/);
 assert.match(desktop,/const HOME_ZOE=ZOE\+"&from=home&chat=text"/);
 assert.match(mobile,/const destination=exhausted\?"\/account#settings-gemini"/);
 assert.match(desktop,/const destination=exhausted\?"\/account#settings-gemini"/);
 assert.match(desktop,/const target=destination/);
 assert.match(desktop,/onPointerDown=\{warmFriendStart\}/);
 assert.match(desktop,/window.setTimeout\(\(\)=>navigate\(target\),120\)/);
});

test("Both layouts import one rail with four stable, accessible tab choices",()=>{
 assert.match(mobile,/import \{HomeModeRail,type HomeMode\} from "\.\/HomeModeRail"/);
 assert.match(desktop,/import \{HomeModeRail,type HomeMode\} from "\.\/HomeModeRail"/);
 assert.match(mobile,/<HomeModeRail prefix="cmh-mode"/);
 assert.match(desktop,/<HomeModeRail prefix="crew-portal-mode"/);
 assert.match(rail,/role="tablist" aria-orientation="vertical"/);
 assert.match(rail,/role="tab"/);assert.match(rail,/role="tabpanel"/);
 for(const mode of ["chat","learn","fortune","play"])assert.match(rail,new RegExp('id:"'+mode+'"'));
 for(const attr of ["aria-selected","aria-controls","aria-labelledby","tabIndex"])assert.ok(rail.includes(attr));
 for(const key of ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Home","End"])assert.ok(rail.includes('"'+key+'"'));
 assert.match(rail,/buttons\.current\[next\]\?\.focus\(\)/);
 assert.doesNotMatch(rail,/setInterval|setTimeout/);
});

test("Mode selection changes only secondary panel; labels and actual routes remain available",()=>{
 assert.match(desktop,/<h1>\{canResume\?t\("layout2.resumeTitle"\):t\("layout2.title"/);
 assert.match(mobile,/<h1>\{headline\}<\/h1>/);
 assert.match(rail,/const title=mode==="chat"/);
 assert.match(rail,/const description=mode==="chat"/);
 for(const route of ["/teacher/live?lesson=daily_u1_l1","/fortune/reading?mode=tarot","/games/1a2b"])
  assert.ok(rail.includes('to:"'+route+'"'));
 assert.match(mobile,/play:"\/games\/"\+gameId/);
 assert.match(desktop,/play:"\/games\/"\+gameId/);
 assert.match(mobile,/const link=readHomeDeepLink\(window.location.search\)/);
 assert.match(desktop,/const link=readHomeDeepLink\(window.location.search\)/);
 for(const name of ["shortsPhotoQuestions","shortsChatUrl","HOME_FRIEND_NAMES","shorts_hook_click","shorts_chat_click"]){
  assert.ok(mobile.includes(name)&&desktop.includes(name),name);
 }
});

test("Guest quota follows primary action, BYOK has no slot, voice stays secondary",()=>{
 const m=mobile.indexOf('className="cmh-layout2-primary"');
 const q=mobile.indexOf('className="cmh-allowance-slot"');
 const r=mobile.indexOf('<HomeModeRail prefix=');
 assert.ok(m>=0&&q>m&&r>q);
 assert.match(mobile,/!hasKey&&<div className="cmh-allowance-slot">/);
 assert.match(desktop,/!hasKey&&<div className="crew-portal-status-slot">/);
 assert.match(mobile,/trial.seconds\/60/);
 assert.match(desktop,/trial.seconds\/60/);
 for(const key of ["full","textOnly","voiceUsed"]){
  assert.ok(mobile.includes("world.freeAllowance."+key));
  assert.ok(desktop.includes("world.freeAllowance."+key));
 }
 assert.match(mobile,/className="cmh-layout2-voice"/);
 assert.match(desktop,/className="crew-portal-layout2-voice"/);
});

test("Resuming Zoe and other friends retains local privacy and separate continue cards",()=>{
 assert.match(mobile,/resume\?\.friendId==="zoe"\?resume:null/);
 assert.match(mobile,/otherResume=resume&&resume.friendId!=="zoe"/);
 assert.match(mobile,/\.slice\(0,84\)/);
 assert.match(mobile,/PREVIEW_HIDDEN_KEY/);
 assert.match(mobile,/setPreviewHidden\(next\)/);
 assert.match(mobile,/className="cmh-other-resume"/);
 assert.match(desktop,/readLatestFriendResume\(\)/);
 assert.match(desktop,/const canResume=Boolean\(resume\?\.friendId==="zoe"/);
 assert.match(desktop,/PREVIEW_HIDDEN_KEY/);
 assert.match(home,/className="crew-home-continue"/);
});

test("Existing daily topics, unchanged eight cards, Shorts and SEO remain",()=>{
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
 assert.match(css,/@media\(max-width:375px\)/);
 assert.match(css,/@media\(min-width:768px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 for(const [,size] of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))assert.ok(Number(size)>=12,'under 12px font '+size);
 const keys=["title","action","description","voice","more","resumeTitle","resumeAction","chatTitle","chatDescription","previewHidden","showPreview","hidePreview"];
 for(const lang of locales){
  const data=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/home.json`));
  assert.deepEqual(Object.keys(data.layout2).sort(),keys.slice().sort(),lang+': keys');
  for(const k of keys)assert.ok(typeof data.layout2[k]==="string"&&data.layout2[k].trim(),lang+':'+k);
  for(const k of ["title","action"])assert.match(data.layout2[k],/\{\{name\}\}/,lang+':'+k);
 }
 for(const f of ["HomePage.tsx","HomePortal.tsx","MobileHomePage.tsx","HomeModeRail.tsx"])
  assert.ok(Buffer.byteLength(read('web-spa/src/pages/'+f))<26000,f);
});
