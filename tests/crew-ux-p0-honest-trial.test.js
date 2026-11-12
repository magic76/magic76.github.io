const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("Home tabs retain one SSR-safe, honest chat CTA and trial gates",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx"),home=read("web-spa/src/pages/HomePage.tsx");
 const css=read("web-spa/src/pages/homePortal.css");
 assert.match(portal,/const ZOE="\/friend\/live\?id=zoe"/);
 assert.equal((portal.match(/className="crew-portal-cta"/g)||[]).length,1);
 assert.match(portal,/const hasKey=ready&&Boolean\(geminiKey\(\)\)/);
 assert.match(portal,/const exhausted=ready&&!hasKey&&trial.resolved&&trial.enabled&&trial.remaining===0/);
 assert.match(portal,/const destination=exhausted\?"\/account#settings-gemini":shortsDestination\|\|/);
 assert.match(portal,/const trialAvailable=ready&&!hasKey&&trial.resolved&&trial.enabled&&trial.remaining!==0/);
 assert.match(portal,/const cta=hasKey\?"world.chatWithFriend":exhausted\?"world.chatExhausted":trialAvailable\?"world.chatTrialWith":"world.chatNeutralWith"/);
 assert.match(portal,/to=\{target\}/);
 const rail=read("web-spa/src/pages/HomeModeRail.tsx");
 for(const target of ["/teacher/live?lesson=daily_u1_l1","/fortune/reading?mode=tarot","/games/1a2b"])assert.ok(rail.includes('to:"'+target+'"'));
 assert.doesNotMatch(portal,/setTeacherProfile|teacherStore|crew-portal-picks|crew-portal-game-link/);
 assert.match(portal,/<PortalParticleField mode=\{mode\}/);
 assert.doesNotMatch(portal,/crew-portal-trial-chip|guest_trial_start_click|crew-portal-motion/);
 assert.match(rail,/role="tablist"/);
 assert.match(portal,/ready&&!hasKey/);
 assert.match(portal,/className="crew-portal-remaining" role="status"/);
 assert.doesNotMatch(css,/crew-portal-trial-chip|crew-portal-motion/);
 assert.match(css,/\.crew-portal-remaining\{font-size:12px/);
 assert.match(portal,/requestIdleCallback/);assert.match(portal,/IntersectionObserver/);
 assert.match(portal,/visibilitychange/);assert.match(portal,/saveData/);
 assert.match(home,/ready&&!configured&&trial.resolved&&\(!trial.enabled\|\|trial.remaining===0\)/);
 assert.doesNotMatch(home,/guest_trial_start_click|setup\.pricing|crew-home-start-trial/);
 assert.match(home,/to="\/fortune"/);
});

test("Account prioritizes and scrolls to Gemini only for a deep link",()=>{
 const account=read("web-spa/src/pages/AccountPage.tsx");
 assert.match(account,/location.hash==="#settings-gemini"\|\|query.has\("returnTo"\)/);
 assert.match(account,/geminiFirst\?<>{aiPanel}{signInPanel}<\/>:<>{signInPanel}{aiPanel}<\/>/);
 assert.match(account,/requestAnimationFrame\(\(\)=>document.getElementById\("settings-gemini"\)\?\.scrollIntoView\(\{block:"start",behavior:"auto"\}\)\)/);
 assert.match(account,/\[geminiFirst,location.hash\]/);
 assert.equal((account.match(/<GeminiConnectionPanel section="key"\/>/g)||[]).length,1);
});

