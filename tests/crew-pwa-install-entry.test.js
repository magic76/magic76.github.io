const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ROOT=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(ROOT,p),"utf8");

test("PWA install shortcut is in the existing accessible drawer, without adding a sixth tab",()=>{
 const menu=read("web-spa/src/components/CrewFeatureMenuPanel.tsx");
 const app=read("web-spa/src/App.tsx");
 assert.match(menu,/import \{CrewInstallMenuAction\}/);
 assert.match(menu,/<CrewInstallMenuAction\/>/);
 assert.match(app,/pathname==="\/"&&<Suspense fallback=\{null\}><CrewInstallNudge\/>/);
 assert.match(app,/<OnboardingGate pathname=\{pathname\}\/>/);
 const css=read("web-spa/src/components/crewInstallEntry.css");
 assert.match(css,/\.crew-feature-menu-install-btn\{[^}]*min-height:64px/);
 assert.match(css,/\.crew-install-nudge-actions button\{[^}]*min-height:44px/);
 assert.match(css,/safe-area-inset-bottom/);
});

test("install controls respect standalone, Android shell, iOS and embedded browser",()=>{
 const pwa=read("web-spa/src/runtime/pwa.ts");
 const ui=read("web-spa/src/components/CrewInstallEntry.tsx");
 for(const key of ["isCrewAndroidShell()","isCrewInstalled()","isCrewEmbeddedBrowser()","isCrewIosSafari()","requestCrewInstall()","registerCrewPwa()"]){
  assert.ok((pwa+"\n"+ui).includes(key),key);
 }
 assert.match(pwa,/window\.addEventListener\("appinstalled"/);
 assert.match(ui,/getGuide\(copy\)/);
 assert.match(ui,/copy\.external/);
 assert.match(ui,/copy\.ios/);
 assert.match(ui,/copy\.android/);
 assert.match(ui,/copy\.desktop/);
});

test("install invitation appears after real usage, only on home, and supports snooze and never",()=>{
 const usage=read("web-spa/src/analytics/usage.ts");
 const ui=read("web-spa/src/components/CrewInstallEntry.tsx");
 for(const event of ["friend_conversation","teacher_conversation","game_completed","story_created","fortune_calculated"]){
  assert.ok(usage.includes('event==="'+event+'"'),event);
 }
 assert.match(usage,/window\.dispatchEvent\(new Event\("crew-pwa-engaged"\)\)/);
 assert.match(ui,/localStorage\.getItem\(ENGAGED_KEY\)==="1"/);
 assert.match(ui,/snooze!=="never"/);
 assert.match(ui,/Date\.now\(\)\+14\*DAY/);
 assert.match(ui,/never\?"never"/);
 assert.match(ui,/Boolean\(prompt\)\|\|isCrewIosSafari\(\)/);
 assert.match(ui,/trackUsageEvent\("pwa_install_view","nudge"\)/);
});

test("every supported locale has install UI and actionable browser-specific guidance",()=>{
 const text=read("web-spa/src/components/crewInstallCopy.ts");
 const locales=JSON.parse(read("config/ui-locales.json")).locales.map(l=>l.code);
 for(const locale of locales){
  assert.ok(text.includes((locale==="en"?"en":locale==="ko"?"ko":'"'+locale+'"')+":"),locale);
 }
 for(const key of ["install","add","menuDesc","inviteTitle","inviteDesc","ios","external","android","desktop","close","later","never"]){
  assert.ok(text.includes(key+":"),key);
 }
});

test("installation analytics use the same privacy-safe event vocabulary on client and server",()=>{
 const client=read("web-spa/src/analytics/usage.ts");
 const server=read("functions/api/usage/event.ts");
 for(const event of ["pwa_install_view","pwa_install_click","pwa_install_dismiss","pwa_install_success"]){
  assert.ok(client.includes('"'+event+'"'),"missing Web event "+event);
  assert.ok(server.includes('"'+event+'"'),"missing server event "+event);
 }
 for(const detail of ["footer","menu","nudge","native"]){
  assert.ok(client.includes('"'+detail+'"'));
  assert.ok(server.includes('"'+detail+'"'));
 }
 assert.match(read("web-spa/src/runtime/pwa.ts"),/trackUsageEvent\("pwa_install_success","native"\)/);
});
