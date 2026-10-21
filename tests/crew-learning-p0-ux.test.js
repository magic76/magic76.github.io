const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const read=path=>fs.readFileSync(path,"utf8");

test("the vocabulary learner sees the question before answer feedback and controls the next question",()=>{
 const src=read("web-spa/src/teacher/VocabularyPage.tsx");
 const answer=src.indexOf("function answer(");
 const next=src.indexOf("function nextQuestion(");
 const jsx=src.indexOf("return <div",next);
 assert.ok(answer>=0&&next>answer&&jsx>next);
 assert.match(src,/if\(revealed\|\|showCompletion\)return/);
 assert.match(src,/recordPlacement\(word,correct\)/);
 assert.match(src,/incrementTodayVocabulary\(\)/);
 assert.match(src,/recordVocab\(word\[0\],correct\)/);
 assert.match(src,/onClick=\{nextQuestion\}/);
 assert.match(src,/\{revealed&&<div className="crew-learning-answer-feedback"/);
 assert.match(src,/\{word\[2\]&&<p>\{word\[2\]\}<\/p>\}/);
 assert.match(src,/setShowCompletion\(true\)/);
 assert.match(src,/setContinueAfterGoal\(true\)/);
 assert.match(src,/disabled=\{revealed\}/);
 assert.doesNotMatch(src,/window\.setTimeout\(\(\)=>\{setWord/);
});

test("course track has featured next lesson and accessible expandable units instead of a long default list",()=>{
 const src=read("web-spa/src/teacher/CoursePage.tsx");
 assert.match(src,/nextUnlockedLesson\(track\.id\)/);
 assert.match(src,/role="group" aria-label=\{t\("course.selectTrack"\)\}/);
 assert.match(src,/aria-pressed=\{item\.id===track\.id\}/);
 assert.match(src,/<details className="crew-course-unit"/);
 assert.match(src,/open=\{expandedUnits\.includes\(unit\.id\)\}/);
 assert.match(src,/onToggle=\{event=>/);
 assert.match(src,/requested\?\.trackId===track\.id\?requested\.unitId/);
 assert.match(src,/const unlocked=lessonUnlocked\(lesson\.id\)/);
 assert.match(src,/return unlocked\s*\?<Link key=\{lesson\.id\}/);
 assert.match(src,/aria-disabled="true"/);
 assert.match(src,/localStorage\.setItem\(TRACK_KEY,id\)/);
 const css=read("web-spa/src/teacher/learningFlow.css");
 assert.match(css,/\.crew-course-track-tabs\{display:flex;[^}]*overflow-x:auto/);
 assert.match(css,/\.crew-learning-question \.quiz-choice\{[^}]*min-height:62px/);
});

test("course grading is visible before returning and saved before unlocking the next lesson",()=>{
 const live=read("web-spa/src/teacher/LivePage.tsx");
 const method=live.slice(live.indexOf(" const endAndReturn=async()=>{"),live.indexOf(" const sessionActive="));
 const stop=method.indexOf("await live.stop(true)");
 const assess=method.indexOf("evaluateCourseSession(course,done.turns,done.report)");
 const save=method.indexOf("saveLessonProgress(course.id,result.stars,result.score)");
 const finished=method.indexOf("setCourseResult({done:result.done");
 assert.ok(stop>=0&&assess>stop&&save>assess&&finished>save);
 assert.match(method,/setEndingCourse\(true\)/);
 assert.match(method,/setEvaluating\(true\)/);
 assert.match(method,/Promise\.race\(\[/);
 assert.match(method,/if\(course\)setEvaluating\(false\)/);
 assert.match(method,/if\(course&&!evaluating&&\(courseResult\|\|evaluationError\)\)navigate/);
 assert.match(live,/nextUnlockedLesson\(course\.trackId\)/);
 assert.match(live,/role="alert"/);
 const progress=read("web-spa/src/teacher/courseProgress.ts");
 assert.match(progress,/Math\.max\(old\.stars,stars\)/);
 assert.match(progress,/old\.completed\|\|stars>=1/);
});

test("the new learning UI is localized in both existing languages",()=>{
 for(const language of ["en","zh-TW"]){
  const dict=JSON.parse(read("web-spa/src/i18n/locales/"+language+"/teacher.json"));
  for(const key of ["pickMeaning","nextQuestion","goalComplete","goalCompleteDesc","keepGoing"])
   assert.ok(dict.vocabulary[key],language+" vocabulary."+key);
  for(const key of ["nextLesson","continue","trackComplete","trackCompleteDesc","selectTrack","courseMap","progress"])
   assert.ok(dict.course[key],language+" course."+key);
 }
});
