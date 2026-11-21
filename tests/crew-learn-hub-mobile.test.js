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


test("Three-minute speaking entry constrains SVG and reserves readable copy width",()=>{
 const source=read("web-spa/src/pages/LearnHubExtras.tsx");
 const css=read("web-spa/src/pages/crewSections.css");
 assert.match(source,/<span className="crew-section-card-icon crew-learn-three-minute-icon"><Icon name="chat"\/><\/span>/);
 assert.match(source,/className="crew-learn-three-minute-copy"/);
 assert.match(source,/className="crew-learn-three-minute-arrow"/);
 assert.match(css,/\.crew-learn-three-minute\{display:grid;grid-template-columns:40px minmax\(0,1fr\) 20px/);
 assert.match(css,/\.crew-learn-three-minute-icon svg\{[^}]*width:22px;height:22px;stroke:currentColor;[^}]*fill:none/);
 assert.doesNotMatch(source,/<Link className="crew-learn-three-minute"[^>]*>\s*<Icon/);
});

test("Learn exposes the teacher gallery above the daily learning action",()=>{
 const hub=read("web-spa/src/pages/CrewSectionPage.tsx");
 const picker=read("web-spa/src/teacher/CurrentTeacherCard.tsx");
 const tutor=read("web-spa/src/teacher/TutorPage.tsx");
 const focus=read("web-spa/src/teacher/LearningFocusCard.tsx");
 const extras=read("web-spa/src/pages/LearnHubExtras.tsx");
 const css=read("web-spa/src/pages/crewSections.css");
 assert.ok(hub.indexOf("<LearningFocusCard/>")<hub.indexOf("<LearningSnapshot compact/>"));
 assert.ok(hub.indexOf("<LearningSnapshot compact/>")<hub.indexOf("<CurrentTeacherCard/>"));
 assert.ok(picker.includes('to="/teacher/roles?mode=teacher" state={{openTeacherPicker:true}}'));
 assert.ok(picker.includes('className="crew-learn-teacher-start" to="/teacher/live"'));
 assert.ok(picker.includes('t("tutor.start",{name:teacher.name})'));
 assert.ok(picker.indexOf('className="crew-learn-teacher-start"')<picker.indexOf('className="crew-learn-teacher-pick"'));
 assert.match(picker,/crew-learn-teacher-identity/);
 assert.ok(css.includes('.crew-learn-teacher-start{display:flex'));
 assert.ok(css.includes('min-height:48px'));
 assert.ok(css.includes('.crew-learn-teacher-actions{display:grid;grid-template-columns:minmax(0,1fr)'));
 assert.match(picker,/crew-learn-teacher-portrait/);
 assert.match(picker,/crew-learn-teacher-action/);
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
 assert.match(hub,/<LearningFocusCard\/>\s*<LearningSnapshot compact\/>\s*<CurrentTeacherCard\/>/);
 assert.match(snapshot,/COURSE_LESSONS\.length/);
 assert.match(snapshot,/dueDeckItems\(\)/);
 assert.match(snapshot,/to="\/teacher\/phrasebook"/);
 assert.match(snapshot,/minHeight:100/);
 assert.match(snapshot,/minHeight:44/);
});
