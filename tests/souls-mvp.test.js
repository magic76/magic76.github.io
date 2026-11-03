const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const page=read("web-spa/src/souls/SoulsPage.tsx");
const portrait=read("web-spa/src/souls/SoulPortrait.tsx");
const face=read("web-spa/src/souls/soulFace.ts");
const data=read("web-spa/src/souls/soulData.ts");
const chat=read("web-spa/src/souls/SoulChat.tsx");
const cutout=read("web-spa/src/souls/soulCutout.ts");
const css=read("web-spa/src/souls/souls.css");
const app=read("web-spa/src/App.tsx");
const nav=read("web-spa/src/pages/crewNavigation.ts");

test("Crew Souls remains direct-only, not accidentally added to public navigation",()=>{
 assert.match(app,/path="\/souls"/);
 assert.match(app,/withNamespace\("voice",import\("\.\/souls\/SoulsPage"\)\)/);
 assert.doesNotMatch(nav,/\/souls/);
});
test("photo-first camera/gallery inputs create exactly one new image, no live camera",()=>{
 assert.match(page,/capture="environment"/);
 assert.match(page,/type="file" accept="image\/\*"/);
 assert.match(page,/async function pickPhoto\(/);
 assert.match(page,/await photoFromFile\(file\)/);
 assert.match(page,/photos:\[draft\]/);
 assert.doesNotMatch(page,/SoulCamera|getUserMedia|onProbe|onWake|trackMultiFrame/);
 assert.doesNotMatch(page,/async function processFiles\(/);
});
test("cutout is attempted automatically but optional; failed segmentation never blocks Save",()=>{
 assert.match(page,/void runCutout\(p\.image,\{x:\.5,y:\.52\}\)/);
 assert.match(page,/await cutoutObject\(image,point\)/);
 assert.match(cutout,/InteractiveSegmenter/);
 assert.match(cutout,/toDataURL\("image\/png"\)/);
 assert.match(page,/setInfo\(t\("這張照片暫時無法自動去背/);
 assert.match(page,/cutout:useCutout&&cutoutDraft\?cutoutDraft:undefined/);
 assert.match(page,/onClick=\{e=>tapSource\(e,draft\.image\)\}/);
 assert.match(page,/cutoutJob\.current\+\+/);
 assert.doesNotMatch(page,/if\(!cutoutDraft\)return/);
});
test("face is independent from the PNG, adjustable before and after saving",()=>{
 assert.match(data,/face\?:SoulFace/);
 assert.match(page,/face:safeFace\(faceDraft\)/);
 assert.match(page,/onFaceChange=\{setFaceDraft\}/);
 assert.match(page,/setFaceDraft\(safeFace\(selected\.face\)\)/);
 assert.match(page,/await mutate\(s=>\(\{\.\.\.s,face:safeFace\(faceDraft\)\}\)\)/);
 assert.match(portrait,/onPointerDown=\{down\} onPointerMove=\{drag\}/);
 assert.match(portrait,/setPointerCapture\(e\.pointerId\)/);
 assert.match(portrait,/ref=\{mouthRef\}/);
 assert.match(face,/export function faceFromAlpha/);
 assert.match(face,/export function safeFace/);
 assert.match(css,/\.souls-portrait-face/);
});
test("a saved cutout animates during existing Friends Gemini Live session",()=>{
 assert.match(page,/selected\?\.cutout\|\|selected\?\.photos/);
 assert.match(page,/<SoulChat key=\{selected\.id\}/);
 assert.match(page,/onVisual=\{onVisual\} onAudioLevel=\{onAudioLevel\}/);
 assert.match(page,/mouthRef\.current/);
 assert.match(portrait,/data-speaking=\{talking\?"true":"false"\}/);
 assert.match(portrait,/souls-portrait-eye-set/);
 assert.match(portrait,/souls-portrait-speaking-mouth/);
 assert.match(chat,/useLiveSession\(/);
 assert.match(chat,/sessionKind:"friend"/);
 assert.match(chat,/live\.sendText\(value\)/);
 assert.match(chat,/onOutputLevel:level=>onAudioLevel\?\.\(level\)/);
 assert.match(chat,/Your owner has opened your Soul portrait/);
 assert.doesNotMatch(chat,/SoulCamera|The camera has just recognized you/);
});
test("existing IndexedDB Souls remain readable without migration or photo re-enrollment",()=>{
 assert.match(data,/indexedDB\.open\("crew-souls-local-v1",1\)/);
 assert.match(page,/await list\(\)/);
 assert.match(page,/selected\?\.cutout\|\|selected\?\.photos/);
 assert.match(page,/face=\{s\.face\}/);
 assert.match(data,/face\?:SoulFace/);
 assert.match(page,/await save\(s\)/);
 assert.match(page,/await update\(selected\.id,fn\)/);
 assert.match(page,/await remove\(selected\.id\)/);
});
test("memory controls and privacy statement remain in photo-first workflow",()=>{
 assert.match(data,/isSafeAutomaticMemory\(note,evidence\)/);
 assert.match(data,/current\.remember/);
 assert.match(page,/remember:rememberEnabled/);
 assert.match(page,/notes:s\.notes\.filter/);
 assert.match(page,/Delete Soul and memories/);
 assert.match(page,/Cutout runs on-device/);
 assert.match(page,/Only explicit Gemini photo analysis uploads an image/);
 assert.match(page,/await ensureVision\(\)/);
 assert.match(page,/geminiKey\(\)/);
});
test("no new visual dependencies or tracking are necessary for static portraits",()=>{
 assert.doesNotMatch(portrait,/navigator\.mediaDevices|requestAnimationFrame|WebGL|WebGPU|createObjectURL/);
 assert.match(css,/souls-portrait-editing/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(page,/step==="edit"/);
 assert.match(page,/step==="detail"/);
 assert.doesNotMatch(page,/step==="match"|cameraAttached|setCameraOpen/);
});
test("preserve entire long or wide item when preparing reference photo",()=>{
 assert.match(data,/const fit=Math\.min\(640\/img\.naturalWidth,640\/img\.naturalHeight\)/);
 assert.match(data,/ctx\.drawImage\(img,\(640-outW\)\/2,\(640-outH\)\/2,outW,outH\)/);
 assert.doesNotMatch(data,/const side=Math\.min\(img\.naturalWidth,img\.naturalHeight\)/);
});
