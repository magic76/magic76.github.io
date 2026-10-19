const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const contract=require("../contracts/crew-timeline/characters-v1.json");
const ages=[7,10,13,16,19,22,25,35,40,50,55,70];
const read=path=>fs.readFileSync(path,"utf8");
test("Ethan and Hana each have twelve unique, chronologically scoped life chapters",()=>{
 assert.deepEqual(Object.keys(contract.characters).sort(),["ethan","hana"]);
 for(const [id,person] of Object.entries(contract.characters)){
  assert.equal(person.id,id);
  assert.deepEqual(person.ages,ages);
  assert.deepEqual(person.periods.map(p=>p.age),ages);
  assert.equal(person.portraitStatus,"pending","Portraits must never be silently fabricated");
  for(const part of person.periods){
   assert.ok(part.lifeDetails.length>320,id+" age "+part.age+" life book too shallow");
   assert.ok(part.lifeDetailsZh.length>45,id+" age "+part.age+" translation");
   assert.ok(part.people.length>=3);
   assert.ok(part.conversationThreads.length>=6);
   assert.equal(part.conversationThreadsZh.length,part.conversationThreads.length);
   assert.equal(part.openings.length,6);
   assert.equal(new Set(part.openings).size,6);
  }
 }
 assert.match(contract.characters.ethan.periods.find(p=>p.age===25).lifeDetails,/Hana/);
 assert.match(contract.characters.hana.periods.find(p=>p.age===25).lifeDetails,/Ethan/);
 assert.doesNotMatch(contract.characters.ethan.periods.find(p=>p.age===7).lifeDetails,/Hana/);
});
test("Character switches are real, without sharing keepsakes or future canon",()=>{
 const model=read("web-spa/src/timeline/timelineCharacters.ts");
 const page=read("web-spa/src/timeline/TimelinePage.tsx");
 const live=read("web-spa/src/timeline/TimelineLivePage.tsx");
 const portrait=read("web-spa/src/timeline/TimelinePortrait.tsx");
 assert.match(model,/crew_timeline_/);
 assert.match(model,/cursorKey\(id\)/);
 assert.match(model,/noteKey\(id\)/);
 assert.match(model,/p\.age<=age/);
 assert.match(model,/n\.age<=age/);
 assert.match(model,/friendMemoryEnabled\(\)/);
 assert.match(model,/if\(id==="mira"\)return buildSystem\(age,language\)/);
 assert.match(model,/another Timeline person/);
 assert.match(page,/TIMELINE_IDS\.map/);
 assert.match(page,/timelineStage\(age,characterId\)/);
 assert.match(page,/\/timeline\/live\?character=/);
 assert.match(live,/timelineBuildSystem\(age,language,characterId\)/);
 assert.match(live,/timelineSaveNote\(age,text,characterId\)/);
 assert.match(live,/persistHistory:false/);
 assert.match(portrait,/if\(characterId!=="mira"\)return null/);
});
