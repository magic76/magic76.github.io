const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,"web-spa/src",p),"utf8");

test("Live exit persists conversation and report failure still terminates",()=>{
 const hook=read("live/useLiveSession.ts");
 assert.ok(hook.includes('snapshot("page-leave")'));
 assert.ok(hook.includes("savedRef.current"));
 assert.ok(hook.includes("reportFailed"));
 assert.ok(hook.includes("saveLive(finishedConfig.pageKey,{...item,report:r})"));
 assert.ok(hook.includes('setState("ended")'));
});

test("Gemini candidate is validated and saved independently of microphone or Live",()=>{
 const panel=read("pages/GeminiConnectionPanel.tsx");
 assert.ok(panel.includes('"x-goog-api-key":candidate'));
 assert.ok(panel.indexOf("if(!response.ok)")<panel.indexOf("saveGeminiKey(candidate,remember)"));
 assert.ok(panel.includes("setGeminiVerified(true)"));
 assert.ok(panel.indexOf("saveGeminiKey(candidate,remember)")<panel.indexOf("async function testVoice()"));
 assert.ok(!panel.includes("pendingRollbackRef"));
 assert.ok(!panel.includes("restore()"));
 assert.ok(panel.includes("isMicrophoneDenied(error)"));
 assert.ok(panel.includes("micPermission"));
 assert.ok(panel.includes('t("gemini.voiceTagline")'));
 assert.ok(JSON.parse(read("i18n/locales/zh-TW/settings.json")).gemini.voiceTagline.includes("不影響已儲存的 Key"));
});

test("Story and Fortune show recovery actions for failure states",()=>{
 assert.ok(read("story/ShelfPage.tsx").includes('t("shelf.retry")'));
 assert.equal(JSON.parse(read("i18n/locales/zh-TW/story.json")).shelf.retry,"重新讀取書架");
 assert.ok(read("story/CreatePage.tsx").includes('t("create.generateError")'));
 assert.ok(JSON.parse(read("i18n/locales/zh-TW/story.json")).create.generateError.includes("故事生成或儲存失敗"));
 assert.ok(read("fortune/ReadingPage.tsx").includes('t("reading.aiRetry")'));
 assert.equal(JSON.parse(read("i18n/locales/zh-TW/fortune.json")).reading.aiRetry,"重試 AI 解讀");
 assert.ok(read("fortune/ReadingPage.tsx").includes('aiStatus==="loading"'));
 // Fortune landing is now entirely local; remote engine failures must not
 // block the page or require an extra retry before showing saved reports.
 assert.ok(read("fortune/HomePage.tsx").includes("readFortuneHistoryPreviews"));
 assert.ok(read("fortune/HistoryPage.tsx").includes("readFortuneHistoryPreviews"));
 assert.ok(!read("fortune/HomePage.tsx").includes("ensureFortuneServices"));
});

test("Backup omits keys and restores only nonexisting records",()=>{
 const backup=read("lib/backup.ts");
 const settings=read("pages/SettingsPage.tsx");
 assert.ok(backup.includes("isBackupKey(key)"));
 assert.ok(backup.includes("localStorage.getItem(key)!==null"));
 assert.ok(backup.includes("CrewStoryStore!.get"));
 assert.ok(settings.includes('t("backup.export")')&&settings.includes('t("backup.import")'));
 const zh=JSON.parse(read("i18n/locales/zh-TW/settings.json"));
 assert.equal(zh.backup.export,"匯出備份");
 assert.equal(zh.backup.import,"匯入備份");
});

test("global navigation exposes all five intent tabs and keeps Settings reachable",()=>{
 const app=read("App.tsx"),chrome=read("components/AppChrome.tsx"),styles=read("styles.css"),motion=read("motion.css");
 const hub=read("pages/CrewSectionPage.tsx");
 assert.ok(app.includes('path="/settings"'));
 for(const id of ["home","chat","explore","learn","me"])assert.ok(chrome.includes('id:"'+id+'"'),"missing tab "+id);
 for(const route of ['to:"/"','to:"/chat"','to:"/explore"','to:"/learn"','to:"/me"'])assert.ok(chrome.includes(route),"missing "+route);
 assert.ok(chrome.includes("active===item.id"));
 assert.ok(hub.includes('to:"/settings"'),"Settings must remain reachable from My Crew");
 assert.ok(styles.includes("grid-template-columns:repeat(5,minmax(0,1fr))"));
 assert.ok(motion.includes("width:20%"),"sliding indicator should match five tabs");
});

test("Gemini Key is managed once globally, not separately per product",()=>{
 const runtime=read("lib/runtime.ts");
 const settings=read("pages/SettingsPage.tsx");
 const panel=read("pages/GeminiConnectionPanel.tsx");
 const story=read("story/MyPage.tsx");
 const fortune=read("fortune/HomePage.tsx");
 const create=read("story/CreatePage.tsx");
 assert.ok(runtime.includes('export function geminiKey()'));
 assert.ok(runtime.includes('export function saveGeminiKey('));
 assert.ok(panel.includes("saveGeminiKey(candidate,remember)"));
 assert.ok(settings.includes('t("hero.desc")'));
 assert.ok(JSON.parse(read("i18n/locales/zh-TW/settings.json")).hero.desc.includes("Koolo Teacher、Story、Fortune、Play 等需要 AI 的功能共用一組 Key"));
 assert.ok(create.includes("geminiKey()"),"Story must read the shared key");
 for(const source of [story,fortune]){
  assert.ok(!source.includes("GeminiSetupNotice"),"products should not show a second API-key settings card");
  assert.ok(!source.includes("saveGeminiKey("),"products must not store a separate Key");
 }
});

