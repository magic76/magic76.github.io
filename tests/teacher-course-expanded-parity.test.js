const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"../web-spa/src/teacher");
const read=name=>fs.readFileSync(path.join(root,name),"utf8");
const expanded=read("courseCatalogExpanded.ts");
function array(name){
 const match=expanded.match(new RegExp("export const "+name+":[^=]+=(\\[[\\s\\S]*?\\]);"));
 assert.ok(match,"missing generated "+name);
 return JSON.parse(match[1]);
}
function warmupMap(){
 const match=expanded.match(/export const COURSE_WARMUPS:[^=]+=(\{[\s\S]*?\});/);
 assert.ok(match,"missing warmup map");
 return JSON.parse(match[1]);
}

test("Android's three expanded courses are present with stable track, unit and lesson IDs",()=>{
 const tracks=array("EXPANDED_COURSE_TRACKS"),units=array("EXPANDED_COURSE_UNITS"),lessons=array("EXPANDED_COURSE_LESSONS");
 assert.deepEqual(tracks.map(x=>x.id),["teamwork","tickets","services"]);
 assert.deepEqual(units.map(x=>x.id),["teamwork_u1","teamwork_u2","tickets_u1","tickets_u2","services_u1","services_u2"]);
 assert.equal(lessons.length,18);
 assert.equal(new Set(lessons.map(x=>x.id)).size,18);
 for(const track of tracks)assert.equal(lessons.filter(x=>x.trackId===track.id).length,6);
 for(const lesson of lessons){
  assert.ok(units.some(x=>x.id===lesson.unitId&&x.trackId===lesson.trackId),lesson.id);
  assert.equal(lesson.missions.length,3,lesson.id);
  assert.ok(lesson.rolePrompt&&lesson.scene,lesson.id);
  assert.ok(lesson.missions.every(x=>x.titleZh&&x.keywords.length),lesson.id);
 }
});

test("all 49 Android lessons have two or more warmup phrases, with pronunciation links",()=>{
 const warmups=warmupMap();
 assert.equal(Object.keys(warmups).length,49);
 assert.equal(Object.values(warmups).reduce((n,phrases)=>n+phrases.length,0),99);
 for(const [id,phrases] of Object.entries(warmups)){
  assert.ok(phrases.length>=2,id);
  assert.ok(phrases.every(x=>x.en&&x.zh),id);
 }
 assert.match(read("courseCatalog.ts"),/\.\.\.EXPANDED_COURSE_LESSONS/);
 assert.match(read("courseCatalog.ts"),/COURSE_WARMUPS\[lesson\.id\]/);
 assert.match(read("CourseBriefing.tsx"),/\/teacher\/pronunciation\?passage=/);
 assert.match(read("PronunciationPage.tsx"),/COURSE_LESSONS\.flatMap/);
});

test("course map opens briefing first and briefing starts the existing roleplay Live",()=>{
 const page=read("CoursePage.tsx");
 const briefing=read("CourseBriefing.tsx");
 assert.match(page,/\/teacher\/course\?briefing=/);
 assert.match(page,/lessonUnlocked\(briefing\.id\)/);
 assert.match(briefing,/\/teacher\/live\?mode=course&lesson=/);
 assert.match(briefing,/lesson\.missions\.map/);
});
