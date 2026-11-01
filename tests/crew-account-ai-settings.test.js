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
