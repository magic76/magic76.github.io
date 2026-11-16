const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
const gate=read("web-spa/src/onboarding/OnboardingGate.tsx");
const app=read("web-spa/src/App.tsx");
const settings=read("web-spa/src/pages/SettingsPage.tsx");
const css=read("web-spa/src/onboarding/onboarding.css");

test("fresh Home never opens or focuses the guide at any viewport width",()=>{
 const marker="// Home never launches the guide or takes focus, regardless of viewport width.";
 const start=gate.indexOf(marker);
 const end=gate.indexOf("},[pathname]);",start);
 assert.ok(start>=0&&end>start,"Home effect exists");
 const homeEffect=gate.slice(start,end);
 assert.match(homeEffect,/if\(pathname!=="\/"\)return/);
 assert.match(homeEffect,/dialog\.current\?\.close\(\);setOpen\(false\)/);
 assert.doesNotMatch(homeEffect,/openGuide|showModal|focus\(/);
 assert.doesNotMatch(gate,/window\.matchMedia\("\(max-width:767px\)"\)/,
  "Home must be nonblocking on desktop and mobile without width branching");
 assert.match(app,/const OnboardingGate=lazy\(\(\)=>import\("\.\/onboarding\/OnboardingGate"\)/);
 assert.match(app,/pathname==="\/"\|\|pathname==="\/settings"/);
});

test("guide offers no voice-trial CTA and does not fetch guest-trial config",()=>{
 assert.doesNotMatch(gate,/guestTrial\.onboardingCTA|guestAvailable|guestTrialDiscoveryEnabled|fetchGuestTrialConfig/);
 assert.match(gate,/chat:"\/friend\/live\?id=zoe&from=home&chat=text"/);
 assert.match(gate,/onClick=\{\(\)=>finish\(true,item\.id\)\}/);
 assert.doesNotMatch(gate,/getUserMedia|requestPermission/);
});

test("Settings replay remains the only modal entry, including a locale-switch draft",()=>{
 assert.match(settings,/window\.dispatchEvent\(new Event\(REOPEN_ONBOARDING_EVENT\)\)/);
 assert.match(gate,/const onReplay=\(\)=>\{if\(pathname==="\/settings"\)openGuide\(true\)\}/);
 assert.match(gate,/window\.addEventListener\(REOPEN_ONBOARDING_EVENT,onReplay\)/);
 assert.match(gate,/if\(pathname!=="\/settings"\)return/);
 assert.match(gate,/sessionStorage\.getItem\(REPLAY_SESSION_KEY\)==="1"&&sessionStorage\.getItem\(DRAFT_KEY\)/);
 assert.match(gate,/sessionStorage\.setItem\(REPLAY_SESSION_KEY,"1"\)/);
 assert.match(gate,/sessionStorage\.removeItem\(REPLAY_SESSION_KEY\)/);
 assert.match(gate,/localStorage\.setItem\(ONBOARDING_DONE_KEY,begin\?"completed":"skipped"\)/);
 assert.match(gate,/if\(begin&&chosenGoal==="learn"&&step===2\)markLearningLanguageConfirmed\(localStorage\)/);
 assert.match(gate,/if\(begin\)navigate\(destinations\[chosenGoal\]\)/);
});

test("shared onboarding CSS keeps the existing LearningLanguageGate dialog selectors",()=>{
 for(const selector of [".crew-onboarding-dialog",".crew-onboarding-panel",".crew-onboarding-header",
  ".crew-onboarding-content",".crew-onboarding-setting",".crew-onboarding-field-label",
  ".crew-onboarding-footer",".crew-onboarding-primary",".crew-onboarding-skip",
  ".crew-settings-onboarding-replay"]){
  assert.ok(css.includes(selector+"{"),"Shared selector must still exist: "+selector);
 }
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(gate,/className="crew-onboarding-skip crew-onboarding-guide-skip"/);
 assert.match(css,/\.crew-onboarding-guide-skip\{min-height:44px\}/);
});
