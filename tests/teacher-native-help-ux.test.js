const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
const src=stripTypeScriptTypes(read("web-spa/src/teacher/teacherLanguageUx.ts"),{mode:"strip"}).replace(/\bexport\s+(?=function|const)/g,"");
const ctx={};vm.runInNewContext(src+"\nthis.api={teacherLanguageHomeHint,teacherLanguageLiveHint};",ctx);
const {teacherLanguageHomeHint:home,teacherLanguageLiveHint:live}=ctx.api;
test("A1 and A2 allow Chinese questions with short English models",()=>{
 assert.match(home("bilingual","A1","Chinese","English",true),/explains in Chinese and models in English/);
 assert.match(live("bilingual","A1","Chinese","English",true),/short English examples/);
 assert.match(live("bilingual","A2","Chinese","English",true),/Ask in Chinese/);
});
test("B2 mainly English with native-language help when necessary",()=>{
 assert.match(live("bilingual","B2","Chinese","English",true),/Mostly English · Chinese help when needed/);
});
test("teacher immersion supersedes levels and never promises Chinese explanation",()=>{
 for(const level of ["auto","A1","A2","B1","B2"]){
  assert.match(live("immersion",level,"Chinese","English",true),/English only/);
  assert.doesNotMatch(home("immersion",level,"Chinese","English",true),/Ask about|Chinese/);
 }
});
test("teacher explanations and Friend mode stay separate",()=>{
 assert.match(read("web-spa/src/teacher/teacherLanguageGuidance.ts"),/what a sentence means/);
 const friend=read("web-spa/src/friends/FriendLiveConversation.tsx");
 assert.match(friend,/friendLanguageTransition\(language,friendNativeLanguage,chosen\)/);
 assert.match(friend,/aria-pressed=\{friendChatMode===value\}/);
 assert.doesNotMatch(friend,/teacherLanguageHomeHint|learnerSpeakingLevel/);
});
test("localized role promises and Android canonical contract revision",()=>{
 const contract=JSON.parse(read("contracts/crew-teacher/v1.json"));
 assert.equal(contract.revision,"2026-10-18.1");
 assert.equal(contract.rules.turnTaking.levelsMs.A1,2000);
 assert.equal(contract.rules.turnTaking.levelsMs.A2,1400);
 assert.equal(contract.rules.teacherLanguageSupport.nativeLanguageQuestionsWelcomed,true);
 assert.equal(contract.rules.friends.chatModeSurvivesReconnect,true);
 for(const lang of ["en","zh-TW"]){
  const teacher=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/teacher.json"));
  const friend=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/friends.json"));
  assert.ok(teacher.practice.teacherDesc&&teacher.practice.friendDesc&&friend.rolePromise&&friend.liveRolePromise);
 }
});
