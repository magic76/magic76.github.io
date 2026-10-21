const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("Teacher's one entry opens a real saved-reading or calculator hub",()=>{
 const home=read("web-spa/src/teacher/PracticePage.tsx");
 const page=read("web-spa/src/teacher/TeacherFortunePage.tsx");
 const routes=read("web-spa/src/App.tsx");
 assert.match(home,/to="\/teacher\/fortune"/);
 assert.doesNotMatch(home,/to="\/teacher\/live\?fortune=daily"/);
 assert.match(routes,/path="fortune" element={<TeacherFortunePage\/>}/);
 assert.match(page,/CrewFortuneProfile\.get\(x\.id\)/);
 assert.match(page,/CrewFortuneProfile\.addHistory\(item\)/);
 assert.match(page,/start\("reading",readings\[0\]\)/);
});

test("Existing Fortune's deterministic calculators are reused rather than faking a chart",()=>{
 const page=read("web-spa/src/teacher/TeacherFortunePage.tsx");
 assert.match(page,/ensureFortuneServices\(\)/);
 assert.match(page,/CrewFortuneBaZi\.calculate/);
 assert.match(page,/CrewFortuneTarot\.calculate/);
 assert.match(page,/CrewFortuneVedicEnrich\.enrich/);
 assert.match(page,/mode!=="tarot"&&!profile\.birthTime/);
 assert.match(page,/mode==="vedic"&&\(!profile\.latitude/);
});

test("No birth details go into native voice handoff",()=>{
 const page=read("web-spa/src/teacher/TeacherFortunePage.tsx");
 const helper=read("web-spa/src/teacher/fortuneSpeaking.ts");
 assert.match(page,/nativeFortuneStartUrl\(kind,excerpt\)/);
 assert.match(page,/crewteacher:\/\/fortune\/start\?kind=/);
 assert.match(page,/encodeURIComponent\(summary\.slice\(0,1800\)\)/);
 assert.doesNotMatch(helper,/const context:FortuneSpeakingContext=\{[^}]*birthDate/);
 assert.match(helper,/sessionStorage\.setItem/);
});

test("Culture, daily and chart conversations use dedicated Fortune Live instead of Teacher tutoring",()=>{
 const page=read("web-spa/src/teacher/TeacherFortunePage.tsx");
 const live=read("web-spa/src/fortune/LivePage.tsx");
 assert.match(page,/start\("culture"\)/);
 assert.match(page,/start\("daily"\)/);
 assert.match(page,/navigate\("\/fortune\/live\?from="/);
 assert.match(live,/source==="hub"\?readFortuneSpeakingContext\(\)/);
 assert.match(live,/source==="daily"/);
 assert.match(live,/source==="culture"/);
 assert.match(live,/selected Crew Friend|Crew Friend/);
});
