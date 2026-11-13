"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(p,"utf8");
function runnable(path){
 return stripTypeScriptTypes(read(path),{mode:"strip"})
  .replace(/^import .*\n/gm,"")
  .replace(/\bexport\s+(?=(?:function|const))/g,"");
}
function pref(){
 const src=runnable("web-spa/src/onboarding/learningLanguagePreference.ts");
 const context={};
 vm.runInNewContext(src+"\nthis.value={LEARN_LANGUAGE_CONFIRMED_KEY,EXPLICIT_TARGET_LANGUAGE_KEY,needsLearningLanguageConfirmation,markLearningLanguageConfirmed,isLearningLanguageEntry};",context);
 return context.value;
}
test("only a first learning-hub visit asks once; direct chats, live calls, games and sharing stay untouched",()=>{
 const p=pref(),data=new Map();
 const storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 assert.equal(p.isLearningLanguageEntry("/learn"),true);
 assert.equal(p.isLearningLanguageEntry("/teacher"),true);
 assert.equal(p.isLearningLanguageEntry("/teacher/practice"),true);
 for(const path of ["/","/chat","/games","/friend/live","/teacher/live","/teacher/course","/settings"]){
  assert.equal(p.isLearningLanguageEntry(path),false,path);
 }
 assert.equal(p.needsLearningLanguageConfirmation(storage),true);
 p.markLearningLanguageConfirmed(storage);
 assert.equal(data.get(p.LEARN_LANGUAGE_CONFIRMED_KEY),"1");
 assert.equal(p.needsLearningLanguageConfirmation(storage),false);
});
test("a prior explicit Friend or Teacher language choice suppresses the dialog; blocked storage never traps users",()=>{
 const p=pref(),data=new Map([[p.EXPLICIT_TARGET_LANGUAGE_KEY,"日文"]]);
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 assert.equal(p.needsLearningLanguageConfirmation(storage),false);
 data.delete(p.EXPLICIT_TARGET_LANGUAGE_KEY);
 assert.equal(p.needsLearningLanguageConfirmation(storage),true);
 assert.equal(p.needsLearningLanguageConfirmation({getItem:()=>{throw Error("blocked")}}),false);
 assert.doesNotThrow(()=>p.markLearningLanguageConfirmed({setItem:()=>{throw Error("blocked")}}));
});
test("welcome step 2 confirms language, but its early Learn shortcut still opens the one-time prompt",()=>{
 const old=read("web-spa/src/onboarding/OnboardingGate.tsx"),app=read("web-spa/src/App.tsx");
 assert.match(app,/const LearningLanguageGate=lazy\(\(\)=>import\("\.\/onboarding\/LearningLanguageGate"\)/);
 assert.match(app,/pathname==="\/learn"\|\|pathname==="\/teacher"\|\|pathname==="\/teacher\/practice"/);
 assert.match(app,/<LearningLanguageGate pathname=\{pathname\}\/>/);
 assert.match(old,/if\(begin&&chosenGoal==="learn"&&step===2\)markLearningLanguageConfirmed\(localStorage\)/);
 assert.match(old,/onClick=\{\(\)=>finish\(true,item\.id\)\}/);
 assert.match(old,/if\(begin\)navigate\(destinations\[chosenGoal\]\)/);
});
test("first-Learn gate confirms only the chosen learning language, keeps default, Friend mode and voice unchanged",()=>{
 const component=read("web-spa/src/onboarding/LearningLanguageGate.tsx");
 const store=read("web-spa/src/store/teacherStore.ts");
 assert.match(component,/needsLearningLanguageConfirmation\(localStorage\)/);
 assert.match(component,/setDraft\(useTeacherStore\.getState\(\)\.targetLanguage\)/);
 assert.match(component,/if\(applySelection&&draft!==target\)setTargetLanguage\(draft\)/);
 assert.match(component,/markLearningLanguageConfirmed\(localStorage\)/);
 assert.match(component,/onCancel=\{event=>\{event\.preventDefault\(\);finish\(false\)\}\}/);
 assert.match(component,/TARGET_LANGUAGES\.map\(/);
 assert.match(component,/onClick=\{\(\)=>finish\(false\)\}/);
 assert.doesNotMatch(component,/setFriendChatMode|setVoice|setNativeLanguage|setLanguageStyle/);
 assert.match(store,/targetLanguage:read\("lang","英文"\)/);
 assert.match(store,/friendChatMode:explicitFriendChatMode\(\)/);
 assert.match(store,/voice:read\("voice",/);
 const css=read("web-spa/src/onboarding/learningLanguage.css");
 assert.match(css,/max-width:540px/);
 assert.match(css,/max-width:430px/);
});
test("the first-Learn prompt is translated into all 11 UI languages with no missing target-language choices",()=>{
 const source=runnable("web-spa/src/onboarding/learningLanguageCopy.ts");
 const locales=JSON.parse(read("config/ui-locales.json")).locales.map(x=>x.code);
 const ctx={normalizeUiLocale:v=>locales.includes(v)?v:null};
 vm.runInNewContext(source+"\nthis.get=getLearningLanguageCopy;",ctx);
 const keys=Object.keys(ctx.get("en")).sort();
 const targetSource=runnable("web-spa/src/teacher/targetLanguages.ts");
 const targets={};vm.runInNewContext(targetSource+"\nthis.languages=TARGET_LANGUAGES;",targets);
 for(const lang of locales){
  const d=ctx.get(lang);
  assert.deepEqual(Object.keys(d).sort(),keys,lang+" localized intro keys");
  for(const [key,text] of Object.entries(d))assert.ok(typeof text==="string"&&text.trim(),lang+" "+key);
  const options=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/friends.json")).languages;
  for(const target of targets.languages)assert.ok(options[target.value],lang+" missing "+target.value);
 }
 assert.match(ctx.get("ja").title,/学/);
 assert.match(ctx.get("de").title,/Sprache/);
 assert.equal(ctx.get("does-not-exist").title,ctx.get("en").title);
});
test("selected language flows into Friends; modes and character voice remain independent",()=>{
 const friends=read("web-spa/src/friends/FriendLivePage.tsx");
 const modes=read("web-spa/src/friends/friendLanguage.ts");
 const store=read("web-spa/src/store/teacherStore.ts");
 assert.match(friends,/const language=useTeacherStore\(s=>s\.targetLanguage\)/);
 assert.match(friends,/const nativeLanguage=useTeacherStore\(s=>s\.nativeLanguage\)/);
 assert.match(friends,/friendLanguageReminder\(language,friendNativeLanguage,friendChatMode\)/);
 assert.match(friends,/voice:normalizeLiveVoice\(friend\.voice\)/);
 assert.match(modes,/Speak only "\+target\+" by default/);
 assert.match(modes,/Start in "\+native\+/);
 assert.match(modes,/"de":"German","it":"Italian"/);
 assert.match(store,/setTargetLanguage:v=>\{write\("lang",v\)/);
 assert.doesNotMatch(read("web-spa/src/onboarding/LearningLanguageGate.tsx"),/normalizeLiveVoice/);
});
test("German and Italian native languages no longer default to English help",()=>{
 const source=runnable("web-spa/src/teacher/teacherLocale.ts");
 const scope={};vm.runInNewContext(source+"\nthis.api={detectNativeLanguage,nativeLanguageName};",scope);
 assert.equal(scope.api.detectNativeLanguage("de-DE"),"de");
 assert.equal(scope.api.nativeLanguageName("de"),"Deutsch");
 assert.equal(scope.api.detectNativeLanguage("it-IT"),"it");
 assert.equal(scope.api.nativeLanguageName("it"),"Italiano");
 assert.equal(scope.api.detectNativeLanguage("ja-JP"),"ja");
 assert.equal(scope.api.detectNativeLanguage("pt-BR"),"pt");
});
