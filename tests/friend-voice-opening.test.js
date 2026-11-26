"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
const page=read("web-spa/src/friends/FriendLiveConversation.tsx");
const opener=read("web-spa/src/live/friendVoiceOpening.ts");
function opening(overrides={}){
 const source=stripTypeScriptTypes(opener,{mode:"strip"}).replace(/^import .*;\r?\n/g,"").replace(/^export /gm,"");
 const context={shortsOpeningHint:()=>"[SHORTS HOOK]",shortsQuestionOpeningHint:()=>"[QUESTION]"};
 vm.runInNewContext(source+"\nthis.build=buildFriendVoiceOpening;",context);
 return context.build({name:"Zoe",languageDirective:"Speak Mandarin",shortsPost:false,shortsHook:null,
  selectedQuestion:"",lifeOpening:"A new day",conversationHint:"Let's chat",conversationStyle:"one easy observation",creatureContext:"",
  returning:false,verifiedTopic:false,crossDay:false,...overrides});
}
test("first verified visit does not manufacture prior conversations",()=>{
 const prompt=opening();
 assert.match(prompt,/\[FRIEND CONVERSATION — SAME CHARACTER, NEW LIVE CONNECTION\]/);
 assert.match(prompt,/no verified earlier two-sided conversation/i);
 assert.match(prompt,/without inventing familiarity/i);
 assert.match(prompt,/A new day/);
 assert.match(prompt,/Speak Mandarin/);
 assert.doesNotMatch(prompt,/Begin a NEW conversation|Introduce yourself naturally|\[PREVIOUS TEXT CHAT\]/);
});
test("returning voice learner is recognized without pretending topic recall",()=>{
 const prompt=opening({returning:true,crossDay:true});
 assert.match(prompt,/real two-sided conversation/i);
 assert.match(prompt,/later calendar day/i);
 assert.match(prompt,/never reintroduce yourself/i);
 assert.match(prompt,/do not claim to recall any previous topic/i);
 assert.doesNotMatch(prompt,/yesterday|previous text chat/i);
});
test("verified same-friend notes may guide continuity, never fabricated events",()=>{
 const prompt=opening({returning:true,verifiedTopic:true});
 assert.match(prompt,/Verified same-character topic notes/);
 assert.match(prompt,/MAY naturally refer to ONE/);
 assert.match(prompt,/do not assume it was yesterday/);
 assert.match(prompt,/invent its outcome/i);
});
test("Shorts and creature prompts still work without any saved transcript",()=>{
 const shorts=opening({shortsPost:true,creatureContext:"[CREATURE STAGE]"});
 assert.match(shorts,/\[FRIEND POST REACTION\]/);
 assert.match(shorts,/\[SHORTS HOOK\]\[QUESTION\]/);
 assert.match(shorts,/\[CREATURE STAGE\]/);
 assert.doesNotMatch(shorts,/\[PREVIOUS TEXT CHAT\]/);
});
test("unified friend page never mounts recap or delays start waiting for one",()=>{
 assert.match(page,/clearLegacyFriendChats\(\)/);
 assert.match(page,/openingPrompt:languageDirective/);
 assert.match(page,/<FriendUnifiedComposer live=\{live\}/);
 assert.match(page,/<FriendChatHistory turns=\{live\.captionTurns\}/);
 assert.doesNotMatch(page,/VoiceTextRecap|useVoiceTextRecap|voiceTextContext|voiceRecapReady/);
 assert.match(page,/blocked=\{dailyLookupPending\}/);
 assert.ok(Buffer.byteLength(page)<26000);
 assert.ok(Buffer.byteLength(opener)<26000);
});
