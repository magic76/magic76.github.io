const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const locales=JSON.parse(read("config/ui-locales.json")).locales.map(x=>x.code);

// These are source guards: Workers and Live session control flow are untouched.
test("DAILY_LIMIT means shared capacity full, not personal consumption",()=>{
 const src=read("web-spa/src/live/GuestLiveStarter.tsx");
 assert.match(src,/data\.code==="ALREADY_USED"\)setPhase\("exhausted"\)/);
 assert.match(src,/data\.code==="DAILY_LIMIT"\)setPhase\("full"\)/);
 assert.doesNotMatch(src,/data\.code==="ALREADY_USED"\|\|data\.code==="DAILY_LIMIT"/);
 assert.match(src,/!signedIn&&!config\.signinRequired&&config\.trial&&config\.trial\.used>=config\.trial\.limit\)\{setPhase\("exhausted"\);return\}/);
 const render=src.slice(src.indexOf('return <div className="notice guest-live-entry"'));
 assert.match(render,/aria-label=\{phase==="full"\?t\("guestTrial.limit"\)/);
 assert.match(render,/phase!=="exhausted"&&phase!=="full"&&<>/);
 const full=render.match(/\{phase==="full"&&[\s\S]*?\}\n/);
 assert.ok(full,"a distinct full status is rendered");
 assert.match(full[0],/role="status"/);
 assert.match(full[0],/guestTrial\.limit/);
 assert.doesNotMatch(full[0],/guestTrial\.(?:usedUpTitle|used)"/);
 assert.match(render,/\(phase==="exhausted"\|\|phase==="full"\)&&<>/);
 assert.equal((render.match(/t\("guestTrial.continueKey"\)/g)||[]).length,1);
 assert.equal((render.match(/t\("guestTrial.free1a2b"\)/g)||[]).length,1);
 const retryButton=render.match(/phase==="error"&&<button\b[\s\S]*?<\/button>/)?.[0];
 assert.ok(retryButton,"error state still has a retry button");
 assert.match(retryButton,/canRetryGuestMicrophone\(/,"microphone retry uses the permission retry path");
 assert.match(retryButton,/micUnavailable\?"guestTrial\.retryMic":"guestTrial\.retry"/,
  "microphone denial says retry microphone permission rather than reverify");
 assert.doesNotMatch(render,/phase==="full"&&<button/);
 assert.match(src,/data\.seconds!==300/);
 assert.match(src.slice(src.indexOf("async function begin()")),/getUserMedia\(\{audio:true\}\)/);
 assert.match(src.slice(src.indexOf("callback:token=>"),src.indexOf("async function begin()")),/void ensureLive\(\)\.catch/);
});

test("members receive account quota copy; anonymous users get device copy",()=>{
 const src=read("web-spa/src/live/GuestLiveStarter.tsx");
 assert.match(src,/if\(isSignedIn\)\{setRemaining\(null\);setQuotaLimit\(null\)\}/);
 assert.match(src,/if\(isSignedIn&&typeof used==="number"&&typeof limit==="number"/);
 assert.match(src,/memberSignedIn\?\(quotaLimit!==null\?t\("guestTrial.usedMember",\{limit:quotaLimit\}\):t\("guestTrial.usedMemberNoCount"\)\):t\("guestTrial.used"\)/);
 for(const lang of locales){
  const strings=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/common.json`)).guestTrial;
  for(const k of ["used","usedMember","usedMemberNoCount","memberRemaining","limit"]){
   assert.ok(strings[k]&&typeof strings[k]==="string",`${lang}:${k}`);
  }
  assert.deepEqual([...strings.usedMember.matchAll(/\{\{([^}]+)\}\}/g)].map(m=>m[1]),["limit"],`${lang} member tokens`);
  assert.doesNotMatch(strings.usedMemberNoCount,/\{\{/);
  assert.deepEqual([...strings.memberRemaining.matchAll(/\{\{([^}]+)\}\}/g)].map(m=>m[1]),["count","limit"],`${lang} daily remaining tokens`);
  const auth=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/common.json`)).auth;
  assert.deepEqual([...auth.trialCount.matchAll(/\{\{([^}]+)\}\}/g)].map(m=>m[1]),["used","limit"],`${lang} daily count tokens`);
 }
});

