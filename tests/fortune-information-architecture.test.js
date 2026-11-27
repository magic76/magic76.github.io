const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("Fortune landing prioritizes three approved illustrated methods before history and daily reflection",()=>{
 const src=read("web-spa/src/fortune/HomePage.tsx");
 const first=src.indexOf('className="section fortune-journey-create"');
 const history=src.indexOf('className="section fortune-journey-history"');
 const daily=src.indexOf('className="fortune-journey-daily"');
 assert.ok(first>=0&&first<history&&history<daily);
 assert.doesNotMatch(src,/fortune-journey-primary|landing\.continue/);
 for(const mode of ["bazi","tarot","vedic"]){
  assert.match(src,new RegExp('fortune-'+mode+'-cover\\.webp'));
  assert.match(src,new RegExp('to="/fortune/reading\\?mode='+mode+'"'));
 }
 assert.equal((src.match(/<FortuneDailyCard\/>/g)||[]).length,1);
 assert.match(src,/readFortuneHistoryPreviews\(30\)/);
 assert.match(src,/fortune-history-row/);
 assert.match(src,/<details className="fortune-journey-daily">/);
 assert.match(src,/<summary>\{t\("landing.todayReflection"\)\}<\/summary>/);
});

test("mobile reading choices keep uniform visible artwork and accessible daily disclosure",()=>{
 const css=read("web-spa/src/fortune/unifiedHome.css");
 assert.match(css,/fortune-journey-daily>summary\{min-height:52px/);
 assert.match(css,/fortune-journey-create \.fortune-home-grid\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/fortune-mode-cover-image\[hidden\]\{display:none\}/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test("PR integration retains the approved AI-first reading instead of resurrecting three competing tabs",()=>{
 const src=read("web-spa/src/fortune/ReadingPage.tsx");
 const overview=read("web-spa/src/fortune/ReadingOverview.tsx");
 assert.ok(src.indexOf("<FortuneSummaryCard")<src.indexOf('className="fortune-ai-entry"'));
 assert.ok(src.indexOf('className="fortune-ai-entry"')<src.indexOf("<FortuneReadingOverview"));
 assert.equal((src.match(/className="fortune-ai-entry-button"/g)||[]).length,1);
 assert.equal((src.match(/\{teacherAction\}/g)||[]).length,1);
 assert.doesNotMatch(src,/role="tablist"|fortune-teacher-invite|fortune-teacher-followup/);
 assert.match(overview,/fortune-reading-data/);
 for(const expression of ["CrewFortuneBaZi.calculate","CrewFortuneTarot.calculate","CrewFortuneVedicEnrich.enrich","FortuneShareDialog","FortuneFollowUp"]){
  assert.ok(src.includes(expression),expression);
 }
});

test("ordinary Fortune hub keeps creation prominent, daily deep links start with the daily card, and profile editing is secondary",()=>{
 const home=read("web-spa/src/fortune/HomePage.tsx");
 const profiles=read("web-spa/src/fortune/DailyProfileManager.tsx");
 assert.ok(home.indexOf("{dailyIntent?dailySection:null}")<home.indexOf('className="section fortune-journey-create"'));
 assert.ok(home.indexOf('className="section fortune-journey-create"')<home.indexOf("{!dailyIntent?dailySection:null}"));
 assert.ok(home.indexOf('className="section fortune-journey-history"')<home.indexOf("<DailyProfileManager/>"));
 assert.match(profiles,/<details ref=\{detailsRef\} className="section daily-profile-manager" id="daily-profiles">/);
 assert.match(profiles,/location.hash==="#daily-profiles"/);
});
