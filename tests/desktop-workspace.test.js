const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");

test("desktop workspace reuses one Live session on both products",()=>{
 const teacher=read("web-spa/src/teacher/LivePage.tsx");
 const story=read("web-spa/src/story/LivePage.tsx");
 for(const file of [teacher,story]){
  assert.match(file,/className="desktop-live-workspace /);
  assert.match(file,/<DesktopLivePanel/);
  assert.equal((file.match(/useLiveSession\(/g)||[]).length,1);
  assert.match(file,/live\.turns/);
  assert.match(file,/live\.input/);
  assert.match(file,/live\.output/);
 }
 assert.match(teacher,/prominentInterrupt interruptLabel=\{t\("live\.myTurn"\)\}/);
 assert.match(story,/interruptLabel=\{t\("storyLive\.interrupt"\)\}/);
 assert.equal(JSON.parse(read("web-spa/src/i18n/locales/zh-TW/voice.json")).storyLive.interrupt,"打斷阿奇");
});
test("desktop panel exposes transcript, explicit translation and local notes",()=>{
 const panel=read("web-spa/src/components/DesktopLivePanel.tsx");
 const backup=read("web-spa/src/lib/backup.ts");
 assert.match(panel,/setTab\("notes"\)/);
 assert.match(panel,/navigator\.clipboard\.writeText/);
 assert.match(panel,/onClick=\{\(\)=>void translate\(\)\}/);
 assert.match(panel,/localStorage\.setItem\(noteKey,notes\)/);
 assert.match(backup,/crew_teacher_/);
 assert.match(backup,/crew_story_/);
});
test("layout only expands desktop and leaves small screens in native flow",()=>{
 const style=read("web-spa/src/desktop-workspace.css");
 const entry=read("web-spa/src/main.tsx");
 const reader=read("web-spa/src/story/player/StoryPlayerView.tsx");
 assert.match(entry,/import "\.\/desktop-workspace\.css"/);
 assert.match(style,/@media\(min-width:1050px\)/);
 assert.match(style,/@media\(max-width:1049px\)/);
 assert.match(style,/\.desktop-live-workspace \.live-transcript\{display:none\}/);
 assert.match(reader,/story-player desktop-story-workspace/);
});

test("story live translates option labels but keeps the prompt values unchanged",()=>{
 const story=read("web-spa/src/story/LivePage.tsx");
 for(const value of ["溫暖冒險","搞笑","睡前故事","神秘","奇幻"])assert.ok(story.includes('<option value="'+value+'">'),value);
 for(const value of ["short","normal","long","high","medium","low"])assert.ok(story.includes('<option value="'+value+'">{t('),value);
 assert.match(story,/"你是 Crew Story 的互動說故事角色阿奇。故事風格："\+style/);
 assert.match(story,/pace==="short"\?"每次只講 1-2 句。"/);
});

test("compact game voice dock follows the UI locale instead of a zh/en switch",()=>{
 const controls=read("web-spa/src/live/LiveControls.tsx");
 assert.doesNotMatch(controls,/english\?\s*["'`]/);
 assert.match(controls,/t\("compact\.aria"\)/);
});
