const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const source=p=>fs.readFileSync(path.join(root,p),"utf8");

test("friend End and toolbar Back both close after saving conversation",()=>{
 const live=source("web-spa/src/friends/FriendLivePage.tsx");
 assert.match(live,/const endAndReturn=async\(\)=>/);
 assert.match(live,/await live\.stop\(true\)/);
 assert.match(live,/finally\{navigate\(shortsPost\?"\/teacher\/shorts":"\/teacher\/roles\?mode=friends"\)\}/);
 assert.match(live,/onEnd=\{endAndReturn\}/);
 assert.match(live,/preventDefault\(\);void endAndReturn\(\)/);
 assert.match(live,/recordFriendChat\(sessionId,language,item\.turns,item\.durationMs\)/);
});

test("teacher End exits after locally ending voice and preserves report and course completion",()=>{
 const live=source("web-spa/src/teacher/LivePage.tsx");
 assert.match(live,/const endAndReturn=async\(\)=>/);
 assert.match(live,/await live\.stop\(true\)/);
 assert.match(live,/recordCompletedTutorSession\(profile\.id/);
 assert.match(live,/saved\.completion\.then\(done=>evaluateCourseSession/);
 assert.match(live,/saveLessonProgress\(course\.id,result\.stars,result\.score\)/);
 assert.match(live,/onEnd=\{endAndReturn\}/);
 assert.match(live,/finally\{\s*navigate\(course\?/);
});

test("end control allows navigation on conversation pages without changing inline reading",()=>{
 const controls=source("web-spa/src/live/LiveControls.tsx");
 const reading=source("web-spa/src/teacher/PronunciationPage.tsx");
 const session=source("web-spa/src/live/useLiveSession.ts");
 assert.match(controls,/onEnd\?:\(\)=>void\|Promise<unknown>/);
 assert.match(controls,/onEnd\?onEnd\(\):live\.stop\(\)/);
 assert.match(reading,/<LiveControls live=\{live\}\/>/);
 assert.match(session,/const completion=finish\(item\)/);
 assert.match(session,/if\(!deferReport\)await completion/);
 assert.match(session,/return \{turns:\(item\?\.turns\|\|\[\]\)/);
});
