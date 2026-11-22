const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const locales=["zh-TW","en","ja","es","pt-BR","id","ko","fr","de","vi","th"];

test("friend guest can use verified text-first Live without microphone; teacher fallback remains unchanged",()=>{
 const guest=read("web-spa/src/live/GuestLiveStarter.tsx");
 const friend=read("web-spa/src/friends/FriendLiveConversation.tsx");
 assert.match(friend,/onTextGrant=\{async grant=>/);
 assert.doesNotMatch(friend,/alternateParams|textFallback=/);
 assert.match(guest,/onTextGrant\?:\(grant:GuestTrialGrant\)=>Promise<void>/);
 assert.match(guest,/if\(!textOnly\)\{/);
 assert.match(guest,/await \(textOnly&&onTextGrant\?onTextGrant:onGrant\)\(data\)/);
 assert.match(guest,/phase==="error"&&role==="friend"&&onTextGrant&&challenge/);
 assert.match(guest,/disabled=\{!challenge\}/);
});

test("teacher lesson error prefers same-teacher text practice, except Fortune",()=>{
 const teacher=read("web-spa/src/teacher/LivePage.tsx");
 const guest=read("web-spa/src/live/GuestLiveStarter.tsx");
 assert.match(teacher,/const alternateParams=new URLSearchParams\(p\)/);
 assert.match(teacher,/alternateParams\.set\("chat","text"\)/);
 assert.match(teacher,/const alternateHref="\/teacher\/live\?"\+alternateParams\.toString\(\)/);
 assert.match(teacher,/<GuestLiveStarter role="teacher" textFallback=\{p\.has\("fortune"\)\?undefined:\{href:alternateHref,name:profile\.name\}\}/);
 assert.match(teacher,/const fortuneKind:FortuneSpeakingKind\|null=p\.get\("fortune"\)/);
 assert.match(guest,/role==="teacher"\?"guestTrial\.practiceByText":"guestTrial\.chatByText"/);
 assert.doesNotMatch(teacher,/textFallback=\{fortuneKind\?/);
 const query=new URLSearchParams("mode=course&lesson=daily_u1_l1&teacher=emma&fortune=other");
 query.set("chat","text");
 assert.equal("/teacher/live?"+query.toString(),"/teacher/live?mode=course&lesson=daily_u1_l1&teacher=emma&fortune=other&chat=text");
});

test("microphone guidance appears only after denied getUserMedia; other callers need no text fallback",()=>{
 const guest=read("web-spa/src/live/GuestLiveStarter.tsx");
 const before=guest.slice(0,guest.indexOf("async function begin(textOnly=false)"));
 const after=guest.slice(guest.indexOf("async function begin(textOnly=false)"));
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
  for(const key of ["homeDesc","chatByText","practiceByText","keySettingsLink"]){
   assert.equal(typeof trial[key],"string",`${locale}:${key}`);
   assert.ok(trial[key].length>=10,`${locale}:${key}`);
  }
  assert.doesNotMatch(trial.homeDesc,/Gemini/i);
  assert.doesNotMatch(trial.keySettingsLink,/Gemini/i);
  assert.match(trial.chatByText,/\{\{name\}\}/);
  assert.match(trial.practiceByText,/\{\{name\}\}/);
  assert.notEqual(trial.practiceByText,trial.chatByText);
  assert.match(trial.homeDesc,/5/);
  assert.match(trial.setupKey,/Gemini/i,"keep existing AccountPage setupKey copy");
 }
});
