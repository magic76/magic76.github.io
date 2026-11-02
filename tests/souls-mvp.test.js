const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const app=fs.readFileSync(path.join(root,"web-spa/src/App.tsx"),"utf8");
const page=fs.readFileSync(path.join(root,"web-spa/src/souls/SoulsPage.tsx"),"utf8");
const nav=fs.readFileSync(path.join(root,"web-spa/src/pages/crewNavigation.ts"),"utf8");
const data=fs.readFileSync(path.join(root,"web-spa/src/souls/soulData.ts"),"utf8");
const recognition=fs.readFileSync(path.join(root,"web-spa/src/souls/soulRecognition.ts"),"utf8");
test("Souls is a direct-only lazy route, not a navigation entry",()=>{
 assert.match(app,/path="\/souls"/);
 assert.match(app,/withNamespace\("voice",import\("\.\/souls\/SoulsPage"\)\)/);
 assert.doesNotMatch(nav,/\/souls/);
});
test("Souls recognition always requires explicit confirmation",()=>{
 assert.match(data,/function candidates\(/);
 assert.match(page,/onClick=\{\(\)=>void choose\(soul\)\}/);
 assert.match(page,/Local image matching only suggests candidates/);
});
test("Souls uses browser storage and the Friends Live engine",()=>{
 assert.match(data,/indexedDB\.open\("crew-souls-local-v1"/);
 assert.match(page,/useLiveSession\(/);
 assert.match(page,/sessionKind:"friend"/);
 assert.match(page,/role="friend"/);
});
test("Soul memory is scoped to the object and can be disabled or deleted",()=>{
 assert.match(data,/current\.remember/);
 assert.match(data,/await update\(id,current=>/);
 assert.match(page,/notes:s\.notes\.filter/);
 assert.match(page,/Delete Soul/);
});

test("camera-first route uses repeated local recognition and asks for uncertain identities",()=>{
 const camera=fs.readFileSync(path.join(root,"web-spa/src/souls/SoulCamera.tsx"),"utf8");
 assert.match(page,/onProbe=\{probe\}/);
 assert.match(page,/onWake=\{\(id,file\)/);
 assert.match(page,/shouldAutoWake\(best,ranked\[1\]\)/);
 assert.match(recognition,/second\?\.score/);
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
 assert.match(page,/photos:keepReferences\(\[scan,\.\.\.draftPhotos\]\),cutout:cutoutDraft/);
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
 assert.match(camera,/initMultiTracker\(/);
 assert.match(camera,/trackMultiFrame\(/);
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

test("camera enrollment saves four spaced frames and keeps only distinct references",()=>{
 const camera=fs.readFileSync(path.join(root,"web-spa/src/souls/SoulCamera.tsx"),"utf8");
 assert.match(camera,/for\(let i=0;i<4;i\+\+\)/);
 assert.match(camera,/setTimeout\(resolve,650\)/);
 assert.match(camera,/onSnapshot\(frames\)/);
 assert.match(camera,/onAddReferences\?\.\(frames\)/);
 assert.match(page,/async function processFiles\(frames:File\[\]/);
 assert.match(page,/setDraftPhotos\(unique\)/);
 assert.match(data,/function keepReferences\(/);
 assert.match(page,/async function addReferences\(frames:File\[\]\)/);
 assert.match(page,/onAddReferences=\{frames=>addReferences\(frames\)/);
 assert.match(page,/photos:keepReferences\(\[scan,\.\.\.draftPhotos\]\)/);
});
test("multiple local tracker anchors must agree before moving cute face",()=>{
 const camera=fs.readFileSync(path.join(root,"web-spa/src/souls/SoulCamera.tsx"),"utf8");
 const tracker=fs.readFileSync(path.join(root,"web-spa/src/souls/soulTracker.ts"),"utf8");
 assert.match(tracker,/export function initMultiTracker\(/);
 assert.match(tracker,/export function trackMultiFrame\(/);
 assert.match(tracker,/inliers\.length<2/);
 assert.match(tracker,/median\(observations\.map/);
 assert.match(camera,/trackMultiFrame\(frame,tracker\.current\)/);
 assert.match(camera,/souls-ar-blush/);
 assert.match(camera,/souls-ar-cute-spark/);
 assert.match(camera,/rx="7" ry="9"/);
});

test("P0: user-guided local segmentation yields bounded object region and region-seeded tracker",()=>{
 const camera=fs.readFileSync(path.join(root,"web-spa/src/souls/SoulCamera.tsx"),"utf8");
 const region=fs.readFileSync(path.join(root,"web-spa/src/souls/soulRegion.ts"),"utf8");
 const tracker=fs.readFileSync(path.join(root,"web-spa/src/souls/soulTracker.ts"),"utf8");
 assert.match(camera,/locateSoulRegion\(picture,at\)/);
 assert.match(camera,/initRegionTracker\(latest,shifted,shiftedFace\)/);
 assert.match(camera,/souls-ar-region/);
 assert.match(camera,/onRegionCrop/);
 assert.match(region,/cutoutObject\(image/);
 assert.match(region,/maxX<0/);
 assert.match(tracker,/export function initRegionTracker/);
 assert.match(tracker,/ref\.box\?/);
});
test("P2: playback-only real RMS drives mouth without animation fake",()=>{
 const live=fs.readFileSync(path.join(root,"crew-live.js"),"utf8");
 const hook=fs.readFileSync(path.join(root,"web-spa/src/live/useLiveSession.ts"),"utf8");
 const camera=fs.readFileSync(path.join(root,"web-spa/src/souls/SoulCamera.tsx"),"utf8");
 const css=fs.readFileSync(path.join(root,"web-spa/src/souls/souls.css"),"utf8");
 assert.match(live,/typeof this\.options\.onOutputLevel==="function"/);
 assert.match(live,/meter\.getByteTimeDomainData\(samples\)/);
 assert.match(live,/this\.outputMeterTimer=global\.setInterval/);
 assert.match(live,/global\.clearInterval\(this\.outputMeterTimer\)/);
 assert.match(hook,/onOutputLevel:configRef\.current\.onOutputLevel/);
 assert.match(page,/onOutputLevel:level=>onAudioLevel\?\.\(level\)/);
 assert.match(camera,/ref=\{mouthRef\}/);
 assert.match(camera,/data-hearing=/);
 assert.match(css,/souls-mouth-open\{animation:none!important\}/);
});
test("P3: quality-rejected frames, on-device embeddings and uncertain match rejection",()=>{
 const embeddings=fs.readFileSync(path.join(root,"web-spa/src/souls/soulEmbedding.ts"),"utf8");
 assert.match(fs.readFileSync(path.join(root,"web-spa/src/souls/soulEmbedding.worker.ts"),"utf8"),/ImageEmbedder\.createFromOptions/);
 assert.match(embeddings,/function photoQuality/);
 assert.match(embeddings,/cosine/i);
 assert.match(data,/photoQuality\(ctx\.getImageData/);
 assert.match(data,/compareEmbeddings\(reference\.embedding,photo\.embedding\)/);
 assert.match(page,/if\(!photos\.length\)throw Error/);
 assert.match(page,/if\(p\.quality\|\|!shouldAutoWake\(best,ranked\[1\]\)\)/);
 assert.match(page,/onRegionCrop=\{file=>\{setPendingForeground\(file\)\}\}/);
});

test("failed burst propagates to camera and clears lock",()=>{
 const camera=fs.readFileSync(path.join(root,"web-spa/src/souls/SoulCamera.tsx"),"utf8");
 assert.match(camera,/locked\.current=false;stable\.current=\{id:"",hits:0\}/);
 assert.match(page,/onSnapshot=\{frames=>processFiles\(frames,true\)\}/);
 assert.match(page,/onAddReferences=\{frames=>addReferences\(frames\)\}/);
 assert.doesNotMatch(page,/onSnapshot=\{frames=>processFiles\(frames,true\)\.catch/);
});
test("foreground region only persists after explicit user confirmation",()=>{
 assert.match(page,/onRegionCrop=\{file=>\{setPendingForeground\(file\)\}\}/);
 assert.match(page,/async function confirmForeground\(\)/);
 assert.match(page,/onClick=\{\(\)=>void confirmForeground\(\)\}/);
 assert.match(page,/onClick=\{\(\)=>setPendingForeground\(null\)\}/);
});
test("embedding work and audio levels avoid per-frame React updates",()=>{
 const embed=fs.readFileSync(path.join(root,"web-spa/src/souls/soulEmbedding.ts"),"utf8");
 const worker=fs.readFileSync(path.join(root,"web-spa/src/souls/soulEmbedding.worker.ts"),"utf8");
 assert.match(embed,/new Worker\(new URL\("\.\/soulEmbedding\.worker\.ts",import\.meta\.url\)/);
 assert.match(worker,/embedder\.embed\(bitmap\)/);
 assert.match(page,/mouthRef\.current\.setAttribute\("ry"/);
 assert.doesNotMatch(page,/setAudioLevel/);
});
