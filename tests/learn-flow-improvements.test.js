import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,"web-spa/src/teacher",file),"utf8");

test("course scoring matches complete word sequences instead of substrings",()=>{
 const source=read("courseProgress.ts");
 assert.match(source,/phrase\.every\(\(part,j\)=>words\[i\+j\]===part\)/);
 assert.doesNotMatch(source,/student\.includes\(k\.toLowerCase\(\)\)/);
});
test("phrase recording releases audio and microphone when leaving or switching phrases",()=>{
 const source=read("PhraseRecording.tsx");
 assert.match(source,/getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
 assert.match(source,/URL\.revokeObjectURL/);
 assert.match(source,/generation\.current\+=1/);
 assert.match(source,/stopLearningSpeech\(\)/);
 assert.match(source,/session!==generation\.current/);
 assert.match(source,/new MediaRecorder\(media\)/);
 assert.doesNotMatch(source,/fetch\(|upload\(/);
 const page=read("PhrasebookPage.tsx");
 assert.match(page,/practicePanel\("daily:"\+phrase\.text/);
 assert.match(page,/practicePanel\("saved:"\+x\.id/);
 assert.doesNotMatch(read("PronunciationPage.tsx"),/ShadowingPractice/);
 assert.equal(fs.existsSync(path.join(root,"web-spa/src/teacher/ShadowingPractice.tsx")),false);
});
test("learning progress and review link reuse existing data and routes",()=>{
 const snapshot=read("LearningSnapshot.tsx");
 const reports=read("ReportsPage.tsx");
 assert.match(snapshot,/completedLessons\(\)/);
 assert.match(snapshot,/dueDeckItems\(deck\)/);
 assert.match(snapshot,/\/teacher\/phrasebook/);
 assert.match(reports,/queueReviewFocus/);
});
