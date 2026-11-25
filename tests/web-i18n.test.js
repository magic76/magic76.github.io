const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=filepath=>fs.readFileSync(path.join(root,filepath),"utf8");
const load=(lang,ns)=>JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/"+ns+".json"));
function keys(value,prefix=""){
 return Object.entries(value).flatMap(([key,item])=>{
  const next=prefix?prefix+"."+key:key;
  return typeof item==="string"?[next]:keys(item,next);
 }).sort();
}

test("i18n provides matching translation keys for all published UI locales",()=>{
 const eagerNamespaces=["common","home","settings","teacher","friends","story","fortune"];
 const routeNamespaces=["games","mate","lesson","voice","fortuneReport","fortuneDaily"];
 for(const ns of [...eagerNamespaces,...routeNamespaces]){
  const zh=load("zh-TW",ns),en=load("en",ns);
  assert.deepEqual(keys(zh),keys(en),ns+" translation keys must match");
  for(const value of [zh,en]){
   for(const key of keys(value)){
    // The magic namespace is flat with sentence keys that may contain dots.
    const translated=Object.hasOwn(value,key)?value[key]:key.split(".").reduce((obj,k)=>obj[k],value);
    assert.equal(typeof translated,"string");
    // Mode headings are assembled from semantic fragments; the trailing suffix is
    // intentionally optional for some short English/Chinese headlines.
    if(ns==="home"&&/^world\.modes\.(chat|play|learn|story|fortune)\.after$/.test(key))continue;
    assert.ok(translated.trim().length,ns+":"+key+" must not be empty");
   }
  }
 }
});


test("global UI locale is persisted separately from spoken learning languages",()=>{
 const index=read("web-spa/src/i18n/index.ts");
 const switcher=read("web-spa/src/i18n/LanguageSwitcher.tsx");
 const main=read("web-spa/src/main.tsx");
 assert.ok(main.includes('import "./i18n"'));
 assert.ok(read("web-spa/src/i18n/localeCatalog.ts").includes("crew_ui_locale_v1"));
 assert.ok(index.includes('document.documentElement.lang=locale'));
 assert.ok(index.includes('default:["en","zh-TW"]'));
 assert.ok(index.includes('window.addEventListener("storage"'));
 assert.ok(switcher.includes('i18n.changeLanguage(next)'));
 assert.ok(!switcher.includes("setTargetLanguage"));
 assert.ok(!index.includes("crew_web_target_language"));
 assert.ok(!switcher.includes("setSpeakingPace"));
});

test("English switches the shell, dashboard and settings without changing the HashRouter",()=>{
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 const home=read("web-spa/src/pages/HomePage.tsx");
 const settings=read("web-spa/src/pages/SettingsPage.tsx");
 const panel=read("web-spa/src/pages/GeminiConnectionPanel.tsx");
 const router=read("web-spa/src/main.tsx");
 assert.ok(router.includes("<HashRouter>"));
 assert.ok(chrome.includes("<LanguageSwitcher/>"));
 assert.ok(chrome.includes('t("nav."+item.id)'));
 assert.ok(chrome.includes('t("nav.label")'));
 assert.ok(home.includes('useTranslation("home")'));
 assert.ok(home.includes('t("setup.title")'));
 assert.ok(settings.includes('useTranslation("settings")'));
 assert.ok(settings.includes('<LanguageSwitcher variant="settings"/>'));
 assert.ok(panel.includes('useTranslation("settings")'));
 assert.ok(panel.includes('t("gemini.micAuthorization")'));
 assert.equal(load("en","home").headline,"Talk, play, and learn with Koolo");
 assert.equal(load("en","settings").gemini.micStateDenied,"Denied (check system and site permissions)");
});

test("product pages translate visible UI without rewriting conversation language",()=>{
 const teacher=read("web-spa/src/teacher/PracticePage.tsx");
 const roles=read("web-spa/src/teacher/RolesPage.tsx");
 const friends=read("web-spa/src/friends/FriendsPage.tsx");
 const story=read("web-spa/src/story/ShelfPage.tsx");
 const create=read("web-spa/src/story/CreatePage.tsx");
 const fortune=read("web-spa/src/fortune/HomePage.tsx");
 for(const page of [teacher,roles,friends,story,create,fortune])
  assert.ok(page.includes("useTranslation"),"product entry page must use i18n");
 assert.ok(teacher.includes('target==="英文"'),"learning language rule must not change");
 assert.ok(friends.includes('value={v}'),"option value must stay in original learning language");
 assert.ok(friends.includes('english?friend.titleEn:friend.titleZh'),"friend profile localized separately from chat language");
 assert.ok(friends.includes('setTargetLanguage'),"friend session language still controlled by its own store");
 assert.ok(story.includes('book.title||t("shelf.myStory")'),"saved story content must remain intact");
});


