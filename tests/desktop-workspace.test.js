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
 assert.match(teacher,/prominentInterrupt interruptLabel="換我說/);
 assert.match(story,/interruptLabel="打斷阿奇"/);
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
