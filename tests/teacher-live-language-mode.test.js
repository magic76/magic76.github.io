const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
test("teacher live mode sends explicit control before persisting and locks roleplay",()=>{
 const page=read("web-spa/src/teacher/LivePage.tsx");
 assert.match(page,/if\(isRoleplay\|\|fortuneKind\|\|modeLocked/);
 assert.match(page,/if\(connected&&!live\.sendControl\(teacherLanguageTransition/);
 assert.match(page,/setModeNote\("failed"\);return;\}/);
 assert.ok(page.indexOf("live.sendControl(teacherLanguageTransition")<page.indexOf("s.setTeachingMode(chosen)"));
 assert.match(page,/selectedLanguageMode=isRoleplay\?"immersion":s\.teachingMode/);
 assert.match(page,/\{languageModeSelector\}/);
 const policy=read("web-spa/src/teacher/teacherLanguage.ts");
 assert.match(policy,/latest UI selection supersedes ALL earlier teaching-language rules/);
 assert.match(policy,/teacherLanguageRule\(target,native,mode,level\)\+teacherLanguageReminder/);
 const live=read("web-spa/src/live/useLiveSession.ts");
 assert.match(live,/pageKey==="teacher"&&configRef\.current\.languageDirective/);
});
test("teacher language mode is available before starting and not duplicated in tools",()=>{
 const page=read("web-spa/src/teacher/TutorPage.tsx");
 assert.ok(page.indexOf('id="teacher-guidance"')<page.indexOf("teacher-advanced-section"));
 assert.doesNotMatch(read("web-spa/src/teacher/TeacherLiveTools.tsx"),/s\.setTeachingMode/);
});
test("zh-TW and English match bilingual and immersion labels across roles",()=>{
 for(const lang of ["zh-TW","en"]){
  const teacher=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/teacher.json")).tutor;
  const friend=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/friends.json"));
  assert.equal(teacher.guidance,friend.chatModeTitle);
  assert.equal(teacher.guidanceChoices.bilingual,friend.chatModeBilingual);
  assert.equal(teacher.guidanceChoices.immersion,friend.chatModeImmersion);
 }
});
