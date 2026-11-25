const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
function storage(){
 const map=new Map();
 return{
  getItem:key=>map.has(key)?map.get(key):null,
  setItem:(key,value)=>map.set(key,String(value)),
  removeItem:key=>map.delete(key)
 };
}
function extract(file,names,context){
 const source=stripTypeScriptTypes(fs.readFileSync(path.join(root,file),"utf8"),{mode:"strip"})
  .replace(/^import.*(?:\n|$)/gm,"")
  .replace(/\bexport\s+(?=(?:const|function|async\s+function))/g,"");
 const exports={};
 const call=async()=>{
  const response=await context.fetch();
  if(!response.ok)throw Object.assign(new Error("Gemini text request failed"),
   {kind:response.status===429?"quota":response.status===401?"key":"service",status:response.status});
  const json=await response.json();
  return String(json?.candidates?.[0]?.content?.parts?.[0]?.text||"");
 };
 vm.runInNewContext(source+"\nObject.assign(exports,{"+names.join(",")+"});",
  {exports,Date,Math,JSON,localStorage:context.localStorage,fetch:context.fetch,
   ensureCore:async()=>{},window:{CrewAI:{call},dispatchEvent:()=>{}},Event:class Event{},...context},{filename:file});
 return exports;
}
function setup(fetcher,key="test-key"){
 const localStorage=storage();
 const learner=extract("web-spa/src/teacher/studentMemory.ts",
  ["normalizeLearningLanguage","personalMemoryEnabled","getPersonalMemoryEpoch","studentMemories",
   "ingestStudentPersonalUpdates","hasMeaningfulLearnerSpeech","verifiedLearnerEvidence"],
  {localStorage,fetch:fetcher});
 const friends=extract("web-spa/src/friends/friendMemory.ts",
  ["createFriendLiveMemory","getFriendCaptureSource","setFriendMemoryEnabled","clearFriendTopics","rememberFriendConversation","getFriendTopics","getFriendCaptureStatus","classifyFriendMemoryHttpError","pinFriendTopic","saveFriendTopic","allowFriendTopicAutoUpdate"],
  {localStorage,fetch:fetcher,geminiKey:()=>key,CREW_FRIENDS:[{id:"zoe"},{id:"yuna"}],
   normalizeLearningLanguage:learner.normalizeLearningLanguage,
   personalMemoryEnabled:learner.personalMemoryEnabled,
   getPersonalMemoryEpoch:learner.getPersonalMemoryEpoch,
   studentMemories:learner.studentMemories,
   ingestStudentPersonalUpdates:learner.ingestStudentPersonalUpdates,
   hasMeaningfulLearnerSpeech:learner.hasMeaningfulLearnerSpeech,
   verifiedLearnerEvidence:learner.verifiedLearnerEvidence});
 return {friends,localStorage};
}
const valid={topics:[{key:"new-puppy",title:"Adopted a puppy",
 summary:"Learner adopted a puppy named Max",followUp:"How is Max?",
 evidence:"I adopted a puppy named Max"}],memory_updates:{}};
const response=payload=>({ok:true,json:async()=>({
 candidates:[{content:{parts:[{text:JSON.stringify(payload)}]}}]
})});
const turns=[{input:"I adopted a puppy named Max",output:"That's nice!"}];

test("first turn and identical end snapshot share one memory request",async()=>{
 let calls=0,release;
 const gate=new Promise(resolve=>{release=resolve});
 const {friends}=setup(async()=>{calls++;await gate;return response(valid)});
 const first=friends.rememberFriendConversation("zoe","英文",turns,11000);
 const final=friends.rememberFriendConversation("zoe","英文",turns,11000);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls,1);
 release();
 await Promise.all([first,final]);
 assert.equal(calls,1);
 assert.equal(friends.getFriendCaptureStatus("zoe","英文"),"saved");
 assert.equal(friends.getFriendTopics("zoe","英文").length,1);
 await friends.rememberFriendConversation("zoe","英文",turns,11000);
 assert.equal(calls,1);
});

test("a longer transcript can update memory without changing earlier saved status to empty",async()=>{
 let calls=0;
 const {friends}=setup(async()=>response(calls++===0?valid:{topics:[],memory_updates:{}}));
 await friends.rememberFriendConversation("zoe","英文",turns,11000);
 await friends.rememberFriendConversation("zoe","英文",
  [...turns,{input:"I want to try hiking next weekend",output:"Sounds fun"}],20000);
 assert.equal(calls,2);
 assert.equal(friends.getFriendTopics("zoe","英文").length,1);
 assert.equal(friends.getFriendCaptureStatus("zoe","英文"),"saved");
});

