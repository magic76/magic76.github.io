const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const locale=(lang,ns)=>JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/"+ns+".json"));

test("home defers Gemini setup until trial is disabled or exhausted",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const title=home.indexOf('t("setup.title")'),shorts=home.indexOf('<HomeShortsPreview');
 assert.ok(title>0&&title<shorts,"setup must appear before home content");
 assert.ok(home.includes('trial.resolved&&(!trial.enabled||trial.remaining===0)')&&home.includes("crew-home-start-option"),"setup is delayed until trial exhausted or disabled");
 assert.doesNotMatch(home,/guest_trial_start_click|setup\.pricing/);
 assert.ok(home.includes('!verified?'),"the existing verification flow is retained");
});

test("account explains free creation, links official Google pricing, and returns to the originating route",()=>{
 const panel=read("web-spa/src/pages/GeminiConnectionPanel.tsx");
 assert.ok(panel.includes('https://aistudio.google.com/apikey'));
 assert.ok(panel.includes('https://ai.google.dev/gemini-api/docs/pricing'));
 assert.ok(panel.includes('t("gemini.freeTitle")'));
 assert.ok(panel.includes('t("gemini.pricingNote")'));
 assert.ok(panel.includes('const requestedReturn=params.get("returnTo")'));
 assert.ok(panel.includes('requestedReturn.startsWith("//")'),"reject URL-like redirects");
 assert.ok(panel.includes('navigate(returnTo,{replace:true})'),"return after verified key");
 assert.ok(panel.indexOf("saveGeminiKey(candidate,remember)")<panel.indexOf('navigate(returnTo,{replace:true})'));
});

test("Teacher, Story, Fortune and Live share one key setup notice without duplicating key storage",()=>{
 const notice=read("web-spa/src/components/GeminiSetupNotice.tsx");
 assert.ok(notice.includes('to={"/account?returnTo="+encodeURIComponent(safeReturn)+"#settings-gemini"}'));
 assert.ok(!notice.includes("saveGeminiKey("));
 const practice=read("web-spa/src/teacher/PracticePage.tsx");
 assert.ok(practice.includes('GeminiSetupNotice compactLabel={t("practice.advancedKey")}'),"teacher hub should offer only a compact optional link");
 assert.ok(notice.includes('if(compactLabel)return <Link'),"compact variant must opt in");
 assert.ok(notice.includes('return <div className={"crew-gemini-setup-notice "+className} role="note">'),"shared default notice remains intact");
 for(const file of ["story/CreatePage.tsx","story/PhysicalBookPage.tsx","fortune/ReadingPage.tsx","live/LiveControls.tsx"]){
  assert.ok(read("web-spa/src/"+file).includes("GeminiSetupNotice"),file+" should use the shared notice");
 }
 const fortune=read("web-spa/src/fortune/ReadingPage.tsx");
 assert.ok(fortune.includes('"/fortune/reading?history="+encodeURIComponent(reading!.id)'),"return to existing saved reading");
 assert.ok(fortune.includes('t("reading.generateAI")'),"allow AI interpretation after returning");
});

test("both UI locales describe free key application without claiming unlimited free usage",()=>{
 for(const lang of ["zh-TW","en"]){
  const home=locale(lang,"home").setup,settings=locale(lang,"settings").gemini,fortune=locale(lang,"fortune").reading;
  for(const copy of [home.title,home.shortDesc,settings.freeTitle,settings.freeDesc,settings.pricingNote,settings.setupNoticeTitle,fortune.needKey]){
   assert.ok(copy.trim().length>0,lang+" should have onboarding copy");
  }
  assert.ok(settings.openStudio.trim());
  assert.ok(fortune.generateAI.trim());
 }
});