test("trial finish takes a teacher name and keeps friend ID fallback",()=>{
 const finish=read("web-spa/src/live/GuestTrialExperience.tsx");
 const teacher=read("web-spa/src/teacher/LivePage.tsx");
 const friend=read("web-spa/src/friends/FriendLivePage.tsx");
 assert.match(finish,/GuestTrialFinish\(\{expired,failed,name\}:\{expired:boolean;failed:boolean;name\?:string\}\)/);
 assert.match(finish,/const displayName=name\|\|\(isFriend&&friendId\?getCrewFriend\(friendId\)\.name:t\("guestTrial.aiFriend"\)\)/);
 assert.match(finish,/completeTitle",\{name:displayName\}/);
 assert.match(teacher,/<GuestTrialFinish expired=\{live\.guestExpired\} failed=\{live\.state==="error"\} name=\{profile\.name\}\/>/);
 assert.match(friend,/<GuestTrialFinish expired=\{live\.guestExpired\}/);
 assert.ok(Buffer.byteLength(teacher)<26000,"LivePage must stay under 26 KB");
 assert.equal(JSON.parse(read("web-spa/src/i18n/locales/en/common.json")).guestTrial.aiFriend,"an AI friend");
 for(const lang of locales)assert.ok(JSON.parse(read(`web-spa/src/i18n/locales/${lang}/common.json`)).guestTrial.aiFriend);
});

test("hero fills the viewport with accessible manual tabs",()=>{
 const css=read("web-spa/src/pages/homePortal.css");
 const home=read("web-spa/src/pages/home.css");
 assert.match(css,/calc\(100svh - 58px - var\(--nav-h\) - env\(safe-area-inset-bottom\)\)/);
 assert.match(css,/calc\(100vh - 58px - var\(--nav-h\) - env\(safe-area-inset-bottom\)\)/);
 assert.match(css,/\.crew-home-portal\{[^}]*display:grid/);
 assert.match(css,/\.crew-portal-content\{position:relative/);
 assert.doesNotMatch(css,/\.crew-portal-content\{position:absolute/);
 assert.doesNotMatch(home,/\.crew-home \.crew-home-portal\{height:clamp/);
 assert.match(css,/\.crew-portal-tab\{[^}]*min-height:(?:4[4-9]|[5-9][0-9])px/);
 assert.match(css,/\.crew-portal-cta\{[^}]*min-height:(?:4[4-9]|[5-9][0-9])px/);
 assert.match(css,/:focus-visible/);
 assert.doesNotMatch(css,/\.crew-portal-picks-links|\.crew-portal-game-link/);
});

test("vocabulary warm-up text is free, not a Key or API instruction, in all locales",()=>{
 const coordinator=read("web-spa/src/teacher/learningCoordinator.ts");
 assert.match(coordinator,/先用免費單字練習暖身。/);
 assert.doesNotMatch(coordinator,/先用免 Key 單字練習暖身/);
 for(const lang of locales){
  const note=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/lesson.json`)).learnToday.vocabularyNote;
  assert.ok(note&&typeof note==="string",lang);
  assert.doesNotMatch(note,/key|api|キー|키|clé|chave|clave|Schlüssel|kunci|khóa|คีย์/iu,`${lang}: no API-key claim`);
 }
});

test("friend live footnote is guarded by the explicit 12px minimum",()=>{
 const css=read("web-spa/src/friends/friends.css"),fontTest=read("tests/site-min-font.test.js");
 assert.match(css,/\.friend-live-footnote\{font-size:12px\}/);
 assert.match(fontTest,/"web-spa\/src\/friends\/friends\.css": \["\.friend-live-footnote"\]/);
 const shared=fontTest.slice(fontTest.indexOf("const shared = ["),fontTest.indexOf("];",fontTest.indexOf("const shared = [")));
 assert.doesNotMatch(shared,/friends\/friends\.css/);
});
