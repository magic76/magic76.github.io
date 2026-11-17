"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const transcript=read("web-spa/src/live/sessionTranscript.ts");
const panel=read("web-spa/src/live/TextChatPanel.tsx");
const widget=read("web-spa/src/live/TextChatWelcomeBack.tsx");
const css=read("web-spa/src/live/TextChatPanel.css");
const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
const store=()=>{const memory=new Map();return{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)}};
function api(local,tab){
 const scope={localStorage:local,sessionStorage:tab};
 const source=stripTypeScriptTypes(transcript,{mode:"strip"}).replace(/^export /gm,"");
 vm.runInNewContext(source+"\nObject.assign(this,{readReturningFriendResume,returningFriendSystemHint,readSessionTranscript,writeSessionTranscript});",scope);
 return scope;
}
function seed(local,minutes=180){
 const at=Date.now()-minutes*60000;
 const messages=[{role:"user",text:"I plan to visit Tokyo and try all the local ramen shops next month, especially a long noodle tour"},{role:"assistant",text:"That sounds fun!"}];
 local.setItem("crew_friend_text_resume_v1",JSON.stringify([{friendId:"zoe",at,messages,preview:"That sounds fun!"}]));
 return messages;
}
test("only a sufficiently old, completed device resume triggers a friend greeting",()=>{
 const local=store(),tab=store(),h=api(local,tab),previous=seed(local);
 const visit=h.readReturningFriendResume("friend:zoe");
 assert.equal(typeof visit.excerpt,"string");assert.ok(visit.excerpt.length<=41);
 assert.ok(visit.excerpt.includes("Tokyo"));assert.ok(visit.minutes>=179);
 assert.deepEqual(Array.from(h.readSessionTranscript("friend:zoe"),m=>m.text),previous.map(m=>m.text));
 assert.equal(h.readReturningFriendResume("friend:zoe:daily:hash"),null);
 assert.equal(h.readReturningFriendResume("friend:zoe:shorts-7"),null);
 assert.equal(h.readReturningFriendResume("teacher:zoe"),null);
 assert.equal(h.readReturningFriendResume(""),null);
 assert.equal(h.readReturningFriendResume("friend:ada"),null);
 seed(local,29);assert.equal(h.readReturningFriendResume("friend:zoe"),null);
 seed(local,30);assert.ok(h.readReturningFriendResume("friend:zoe"));
 h.writeSessionTranscript("friend:zoe",previous);
 assert.equal(h.readReturningFriendResume("friend:zoe"),null,"same-tab reload cannot greet again");
});
test("welcome bubble is UI-only and never persisted or sent as an assistant turn",()=>{
 const local=store(),tab=store(),h=api(local,tab);seed(local);
 const visit=h.readReturningFriendResume("friend:zoe");
 assert.ok(visit);
 const before=local.getItem("crew_friend_text_resume_v1");
 h.writeSessionTranscript("friend:zoe",h.readSessionTranscript("friend:zoe"));
 assert.equal(local.getItem("crew_friend_text_resume_v1"),before);
 assert.doesNotMatch(tab.getItem("crew_text_transcript_v1:friend:zoe"),/Welcome back|歡迎回來/);
 assert.match(widget,/crew-text-chat-message assistant crew-text-return-greeting/);
 assert.match(widget,/t\("textChat\.resume\.greeting",\{excerpt:visit\.excerpt\}\)/);
 assert.doesNotMatch(widget,/dangerouslySetInnerHTML|fetch\(|writeSessionTranscript|saveFriendResume/);
 assert.match(panel,/readReturningFriendResume\(sessionScope\)/);
 assert.match(panel,/readSessionTranscript\(sessionScope\)/);
 assert.match(panel,/writeSessionTranscript\(sessionScope,complete\)/);
 assert.match(panel,/saveFriendResume\(sessionScope,complete\)/);
});
test("return actions require a click and use the existing guarded send path",()=>{
 assert.match(widget,/onClick=\{\(\)=>onPick\(t\("textChat\.resume\.continueMessage"\)\)\}/);
 assert.match(widget,/onClick=\{\(\)=>onPick\(t\("textChat\.resume\.newMessage"\)\)\}/);
 assert.match(panel,/onPick=\{message=>void sendMessage\(message\)\}/);
 assert.match(panel,/if\(!value\|\|busy\)return/);
 assert.match(panel,/setReturnChoices\(false\)/);
 assert.match(panel,/if\(value\)\{setNextReplies\(null\);setReturnChoices\(false\)\}/);
 assert.match(panel,/pendingSend\.current=\{before:messages,value,sent:false\}/);
 assert.match(panel,/sendGuestTextWithRenewal\(/);
 assert.match(panel,/const challengeToken=await waitForChallenge\(\)/);
 assert.match(panel,/const key=guestMode\?"":geminiKey\(\)/);
 assert.match(panel,/!returnVisit&&!busy&&!draft\.trim\(\)/);
 assert.match(css,/\.crew-text-return-actions button\{[^}]*min-height:44px/);
 assert.match(css,/\.crew-text-keyboard-open \.crew-text-return-actions\{display:none\}/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test("RETURNING instruction is short, lives in the system for both routes, and clears on success",()=>{
 const h=api(store(),store());const hint=h.returningFriendSystemHint({at:Date.now()-7200000,minutes:120,excerpt:"ramen"});
 assert.match(hint,/\[RETURNING USER\]/);assert.ok(hint.length<=300,hint.length);
 assert.match(panel,/const returningSystem=system\+\(returnVisit\?"\\n"\+returningFriendSystemHint\(returnVisit\):""\)/);
 assert.match(panel,/new LiveTextConversation\(prior\?returningSystem\+/);
 assert.match(panel,/const guestBase=shortsSystems\?\.guest\?\?\(isFriend\?returningSystem/);
 assert.match(panel,/friendGuestSystem\(guestBase\+easyFriendTextReplyRule\(guestBase,isFriend\)\)/);
 assert.match(panel,/if\(returningHint\)\{setReturnVisit\(null\);liveChat\.current\?\.close\(\);liveChat\.current=null;\}/);
 assert.ok(panel.indexOf("setReturnVisit(null);liveChat.current?.close()")>panel.indexOf("await reveal.finish(reply)"));
 assert.doesNotMatch(widget,/useEffect|sendMessage|autoStarter/);
});
test("all 11 locale groups are string-only, complete and use matching interpolation",()=>{
 const groups=["ui","resume","byok"],baseline={};
 for(const lang of locales){
  const voice=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/voice.json`));
  assert.equal(Object.keys(voice.guestText).length,25,lang+": guest quota keys");
  assert.equal(Object.keys(voice.textChat.followUps).length,3);
  assert.deepEqual(Object.keys(voice.textChat.learning).sort(),["better","checkButton","checkQuestion","dismiss","summaryTitle"]);
  for(const group of groups){
   const values=voice.textChat[group];assert.ok(values,lang+"."+group);
   const keys=Object.keys(values).sort();if(!baseline[group])baseline[group]=keys;else assert.deepEqual(keys,baseline[group]);
   for(const [key,value] of Object.entries(values)){
    assert.ok(typeof value==="string"&&value.trim(),`${lang}.${group}.${key}`);
    const tokens=(value.match(/\{\{[^}]+\}\}/g)||[]).sort().join(",");
    if(!Object.hasOwn(baseline,group+key))baseline[group+key]=tokens;else assert.equal(tokens,baseline[group+key],`${lang}.${group}.${key}`);
   }
  }
 }
 assert.doesNotMatch(panel,/english\s*\?\s*["'`]/);
 assert.match(panel,/t\("textChat\.ui\.notSent"\)/);
 assert.match(panel,/t\("textChat\.ui\.freeDaily",\{count:GUEST_TEXT_DAILY_TURNS\}\)/);
 assert.match(panel,/textChatByokMessage\(category,type,t\)/);
 assert.ok(Buffer.byteLength(panel)<26000);
 assert.ok(Buffer.byteLength(widget)<26000);
 assert.doesNotMatch(panel+widget,/trackUsageEvent\(|trackEvent\(|analytics\.track\(/);
});
test("daily templates quote full card actions rather than embedding imperatives into grammar",()=>{
 for(const lang of locales){
  const fallback=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/fortuneDaily.json`)).zoeReading.fallback;
  const tokens=[...fallback.matchAll(/\{\{([^}]+)\}\}/g)].map(m=>m[1]).sort();
  assert.deepEqual(tokens,["avoid","color","do","headline","kind","theme"]);
  for(const key of ["do","avoid"]){const pos=fallback.indexOf(`{{${key}}}`);assert.ok(pos>0,lang+" "+key);assert.ok("“„«「‘".includes(fallback.slice(Math.max(0,pos-2),pos).trim().slice(-1)),lang+" opening quote "+key);assert.ok("”»」’“".includes(fallback.slice(pos+key.length+4,pos+key.length+6).trim().slice(0,1)),lang+" closing quote "+key)}
 }
 const en=JSON.parse(read("web-spa/src/i18n/locales/en/fortuneDaily.json")).zoeReading.fallback;
 assert.doesNotMatch(en,/(?:try|go easy on)\s+\{\{(?:do|avoid)\}\}/i);
});
