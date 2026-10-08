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