test("API quota is not misreported as a missing Gemini key",async()=>{
 const {friends}=setup(async()=>({ok:false,status:429,json:async()=>({error:{
  status:"RESOURCE_EXHAUSTED",message:"Quota exceeded"
 }})}));
 await friends.rememberFriendConversation("zoe","英文",turns,11000);
 assert.equal(friends.getFriendCaptureStatus("zoe","英文"),"error-quota");
 assert.equal(friends.classifyFriendMemoryHttpError(403,"PERMISSION_DENIED"),"error-key");
 assert.equal(friends.classifyFriendMemoryHttpError(503,"UNAVAILABLE"),"error-service");
});

test("missing key and broken JSON have distinct failure messages",async()=>{
 const missing=setup(async()=>{throw Error("Should not call")}, "");
 await missing.friends.rememberFriendConversation("zoe","英文",turns,11000);
 assert.equal(missing.friends.getFriendCaptureStatus("zoe","英文"),"error-key");
 const broken=setup(async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:"not-json"}]}}]})}));
 await broken.friends.rememberFriendConversation("zoe","英文",turns,11000);
 assert.equal(broken.friends.getFriendCaptureStatus("zoe","英文"),"error-response");
});

test("all user-facing capture statuses have Traditional Chinese and English translations",()=>{
 for(const lang of ["zh-TW","en"]){
  const names=JSON.parse(fs.readFileSync(path.join(root,"web-spa/src/i18n/locales",lang,"friends.json"),"utf8")).capture;
  for(const key of ["pending","saved","updated","empty","error","error-key","error-quota","error-network","error-service","error-response"])
   assert.ok(names[key],lang+" missing "+key);
 }
});

test("Zoe and Yuna have separate memories for every target language",async()=>{
 const {friends}=setup(async()=>response({topics:[{key:"movie-plan",title:"Movie tomorrow",
  summary:"The learner plans to watch a movie tomorrow",followUp:"Which movie?",
  evidence:"I am planning to watch a movie tomorrow"}],memory_updates:{}}));
 const exchange=[{input:"I am planning to watch a movie tomorrow",output:"Sounds fun"}];
 await friends.rememberFriendConversation("zoe","英文",exchange,1000);
 assert.equal(friends.getFriendTopics("zoe","英文").length,1);
 assert.equal(friends.getFriendTopics("yuna","英文").length,0);
 assert.equal(friends.getFriendTopics("zoe","日文").length,0);
 await friends.rememberFriendConversation("yuna","英文",exchange,1000);
 assert.equal(friends.getFriendTopics("yuna","英文").length,1);
 assert.equal(friends.getFriendTopics("zoe","英文").length,1);
});

test("AI-generated pinned topics continue to update from verified learner speech",async()=>{
 let calls=0;
 const {friends}=setup(async()=>response({topics:[{
  key:"movie-plan",title:"Our movie chat",
  summary:calls++?"Learner wants to see a comedy tomorrow":"Learner will watch a movie tomorrow",
  followUp:"Which movie?",
  evidence:calls>1?"I want to see a comedy tomorrow":"I will watch a movie tomorrow"
 }]}));
 await friends.rememberFriendConversation("zoe","英文",
  [{input:"I will watch a movie tomorrow",output:"Great!"}],1000);
 const initial=friends.getFriendTopics("zoe","英文")[0];
 assert.equal(initial.manual,false);
 friends.pinFriendTopic("zoe","英文",initial.id);
 assert.equal(friends.getFriendTopics("zoe","英文")[0].manual,false);
 await friends.rememberFriendConversation("zoe","英文",
  [{input:"I want to see a comedy tomorrow",output:"Nice choice!"}],1000);
 const updated=friends.getFriendTopics("zoe","英文")[0];
 assert.equal(updated.pinned,true);
 assert.equal(updated.manual,false);
 assert.equal(updated.id,initial.id);
 assert.match(updated.summary,/comedy/);
});

