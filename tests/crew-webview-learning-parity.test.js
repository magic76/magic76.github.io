const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const read=p=>readFileSync(p,"utf8");

test("Android Crew shell is detected by an explicit marker, not by generic Android",()=>{
 const platform=read("web-spa/src/lib/platform.ts");
 assert.match(platform,/CrewAndroidShell\/1/);
 assert.match(platform,/ua\.split\(\/\\s\+\/\)\.includes\(ANDROID_SHELL_UA_TOKEN\)/);
 assert.doesNotMatch(platform,/Android.*wv|navigator\.platform/);
 const store=read("web-spa/src/components/PlayStoreLink.tsx");
 assert.match(store,/isCrewAndroidShell\(\)/);
 assert.match(store,/if\(!ready\|\|isCrewAndroidShell\(\)\)return null/);
 const home=read("web-spa/src/pages/HomePage.tsx");
 const my=read("web-spa/src/teacher/MyPage.tsx");
 assert.match(home,/ready&&!isCrewAndroidShell\(\)&&<section className="crew-home-android"/);
 assert.match(my,/ready&&!isCrewAndroidShell\(\)&&<section className="section panel"/);
});

test("main Learn tab has native-equivalent continue, daily activity and three-minute speaking",()=>{
 const hub=read("web-spa/src/pages/CrewSectionPage.tsx");
 const learn=read("web-spa/src/teacher/LearnPage.tsx");
 assert.match(hub,/<LearningFocusCard\/>/);
 const focus=read("web-spa/src/teacher/LearningFocusCard.tsx");
 assert.match(focus,/<TodayLearningCard compact\/>/);
 assert.match(hub,/\/friend\/live\?id=zoe&intent=speak/);
 assert.match(hub,/crew-learn-tool-grid/);
 assert.match(hub,/setTargetLanguage\(event\.target\.value\)/);
 assert.doesNotMatch(hub,/<details className="crew-learn-more"/);
 assert.match(hub,/LearnHubExtras/);
 assert.match(hub,/section==="learn"\?/);
 assert.match(learn,/<TodayLearningCard\/>/);
 assert.match(learn,/<ContinueLearningCard compact\/>/);
 assert.match(learn,/\/friend\/live\?id=zoe&intent=speak/);
 assert.match(focus,/buildDailyLearningPlan\(\)/);
 assert.match(focus,/getTeacherProfile\(/);
 assert.match(focus,/to=\{plan\.to\}/);
 assert.match(focus,/crew-action-primary/);
 assert.match(focus,/plan\?\.textbook/);
 assert.doesNotMatch(focus,/resume\?plan\.to:/);
 const coordinator=read("web-spa/src/teacher/learningCoordinator.ts");
 assert.match(coordinator,/export function todayStep/);
 assert.match(coordinator,/dueVocabulary>0/);
 assert.match(coordinator,/practicedVocabularyToday===0/);
 assert.match(coordinator,/bestNextLesson\(\)/);
 const stats=read("web-spa/src/teacher/learningToday.ts");
 assert.match(stats,/history\("teacher"\)/);
 assert.match(stats,/item\.durationMs/);
 assert.match(stats,/turns\.some/);
 assert.match(stats,/stamp\.toDateString\(\)!==today/);
 assert.match(stats,/Math\.min\(100,Math\.round/);
 assert.match(stats,/crew_web_daily_goal_minutes_v1/);
 const card=read("web-spa/src/teacher/TodayLearningCard.tsx");
 assert.match(card,/role="progressbar"/);
 assert.match(card,/todayVocabulary\(\)/);
 assert.match(card,/completedLessons\(\)/);
 assert.match(card,/t\("todayLearning\.footnote"\)/);
 for(const locale of ["zh-TW","en","ja"]){
  const copy=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/home.json"));
  assert.ok(copy.todayLearning.footnote,"Local storage disclaimer must be translated for "+locale);
 }
 assert.match(JSON.parse(read("web-spa/src/i18n/locales/zh-TW/home.json")).todayLearning.footnote,/尚未與舊 Android 原生紀錄同步/);
});

test("3-minute shortcut is translated in both site locales",()=>{
 for(const loc of ["en","zh-TW"]){
  const data=JSON.parse(read("web-spa/src/i18n/locales/"+loc+"/teacher.json"));
  assert.ok(data.learn.threeMinute);
  assert.ok(data.learn.threeMinuteDesc);
 }
});
