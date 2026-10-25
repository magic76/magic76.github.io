const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");

// Load exactly the production validator, independent of any browser or external AI calls.
const source=fs.readFileSync(path.resolve(__dirname,"../web-spa/src/games/courtJudge.ts"),"utf8").replace(/^import .+$/gm,"");
const stripped=stripTypeScriptTypes(source).replace(/^export /gm,"");
const mod={exports:{}};
new Function("module","exports",stripped+"\nObject.assign(exports,{parseCourtTurn,parseCourtFinal,courtWeightedTotal});")(mod,mod.exports);
const {parseCourtTurn,parseCourtFinal,courtWeightedTotal}=mod.exports;
const reason="The statement is grounded in the established case facts.";
test("court turn judgment accepts bounded, explicit structured reasoning",()=>{
 const action={kind:"statement",text:"The note says it belongs to a roommate."};
 assert.deepEqual(parseCourtTurn(JSON.stringify({points:3,accepted:true,reason}),action),{points:3,accepted:true,reason});
 assert.equal(parseCourtTurn({points:0,accepted:false,reason},action).points,0);
});
test("objection scores and acceptance cannot disagree",()=>{
 const action={kind:"objection",reason:"unsupported"};
 assert.deepEqual(parseCourtTurn({points:3,accepted:true,reason},action).accepted,true);
 assert.deepEqual(parseCourtTurn({points:-1,accepted:false,reason},action).points,-1);
 assert.throws(()=>parseCourtTurn({points:3,accepted:false,reason},action));
 assert.throws(()=>parseCourtTurn({points:0,accepted:false,reason},action));
});
test("rejects forged scores, missing rationale, extraneous JSON and invalid evidence scores",()=>{
 const action={kind:"evidence",evidenceId:"note"};
 assert.throws(()=>parseCourtTurn({points:999,accepted:true,reason},action));
 assert.throws(()=>parseCourtTurn({points:3.5,accepted:true,reason},action));
 assert.throws(()=>parseCourtTurn({points:3,accepted:false,reason},action));
 assert.throws(()=>parseCourtTurn({points:3,accepted:true,reason:"ok"},action));
 assert.throws(()=>parseCourtTurn('["not an object"]',action));
});
test("AI supplies rubric subscores but the engine computes the winner",()=>{
 const record={logic:8,evidence:6,rebuttal:7,creativity:10,reason:"Evidence was relevant. Rebuttal addressed the actual claim."};
 const outcome=parseCourtFinal({...record,total:0,winner:"opponent"});
 assert.equal(outcome.total,courtWeightedTotal(record));
 assert.equal(outcome.total,75);
 assert.equal(outcome.winner,"player");
 assert.equal(parseCourtFinal({...record,logic:0,evidence:0,rebuttal:0,creativity:0}).winner,"opponent");
});
test("unavailable Gemini verdicts cannot be mistaken for wins or losses",()=>{
 assert.throws(()=>parseCourtFinal({winner:"player",reason}));
 assert.throws(()=>parseCourtFinal({logic:20,evidence:0,rebuttal:0,creativity:0,reason}));
 assert.throws(()=>parseCourtFinal({logic:5,evidence:5,rebuttal:5,creativity:5,reason:"short"}));
});
