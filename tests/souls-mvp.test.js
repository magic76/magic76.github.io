const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const app=fs.readFileSync(path.join(root,"web-spa/src/App.tsx"),"utf8");
const page=fs.readFileSync(path.join(root,"web-spa/src/souls/SoulsPage.tsx"),"utf8");
const nav=fs.readFileSync(path.join(root,"web-spa/src/pages/crewNavigation.ts"),"utf8");
test("Souls is a direct-only lazy route, not a navigation entry",()=>{
 assert.match(app,/path="\/souls"/);
 assert.match(app,/withNamespace\("voice",import\("\.\/souls\/SoulsPage"\)\)/);
 assert.doesNotMatch(nav,/\/souls/);
});
test("Souls recognition always requires explicit confirmation",()=>{
 assert.match(page,/function candidates\(/);
 assert.match(page,/onClick=\{\(\)=>void choose\(soul\)\}/);
 assert.match(page,/Local image matching only suggests candidates/);
});
test("Souls uses browser storage and the Friends Live engine",()=>{
 assert.match(page,/indexedDB\.open\("crew-souls-local-v1"/);
 assert.match(page,/useLiveSession\(/);
 assert.match(page,/sessionKind:"friend"/);
 assert.match(page,/role="friend"/);
});
test("Soul memory is scoped to the object and can be disabled or deleted",()=>{
 assert.match(page,/current\.remember/);
 assert.match(page,/await update\(id,current=>/);
 assert.match(page,/notes:s\.notes\.filter/);
 assert.match(page,/Delete Soul/);
});

test("camera-first route uses repeated local recognition and asks for uncertain identities",()=>{
 const camera=fs.readFileSync(path.join(root,"web-spa/src/souls/SoulCamera.tsx"),"utf8");
 assert.match(page,/onProbe=\{probe\}/);
 assert.match(page,/onWake=\{\(id,file\)/);
 assert.match(page,/best\.score<\.94/);
 assert.match(page,/best\.score-\(ranked\[1\]\?\.score\|\|0\)<\.12/);
 assert.match(camera,/stable\.current\.hits>=3/);
 assert.match(camera,/getUserMedia\(\{video:/);
 assert.match(camera,/getTracks\(\)\.forEach/);
});
test("voice and typed chat use one live session; typing has no separate model call",()=>{
 const chat=page.slice(page.indexOf("function SoulChat("),page.indexOf("export function SoulsPage("));
 assert.match(chat,/useLiveSession\(/);
 assert.match(chat,/live\.sendText\(value\)/);
 assert.match(chat,/live\.start\(\)/);
 assert.doesNotMatch(chat,/CrewAI\.call/);
 assert.doesNotMatch(chat,/setMode\("text"\)/);
});
test("cutout is optional, local, and never replaces identity reference photos",()=>{
 const cut=fs.readFileSync(path.join(root,"web-spa/src/souls/soulCutout.ts"),"utf8");
 assert.match(cut,/InteractiveSegmenter/);
 assert.match(cut,/toDataURL\("image\/png"\)/);
 assert.match(page,/photos:\[scan\],cutout:cutoutDraft/);
 assert.match(page,/cutoutObject\(original\.image,pos\)/);
});
