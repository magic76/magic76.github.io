const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
const src=stripTypeScriptTypes(read("web-spa/src/friends/friendLanguage.ts"),{mode:"strip"}).replace(/\bexport\s+(?=(?:function|const))/g,"");
const ctx={};vm.runInNewContext(src+"\nthis.api={friendLanguageRule,friendLanguageReminder};",ctx);
test("friend natural, bilingual and immersion modes keep distinct language boundaries",()=>{
 const {friendLanguageRule,friendLanguageReminder}=ctx.api;
 assert.match(friendLanguageRule("英文","zh-TW","natural"),/MUST use English/);
 assert.match(friendLanguageRule("英文","zh-TW","bilingual"),/BOTH languages/);
 assert.match(friendLanguageReminder("英文","zh-TW","bilingual"),/avoid a third language/);
 assert.match(friendLanguageRule("日文","en","immersion"),/Only speak Japanese/);
 assert.match(friendLanguageReminder("日文","en","immersion"),/after reconnection/);
});
test("friend mode and teacher speaking level are independently saved and used in live sessions",()=>{
 const store=read("web-spa/src/store/teacherStore.ts");
 const page=read("web-spa/src/friends/FriendLivePage.tsx");
 const teacher=read("web-spa/src/teacher/teacherPolicy.ts");
 assert.match(store,/friendChatMode:normalizeFriendChatLanguageMode/);
 assert.match(store,/learnerSpeakingLevel:normalizeLearnerSpeakingLevel/);
 assert.match(page,/friendLanguageReminder\(language,nativeLanguage,friendChatMode\)/);
 assert.match(page,/useRef\(useTeacherStore\.getState\(\)\.friendChatMode\)/);
 assert.match(teacher,/teacherLanguageGuidance\(input\.learnerSpeakingLevel/);
 assert.match(read("web-spa/src/teacher/teacherLanguageGuidance.ts"),/Do NOT invent or claim a CEFR level/);
});