test("legacy manual topics require explicit permission before later AI updates",async()=>{
 const {friends}=setup(async()=>response({topics:[]}));
 assert.equal(friends.saveFriendTopic("zoe","英文","Movies discussed","A note I edited"),true);
 const before=friends.getFriendTopics("zoe","英文")[0];
 assert.equal(before.manual,true);
 friends.pinFriendTopic("zoe","英文",before.id);
 assert.equal(friends.getFriendTopics("zoe","英文")[0].manual,true);
 assert.equal(friends.allowFriendTopicAutoUpdate("zoe","英文",before.id),true);
 const updated=friends.getFriendTopics("zoe","英文")[0];
 assert.equal(updated.manual,false);
 assert.equal(updated.pinned,true);
 assert.equal(friends.allowFriendTopicAutoUpdate("zoe","英文",before.id),false);
 const page=fs.readFileSync(path.join(root,"web-spa/src/friends/FriendsPage.tsx"),"utf8");
 assert.match(page,/item.manual\?<button/);
 assert.match(page,/autoUpdateConfirm/);
 for(const lang of ["zh-TW","en"]){
  const labels=JSON.parse(fs.readFileSync(path.join(root,"web-spa/src/i18n/locales",lang,"friends.json"),"utf8"));
  assert.ok(labels.autoUpdate&&labels.autoUpdateConfirm);
 }
});

test("Live completion saves the finished transcript, not stale React state",()=>{
 const shared=fs.readFileSync(path.join(root,"web-spa/src/live/useLiveSession.ts"),"utf8");
 const friend=fs.readFileSync(path.join(root,"web-spa/src/friends/FriendLiveConversation.tsx"),"utf8");
 assert.match(shared,/onTurnComplete\?\.\(turn,turnsRef\.current\.slice\(\)\)/);
 assert.match(friend,/onTurnComplete:\(_turn,completedTurns\)=>/);
 assert.match(friend,/rememberFriendConversation\(sessionId,language,completedTurns,0\)/);
 assert.match(friend,/checkpointCountRef\.current>=3/);
 assert.match(friend,/learnerTurns-lastCheckpointTurnRef\.current<3/);
 assert.match(friend,/rememberFriendConversation\(sessionId,language,item\.turns,item\.durationMs\)/);
 assert.doesNotMatch(friend,/const snapshot=live\.turns/);
});

test("memory prompt accepts temporary conversation plans but preserves evidence and safety guards",()=>{
 const source=fs.readFileSync(path.join(root,"web-spa/src/friends/friendMemory.ts"),"utf8");
 assert.match(source,/Everyday plans such as watching a movie tomorrow/);
 assert.match(source,/evidence copied verbatim from learner speech/);
 assert.match(source,/verifiedLearnerEvidence\(speech,quote\)/);
 assert.match(source,/epoch\(\)===consentEpoch/);
 assert.match(source,/if\(existing\?\.manual\)continue/);
});



test("Live memory is queued until a verified completed turn, without text model",()=>{
 let requests=0;
 const {friends}=setup(async()=>{requests++;throw Error("unexpected text call")});
 const live=friends.createFriendLiveMemory("zoe","英文");
 assert.equal(live.onCall({id:"a",name:"save_friend_memory",args:valid}).ok,true);
 assert.equal(friends.getFriendTopics("zoe","英文").length,0);
 live.complete(turns);
 assert.equal(friends.getFriendTopics("zoe","英文").length,1);
 assert.equal(friends.getFriendCaptureSource("zoe","英文"),"Live");
 assert.equal(live.hasSaved(),true);
 assert.equal(requests,0);
 assert.equal(friends.getFriendTopics("yuna","英文").length,0);
 assert.equal(friends.getFriendTopics("zoe","日文").length,0);
 live.onCall({id:"a",name:"save_friend_memory",args:valid});
 live.complete(turns);
 assert.equal(friends.getFriendTopics("zoe","英文").length,1);
});
test("Live memory rejects assistant-only evidence and revoked consent",()=>{
 const {friends}=setup(async()=>{throw Error("unexpected text call")});
 const live=friends.createFriendLiveMemory("zoe","英文");
 live.onCall({name:"save_friend_memory",args:valid});
 live.complete([{input:"Hello",output:turns[0].input}]);
 assert.equal(friends.getFriendTopics("zoe","英文").length,0);
 live.onCall({name:"save_friend_memory",args:valid});
 friends.setFriendMemoryEnabled(false);
 friends.setFriendMemoryEnabled(true);
 live.complete(turns);
 assert.equal(friends.getFriendTopics("zoe","英文").length,0);
 live.onCall({name:"save_friend_memory",args:valid});
 friends.clearFriendTopics("zoe","英文");
 live.complete(turns);
 assert.equal(friends.getFriendTopics("zoe","英文").length,0);
 live.toolsUnavailable();
 assert.equal(live.shouldCheckpointFallback(),true);
});
