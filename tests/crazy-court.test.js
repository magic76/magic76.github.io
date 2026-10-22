const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ts=require("typescript");

// Reuse the same TypeScript engine as the real UI; no duplicate rule implementation.
const source=fs.readFileSync(path.resolve(__dirname,"../web-spa/src/games/crazyCourtEngine.ts"),"utf8");
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
const moduleRef={exports:{}};
new Function("module","exports",outputText)(moduleRef,moduleRef.exports);
const {courtCases,courtReasons,evaluateCourtAction,courtVerdict}=moduleRef.exports;

test("each Crazy Court case has four claims and three distinct evidence cards",()=>{
 assert.equal(courtCases.length,3);
 for(const court of courtCases){
  assert.equal(court.claims.length,4);
  assert.equal(court.evidence.length,3);
  assert.equal(new Set(court.evidence.map(e=>e.id)).size,3);
  for(const claim of court.claims){
   assert.ok(claim.defense.zh&&claim.prosecution.en);
   assert.ok(!claim.flaw||courtReasons.some(r=>r.id===claim.flaw));
  }
 }
});
test("evidence can only score once and never creates new evidence",()=>{
 const court=courtCases[0];
 const support=evaluateCourtAction(court,"prosecution",0,{kind:"evidence",evidenceId:"note"},[],3);
 assert.equal(support.points,3);
 assert.equal(support.usedEvidenceId,"note");
 assert.equal(evaluateCourtAction(court,"prosecution",1,{kind:"evidence",evidenceId:"note"},["note"],3).valid,false);
 assert.equal(evaluateCourtAction(court,"defense",1,{kind:"evidence",evidenceId:"note"},[],3).points,0);
 assert.equal(evaluateCourtAction(court,"defense",1,{kind:"evidence",evidenceId:"invented"},[],3).valid,false);
});
test("objections are governed by the scripted claim rather than AI speech",()=>{
 const court=courtCases[0];
 const valid=evaluateCourtAction(court,"defense",1,{kind:"objection",reason:"unsupported"},[],3);
 assert.deepEqual({valid:valid.valid,points:valid.points},{valid:true,points:3});
 assert.equal(evaluateCourtAction(court,"defense",1,{kind:"objection",reason:"irrelevant"},[],3).points,-1);
 assert.equal(evaluateCourtAction(court,"defense",0,{kind:"objection",reason:"unsupported"},[],3).points,-1);
 assert.equal(evaluateCourtAction(court,"defense",1,{kind:"objection",reason:"unsupported"},[],0).valid,false);
});
test("short statements and out-of-range turns do not score",()=>{
 const court=courtCases[0];
 assert.equal(evaluateCourtAction(court,"defense",0,{kind:"statement",text:"  a "},[],3).valid,false);
 assert.equal(evaluateCourtAction(court,"defense",0,{kind:"statement",text:"Please examine the note"},[],3).points,1);
 assert.equal(evaluateCourtAction(court,"defense",4,{kind:"pass"},[],3).valid,false);
});
test("verdict requires deliberate scoring actions",()=>{
 assert.equal(courtVerdict(4),"lose");
 assert.equal(courtVerdict(5),"win");
 assert.equal(courtVerdict(7),"win");
});
