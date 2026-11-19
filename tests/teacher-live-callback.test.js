const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

// Exercise the real callback body with a deliberately stale React render.
// LiveSession publishes completedTurns synchronously, before React can render live.turns.
const source=fs.readFileSync(path.join(__dirname,"../web-spa/src/teacher/LivePage.tsx"),"utf8");
const callback=source.match(/onTurnComplete:\(_turn,completedTurns\)=>\{([\s\S]*?)\n\s+\},\n\s+onSessionFinished:/);
assert.ok(callback,"Teacher Live completed-turn callback not found");
const makeCallback=new Function(
 "usageSentRef","trackUsageEvent","isRoleplay","memoryCheckpointRef","personalMemoryEnabled",
 "live","hasMeaningfulLearnerSpeech","rememberTeacherConversation","s","geminiKey","replyHints",
 "return (_turn,completedTurns)=>{"+callback[1]+"\n};"
);
function harness({roleplay=false,enabled=true}={}){
 const checkpoints=[],usage=[],usageSentRef={current:false},memoryCheckpointRef={current:false};
 const live={turns:[]}; // stale React state while the ref/callback already has the new turn
 const onTurnComplete=makeCallback(usageSentRef,event=>usage.push(event),roleplay,memoryCheckpointRef,
  ()=>enabled,live,text=>text.includes("I enjoy hiking on weekends"),
  (language,turns,key)=>{checkpoints.push({language,turns,key});return Promise.resolve()},{
    targetLanguage:"英文"
  },()=> "test-key",{clear(){}});
 return {onTurnComplete,checkpoints,usage,memoryCheckpointRef};
}
const completedTurns=[{input:"I enjoy hiking on weekends",output:"Where do you usually go?"}];
test("checkpoint uses synchronous completed turns, not stale React live.turns",()=>{
 const h=harness();
 h.onTurnComplete({},completedTurns);
 assert.equal(h.checkpoints.length,1,"newly completed turn must be saved immediately");
 assert.deepEqual(h.checkpoints[0].turns,completedTurns);
 assert.equal(h.checkpoints[0].language,"英文");
 assert.deepEqual(h.usage,["teacher_conversation"]);
 h.onTurnComplete({},[...completedTurns,{input:"Another update",output:"Okay"}]);
 assert.equal(h.checkpoints.length,1,"checkpoint remains deduplicated");
 assert.equal(h.usage.length,1);
});
test("roleplay and explicit memory opt-out do not checkpoint or consume the checkpoint",()=>{
 const roleplay=harness({roleplay:true});
 roleplay.onTurnComplete({},completedTurns);
 assert.equal(roleplay.checkpoints.length,0);
 const optedOut=harness({enabled:false});
 optedOut.onTurnComplete({},completedTurns);
 assert.equal(optedOut.checkpoints.length,0);
 assert.equal(optedOut.memoryCheckpointRef.current,false);
});
test("short or trivial speech is not checkpointed",()=>{
 const h=harness();
 h.onTurnComplete({},[{input:"Hi",output:"Hello"}]);
 assert.equal(h.checkpoints.length,0);
 assert.equal(h.memoryCheckpointRef.current,false);
});
