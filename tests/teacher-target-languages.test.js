const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
function moduleSource(file){
 return stripTypeScriptTypes(read(file),{mode:"strip"})
  .replace(/^import .*\n/g,"").replace(/\bexport\s+(?=(?:const|function))/g,"");
}
const targetSource=moduleSource("web-spa/src/teacher/targetLanguages.ts");
const languages={};
vm.runInNewContext(targetSource+"\nthis.value={TARGET_LANGUAGES,targetSpokenLanguage};",languages);
const all=Array.from(languages.value.TARGET_LANGUAGES);

test("Web target choices match Android MainActivity.showTutorLanguageDialog in order and identity",()=>{
 assert.deepEqual(all.map(x=>x.code),["en","ja","ko","es","fr","de","it","vi","th","zh","pt","id"]);
 assert.deepEqual(all.map(x=>x.value),["英文","日文","韓文","西班牙文","法文","德文","義大利文","越南文","泰文","中文","葡萄牙文","印尼文"]);
 assert.equal(new Set(all.map(x=>x.value)).size,12);
 assert.equal(languages.value.targetSpokenLanguage("中文"),"Mandarin Chinese");
 assert.equal(languages.value.targetSpokenLanguage("德文"),"German");
 assert.equal(languages.value.targetSpokenLanguage("泰文"),"Thai");
 assert.equal(languages.value.targetSpokenLanguage("en"),"English");
});

test("Teacher main and advanced selector and Friend selector share 12 real target choices",()=>{
 const tutor=read("web-spa/src/teacher/TutorPage.tsx");
 const friends=read("web-spa/src/friends/FriendsPage.tsx");
 assert.equal((tutor.match(/TARGET_LANGUAGES\.map\(x=>x\.value\)/g)||[]).length,2);
 assert.equal((friends.match(/TARGET_LANGUAGES\.map\(x=>x\.value\)/g)||[]).length,1);
 for(const source of [tutor,friends]){
  assert.match(source,/import \{TARGET_LANGUAGES\} from "\.\.\/teacher\/targetLanguages"/);
  assert.doesNotMatch(source,/\["英文","日文","韓文","西班牙文","法文"\]/);
 }
});

test("Friend language policy and teacher language guidance never silently resolve new choices as English",()=>{
 const scope={};
 vm.runInNewContext(targetSource+"\n"+moduleSource("web-spa/src/friends/friendLanguage.ts")+
  "\nthis.value={friendSpokenLanguage,friendLanguageRule,friendLanguageReminder};",scope);
 for(const entry of all){
  assert.equal(scope.value.friendSpokenLanguage(entry.value),entry.spoken);
  const policy=scope.value.friendLanguageRule(entry.value,"zh-TW","immersion");
  assert.ok(policy.includes(entry.spoken),entry.value+" missing in prompt");
 }
});

test("Chinese and English choices all have labels; every Android regional language has accent choices",()=>{
 for(const locale of ["en","zh-TW"]){
  const labels=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/friends.json")).languages;
  for(const entry of all)assert.ok(labels[entry.value],locale+" missing "+entry.value);
 }
 const scope={};
 vm.runInNewContext(moduleSource("web-spa/src/teacher/teacherAccent.ts")+
  "\nthis.value={accentOptions,normalizedAccent};",scope);
 const variants={德文:["de","at","ch"],義大利文:["standard","rome","milan"],
  越南文:["north","south","central"],泰文:["central","north","isan"],中文:["tw","cn","sg"],
  葡萄牙文:["br","pt"],印尼文:["standard","jakarta"]};
 for(const [language,regions] of Object.entries(variants)){
  const available=Array.from(scope.value.accentOptions(language),x=>x.value);
  assert.deepEqual(available,["auto",...regions,"custom"],language);
  for(const region of regions)assert.equal(scope.value.normalizedAccent(language,region),region);
 }
});

test("Web's existing English-first vocabulary and courses are not presented as universal curricula",()=>{
 const source=read("web-spa/src/teacher/PracticePage.tsx");
 assert.match(source,/target==="英文"&&<Link className="feature-card teacher-vocab"/);
 assert.match(source,/target==="英文"&&<Link className="feature-card teacher-scene"/);
});
