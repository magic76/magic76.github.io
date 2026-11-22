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

test("category settings hide overview intro and keep the back control in view",()=>{
 const page=read("web-spa/src/pages/SettingsPage.tsx");
 const css=read("web-spa/src/pages/settingsGroups.css");
 assert.match(page,/\{showOverview&&<section className="hero">/);
 assert.match(page,/\{showOverview&&orbAvailable&&<Link to="\/orb"/);
 assert.match(page,/querySelector\("\.crew-settings-back"\)\?\.scrollIntoView/);
 assert.match(page,/<p className="crew-settings-key-explainer">\{t\("gemini.intro"\)\}<\/p>/);
 assert.match(page,/to="\/account#settings-gemini"/);
 assert.match(css,/\.crew-settings-back\{[^}]*min-height:44px/);
 assert.match(css,/\.crew-settings-key-manage\{[^}]*min-height:44px/);
});
test("settings overview has concise plain-language introductions in all 11 locales",()=>{
 const languages=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
 for(const language of languages){
  const settings=JSON.parse(read("web-spa/src/i18n/locales/"+language+"/settings.json"));
  assert.equal(typeof settings.hero.desc,"string");
  assert.ok(settings.hero.desc.length>12&&settings.hero.desc.length<200,language+" should be concise");
  assert.doesNotMatch(settings.hero.desc,/Gemini|API|Key|金鑰|金钥/i,language+" should not lead with API details");
  const checkLeaves=value=>{
   if(typeof value==="string")return;
   assert.ok(value&&typeof value==="object",language+" has a non-string JSON leaf");
   for(const child of Object.values(value))checkLeaves(child);
  };
  checkLeaves(settings);
 }
});
