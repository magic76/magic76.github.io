const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const read=path=>fs.readFileSync(path,"utf8");

test("the vocabulary learner auto-advances correct answers but lets learners review incorrect ones",()=>{
 const src=read("web-spa/src/teacher/VocabularyPage.tsx");
 const answer=src.indexOf("function answer(");
 const next=src.indexOf("function nextQuestion(");
 const jsx=src.indexOf("return <div",next);
 assert.ok(answer>=0&&next>answer&&jsx>next);
 assert.match(src,/if\(answerLockRef\.current\|\|revealed\|\|showCompletion\)return/);
 assert.match(src,/answerLockRef\.current=true/);
 assert.match(src,/answerLockRef\.current=false/);
 assert.match(src,/recordPlacement\(word,correct,language\)/);
 assert.match(src,/incrementTodayVocabulary\(language\)/);
 assert.match(src,/recordVocab\(word\[0\],correct,language\)/);
 assert.match(src,/onClick=\{nextQuestion\}/);
 assert.match(src,/if\(correct\)\{/);
 assert.match(src,/autoNextTimeoutRef\.current=setTimeout/);
 assert.match(src,/advanceToQuestion\(nextPlacement\.score,nextDone\)/);
 assert.match(src,/revealed&&picked!==word\[1\]&&<button/);
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
 assert.match(css,/\.crew-learning-question \.quiz-list\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.crew-learning-question \.quiz-choice\{[^}]*min-height:96px/);
});

test("course grading is visible before returning and saved before unlocking the next lesson",()=>{
 const live=read("web-spa/src/teacher/LivePage.tsx")+"\n"+read("web-spa/src/teacher/TeacherLiveResults.tsx");
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

test("all Today entry points use the shared priority and do not invent duration",()=>{
 const focus=read("web-spa/src/teacher/LearningFocusCard.tsx");
 const next=read("web-spa/src/teacher/ContinueLearningCard.tsx");
 const planner=read("web-spa/src/teacher/learningCoordinator.ts");
 const course=read("web-spa/src/teacher/CoursePage.tsx");
 const hub=read("web-spa/src/pages/CrewSectionPage.tsx");
 assert.match(planner,/export function todayStep/);
 assert.match(planner,/learningMaterialAvailable\("vocabulary",targetLanguage\)&&dueVocabulary>0/);
 assert.match(planner,/if\(reviewFocus\)/);
 assert.match(planner,/learningMaterialAvailable\("vocabulary",targetLanguage\)&&practicedVocabularyToday===0&&unseenVocabulary>0/);
 assert.match(planner,/targetLanguage==="英文"&&nextLesson/);
 assert.match(planner,/lessonsForTrack\(nextLesson\.trackId\)\.findIndex/);
 assert.match(planner,/\/teacher\/course\?briefing=/);
 assert.match(planner,/to:"\/teacher\/live"/);
 assert.match(focus,/buildDailyLearningPlan\(\)/);
 assert.match(next,/buildDailyLearningPlan\(\)/);
 assert.match(course,/bestNextLesson\(\)\?\.trackId/);
 assert.match(focus,/className="crew-action-primary"/);
 assert.match(focus,/plan\?<Link className="crew-action-primary" to=\{plan\.to\}/);
 assert.match(focus,/<button className="crew-action-primary"[^>]*disabled/);
 assert.doesNotMatch(focus,/to=\{plan\?\.to\|\|"\/teacher\/live"\}/);
 assert.match(focus,/<TodayLearningCard compact\/>/);
 assert.match(hub,/<LearningFocusCard\/>/);
 assert.doesNotMatch(focus,/suggestedTime|Suggested: 5 min|\/teacher\/roles\?mode=teacher"\s*:\s*"/);
});
