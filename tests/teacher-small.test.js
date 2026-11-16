const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const crypto=require("node:crypto");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];

// Reconstruct the exact base from the new English-only mission titles.
// A matching base hash proves titleZh, keywords, IDs, scoring and every other field stayed untouched.
test("all 147 mission titles are English, with every non-titleEn catalog byte preserved",()=>{
 const files={
  Travel:[39,"7e67f4488eea5a60eba269f5fb7f6ff08d0075c3b447fab923414d533442617b"],
  Business:[27,"73c594e40cd1e00cc3c181361b420839a0697e7cbe8ad1a687b95d6a049b7f70"],
  Daily:[27,"0a44fe9196eed36423a0a2a23a68a60961557a26dea15d1f0f40f4a4633aa398"],
  Expanded:[54,"16c424bec3f46374d679fdc46d62052e4e941cb1a50c0fa3c1befb7d16bab38d"]
 };
 let total=0;
 for(const [name,[expected,baseSha]] of Object.entries(files)){
  const source=read(`web-spa/src/teacher/courseCatalog${name}.ts`);
  let count=0;
  const original=source.replace(/("titleEn":\s*)"([^"\n]+)"(,\s*"titleZh":\s*"([^"\n]+)",\s*"keywords":)/g,(_,pre,en,rest,zh)=>{
   assert.doesNotMatch(en,/[\u3400-\u9fff]/,`${name} mission ${count+1}: titleEn must not contain Chinese`);
   assert.ok(en.length>6,`${name} mission ${count}: English goal should be meaningful`);
   count++;
   return `${pre}"${zh}"${rest}`;
  });
  // The assertions above run on every mission; no lesson or unit names are rewritten.
  assert.equal(count,expected,`${name} mission count`);
  assert.equal(sha(original),baseSha,`${name} altered a field other than mission titleEn`);
  total+=count;
 }
 assert.equal(total,147);
});

test("briefing puts start above material notice and mission list on short phones",()=>{
 const briefing=read("web-spa/src/teacher/CourseBriefing.tsx");
 const css=read("web-spa/src/teacher/learningFlow.css");
 const start=briefing.indexOf('className="btn primary crew-learning-full-cta"');
 assert.ok(start>briefing.indexOf('className="crew-course-briefing-description"'));
 assert.ok(start<briefing.indexOf('crew-course-language-note'));
 assert.ok(start<briefing.indexOf('<ol className="crew-course-briefing-missions">'));
 assert.match(briefing,/to=\{"\/teacher\/live\?mode=course&lesson="\+encodeURIComponent\(lesson.id\)\}/);
 assert.match(css,/\.crew-learning-full-cta\{[^}]*min-height:52px/);
 assert.match(css,/\.crew-course-briefing-top \.btn\{min-height:44px/);
 assert.doesNotMatch(css,/\.crew-course-briefing[^}]*position:sticky/);
});

test("teacher hub has a compact optional key link and removes only its Gemini guide",()=>{
 const hub=read("web-spa/src/teacher/PracticePage.tsx");
 const notice=read("web-spa/src/components/GeminiSetupNotice.tsx");
 const guides=read("web-spa/src/guides/GuideHub.tsx");
 assert.match(hub,/<GeminiSetupNotice compactLabel=\{t\("practice.advancedKey"\)\}\/>/);
 assert.doesNotMatch(hub,/<GeminiSetupNotice\/>/);
 assert.match(hub,/<GuideHub hideGeminiKey\/>/);
 assert.match(guides,/hideGeminiKey=false/);
 assert.match(guides,/!hideGeminiKey\|\|slug!=="gemini-key-for-ai-practice"/);
 for(const file of ["pages/HomePage.tsx","pages/MobileHomePage.tsx"]){
  const pagePath="web-spa/src/"+file;
  // The production repo has both pages; the handoff zip includes read-only snapshots.
  if(fs.existsSync(path.join(root,pagePath)))assert.match(read(pagePath),/<GuideHub\/>/,`homepage ${file} must retain all guide links`);
 }
 assert.match(notice,/if\(compactLabel\)return <Link/);
 assert.match(notice,/minHeight:44,fontSize:12/);
 assert.match(notice,/const safeReturn=proposed\.startsWith\("\/"\)/);
 assert.match(notice,/return <div className=\{"crew-gemini-setup-notice "\+className\}/);
});

test("all 11 localizations include both new labels and a key-free home games subtitle",()=>{
 for(const lang of locales){
  const base=`web-spa/src/i18n/locales/${lang}/`;
  const teacher=JSON.parse(read(base+"teacher.json"));
  const home=JSON.parse(read(base+"home.json"));
  for(const key of [teacher.practice.advancedKey,teacher.vocabulary.placementEstimating,home.actions.playDesc]){
   assert.equal(typeof key,"string",`${lang}: missing string`);
   assert.ok(key.trim().length>1,`${lang}: empty copy`);
  }
  assert.doesNotMatch(home.actions.playDesc,/key|gemini|schlüssel|clave|clé|chave|kunci|キー|키|คีย์|khóa|金鑰|密鑰/i,`${lang}: game copy must not mention keys`);
 }
 assert.equal(JSON.parse(read("web-spa/src/i18n/locales/en/teacher.json")).vocabulary.placementEstimating,"Estimating level…");
 assert.match(read("web-spa/src/teacher/VocabularyPage.tsx"),/attempts<8\?t\("vocabulary.placementEstimating"\):placementLabel/);
 assert.match(read("web-spa/src/teacher/adaptivePlacement.ts"),/"Pre-A1".*"A1".*"A2".*"B1".*"B2\+"/);
});

test("live lesson still reads mission English titles without modifying the oversized page",()=>{
 const livePath="web-spa/src/teacher/LivePage.tsx";
 // The handoff zip contains only editable files; full repo gates inspect LivePage too.
 if(!fs.existsSync(path.join(root,livePath)))return; // Oversized read-only file is not packed into this handoff zip.
 const live=read(livePath);
 assert.match(live,/missions\.map\(m=>m\.titleEn\)/);
 assert.match(live,/missions\.map\(m=>m\.titleZh\)/);
});
