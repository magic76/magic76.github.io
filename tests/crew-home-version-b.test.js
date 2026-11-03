const test=require("node:test"),assert=require("node:assert/strict");
const {readFileSync}=require("node:fs"),path=require("node:path");
const read=pathName=>readFileSync(path.join(__dirname,"..",pathName),"utf8");
const locales=["zh-TW","en","de","es","fr","id","ja","ko","pt-BR","th","vi"];

test("B: the one CTA has a Zoe portrait, honest per-role text and direct destinations",()=>{
 const src=read("web-spa/src/pages/HomePortal.tsx");
 assert.equal((src.match(/className="crew-portal-cta"/g)||[]).length,1);
 assert.match(src,/const ZOE="\/friend\/live\?id=zoe"/);
 assert.match(src,/const HOME_ZOE=ZOE\+"&from=home"/);
 assert.match(src,/const destination=exhausted\?"\/account#settings-gemini":shortsDestination\|\|/);
 assert.match(src,/const teacherDestination=exhausted\?"\/account#settings-gemini":"\/teacher\/live\?lesson=daily_u1_l1"/);
 assert.match(src,/to:"\/fortune\/reading\?mode=tarot"/);
 assert.match(src,/to:"\/games\/1a2b"/);
 assert.match(src,/trialAvailable=ready&&!hasKey&&trial.resolved&&trial.enabled&&trial.remaining!==0/);
 assert.match(src,/world.chatTrial/);assert.match(src,/world.chatNeutral/);assert.match(src,/world.teacherTrial/);
 assert.match(src,/src=\{"\/assets\/friends\/crew_friend_"\+\(selectedPost\?\.friendId\|\|friendId\)\+"\.webp"\} alt=""/);
 assert.match(src,/trackUsageEvent\("home_entry_click",exhausted/);
 assert.doesNotMatch(src,/guest_trial_start_click|navigator.mediaDevices|GUEST_TOKEN_ENDPOINT/);
});

test("B: intent warming and feedback are only UI/network hint, not privilege escalation",()=>{
 const src=read("web-spa/src/pages/HomePortal.tsx");
 const field=read("web-spa/src/pages/PortalParticleField.tsx");
 assert.match(src,/onPointerDown=\{mode==="chat"\?warmFriendStart:undefined\}/);
 assert.match(src,/onTouchStart=\{mode==="chat"\?warmFriendStart:undefined\}/);
 assert.match(src,/onFocus=\{mode==="chat"\?warmFriendStart:undefined\}/);
 assert.match(src,/onMouseEnter=\{mode==="chat"\?warmFriendStart:undefined\}/);
 assert.match(src,/import\("\.\.\/friends\/FriendLivePage"\)/);
 assert.match(src,/link.rel="preconnect";link.href="https:\/\/challenges.cloudflare.com"/);
 assert.match(src,/setPreparing\(true\)/);
 assert.match(src,/if\(!reduced\)setLaunching\(true\)/);
 assert.match(src,/launching=\{launching\}/);
 assert.match(src,/window.setTimeout\(\(\)=>navigate\(target\),120\)/);
 assert.match(field,/setLaunching\(launching\)/);
 const css=read("web-spa/src/pages/homePortal.css");
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.crew-portal-cta \.crew-portal-cta-label\{[^}]*overflow-wrap:break-word/);
});

test("B: homepage referrals frontload the existing manual guest gate, focus only after validation",()=>{
 const live=read("web-spa/src/friends/FriendLivePage.tsx");
 const starter=read("web-spa/src/live/GuestLiveStarter.tsx");
 assert.match(live,/params.get\("from"\)==="home"&&HOME_FRIEND_IDS.includes\(params.get\("id"\)\|\|""\)&&!shortsPost&&!textMode&&!geminiKey\(\)/);
 const identity=live.indexOf('className="live-identity"'),first=live.indexOf('homeFirstAction?<div className="friend-shorts-first-action"'),switcher=live.indexOf('className="friend-language-switch"');
 assert.ok(identity>=0&&identity<first&&first<switcher);
 assert.match(live,/!shortsPost&&!homeFirstAction\?voiceStart:null/);
 assert.match(live,/focusStartOnVerified=\{homeFirstAction\}/);
 assert.match(starter,/phase==="ready"&&challenge\)startButton.current\?\.focus\(\{preventScroll:true\}\)/);
 assert.match(starter,/<button ref=\{startButton\} type="button" className="btn" disabled=\{!challenge\} onClick=\{\(\)=>void begin\(\)\}\>/);
 assert.match(starter,/async function begin\(\)/);
 assert.match(starter,/getUserMedia\(\{audio:true\}\)/);
});

test("B: all eleven locales translate the new promise and first-gesture copy",()=>{
 for(const locale of locales){
  const world=JSON.parse(read(`web-spa/src/i18n/locales/${locale}/home.json`)).world;
  for(const key of ["chatTrial","chatNeutral","teacherTrial","preparing"])
   assert.ok(typeof world[key]==="string"&&world[key].trim(),locale+":"+key);
  for(const mode of ["learn","fortune","play"])
   assert.ok(world.modes[mode].cta.trim(),locale+":"+mode);
  assert.match(world.chatTrial,/5/);assert.match(world.teacherTrial,/5/);
 }
});
