"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
function subject(){
 const src=fs.readFileSync("web-spa/src/teacher/conversationIntent.ts","utf8");
 const compiled=stripTypeScriptTypes(src,{mode:"strip"}).replace(/\bexport\s+(?=function)/g,"");
 const exports={};
 vm.runInNewContext(compiled+"\nObject.assign(exports,{conversationIntent,conversationOpening});",{exports});
 return exports;
}
test("only whitelisted intent and role combinations enter Live",()=>{
 const {conversationIntent:p}=subject();
 assert.equal(p("share","friend"),"share");
 assert.equal(p("speak","friend"),"speak");
 assert.equal(p("continue","teacher"),"continue");
 assert.equal(p("continue","friend"),null);
 assert.equal(p("share","teacher"),null);
 assert.equal(p("invent-a-story","friend"),null);
});
test("friend remains friend without manufactured memories",()=>{
 const {conversationOpening:o}=subject();
 assert.match(o("share","friend"),/do not claim to know|invent earlier chats/i);
 assert.match(o("speak","friend"),/NOT a test or forced timer/);
 assert.match(o("speak","friend"),/without sentence-by-sentence corrections/);
});
test("teacher continuation is evidence-based with an empty-memory fallback",()=>{
 const {conversationOpening:o}=subject();
 assert.match(o("continue","teacher"),/verified learner memory/);
 assert.match(o("continue","teacher"),/If no verified prior focus exists/);
 assert.equal(o(null,"friend"),"");
});
test("home entry and session overrides are wired and cannot overwrite saved mode",()=>{
 const home=fs.readFileSync("web-spa/src/teacher/PracticePage.tsx","utf8");
 const chat=fs.readFileSync("web-spa/src/pages/CrewSectionPage.tsx","utf8");
 const friendCards=fs.readFileSync("web-spa/src/friends/FriendIntentCards.tsx","utf8");
 const friend=fs.readFileSync("web-spa/src/friends/FriendLiveConversation.tsx","utf8");
 const teacher=fs.readFileSync("web-spa/src/teacher/LivePage.tsx","utf8");
 assert.ok(home.includes("intent=continue"));
 assert.ok(chat.includes("<FriendIntentCards/>"));
 for(const q of ["intent=share","intent=speak"])assert.ok(friendCards.includes(q));
 // /chat stays primary; /teacher retains a small working parity escape hatch
 // until Android publishes an updated canonical contract.
 for(const q of ["&intent=share","&intent=speak"])assert.ok(home.includes(q));
 assert.ok(home.includes('to="/chat"'));
 assert.ok(home.includes('crew-practice-friend-links'));
 assert.match(friend,/intent==="speak"&&saved==="natural"\?"bilingual":saved/);
 assert.match(friend,/conversationOpening\(intent,"friend"\)/);
 assert.match(teacher,/conversationOpening\(intent,"teacher"\)/);
 assert.match(teacher,/conversationMode:intent==="continue"\?"natural":s\.conversationMode/);
});
