const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
function load(file,names){
 const src=stripTypeScriptTypes(fs.readFileSync(root+"/"+file,"utf8"),{mode:"strip"}).replace(/\bexport\s+(?=(?:const|function)\b)/g,"");
 const ctx={};
 vm.runInNewContext(src+"\nObject.assign(target,{"+names.join(",")+"});",{target:ctx});
 return ctx;
}
const lessons=load("web-spa/src/teacher/boardLessons.ts",["LESSONS","findLesson","evaluateSpeakingTask","lessonProgress","lessonPrompt","lessonCategory","lessonLabel","LESSON_CATEGORIES"]);
const protocol=load("web-spa/src/teacher/boardProtocol.ts",["validateBoardPatch","applyBoardPatch","BOARD_TOOLS"]);
test("guided lesson catalog covers five categories with coherent session goals",()=>{
 assert.equal(lessons.LESSONS.length,21);
 assert.equal(new Set(lessons.LESSONS.map(l=>l.id)).size,21);
 assert.equal(new Set(lessons.LESSONS.flatMap(l=>l.cards.map(c=>c.id))).size,84);
 for(const category of lessons.LESSON_CATEGORIES)assert.ok(lessons.LESSONS.some(l=>lessons.lessonCategory(l)===category.id));
 for(const id of ["hotel","interview","grammar","ed-sounds","coffee","meeting"])assert.ok(lessons.findLesson(id));
 for(const lesson of lessons.LESSONS){
  assert.match(lesson.duration,/3.?5/);
  assert.ok(lesson.goal.length>15);
  assert.ok(lesson.cards.length>=4);
  assert.equal(lesson.cards.at(-1).type,"speaking");
  assert.equal(lesson.cards.filter(c=>c.type==="quiz").length,1);
  assert.equal(new Set(lesson.cards.map(c=>c.id)).size,lesson.cards.length);
  assert.match(lessons.lessonPrompt(lesson,lesson.cards.length-1),/Wait|wait/);
  for(const card of lesson.cards)assert.ok(protocol.validateBoardPatch({action:"upsert",cards:[card]}));
  const speaking=lesson.cards.at(-1);
  assert.equal(lessons.evaluateSpeakingTask(speaking,speaking.speaking.example).met,true,lesson.id);
  assert.equal(lessons.evaluateSpeakingTask(speaking,"No.").met,false,lesson.id);
  const quiz=lesson.cards.find(c=>c.type==="quiz");
  assert.ok(quiz.questions.length>0);
  assert.ok(quiz.questions.every(q=>q.options[q.answerIndex]&&new Set(q.options).size===q.options.length));
 }
});
test("speaking goals require independent target forms and enough distinct sentences",()=>{
 const lesson=lessons.findLesson("grammar");
 const speaking=lesson.cards.at(-1);
 assert.equal(lessons.evaluateSpeakingTask(speaking,"I have been busy. I had been traveling before I got home.").met,true);
 assert.equal(lessons.evaluateSpeakingTask(speaking,"I have been busy for years.").met,false);
 const wrong=lessons.evaluateSpeakingTask(speaking,"I had been busy. I had been traveling.");
 assert.equal(wrong.met,false);
 assert.equal(wrong.matched,1);
 assert.equal(lessons.evaluateSpeakingTask(speaking,""),null);
 assert.equal(lessons.evaluateSpeakingTask(lesson.cards[0],"Some sentence."),null);
});
test("lesson completion requires both a quiz pass and an oral practice goal",()=>{
 const lesson=lessons.findLesson("hotel");
 assert.equal(lessons.lessonProgress(lesson,{},null).complete,false);
 const assessment=lessons.evaluateSpeakingTask(lesson.cards.at(-1),"Hello, I have a reservation under Chen.");
 assert.equal(assessment.met,true);
 assert.equal(lessons.lessonProgress(lesson,{},assessment).complete,false);
 const p=lessons.lessonProgress(lesson,{"hotel-quiz:0":0},assessment);
 assert.equal(p.quiz,true);assert.equal(p.speaking,true);assert.equal(p.complete,true);
});
test("teacher board can access confirmed speech before completed model turn and reset review for retry",()=>{
 const page=fs.readFileSync(root+"/web-spa/src/teacher/TeacherBoardPage.tsx","utf8");
 const live=fs.readFileSync(root+"/web-spa/src/live/useLiveSession.ts","utf8");
 assert.match(page,/onConfirmedTranscript:turn=>processConfirmedSpeech\(turn.input\|\|""\)/);
 assert.match(live,/configRef\.current\.onConfirmedTranscript\?\.\(turn\)/);
 assert.match(page,/function returnToQuestion\(\)/);
 assert.match(page,/delete next\[key\]/);
 assert.match(page,/reviewReturnRef\.current=target/);
 assert.match(page,/function startLesson\(id:LessonId\)/);
 assert.match(page,/function goLessonStep\(index:number\)/);
 assert.match(page,/function requestHint\(\)/);
 assert.doesNotMatch(page,/stage\.scrollTop/);
});
test("untrusted oral card payloads have bounded required checks and cannot render HTML",()=>{
 const s=lessons.findLesson("hotel").cards.at(-1);
 const payload=protocol.validateBoardPatch({action:"upsert",cards:[{...s,speaking:{...s.speaking,prompt:"<script>bad</script>"}}]});
 assert.ok(payload);
 assert.equal(payload.cards[0].speaking.prompt.includes("<"),false);
 assert.equal(protocol.validateBoardPatch({action:"upsert",cards:[{...s,speaking:{goal:"g"}}]}),null);
 assert.ok(protocol.BOARD_TOOLS[0].functionDeclarations[0].parameters.properties.cards.items.properties.speaking);
});
