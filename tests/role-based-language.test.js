const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
const target=stripTypeScriptTypes(read("web-spa/src/teacher/targetLanguages.ts"),{mode:"strip"})
 .replace(/\bexport\s+(?=(?:function|const))/g,"");
const src=stripTypeScriptTypes(read("web-spa/src/friends/friendLanguage.ts"),{mode:"strip"})
 .replace(/^import .*\n/gm,"").replace(/\bexport\s+(?=(?:function|const))/g,"");
const ctx={};vm.runInNewContext(target+"\n"+src+"\nthis.api={friendLanguageRule,friendLanguageReminder,friendLanguageTransition};",ctx);
test("friend natural, bilingual and immersion modes keep distinct language boundaries",()=>{
 const {friendLanguageRule,friendLanguageReminder}=ctx.api;
 assert.match(friendLanguageRule("英文","zh-TW","natural"),/Start in Traditional Chinese/);
 assert.match(friendLanguageRule("英文","zh-TW","bilingual"),/TARGET CHAT WITH NATIVE HELP/);
 assert.match(friendLanguageReminder("英文","zh-TW","bilingual"),/Each reply uses ONE language/);
 assert.match(friendLanguageRule("日文","en","immersion"),/Only speak Japanese/);
 assert.match(friendLanguageReminder("日文","en","immersion"),/after reconnection/);
});
test("friend mode and teacher speaking level are independently saved and used in live sessions",()=>{
 const store=read("web-spa/src/store/teacherStore.ts");
 const page=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const teacher=read("web-spa/src/teacher/teacherPolicy.ts");
 assert.match(store,/friendChatMode:explicitFriendChatMode\(\)/);
 assert.match(store,/learnerSpeakingLevel:normalizeLearnerSpeakingLevel/);
 assert.match(page,/friendLanguageReminder\(language,friendNativeLanguage,friendChatMode\)/);
 assert.match(page,/useState<FriendChatLanguageMode>/);
 assert.match(page,/friendLanguageTransition\(language,friendNativeLanguage,chosen\)/);
 assert.match(page,/aria-pressed=\{friendChatMode===value\}/);
 assert.match(read("web-spa/src/live/useLiveSession.ts"),/sendControl=useCallback/);
 assert.match(teacher,/teacherLanguageGuidance\(input\.learnerSpeakingLevel/);
 assert.match(read("web-spa/src/teacher/teacherLanguageGuidance.ts"),/Do NOT invent or claim a CEFR level/);
});

test("explicit live mode changes override prior mode and reconnect keeps latest choice",()=>{
 const {friendLanguageTransition}=ctx.api;
 const bilingual=friendLanguageTransition("英文","zh-TW","bilingual");
 assert.match(bilingual,/JUST changed/);
 assert.match(bilingual,/supersedes ALL earlier/);
 assert.match(bilingual,/TARGET CHAT WITH NATIVE HELP/);
 const immersion=friendLanguageTransition("英文","zh-TW","immersion");
 assert.match(immersion,/FULL IMMERSION/);
 assert.match(immersion,/NEXT spoken reply/);
 const live=read("web-spa/src/live/useLiveSession.ts");
 assert.match(live,/sessionKind==="friend"&&configRef\.current\.languageDirective/);
 assert.match(live,/session\.sendControl\?\./);
});

test("untouched Friend installs default to target chat; explicit modes survive old snapshots",()=>{
 const store=read("web-spa/src/store/teacherStore.ts");
 assert.match(store,/DEFAULT_FRIEND_CHAT_LANGUAGE_MODE:FriendChatLanguageMode="bilingual"/);
 assert.match(store,/merge:\(persisted,current\)=>/);
 assert.match(store,/friendChatMode:explicitFriendChatMode\(\)/);
 // Exercise the actual preference resolver independently of the Zustand runtime.
 const src=store.split("\n");
 const normalized=src.find(line=>line.startsWith("export const normalizeFriendChatLanguageMode="));
 const fallback=src.find(line=>line.startsWith("export const DEFAULT_FRIEND_CHAT_LANGUAGE_MODE:"));
 const start=store.indexOf("const explicitFriendChatMode=");
 const end=store.indexOf("const initialProfile=",start);
 assert.ok(normalized&&fallback&&start>=0&&end>start);
 const helper=stripTypeScriptTypes(
  fallback.replace("export ","")+"\n"+normalized.replace("export ","")+"\n"+
  store.slice(start,end)+"\nthis.readMode=explicitFriendChatMode;",{mode:"strip"});
 let value=null;
 const local={getItem:key=>{assert.equal(key,"crew_teacher_friendChatMode");return value}};
 const scope={localStorage:local};
 vm.runInNewContext(helper,scope);
 assert.equal(scope.readMode(),"bilingual");
 value="natural";assert.equal(scope.readMode(),"natural");
 value="immersion";assert.equal(scope.readMode(),"immersion");
 value="bilingual";assert.equal(scope.readMode(),"bilingual");
 value="garbage";assert.equal(scope.readMode(),"bilingual");
});

test("Friend adjusts actual target conversations, never CEFR-tests or bilingual-mixes",()=>{
 const source=read("web-spa/src/friends/friendLanguage.ts");
 assert.match(source,/FRIEND ADAPTIVE TARGET CHAT/);
 assert.match(source,/across multiple actual exchanges/);
 assert.match(source,/Never announce a CEFR level/);
 assert.match(source,/voice-recognition errors/);
 const {friendLanguageRule,friendLanguageReminder}=ctx.api;
 const p=friendLanguageRule("英文","zh-TW","bilingual");
 assert.match(p,/friend/i);
 assert.match(p,/FRIEND ADAPTIVE TARGET CHAT/);
 assert.match(p,/one reply/i);
 assert.match(friendLanguageReminder("英文","zh-TW","immersion"),/FRIEND ADAPTIVE TARGET CHAT/);
 assert.match(friendLanguageRule("英文","zh-TW","natural"),/Start in Traditional Chinese/);
});
