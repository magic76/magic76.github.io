const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("Learn tab has exactly one primary recommendation and compact progress",()=>{
 const source=read("web-spa/src/pages/CrewSectionPage.tsx");
 assert.match(source,/<LearningFocusCard\/>/);
 assert.match(read("web-spa/src/teacher/LearningFocusCard.tsx"),/<TodayLearningCard compact\/>/);
 assert.match(source,/crew-learn-tool-grid/);
 assert.match(source,/section!=="learn"&&<section className="crew-section-discover"/);
 assert.doesNotMatch(source,/section==="learn"&&<Link className="crew-section-card" to="\/teacher\/board"/);
});

test("Learning language changes the same teacher preference used by live",()=>{
 const source=read("web-spa/src/pages/CrewSectionPage.tsx");
 assert.match(source,/useTeacherStore\(s=>s\.targetLanguage\)/);
 assert.match(source,/useTeacherStore\(s=>s\.setTargetLanguage\)/);
 assert.match(source,/TARGET_LANGUAGES\.map/);
 assert.match(source,/onChange=\{event=>setTargetLanguage\(event\.target\.value\)\}/);
 assert.match(read("web-spa/src/teacher/LearningFocusCard.tsx"),/targetLanguage==="英文"/);
});

test("Daily progress stays accessible in compact mode without duplicating large stats",()=>{
 const source=read("web-spa/src/teacher/TodayLearningCard.tsx");
 assert.match(source,/if\(compact\)return <section/);
 assert.match(source,/crew-today-progress-track/);
 assert.match(source,/role="progressbar"/);
 assert.match(source,/crew-today-compact-more/);
 assert.match(source,/getDailyGoalMinutes\(\)/);
 assert.match(source,/setDailyGoalMinutes\(next\)/);
 const css=read("web-spa/src/pages/crewSections.css");
 assert.match(css,/\.crew-section-learn \.crew-learn-tool-grid\{grid-template-columns:repeat\(4/);
 assert.match(css,/@media\(max-width:700px\)\{\.crew-section-learn \.crew-learn-tool-grid\{grid-template-columns:repeat\(2/);
});

test("Existing Learn center deep link redirects to the canonical dashboard",()=>{
 const app=read("web-spa/src/App.tsx");
 assert.match(app,/path="learn" element=\{<Navigate to="\/learn" replace\/>\}/);
});
