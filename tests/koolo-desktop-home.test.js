const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {resolve}=require("node:path");
const read=path=>readFileSync(resolve(path),"utf8");

test("Koolo desktop home mirrors the mobile product entry points without changing the mobile component",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const desktop=read("web-spa/src/pages/DesktopHomePage.tsx");
 const css=read("web-spa/src/pages/desktopHome.css");
 const mobile=read("web-spa/src/pages/MobileHomePage.tsx");
 assert.match(home,/<DesktopHomePage recents=\{recents\}/);
 assert.match(home,/className="crew-home-legacy" aria-hidden="true" inert/);
 assert.match(css,/\.koolo-desktop-home\{display:none\}/);
 assert.match(css,/@media\(min-width:768px\)/);
 assert.match(css,/\.crew-home-legacy\{display:none!important\}/);
 assert.match(mobile,/const SLIDES=\["zoe","friends","game","learn"\]/);
 for(const route of ["/chat","/learn","/teacher/roles?mode=friends","/games","/story","/fortune","/teacher/shorts","/timeline","/teacher/course"]){
  assert.ok(desktop.includes(route),"missing existing destination "+route);
 }
 assert.match(desktop,/className="kdh-stage"/);
 assert.match(desktop,/className="kdh-zoe"/);
 assert.match(desktop,/className="kdh-feature-column"/);
 assert.match(desktop,/className="kdh-shortcuts"/);
 assert.match(desktop,/HomeShortsPreview maxPosts=\{10\} sharedFeed=\{shortsFeed\} sharedStatus=\{shortsStatus\}/);
 assert.match(mobile,/HomeShortsPreview maxPosts=\{6\} sharedFeed=\{shortsFeed\}/);
 assert.match(desktop,/className="kdh-moments"/);
 assert.match(desktop,/<DailyTopicCards variant="desktop"\/>/);
 assert.match(desktop,/<GuideHub\/>/);
 assert.match(desktop,/readLatestFriendActivity\(\)/);
 assert.doesNotMatch(desktop,/PREVIEW_HIDDEN_KEY|formatResumePreview|activity\?\.resume/);
 assert.doesNotMatch(desktop,/HomeChatChoices/);
 assert.match(desktop,/className="kdh-primary"/);
 assert.match(desktop,/to=\{voiceTo\}/);
 const apps=desktop.slice(desktop.indexOf("const SHORTCUTS:"),desktop.indexOf("const FEATURE_FRIENDS="));
 assert.equal((apps.match(/\{id:"/g)||[]).length,8);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});

test("Desktop top navigation reuses the five existing routes and leaves phone dock rules intact",()=>{
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 const css=read("web-spa/src/components/desktopNavigation.css");
 const phone=read("web-spa/src/components/mobileNavigation.css");
 assert.match(chrome,/import "\.\/desktopNavigation\.css"/);
 for(const route of ["/","/chat","/explore","/learn","/me"])assert.ok(chrome.includes('to:"'+route+'"'));
 assert.match(css,/@media\(min-width:768px\)/);
 assert.match(css,/@media\(min-width:1100px\)/);
 assert.match(css,/\.global-nav,body:has\(\.crew-home-legacy\) \.global-nav/);
 assert.match(css,/top:0;left:50%!important/);
 assert.match(phone,/@media\(max-width:767px\)/);
 assert.match(phone,/\.global-nav\{display:none!important\}/);
});

test("Desktop Shorts strip scrolls within its grid item without stretching the viewport",()=>{
 const css=read("web-spa/src/pages/desktopHome.css");
 const shorts=read("web-spa/src/teacher/homeShorts.css");
 const desktop=css.slice(css.indexOf("@media(min-width:768px){"),css.indexOf("@media(min-width:768px) and (max-width:1099px)"));
 assert.match(desktop,/\.koolo-desktop-home\{[^}]*grid-template-columns:minmax\(0,1fr\)[^}]*width:100%;max-width:100%/);
 assert.match(desktop,/\.kdh-moments\{min-width:0;max-width:100%\}/);
 assert.match(desktop,/\.kdh-moments \.crew-home-shorts-grid,\.kdh-moments \.crew-home-shorts-loading\{max-width:100%\}/);
 assert.match(shorts,/\.crew-home-shorts-grid,\.crew-home-shorts-loading\{[^}]*overflow-x:auto/);
});