test("inner practice, editor and birth-place forms translate UI without mutating user data",()=>{
 const vocab=read("web-spa/src/teacher/VocabularyPage.tsx");
 const course=read("web-spa/src/teacher/CoursePage.tsx");
 const next=read("web-spa/src/teacher/ContinueLearningCard.tsx");
 const editor=read("web-spa/src/story/EditorPage.tsx");
 const profile=read("web-spa/src/fortune/ProfileTools.tsx");
 const reader=read("web-spa/src/story/ReaderPage.tsx");
 for(const source of [vocab,course,next,editor,profile,reader])assert.ok(source.includes("useTranslation"));
 assert.ok(vocab.includes('t("vocabulary.title")'));
 assert.ok(vocab.includes("recordPlacement(word,correct)"),"adaptive placement stays in control");
 assert.ok(vocab.includes("teacherText(native"),"feedback still uses the learner's native language");
 assert.ok(course.includes('english?lesson.titleEn:lesson.titleZh'),"course IDs and localized catalogs stay separate");
 assert.ok(course.includes('lessonUnlocked(lesson.id)'),"unlocking is unchanged");
 assert.ok(next.includes('course?.titleEn'),"next-step title should follow UI language");
 assert.ok(next.includes("plan.primaryFocus"),"personal learning focus is not overwritten");
 assert.ok(editor.includes('t("editor.emotions."+emotion)'),"display emotion translated but stored IDs unchanged");
 assert.ok(editor.includes("value={emotion}"),"emotion storage uses stable IDs");
 assert.ok(editor.includes("patchPage({emotion:e.target.value})"));
 assert.ok(profile.includes('t("profile.city")'));
 assert.ok(profile.includes("utcOffsetForBirth"),"birthplace timezone arithmetic unchanged");
 assert.ok(profile.includes("saveFortunePreset(mode,profile)"));
 assert.ok(reader.includes("StoryPlayerView"),"narration remains in the existing player");
 assert.equal(load("en","teacher").vocabulary.listen,"Listen to pronunciation");
 assert.equal(load("zh-TW","story").editor.emotions.warm,"溫暖");
 assert.equal(load("en","fortune").profile.searching,"Searching…");
});

test("global UI locale options and search index publication gates",()=>{
 const options=JSON.parse(read("config/ui-locales.json")).locales;
 assert.equal(options.length,11);
 assert.equal(new Set(options.map(x=>x.code)).size,11);
 assert.deepEqual(options.filter(x=>x.stage!=="preview").map(x=>x.code),
  ["zh-TW","en","ja","es","pt-BR","id","fr","de","ko","vi","th"]);
 assert.deepEqual(options.filter(x=>x.stage==="published").map(x=>x.code),["zh-TW","en"]);
 const routes=read("web-spa/src/main.tsx");
 const selector=read("web-spa/src/i18n/LanguageSwitcher.tsx");
 const deploy=read("scripts/prepare-cloudflare.mjs");
 const index=read("web-spa/src/i18n/index.ts");
 assert.ok(!index.includes("previewResources"));
 assert.ok(routes.includes("localeFromPublicPath(window.location.pathname)"));
 assert.ok(selector.includes("localePrefix(next)"));
 assert.ok(!selector.includes("language.previewHint"));
 assert.ok(!selector.includes("language.beta"),"language choices should not show beta badges");
 assert.ok(selector.includes('aria-haspopup="dialog"'));
 assert.ok(selector.includes("dialog.showModal()"));
 assert.ok(!selector.includes("<select"),"locale switcher must not open Android WebView's native full-height select");
 assert.ok(deploy.includes('locale.stage!=="published"'));
 assert.ok(deploy.includes('name="robots" content="noindex,follow"'));
 assert.ok(deploy.includes('"_redirects"'));
 for(const language of ["ja","es","pt-BR","id"])assert.ok(load(language,"home").headline);
});

