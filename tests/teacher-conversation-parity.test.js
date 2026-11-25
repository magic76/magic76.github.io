const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
function buildPolicy(){
 const source=read("web-spa/src/teacher/teacherPolicy.ts");
 const js=stripTypeScriptTypes(source,{mode:"strip"})
  .replace(/^import.*;\s*$/gm,"")
  .replace(/\bexport\s+(?=function)/g,"");
 const context={
  teacherIdentityPrompt:()=>"teacher identity",
  buildRoleplayMemoryContext:()=>"roleplay background",
  buildTutorMemoryContext:()=>"learner context",
  verifiedTutorHistoryContext:()=>"tutor history",
  nativeLanguageName:()=>"Traditional Chinese",
  buildAccentPrompt:()=>"",
  buildPacePrompt:()=>"",
  teacherLanguageRule:()=>"[CREW TEACHER SPOKEN LANGUAGE] Speak English unless support is needed.",
  teacherLanguageGuidance:()=>"[CREW TEACHER LANGUAGE SCAFFOLDING] Use native language for explanation."
 };
 vm.runInNewContext(js+"\nthis.buildTeacherSessionPolicy=buildTeacherSessionPolicy;",context);
 return context.buildTeacherSessionPolicy;
}
const profile={id:"emma",sceneDemeanor:"warm"};
const input={language:"英文",scene:"日常生活",goals:[],mode:"tutor",profile,
 teachingMode:"bilingual",conversationMode:"natural",languageStyle:"auto",
 level:"B1",nativeLanguage:"zh-TW"};
test("natural chat reacts first and does not turn every utterance into a correction",()=>{
 const prompt=buildPolicy()(input);
 assert.match(prompt,/NATURAL CHAT/);
 assert.match(prompt,/FIRST respond to the learner's meaning/);
 assert.match(prompt,/Do NOT automatically correct, rewrite, grade/);
 assert.match(prompt,/offer ONE brief natural recast or model/);
 assert.match(prompt,/TEACHER CONVERSATION RHYTHM/);
 assert.match(prompt,/NOT a casual friend/);
 assert.match(prompt,/do not wait for a serious misunderstanding/);
 assert.match(prompt,/model one natural target-language equivalent/);
 assert.match(prompt,/Do not invent mistakes or teach every turn/);
 assert.doesNotMatch(prompt,/CONVERSATION MOMENTUM/);
 assert.doesNotMatch(prompt,/ACTIVE SPEAKING COACH/);
});
test("practice chat enables focused recasts without fabricating mistakes",()=>{
 const prompt=buildPolicy()({...input,conversationMode:"practice"});
 assert.match(prompt,/ACTIVE SPEAKING COACH/);
 assert.match(prompt,/do not invent an error/);
 assert.doesNotMatch(prompt,/NATURAL CHAT/);
});
test("teaching mode changes language scaffold, not correction cadence",()=>{
 const build=buildPolicy();
 assert.match(build({...input,teachingMode:"beginner"}),/BEGINNER — native-language step-by-step/);
 assert.match(build({...input,teachingMode:"immersion"}),/FULL IMMERSION/);
 assert.match(build(input),/BILINGUAL ASSISTED CONVERSATION/);
});
test("roleplay cannot fall back into tutoring or grammar corrections",()=>{
 const prompt=buildPolicy()({...input,mode:"roleplay",conversationMode:"practice"});
 assert.match(prompt,/Never provide unsolicited corrections/);
 assert.doesNotMatch(prompt,/ACTIVE SPEAKING COACH|TEACHER CONVERSATION RHYTHM/);
});
test("web selectors mirror Android teaching modes, and bilingual is the default",()=>{
 const store=read("web-spa/src/store/teacherStore.ts");
 const live=read("web-spa/src/teacher/LivePage.tsx");
 const liveTools=read("web-spa/src/teacher/TeacherLiveTools.tsx");
 const tutor=read("web-spa/src/teacher/TutorPage.tsx");
 assert.match(store,/read\("teachingMode","bilingual"\)/);
 assert.ok(live.includes("<TeacherLiveTools "),"Teacher Live must mount the session config");
 for(const view of [live+liveTools,tutor]){
  assert.match(view,/s\.teachingMode/);
  for(const option of ['value="beginner"','value="bilingual"','value="immersion"'])
   assert.ok(view.includes(option),option+" missing");
  assert.doesNotMatch(view,/練習方式/);
 }
 assert.match(live,/teachingMode:s\.teachingMode/);
});

test("teacher natural coaching respects all language modes and does not inject casual life scenes",()=>{
 const build=buildPolicy();
 for(const teachingMode of ["beginner","bilingual","immersion"]){
  const prompt=build({...input,teachingMode});
  assert.match(prompt,/selected teaching mode/);
  assert.match(prompt,/Respect explicit requests to chat without corrections/);
  assert.match(prompt,/Do not turn personal anecdotes into the center/);
 }
 const live=read("web-spa/src/teacher/LivePage.tsx");
 assert.match(live,/simple, level-appropriate speaking opportunity/);
 assert.match(live,/not a fictional personal-life anecdote/);
 assert.doesNotMatch(live,/nextTeacherLifeOpening|teacherLifeBookPrompt/);
 assert.match(live,/fortuneSpeakingOpening\(fortuneKind,fortuneContext\)/);
 assert.match(live,/conversationOpening\(intent,"teacher"\)/);
 assert.match(live,/Enter the.*role-play NOW/);
 assert.match(live,/Continue the existing practice NOW/);
 assert.match(live,/COACH CONTROL — review mode/);
 assert.match(live,/TeacherTextCourseChat.*system=\{system\+/);
});
