"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];

test("strategy #6 labels interface versus practice language without another mobile picker",()=>{
 const chrome=read("web-spa/src/i18n/LanguageSwitcher.tsx");
 const css=read("web-spa/src/i18n/languageSwitcher.css");
 const target=read("web-spa/src/pages/HomeTargetLanguage.tsx");
 const home=read("web-spa/src/pages/HomePortal.tsx");
 assert.match(chrome,/variant==="header"&&<svg className="crew-language-globe" aria-hidden="true"/);
 assert.match(chrome,/aria-label=\{t\("language.label"\)\+": "\+currentLabel\}/);
 assert.match(css,/max-width:92px;min-height:44px/);
 assert.match(css,/font-size:12px/);
 assert.match(target,/t\("world.practiceLang.label"\)/);
 assert.match(target,/setTargetLanguage\(event.currentTarget.value\)/);
 assert.match(home,/crew-portal-practice-preview/);
 assert.match(home,/t\("world.practiceLang.label"\)/);
 for(const lang of locales){
  const data=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/home.json`));
  assert.ok(data.world.practiceLang.label.trim(),lang);
  assert.notEqual(data.world.practiceLang.label,"我想練：",lang);
 }
 assert.equal(JSON.parse(read("web-spa/src/i18n/locales/zh-TW/home.json")).world.practiceLang.label,"練習語言：");
});

test("strategy #6 uses only supplied zh-TW Shorts translations immediately under the caption",()=>{
 const page=read("web-spa/src/teacher/ShortsPage.tsx");
 const preview=read("web-spa/src/teacher/HomeShortsPreview.tsx");
 const css=read("web-spa/src/teacher/shorts.css");
 const previewCss=read("web-spa/src/teacher/homeShorts.css");
 assert.match(page,/showZhTranslation=i18n.resolvedLanguage==="zh-TW"/);
 assert.match(page,/showZhTranslation&&post.translationZh&&post.language!=="zh"/);
 assert.match(page,/aria-expanded=\{translated===post.id\} aria-controls=/);
 assert.match(page,/lang="zh-Hant" hidden=\{translated!==post.id\}/);
 assert.ok(page.indexOf("<p lang={post.language}>{post.caption}</p>")<page.indexOf("className=\"crew-short-translation-wrap\""));
 assert.ok(page.indexOf("className=\"crew-short-translation-wrap\"")<page.indexOf("className=\"crew-short-chat-prompts\""));
 assert.doesNotMatch(page,/className="crew-short-translate"/);
 assert.match(preview,/i18n.resolvedLanguage==="zh-TW"&&post.translationZh&&post.language!=="zh"/);
 assert.match(preview,/className="crew-home-short-translation" lang="zh-Hant"/);
 assert.match(previewCss,/white-space:nowrap;text-overflow:ellipsis/);
 assert.match(css,/crew-short-translation\[hidden\]\{display:none\}/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 for(const lang of locales){
  const shorts=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/home.json`)).shorts;
  assert.ok(shorts.showTranslation&&shorts.hideTranslation,lang);
 }
});

test("strategy #6 presents truthful free and Key-required actions with the shared daily quota",()=>{
 const notice=read("web-spa/src/components/GeminiSetupNotice.tsx");
 const account=read("web-spa/src/pages/GeminiConnectionPanel.tsx");
 assert.match(notice,/GUEST_TEXT_DAILY_TURNS/);
 assert.match(account,/GUEST_TEXT_DAILY_TURNS/);
 for(const src of [notice,account])assert.match(src,/t\("gemini.keyCapabilities",\{count:GUEST_TEXT_DAILY_TURNS\}\)/);
 for(const lang of locales){
  const value=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/settings.json`)).gemini.keyCapabilities;
  assert.match(value,/\{\{count\}\}/,lang);
  assert.ok(value.length>70,lang);
  assert.doesNotMatch(value,/5 分鐘|five minutes|5 min/);
 }
 const text=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/settings.json")).gemini.keyCapabilities;
 assert.match(text,/不用 Key：和 AI 朋友打字聊天/);
 assert.match(text,/需要 Key：語音聊天、老師課程/);
 assert.match(read("web-spa/src/styles.css"),/\.crew-gemini-setup-copy small\{font-size:12px/);
});

function historyWith(data={},extras={}){
 const source=read("web-spa/src/teacher/learningHistory.ts").replace(/^import .*;\s*$/gm,"");
 const code=stripTypeScriptTypes(source,{mode:"strip"}).replace(/\bexport\s+(?=function)/g,"");
 const storage=new Map(Object.entries(data));
 const context={
  window:{},localStorage:{getItem:key=>storage.get(key)??null},
  completedTutorSessions:()=>extras.sessions||0,
  latestReviewFocus:()=>extras.review||"",
  studentMemories:()=>extras.memories||[],
 };
 vm.runInNewContext(code+'\nthis.subject=hasLearningHistory;',context);
 return context.subject;
}
test("strategy #6 only shows teacher continuation after real learner history, not suggested warmup",()=>{
 const page=read("web-spa/src/teacher/PracticePage.tsx");
 assert.match(page,/const showContinue=!ready\|\|hasLearningHistory\(target,profile.id\)/);
 assert.match(page,/\{showContinue&&<Link className="crew-role-entry teacher" to="\/teacher\/live\?intent=continue"/);
 assert.match(page,/\{showContinue&&<section className="section crew-continue-section"/);
 assert.match(page,/gridTemplateColumns:"minmax\(0,1fr\)"/);
 assert.match(page,/ContinueLearningCard compact/);
 const absent=historyWith();
 assert.equal(absent("英文","emma"),false);
 const course=historyWith({crew_teacher_course_progress_v1:JSON.stringify({c1:{stars:1}})});
 assert.equal(course("英文","emma"),true);
 assert.equal(course("日文","emma"),false);
 assert.equal(historyWith({crew_teacher_vocab_progress_v1:JSON.stringify({word:{seen:1}})})("英文","emma"),true);
 assert.equal(historyWith({}, {sessions:1})("日文","emma"),true);
 assert.equal(historyWith({}, {review:"Past focus"})("英文","emma"),true);
 assert.equal(historyWith({}, {memories:[{active:true}]})("英文","emma"),true);
 assert.equal(historyWith({crew_teacher_vocab_progress_v1:'{malformed'})("英文","emma"),false);
 assert.equal(historyWith({crew_teacher_course_progress_v1:'{malformed',crew_teacher_vocab_progress_v1:JSON.stringify({word:{seen:2}})})("英文","emma"),true);
});
