const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Settings offers explicit Gemini 3.8 and 3.1 Live models",()=>{
 const settings=read("web-spa/src/pages/SettingsPage.tsx"),store=read("web-spa/src/store/teacherStore.ts");
 for(const id of ["gemini-3.8-live","gemini-3.1-flash-live-preview"]){
  assert.match(settings,new RegExp(id));assert.match(store,new RegExp(id));
 }
 assert.match(settings,/setLiveModel/);
 assert.match(store,/liveModel:validateLiveModel/);
});
test("Live audio and preview use the chosen model, never automatically switch for A-B tests",()=>{
 const hook=read("web-spa/src/live/useLiveSession.ts"),preview=read("web-spa/src/teacher/teacherVoicePreview.ts");
 const types=read("web-spa/src/lib/runtime.ts");
 assert.ok(hook.includes("models:teacherVoiceSession?[useTeacherStore.getState().liveModel]:undefined"));
 assert.ok(hook.includes("maxLiveAttempts:teacherVoiceSession?1:2"));
 assert.match(types,/models\?:string\[\]/);
 assert.match(preview,/const model=useTeacherStore\.getState\(\)\.liveModel/);
 assert.doesNotMatch(preview,/const model="gemini-3\.8-live"/);
});
test("Crew Friend and Crew Teacher persona do not impose British, Taiwanese or other English accents",()=>{
 const identity=read("web-spa/src/live/voiceIdentity.ts");
 const f=read("web-spa/src/friends/FriendLiveConversation.tsx");
 assert.match(identity,/const voiceAccent=accent\?\?"auto"/);
 assert.doesNotMatch(identity,/const friendAccent:/);
 assert.doesNotMatch(identity,/const teacherAccent:/);
 assert.match(f,/buildAccentPrompt\(language,region,accentStrength,customAccent\)/);
 assert.match(identity,/Always respond in the learner's SELECTED target language/);
});
