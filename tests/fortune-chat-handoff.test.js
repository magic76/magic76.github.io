"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const helper=read("web-spa/src/fortune/fortuneChatHandoff.ts");
const model=new Map();
const i18n={t:(key,args)=>key==="zoeReading.fallback"?`Fallback on ${args.headline}: ${args.theme}; do ${args.do}; avoid ${args.avoid}; ${args.color}`:key};
const source=stripTypeScriptTypes(helper,{mode:"strip"}).replace(/^import[^\n]*\n/gm,"").replace(/^export /gm,"");
const sandbox={i18n,loadUiNamespace:async()=>{},localDateKey:()=>"2026-11-13",
 zoeDailySlot:(date,kind,hash,locale)=>[date,kind,hash,locale].join(":"),
 readZoeDaily:key=>model.get(key)||null};
vm.runInNewContext(source+"\nthis.build=buildFortuneChatHandoff;",sandbox);
const hash="a".repeat(64),card={date:"2026-11-13",kind:"bazi",headline:"A grounded day",theme:"Plan slowly",do:["Plan one step"],avoid:"Rushing",luckyColor:{name:"Blue"}};
test("cached today's reading is bound to date, kind, chart and locale; hash/profile never enter model prompt",async()=>{
 model.set([card.date,card.kind,hash,"zh-TW"].join(":"),{source:"ai",text:"Choose the steady path for work today.",at:Date.now()});
 const prompt=await sandbox.build({...card,birthDate:"1985-07-06",birthTime:"04:10",city:"Taipei",gender:"male",profile:{id:7}},hash,"bazi","zh-TW");
 assert.match(prompt,/Choose the steady path for work today/);
 assert.match(prompt,/FIRST reply/);
 assert.match(prompt,/not a new casual conversation/);
 assert.match(prompt,/NEXT_REPLIES/);
 assert.doesNotMatch(prompt,/1985-07-06|04:10|Taipei|birthDate|birthTime|gender|profile\s*[:=]/);
 assert.ok(!prompt.includes(hash));assert.ok(prompt.length<2800);
});
test("without cached AI text, reconstruct same localized visible fallback; never cross chart kind",async()=>{
 const other=await sandbox.build(card,hash,"numerology","zh-TW");
 assert.doesNotMatch(other,/Choose the steady path for work today|Fallback on A grounded day/);
 const fallback=await sandbox.build(card,"b".repeat(64),"bazi","zh-TW");
 assert.match(fallback,/Fallback on A grounded day: Plan slowly/);
 assert.match(fallback,/Plan one step/);
 assert.match(fallback,/Rushing/);
});
test("failed card lookup still uses the correct cached reading or gives explicit fortune-only continuity",async()=>{
 const cached=await sandbox.build(null,hash,"bazi","zh-TW");
 assert.match(cached,/Choose the steady path for work today/);
 const missing=await sandbox.build(null,"c".repeat(64),"bazi","zh-TW");
 assert.match(missing,/unavailable; acknowledge missing details/);
 assert.match(missing,/TODAY fortune/);
 assert.doesNotMatch(missing,/1985-07-06|04:10/);
});
test("only the explicit fortune route auto-sends a follow-up; restored and ordinary conversations stay opt-in",()=>{
 const page=read("web-spa/src/friends/FriendLiveConversation.tsx"),panel=read("web-spa/src/live/TextChatPanel.tsx");
 assert.match(page,/const dailyHandoff=Boolean\(dailyEntry&&params\.get\("from"\)==="fortune"\)/);
 assert.match(page,/autoStarter=\{dailyHandoff&&textFirst\?fortuneContinue:undefined\}/);
 assert.match(page,/dailyHandoff=Boolean\(dailyEntry/);
 assert.match(page,/<FriendUnifiedComposer live=\{live\}/);
 assert.match(panel,/if\(!historyReady\|\|!autoStarter\|\|autoSent\.current===sessionScope\|\|messages\.length\|\|draft\.trim\(\)\|\|readPendingTextDraft\(sessionScope\)\)return/);
 assert.match(panel,/autoSent\.current=sessionScope;void sendMessage\(autoStarter\)/);
 assert.match(panel,/setNextReplies\(isFriend\?\(replyFallback\|\|parsed\?\.replies\|\|"fallback"\):null\)/);
 const urls=read("web-spa/src/fortune/FortuneZoeReading.tsx");
 assert.match(urls,/from=fortune&chat=text&quote=daily&chart=/);
 assert.match(urls,/"&kind="\+card\.kind/);
 assert.doesNotMatch(urls,/friendHref=.*(?:birthDate|birthTime|city|gender)/);
});
test("the 11 locales all define a clear continuation question and two existing fortune followups",()=>{
 const langs=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
 for(const lang of langs){
  const j=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/friends.json`));
  assert.ok(j.dailyFortuneContinue.length>8,lang);
  assert.doesNotMatch(j.dailyFortuneContinue,/\{\{|\}\}/,lang);
  assert.equal(Object.keys(j.dailyFortuneStarters).length,2,lang);
 }
});
test("guest system protects entire bounded fortune block and final language rule even with huge persona",()=>{
 const source=stripTypeScriptTypes(read("web-spa/src/live/textChatReplies.ts"),{mode:"strip"}).replace(/^export /gm,"");
 const scope={};vm.runInNewContext(source+"\nthis.guest=friendGuestSystem;",scope);
 const prompt="persona ".repeat(1300)+"\n"+"[ZOE DAILY FORTUNE HANDOFF — FIRST REPLY]\nReading (quoted data): unique-interpretation-987\n[/ZOE DAILY FORTUNE HANDOFF]\n[LANGUAGE RULE] Traditional Chinese";
 const truncated=scope.guest(prompt);
 assert.ok(truncated.length<=6000);
 assert.match(truncated,/unique-interpretation-987/);
 assert.match(truncated,/\[LANGUAGE RULE\] Traditional Chinese/);
 assert.match(truncated,/\[ZOE DAILY FORTUNE HANDOFF — FIRST REPLY\]/);
});
