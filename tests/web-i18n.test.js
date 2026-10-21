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
 for(const ns of ["common","home","settings","teacher","friends","story","fortune"]){
  const zh=load("zh-TW",ns),en=load("en",ns);
  assert.deepEqual(keys(zh),keys(en),ns+" translation keys must match");
  for(const value of [zh,en]){
   for(const key of keys(value)){
    const translated=key.split(".").reduce((obj,k)=>obj[k],value);
    assert.equal(typeof translated,"string");
    // Mode headings are assembled from semantic fragments; the trailing suffix is
    // intentionally optional for some short English/Chinese headlines.
    if(ns==="home"&&/^world\\.modes\\.(chat|play|learn|story)\\.after$/.test(key))continue;
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
 assert.equal(load("en","home").headline,"Talk, play, and learn with Crew");
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
 assert.equal(options.length,18);
 assert.equal(new Set(options.map(x=>x.code)).size,18);
 assert.deepEqual(options.filter(x=>x.stage!=="preview").map(x=>x.code),
  ["zh-TW","en","ja","es","pt-BR","id"]);
 assert.deepEqual(options.filter(x=>x.stage==="published").map(x=>x.code),["zh-TW","en"]);
 const routes=read("web-spa/src/main.tsx");
 const selector=read("web-spa/src/i18n/LanguageSwitcher.tsx");
 const deploy=read("scripts/prepare-cloudflare.mjs");
 const translations=read("web-spa/src/i18n/previewTranslations.ts");
 assert.ok(routes.includes("localeFromPublicPath(window.location.pathname)"));
 assert.ok(selector.includes("localePrefix(next)"));
 assert.ok(selector.includes("English fallback"));
 assert.ok(deploy.includes('locale.stage!=="published"'));
 assert.ok(deploy.includes('name="robots" content="noindex,follow"'));
 assert.ok(deploy.includes('"_redirects"'));
 for(const language of ["ja","es","pt-BR","id"])assert.ok(translations.includes('"'+language+'":'));
});
