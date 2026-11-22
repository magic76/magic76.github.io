const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');

test('legacy /play and zh-TW prefixed URLs reach canonical app routes',()=>{
 const app=read('web-spa/src/App.tsx');
 const main=read('web-spa/src/main.tsx');
 assert.match(app,/<Route path="\/play" element=\{<Navigate to="\/games" replace\/>\}/);
 assert.match(app,/<Route path="\/zh-TW\/\*" element=\{<ZhTwCanonicalRedirect\/>\}/);
 assert.match(app,/const canonical=pathname\.replace\(\/\^\\\/zh-TW\(\?=\\\/\|\$\)\//);
 assert.match(app,/canonical==="\/play"\?"\/games":canonical/);
 assert.match(app,/<Route path="\/games" element=/);
 assert.match(app,/<Route path="\/games\/1a2b" element=/);
 assert.match(app,/<Route path="\/games\/connect4"|<Route path="\/games\/:gameId"/);
 assert.match(main,/localePrefix\(localeFromPublicPath\(window\.location\.pathname\)\|\|"zh-TW"\)/);
});

test('course progress is labelled by the existing lesson namespace on first route load',()=>{
 const app=read('web-spa/src/App.tsx');
 const course=read('web-spa/src/teacher/CoursePage.tsx');
 assert.match(app,/const CoursePage=lazy\(\(\)=>withNamespace\("lesson",import\("\.\/teacher\/CoursePage"\)\)/);
 assert.match(course,/const \{t:tLesson\}=useTranslation\("lesson"\)/);
 assert.equal((course.match(/tLesson\("learnToday\.trackProgress"/g)||[]).length,2);
 assert.doesNotMatch(course,/className="crew-course-progress-pill">\{completed\} \/ \{total\}/);
 for(const locale of locales()){
  const lesson=JSON.parse(read(`web-spa/src/i18n/locales/${locale}/lesson.json`));
  assert.match(lesson.learnToday.trackProgress,/\{\{done\}\}/);
  assert.match(lesson.learnToday.trackProgress,/\{\{total\}\}/);
 }
});

test('voice permissions are requested on Start, and actual denial gives localized settings guidance',()=>{
 const src=read('web-spa/src/live/GuestLiveStarter.tsx');
 const before=src.slice(0,src.indexOf('async function begin(textOnly=false)'));
 const after=src.slice(src.indexOf('async function begin(textOnly=false)'));
 assert.doesNotMatch(before,/navigator\.permissions\?\.query/);
 assert.doesNotMatch(before,/role="alert"/);
 assert.doesNotMatch(before,/navigator\.mediaDevices\.getUserMedia\(/);
 assert.match(after,/navigator\.mediaDevices\.getUserMedia\(\{audio:true\}\)/);
 // Microphone help must come from the eagerly available common namespace:
 // settings is not a RouteNamespace accepted by loadUiNamespace().
 assert.doesNotMatch(src,/loadUiNamespace\("settings"\)/);
 assert.doesNotMatch(src,/settings:gemini\./);
 assert.match(src,/guestTrial\.micSitePermission/);
 assert.match(src,/setMessage\(t\("guestTrial\.micDenied"\)\)/);
 assert.match(src,/phase==="error"&&micPermissionDenied&&<p/);
 assert.match(src,/\{microphoneHelp\(\)\}<\/p>/);
 assert.match(src,/guestTrial\.microphoneNotice/);
 assert.match(src,/guestTrial\.micDenied/);
 assert.match(src,/guest_trial_mic_denied/);
 assert.match(src,/data\.code==="DAILY_LIMIT"/);
 assert.match(src,/data\.code==="ALREADY_USED"/);
 for(const locale of locales()){
  const common=JSON.parse(read(`web-spa/src/i18n/locales/${locale}/common.json`));
  assert.equal(typeof common.guestTrial.microphoneNotice,'string');
  assert.ok(common.guestTrial.microphoneNotice.length>10);
  const settings=JSON.parse(read(`web-spa/src/i18n/locales/${locale}/settings.json`));
  for(const [key,original] of [['micHelpMac','macHelp'],['micHelpWindows','windowsHelp'],['micHelpGeneric','genericHelp']]){
   assert.equal(common.guestTrial[key],settings.gemini[original],`${locale}: ${key} must exactly reuse existing localization`);
  }
 }
});

function locales(){return ['zh-TW','en','ja','ko','es','fr','de','pt-BR','id','vi','th']}
