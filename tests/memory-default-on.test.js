const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");

function storage(){
 const data=new Map();
 return {
  getItem:key=>data.has(key)?data.get(key):null,
  setItem:(key,value)=>data.set(key,String(value)),
  removeItem:key=>data.delete(key)
 };
}
function friendMemoryModule(localStorage){
 const source=fs.readFileSync(path.join(root,"web-spa/src/friends/friendMemory.ts"),"utf8");
 const js=stripTypeScriptTypes(source,{mode:"strip"})
  .replace(/^import.*(?:\n|$)/gm,"")
  .replace(/\bexport\s+(?=(?:const|function|async\s+function))/g,"");
 const exported={};
 const context={
  exports:exported,localStorage,Date,Math,JSON,
  CREW_FRIENDS:[{id:"zoe"}],
  normalizeLearningLanguage:value=>String(value).toLowerCase(),
  personalMemoryEnabled:()=>true,
  studentMemories:()=>[],
  geminiKey:()=>"",
 };
 vm.runInNewContext(js+"\nObject.assign(exports,{friendMemoryEnabled,hasFriendMemoryDecision,setFriendMemoryEnabled,saveFriendTopic,getFriendTopics,friendTopicContext});",context,{
  filename:"friendMemory.ts"
 });
 return exported;
}

test("friend memory defaults on without overwriting a previous opt-out",()=>{
 const store=storage(),memory=friendMemoryModule(store);
 assert.equal(memory.hasFriendMemoryDecision(),false);
 assert.equal(memory.friendMemoryEnabled(),true);
 assert.equal(store.getItem("crew_friend_topics_consent_v1"),null);
 assert.equal(memory.saveFriendTopic("zoe","英文","London vacation"),true);
 assert.ok(memory.friendTopicContext("zoe","英文").includes("London vacation"));

 memory.setFriendMemoryEnabled(false);
 assert.equal(memory.friendMemoryEnabled(),false);
 assert.equal(store.getItem("crew_friend_topics_consent_v1"),"0");
 assert.equal(memory.friendTopicContext("zoe","英文"),"");
 assert.equal(memory.saveFriendTopic("zoe","英文","not saved"),false);
 assert.equal(memory.getFriendTopics("zoe","英文").length,1);

 // A new module/runtime must not silently override the explicit opt-out.
 const nextSession=friendMemoryModule(store);
 assert.equal(nextSession.friendMemoryEnabled(),false);
 nextSession.setFriendMemoryEnabled(true);
 assert.equal(nextSession.friendMemoryEnabled(),true);
 assert.ok(nextSession.friendTopicContext("zoe","英文").includes("London vacation"));
});

test("memory controls live in Settings, not first-entry teaching or friend screens",()=>{
 const read=p=>fs.readFileSync(path.join(root,p),"utf8");
 const layout=read("web-spa/src/teacher/TeacherLayout.tsx");
 const friends=read("web-spa/src/friends/FriendsPage.tsx");
 const settings=read("web-spa/src/pages/SettingsPage.tsx");
 assert.ok(!layout.includes("TeacherMemoryConsent"));
 assert.ok(!friends.includes("choiceNeeded")&&!friends.includes("showConsent"));
 assert.ok(friends.includes('to="/settings#memory-settings"'));
 assert.ok(settings.includes('id="memory-settings"'));
 assert.ok(settings.includes("setPersonalMemoryEnabled"));
 assert.ok(settings.includes("setFriendMemoryEnabled"));
});
