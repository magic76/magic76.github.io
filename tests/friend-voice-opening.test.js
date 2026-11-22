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
  selectedQuestion:"",lifeOpening:"A new day",conversationHint:"Let's chat",conversationStyle:"one easy observation",creatureContext:"",...overrides});
}
test("voice opening starts a new conversation with no previous-chat handoff",()=>{
 const prompt=opening();
 assert.match(prompt,/\[FRIEND CONVERSATION\]/);
 assert.match(prompt,/Begin a NEW conversation as Zoe/);
 assert.match(prompt,/Introduce yourself naturally/);
 assert.match(prompt,/A new day/);
 assert.match(prompt,/Speak Mandarin/);
 assert.doesNotMatch(prompt,/\[TEXT-TO-VOICE HANDOFF\]|\[PREVIOUS TEXT CHAT\]|Pick up the subject/);
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
 assert.match(page,/<FriendChatHistory turns=\{live.turns\}/);
 assert.doesNotMatch(page,/VoiceTextRecap|useVoiceTextRecap|voiceTextContext|voiceRecapReady/);
 assert.match(page,/blocked=\{dailyLookupPending\}/);
 assert.ok(Buffer.byteLength(page)<26000);
 assert.ok(Buffer.byteLength(opener)<26000);
});
