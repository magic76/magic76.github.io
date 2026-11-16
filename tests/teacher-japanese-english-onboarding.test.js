"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const fromTeacher=p=>read("web-spa/src/teacher/"+p);

function catalogArray(file,name){
 const source=fromTeacher(file);
 const match=source.match(new RegExp("export const "+name+":[^=]+=(\\[[\\s\\S]*?\\]);"));
 assert.ok(match,name+" source array exists");
 return JSON.parse(match[1]);
}
function courseLocale(){
 const source=stripTypeScriptTypes(fromTeacher("courseLocale.ts"),{mode:"strip"})
  .replace(/^import type .*?;\s*/m,"").replace(/\bexport\s+(?=function|const)/g,"");
 const context={};vm.runInNewContext(source+"\nthis.course={courseDisplayTitle,courseDisplayDescription,courseDisplayMission,courseDisplayWarmupGloss,hasJapaneseCourseCopy,hasJapaneseWarmupGloss};",context);
 return context.course;
}

test("Japanese-first visitor keeps Japanese UI, Japanese mother tongue and English learning target independent",()=>{
 const ui=read("web-spa/src/i18n/localeCatalog.ts");
 const uiTests=read("tests/ui-language-detection.test.js");
 const store=fromTeacher("../store/teacherStore.ts");
 const native=fromTeacher("teacherLocale.ts");
 assert.match(ui,/resolveInitialUiLocale/);
 assert.match(uiTests,/visit\("\/",\["ja-JP"\]\),"ja"/);
 assert.match(store,/nativeLanguage:nativePreference\(\)/);
 assert.match(store,/targetLanguage:read\("lang","英文"\)/);
 assert.match(native,/\["ja","日本語"\]/);
 assert.match(native,/v\.startsWith\(tag\)/);
});
test("all 49 lessons, 6 tracks and 16 units have Japanese display copy with aligned mission counts",()=>{
 const c=courseLocale();
 const lessons=[
  ...catalogArray("courseCatalogTravel.ts","TRAVEL_COURSE_LESSONS"),
  ...catalogArray("courseCatalogBusiness.ts","BUSINESS_COURSE_LESSONS"),
  ...catalogArray("courseCatalogDaily.ts","DAILY_COURSE_LESSONS"),
  ...catalogArray("courseCatalogExpanded.ts","EXPANDED_COURSE_LESSONS")
 ];
 assert.equal(lessons.length,49);
 const warmupSrc=fromTeacher("courseCatalogExpanded.ts");
 const warmupMatch=warmupSrc.match(/export const COURSE_WARMUPS:[^=]+=(\{[\s\S]*?\});/);
 assert.ok(warmupMatch,"course warm-up mapping must exist");
 const warmups=JSON.parse(warmupMatch[1]);
 for(const item of lessons)item.warmupPhrases=warmups[item.id];
 for(const item of lessons){
  assert.equal(c.hasJapaneseWarmupGloss(item),true,item.id+" warmups");
  for(let i=0;i<(item.warmupPhrases||[]).length;i++){
   assert.match(c.courseDisplayWarmupGloss(item,i,"ja"),/[\u3040-\u30ff]/,item.id+" Japanese phrase "+i);
   assert.equal(c.courseDisplayWarmupGloss(item,i,"zh-TW"),item.warmupPhrases[i].zh);
  }
 }
 for(const item of lessons){
  assert.equal(c.hasJapaneseCourseCopy(item),true,item.id);
  const title=c.courseDisplayTitle(item,"ja"),desc=c.courseDisplayDescription(item,"ja");
  assert.match(title,/[\u3040-\u30ff]/,item.id+" title must contain Japanese kana");
  assert.match(desc,/[\u3040-\u30ff]/,item.id+" description must contain Japanese kana");
  assert.equal(c.courseDisplayTitle(item,"zh-TW"),item.titleZh);
  for(let i=0;i<item.missions.length;i++){
   const mission=c.courseDisplayMission(item,i,"ja");
   assert.ok(mission, item.id+" mission "+i+" missing");
   assert.match(mission,/[\u3040-\u30ff]/,item.id+" mission "+i+" must be Japanese");
   assert.notEqual(mission,item.missions[i].titleZh,item.id+" mission "+i+" cannot fall back to Chinese");
   assert.equal(c.courseDisplayMission(item,i,"zh-TW"),item.missions[i].titleZh);
  }
 }
 const main=fromTeacher("courseCatalog.ts");
 const mainIds=[...main.matchAll(/"id":\s*"([^"]+)"/g)].map(x=>x[1]);
 const tracks=[...mainIds.slice(0,3).map(id=>({id,titleEn:"English track",titleZh:"中文",descEn:"English description",descZh:"中文"})),
  ...catalogArray("courseCatalogExpanded.ts","EXPANDED_COURSE_TRACKS")];
 const units=[...mainIds.slice(3).map(id=>({id,trackId:"travel",titleEn:"English unit",titleZh:"中文",descEn:"English description",descZh:"中文"})),
  ...catalogArray("courseCatalogExpanded.ts","EXPANDED_COURSE_UNITS")];
 assert.equal(tracks.length,6);
 assert.equal(units.length,16);
 for(const item of [...tracks,...units]){
  assert.match(c.courseDisplayTitle(item,"ja"),/[\u3040-\u30ff]/,item.id);
  assert.match(c.courseDisplayDescription(item,"ja"),/[\u3040-\u30ff]/,item.id);
 }
});
test("Japanese curriculum copy is used in the course map, briefing, daily focus and Live; Chinese gloss stays Chinese-only",()=>{
 const course=fromTeacher("CoursePage.tsx"),briefing=fromTeacher("CourseBriefing.tsx");
 const live=fromTeacher("LivePage.tsx"),focus=fromTeacher("LearningFocusCard.tsx");
 for(const source of [course,briefing,live])assert.match(source,/courseDisplayMission\(/);
 assert.match(course,/courseDisplayTitle\(/);
 assert.match(briefing,/courseDisplayWarmupGloss\(lesson,index,locale\)/);
 assert.match(briefing,/chinese&&!!phrase\.note/);
 assert.match(briefing,/t\("briefing\.start"\)/);
 assert.match(focus,/courseDisplayTitle\(lesson,"ja"\)/);
 assert.match(live,/legacyMissionsJa/);
 assert.match(live,/teacherProfileDisplay\(profile/);
});
test("teacher selection and study entry disclose Japanese native help without rewriting target language",()=>{
 const picker=fromTeacher("TeacherProfilePicker.tsx"),tutor=fromTeacher("TutorPage.tsx");
 const hub=read("web-spa/src/pages/CrewSectionPage.tsx");
 const profileSource=fromTeacher("teacherProfileLocale.ts");
 const roster="emma alex james mia sophie lina oliver victor aria ruby leo nora kai olivia ethan chloe".split(" ");
 for(const id of roster)assert.match(profileSource,new RegExp('"'+id+'"\\s*:\\s*\\['),id+" Japanese teacher description");
 assert.match(picker,/teacherProfileDisplay\(/);
 assert.match(tutor,/teacherProfileDisplay\(/);
 assert.match(tutor,/t\("tutor\.speakingLevel"\)/);
 assert.match(hub,/crew-learn-native-help/);
 assert.match(hub,/localizedNativeName\(shownNative/);
 assert.match(hub,/setTargetLanguage\(event\.target\.value\)/);
 assert.doesNotMatch(hub,/setNativeLanguage\(targetLanguage\)/);
 const ux=stripTypeScriptTypes(fromTeacher("teacherLanguageUx.ts"),{mode:"strip"}).replace(/\bexport\s+(?=function|const)/g,"");
 const context={};vm.runInNewContext(ux+"\nthis.home=teacherLanguageHomeHint;",context);
 const japanese=context.home("bilingual","A1","日本語","English",false,"ja");
 assert.match(japanese,/日本語/);
 assert.match(japanese,/English/);
 assert.match(japanese,/初心者/);
 assert.doesNotMatch(japanese,/中文|Chinese/);
});
test("all 11 locales keep matching Teacher key sets; Japanese briefing and levels are translated",()=>{
 const languages=["zh-TW","en","ja","es","pt-BR","id","fr","de","ko","vi","th"];
 const flat=(obj,prefix="")=>Object.entries(obj).flatMap(([k,v])=>v&&typeof v==="object"?flat(v,prefix+k+"."):[prefix+k]).sort();
 const en=JSON.parse(read("web-spa/src/i18n/locales/en/teacher.json"));
 for(const language of languages){
  const dict=JSON.parse(read("web-spa/src/i18n/locales/"+language+"/teacher.json"));
  assert.deepEqual(flat(dict),flat(en),language+" Teacher keys");
 }
 const ja=JSON.parse(read("web-spa/src/i18n/locales/ja/teacher.json"));
 assert.match(ja.briefing.start,/始める/);
 assert.match(ja.briefing.goals,/目標/);
 assert.match(ja.tutor.speakingLevel,/レベル/);
 assert.match(ja.tutor.levels.A1,/初級/);
});
