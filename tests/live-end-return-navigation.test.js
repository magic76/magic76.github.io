const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const source=p=>fs.readFileSync(path.join(root,p),"utf8");

test("friend End and toolbar Back both close after saving conversation",()=>{
 const live=source("web-spa/src/friends/FriendLiveConversation.tsx");
 assert.match(live,/const endAndReturn=async\(\)=>/);
 assert.match(live,/await live\.stop\(true\)/);
 assert.match(live,/shortsReturnTo=shortsPost\?"\/teacher\/shorts\?post="\+encodeURIComponent\(shortsPost\.id\)/);
 assert.match(live,/finally\{navigate\(shortsReturnTo\|\|/);
 assert.match(live,/to=\{shortsReturnTo\|\|/);
 assert.match(live,/onEnd=\{endAndReturn\}/);
 assert.match(live,/preventDefault\(\);void endAndReturn\(\)/);
 assert.match(live,/recordFriendChat\(sessionId,language,item\.turns,item\.durationMs\)/);
});

test("teacher End exits after locally ending voice and preserves report and course completion",()=>{
 const live=source("web-spa/src/teacher/LivePage.tsx");
 assert.match(live,/const endAndReturn=async\(\)=>/);
 assert.match(live,/await live\.stop\(true\)/);
 assert.match(live,/recordCompletedTutorSession\(profile\.id/);
 assert.match(live,/saved\.completion\s*\.then\(done=>evaluateCourseSession/);
 assert.match(live,/saveLessonProgress\(course\.id,result\.stars,result\.score\)/);
 assert.match(live,/onEnd=\{endAndReturn\}/);
 assert.match(live,/if\(course\)setEvaluating\(false\)/);
 assert.match(live,/else navigate\(fortuneKind\?/);
 assert.match(live,/setEndingCourse\(true\)/);
 assert.match(live,/Promise\.race\(\[/);
});

test("end control allows navigation on conversation pages without changing inline reading",()=>{
 const controls=source("web-spa/src/live/LiveControls.tsx");
 const reading=source("web-spa/src/teacher/PronunciationPage.tsx");
 const session=source("web-spa/src/live/useLiveSession.ts");
 assert.match(controls,/onEnd\?:\(\)=>void\|Promise<unknown>/);
 assert.match(controls,/onEnd\?onEnd\(\):live\.stop\(\)/);
 assert.match(reading,/<LiveControls live=\{live\}[^>]*onEnd=\{async\(\)=>\{await live\.stop\(true\);navigate\("\/learn"\)\}\}/);
 for(const file of ["teacher/TextbookPage.tsx","teacher/MaterialLiveCamera.tsx","teacher/BoardTutorPanel.tsx"]){
  const code=source("web-spa/src/"+file);
  assert.match(code,/onEnd=\{async\(\)=>\{await live\.stop\(true\)/);
  assert.match(code,/navigate\("\/learn"\)/);
 }
 assert.match(session,/const completion=finish\(item,attempt,finishedConfig,guestMode\)/);
 assert.match(session,/if\(!deferReport\)await completion/);
 assert.match(session,/return \{turns:\(item\?\.turns\|\|\[\]\)/);
});

