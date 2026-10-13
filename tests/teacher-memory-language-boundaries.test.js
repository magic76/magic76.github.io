const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const storage=()=>{const data=new Map();return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}};
function evaluate(file,names,ctx={}){
 const source=stripTypeScriptTypes(read(file),{mode:"strip"})
  .replace(/^import.*(?:\n|$)/gm,"")
  .replace(/\bexport\s+(?=(?:function|const|async\s+function))/g,"");
 const exports={};
 vm.runInNewContext(source+"\nObject.assign(exports,{"+names.join(",")+"});",
  {exports,Date,Math,JSON,localStorage:ctx.localStorage,window:{CrewAI:{call:ctx.call},dispatchEvent:()=>{}},
   Event:class Event{},ensureCore:async()=>{},geminiKey:()=> "test-key",...ctx},{filename:file});
 return exports;
}

test("friend movie plans stay in Zoe's topic notes, never tutor personal memory",async()=>{
 const localStorage=storage(),language="英文";
 const learner=evaluate("web-spa/src/teacher/studentMemory.ts",
  ["studentMemories","normalizeLearningLanguage","personalMemoryEnabled","getPersonalMemoryEpoch","ingestStudentPersonalUpdates",
   "verifiedLearnerEvidence","hasMeaningfulLearnerSpeech","buildTutorMemoryContext"],{localStorage});
 const reply={topics:[{key:"movie",title:"Movie tomorrow",summary:"Learner plans to see a movie tomorrow",followUp:"Which movie?",
  evidence:"I am going to see a movie tomorrow"}],
  memory_updates:{facts:[{key:"plan-movie",detail:"I am seeing a movie tomorrow",
   evidence:"I am going to see a movie tomorrow",explicit:true,confidence:.8}]}};
 const friend=evaluate("web-spa/src/friends/friendMemory.ts",
  ["rememberFriendConversation","getFriendTopics","buildFriendSystem"],{localStorage,
   call:async()=>JSON.stringify(reply),CREW_FRIENDS:[{id:"zoe"}],
   normalizeLearningLanguage:learner.normalizeLearningLanguage,
   personalMemoryEnabled:learner.personalMemoryEnabled,
   getPersonalMemoryEpoch:learner.getPersonalMemoryEpoch,
   ingestStudentPersonalUpdates:learner.ingestStudentPersonalUpdates,
   studentMemories:learner.studentMemories,
   verifiedLearnerEvidence:learner.verifiedLearnerEvidence,
   hasMeaningfulLearnerSpeech:learner.hasMeaningfulLearnerSpeech,
   friendLanguageRule:()=>"[language: English]",freeChatRhythmPrompt:()=>""});
 const turns=[{input:"I am going to see a movie tomorrow",output:"Sounds interesting"}];
 await friend.rememberFriendConversation("zoe",language,turns,12000);
 assert.equal(friend.getFriendTopics("zoe",language).length,1);
 assert.equal(learner.studentMemories(language).length,0,"friend AI must not promote topics into the tutor profile");
 assert.equal(learner.buildTutorMemoryContext(language).includes("movie"),false);
 assert.equal(friend.getFriendTopics("zoe","韓文").length,0);
 const zoe={id:"zoe",name:"Zoe",personality:"curious",interaction:"chat naturally"};
 assert.ok(friend.buildFriendSystem(zoe,language).includes("Movie tomorrow"));
 assert.ok(!friend.buildFriendSystem(zoe,"韓文").includes("Movie tomorrow"));
});

