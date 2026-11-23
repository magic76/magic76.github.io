const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=path=>fs.readFileSync(path,"utf8");
const page=read("web-spa/src/friends/FriendLiveConversation.tsx");
const starter=read("web-spa/src/live/GuestLiveStarter.tsx");
const styles=read("web-spa/src/friends/friendCall.css");

test("#68: voice pre-call never mounts the sticky composer over its gate buttons",()=>{
 // The phone layout is activated by a running/connecting Live session, not by screen width.
 assert.match(page,/const active=\["requesting-mic","connecting","listening","speaking","ending","reporting"\]\.includes\(live\.state\)/);
 assert.match(page,/active\?" friend-phone-stage":" friend-precall-stage"/);
 assert.match(page,/const textFirst=params\.get\("chat"\)==="text"/);
 // The composer is mounted for chat=text before a session, and for any ongoing call.
 // On the ordinary voice entry it must NOT exist while the verification CTAs are shown.
 assert.match(page,/\{\(textFirst\|\|active\)&&<FriendUnifiedComposer\b/);
 assert.equal((page.match(/<FriendUnifiedComposer\b/g)||[]).length,1);
 assert.match(starter,/!textEntry&&<button ref=\{startButton\}[^>]*disabled=\{!challenge\}/);
 assert.match(starter,/role==="friend"&&onTextGrant&&!textEntry&&<button/);
 assert.match(styles,/\.friend-precall-stage \.guest-live-entry \.btn\{[^}]*min-height:54px/);
 assert.match(styles,/\.friend-precall-stage \.guest-live-entry \.btn\.secondary,[^{]*\{[^}]*min-height:44px/);
});

test("#68: text-first and active-call paths keep their existing unified input",()=>{
 assert.match(page,/textEntry=\{textFirst\}/);
 assert.match(page,/onVerificationNeeded=\{textFirst\?\(\)=>setPendingTextStart\(true\):undefined\}/);
 assert.match(page,/onTextGrant=\{async grant=>\{setGuestStarted\(true\);setPendingTextStart\(false\);await live\.start\(grant,true\)\}\}/);
 assert.match(page,/\{active\?<FriendCallCaptions\b/);
 // Connected sessions still switch from the pre-call to phone-stage class.
 assert.match(page,/active\?" friend-phone-stage":" friend-precall-stage"/);
});
