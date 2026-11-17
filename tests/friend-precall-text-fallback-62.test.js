const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=path=>fs.readFileSync(path,"utf8");
const root="web-spa/src/";
const starter=read(root+"live/GuestLiveStarter.tsx");
const friend=read(root+"friends/FriendLivePage.tsx");
const styles=read(root+"friends/friendCall.css");

test("#62: unverified pre-call keeps the gated voice action and exposes same-friend text",()=>{
 assert.match(friend,/alternateParams\.set\("chat","text"\)/);
 assert.match(friend,/textFallback=\{\{href:alternateHref,name:friend\.name\}\}/);
 assert.match(starter,/disabled=\{!challenge\}/);
 assert.match(starter,/precall&&role==="friend"&&textFallback/);
 for(const phase of ["checking","ready","unavailable"])assert.ok(starter.includes('phase==="'+phase+'"'),phase);
 assert.match(starter,/className="btn secondary friend-precall-text-fallback"/);
 assert.match(starter,/to=\{textFallback\.href\}/);
 assert.doesNotMatch(starter.slice(starter.indexOf('precall&&role==="friend"'),starter.indexOf('phase==="starting"&&<p')),/offerGuestChallengeToken|begin\(/);
});

test("#62: error fallback stays secondary except for the existing microphone recovery",()=>{
 assert.match(starter,/phase==="error"&&textFallback&&<Link/);
 assert.match(starter,/precall&&!micUnavailable\?"btn secondary friend-precall-text-fallback":"btn"/);
 assert.match(starter,/offerGuestChallengeToken\(challenge\)/);
 assert.match(starter,/voice:friendLive\.preCallTextFallback/);
 assert.match(styles,/\.friend-precall-stage \.guest-live-entry \.friend-precall-text-fallback/);
});

test("#62: all 11 locale labels are string leaves with the friend's name",()=>{
 for(const lang of ["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"]){
  const voice=JSON.parse(read(root+"i18n/locales/"+lang+"/voice.json"));
  const label=voice.friendLive.preCallTextFallback;
  assert.equal(typeof label,"string",lang);
  assert.ok(label.includes("{{name}}"),lang);
 }
});
