const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const contract=require("../contracts/crew-timeline/v1.json");
test("Timeline stays a third, distinct role with six chronological age stages",()=>{
 assert.equal(contract.roleKind,"timeline");
 assert.equal(contract.character.id,"mira");
 assert.deepEqual(contract.character.ages,[7,16,25,40,55,70]);
 assert.deepEqual(contract.character.periods.map(p=>p.age),contract.character.ages);
 assert.ok(contract.rules.isolation.includes("friend"));
});
test("Web gates future memory and opt-out without writing transcripts",()=>{
 const src=fs.readFileSync("web-spa/src/timeline/timeline.ts","utf8");
 const live=fs.readFileSync("web-spa/src/timeline/TimelineLivePage.tsx","utf8");
 assert.match(src,/n\.age<=age/);
 assert.match(src,/friendMemoryEnabled\(\)/);
 assert.match(src,/saveNote/);
 assert.match(live,/persistHistory:false/);
 assert.match(live,/sessionKind:"timeline"/);
});
