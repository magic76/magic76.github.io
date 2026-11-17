"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=relative=>fs.readFileSync(path.join(__dirname,"..",relative),"utf8");
const langs=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
const targetCodes=["ja","ko","es","fr","de","it","vi","th","zh","pt","id"];
const targetSource=stripTypeScriptTypes(read("web-spa/src/teacher/targetLanguages.ts"),{mode:"strip"})
 .replace(/\bexport\s+(?=(?:function|const))/g,"");
const policySource=stripTypeScriptTypes(read("web-spa/src/friends/friendLanguage.ts"),{mode:"strip"})
 .replace(/^import .*\n/gm,"").replace(/\bexport\s+(?=(?:function|const))/g,"");
const phraseSource=stripTypeScriptTypes(read("web-spa/src/friends/targetStarters.ts"),{mode:"strip"})
 .replace(/\bexport\s+(?=(?:function|const))/g,"");
const sandbox={};
vm.runInNewContext(targetSource+"\n"+policySource+"\n"+phraseSource+"\nthis.exports={friendBeginnerTextStart,friendLanguageReminder,targetStarterPhrase,TARGET_LANGUAGES};",sandbox);
const api=sandbox.exports;
const starters=read("web-spa/src/live/TextChatStarters.tsx");
const friend=read("web-spa/src/friends/FriendLivePage.tsx");
function starterState({target="日文",ui="zh-TW",resolved=ui,mode="bilingual",firstOnly=false,overrides=false}={}){
 const expression=starters.slice(starters.indexOf(" const targetCode="),starters.indexOf(" return <div"));
 assert.match(expression,/const showMeaning=hasTargetStarters&&uiCode!==targetCode/);
 const ctx={TARGET_LANGUAGES:api.TARGET_LANGUAGES,targetLanguage:target,
  i18n:{resolvedLanguage:resolved,language:ui},friendChatMode:mode,firstOnly,starters:overrides?["override"]:undefined};
 vm.runInNewContext(expression+"\nthis.value={targetCode,hasTargetStarters,showMeaning};",ctx);
 return ctx.value;
}
test("English and non-English targets use practiced-language phrases with localized meanings",()=>{
 assert.match(starters,/useTeacherStore\(s=>s\.targetLanguage\)/);
 assert.match(starters,/friendStarterTopics\(speaker\)\.map\(key=>/);
 assert.match(starters,/targetStarterPhrase\(targetCode,key,speaker\)/);
 assert.match(starters,/onClick=\{\(\)=>onPick\(phrase\)\}/);
  assert.ok(starters.includes("onClick={()=>onPick((gameStarter||firstStarter)!)}"),"the game-aware first starter uses the same send path");
 assert.equal(starterState().targetCode,"ja");
 assert.equal(starterState().hasTargetStarters,true);
 assert.equal(api.targetStarterPhrase("ja","cafe","Zoe"),"こんにちは、Zoe！コーヒーをください。");
 assert.equal(starterState({target:"英文"}).targetCode,"en");
 assert.equal(starterState({target:"英文"}).hasTargetStarters,true);
 assert.equal(starterState({target:"英文"}).showMeaning,true);
 assert.match(api.targetStarterPhrase("en","funny","Zoe"),/^Hi Zoe!/);
 assert.doesNotMatch(starters,/sendMessage\(|setDraft\(|fetch\(|submit\(|getUserMedia\(/);
});
test("firstOnly, overrides, and matching UI/target locale suppress generic phrase meanings",()=>{
 for(const state of [{firstOnly:true},{overrides:true},{target:"英文",ui:"en"},
  {target:"日文",ui:"ja",resolved:"en"},
  {target:"中文",ui:"zh-TW",resolved:"en"},
  {target:"葡萄牙文",ui:"pt-BR",resolved:"en"}]){
  const result=starterState(state);
  assert.equal(result.showMeaning,false,JSON.stringify(state));
  if(state.firstOnly||state.overrides)assert.equal(result.hasTargetStarters,false);
 }
 assert.equal(starterState({mode:"immersion"}).showMeaning,true);
 assert.equal(starterState({target:"英文",ui:"zh-TW",resolved:"en"}).showMeaning,true);
 assert.match(starters,/i18n\.language\|\|i18n\.resolvedLanguage/);
 assert.match(starters,/showMeaning&&<span className="crew-text-starter-meaning"/);
 assert.match(starters,/friendChatMode==="immersion"\?"textStarters\.tapToBegin":"textStarters\.openingHelp"/);
});
test("all 11 locales have string-only beginner hints and three meaningful translations",()=>{
 for(const loc of langs){
  const dict=JSON.parse(read(`web-spa/src/i18n/locales/${loc}/friends.json`));
  const {targetHint,meaning}=dict.textStarters;
  assert.equal(typeof targetHint,"string",loc);
  assert.match(targetHint,/\{\{name\}\}/,loc);
  assert.match(targetHint,/\{\{language\}\}/,loc);
  const interpolationCount=value=>[...value.matchAll(/\{\{\s*([^{}]*?)\s*\}\}/g)].map(match=>match[1]).sort();
  assert.deepEqual(interpolationCount(targetHint),["language","name","name"],loc+" must match published en token counts");
  assert.deepEqual(Object.keys(meaning).sort(),["cafe","food","funny","idea","intro","make","outdoors","smalltalk","travel","weekend"],loc);
  for(const key of ["cafe","intro","smalltalk"]){
   assert.ok(typeof meaning[key]==="string"&&meaning[key].trim().length>8,loc+" "+key);
   assert.match(meaning[key],/\{\{name\}\}/,loc+" "+key);
   assert.ok(typeof dict.textStarters[key]==="string",loc+" original English starter");
  }
 }
});
test("11 target languages each have all three named natural phrases, no old English filler",()=>{
 assert.equal(api.TARGET_LANGUAGES.length,12);
 for(const code of targetCodes){
  for(const key of ["cafe","intro","smalltalk"]){
   const phrase=api.targetStarterPhrase(code,key,"Zoe");
   assert.ok(phrase.length>=8,code+" "+key);
   assert.match(phrase,/Zoe/,code+" "+key);
   assert.doesNotMatch(phrase,/\{\{name\}\}|Can we pretend|introduce myself|How has your day/i,code+" "+key);
  }
 }
 assert.equal(api.targetStarterPhrase("en","cafe","Zoe"),"Hi Zoe! A coffee, please.");
});
test("text-only prompt: mode, target, gloss; original voice reminder is unchanged",()=>{
 const prompt=api.friendBeginnerTextStart("日文","zh-TW","bilingual");
 assert.ok(prompt.length>150&&prompt.length<500,prompt.length);
 assert.match(prompt,/Japanese/);assert.match(prompt,/Traditional Chinese/);
 assert.match(prompt,/first 2 text replies/);assert.match(prompt,/1-2 short sentences/);
 assert.match(prompt,/NEW line/);assert.match(prompt,/parentheses/);
 assert.match(prompt,/ONLY exception/);assert.match(prompt,/fluent/);assert.match(prompt,/declines translation/);
 for(const [target,gloss,mode] of [
  ["日文","zh-TW","immersion"],["日文","zh-TW","natural"],["英文","zh-TW","bilingual"],
  ["日文","ja","bilingual"],["中文","zh-TW","bilingual"],["中文","zh-CN","bilingual"],
  ["葡萄牙文","pt","bilingual"],["葡萄牙文","pt-BR","bilingual"]
 ])assert.equal(api.friendBeginnerTextStart(target,gloss,mode),"",`${target}/${gloss}/${mode}`);
 assert.match(api.friendLanguageReminder("日文","zh-TW","bilingual"),/Each reply uses ONE language, without mixing or parallel translations/);
 assert.doesNotMatch(api.friendLanguageReminder("日文","zh-TW","bilingual"),/TEXT CHAT BEGINNER EXCEPTION/);
 assert.equal((policySource.match(/TEXT CHAT BEGINNER EXCEPTION/g)||[]).length,1);
});
test("page appends beginner instruction at the very end of text panel system, excluded Shorts and daily",()=>{
 assert.match(friend,/import \{friendLanguageReminder,friendLanguageTransition,friendBeginnerTextStart,type FriendChatLanguageMode\} from "\.\/friendLanguage"/);
 const panelCall=friend.slice(friend.indexOf("<TextChatPanel "),friend.indexOf(" firstStarter=",friend.indexOf("<TextChatPanel ")));
 assert.match(friend,/const beginnerTextStart=textMode&&!shortsPost&&!dailyEntry\?friendBeginnerTextStart\(language,detectNativeLanguage\(locale\.language\),friendChatMode\):""/);
 assert.match(friend,/detectNativeLanguage\(locale\.language\)/,"gloss follows UI locale, not saved nativeLanguage");
 assert.match(panelCall,/system=\{system\+\(dailyFortune\?"\\n"\+dailyFortune\.context:""\)\+\(fortuneSystem\?"\\n"\+fortuneSystem:""\)\+"\\n"\+languageDirective\+\(beginnerTextStart\?"\\n"\+beginnerTextStart:""\)\}/);
 const elsewhere=friend.replace(panelCall,"");
 assert.equal((elsewhere.match(/friendBeginnerTextStart\(/g)||[]).length,1,"only the isolated text rule declaration may call the helper");
 assert.match(friend,/openingPrompt:languageDirective/);
 assert.match(friend,/sendText\(languageDirective/);
 assert.match(friend,/starters=\{dailyEntry\?\[t\("dailyFortuneStarters.goodFor"\),t\("dailyFortuneStarters.watchOut"\)\]:undefined\}/);
 assert.match(friend,/firstStarter=\{shortsStarter\|\|fortuneContinue\|\|dailyFortuneStarter\|\|dailyQuoteStarter\|\|dailyTopicStarter\}/);
 assert.ok(Buffer.byteLength(friend)<26000);
});
test("new starter text has accessible size, contrast, wrap; buttons remain 44px",()=>{
 const css=read("web-spa/src/live/TextChatPanel.css");
 assert.match(css,/\.crew-text-starter\{[^}]*min-height:44px/);
 for(const [selector,size] of [["crew-text-starters-target-hint",13],["crew-text-starter-meaning",13]]){
  const rule=css.match(new RegExp("\\."+selector+"\\{([^}]*)\\}"));
  assert.ok(rule,selector);
  const font=rule[1].match(/font-size:(\d+)px/);
  assert.ok(font&&Number(font[1])>=12&&Number(font[1])===size,selector);
  assert.match(rule[1],/overflow-wrap:anywhere/);
  assert.match(rule[1],/color:#514e59/);
 }
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
