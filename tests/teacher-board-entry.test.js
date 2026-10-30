const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("interactive whiteboard appears as a discoverable learning hub feature card",()=>{
 const page=read("web-spa/src/pages/CrewSectionPage.tsx");
 const route=read("web-spa/src/App.tsx");
 assert.match(page,/to:"\/teacher\/board"/);
 assert.match(page,/crew-learn-tool-grid/);
 assert.match(page,/tTeacher\("board.entryTitle"\)/);
 assert.match(page,/tTeacher\("board.entryDesc"\)/);
 assert.match(route,/path="\/teacher\/board" element=\{<TeacherBoardPage\/>\}/);
});

test("teacher live exposes whiteboard action outside course and fortune contexts",()=>{
 const source=read("web-spa/src/teacher/LivePage.tsx");
 assert.match(source,/!course&&!fortuneKind&&!guestStarted&&<button type="button" className="teacher-live-change-action teacher-live-board-entry"/);
 assert.match(source,/onClick=\{\(\)=>void openBoard\(\)\}/);
 assert.match(source,/disabled=\{changingTeacher\|\|openingBoard\|\|endingCourse\}/);
 assert.match(source,/const openBoard=async\(\)=>/);
});

test("opening board ends the active voice session before navigation and never runs two microphones",()=>{
 const source=read("web-spa/src/teacher/LivePage.tsx");
 const start=source.indexOf("const openBoard=async()=>");
 const end=source.indexOf("const changeTeacher=async()=>",start);
 assert.ok(start!==-1&&end>start);
 const fn=source.slice(start,end);
 assert.match(fn,/if\(sessionActive&&!window.confirm\(t\("board.entryConfirm"\)\)\)return/);
 assert.match(fn,/if\(!textMode&&sessionActive\)await live.stop\(true\)/);
 assert.ok(fn.indexOf("await live.stop(true)")<fn.indexOf('navigate("/teacher/board")'));
 assert.match(fn,/setOpeningBoard\(false\)/);
 assert.match(fn,/setTeacherSwitchError\(t\("board.entryError"\)\)/);
});

test("whiteboard discoverability and warnings have localized labels for all teacher UI locales",()=>{
 for(const locale of ["zh-TW","en","ja","ko","de","es","fr","id","pt-BR","th","vi"]){
  const obj=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/teacher.json"));
  for(const key of ["entryTitle","entryDesc","entryAction","entryOpening","entryConfirm","entryError"]){
   assert.equal(typeof obj.board[key],"string",locale+" "+key);
   assert.ok(obj.board[key].trim().length>2,locale+" "+key);
  }
 }
});
