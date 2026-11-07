const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");

const read=path=>readFileSync(path,"utf8");
const gate=read("web-spa/src/onboarding/OnboardingGate.tsx");
const app=read("web-spa/src/App.tsx");
const settings=read("web-spa/src/pages/SettingsPage.tsx");
const copySrc=read("web-spa/src/onboarding/copy.ts");

test("shared guide is mounted in the React app, including Android WebView",()=>{
 assert.match(app,/import\{OnboardingGate\}from"\.\/onboarding\/OnboardingGate"/);
 assert.match(app,/<OnboardingGate pathname=\{pathname\}\/>/);
 assert.doesNotMatch(gate,/isCrewAndroidShell\(/);
 assert.match(gate,/if\(pathname!=="\/"\)return/);
});

test("first-run gate never forces existing users, persists skip or completion, and resumes language switch",()=>{
 assert.match(gate,/if\(localStorage\.getItem\(ONBOARDING_DONE_KEY\)\)return/);
 assert.match(gate,/if\(previousCrewActivity\(\)\)/);
 assert.match(gate,/sessionStorage\.getItem\(DRAFT_KEY\)/);
 assert.match(gate,/localStorage\.setItem\(ONBOARDING_DONE_KEY,begin\?"completed":"skipped"\)/);
 assert.match(gate,/onCancel=\{event=>\{event\.preventDefault\(\);finish\(false\)\}\}/);
 assert.match(gate,/if\(begin\)navigate\(destinations\[chosenGoal\]\)/);
 assert.match(gate,/onClick=\{\(\)=>finish\(true,item\.id\)\}/);
 assert.doesNotMatch(gate,/getUserMedia|requestPermission|fetch\(/);
});

test("settings can reopen without resetting past progress or API key",()=>{
 assert.match(settings,/REOPEN_ONBOARDING_EVENT/);
 assert.match(settings,/window\.dispatchEvent\(new Event\(REOPEN_ONBOARDING_EVENT\)\)/);
 assert.match(gate,/window\.addEventListener\(REOPEN_ONBOARDING_EVENT,onReplay\)/);
 assert.doesNotMatch(gate,/removeItem\(["']crew_teacher|clear\(\)/);
});

test("onboarding text exists in all supported interface languages",()=>{
 const locales=JSON.parse(read("config/ui-locales.json")).locales.map(x=>x.code);
 const js=stripTypeScriptTypes(copySrc.replace(/^import .*;\s*$/gm,"").replace(/\bexport\s+(?=(?:const|function|type)\b)/g,""),{mode:"strip"});
 const ctx={normalizeUiLocale:language=>locales.includes(language)?language:null};
 const {getOnboardingCopy}=vm.runInNewContext("(function(){"+js+"\nreturn {getOnboardingCopy};})()",ctx);
 const reference=Object.keys(getOnboardingCopy("en"));
 for(const locale of locales){
  const strings=getOnboardingCopy(locale);
  assert.deepEqual(Object.keys(strings).sort(),reference.slice().sort(),locale+" keys");
  for(const [key,value] of Object.entries(strings)){
   assert.ok(typeof value==="string"&&value.trim(),locale+" "+key);
  }
 }
 assert.equal(getOnboardingCopy("zh-TW").welcomeTitle,"歡迎來到 Crew");
 assert.equal(getOnboardingCopy("unknown").welcomeTitle,"Welcome to Crew");
});

test("first-run routes are immediately usable activities instead of product indexes",()=>{
 assert.match(gate,/chat:"\\/friend\\/live\\?id=zoe&from=home"/);
 assert.match(gate,/learn:"\\/teacher\\/live\\?lesson=daily_u1_l1"/);
 assert.match(gate,/play:"\\/games\\/number-bomb"/);
 assert.match(gate,/explore:"\\/timeline"/);
 assert.match(gate,/onClick=\\{\\(\\)=>finish\\(true,"chat"\\)\\}/);
 assert.match(gate,/step===2\\?firstAction:c.next/);
 assert.match(gate,/crew-onboarding-first-action/);
 assert.doesNotMatch(gate,/navigate\\(\\x22\\/chat\\x22\\)|navigate\\(\\x22\\/learn\\x22\\)/);
});
test("first-run funnel has observable goal, step, skip and first-action attribution",()=>{
 const analytics=read("web-spa/src/analytics/usage.ts");
 const ingestion=read("functions/api/usage/event.ts");
 const dashboard=read("web-spa/src/analytics/UsageDashboardPage.tsx");
 for(const event of ["onboarding_view","onboarding_step_view","onboarding_goal_select",
 "onboarding_start","onboarding_skip","onboarding_replay","onboarding_first_action"]){
  assert.ok(analytics.includes('"'+event+'"'),"client event "+event);
  assert.ok(ingestion.includes('"'+event+'"'),"ingest event "+event);
  assert.ok(dashboard.includes(event+":"),"dashboard event "+event);
 }
 assert.match(gate,/setOnboardingFirstActionPending\\(chosenGoal\\)/);
 assert.match(gate,/clearOnboardingFirstActionPending\\(\\)/);
 assert.match(analytics,/sessionStorage\\.setItem\\(FIRST_ACTION_KEY,goal\\)/);
 assert.match(analytics,/sessionStorage\\.removeItem\\(FIRST_ACTION_KEY\\)/);
 assert.match(analytics,/trackUsageEvent\\("onboarding_first_action",goal\\)/);
 assert.match(analytics,/play:\\["game_started"\\]/);
 assert.match(analytics,/explore:\\["timeline_age_selected"/);
 const timeline=read("web-spa/src/timeline/TimelinePage.tsx");
 assert.match(timeline,/trackUsageEvent\\("timeline_age_selected","timeline"\\)/);
});
