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
 assert.match(app,/const OnboardingGate=lazy\(\(\)=>import\("\.\/onboarding\/OnboardingGate"\)/);
 assert.match(app,/pathname==="\/"\|\|pathname==="\/settings"/);
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
