const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const locales=["zh-TW","en","ja","es","pt-BR","id","ko","fr","de","vi","th"];

test("friend trial errors offer same-friend text before retry and demote API setup",()=>{
 const guest=read("web-spa/src/live/GuestLiveStarter.tsx");
 const friend=read("web-spa/src/friends/FriendLivePage.tsx");
 const render=guest.slice(guest.indexOf('return <div className="notice guest-live-entry"'));
 assert.match(friend,/alternateParams=new URLSearchParams\(params\)/);
 assert.match(friend,/alternateParams\.set\("chat","text"\)/);
 assert.match(friend,/const alternateHref="\/friend\/live\?"\+alternateParams\.toString\(\)/);
 assert.match(friend,/textFallback=\{\{href:alternateHref,name:friend\.name\}\}/);
 assert.match(guest,/textFallback\?:\{href:string;name:string\}/);
 assert.match(render,/phase==="error"&&textFallback&&<Link className="btn" to=\{textFallback\.href\}>\{t\("guestTrial\.chatByText",\{name:textFallback\.name\}\)\}<\/Link>/);
 const primary=render.indexOf('phase==="error"&&textFallback&&<Link');
 const retry=render.indexOf('phase==="error"&&<button className="btn secondary"');
 const guidance=render.indexOf('phase==="error"&&micPermissionDenied&&<p');
 const settings=render.indexOf('className="guest-live-key-link"');
 assert.ok(primary>0&&retry>primary&&guidance>retry&&settings>guidance);
 assert.match(render,/\(phase==="error"\|\|phase==="unavailable"\)&&<Link className="guest-live-key-link"/);
 assert.doesNotMatch(render,/t\("guestTrial\.setupKey"\)/);
 assert.doesNotMatch(render,/phase==="ready"&&[\s\S]*?role="alert"/);
});

test("microphone guidance appears only after denied getUserMedia; other callers need no text fallback",()=>{
 const guest=read("web-spa/src/live/GuestLiveStarter.tsx");
 const before=guest.slice(0,guest.indexOf("async function begin()"));
 const after=guest.slice(guest.indexOf("async function begin()"));
 assert.doesNotMatch(before,/getUserMedia\(/);
 assert.doesNotMatch(before,/navigator\.permissions/);
 assert.match(after,/navigator\.mediaDevices\.getUserMedia\(\{audio:true\}\)/);
 assert.match(after,/if\(denied\)\{[\s\S]*?setMicPermissionDenied\(true\)/);
 assert.match(guest,/phase==="error"&&micPermissionDenied&&<p/);
 for(const caller of ["web-spa/src/timeline/TimelineLivePage.tsx","web-spa/src/souls/SoulChat.tsx"]){
  assert.match(read(caller),/<GuestLiveStarter role="friend"/);
  assert.doesNotMatch(read(caller),/textFallback=/);
 }
});

test("all 11 locales have short, distinct guest-card text and text-chat labels",()=>{
 for(const locale of locales){
  const trial=JSON.parse(read(`web-spa/src/i18n/locales/${locale}/common.json`)).guestTrial;
  for(const key of ["homeDesc","chatByText","keySettingsLink"]){
   assert.equal(typeof trial[key],"string",`${locale}:${key}`);
   assert.ok(trial[key].length>=10,`${locale}:${key}`);
  }
  assert.doesNotMatch(trial.homeDesc,/Gemini/i);
  assert.doesNotMatch(trial.keySettingsLink,/Gemini/i);
  assert.match(trial.chatByText,/\{\{name\}\}/);
  assert.match(trial.homeDesc,/5/);
  assert.match(trial.setupKey,/Gemini/i,"keep existing AccountPage setupKey copy");
 }
});
