const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
const source=p=>stripTypeScriptTypes(read(p),{mode:"strip"}).replace(/^import.*\n/gm,"").replace(/\bexport\s+(?=const|function)/g,"");
const accent=source("web-spa/src/teacher/teacherAccent.ts");
const api={};vm.runInNewContext(accent+"\nthis.helpers={accentOptions,accentLabel,readRegionalPreference,writeRegionalPreference,buildAccentPrompt};",api);
const h=api.helpers;
function storage(entries=[]){
 const data=new Map(entries);
 return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};
}
function store(localStorage){
 let state;
 const ctx={localStorage,i18n:{language:"en",on(){}},getTeacherProfile:id=>({id,recommendedVoice:"Kore"}),nativeFromUiLocale:()=> "en",detectNativeLanguage:()=>"en",normalizePinyinAidMode:v=>v,
 persist:(factory,options)=>(set,get)=>options.merge({},factory(set,get)),
 create:()=>factory=>{const set=patch=>{state={...state,...patch}},get=()=>state;state=factory(set,get);return {getState:get,setState:set}}};
 vm.runInNewContext(accent+"\n"+source("web-spa/src/store/teacherStore.ts")+"\nthis.store=useTeacherStore;",ctx);
 return ctx.store;
}
test("legacy accent migrates and teacher/friend settings survive language switches and reload independently",()=>{
 const local=storage([["crew_teacher_lang","英文"],["crew_teacher_languageStyle","gb"],["crew_teacher_friendLanguageStyle","us"],["crew_teacher_accentStrength","noticeable"]]);
 let s=store(local).getState;
 assert.equal(s().languageStyle,"gb");assert.equal(s().friendLanguageStyle,"us");
 s().setAccentStrength("subtle");s().setFriendAccentStrength("natural");
 s().setFriendLanguageStyle("custom");s().setFriendCustomAccent("Irish English");
 s().setTargetLanguage("日文");
 assert.equal(s().languageStyle,"auto");assert.equal(s().friendLanguageStyle,"auto");
 s().setLanguageStyle("kansai");s().setFriendLanguageStyle("standard");
 s().setTargetLanguage("英文");
 assert.equal(s().languageStyle,"gb");assert.equal(s().accentStrength,"subtle");
 assert.equal(s().friendLanguageStyle,"custom");assert.equal(s().friendCustomAccent,"Irish English");assert.equal(s().friendAccentStrength,"natural");
 s=store(local).getState;
 assert.equal(s().languageStyle,"gb");assert.equal(s().friendCustomAccent,"Irish English");
 s().setTargetLanguage("日文");
 assert.equal(s().languageStyle,"kansai");assert.equal(s().friendLanguageStyle,"standard");
 s().setTargetLanguage("德文");s().setLanguageStyle("kansai");assert.equal(s().languageStyle,"auto");
});
test("invalid preference storage does not expose unsupported regions or custom types",()=>{
 const local=storage([["crew_teacher_regional_v1:teacher:英文",'{"region":"kansai","strength":"bad","custom":12}']]);
 const x=h.readRegionalPreference(local,"英文","teacher");assert.equal(x.region,"auto");assert.equal(x.strength,"natural");assert.equal(x.custom,"");
});
test("all UI locales render concise regional labels rather than model instructions",()=>{
 for(const locale of ["zh-TW","en","ja","ko","vi","es","fr","de","pt-BR","id","th"]){
  for(const language of ["英文","日文","韓文","西班牙文","法文","德文","義大利文","越南文","泰文","中文","葡萄牙文","印尼文"]){
   for(const choice of h.accentOptions(language)){
    const label=h.accentLabel(language,choice.value,locale);
    assert.ok(label);assert.doesNotMatch(label,/a contemporary speaker|a contemporary English speaker/);
   }
  }
 }
 assert.equal(h.accentLabel("英文","gb","en"),"United Kingdom");
 assert.equal(h.accentLabel("日文","kansai","ja"),"関西");
});
test("regional style keeps target language and standard teaching baseline",()=>{
 const prompt=h.buildAccentPrompt("日文","kansai","noticeable");
 assert.match(prompt,/selected TARGET language/);assert.match(prompt,/standard-language instruction/);assert.match(prompt,/unless the learner explicitly requests it/);
 assert.match(prompt,/everyday regional vocabulary and spelling/);assert.equal(h.buildAccentPrompt("英文","auto"),"");
});
test("both role settings share the selector and live samples do not replace recorded teacher auditions",()=>{
 const shared=read("web-spa/src/components/RegionalStyleSettings.tsx");
 assert.match(shared,/regionalSample:true/);assert.match(shared,/previewTeacherVoice\(/);assert.doesNotMatch(shared,/previewTeacherVoiceRecorded/);
 assert.match(shared,/friendAccentStrength/);assert.match(shared,/friendCustomAccent/);
 assert.match(read("web-spa/src/components/RolePreferencesDialog.tsx"),/<RegionalStyleSettings role=\{role\}/);
 assert.match(read("web-spa/src/teacher/TutorPage.tsx"),/<RegionalStyleSettings role="teacher"/);
 assert.match(read("web-spa/src/teacher/teacherVoicePreview.ts"),/REGIONAL PRONUNCIATION SAMPLE/);
 assert.match(read("web-spa/src/friends/FriendLiveConversation.tsx"),/s=>s\.friendAccentStrength/);
 assert.match(read("web-spa/src/teacher/TutorPage.tsx"),/previewTeacherVoiceRecorded\(/);
});