test("dated plans are not durable learner profile facts, including existing legacy AI notes",()=>{
 const localStorage=storage();
 const memory=evaluate("web-spa/src/teacher/studentMemory.ts",
  ["ingestStudentPersonalUpdates","studentMemories","buildTutorMemoryContext","reportMemoryContext",
   "isTimeBoundPersonalMemory","saveStudentMemory","verifiedLearnerEvidence"],{localStorage});
 assert.equal(memory.isTimeBoundPersonalMemory("I am seeing a movie tomorrow"),true);
 assert.equal(memory.isTimeBoundPersonalMemory("I enjoy watching movies"),false);
 memory.ingestStudentPersonalUpdates("英文",{facts:[
  {key:"tomorrow-film",detail:"I enjoy movies",evidence:"I am watching a movie tomorrow",explicit:true,confidence:.8},
  {key:"film-enthusiast",detail:"I enjoy watching movies",evidence:"I enjoy watching movies",explicit:true,confidence:.8}
 ]},"I am watching a movie tomorrow. I enjoy watching movies");
 assert.equal(memory.studentMemories("英文").length,1);
 // Old cross-role AI-generated memories have no source role. Filter transitory ones
 // from future tutor prompts, but preserve the user's stored records.
 const key="crew_teacher_student_memory_v2_"+encodeURIComponent("英文");
 const old=memory.studentMemories("英文");
 old.push({id:"legacy",type:"fact",key:"film-plan",detail:"I am seeing a movie tomorrow",language:"英文",
  source:"report",confidence:.8,observations:1,improvementObservations:0,active:true,updatedAt:Date.now()});
 localStorage.setItem(key,JSON.stringify(old));
 assert.equal(memory.buildTutorMemoryContext("英文").includes("tomorrow"),false);
 assert.equal(memory.reportMemoryContext("英文").includes("tomorrow"),false);
 assert.equal(memory.studentMemories("英文").length,2,"legacy data is not deleted silently");
});

test("tutor language contract permits only selected language and explicit learner support",()=>{
 const language=evaluate("web-spa/src/teacher/teacherLanguage.ts",
  ["teacherLanguageRule","teacherLanguageReminder","unexpectedTeacherKorean"],{
   friendSpokenLanguage:v=>({"英文":"English","韓文":"Korean","日文":"Japanese"}[v]||"English"),
   nativeLanguageName:v=>({"zh-TW":"Traditional Chinese","ko":"Korean","en":"English"}[v]||"English")
  });
 assert.match(language.teacherLanguageRule("英文","zh-TW","bilingual"),/Selected target language is English/);
 assert.match(language.teacherLanguageRule("英文","zh-TW","bilingual"),/third language/);
 assert.match(language.teacherLanguageRule("英文","zh-TW","immersion"),/Only English is permitted/);
 assert.match(language.teacherLanguageReminder("英文","zh-TW","bilingual"),/Continue speaking in English/);
 assert.equal(language.unexpectedTeacherKorean("오늘은 영화를 보러 갈 거예요","英文","zh-TW","bilingual"),true);
 assert.equal(language.unexpectedTeacherKorean("Let's talk about movies tomorrow.","英文","zh-TW","bilingual"),false);
 assert.equal(language.unexpectedTeacherKorean("오늘은 영화를 보러 갈 거예요","韓文","zh-TW","immersion"),false);
 assert.equal(language.unexpectedTeacherKorean("오늘은 영화를 보러 갈 거예요","英文","ko","bilingual"),false);
});

test("teacher startup, reconnect, silence and quick actions all retain spoken language rules",()=>{
 const policy=read("web-spa/src/teacher/teacherPolicy.ts");
 const livePage=read("web-spa/src/teacher/LivePage.tsx");
 const live=read("web-spa/src/live/useLiveSession.ts");
 const friendMemory=read("web-spa/src/friends/friendMemory.ts");
 assert.ok((policy.match(/teacherLanguageRule\(/g)||[]).length>=3);
 assert.match(livePage,/openingPrompt:languageDirective/);
 assert.match(livePage,/languageDriftGuard:/);
 assert.match(livePage,/live\.sendText\(languageDirective/);
 assert.match(live,/session\.sendText\(prompt\+reminder\)/);
 assert.match(live,/session\.sendControl\?\.\(rule\+/);
 assert.match(live,/const directive=configRef\.current\.languageDirective/);
 assert.doesNotMatch(friendMemory,/friendPersonalContext\(language\)\+friendTopicContext/);
 assert.match(friendMemory,/savePersonal=false/);
});
