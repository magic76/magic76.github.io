const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
test("third-party license notices are reachable and explicitly retain uncertain dataset rights",()=>{
 const page=read("web-spa/src/pages/LicensesPage.tsx"),settings=read("web-spa/src/pages/SettingsPage.tsx"),privacy=read("web-spa/src/pages/PrivacyPage.tsx"),app=read("web-spa/src/App.tsx"),build=read("scripts/prepare-cloudflare.mjs");
 assert.match(settings,/id="settings-about"/);assert.match(settings,/to="\/licenses"/);assert.match(privacy,/to="\/licenses"/);
 assert.match(app,/path="\/licenses"/);assert.match(build,/"\/timeline\/live","\/licenses"/);
 for(const item of ["Paradee","eeh-1","Kitten TTS 2 Mini / Pico","Piper Huayan Medium","GPL-3.0-or-later","29c4a1977913f70e282d8328e87f54100672bf17","dataset: Unknown","DATA_LICENSES","cs@koolo.app"])assert.ok(page.includes(item),item);
 assert.match(page,/exact corresponding-source revision mapping remains to be verified/);
 for(const locale of ["zh-TW","en","de","es","fr","id","ja","ko","pt-BR","th","vi"]){const j=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/settings.json"));assert.ok(j.about.title);assert.ok(j.about.licenses)}
});
