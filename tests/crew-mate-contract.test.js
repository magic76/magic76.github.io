const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
// Node 22.23+ supports TypeScript type stripping, matching the repository CI runtime.
const mate=require("../web-spa/src/mate/mateState.ts");
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
 assert.match(external,/not included in this external session/i);
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

// P1: stopped records are resumable only with the owner's opted-in consensus.
test("resuming historical tasks never reopens completed tasks or an incomplete snapshot",()=>{
 const base={...consensus};
 const item={id:"task-1",status:"stopped",consensus:base};
 assert.equal(mate.mateHistoryResumable(item),true);
 assert.equal(mate.mateHistoryResumable({...item,status:"completed"}),false);
 assert.equal(mate.mateHistoryResumable({...item,consensus:undefined}),false);
 assert.equal(mate.mateHistoryResumable({...item,consensus:{...base,target:""}}),false);
});
test("saved snapshots are bounded, deletable and never affect other task IDs",()=>{
 const saved=new Map();
 const original=global.localStorage;
 global.localStorage={
  getItem:key=>saved.get(key)||null,
  setItem:(key,value)=>saved.set(key,value)
 };
 try{
  for(let index=0;index<25;index++)mate.storeMateHistory({
   id:"mate-"+index,status:"stopped",target:"Hotel",goal:"Ask reception",
   userLanguage:"zh-TW",otherLanguage:"en",turns:[],outcome:"",
   updatedAt:index,consensus:{...consensus}
  });
  assert.equal(mate.readMateHistory().length,20);
  const before=mate.readMateHistory()[1].id;
  mate.deleteMateHistory(before);
  assert.equal(mate.readMateHistory().length,19);
  assert.equal(mate.readMateHistory().some(x=>x.id===before),false);
 }finally{global.localStorage=original}
});
test("briefing is finalized from confirmed speech and unsent typed text before external handoff",()=>{
 const page=fs.readFileSync(path.join(root,"web-spa/src/mate/MatePage.tsx"),"utf8");
 const briefing=fs.readFileSync(path.join(root,"web-spa/src/mate/mateBriefing.ts"),"utf8");
 assert.match(page,/privateStatements\.current\.push\(turn\.input\.trim\(\)\)/);
 assert.match(page,/\.\.\.privateStatements\.current,\.\.\.\(raw\?\[raw\]:\[\]\)/);
 assert.match(page,/await finalizeMateBriefing\(consensusRef\.current,statements\)/);
 assert.match(briefing,/Do not guess missing fields/);
 assert.match(page,/setConfirmOwner\(false\);\s*advance\("review"/);
});
test("P1 external view has a dedicated transcript and explicit reconnect path",()=>{
 const page=fs.readFileSync(path.join(root,"web-spa/src/mate/MatePage.tsx"),"utf8");
 const transcript=fs.readFileSync(path.join(root,"web-spa/src/mate/MateTranscript.tsx"),"utf8");
 assert.match(page,/showHistory&&phase!=="external"&&phase!=="decision"/);
 assert.match(page,/MateTranscript turns=\{turns\}/);
 assert.match(page,/Review and reconnect/);
 assert.match(transcript,/shouldFollow\.current=nearBottom/);
 assert.match(transcript,/role="log"/);
});
