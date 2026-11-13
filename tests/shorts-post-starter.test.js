"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const friend=read("web-spa/src/friends/FriendLivePage.tsx");
const extract=(name)=>{
 const match=friend.match(new RegExp("const "+name+"=([\\s\\S]*?);"));
 assert.ok(match,"must evaluate the actual FriendLivePage expression: "+name);
 return match[1];
};
const names=["shortsHook","selectedQuestion","shortsHookText","shortsStarter"];
const expressions=names.map(name=>`const ${name}=${extract(name)};`).join("\n");
const first=friend.match(/firstStarter=\{([^}]*)\}/);
assert.ok(first,"must read the real text chat firstStarter binding");
const script=new vm.Script(expressions+"\nthis.result={shortsHook,selectedQuestion,shortsHookText,shortsStarter,firstStarter:"+first[1]+"};");
const langs=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
const voice=lang=>JSON.parse(read(`web-spa/src/i18n/locales/${lang}/voice.json`));
const home=lang=>JSON.parse(read(`web-spa/src/i18n/locales/${lang}/home.json`));
async function social(){
 const source=stripTypeScriptTypes(read("web-spa/src/teacher/shortsSocial.ts"),{mode:"strip"});
 return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
}
const generic={id:"hugo-20261112",friendId:"hugo",caption:"I brought yesterday's pickles to lunch. The one I liked least turns out to be excellent with a very boring egg."};
const craft={id:"ada-20261107",friendId:"ada",caption:"Those sharpened scissors have their first job: a padded pouch. I've cut the lining slightly bigger so it can stop escaping."};
function renderStarter({post=generic,query="q=0",lang="zh-TW",dailyFortuneStarter,dailyQuoteStarter,dailyTopicStarter},module){
 const params=new URLSearchParams(query);
 const ui=home(lang),catalog=voice(lang);
 const t=(key)=>{
  if(key==="voice:friendLive.postStarter")return catalog.friendLive.postStarter;
  if(key.startsWith("home:shorts.")){
   const path=key.slice("home:shorts.".length).split(".");
   return path.reduce((acc,part)=>acc?.[part],ui.shorts)||key;
  }
  throw Error("unexpected translation: "+key);
 };
 const scope={shortsPost:post,params,urlHook:params.get("hook"),isShortsHook:module.isShortsHook,
  shortsSelectedQuestion:module.shortsSelectedQuestion,t,dailyFortuneStarter,dailyQuoteStarter,dailyTopicStarter};
 script.runInNewContext(scope);
 return scope.result;
}
test("unclassified Shorts posts always get a post-specific first starter for q=0, absent, malformed and out-of-range q",async()=>{
 const module=await social();
 for(const post of [generic,{...generic,id:"noah-20261111"},{...generic,id:"bella-20261112"}]){
  assert.equal(module.shortsPhotoQuestions(post,()=>"unused").length,0);
  for(const query of ["q=0","","q=19","q=bogus","q=-1"]){
   const result=renderStarter({post,query},module);
   assert.equal(result.selectedQuestion,"");
   assert.equal(result.shortsHookText,undefined);
   assert.equal(result.shortsStarter,voice("zh-TW").friendLive.postStarter);
   assert.equal(result.firstStarter,"這張照片裡發生了什麼事？");
   assert.ok(!/café|introduce myself|How has your day been/i.test(result.firstStarter));
  }
 }
 assert.equal(renderStarter({query:"",lang:"en"},module).firstStarter,"What's happening in this photo?");
});
test("a classified question outranks hook and fallback; q=0 remains the approved topic question",async()=>{
 const module=await social();
 const result=renderStarter({post:craft,query:"q=0&hook=details"},module);
 assert.equal(result.selectedQuestion,home("zh-TW").shorts.photoTopics.craft.first);
 assert.equal(result.shortsHookText,home("zh-TW").shorts.hooksDetails);
 assert.equal(result.firstStarter,result.selectedQuestion);
 assert.notEqual(result.firstStarter,voice("zh-TW").friendLive.postStarter);
});
test("hook labels are taken from the active UI locale, never the former English/Chinese-only table",async()=>{
 const module=await social();
 for(const hook of ["details","feelings","next"]){
  const key={details:"hooksDetails",feelings:"hooksFeelings",next:"hooksNext"}[hook];
  for(const lang of ["ja","en","zh-TW"]){
   const result=renderStarter({query:"q=0&hook="+hook,lang},module);
   assert.equal(result.shortsHookText,home(lang).shorts[key]);
   assert.equal(result.firstStarter,home(lang).shorts[key]);
  }
 }
 assert.equal(renderStarter({query:"hook=details",lang:"ja"},module).firstStarter,"詳しく教えて");
 assert.notEqual(renderStarter({query:"hook=details",lang:"ja"},module).firstStarter,"怎麼回事？");
 assert.ok(!friend.includes("shortsHookLabel"),"do not use an English/Chinese-only hook helper");
 assert.match(friend,/:shortsHook\?<small className="friend-live-post-hook">\{t\("friendLive.hookPrefix"\)\}\{shortsHookText\}<\/small>:null/);
 assert.doesNotMatch(friend,/<small className="friend-live-post-hook">[^\n]*postStarter/,
  "a fallback question is not shown as a chosen photo question");
});
test("non-Shorts, missing posts and daily/quote/topic entrants never receive the Shorts fallback",async()=>{
 const module=await social();
 const cases=[
  {query:"",expected:undefined},
  {query:"quote=daily&chart="+"a".repeat(64),dailyFortuneStarter:"MY DAILY FORTUNE",expected:"MY DAILY FORTUNE"},
  {query:"quote=quote-1",dailyQuoteStarter:"MY DAILY QUOTE",expected:"MY DAILY QUOTE"},
  {query:"topic=topic-1",dailyTopicStarter:"MY DAILY TOPIC",expected:"MY DAILY TOPIC"},
  {query:"q=0&hook=details",expected:undefined},
 ];
 for(const input of cases){
  const {expected,...opts}=input;
  const result=renderStarter({...opts,post:null},module);
  assert.equal(result.shortsStarter,undefined);
  assert.equal(result.firstStarter,expected);
 }
 assert.match(friend,/postUnavailable=\{Boolean\(postId&&!lookup\?\.post\)\}/);
 assert.match(friend,/shortsPost=\{postId\?lookup\?\.post\|\|null:null\}/);
 assert.match(friend,/const dailyTopic=!shortsPost&&friend\.id==="zoe"/);
 assert.match(friend,/const selectedQuote=!shortsPost&&friend\.id==="zoe"/);
 assert.match(friend,/const personalChartHash=!shortsPost&&friend\.id==="zoe"/);
 assert.match(friend,/firstStarter=\{shortsStarter\|\|dailyFortuneStarter\|\|dailyQuoteStarter\|\|dailyTopicStarter\}/);
});
test("11 voice translations have the same nonblank, interpolation-free, safe post starter key",()=>{
 for(const lang of langs){
  const v=voice(lang).friendLive.postStarter;
  assert.equal(typeof v,"string",lang);
  assert.ok(v.trim().length>8,lang);
  assert.ok(!v.includes("{{")&&!v.includes("}}"),lang);
  assert.ok(!/[<>]/.test(v),lang);
 }
 assert.equal(voice("zh-TW").friendLive.postStarter,"這張照片裡發生了什麼事？");
 assert.match(voice("zh-TW").friendLive.postStarter,/[\u3400-\u9fff]/);
});
test("starter is opt-in and uses the unchanged verified first-send path",()=>{
 const panel=read("web-spa/src/live/TextChatPanel.tsx");
 const starters=read("web-spa/src/live/TextChatStarters.tsx");
 assert.match(starters,/firstStarter&&<button[^>]+onClick=\{\(\)=>onPick\(firstStarter\)\}/);
 assert.match(panel,/onPick=\{sentence=>void sendMessage\(sentence\)\}/);
 assert.match(panel,/historyReady&&!messages\.length&&!draft\.trim\(\)&&!busy/);
 assert.doesNotMatch(friend,/sendMessage\(shortsStarter\)|setDraft\(shortsStarter\)/);
 assert.match(friend,/starters=\{dailyEntry\?\[t\("dailyFortuneStarters\.goodFor"\),t\("dailyFortuneStarters\.watchOut"\)\]:undefined\}/);
 assert.match(starters,/\["cafe","intro","smalltalk"\]/);
 assert.match(friend,/showStarterWithHistory=\{Boolean\(dailyFortuneStarter\|\|dailyQuoteStarter\)\}/);
});
