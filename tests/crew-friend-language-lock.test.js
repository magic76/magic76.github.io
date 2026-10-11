const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");

function policy(){
 const source=read("web-spa/src/friends/friendLanguage.ts");
 const js=stripTypeScriptTypes(source,{mode:"strip"}).replace(/\bexport\s+(?=(?:function|const))/g,"");
 const ctx={};vm.runInNewContext(js+"\nthis.value={friendSpokenLanguage,friendLanguageReminder,friendLanguageRule};",ctx);
 return ctx.value;
}
test("Crew Friends language policy names the selected language explicitly",()=>{
 const p=policy();
 for(const [selected,expected] of [["英文","English"],["日文","Japanese"],["韓文","Korean"],["西班牙文","Spanish"],["法文","French"]]){
  assert.equal(p.friendSpokenLanguage(selected),expected);
  assert.match(p.friendLanguageRule(selected),new RegExp("The user chose "+expected));
  assert.match(p.friendLanguageReminder(selected),new RegExp("Speak in "+expected));
 }
});
test("Zoe and every Crew Friend have language anchoring in system, opening, quick actions, and reconnect",()=>{
 const profile=read("web-spa/src/friends/friendProfiles.ts");
 const memory=read("web-spa/src/friends/friendMemory.ts");
 const live=read("web-spa/src/friends/FriendLivePage.tsx");
 const shared=read("web-spa/src/live/useLiveSession.ts");
 assert.match(profile,/id":"zoe"/);
 assert.match(memory,/friendLanguageRule\(language\)/);
 assert.match(memory,/friendTopicContext\(friend\.id,language\)\+"\\n"\+friendLanguageRule\(language\)/);
 assert.match(live,/openingPrompt:languageDirective/);
 assert.match(live,/system,languageDirective/);
 assert.doesNotMatch(live,/用\{language\}說/);
 assert.match(live,/sendText\(languageDirective/);
 assert.match(shared,/languageDirective\?:string/);
 assert.match(shared,/session\.sendText\(prompt\+reminder\)/);
});
