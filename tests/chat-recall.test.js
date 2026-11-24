"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const transcript=read("web-spa/src/live/sessionTranscript.ts");
const panel=read("web-spa/src/live/TextChatPanel.tsx");
const page=read("web-spa/src/friends/FriendLiveConversation.tsx");
const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
function store(){
 const data=new Map();
 return {get length(){return data.size},key:index=>Array.from(data.keys())[index]??null,
  getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),
  removeItem:key=>data.delete(key)};
}
function api(local,tab){
 const scope={localStorage:local,sessionStorage:tab};
 const source=stripTypeScriptTypes(transcript,{mode:"strip"}).replace(/^export /gm,"");
 vm.runInNewContext(source+"\nObject.assign(this,{readSessionTranscript,writeSessionTranscript,clearLegacyFriendChats,readLatestFriendActivity,recordFriendActivity,readPendingTextDraft,writePendingTextDraft});",scope);
 return scope;
}
test("legacy friend messages and pending drafts are cleared, but teacher transcripts are preserved",()=>{
 const local=store(),tab=store(),h=api(local,tab);
 local.setItem("crew_friend_text_resume_v1",JSON.stringify([{friendId:"zoe",messages:[{role:"user",text:"old"}]}]));
 local.setItem("crew_friend_last_exchange_v1",JSON.stringify({friendId:"zoe",at:Date.now(),mode:"text"}));
 tab.setItem("crew_text_transcript_v1:friend:zoe",JSON.stringify([{role:"user",text:"old"}]));
 tab.setItem("crew_text_transcript_v1:friend:ada:post-1",JSON.stringify([{role:"assistant",text:"secret"}]));
 tab.setItem("crew_text_pending_v1:friend:zoe",JSON.stringify({text:"old draft",sent:false}));
 const teacher=[{role:"user",text:"Where is the station?"},{role:"assistant",text:"Straight ahead."}];
 tab.setItem("crew_text_transcript_v1:teacher:course:daily_u1_l1",JSON.stringify(teacher));
 tab.setItem("crew_text_pending_v1:teacher:course:daily_u1_l1",JSON.stringify({text:"teacher draft",sent:false}));
 h.clearLegacyFriendChats(local,tab);
 for(const key of ["crew_text_transcript_v1:friend:zoe","crew_text_transcript_v1:friend:ada:post-1","crew_text_pending_v1:friend:zoe"])
  assert.equal(tab.getItem(key),null,key);
 assert.equal(local.getItem("crew_friend_text_resume_v1"),null);
 assert.match(local.getItem("crew_friend_last_exchange_v1"),/"zoe"/);
 assert.deepEqual(Array.from(h.readSessionTranscript("teacher:course:daily_u1_l1"),m=>m.text),teacher.map(m=>m.text));
 assert.equal(h.readPendingTextDraft("teacher:course:daily_u1_l1").text,"teacher draft");
});
test("friend scopes never restore or persist texts even before cleanup",()=>{
 const local=store(),tab=store(),h=api(local,tab);
 const prior=[{role:"user",text:"Yesterday"},{role:"assistant",text:"Hello"}];
 tab.setItem("crew_text_transcript_v1:friend:zoe",JSON.stringify(prior));
 local.setItem("crew_friend_text_resume_v1",JSON.stringify([{friendId:"zoe",at:Date.now(),messages:prior}]));
 assert.equal(h.readSessionTranscript("friend:zoe").length,0);
 assert.equal(h.readSessionTranscript("friend:ada:shorts-1").length,0);
 h.writeSessionTranscript("friend:zoe",[{role:"user",text:"new"}]);
 assert.deepEqual(JSON.parse(tab.getItem("crew_text_transcript_v1:friend:zoe")),prior);
 h.writePendingTextDraft("friend:zoe",{text:"new",sent:false});
 assert.equal(h.readPendingTextDraft("friend:zoe"),null);
 assert.equal(tab.getItem("crew_text_pending_v1:friend:zoe"),null);
 h.writeSessionTranscript("teacher:course:daily_u1_l1",prior);
 assert.equal(h.readSessionTranscript("teacher:course:daily_u1_l1").length,2);
});
test("homepage deep-link uses only last active friend, never a legacy preview",()=>{
 const local=store(),tab=store(),h=api(local,tab);
 const old=[{role:"user",text:"private past"},{role:"assistant",text:"past reply"}];
 local.setItem("crew_friend_text_resume_v1",JSON.stringify([{friendId:"ada",at:Date.now()+1,messages:old}]));
 assert.equal(h.readLatestFriendActivity(local),null);
 h.recordFriendActivity("zoe","text",local);
 const pointer=h.readLatestFriendActivity(local);
 assert.equal(pointer.friendId,"zoe");assert.equal(pointer.mode,"text");assert.equal(pointer.resume,null);
 assert.doesNotMatch(local.getItem("crew_friend_last_exchange_v1"),/private past|past reply/);
});
test("unified friend page has no old recap, welcome-back, or prior-chat voice context",()=>{
 assert.match(page,/clearLegacyFriendChats\(\)/);
 assert.match(page,/buildFriendVoiceOpening\(/);
 assert.match(page,/<FriendUnifiedComposer live=\{live\}/);
 assert.match(page,/<FriendChatHistory turns=\{live.turns\}/);
 assert.doesNotMatch(page,/useVoiceTextRecap|VoiceTextRecap|voiceTextContext|voiceRecapReady|TEXT-TO-VOICE HANDOFF/);
 assert.doesNotMatch(panel,/readReturningFriendResume|returningFriendSystemHint|TextChatWelcomeBack|saveFriendResume|Previous conversation for continuity/);
 assert.match(panel,/if\(!isFriend\)writeSessionTranscript\(sessionScope,complete\)/);
 assert.match(panel,/if\(isFriend\)\{\s*clearLegacyFriendChats\(\)/);
 assert.ok(Buffer.byteLength(panel)<26000);
});

test("all 11 locale groups are string-only, complete and use matching interpolation",()=>{
 const groups=["ui","byok"],baseline={};
 for(const lang of locales){
  const voice=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/voice.json`));
  assert.equal(Object.keys(voice.guestText).length,25,lang+": guest quota keys");
  assert.equal(Object.keys(voice.textChat.followUps).length,3);
  assert.deepEqual(Object.keys(voice.textChat.learning).sort(),["better","checkButton","checkQuestion","dismiss","listen","modelDownloading","originalPrefix","save","savePhrase","saved","savedNote","savedShort","summaryTitle"]);
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
 
 assert.doesNotMatch(panel,/trackUsageEvent\(|trackEvent\(|analytics\.track\(/);
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
