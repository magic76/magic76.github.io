const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const root=path.resolve(__dirname,"..");
const spec=JSON.parse(fs.readFileSync(path.join(root,"contracts/crew-teacher/v1.json"),"utf8"));

test("Crew Teacher Web implementation matches local shared behavior contract",()=>{
 const result=spawnSync(process.execPath,[path.join(root,"scripts/verify-teacher-contract.cjs")],{
  cwd:root,encoding:"utf8",timeout:12000
 });
 assert.equal(result.status,0,result.stderr||result.stdout);
 assert.match(result.stdout,/web anchors OK/);
});

test("teacher feature matrix tracks platform exceptions without claiming identical UI",()=>{
 assert.equal(spec.schemaVersion,1);
 assert.equal(spec.owner,"magic76/crew-teacher");
 assert.ok(spec.featureMatrix.length>=13);
 const ids=new Set(spec.featureMatrix.map(x=>x.id));
 assert.equal(ids.size,spec.featureMatrix.length);
 for(const id of ["friend_profiles","teacher_profiles","free_chat","memory_consent","target_language_lock","live_recovery","roleplay"])
  assert.ok(ids.has(id),"Missing "+id);
 assert.equal(spec.featureMatrix.find(x=>x.id==="floating_service").web,"not-applicable");
 assert.equal(spec.featureMatrix.find(x=>x.id==="web_seo").android,"not-applicable");
});

test("teacher contract keeps default-on memories, conversation boundaries and manual voice QA",()=>{
 assert.equal(spec.rules.memory.personalDefaultOn,true);
 assert.equal(spec.rules.memory.friendTopicDefaultOn,true);
 assert.equal(spec.rules.memory.explicitOptOutPreserved,true);
 assert.equal(spec.rules.freeChat.questionRequiredEachTurn,false);
 assert.equal(spec.rules.freeChat.pivotAfterShortReplies,2);
 assert.equal(spec.rules.freeChat.pivotAfterConsecutiveQuestions,3);
 assert.equal(spec.rules.friends.singleLanguagePerSpokenReply,true);
 assert.equal(spec.rules.friends.immersionAlwaysTargetOnly,true);
 assert.equal(spec.rules.friends.friendMaxSilentNudges,1);
 assert.equal(spec.rules.practice.roleplayStaysInCharacter,true);
 for(const id of ["short_replies","immersion_language","roleplay","memory_off"])
  assert.ok(spec.manualAcceptance.some(s=>s.id===id));
});
