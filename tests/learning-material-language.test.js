const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=name=>fs.readFileSync("web-spa/src/"+name,"utf8");
function load(name,args={},names=[]){
 const js=stripTypeScriptTypes(read(name).replace(/\bimport[^;\n]*(?:;|\n)/g,"").replace(/\bexport\s+(?=(?:function|const|type)\b)/g,""),{mode:"strip"});
 return vm.runInNewContext("(function("+Object.keys(args).join(",")+"){"+js+"\nreturn {"+names.join(",")+"};})")(...Object.values(args));
}
const targets=load("teacher/targetLanguages.ts",{},["TARGET_LANGUAGES"]);
const api=load("teacher/learningLanguages.ts",targets,["learningLanguageCode","learningMaterialAvailable","learningStorageKey","learningRouteAvailable"]);
test("English-only materials do not restrict conversation languages",()=>{
 for(const lang of targets.TARGET_LANGUAGES){
  assert.equal(api.learningLanguageCode(lang.value),lang.code);
  for(const material of ["vocabulary","phrasebook"])assert.equal(api.learningMaterialAvailable(material,lang.value),lang.code==="en");
 }
 assert.equal(api.learningMaterialAvailable("phrasebook","unknown"),false);
 assert.equal(api.learningMaterialAvailable("vocabulary","en-GB"),true);
 assert.equal(api.learningRouteAvailable("/teacher/live","ja"),true);
});
test("existing English keys remain compatible and progress is language scoped",()=>{
 const data=new Map(),localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const progress=load("teacher/vocabularyProgress.ts",{learningStorageKey:api.learningStorageKey,localStorage},["recordVocab","vocabProgress","incrementTodayVocabulary","todayVocabulary"]);
 progress.recordVocab("same",true,"en");progress.recordVocab("same",false,"ja");
 assert.equal(progress.vocabProgress("same").correct,1);
 assert.equal(progress.vocabProgress("same","ja").correct,0);
 assert.ok(data.has("crew_teacher_vocab_progress_v1"));
 assert.ok(data.has("crew_teacher_vocab_progress_v1_ja"));
 progress.incrementTodayVocabulary("ja");
 assert.equal(progress.todayVocabulary(),0);
 assert.equal(progress.todayVocabulary("ja"),1);
});
test("direct routes and hub share the availability gate; saved phrases are filtered without deleting",()=>{
 assert.match(read("App.tsx"),/LearningMaterialGate material="vocabulary"/);
 assert.match(read("App.tsx"),/LearningMaterialGate material="phrasebook"/);
 assert.match(read("pages/CrewSectionPage.tsx"),/learningRouteAvailable\(tool.to,shownTarget\)/);
 assert.match(read("teacher/PhrasebookPage.tsx"),/readLearningDeck\(\)\.filter/);
 assert.match(read("teacher/dailyPhrases.ts"),/if\(!items.length\)return \[\]/);
});
