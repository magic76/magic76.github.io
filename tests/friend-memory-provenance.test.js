const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const file=fs.readFileSync(path.join(root,"web-spa/src/friends/friendMemory.ts"),"utf8");
const learner=fs.readFileSync(path.join(root,"web-spa/src/teacher/studentMemory.ts"),"utf8");
const contract=JSON.parse(fs.readFileSync(path.join(root,"contracts/crew-teacher/v1.json"),"utf8"));
function memoryHarness(){
 const m=new Map();
 const localStorage={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
 const content=stripTypeScriptTypes(file,{mode:"strip"}).replace(/^import.*(?:\n|$)/gm,"")
  .replace(/\bexport\s+(?=(?:function|const|async\s+function))/g,"");
 const exports={};
 vm.runInNewContext(content+
  "\nObject.assign(exports,{friendTopicContext,friendPersonalContext,saveFriendTopic,getFriendTopics,setFriendMemoryEnabled,recordFriendVoiceExchange,friendVoiceOpeningRecall,getFriendLastChat,getHomeChatTopic});",
  {exports,localStorage,Date,Math,JSON,Map,Promise,Error,
   normalizeLearningLanguage:l=>l,CREW_FRIENDS:[{id:"zoe"},{id:"yuna"}],
   personalMemoryEnabled:()=>true,studentMemories:()=>[
    {active:true,type:"interest",detail:"Enjoys movies"}],
   window:{dispatchEvent:()=>{}},Event:class Event{}},{filename:"friendMemory.ts"});
 return {api:exports,localStorage};
}
test("verified extraction from Zoe is firsthand but not transferable to Yuna",()=>{
 const {api,localStorage}=memoryHarness();
 localStorage.setItem("crew_friend_topics_v1_zoe_English",
   JSON.stringify([{id:"a",key:"visit",title:"Museum visit",summary:"Considering a museum visit",
    followUp:"",pinned:false,manual:false,updatedAt:1}]));
 const prompt=api.friendTopicContext("zoe","English");
 assert.match(prompt,/\[VERIFIED SAME-CHARACTER CHAT\] - Museum visit/);
 assert.match(prompt,/You mentioned before/);
 assert.match(prompt,/never frame your own chats as hearsay/);
 assert.equal(api.friendTopicContext("yuna","English"),"");
});
test("manually edited notes are background rather than evidence of prior chats",()=>{
 const {api}=memoryHarness();
 assert.equal(api.saveFriendTopic("zoe","English","Plan","A plan I wrote"),true);
 const prompt=api.friendTopicContext("zoe","English");
 assert.match(prompt,/\[USER-EDITED TOPIC NOTE\] - Plan/);
 assert.match(prompt,/NOT proof the learner told you/);
 assert.doesNotMatch(prompt,/\[VERIFIED SAME-CHARACTER CHAT\] - Plan/);
 const personal=api.friendPersonalContext("English");
 assert.match(personal,/SHARED LEARNER PROFILE/);
 assert.match(personal,/not proof this friend previously heard it/);
 api.setFriendMemoryEnabled(false);
 assert.equal(api.friendTopicContext("zoe","English"),"");
});
test("guest voice learns relationship presence from a verified exchange, not AI greetings",()=>{
 const {api,localStorage}=memoryHarness();
 assert.equal(api.friendVoiceOpeningRecall("zoe","English").returning,false);
 assert.equal(api.recordFriendVoiceExchange("zoe","English"),true);
 const recalled=api.friendVoiceOpeningRecall("zoe","English");
 assert.equal(recalled.returning,true);
 assert.equal(recalled.verifiedTopic,false,"guest presence does not invent topics");
 assert.ok(api.getFriendLastChat("zoe","English")>0);
 assert.equal(api.friendVoiceOpeningRecall("yuna","English").returning,false);
 assert.equal(JSON.stringify(recalled).includes("transcript"),false);
 assert.ok(localStorage.getItem("crew_friend_known_by_exchange_v1").includes("zoe"));
 assert.doesNotMatch(localStorage.getItem("crew_friend_known_by_exchange_v1"),/hello|private|speech|text|transcript/i);
 api.setFriendMemoryEnabled(false);
 assert.equal(api.friendVoiceOpeningRecall("zoe","English").returning,false);
 assert.equal(localStorage.getItem("crew_friend_known_by_exchange_v1"),null);
});
test("only verified topics allow a voice opener to reference prior subject",()=>{
 const {api,localStorage}=memoryHarness();
 api.saveFriendTopic("zoe","English","Hiking plan","User-edited note");
 assert.equal(api.friendVoiceOpeningRecall("zoe","English").verifiedTopic,false);
 localStorage.setItem("crew_friend_topics_v1_zoe_English",JSON.stringify([
  {id:"t1",key:"hiking",title:"Hiking",summary:"Learner plans to hike",updatedAt:Date.now()-86400000,pinned:false,manual:false}
 ]));
 const state=api.friendVoiceOpeningRecall("zoe","English");
 assert.equal(state.returning,true);
 assert.equal(state.verifiedTopic,true);
 assert.equal(state.crossDay,true);
});
test("teacher personal memory cannot claim firsthand role history",()=>{
 assert.match(learner,/Only tagged verified same-character conversation topics/);
 assert.match(learner,/not proof they were told directly to THIS teacher/);
});
test("canonical cross-platform contract asserts provenance boundaries",()=>{
 assert.equal(contract.rules.memory.verifiedSameCharacterTopicsAreFirsthand,true);
 assert.equal(contract.rules.memory.editedTopicsNotProofOfPriorConversation,true);
 assert.equal(contract.rules.memory.sharedLearnerProfileNotProofOfPriorConversation,true);
 assert.equal(contract.rules.memory.fictionalLifeBookNotSharedLearnerHistory,true);
});

 test("fresh recall includes every locally saved topic and never another friend or language",()=>{
 const {api,localStorage}=memoryHarness();
 const initial=api.friendTopicContext("zoe","English");assert.equal(initial,"");
 for(const [id,language,count] of [["zoe","English",8],["zoe","French",1],["yuna","English",1]]){
  localStorage.setItem("crew_friend_topics_v1_"+id+"_"+language,JSON.stringify(Array.from({length:count},(_,i)=>({id:String(i),key:String(i),title:id+" "+language+" "+i,summary:"topic detail "+i,manual:false,pinned:i<3,updatedAt:i+1}))));
 }
 const fresh=api.friendTopicContext("zoe","English");
 for(let i=0;i<8;i++)assert.ok(fresh.includes("zoe English "+i));
 assert.doesNotMatch(fresh,/zoe French|yuna English/);
 assert.match(fresh,/answer questions about previous conversations/);
 api.setFriendMemoryEnabled(false);assert.equal(api.friendTopicContext("zoe","English"),"");
 });
 test("both voice and keyboard resolve current memory immediately before the Live socket is constructed",()=>{
 const page=fs.readFileSync(path.join(root,"web-spa/src/friends/FriendLiveConversation.tsx"),"utf8");
 const live=fs.readFileSync(path.join(root,"web-spa/src/live/useLiveSession.ts"),"utf8");
 assert.match(page,/const resolveSessionContext=\(\)=>\{\s*const openingRecall=friendVoiceOpeningRecall\(friend.id,language\);\s*const system=buildFriendSystem/);
 assert.match(page,/\.\.\.resolveSessionContext\(\),resolveSessionContext,languageDirective/);
 assert.match(live,/const sessionContext=configRef.current.resolveSessionContext\?\.\(\)\|\|configRef.current;\s*const session=new window.CrewLive.Session/);
 assert.match(live,/system:sessionContext.system/);
 assert.match(live,/openingPrompt:sessionContext.openingPrompt/);
 });

test("homepage uses newest verified same-friend and language title only with explicit memory consent",()=>{
 const {api,localStorage}=memoryHarness();
 localStorage.setItem("crew_friend_topics_v1_zoe_English",JSON.stringify([
  {id:"old",key:"old",title:"Old pinned",summary:"Old",manual:false,pinned:true,updatedAt:1},
  {id:"new",key:"new",title:"New verified",summary:"Recent",manual:false,pinned:false,updatedAt:2},
  {id:"edited",key:"edited",title:"Edited",summary:"Not verified",manual:true,pinned:false,updatedAt:3}
 ]));
 assert.equal(api.getHomeChatTopic("zoe","English"),undefined);
 api.setFriendMemoryEnabled(true);
 assert.equal(api.getHomeChatTopic("zoe","English").title,"New verified");
 assert.equal(api.getHomeChatTopic("yuna","English"),undefined);
 assert.equal(api.getHomeChatTopic("zoe","French"),undefined);
 api.setFriendMemoryEnabled(false);
 assert.equal(api.getHomeChatTopic("zoe","English"),undefined);
});
