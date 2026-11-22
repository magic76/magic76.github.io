const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const read=file=>fs.readFileSync(path.resolve(__dirname,"..",file),"utf8");

test("section card arrows are white against their green circular background",()=>{
 const section=read("web-spa/src/pages/crewSections.css");
 const arrow=read("web-spa/src/components/Arrow.css");
 const component=read("web-spa/src/pages/CrewSectionPage.tsx");
 assert.match(section,/\.crew-section-arrow\{[^}]*color:#fff;/);
 assert.match(arrow,/\.crew-arrow\{[^}]*background:#285a48;[^}]*color:#fff;/);
 assert.match(component,/<Arrow className="crew-section-arrow"\/>/);
});

test("shared green arrows keep a 32px centered white glyph and matching card slots",()=>{
 const arrow=read("web-spa/src/components/Arrow.css");
 const home=read("web-spa/src/pages/home.css");
 const mobile=read("web-spa/src/pages/mobileHome.css");
 const explore=read("web-spa/src/pages/crewExplore.css");
 const world=read("web-spa/src/pages/homeWorld.css");
 assert.match(arrow,/\.crew-arrow\{display:inline-flex;align-items:center;justify-content:center;[^}]*width:32px;height:32px;[^}]*background:#285a48;color:#fff;/);
 assert.match(arrow,/\.crew-arrow svg\{display:block;flex:none\}/);
 assert.match(home,/grid-template-columns:66px minmax\(0,1fr\) 32px/);
 assert.match(home,/grid-template-columns:56px minmax\(0,1fr\) 32px/);
 assert.match(mobile,/grid-template-columns:48px minmax\(0,1fr\) 32px/);
 assert.match(explore,/\.crew-explore-tile \.crew-arrow\.crew-explore-arrow\{width:32px;height:32px;bottom:14px;right:12px;background:#285a48;color:#fff/);
 assert.doesNotMatch(explore,/width:19px;height:19px/);
 assert.match(world,/\.crew-home-world \.crew-home-recent-arrow\{color:#fff\}/);
 assert.doesNotMatch(world,/\.crew-home-world \.crew-home-recent-arrow\{color:#d9c1ff\}/);
});

test("internal destination cards use a right arrow while external links may point up-right",()=>{
 const cards=read("web-spa/src/pages/CrewSectionPage.tsx");
 assert.equal((cards.match(/<Arrow direction="right" className="crew-explore-arrow"\/>/g)||[]).length,7);
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

test("specialized desktop and game card styles cannot tint the shared arrow",()=>{
 const desktop=read("web-spa/src/pages/desktopHome.css");
 const play=read("web-spa/src/games/crewPlay.css");
 assert.match(desktop,/\.kdh-feature \.crew-arrow\.kdh-feature-arrow\{[^}]*color:#fff;background:#285a48/);
 assert.match(play,/\.crew-play-question-arrow\{flex:none;color:#fff\}/);
 assert.doesNotMatch(play,/\.crew-play-question-arrow\{[^}]*color:#8b86b8/);
});
