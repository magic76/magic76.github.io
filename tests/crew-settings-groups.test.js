const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");

test("Crew settings has real linked learning, voice, data and device sections",()=>{
 const page=read("web-spa/src/pages/SettingsPage.tsx");
 for(const anchor of ["settings-learning","settings-interface","settings-voice","settings-data","settings-device","memory-settings","live-model-settings"]){
  assert.match(page,new RegExp('id="'+anchor+'"'),"Missing settings anchor "+anchor);
 }
 assert.match(page,/<LanguageSwitcher variant="settings"\/>/);
 assert.match(page,/TARGET_LANGUAGES\.map/);
 assert.match(page,/NATIVE_LANGUAGES\.map/);
 assert.match(page,/setTarget\(e\.target\.value\)/);
 assert.match(page,/setNative\(e\.target\.value as typeof native\)/);
 assert.match(page,/setSpeakingLevel\(e\.target\.value as typeof speakingLevel\)/);
 assert.match(page,/getDailyGoalMinutes\(\)/);
 assert.match(page,/setDailyGoalMinutes\(next\)/);
 assert.match(page,/setLiveModel\(e\.target\.value as typeof liveModel\)/);
 assert.match(page,/<GeminiConnectionPanel section="voice"\/>/);
 assert.match(read("web-spa/src/pages/AccountPage.tsx"),/<GeminiConnectionPanel section="key"\/>/);
 assert.match(page,/setPersonalMemoryEnabled\(value\)/);
 assert.match(page,/setFriendMemoryEnabled\(value\)/);
 assert.match(page,/to="\/teacher\/pronunciation"/);
 assert.match(page,/to="\/privacy"/);
 assert.match(page,/<BuildVersion\/>/);
});

test("mobile settings layout is responsive without duplicating local state",()=>{
 const css=read("web-spa/src/pages/settingsGroups.css");
 assert.match(css,/\.crew-settings-nav\{display:grid/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/grid-template-columns:1fr/);
 const page=read("web-spa/src/pages/SettingsPage.tsx");
 assert.match(page,/ready&&!isCrewAndroidShell\(\)&&<section className="section panel"/);
 assert.match(page,/downloadBackup\(\)/);
 assert.match(page,/importBackup\(file\)/);
 assert.match(page,/t\("device\.android"\)/);
 const en=JSON.parse(read("web-spa/src/i18n/locales/en/settings.json"));
 assert.match(en.device.android,/Koolo Android Web Preview/);
 assert.doesNotMatch(page,/feedback|issue tracker|send report/i);
});
