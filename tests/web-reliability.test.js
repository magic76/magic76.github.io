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
 assert.ok(hook.includes("saveLive(configRef.current.pageKey,{...item,report:r})"));
 assert.ok(hook.includes('setState("ended")'));
});

test("Gemini candidate is validated before replacing the working key",()=>{
 const settings=read("pages/SettingsPage.tsx");
 assert.ok(settings.includes('"x-goog-api-key":candidate'));
 assert.ok(settings.indexOf("if(!response.ok)")<settings.indexOf("saveGeminiKey(candidate,remember)"));
 assert.ok(settings.includes("pendingRollbackRef.current=restore"));
 assert.ok(settings.includes("pendingRollbackRef.current?.()"));
});

test("Story and Fortune show recovery actions for failure states",()=>{
 assert.ok(read("story/ShelfPage.tsx").includes("重新讀取書架"));
 assert.ok(read("story/CreatePage.tsx").includes("故事生成或儲存失敗"));
 assert.ok(read("fortune/ReadingPage.tsx").includes("重試 AI 解讀"));
 assert.ok(read("fortune/ReadingPage.tsx").includes('aiStatus==="loading"'));
 assert.ok(read("fortune/HomePage.tsx").includes("重新載入"));
});

test("Backup omits keys and restores only nonexisting records",()=>{
 const backup=read("lib/backup.ts");
 const settings=read("pages/SettingsPage.tsx");
 assert.ok(backup.includes("isBackupKey(key)"));
 assert.ok(backup.includes("localStorage.getItem(key)!==null"));
 assert.ok(backup.includes("CrewStoryStore!.get"));
 assert.ok(settings.includes("匯出備份")&&settings.includes("匯入備份"));
});

test("global navigation always exposes all five tabs including Settings",()=>{
 const app=read("App.tsx"),chrome=read("components/AppChrome.tsx"),styles=read("styles.css"),motion=read("motion.css");
 assert.ok(app.includes('path="/settings"'));
 assert.ok(chrome.includes('["home","teacher","story","fortune","settings"]'));
 for(const route of ['to="/"','to="/teacher/practice"','to="/story"','to="/fortune"','to="/settings"'])assert.ok(chrome.includes(route),"missing global link "+route);
 assert.ok(chrome.includes('active==="settings"'));
 assert.ok(styles.includes("grid-template-columns:repeat(5,minmax(0,1fr))"));
 assert.ok(motion.includes("width:20%"),"sliding indicator should match five tabs");
});

test("Gemini Key is managed once globally, not separately per product",()=>{
 const runtime=read("lib/runtime.ts");
 const settings=read("pages/SettingsPage.tsx");
 const story=read("story/MyPage.tsx");
 const fortune=read("fortune/HomePage.tsx");
 const create=read("story/CreatePage.tsx");
 assert.ok(runtime.includes('export function geminiKey()'));
 assert.ok(runtime.includes('export function saveGeminiKey('));
 assert.ok(settings.includes("saveGeminiKey(candidate,remember)"));
 assert.ok(settings.includes("Teacher、Story、Fortune 共用同一組 Key"));
 assert.ok(create.includes("geminiKey()"),"Story must read the shared key");
 for(const source of [story,fortune]){
  assert.ok(!source.includes("GeminiSetupNotice"),"products should not show a second API-key settings card");
  assert.ok(!source.includes("saveGeminiKey("),"products must not store a separate Key");
 }
});
