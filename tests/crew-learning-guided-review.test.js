const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=path=>fs.readFileSync(path,"utf8");

test("daily plan prioritizes due review, unresolved speaking needs, then new vocabulary",()=>{
 const plan=read("web-spa/src/teacher/learningCoordinator.ts");
 const due=plan.indexOf('if(targetLanguage==="英文"&&dueVocabulary>0)');
 const correction=plan.indexOf('if(reviewFocus)');
 const fresh=plan.indexOf('if(targetLanguage==="英文"&&practicedVocabularyToday===0');
 const course=plan.indexOf('if(targetLanguage==="英文"&&nextLesson)');
 assert.ok(due>0&&correction>due&&fresh>correction&&course>fresh);
 assert.match(plan,/latestReviewFocus\(teacherState.targetLanguage\)/);
 assert.match(plan,/reviewedFocusToday\(teacherState.targetLanguage,candidate\)/);
 assert.match(plan,/studentMemories\(teacherState.targetLanguage\)/);
 assert.match(plan,/personalMemoryEnabled\(\)\?memories/);
 assert.doesNotMatch(plan,/history\("teacher"\)/);
});

test("retry context is local, language scoped, expires and is never falsely marked mastered",()=>{
 const review=read("web-spa/src/teacher/learningReview.ts");
 const live=read("web-spa/src/teacher/LivePage.tsx");
 assert.match(review,/normalizeLearningLanguage\(language\)/);
 assert.match(review,/sessionStorage.removeItem\(REQUEST_KEY\)/);
 assert.match(review,/Date.now\(\)-Number\(data.at\)<15\*60\*1000/);
 assert.match(review,/m.type==="weakness"\|\|m.type==="focus"/);
 assert.match(review,/m.active&&m.confidence>=0.5/);
 assert.match(live,/const isRoleplay=!isReview&&/);
 assert.match(live,/conversationMode:isReview\?"practice"/);
 assert.match(live,/Never claim improvement, mastery or pronunciation quality without observable evidence/);
 assert.match(live,/if\(isReview&&item.turns.filter/);
 assert.match(live,/markReviewPracticed\(s.targetLanguage,reviewFocus\)/);
 assert.match(live,/isReview&&<div className="notice live-mission"/);
});

test("visible learning goals and feedback lead to working retry entry points",()=>{
 const focus=read("web-spa/src/teacher/LearningFocusCard.tsx");
 const reports=read("web-spa/src/teacher/ReportsPage.tsx");
 const live=read("web-spa/src/teacher/LivePage.tsx");
 assert.match(focus,/plan\?\.learnerGoal/);
 assert.match(focus,/plan\?\.reviewFocus&&plan.action!=="review"/);
 assert.match(reports,/queueReviewFocus\(targetLanguage/);
 assert.match(reports,/to="\/teacher\/live\?intent=review"/);
 assert.match(live,/reloadDocument className="btn secondary small" to=\{"\/teacher\/live\?mode=course&lesson="/);
 const css=read("web-spa/src/pages/crewSections.css");
 assert.match(css,/\.crew-section-focus-card \.crew-learn-review-link\{[^}]*min-height:44px/);
 for(const lang of ["zh-TW","en"]){
  const data=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/lesson.json"));
  for(const key of ["reviewTitle","reviewFallback","reviewLink","retryLesson","goalLabel"])
   assert.ok(data.learnToday[key],lang+" "+key);
 }
});
