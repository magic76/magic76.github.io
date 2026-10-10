const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");

test("teacher home matches native direct-entry UX instead of nested tutor settings",()=>{
 const tutor=read("web-spa/src/teacher/TutorPage.tsx");
 assert.match(tutor,/teacher-home-identity/);
 assert.match(tutor,/更換老師/);
 assert.match(tutor,/試聽老師/);
 assert.match(tutor,/teacher-home-start/);
 assert.match(tutor,/teacher-segmented/);
 for(const value of ['"natural"','"practice"','"scenario"'])
  assert.ok(tutor.includes(value),value);
 for(const value of ['value="beginner"','value="bilingual"','value="immersion"'])
  assert.ok(tutor.includes(value),value);
});
test("voice selection stays inside active profile and next-session accent and pace policy",()=>{
 const store=read("web-spa/src/store/teacherStore.ts");
 const tutor=read("web-spa/src/teacher/TutorPage.tsx");
 const live=read("web-spa/src/teacher/LivePage.tsx");
 const picker=read("web-spa/src/teacher/TeacherProfilePicker.tsx");
 const preview=read("web-spa/src/teacher/teacherVoicePreview.ts");
 for(const key of ["speakingPace","accentStrength","customAccent"])
  assert.ok(store.includes(key)&&tutor.includes("s."+key)&&live.includes("s."+key),key);
 assert.match(live,/speakingPace:s\.speakingPace/);
 assert.match(picker,/detail\.id===active\?activeVoice:detail\.recommendedVoice/);
 assert.match(preview,/voiceName:opts\?\.voice\|\|profile\.recommendedVoice/);
});
test("manual interrupt is a primary action only while teacher is actually speaking",()=>{
 const controls=read("web-spa/src/live/LiveControls.tsx");
 const live=read("web-spa/src/teacher/LivePage.tsx");
 assert.match(live,/prominentInterrupt interruptLabel="換我說/);
 assert.match(controls,/prominentInterrupt&&live\.state==="speaking"/);
});
test("roleplay changes only through scene setting and fresh session instead of silent text prompt",()=>{
 const tutor=read("web-spa/src/teacher/TutorPage.tsx");
 const live=read("web-spa/src/teacher/LivePage.tsx");
 assert.match(tutor,/conversationMode==="scenario"/);
 assert.match(tutor,/\?mission=/);
 assert.match(live,/設定聊天／情境模式/);
 assert.doesNotMatch(live,/live\.sendText\("現在進入角色扮演/);
});
