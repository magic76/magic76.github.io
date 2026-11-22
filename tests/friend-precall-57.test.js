import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8"),root="web-spa/src/";
const page=read(root+"friends/FriendLiveConversation.tsx");
const css=read(root+"friends/friendCall.css");
const gate=read(root+"live/GuestLiveStarter.tsx");
test("#57 pre-call canvas and header stay black, without a floating stage card",()=>{
 assert.match(page,/active\?" friend-phone-stage":" friend-precall-stage"/);
 for(const sel of ["html:has(.friend-precall-stage)","html:has(.friend-precall-stage) body","body:has(.friend-precall-stage) #root","body:has(.friend-precall-stage) .app-header"])assert.ok(css.includes(sel+"{"),sel);
 assert.match(css,/\.friend-precall-stage\{[^}]*background:#000;background-image:none;color:#f5f5f5;border:0;border-radius:0;box-shadow:none/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(read(root+"friends/useFriendTextViewport.ts"),/meta\.setAttribute\("content","#000"\)/);
});
test("#57 guest CTA is verification-gated and settings are secondary",()=>{
 assert.match(page,/GuestLiveStarter role="friend" precall/);
 assert.match(page,/FriendCallMenuTrigger active=\{true\}/);
 assert.match(page,/<FriendCallMenu inCall=\{active\}/);
 assert.match(gate,/disabled=\{!challenge\}/);
 for(const key of ["preCallSteps","preCallWaiting","preCallVerified","preCallStart"])assert.ok(gate.includes(key),key);
 assert.match(css,/\.guest-live-entry \.btn:disabled\{opacity:1/);
 assert.match(css,/\.guest-live-entry \.btn\{[^}]*min-height:54px/);
});
test("#57 desktop workspace opens after call start and only friend brand changes",()=>{
 assert.match(page,/active&&live\.micEnabled&&<DesktopLivePanel kind="friend"/);
 assert.match(read(root+"components/DesktopLivePanel.tsx"),/kind==="friend"\?"Koolo Friends"/);
 assert.ok(Buffer.byteLength(page)<=25500);
});
test("#57 all 11 voice locales have string-only pre-call labels",()=>{
 for(const lang of ["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"]){
  const voice=JSON.parse(read(root+"i18n/locales/"+lang+"/voice.json"));
  for(const key of ["preCallSteps","preCallWaiting","preCallVerified","preCallStart"])assert.equal(typeof voice.friendLive[key],"string",lang+"."+key);
 }
});
