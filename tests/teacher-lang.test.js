"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const teacher=p=>read("web-spa/src/teacher/"+p);
function helpers(file,returned){
 const source=stripTypeScriptTypes(teacher(file),{mode:"strip"}).replace(/\bexport\s+(?=function|const)/g,"");
 const context={};vm.runInNewContext(source+"\nthis.api={"+returned+"};",context);
 return context.api;
}
const LOCALES=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];

test("Japanese learner names are localized in Learn, tutor, hub and onboarding",()=>{
 const ux=helpers("teacherLanguageUx.ts","teacherLanguageHomeHint");
 const zh=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/teacher.json"));
 const names=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/friends.json")).languages;
 const native="繁體中文",target=names["日文"];
 const hint=ux.teacherLanguageHomeHint("bilingual","A1",native,target,false,"zh-TW",key=>
  zh.languageHint[key].replace(/{{native}}/g,native).replace(/{{target}}/g,target));
 assert.match(hint,/日文/);assert.doesNotMatch(hint,/Japanese/);
 for(const file of ["web-spa/src/pages/CrewSectionPage.tsx","web-spa/src/teacher/TutorPage.tsx"]){
  const src=read(file);
  assert.match(src,/t\("friends:languages\."\+/);
  assert.match(src,/localizedNativeName\(/);
  if(file.endsWith("CrewSectionPage.tsx")){
   assert.match(src,/t\("teacher:languageHint\."\+/);
   assert.match(src,/\{native:shownNativeName,target:shownTargetName\}/);
   assert.match(src,/role="note">\{shownHint\}<\/p>/);
  }else assert.match(src,/teacherLanguageHomeHint\(/);
 }
 assert.match(read("web-spa/src/onboarding/LearningLanguageGate.tsx"),/localizedNativeName\(/);
 assert.match(read("web-spa/src/teacher/PracticePage.tsx"),/t\("friends:languages\."\+target/);
});

test("course labels are neutral for other targets, unchanged for English; English materials disclosed",()=>{
 const {neutralCourseCopy:neutral}=helpers("teacherLanguageUx.ts","neutralCourseCopy");
 assert.equal(neutral("出國自由行與生活生存英語","zh-TW","英文"),"出國自由行與生活生存英語");
 assert.equal(neutral("出國自由行與生活生存英語","zh-TW","日文"),"出國自由行與生活生存對話");
 assert.equal(neutral("Travel & Survival English","en","日文"),"Travel & Survival");
 assert.equal(neutral("旅行・海外生活の英会話","ja","日文"),"旅行・海外生活の会話");
 const course=teacher("CoursePage.tsx"),next=teacher("ContinueLearningCard.tsx");
 assert.match(course,/neutralCourseCopy\(courseDisplayTitle\(item,locale\),locale,target\)/);
 assert.match(course,/otherLanguage&&<p className="crew-course-language-note"/);
 assert.match(next,/otherLanguage&&plan\?\.action==="course"\?t\("course\.nonEnglishNext"\)/);
 assert.match(next,/otherLanguage\?materialNote/);
 assert.match(teacher("CourseBriefing.tsx"),/ready&&target!=="英文"/);
 assert.match(teacher("LearningFocusCard.tsx"),/otherCourse\?t\("teacher:course\.nonEnglishNext"\)/);
});

test("mother tongue defaults to the UI language and an explicit preference wins on rehydration",()=>{
 const native=helpers("teacherLocale.ts","nativeFromUiLocale,localizedNativeName");
 for(const [locale,want] of [["zh-TW","zh-TW"],["ja","ja"],["en","en"],["pt-BR","pt"],["de","de"]])
  assert.equal(native.nativeFromUiLocale(locale),want);
 assert.equal(native.localizedNativeName("ja","zh-TW"),"日文");
 const src=read("web-spa/src/store/teacherStore.ts");
 const block=src.slice(src.indexOf("const nativePreference="),src.indexOf("export const useTeacherStore="));
 assert.ok(block.startsWith("const nativePreference="));
 const data=new Map();const language={language:"ja"};
 const context={localStorage:{getItem:key=>data.get(key)??null},i18n:language,nativeFromUiLocale:native.nativeFromUiLocale};
 vm.runInNewContext(stripTypeScriptTypes(block,{mode:"strip"})+"\nthis.pref=nativePreference;",context);
 assert.equal(context.pref(),"ja");
 language.language="en";assert.equal(context.pref(),"en");
 data.set("crew_teacher_native_lang","zh-TW");assert.equal(context.pref(),"zh-TW");
 assert.match(src,/nativeLanguage:nativePreference\(\)/);
 assert.match(src,/merge:\(persisted,current\)=>\([\s\S]*nativeLanguage:nativePreference\(\)/);
 assert.match(src,/i18n\.on\("languageChanged",locale=>/);
 assert.match(src,/localStorage\.getItem\("crew_teacher_native_lang"\)===null/);
 assert.match(src,/setNativeLanguage:v=>\{write\("native_lang",v\)/);
});

test("all 11 UI languages contain usable teacher hints and an honest course notice",()=>{
 const en=JSON.parse(read("web-spa/src/i18n/locales/en/teacher.json"));
 for(const locale of LOCALES){
  const dict=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/teacher.json"));
  for(const key of Object.keys(en.languageHint)){
   assert.equal(typeof dict.languageHint[key],"string",locale+" "+key);
   assert.ok(dict.languageHint[key].trim(),locale+" "+key);
  }
  for(const key of ["materialNotice","nonEnglishNext"]){
   assert.equal(typeof dict.course[key],"string",locale+" "+key);
   assert.ok(dict.course[key].trim(),locale+" "+key);
  }
  assert.match(dict.course.materialNotice,/{{language}}/);
  assert.match(dict.course.materialNotice,/{{native}}/);
  assert.match(dict.languageHint.base,/{{native}}/);
  assert.match(dict.languageHint.base,/{{target}}/);
 }
 assert.match(en.course.materialNotice,/English materials/);
 assert.match(JSON.parse(read("web-spa/src/i18n/locales/zh-TW/teacher.json")).course.materialNotice,/英文教材/);
});

test("LivePage remains wired to the unchanged six-argument live hint",()=>{
 const live=read("web-spa/src/teacher/LivePage.tsx");
 const ux=teacher("teacherLanguageUx.ts");
 assert.match(ux,/export function teacherLanguageLiveHint\(mode:string,level:string,native:string,target:string,en:boolean,locale="zh-TW"\)/);
 assert.match(live,/teacherLanguageLiveHint\(/);
});
