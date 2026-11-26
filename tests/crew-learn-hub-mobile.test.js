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
 assert.match(source,/section==="chat"&&<section className="crew-section-discover"/);
 assert.doesNotMatch(source,/section==="learn"&&<Link className="crew-section-card" to="\/teacher\/board"/);
});

test("Learning language changes the same teacher preference used by live",()=>{
 const source=read("web-spa/src/pages/CrewSectionPage.tsx");
 assert.match(source,/useTeacherStore\(s=>s\.targetLanguage\)/);
 assert.match(source,/useTeacherStore\(s=>s\.setTargetLanguage\)/);
 assert.match(source,/TARGET_LANGUAGES\.map/);
 assert.match(source,/onChange=\{event=>setTargetLanguage\(event\.target\.value\)\}/);
 assert.match(read("web-spa/src/teacher/LearningFocusCard.tsx"),/learningMaterialAvailable\("vocabulary",targetLanguage\)/);
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


test("Three-minute speaking is a compact secondary link with four secondary destinations and bounded icons",()=>{
 const source=read("web-spa/src/pages/LearnHubExtras.tsx");
 const css=read("web-spa/src/pages/crewSections.css");
 const nav=source.match(/<nav className="crew-learn-secondary-links"[\s\S]*?<\/nav>/);
 assert.ok(nav);
 for(const [destination,icon] of [['to={speakingPath}','mic'],['to="/teacher/reading-library"','book'],['to="/teacher/reports"','history'],['to="/settings#settings-learning"','settings']]){
  assert.ok(nav[0].includes(destination+'><Icon name="'+icon+'"/><span>'));
 }
 assert.equal((nav[0].match(/<Link /g)||[]).length,4);
 assert.doesNotMatch(nav[0],/\/teacher\/course/);
 assert.doesNotMatch(source,/className="crew-learn-three-minute"/);
 assert.match(css,/\.crew-learn-secondary-links a\{display:inline-flex;align-items:center;gap:6px;min-height:44px/);
 assert.match(css,/\.crew-learn-secondary-links a svg\{display:block;width:18px;height:18px;flex:0 0 18px;stroke:currentColor;fill:none/);
 const hub=read("web-spa/src/pages/CrewSectionPage.tsx");
 for(const [route,icon] of [['vocabulary','cards'],['phrasebook','chat'],['pronunciation','mic'],['textbook','book'],['board','scene']]){
  assert.ok(hub.includes('to:"/teacher/'+route+'",icon:"'+icon+'"'));
 }
 assert.match(hub,/<p className="meta crew-learn-native-help" role="note">\{shownHint\}<\/p>/);
});


test("Learn prioritizes teacher speaking and keeps the daily dashboard collapsed",()=>{
 const hub=read("web-spa/src/pages/CrewSectionPage.tsx");
 const picker=read("web-spa/src/teacher/CurrentTeacherCard.tsx");
 const tutor=read("web-spa/src/teacher/TutorPage.tsx");
 const focus=read("web-spa/src/teacher/LearningFocusCard.tsx");
 const extras=read("web-spa/src/pages/LearnHubExtras.tsx");
 const css=read("web-spa/src/pages/crewSections.css");
 assert.ok(hub.indexOf("<CurrentTeacherCard/>")<hub.indexOf("<LearnHubExtras tools="));
 assert.ok(hub.indexOf("<LearnHubExtras tools=")<hub.indexOf("<LearningFocusCard/>"));
 assert.ok(hub.indexOf("<LearningFocusCard/>")<hub.indexOf("<LearningSnapshot compact/>"));
 assert.match(hub,/<details className="crew-learn-progress-details">/);
 assert.match(hub,/<summary>\{tTeacher\("my\.kicker"\)\}<\/summary>/);
 assert.ok(picker.includes('to="/teacher/roles?mode=teacher" state={{openTeacherPicker:true}}'));
 assert.ok(picker.includes('className="crew-learn-teacher-start" to="/teacher/live"'));
 assert.ok(picker.includes('t("tutor.start",{name:teacher.name})'));
 assert.match(picker,/<div className="crew-learn-teacher-identity">[\s\S]*?teacher\.name[\s\S]*?crew-learn-teacher-pick[\s\S]*?<\/div>\s*<Link className="crew-learn-teacher-start"/);
 assert.match(picker,/crew-learn-teacher-identity/);
 assert.ok(css.includes('.crew-learn-teacher-start{display:flex'));
 assert.ok(css.includes('min-height:48px'));
 assert.doesNotMatch(picker,/crew-learn-teacher-actions/);
 assert.match(picker,/crew-learn-teacher-portrait/);
 assert.doesNotMatch(picker,/className="kicker"/);
 assert.match(tutor,/openTeacherPicker/);
 assert.doesNotMatch(focus,/TeacherAvatar/);
 assert.match(focus,/TodayLearningCard compact/);
 assert.ok(extras.includes('to="/teacher/course"'));
 assert.ok(!extras.includes('to="/teacher"'));
 assert.match(css,/crew-learn-teacher-pick:focus-visible/);
 assert.match(css,/min-height:44px/);
});


test("Issue 811 reuses the existing plan and shows compact lesson/review counts",()=>{
 const hub=read("web-spa/src/pages/CrewSectionPage.tsx");
 const snapshot=read("web-spa/src/teacher/LearningSnapshot.tsx");
 assert.match(hub,/<details className="crew-learn-progress-details">[\s\S]*?<LearningFocusCard\/>\s*<LearningSnapshot compact\/>[\s\S]*?<\/details>/);
 assert.match(snapshot,/COURSE_LESSONS\.length/);
 assert.match(snapshot,/dueDeckItems\(deck\)/);
 assert.match(snapshot,/to="\/teacher\/phrasebook"/);
 assert.match(snapshot,/minHeight:100/);
 assert.match(snapshot,/minHeight:44/);
});


test("Vertical Learn tool cards override horizontal tracks and omit decorative arrows",()=>{
 const source=read("web-spa/src/pages/LearnHubExtras.tsx");
 const css=read("web-spa/src/pages/crewSections.css");
 assert.match(css,/\.crew-section-card>\.crew-section-card-copy\{grid-column:2;grid-row:1\}/);
 assert.match(css,/\.crew-section-learn \.crew-learn-tool>\.crew-section-card-icon\{grid-column:1;grid-row:1\}/);
 assert.match(css,/\.crew-section-learn \.crew-learn-tool>\.crew-section-card-copy\{grid-column:1;grid-row:2\}/);
 assert.doesNotMatch(css,/\.crew-section-learn \.crew-learn-tool\{padding-bottom:34px\}/);
 assert.doesNotMatch(css,/crew-learn-tool-arrow/);
 const card=source.match(/tools\.map\(tool=><Link\b[\s\S]*?<\/Link>/);
 assert.ok(card);
 assert.match(card[0],/crew-section-card-icon[\s\S]*crew-section-card-copy/);
 assert.doesNotMatch(source,/<Arrow\b|crew-learn-tool-arrow/);
 assert.doesNotMatch(source.slice(0,source.indexOf("export function")),/<Arrow\b/);
});

test("Scenario lessons have one independent full-width entry before the practice grid",()=>{
 const source=read("web-spa/src/pages/LearnHubExtras.tsx");
 const css=read("web-spa/src/pages/crewSections.css");
 assert.match(source,/<Link className="crew-section-card crew-learn-scenario" to="\/teacher\/course">[\s\S]*?learn\.courseDesc[\s\S]*?<\/Link>/);
 assert.equal((source.match(/to="\/teacher\/course"/g)||[]).length,1);
 assert.ok(source.indexOf("crew-learn-scenario")<source.indexOf("crew-learn-tool-grid"));
 assert.match(css,/\.crew-section-learn \.crew-learn-scenario\{grid-template-columns:40px minmax\(0,1fr\)/);
});