test("Exhausted Live entry hides the offer and uses no retry for consumed grants",()=>{
 const starter=read("web-spa/src/live/GuestLiveStarter.tsx");
 const render=starter.slice(starter.indexOf('return <div className="notice guest-live-entry"'));
 assert.match(starter,/!signedIn&&!config.signinRequired&&config.trial&&config.trial.used>=config.trial.limit/);
 assert.ok(starter.indexOf('config.trial.used>=config.trial.limit')<starter.indexOf('setSiteKey(config.siteKey)'));
 assert.match(starter,/data.code==="ALREADY_USED"\)setPhase\("exhausted"\)/);
 assert.match(starter,/data.code==="DAILY_LIMIT"\)setPhase\("full"\)/);
 assert.doesNotMatch(starter,/data.code==="ALREADY_USED"\|\|data.code==="DAILY_LIMIT"/);
 assert.match(starter,/data.seconds!==300/);
 assert.match(render,/phase!=="exhausted"&&phase!=="full"&&<>/);
 assert.match(render,/phase==="exhausted"&&<>/);
 assert.match(render,/phase==="full"&&<p role="status">\{t\("guestTrial.limit"\)\}<\/p>/);
 assert.match(render,/guestTrial.usedUpTitle/);
 assert.match(render,/to="\/games\/1a2b"/);
 assert.match(render,/phase==="error"&&<button/);
 assert.match(render,/\(phase==="error"\|\|phase==="unavailable"\)&&<Link/);
 assert.equal((render.match(/t\("guestTrial.continueKey"\)/g)||[]).length,1);
 assert.match(starter.slice(starter.indexOf('async function begin()')),/getUserMedia\(\{audio:true\}\)/);
 assert.match(starter.slice(starter.indexOf('callback:token=>'),starter.indexOf('async function begin()')),/void ensureLive\(\)\.catch/);
 const quota=read("web-spa/src/lib/useGuestTrialQuota.ts");
 assert.match(quota,/resolved:boolean/);
 assert.match(quota,/if\(data\?\.user\?\.id\)\{trial=data.trial;member=true\}/);
 assert.match(quota,/remaining:valid\?trial!\.limit-trial!\.used:null/);
});

test("Finish is honest across expired, early-ended and interrupted states",()=>{
 const finish=read("web-spa/src/live/GuestTrialExperience.tsx");
 assert.match(finish,/useLocation\(\)/);
 assert.match(finish,/new URLSearchParams\(location.search\).get\("id"\)/);
 assert.match(finish,/failed\?t\("guestTrial.interrupted"\):expired\?t\("guestTrial.completeTitle",\{name:displayName\}\):t\("guestTrial.ended"\)/);
 for(const dest of ["/games/1a2b","/teacher/vocabulary","/story","/account#settings-gemini"])assert.ok(finish.includes('to="'+dest+'"'));
 assert.ok(finish.indexOf('to="/games/1a2b"')<finish.indexOf('to="/account#settings-gemini"'));
 const zh=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/common.json"));
 assert.match(zh.guestTrial.completeBody,/每天/);
 assert.match(zh.guestTrial.completeBody,/1A2B/);
 assert.doesNotMatch(zh.guestTrial.completeBody,/恢復試用|每天重置/);
});

test("Teacher and game hubs defer Key onboarding; 11 locales keep new text",()=>{
 const practice=read("web-spa/src/teacher/PracticePage.tsx");
 assert.ok(practice.indexOf("<GeminiSetupNotice/>")>practice.indexOf('crew-practice-friend-links'));
 assert.ok(practice.indexOf("<GeminiSetupNotice/>")<practice.indexOf("<GuideHub/>"));
 const play=read("web-spa/src/games/CrewPlayHubPage.tsx");
 assert.match(play,/zh:"免費直接玩",en:"Play free now"/);
 assert.match(play,/打字練習 · 可開 AI 猜詞/);
 assert.doesNotMatch(play,/crew-play-access-note|Gemini Key/);
 for(const lang of ["zh-TW","en","de","es","fr","id","ja","ko","pt-BR","th","vi"]){
  const home=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/home.json`));
  const common=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/common.json`));
  assert.ok(home.world.chatHeading&&home.world.chatStart&&home.world.noVoice);
  assert.ok(home.world.modes.learn.description);
  for(const mode of ["chat","learn","fortune","play"])assert.ok(home.world.modes[mode].cta);
  assert.equal(home.portal.modes,undefined);
  assert.equal(home.playHub.accessNote,undefined);
  assert.equal(common.guestTrial.homeStart,undefined);
  assert.ok(common.guestTrial.completeTitle.includes("{{name}}"));
  for(const key of ["usedUpTitle","usedMember","usedMemberNoCount","free1a2b","freeVocabulary","freeStory","aiFriend"])assert.ok(common.guestTrial[key]);
 }
});
