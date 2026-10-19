const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const contract=require("../contracts/crew-timeline/v1.json");
test("Twelve biographies include twelve distinct age-bound openings and sufficient life content",()=>{
 assert.deepEqual(contract.character.periods.map(x=>x.age),[7,10,13,16,19,22,25,35,40,50,55,70]);
 for(const s of contract.character.periods){
  assert.ok(s.lifeDetails.length>320,s.age+" biography");
  assert.ok(s.people.length>=3,s.age+" people");
  assert.ok(s.everyday.length>=3,s.age+" habits");
  assert.ok(s.tension.length>50,s.age+" tension");
  assert.ok(s.conversationThreads.length>=5,s.age+" threads");
  assert.equal(s.openings.length,6,s.age+" openings");
  assert.equal(new Set(s.openings).size,6,s.age+" duplicates");
 }
});
test("Web includes only current and past lives, rotates openings and never archives speech",()=>{
 const model=fs.readFileSync("web-spa/src/timeline/timeline.ts","utf8");
 const live=fs.readFileSync("web-spa/src/timeline/TimelineLivePage.tsx","utf8");
 assert.match(model,/filter\(p=>p\.age<=age\)/);
 assert.match(model,/stage\(age\)\.openings/);
 assert.match(model,/counts\[age\]/);
 assert.match(model,/lifeBook/);
 assert.match(live,/openingPrompt:opening/);
 assert.match(live,/nextOpening\(age\)/);
 assert.match(live,/persistHistory:false/);
});
