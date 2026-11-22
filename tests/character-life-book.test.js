const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const book=require("../contracts/crew-character-life-book/v1.json");
const read=path=>fs.readFileSync(path,"utf8");
test("exactly sixteen independently scoped friends and teachers",()=>{
 assert.equal(book.schemaVersion,1);
 assert.equal(Object.keys(book.friends).length,16);
 assert.equal(Object.keys(book.teachers).length,16);
 for(const [id,p] of Object.entries(book.friends)){
  assert.equal(p.id,id);assert.equal(p.role,"friend");
  assert.ok(p.background.length>=75,id+" background");
  assert.ok(p.people.length>=2,id+" people");
  assert.ok(p.habits.length>=2,id+" habits");
  assert.equal(p.history.length,5,id+" history");
  assert.equal(p.openings.length,6,id+" openings");
  assert.equal(new Set(p.openings).size,6,id+" duplicate openings");
 }
 for(const [id,p] of Object.entries(book.teachers)){
  assert.equal(p.id,id);assert.equal(p.role,"teacher");
  assert.equal(p.casualOpenings.length,4,id+" casual opening options");
  assert.ok(p.teachingPrinciple.length>35,id+" teaching purpose");
 }
});
test("Web Friend canon and first-line selector are separate from learner memory",()=>{
 const b=read("web-spa/src/characters/lifeBook.ts");
 const f=read("web-spa/src/friends/friendMemory.ts");
 const live=read("web-spa/src/friends/FriendLiveConversation.tsx");
 assert.match(b,/friendLifeBookPrompt/);assert.match(b,/nextFriendLifeOpening/);
 assert.match(b,/role\+":"\+id/);assert.match(b,/opening_v1/);
 assert.match(f,/friendLifeBookPrompt\(friend\.id\)/);
 assert.match(live,/!shortsPost&&!intent/);
 assert.match(live,/lifeOpening/);
 assert.match(live,/buildShortsFriendContext/);
 assert.match(live,/persistHistory:false/);
});
test("teacher biography only enters live free conversation",()=>{
 const live=read("web-spa/src/teacher/LivePage.tsx");
 assert.match(live,/freeTalk=!isRoleplay/);
 assert.match(live,/freeTalk\?teacherLifeBookPrompt/);
 assert.match(live,/lifeOpening/);
 assert.match(live,/teacherReport:true/);
});
