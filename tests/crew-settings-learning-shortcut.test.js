const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");

test("Settings shows Chinese Pinyin even when English is the learning language",()=>{
 const source=read("web-spa/src/pages/SettingsPage.tsx");
 assert.match(source,/TeacherPinyinSetting[^>]*showWhenUnavailable/);
 assert.match(source,/pronunciationAidMode/);
 assert.match(source,/setPronunciationAidMode/);
 assert.match(read("web-spa/src/teacher/TeacherPinyinSetting.tsx"),/disabled={!available}/);
 assert.match(read("web-spa/src/teacher/TeacherPinyinSetting.tsx"),/isMandarinTarget\(targetLanguage\)/);
});

test("Pinyin preference is shared across Settings, pre-call and Live tools",()=>{
 for(const file of ["web-spa/src/pages/SettingsPage.tsx","web-spa/src/teacher/TutorPage.tsx","web-spa/src/teacher/TeacherLiveTools.tsx"]){
  assert.match(read(file),/TeacherPinyinSetting/,file);
 }
 const cmp=read("web-spa/src/teacher/TeacherPinyinSetting.tsx");
 assert.match(cmp,/PINYIN_AID_OPTIONS/);
 assert.match(cmp,/onChange\(event\.target\.value/);
});

test("My Crew links directly to the right settings section and deep link scrolls",()=>{
 assert.match(read("web-spa/src/pages/CrewSectionPage.tsx"),/to="\/settings#settings-learning"/);
 assert.match(read("web-spa/src/pages/SettingsPage.tsx"),/id="settings-learning"/);
 assert.match(read("web-spa/src/pages/SettingsPage.tsx"),/\["#settings-learning"/);
 assert.match(read("web-spa/src/pages/SettingsPage.tsx"),/id="settings-interface"/);
});

test("Pronunciation entry points to pronunciation training, not vocabulary",()=>{
 const source=read("web-spa/src/pages/SettingsPage.tsx");
 assert.match(source,/to="\/teacher\/pronunciation"/);
 assert.doesNotMatch(source,/to="\/teacher\/vocabulary"/);
});
