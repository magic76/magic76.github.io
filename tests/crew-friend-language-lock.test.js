const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");

function policy(){
 const target=stripTypeScriptTypes(read("web-spa/src/teacher/targetLanguages.ts"),{mode:"strip"})
  .replace(/\bexport\s+(?=(?:function|const))/g,"");
 const source=read("web-spa/src/friends/friendLanguage.ts");
 const js=stripTypeScriptTypes(source,{mode:"strip"}).replace(/^import .*\n/gm,"")
  .replace(/\bexport\s+(?=(?:function|const))/g,"");
 const ctx={};vm.runInNewContext(target+"\n"+js+"\nthis.value={friendSpokenLanguage,friendLanguageReminder,friendLanguageRule};",ctx);
 return ctx.value;
}
test("Crew Friends language policy names the selected language explicitly",()=>{
 const p=policy();
 for(const [selected,expected] of [["英文","English"],["日文","Japanese"],["韓文","Korean"],["西班牙文","Spanish"],["法文","French"]]){
  assert.equal(p.friendSpokenLanguage(selected),expected);
  assert.match(p.friendLanguageRule(selected,"zh-TW","natural"),/Start in Traditional Chinese/);
  assert.match(p.friendLanguageRule(selected,"zh-TW","bilingual"),new RegExp("Speak only "+expected));
  assert.match(p.friendLanguageReminder(selected,"zh-TW","immersion"),new RegExp("Speak in "+expected));
 }
});
test("natural and assisted friends never mix languages in the same spoken reply",()=>{
 const p=policy();
 const natural=p.friendLanguageRule("英文","zh-TW","natural");
 assert.match(natural,/Speak only ONE language per whole reply/);
 assert.match(natural,/isolated OK, Yes/);
 assert.match(natural,/preserve the current conversational language/);
 const assisted=p.friendLanguageRule("英文","zh-TW","bilingual");
 assert.match(assisted,/answer that entire spoken reply in Traditional Chinese only/);
 assert.match(assisted,/Never weave languages/);
 const immersed=p.friendLanguageRule("英文","zh-TW","immersion");
 assert.match(immersed,/Only speak English/);
 const reminder=p.friendLanguageReminder("英文","zh-TW","natural");
 assert.match(reminder,/Start in Traditional Chinese/);
});
test("Zoe and every Crew Friend have language anchoring in system, opening, quick actions, and reconnect",()=>{
 const profile=read("web-spa/src/friends/friendProfiles.ts");
 const memory=read("web-spa/src/friends/friendMemory.ts");
 const live=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const shared=read("web-spa/src/live/useLiveSession.ts");
 assert.match(profile,/id":"zoe"/);
 assert.match(memory,/friendLanguageRule\(language,nativeLanguage,mode\)/);
 assert.match(memory,/\(includeTopicContext\?friendTopicContext\(friend\.id,language\):""\)\+"\\n"\+friendLanguageRule\(language,nativeLanguage,mode\)/);
 assert.match(live,/openingPrompt:languageDirective/);
 assert.match(live,/system:scopedSystem\+/);
 assert.match(live,/languageDirective,/);
 assert.doesNotMatch(live,/用\{language\}說/);
 assert.match(live,/sendText\(languageDirective/);
 assert.match(shared,/languageDirective\?:string/);
 assert.match(shared,/session\.sendText\(prompt\+reminder\)/);
});