test("locale dialog fits mobile viewports without beta badges beside language names",()=>{
 const css=read("web-spa/src/i18n/languageSwitcher.css");
 const zh=load("zh-TW","common").language;
 const en=load("en","common").language;
 assert.ok(css.includes("overflow-y:auto"),"options should scroll inside the dialog");
 assert.ok(css.includes("78dvh"),"mobile bottom sheet must have a bounded height");
 assert.ok(css.includes("safe-area-inset-bottom"));
 assert.equal(zh.previewHint,"部分內容將以英文顯示");
 assert.equal(en.previewHint,"Some content will appear in English");
 assert.ok(!read("web-spa/src/i18n/LanguageSwitcher.tsx").includes("crew-language-stage"));
 assert.ok(zh.beta&&en.beta,"translation keys are preserved for catalog parity");
 assert.ok(!read("config/ui-locales.json").includes('"preview"'));
 assert.ok(!read("web-spa/src/i18n/LanguageSwitcher.tsx").includes("crew-language-option-note"));
});


test("Explore uses translations for all six cards and all 11 selectable UI languages",()=>{
 const hub=read("web-spa/src/pages/CrewSectionPage.tsx");
 assert.ok(hub.includes('useTranslation("home")'));
 assert.ok(hub.includes('t("sectionExplore.title")'));
 assert.ok(hub.includes('const kinds=["timeline","games","story","research","circle"]'));
 const locales=JSON.parse(read("config/ui-locales.json")).locales.map(item=>item.code);
 assert.equal(locales.length,11);
 for(const language of locales){
  const copy=load(language,"home").sectionExplore;
  assert.ok(copy.title&&copy.intro&&copy.destinations,language+" heading");
  for(const kind of ["fortune","timeline","games","story","research","circle"])
   assert.ok(copy[kind].title&&copy[kind].desc,language+" "+kind+" translated card");
 }
 assert.notEqual(load("ja","home").sectionExplore.title,load("zh-TW","home").sectionExplore.title);
});


test("Chat, Learn, Me hubs and progress card translate every visible UI field in 11 locales",()=>{
 const hub=read("web-spa/src/pages/CrewSectionPage.tsx");
 const progress=read("web-spa/src/teacher/TodayLearningCard.tsx");
 const resume=read("web-spa/src/teacher/ContinueLearningCard.tsx");
 assert.ok(hub.includes('sectionItemKeys'));
 assert.ok(hub.includes('t(prefix+"hero.title")'));
 assert.ok(hub.includes('t("sectionHubs.chat.friendTitles."+friend.id'));
 assert.ok(progress.includes('useTranslation("home")'));
 assert.ok(progress.includes('t("todayLearning.summary",{minutes})'));
 assert.ok(resume.includes('plan&&chinese?plan.title'));
 for(const locale of JSON.parse(read("config/ui-locales.json")).locales.map(item=>item.code)){
  const {sectionHubs:h,todayLearning:today}=load(locale,"home");
  assert.ok(h.more,locale+" shared more heading");
  for(const [section,items] of Object.entries({chat:["shorts","games","memory"],learn:["center","scenarios","textbook","pronunciation","reports"],me:["readings","stories","memory","settings","reports"]})){
   const page=h[section];
   for(const value of [page.title,page.intro,page.hero.title,page.hero.desc,page.hero.tag])
    assert.ok(value&&typeof value==="string",locale+"/"+section+" hub labels");
   for(const item of items){
    assert.ok(page.items[item]?.title,locale+"/"+section+"/"+item+" title");
    assert.ok(page.items[item]?.desc,locale+"/"+section+"/"+item+" description");
   }
  }
  assert.equal(Object.keys(h.chat.friendTitles).length,6,locale+" friend profile subtitles");
  for(const key of ["meetFriends","allFriends"])assert.ok(h.chat[key],locale+" chat "+key);
  for(const key of ["learningOverview","todayTitle","recordsLink","threeMinuteTitle","threeMinuteDesc"])
   assert.ok(h.learn[key],locale+" learning "+key);
  assert.ok(h.me.footnote,locale+" local-only privacy note");
  for(const key of ["heading","goal","goalAria","minuteUnit","progress","summary","sessions","words","lessons","footnote"])
   assert.ok(today[key],locale+" progress "+key);
 }
 for(const section of ["chat","learn","me"])
  assert.notEqual(load("ja","home").sectionHubs[section].title,load("zh-TW","home").sectionHubs[section].title);
});

