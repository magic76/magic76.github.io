const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("standalone board hidden from learning and live entry, legacy route retained for rollback",()=>{
 const page=read("web-spa/src/pages/CrewSectionPage.tsx");
 const learn=read("web-spa/src/teacher/LearnPage.tsx");
 const live=read("web-spa/src/teacher/LivePage.tsx");
 assert.doesNotMatch(page,/to:"\/teacher\/board"/);
 assert.doesNotMatch(learn,/to:"\/teacher\/board"/);
 assert.doesNotMatch(live,/navigate\("\/teacher\/board"\)/);
 assert.match(read("web-spa/src/App.tsx"),/path="\/teacher\/board" element=\{<TeacherBoardPage\/>\}/);
 assert.match(live,/visualReply=\{visualReplyProps/);
});

test("visual teaching reuses the same active voice session",()=>{
 const live=read("web-spa/src/teacher/InlineTeacherBoard.tsx");
 assert.match(live,/board\.syncMode\(live\.sendControl\)/);
 assert.doesNotMatch(live,/live\.stop\(|live\.start\(/);
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
