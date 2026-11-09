const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const fileSource=p=>fs.readFileSync(path.join(root,p),"utf8");
function store(){
 const data=new Map();
 return{
  getItem:key=>data.has(key)?data.get(key):null,
  setItem:(key,value)=>data.set(key,String(value)),
  removeItem:key=>data.delete(key),
  keys:()=>[...data.keys()]
 };
}
function evaluateFile(file,names,context){
 const source=stripTypeScriptTypes(fileSource(file),{mode:"strip"})
  .replace(/^import.*(?:\n|$)/gm,"")
  .replace(/\bexport\s+(?=(?:const|function|async\s+function))/g,"");
 const exports={};
 // Match the public CrewAI.call contract used by both memory extractors.
 const call=async()=>{
  const response=await context.fetch();
  if(!response.ok)throw Object.assign(new Error("Gemini text request failed"),
   {kind:response.status===429?"quota":response.status===401?"key":"service",status:response.status});
  const json=await response.json();
  return String(json?.candidates?.[0]?.content?.parts?.[0]?.text||"");
 };
 vm.runInNewContext(source+"\nObject.assign(exports,{"+names.join(",")+"});",
  {exports,Date,Math,JSON,fetch:context.fetch,localStorage:context.localStorage,
   geminiKey:context.geminiKey,ensureCore:async()=>{},
   window:{CrewAI:{call},dispatchEvent:()=>{}},Event:class Event{},clearAllSpeakingLevels:()=>{},clearSpeakingLevel:()=>{},clearAllBoardReviews:()=>{},clearBoardReviewsForLanguage:()=>{},...context},{filename:file});
 return exports;
}
const payload=memory_updates=>({
 candidates:[{content:{parts:[{text:JSON.stringify({memory_updates})}]}}]
});
function learnerSetup(fetcher){
 const localStorage=store();
 const learner=evaluateFile("web-spa/src/teacher/studentMemory.ts",[
  "studentMemories","personalMemoryEnabled","setPersonalMemoryEnabled","getPersonalMemoryEpoch",
  "verifiedLearnerEvidence","hasMeaningfulLearnerSpeech","ingestStudentPersonalUpdates",
  "rememberTeacherConversation","clearStudentMemory","normalizeLearningLanguage"
 ],{localStorage,geminiKey:()=> "test-key",fetch:fetcher});
 return{learner,localStorage};
}
test("one meaningful student utterance is sufficient for durable profile memory",async()=>{
 const {learner,localStorage}=learnerSetup(async()=>({ok:true,json:async()=>payload({
  facts:[{key:"pet-cat",detail:"My cat is named Momo",explicit:true,
   evidence:"I have a cat named Momo",confidence:.65}]
 })}));
 assert.equal(learner.personalMemoryEnabled(),true);
 assert.equal(learner.hasMeaningfulLearnerSpeech("Hi"),false);
 assert.equal(learner.hasMeaningfulLearnerSpeech("I have a cat named Momo"),true);
 await learner.rememberTeacherConversation("英文",[{input:"I have a cat named Momo"}],"test-key");
 const items=learner.studentMemories("英文");
 assert.equal(items.length,1);
 assert.equal(items[0].type,"fact");
 assert.equal(items[0].detail,"My cat is named Momo");
 assert.equal(learner.studentMemories("日文").length,0);
 assert.equal(localStorage.keys().some(k=>k.includes("transcript")),false);
});
test("no invented, sensitive or mismatched evidence is persisted",()=>{
 const {learner}=learnerSetup(async()=>({ok:true,json:async()=>payload({})}));
 learner.ingestStudentPersonalUpdates("英文",{facts:[
  {key:"fabricated",detail:"Owns a private jet",explicit:true,evidence:"I own a private jet"},
  {key:"address",detail:"My home address is 123 Sample Road",explicit:true,evidence:"I live at 123 Sample Road"}
 ]},"I live at 123 Sample Road");
 assert.equal(learner.studentMemories("英文").length,0);
 assert.equal(learner.verifiedLearnerEvidence("我有一隻貓叫小白","我有一隻貓叫小白"),true);
 assert.equal(learner.verifiedLearnerEvidence("I have a cat named Momo","Momo"),false);
});
test("opt-out or clearing memory invalidates a pending AI response",async()=>{
 let complete;
 const pending=new Promise(resolve=>complete=resolve);
 const {learner}=learnerSetup(async()=>({ok:true,json:()=>pending}));
 const task=learner.rememberTeacherConversation("英文",[{input:"I have a cat named Momo"}],"test-key");
 learner.setPersonalMemoryEnabled(false);
 complete(payload({facts:[{key:"pet",detail:"My cat is Momo",explicit:true,evidence:"I have a cat named Momo"}]}));
 await task;
 assert.equal(learner.studentMemories("英文").length,0);
 assert.equal(learner.personalMemoryEnabled(),false);
 learner.setPersonalMemoryEnabled(true);
 const epoch=learner.getPersonalMemoryEpoch();
 learner.clearStudentMemory("英文");
 assert.ok(learner.getPersonalMemoryEpoch()>epoch);
});
test("one-turn Crew Friend memory is not blocked by recent-chat duration",async()=>{
 const raw={topics:[{key:"new-puppy",title:"Adopted a puppy",summary:"Learner adopted a puppy named Max",
  followUp:"How is Max?",evidence:"I adopted a puppy named Max"}],memory_updates:{facts:[]}};
 const {learner,localStorage}=learnerSetup(async()=>({ok:true,json:async()=>payload({})}));
 const friends=evaluateFile("web-spa/src/friends/friendMemory.ts",[
  "rememberFriendConversation","getFriendTopics","getFriendCaptureStatus","friendMemoryEnabled","recordFriendChat"
 ],{localStorage,geminiKey:()=>"test-key",fetch:async()=>({ok:true,json:async()=>({
  candidates:[{content:{parts:[{text:JSON.stringify(raw)}]}}]
 })}),CREW_FRIENDS:[{id:"zoe"}],normalizeLearningLanguage:learner.normalizeLearningLanguage,
  personalMemoryEnabled:learner.personalMemoryEnabled,getPersonalMemoryEpoch:learner.getPersonalMemoryEpoch,
  ingestStudentPersonalUpdates:learner.ingestStudentPersonalUpdates,
  hasMeaningfulLearnerSpeech:learner.hasMeaningfulLearnerSpeech,
  verifiedLearnerEvidence:learner.verifiedLearnerEvidence,
  studentMemories:learner.studentMemories});
 const turns=[{input:"I adopted a puppy named Max",output:"That's wonderful!"}];
 assert.equal(friends.friendMemoryEnabled(),true);
 assert.equal(friends.recordFriendChat("zoe","英文",turns,1000),false);
 await friends.rememberFriendConversation("zoe","英文",turns,1000);
 assert.equal(friends.getFriendTopics("zoe","英文").length,1);
 assert.equal(friends.getFriendCaptureStatus("zoe","英文"),"saved");
});
test("Web report respects default-on consent for personal facts",()=>{
 const source=fileSource("features/teacher/reports/session-report.js");
 assert.ok(source.includes('localStorage.getItem("crew_teacher_personal_memory_opt_in_v2")!=="0"'));
 assert.ok(source.includes("facts:[{key,detail,explicit,evidence}]"));
});

test("Teacher and Friend text mode bypasses microphone auto-start and uses text-only Gemini",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const root=path.resolve(__dirname,"..");
 const friend=fs.readFileSync(path.join(root,"web-spa/src/friends/FriendLivePage.tsx"),"utf8");
 const teacher=fs.readFileSync(path.join(root,"web-spa/src/teacher/LivePage.tsx"),"utf8");
 const panel=fs.readFileSync(path.join(root,"web-spa/src/live/TextChatPanel.tsx"),"utf8");
 for(const source of [friend,teacher]){
  assert.match(source,/\btextMode\b/);
  if(source===friend){
   assert.match(source,/if\(textMode\|\|!geminiKey\(\)\|\|shortsPost\)return;const timer=/);
  }else assert.match(source,/if\(textMode\|\|!geminiKey\(\)\)return;const timer=/);
  assert.match(source,/<TextChatPanel/);
  assert.match(source,/live\.stop\(true\)\.finally/);
 }
 assert.match(panel,/new LiveTextConversation\(system,searchEnabled/);
 assert.doesNotMatch(panel,/getUserMedia\(/);
 assert.doesNotMatch(panel,/getUserMedia\(/);
});
