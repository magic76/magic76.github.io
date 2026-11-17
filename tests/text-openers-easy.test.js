"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
const phrases=stripTypeScriptTypes(read("web-spa/src/friends/targetStarters.ts"),{mode:"strip"}).replace(/\bexport\s+(?=(?:function|const))/g,"");
const context={};
vm.runInNewContext(phrases+"\nthis.api={friendStarterTopics,targetStarterPhrase};",context);
const {friendStarterTopics,targetStarterPhrase}=context.api;
const languages=["en","ja","ko","es","fr","de","it","vi","th","zh","pt","id"];
const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
test("Zoe, Hugo, Ada and Max have distinct, personality-based second and third openings in every target language",()=>{
 const chosen=["Zoe","Hugo","Ada","Max"];
 const topics=chosen.map(name=>Array.from(friendStarterTopics(name)));
 assert.deepEqual(topics,[
  ["smalltalk","funny","intro"],["cafe","food","travel"],["intro","make","idea"],["smalltalk","outdoors","weekend"]
 ]);
 assert.equal(new Set(topics.map(t=>t.slice(1).join("|"))).size,4);
 for(const code of languages)for(const name of chosen){
  const items=Array.from(friendStarterTopics(name)).map(key=>targetStarterPhrase(code,key,name));
  assert.equal(items.length,3);
  assert.ok(items.every(item=>item.trim().length>8&&item.includes(name)&&!item.includes("{{")),code+" "+name);
  assert.equal(new Set(items).size,3,code+" "+name);
 }
 assert.notEqual(targetStarterPhrase("en","funny","Zoe"),targetStarterPhrase("en","food","Hugo"));
 assert.match(targetStarterPhrase("en","travel","Hugo"),/Where would you like to go/);
 assert.match(targetStarterPhrase("en","make","Ada"),/make today/);
 assert.match(targetStarterPhrase("en","outdoors","Max"),/walking outside/);
});
test("English learner with zh-TW UI gets English text and a Chinese meaning, not a mixed-language sentence",()=>{
 const zh=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/friends.json")).textStarters;
 const ui=read("web-spa/src/live/TextChatStarters.tsx");
 assert.match(ui,/showMeaning=hasTargetStarters&&uiCode!==targetCode/);
 assert.match(ui,/t\("textStarters\.meaning\."\+key,\{name:speaker\}\)/);
 assert.match(ui,/onClick=\{\(\)=>onPick\(phrase\)\}/);
 for(const name of ["Zoe","Hugo"]){
  const [second]=Array.from(friendStarterTopics(name)).slice(1);
  const phrase=targetStarterPhrase("en",second,name);
  const meaning=zh.meaning[second].replaceAll("{{name}}",name);
  assert.match(phrase,/^[A-Z]/);
  assert.doesNotMatch(phrase,/[\u3400-\u9fff]/);
  assert.match(meaning,/[\u3400-\u9fff]/);
  assert.ok(!phrase.includes(meaning));
 }
  assert.ok(ui.includes("onClick={()=>onPick((gameStarter||firstStarter)!)}"),"the game-aware first starter uses the same send path");
 assert.match(ui,/!firstOnly&&!starters&&friendStarterTopics\(speaker\)/);
});
test("11 UI translations have accessible instructions and all topical meaning strings",()=>{
 const keys=["cafe","intro","smalltalk","funny","food","travel","make","idea","outdoors","weekend"];
 for(const lang of locales){
  const dict=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/friends.json")).textStarters;
  for(const label of ["openingHelp","tapToBegin"])assert.ok(typeof dict[label]==="string"&&dict[label].length>=12,lang+" "+label);
  assert.deepEqual(Object.keys(dict.meaning).sort(),keys.slice().sort(),lang);
  for(const key of keys)assert.match(dict.meaning[key],/\{\{name\}\}/,lang+" "+key);
 }
 const css=read("web-spa/src/live/TextChatPanel.css");
 assert.match(css,/\.crew-text-starter\{[^}]*min-height:44px/);
 assert.match(css,/\.crew-text-starter-meaning\{[^}]*font-size:13px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test("Easy friend prompt is short, first-three-turn capped, isolated from other modes and worker budgeted",()=>{
 const live=read("web-spa/src/live/liveTextChat.ts");
 const start=live.indexOf("export function easyFriendTextReplyRule");
 const end=live.indexOf("\n\nexport type LiveTextAnswer",start);
 assert.ok(start>0&&end>start);
 const fn=stripTypeScriptTypes(live.slice(start,end),{mode:"strip"}).replace(/^export /,"");
 const scope={};
 vm.runInNewContext(fn+"\nthis.make=easyFriendTextReplyRule;",scope);
 const easySystem="[FRIEND LANGUAGE CONTROL — TARGET CHAT WITH NATIVE HELP, silent instruction]";
 const rule=scope.make(easySystem,true);
 assert.match(rule,/1-2 short sentences/);
 assert.match(rule,/common everyday words/);
 assert.match(rule,/No slang, idioms/);
 assert.match(rule,/ONE simple question/);
 assert.match(rule,/FIRST 3 assistant replies/);
 assert.match(rule,/no more than 20 English words/);
 for(const other of ["[FRIEND LANGUAGE CONTROL — NATURAL SINGLE LANGUAGE]","[FRIEND LANGUAGE CONTROL — FULL IMMERSION]","[TEACHER]"]){
  assert.equal(scope.make(other,true),"",other);
 }
 assert.equal(scope.make(easySystem,false),"","teacher must not receive friend limitations");
 assert.match(live,/easyFriendTextReplyRule\(this\.system,this\.friendScope\)/);
 const panel=read("web-spa/src/live/TextChatPanel.tsx");
 assert.match(panel,/friendGuestSystem\(guestBase\+easyFriendTextReplyRule\(guestBase,isFriend\)\)/,
  "guest system is trimmed AFTER Easy is appended, preserving the 6000-char Worker cap");
 assert.ok(Buffer.byteLength(panel)<26000);
});
