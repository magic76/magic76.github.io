const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("homepage progress pauses and brand headline localizes in all 11 languages",()=>{
 const hero=read("web-spa/src/pages/HomePortal.tsx");
 const css=read("web-spa/src/pages/homePortal.css");
 assert.match(hero,/data-paused=\{paused\}/);
 assert.match(hero,/crew-portal-tab-progress/);
 assert.match(hero,/world\.headline/);
 assert.match(css,/data-paused="true"/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 for(const locale of ["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"]){
  const json=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/home.json"));
  assert.ok(json.world.headline.length>9,locale);
 }
});
test("character, board, story, timeline and magic effects are state-triggered",()=>{
 const roles=read("web-spa/src/teacher/TeacherProfilePicker.tsx");
 const motion=read("web-spa/src/motion.css");
 const board=read("web-spa/src/teacher/teachingBoard.css");
 const timeline=read("web-spa/src/timeline/timeline.css");
 const magic=read("web-spa/src/magic/MagicScene3D.tsx");
 const friends=read("web-spa/src/friends/friends.css");
 assert.match(roles,/viewTransitionName:"crew-teacher-"/);
 assert.match(roles,/transitionUI\(\(\)=>setDetail/);
 assert.match(motion,/crew-story-paper-forward/);
 assert.match(motion,/prefers-reduced-motion:reduce/);
 assert.match(board,/crew-board-confirm-spring/);
 assert.match(board,/crew-board-gentle-shake/);
 assert.match(timeline,/timeline-motion-chapter/);
 assert.match(magic,/spawn\.current<1\.15/);
 assert.match(magic,/root\.current\.scale\.setScalar\(1\)/);
 assert.match(friends,/crew-friend-detail-in/);
});