test("route-scoped catalogs load with their route instead of the entry bundle",()=>{
 const index=read("web-spa/src/i18n/index.ts");
 const app=read("web-spa/src/App.tsx");
 assert.match(index,/react:\{useSuspense:false,nsMode:"fallback"\}/,"multi-namespace useTranslation must fall back across namespaces");
 assert.doesNotMatch(index,/import \w+ from "\.\/locales\/[^"]+\/(games|mate|lesson|voice|magic)\.json"/);
 assert.match(index,/import\.meta\.glob\("\.\/locales\/\*\/\{games,mate,lesson,voice,magic,fortuneReport,fortuneDaily\}\.json"/);
 // Magic is a route namespace, not an eager entry dependency.
 assert.doesNotMatch(index,/import\s+\w+\s+from\s+["'][^"']*\/magic\.json["']/);
 assert.doesNotMatch(app,/import\s+\w+\s+from\s+["'][^"']*\/magic\.json["']/);
 assert.doesNotMatch(index,/\bmagic\s*:\s*(?:zhMagic|enMagic)\b/);
 assert.doesNotMatch(index,/namespaceNames=\[[^\]]*["']magic["']/);
 assert.doesNotMatch(index,/\bns:\[[^\]]*["']magic["']/);
 assert.match(index,/export type RouteNamespace=[^;]*"magic"/);
 assert.match(app,/withNamespace\(\["games","voice"\],import\("\.\/games\/TabooGamePage"\)\)/);
 assert.match(app,/withNamespace\("mate",import\("\.\/mate\/MatePage"\)\)/);
 assert.match(app,/withNamespace\(\["lesson","voice"\],import\("\.\/teacher\/LivePage"\)\)/);
 // Every lazy route that renders LiveControls or DesktopLivePanel preloads the voice catalog.
 for(const page of ["fortune/LivePage","friends/FriendLivePage","games/CrazyCourtPage","games/CrewPlayGamePage","games/FriendGomokuPage","games/NumberGamePage","games/TabooGamePage","story/LivePage","teacher/LivePage","teacher/PronunciationPage","teacher/TeacherBoardPage","teacher/TextbookPage","timeline/TimelineLivePage"]){
  const at=app.indexOf('import("./'+page+'")');
  assert.ok(at>0,page);
  assert.match(app.slice(Math.max(0,at-40),at),/withNamespace\((\["\w+",)?"voice"\]?,$/,page+" must preload voice");
 }
});

test("learn-today label keys and course counts are translated across all 11 locales",()=>{
 const all=JSON.parse(read("config/ui-locales.json")).locales.map(x=>x.code);
 const expected=["heading","start","changeTeacher","resumeTextbook","due","vocabulary","lesson","conversation","vocabularyNote","courseNote","conversationNote","threeMinute","threeMinuteDesc","more","records","settings","teachersCourses","teacherIntro","backToLearn","courseTracks","trackProgress"];
 const en=load("en","lesson").learnToday;
 const zh=load("zh-TW","lesson").learnToday;
 assert.deepEqual(Object.keys(en).sort(),Object.keys(zh).sort());
 for(const lang of all){
  const lesson=load(lang,"lesson").learnToday;
  const course=load(lang,"teacher").course.intro;
  for(const key of expected)assert.ok(lesson[key]&&typeof lesson[key]==="string",lang+"/learnToday."+key);
  for(const token of ["tracks","units","lessons"])assert.ok(course.includes("{{"+token+"}}"),lang+" missing "+token);
  for(const key of Object.keys(lesson))assert.doesNotMatch(key,/[.:]/);
  assert.match(lesson.lesson,/{{number}}/);
  assert.match(lesson.lesson,/{{name}}/);
 }
});


test("learnToday loading and SRS plural keys exist in all 11 locale catalogs",()=>{
 const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
 for(const code of locales){
  const today=load(code,"lesson").learnToday;
  for(const key of ["loading","loadingNote","loadingButton","due_one","due_other"]){
   assert.ok(today[key]?.trim(),code+" learnToday."+key);
   assert.match(today[key],key.startsWith("due_")?/\{\{count\}\}/:/\S/);
  }
 }
 assert.equal(load("en","lesson").learnToday.due_one,"Review {{count}} word due");
 assert.equal(load("en","lesson").learnToday.due_other,"Review {{count}} words due");
});
