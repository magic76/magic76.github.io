const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
const root="web-spa/src/";
const page=read(root+"friends/FriendLiveConversation.tsx");
const composer=read(root+"friends/FriendUnifiedComposer.tsx");
const starter=read(root+"live/GuestLiveStarter.tsx");
const css=read(root+"friends/friendUnifiedComposer.css");

test("#66: chat=text hides voice trial promotion while keeping verification",()=>{
 assert.match(page,/const textFirst=params\.get\("chat"\)==="text"/);
 assert.match(page,/friend-text-first-stage/);
 assert.match(page,/textEntry=\{textFirst\}/);
 assert.match(starter,/!textEntry&&phase!=="exhausted"/);
 assert.match(starter,/!textEntry&&<button ref=\{startButton\}/);
 assert.match(starter,/role==="friend"&&onTextGrant&&!textEntry&&<button/);
 assert.match(starter,/phase==="ready"&&<><div ref=\{host\}/);
 assert.match(page,/voiceParams\.delete\("chat"\)/);
 assert.match(page,/textFirst&&!active\?null/);
});
test("#66: typed message survives verification and uses a text-only Live grant",()=>{
 assert.match(composer,/pendingText\.current=text;autoSent\.current=true/);
 assert.match(composer,/onVerificationNeeded\?\.\(\)/);
 assert.match(composer,/verificationReady\?"friendLive\.connectingText":"friendLive\.verifyBeforeSend"/);
 assert.match(composer,/if\(!connected\|\|busy\|\|blocked\|\|!pendingText\.current\)return/);
 assert.match(composer,/const text=pendingText\.current;pendingText\.current="";void send\(text\)/);
 assert.match(composer,/live\.sendText\(text\)/);
 assert.match(starter,/textEntry&&autoTextOnVerified&&phase==="ready"&&challenge/);
 assert.match(starter,/void begin\(true\)/);
 assert.match(starter,/onVerificationChange\?\.\(true\)/);
 assert.match(starter,/onVerificationChange\?\.\(false\)/);
 assert.match(page,/onTextGrant=\{async grant=>\{setGuestStarted\(true\);setPendingTextStart\(false\);await live\.start\(grant,true\)\}\}/);
 assert.match(page,/pendingTextStart\|\|Boolean\(dailyHandoff&&fortuneContinue\)/);
 assert.match(composer,/if\(pendingText\.current\)setNotice\(t\(verificationReady/);
});
test("#66: non-text voice entry stays on the original guest gate",()=>{
 assert.match(composer,/if\(!onVerificationNeeded\)\{setNotice\(t\("guestTrial\.homeDesc"/);
 assert.match(page,/textEntry=\{textFirst\}/);
 assert.match(starter,/!textEntry&&<button ref=\{startButton\}/);
 assert.match(starter,/onClick=\{\(\)=>void begin\(\)\}/);
});
test("#66: 360 and 390 layouts scroll verification separately from the keyboard",()=>{
 assert.match(css,/\.friend-precall-stage\.friend-text-first-stage>\.guest-live-entry\{/);
 assert.match(css,/flex:1 1 auto;min-height:0;overflow-y:auto/);
 assert.match(css,/\.friend-precall-stage\.friend-text-first-stage>\.friend-unified-composer\{/);
 assert.match(css,/position:static;z-index:auto;flex:none/);
 assert.match(css,/--crew-friend-viewport-height/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 for(const file of ["friends/FriendLiveConversation.tsx","friends/FriendUnifiedComposer.tsx","live/GuestLiveStarter.tsx"])
  assert.ok(Buffer.byteLength(read(root+file))<26000,file);
});
test("#66: all 11 languages explain verification and queued sending",()=>{
 for(const lang of ["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"]){
  const voice=JSON.parse(read(root+"i18n/locales/"+lang+"/voice.json"));
  for(const key of ["verifyBeforeSend","connectingText"]){
   assert.equal(typeof voice.friendLive[key],"string",lang+"."+key);
   assert.ok(voice.friendLive[key].trim().length>=6,lang+"."+key);
  }
 }
 assert.equal(JSON.parse(read(root+"i18n/locales/zh-TW/voice.json")).friendLive.verifyBeforeSend,"請先完成驗證");
});
