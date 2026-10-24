const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ts=require("typescript");
const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"web-spa/src/mate/mateState.ts"),"utf8");
const js=ts.transpileModule(source,{compilerOptions:{target:9,module:1}}).outputText;
const loaded={exports:{}};
new Function("module","exports",js)(loaded,loaded.exports);
const mate=loaded.exports;
const consensus={
 target:"Hotel",goal:"Request early check-in",constraints:"Do not pay a surcharge",
 escalation:"Ask me before any payment change",userLanguage:"zh-TW",otherLanguage:"en"
};
test("Mate briefing readiness is explicit, not guessed",()=>{
 assert.equal(mate.mateConsensusReady(consensus),true);
 assert.equal(mate.mateConsensusReady({...consensus,constraints:""}),false);
 assert.equal(mate.mateConsensusReady({...consensus,goal:" "}),false);
});
test("model consensus updates cannot mutate user languages or approval state",()=>{
 const updated=mate.applyMateConsensusPatch(consensus,{
  goal:"Request a room",constraints:"No cash",otherLanguage:"ru",phase:"external",approved:true
 });
 assert.equal(updated.goal,"Request a room");
 assert.equal(updated.otherLanguage,"en");
 assert.deepEqual(Object.keys(updated).sort(),Object.keys(consensus).sort());
 assert.equal(updated.escalation,consensus.escalation);
});
test("Mate speech audience strictly limits tools",()=>{
 const allow=mate.mateToolAllowed;
 assert.equal(allow("private","PRIVATE_TO_MATE","update_task_consensus",false,false),true);
 assert.equal(allow("external","EXTERNAL_WITH_MATE","update_task_consensus",true,true),false);
 assert.equal(allow("external","PRIVATE_TO_MATE","request_user_input",true,true),false);
 assert.equal(allow("external","EXTERNAL_WITH_MATE","request_user_input",false,false),false);
 assert.equal(allow("external","EXTERNAL_WITH_MATE","request_user_input",true,false),true);
 assert.equal(allow("external","EXTERNAL_WITH_MATE","complete_task",true,false),false);
 assert.equal(allow("external","EXTERNAL_WITH_MATE","complete_task",true,true),true);
 assert.equal(allow("decision","MATE_HANDLING","complete_task",true,true),false);
});
test("public session prompt omits private constraints",()=>{
 const page=fs.readFileSync(path.join(root,"web-spa/src/mate/MatePage.tsx"),"utf8");
 const prompts=fs.readFileSync(path.join(root,"web-spa/src/mate/matePrompts.ts"),"utf8");
 const external=prompts.split("export const externalInstruction =")[1].split("export const privateInstruction =")[0];
 assert.equal(external.includes("c.constraints"),false);
 assert.equal(external.includes("c.escalation"),false);
 assert.match(external,/not included in this external session/);
 assert.match(page,/mode==="private"\?privateInstruction\(c\):externalInstruction\(c,/);
 assert.match(page,/const session=new window.CrewLive.Session\(voiceOptions\)/);
});
test("invalid tool payloads don't cause exceptions",()=>{
 assert.deepEqual(mate.parseMateToolArgs("invalid json"),{});
 assert.deepEqual(mate.parseMateToolArgs(null),{});
 assert.deepEqual(mate.parseMateToolArgs('{"goal":"fine"}'),{goal:"fine"});
});
test("all externally available tools exclude private consensus mutation",()=>{
 const tools=mate.mateToolDeclarations("external")[0].functionDeclarations;
 assert.deepEqual(tools.map(x=>x.name),["request_user_input","complete_task"]);
});
