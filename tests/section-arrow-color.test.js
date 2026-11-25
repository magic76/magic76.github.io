const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const read=file=>fs.readFileSync(path.resolve(__dirname,"..",file),"utf8");

test("section card arrows inherit the foreground without a circular background",()=>{
 const section=read("web-spa/src/pages/crewSections.css");
 const arrow=read("web-spa/src/components/Arrow.css");
 const component=read("web-spa/src/pages/CrewSectionPage.tsx");
 assert.match(section,/\.crew-section-arrow\{[^}]*color:inherit;/);
 assert.match(arrow,/\.crew-arrow\{[^}]*background:transparent;[^}]*color:inherit;/);
 assert.doesNotMatch(arrow,/border-radius:|box-shadow:|background:#/);
 assert.match(component,/<Arrow className="crew-section-arrow"\/>/);
});

test("shared plain arrows keep a 20px centered glyph and stable card slots",()=>{
 const arrow=read("web-spa/src/components/Arrow.css");
 const home=read("web-spa/src/pages/home.css");
 const mobile=read("web-spa/src/pages/mobileHome.css");
 const explore=read("web-spa/src/pages/crewExplore.css");
 const world=read("web-spa/src/pages/homeWorld.css");
 assert.match(arrow,/\.crew-arrow\{display:inline-flex;align-items:center;justify-content:center;[^}]*width:20px;height:20px;[^}]*background:transparent;color:inherit;/);
 assert.match(arrow,/\.crew-arrow svg\{display:block;flex:none\}/);
 assert.match(home,/grid-template-columns:66px minmax\(0,1fr\) 32px/);
 assert.match(home,/grid-template-columns:56px minmax\(0,1fr\) 32px/);
 assert.match(mobile,/grid-template-columns:48px minmax\(0,1fr\) 32px/);
 assert.match(explore,/\.crew-explore-tile \.crew-arrow\.crew-explore-arrow\{width:20px;height:20px;bottom:14px;right:12px;color:inherit/);
 assert.doesNotMatch(explore,/\.crew-explore-arrow\{[^}]*background:|\.crew-arrow\.crew-explore-arrow\{[^}]*background:/);
 assert.match(world,/\.crew-home-world \.crew-home-recent-arrow\{color:inherit\}/);
 assert.match(world,/\.crew-home-world \.crew-home-shorts-controls button\{[^}]*border-radius:50%/);
 assert.match(world,/\.crew-home-world \.crew-home-shorts-controls button\{width:44px;height:44px;min-height:44px\}/);
});

test("internal destination cards use a right arrow while external links may point up-right",()=>{
 const cards=read("web-spa/src/pages/CrewSectionPage.tsx");
 assert.equal((cards.match(/<Arrow direction="right" className="crew-explore-arrow"\/>/g)||[]).length,5);
 for(const file of [
  "web-spa/src/games/CrewPlayHubPage.tsx",
  "web-spa/src/pages/DesktopHomePage.tsx",
  "web-spa/src/pages/HomePortal.tsx",
  "web-spa/src/pages/HomePage.tsx",
  "web-spa/src/teacher/ShortsPage.tsx",
  "web-spa/src/teacher/ShortsProfilePage.tsx",
  "web-spa/src/timeline/TimelinePage.tsx",
  "web-spa/src/teacher/PracticePage.tsx",
  "web-spa/src/guides/GuideHub.tsx"
 ])assert.doesNotMatch(read(file),/<Arrow direction="up-right"/,file);
 assert.match(read("web-spa/src/briefing/BriefingPage.tsx"),/target="_blank" rel="noopener noreferrer">RSS 訂閱 <Arrow direction="up-right"\/>/);
});

test("specialized desktop and game card styles inherit color without a filled arrow",()=>{
 const desktop=read("web-spa/src/pages/desktopHome.css");
 const play=read("web-spa/src/games/crewPlay.css");
 assert.match(desktop,/\.kdh-feature \.crew-arrow\.kdh-feature-arrow\{[^}]*width:20px;height:20px;color:inherit/);
 assert.match(play,/\.crew-play-question-arrow\{flex:none;color:inherit\}/);
 assert.match(play,/\.crew-play-game-card \.crew-play-open\{[^}]*width:20px;height:20px;[^}]*color:inherit/);
});

test("settings chevrons, disabled arrows and accessible parent controls remain distinct",()=>{
 const source=read("web-spa/src/components/Arrow.tsx");
 const css=read("web-spa/src/components/Arrow.css");
 const settings=read("web-spa/src/pages/SettingsPage.tsx");
 const shorts=read("web-spa/src/teacher/HomeShortsPreview.tsx");
 assert.match(source,/size=20/);
 assert.match(source,/aria-hidden="true"/);
 assert.match(source,/focusable="false"/);
 assert.equal((settings.match(/<Arrow direction="chevron-right"\/>/g)||[]).length,6);
 assert.match(css,/\.crew-arrow\.is-disabled,[^}]*opacity:\.5/);
 assert.match(css,/a:focus-visible \.crew-arrow,button:focus-visible \.crew-arrow/);
 assert.match(shorts,/aria-label=\{en\?"Previous Shorts"/);
 assert.match(shorts,/aria-label=\{en\?"Next Shorts"/);
});
