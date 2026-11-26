import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=file=>readFileSync(new URL("../web-spa/src/guides/"+file,import.meta.url),"utf8");
const questions=JSON.parse(read("travelQuizQuestions.json"));
test("six distinct bilingual travel scenarios have three choices and balanced answer positions",()=>{
 assert.equal(questions.length,6);
 assert.equal(new Set(questions.map(q=>q.placeEn)).size,6);
 assert.deepEqual(questions.map(q=>q.correct),[0,1,2,0,1,2]);
 for(const q of questions){assert.equal(new Set(q.choices).size,3);assert.ok(q.choices[q.correct]&&q.zh&&q.en&&q.prompt)}
});
test("both quizzes report fixed funnel events and do not transmit answers or scores",()=>{
 for(const [file,detail] of [["EdEndingQuiz.tsx","ed_ending"],["TravelEnglishQuiz.tsx","travel_english"]]){
  const source=read(file);
  for(const event of ["seo_quiz_started","seo_quiz_completed","seo_quiz_cta_click"])assert.ok(source.includes('trackUsageEvent("'+event+'","'+detail+'")'));
  assert.doesNotMatch(source,/fetch\(|GeminiLive|localStorage/);
 }
 assert.match(read("GuidePage.tsx"),/slug==="travel-english-dialogues"&&<TravelEnglishQuiz/);
});
