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


test("camera survives recognition and runs Live inside the live view, not a static photo",()=>{
 const camera=fs.readFileSync(path.join(root,"web-spa/src/souls/SoulCamera.tsx"),"utf8");
 assert.match(camera,/souls-camera-viewport/);
 assert.match(camera,/souls-ar-face/);
 assert.match(camera,/data-speaking=\{speaking/);
 assert.match(camera,/data-tracking=\{tracking\}/);
 assert.match(camera,/souls-ar-caption/);
 assert.match(camera,/children/);
 const start=page.indexOf("async function wake(id:string,file:File)");
 const end=page.indexOf("function home()",start);
 assert.ok(start>0&&end>start);
 assert.doesNotMatch(page.slice(start,end),/setCameraOpen\(false\)/);
 assert.match(page,/activeSoul=\{step==="detail"&&selected/);
 assert.match(page,/onVisual=\{onVisual\}/);
 assert.match(page,/overlay onVisual=/);
 assert.match(page,/onReset=\{resetCameraSoul\}/);
});
test("tracking is local and allows tap-to-reanchor, conservative loss detection",()=>{
 const camera=fs.readFileSync(path.join(root,"web-spa/src/souls/SoulCamera.tsx"),"utf8");
 const tracker=fs.readFileSync(path.join(root,"web-spa/src/souls/soulTracker.ts"),"utf8");
 assert.match(camera,/onClick=\{aim\}/);
 assert.match(camera,/initTracker\(/);
 assert.match(camera,/trackFrame\(/);
 assert.match(camera,/misses\.current>=3/);
 assert.match(camera,/getImageData\(/);
 assert.match(tracker,/deviation<10/);
 assert.match(tracker,/bestError>28/);
 assert.match(camera,/stream\.current\?\.getTracks\(\)\.forEach/);
});
test("facial expression changes with the same Live voice and text session",()=>{
 const chat=page.slice(page.indexOf("function SoulChat("),page.indexOf("export function SoulsPage()"));
 assert.match(chat,/live\.state==="speaking"/);
 assert.match(chat,/live\.sendText\(value\)/);
 assert.match(chat,/const mood:SoulVisual/);
 assert.match(chat,/useEffect\(\(\)=>\{onVisual\?\./);
 assert.doesNotMatch(chat,/CrewAI\.call/);
});


test("first-time camera enrollment returns to live camera instead of static photo",()=>{
 const start=page.indexOf("function createStart()");
 const end=page.indexOf("async function aiDescribe()",start);
 assert.ok(start>0&&end>start);
 assert.match(page.slice(start,end),/returnToCameraAfterCreate\.current=cameraOpen/);
 const createStart=page.indexOf("async function create(e:FormEvent)");
 const createEnd=page.indexOf("async function choose(",createStart);
 assert.ok(createStart>0&&createEnd>createStart);
 assert.match(page.slice(createStart,createEnd),/await refresh\(s\.id\)/);
 assert.match(page.slice(createStart,createEnd),/if\(returnToCameraAfterCreate\.current\)\{setCameraOpen\(true\)/);
 assert.match(page,/activeSoul=\{step==="detail"&&selected/);
});
