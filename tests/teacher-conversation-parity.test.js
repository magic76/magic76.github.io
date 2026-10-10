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
  nativeLanguageName:()=>"Traditional Chinese"
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
 assert.match(prompt,/Only when a mistake seriously obscures the meaning or is a repeated high-value issue/);
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
 assert.doesNotMatch(prompt,/ACTIVE SPEAKING COACH/);
});
test("web selectors mirror Android teaching modes, and bilingual is the default",()=>{
 const store=read("web-spa/src/store/teacherStore.ts");
 const live=read("web-spa/src/teacher/LivePage.tsx");
 const tutor=read("web-spa/src/teacher/TutorPage.tsx");
 assert.match(store,/read\("teachingMode","bilingual"\)/);
 for(const view of [live,tutor]){
  assert.match(view,/s\.teachingMode/);
  for(const option of ['value="beginner"','value="bilingual"','value="immersion"'])
   assert.ok(view.includes(option),option+" missing");
  assert.doesNotMatch(view,/練習方式/);
 }
 assert.match(live,/teachingMode:s\.teachingMode/);
});
