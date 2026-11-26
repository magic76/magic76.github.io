import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=file=>readFileSync(new URL("../web-spa/src/guides/"+file,import.meta.url),"utf8");
const questions=JSON.parse(read("edQuizQuestions.json"));
test("ed quiz has six distinct regular verbs and balanced correct endings",()=>{
 assert.deepEqual(questions.map(q=>[q.word,q.ending]),[["washed","/t/"],["played","/d/"],["wanted","/ɪd/"],["laughed","/t/"],["called","/d/"],["needed","/ɪd/"]]);
 assert.equal(new Set(questions.map(q=>q.base)).size,6);
 const rule={voiceless:"/t/",voiced:"/d/",extra:"/ɪd/"};
 for(const q of questions)assert.equal(q.ending,rule[q.rule],q.word);
});
test("quiz stays local, locks each answer, scores and allows retry",()=>{
 const src=read("EdEndingQuiz.tsx");
 assert.match(src,/previous\.length===index/);
 assert.match(src,/answer===questions\[i\]\.ending/);
 assert.match(src,/setAnswers\(\[\]\);setIndex\(0\)/);
 assert.match(src,/speakLearningText\(question\.word,"en-US"\)/);
 assert.doesNotMatch(src,/fetch\(|GeminiLive|localStorage/);
 assert.match(read("GuidePage.tsx"),/slug==="english-pronunciation"&&<EdEndingQuiz/);
});
