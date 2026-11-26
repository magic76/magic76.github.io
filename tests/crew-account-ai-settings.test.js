const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
test("Gemini setup belongs to Account without requiring sign-in or duplicating Key storage",()=>{
 const account=read("web-spa/src/pages/AccountPage.tsx");
 const settings=read("web-spa/src/pages/SettingsPage.tsx");
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 const panel=read("web-spa/src/pages/GeminiConnectionPanel.tsx");
 const notice=read("web-spa/src/components/GeminiSetupNotice.tsx");
 assert.match(account,/<GeminiConnectionPanel section="key"\/>/);
 assert.match(settings,/<GeminiConnectionPanel section="voice"\/>/);
 assert.match(account,/crew-account-ai/);
 assert.match(account,/crew-account-settings-links/);
 assert.match(settings,/navigate\("\/account"\+location\.search\+"#settings-gemini",\{replace:true\}\)/);
 assert.match(notice,/\/account\?returnTo=/);
 assert.doesNotMatch(chrome,/crew-key-status-placeholder|t\("gemini\.pending"\)/);
 assert.equal((account.match(/<GeminiConnectionPanel/g)||[]).length,1);
 assert.ok(panel.includes('section!=="voice"')&&panel.includes('section!=="key"'));
 assert.ok(panel.includes("clearGeminiKey()"),"Account can clear a stored key");
});
test("Account AI settings retain per-device privacy warning and translated labels",()=>{
 for(const lang of ["zh-TW","en"]){
  const translations=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/common.json"));
  for(const key of ["aiSettings","aiIntro","preferences","voiceSettings","learningSettings","dataSettings","deviceSettings"]){
   assert.ok(translations.auth[key],lang+" auth."+key);
  }
  assert.match(translations.auth.localData,/Gemini/);
 }
});

test("BYOK is discoverable in My and settings and both quota recovery flows",()=>{
 const my=read("web-spa/src/pages/MyAccountGroups.tsx");
 const settings=read("web-spa/src/pages/SettingsPage.tsx");
 const voice=read("web-spa/src/live/GuestLiveStarter.tsx");
 const text=read("web-spa/src/live/GuestKeyRecovery.tsx");
 assert.match(my,/<MyAiSettingsCard\/>/);
 assert.match(my,/geminiVerified\(\)\?"active":geminiKey\(\)\?"pending":"free"/);
 assert.match(my,/to="\/account#settings-gemini"/);
 assert.match(settings,/<Link to="\/account#settings-gemini">/);
 assert.match(voice,/to=\{keySetupTo\}[^\n]*auth\.byokSetup/);
 assert.match(text,/to=\{continueTo\}[^\n]*auth\.byokSetup/);
 for(const {code} of JSON.parse(read("config/ui-locales.json")).locales){
  const {auth}=JSON.parse(read("web-spa/src/i18n/locales/"+code+"/common.json"));
  for(const key of ["byokTitle","byokBenefit","byokSetup","byokManage","byokFree","byokPending","byokActive","byokPolicy"])assert.ok(auth[key],code+" auth."+key);
 }
});
