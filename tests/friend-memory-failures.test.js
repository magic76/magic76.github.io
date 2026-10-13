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
  ["rememberFriendConversation","getFriendTopics","getFriendCaptureStatus","classifyFriendMemoryHttpError"],
  {localStorage,fetch:fetcher,geminiKey:()=>key,CREW_FRIENDS:[{id:"zoe"}],
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
 await Promise.resolve();await Promise.resolve();
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
