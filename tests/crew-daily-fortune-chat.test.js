"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
const friend=read("web-spa/src/friends/FriendLiveConversation.tsx");
const panel=read("web-spa/src/live/TextChatPanel.tsx");
const starters=read("web-spa/src/live/TextChatStarters.tsx");

// Evaluate the exact entry/mode expressions from the page, not reimplementations.
const chartExpression=friend.match(/const personalChartHash=([^;]+);\s*const validDailyHash=([^;]+);\s*const dailyEntry=([^;]+);/);
const modeExpression=friend.match(/const \[friendChatMode,setActiveFriendChatMode\]=useState<FriendChatLanguageMode>\(\(\)=>\{const saved=useTeacherStore\.getState\(\)\.friendChatMode;return ([^;]+)\}\)/);
assert.ok(chartExpression&&modeExpression,"URL and state initialization must remain directly inspectable");
function entry({id="zoe",chat="text",quote="daily",chart="a".repeat(64),shorts=false,stored="bilingual",intent=null}={}){
 const params=new URLSearchParams({id,chat,quote,chart});
 const scope={params,friend:{id},textMode:chat==="text",shortsPost:shorts?{id:"short-1"}:null,intent,
  useTeacherStore:{getState:()=>({friendChatMode:stored})}};
 vm.runInNewContext(`const personalChartHash=${chartExpression[1]};const validDailyHash=${chartExpression[2]};const dailyEntry=${chartExpression[3]};const saved=useTeacherStore.getState().friendChatMode;this.out={personalChartHash,validDailyHash,dailyEntry,mode:${modeExpression[1]}}`,scope);
 return scope.out;
}
test("Zoe daily context opens in the unified Live page for both legacy text and voice links",()=>{
 for(const stored of ["bilingual","natural","immersion"]){
  const result=entry({stored});assert.equal(result.dailyEntry,true);assert.equal(result.mode,"natural");
 }
 for(const options of [{quote:"other"},{quote:""},{chart:"b".repeat(63)},{chart:"zz".repeat(32)},
  {id:"ada"},{shorts:true}]){
  const result=entry({...options,stored:"immersion"});
  assert.equal(result.dailyEntry,false,JSON.stringify(options));assert.equal(result.mode,"immersion");
 }
 assert.equal(entry({quote:"",stored:"natural",intent:"speak"}).mode,"bilingual");
 assert.equal(entry({quote:"",stored:"bilingual"}).mode,"bilingual");
});
test("daily default never persists; manual tab changes still use existing store action",()=>{
 const initial=friend.match(/useState<FriendChatLanguageMode>\(\(\)=>\{[^}]*\}\)/)?.[0]||"";
 assert.doesNotMatch(initial,/setFriendChatMode|setItem|localStorage/);
 assert.match(friend,/const friendNativeLanguage=dailyEntry\?detectNativeLanguage\(locale\.language\):nativeLanguage/);
 assert.match(friend,/buildFriendSystem\(friend,language,friendNativeLanguage,friendChatMode\)/);
 assert.match(friend,/friendLanguageReminder\(language,friendNativeLanguage,friendChatMode\)/);
 assert.match(friend,/friendLanguageTransition\(language,friendNativeLanguage,chosen\)/);
 const manual=friend.slice(friend.indexOf("const changeFriendChatMode="),friend.indexOf("const voiceStart="));
 assert.match(manual,/useTeacherStore\.getState\(\)\.setFriendChatMode\(chosen\)/);
 assert.match(manual,/setActiveFriendChatMode\(chosen\)/);
});
test("only the daily entry substitutes translated fortune starters",()=>{
 assert.match(friend,/starters=\{\[gameRoundStarter\(/);
 assert.match(friend,/dailyFortuneStarter=dailyFortune\?t\("dailyFortuneStarter"\):undefined/);
 assert.match(friend,/shortsStarter,fortuneContinue,dailyFortuneStarter,dailyQuoteStarter,dailyTopicStarter/);
 assert.match(friend,/<FriendUnifiedComposer live=\{live\}/);
 assert.match(panel,/starters\?:string\[\]/);
 assert.match(panel,/firstStarter=\{firstStarter\} starters=\{starters\}\/\>/);
 assert.match(panel,/firstStarter=\{firstStarter\} firstOnly\/\>/);
 assert.match(starters,/!firstOnly&&starters\?\.map/);
 assert.match(starters,/onClick=\{\(\)=>onPick\(sentence\)\}/);
 assert.match(starters,/!firstOnly&&!starters&&friendStarterTopics\(speaker\)\.map\(key=>/);
 assert.match(starters,/onClick=\{\(\)=>onPick\(phrase\)\}/);
 assert.match(starters,/const phrase=targetStarterPhrase\(targetCode,key,speaker\)/);
 assert.match(panel,/onPick=\{sentence=>void sendMessage\(sentence\)\}/);
 assert.doesNotMatch(starters,/sendMessage\(|setDraft\(|fetch\(|submit\(/);
});
test("all 11 UI languages have nonempty, natural-language fortune starters without interpolation",()=>{
 const langs=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
 const baseline=Object.keys(JSON.parse(read("web-spa/src/i18n/locales/zh-TW/friends.json")).dailyFortuneStarters).sort();
 assert.deepEqual(baseline,["goodFor","watchOut"]);
 for(const lang of langs){
  const value=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/friends.json`));
  assert.deepEqual(Object.keys(value.dailyFortuneStarters).sort(),baseline,lang);
  for(const [key,line] of Object.entries(value.dailyFortuneStarters)){
   assert.equal(typeof line,"string",`${lang}.${key}`);
   assert.ok(line.trim().length>3,`${lang}.${key}`);
   assert.doesNotMatch(line,/\{\{|\}\}/,`${lang}.${key}`);
  }
  for(const key of ["cafe","intro","smalltalk"])assert.match(value.textStarters[key],/\{\{name\}\}/,lang+" "+key);
 }
 const zh=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/friends.json"));
 assert.equal(zh.dailyFortuneStarters.goodFor,"今天適合做什麼？");
 assert.equal(zh.dailyFortuneStarters.watchOut,"今天要注意什麼？");
 assert.match(zh.dailyFortuneStarter,/運勢/);
});
