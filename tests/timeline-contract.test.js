const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const contract=require("../contracts/crew-timeline/v1.json");
test("Timeline stays a third, distinct role with twelve chronological age stages",()=>{
 assert.equal(contract.roleKind,"timeline");
 assert.equal(contract.character.id,"mira");
 assert.deepEqual(contract.character.ages,[7,10,13,16,19,22,25,35,40,50,55,70]);
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

test("all published age portraits are true WebP files and contract paths match",()=>{
 const path=require("node:path");
 for(const p of contract.character.portraits){
  const full=path.resolve(__dirname,"..",p.webPath);
  assert.ok(fs.existsSync(full), "Missing portrait: "+p.webPath);
  const data=fs.readFileSync(full);
  assert.ok(data.length>1000 && data.length<350_000, p.webPath+" unexpected file size");
  assert.equal(data.subarray(0,4).toString("ascii"),"RIFF");
  assert.equal(data.subarray(8,12).toString("ascii"),"WEBP");
 }
});
test("scrapbook locks future chapters and allows removal of explicit memories",()=>{
 const ui=fs.readFileSync("web-spa/src/timeline/TimelinePage.tsx","utf8");
 const model=fs.readFileSync("web-spa/src/timeline/timeline.ts","utf8");
 assert.match(ui,/a>age/);
 assert.match(ui,/deleteNote/);
 assert.match(model,/n\.age<=age/);
 assert.match(model,/allStored\(\)/);
 assert.match(model,/ageSpeech/);
});
