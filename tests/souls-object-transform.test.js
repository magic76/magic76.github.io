const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const ts=read("web-spa/src/souls/soulTransform.ts");
const compiled=stripTypeScriptTypes(ts,{mode:"strip"})
 .replace(/\bexport\s+const\s+/g,"const ")
 .replace(/\bexport\s+function\s+/g,"function ");
const moduleBox={exports:{}};
new Function("module",compiled+"\nmodule.exports={DEFAULT_TRANSFORM,safeTransform,applyGesture,stageToObjectPoint};")(moduleBox);
const {DEFAULT_TRANSFORM,safeTransform,applyGesture,stageToObjectPoint}=moduleBox.exports;
const p=(id,x,y)=>({id,x,y});
const approx=(value,expected,tolerance=.002)=>assert.ok(Math.abs(value-expected)<tolerance,`${value} != ${expected}`);

test("old Souls without stored object transforms use identity transform",()=>{
 assert.deepEqual(safeTransform(undefined),DEFAULT_TRANSFORM);
 assert.deepEqual(safeTransform(null),DEFAULT_TRANSFORM);
});
test("invalid stored positions, scale and rotation are bounded",()=>{
 assert.deepEqual(safeTransform({x:999,y:-999,scale:100,rotation:540}),
  {x:.65,y:-.65,scale:2.8,rotation:-180});
 assert.deepEqual(safeTransform({x:NaN,y:Infinity,scale:-Infinity,rotation:NaN}),
  {x:-.65,y:-.65,scale:.5,rotation:0});
});
test("single pointer drag moves the entire photo by stage-relative distance",()=>{
 const out=applyGesture(DEFAULT_TRANSFORM,[p(1,100,160)],[p(1,150,110)],250,200);
 approx(out.x,.2);approx(out.y,-.25);approx(out.scale,1);approx(out.rotation,0);
});
test("pinch simultaneously scales, rotates and translates without drift",()=>{
 const initial={x:.05,y:-.1,scale:1.25,rotation:10};
 const out=applyGesture(initial,[p(1,100,100),p(2,200,100)],
  [p(1,85,85),p(2,235,135)],400,400);
 approx(out.x,.075);approx(out.y,-.075);
 approx(out.scale,1.25*Math.hypot(150,50)/100);
 approx(out.rotation,10+Math.atan2(50,150)*180/Math.PI);
});
test("pointer order does not matter; mismatched IDs cannot move the object",()=>{
 const a=applyGesture(DEFAULT_TRANSFORM,[p(10,40,40),p(20,140,40)],
  [p(20,160,60),p(10,60,60)],200,200);
 approx(a.x,.1);approx(a.y,.1);
 assert.deepEqual(applyGesture(DEFAULT_TRANSFORM,[p(1,0,0)],[p(2,100,100)],200,200),DEFAULT_TRANSFORM);
});
test("face editor inverts rotation, zoom and translation so eyes remain on object",()=>{
 const local=stageToObjectPoint(70,75,100,100,{x:.05,y:-.05,scale:1.5,rotation:90});
 approx(local.x,.7);approx(local.y,.4);
 const untouched=stageToObjectPoint(27,62,100,100,DEFAULT_TRANSFORM);
 approx(untouched.x,.27);approx(untouched.y,.62);
});
test("portrait nests image and eyes under the SAME saved transform",()=>{
 const portrait=read("web-spa/src/souls/SoulPortrait.tsx");
 const data=read("web-spa/src/souls/soulData.ts");
 const page=read("web-spa/src/souls/SoulsPage.tsx");
 const css=read("web-spa/src/souls/souls.css");
 const controls=read("web-spa/src/souls/SoulTransformControls.tsx");
 assert.match(data,/transform\?:SoulTransform/);
 assert.match(page,/transform:safeTransform\(transformDraft\)/);
 assert.match(page,/setTransformDraft\(safeTransform\(selected\.transform\)\)/);
 assert.match(page,/await mutate\(s=>\(\{\.\.\.s,face:safeFace\(faceDraft\),transform:safeTransform\(transformDraft\)\}\)\)/);
 assert.match(portrait,/className="souls-portrait-object"/);
 assert.match(portrait,/souls-portrait-photo/);
 assert.match(portrait,/souls-portrait-face/);
 assert.match(portrait,/stageToObjectPoint\(/);
 assert.match(portrait,/applyGesture\(/);
 assert.match(portrait,/onPointerDown=\{down\} onPointerMove=\{drag\}/);
 assert.match(controls,/min=\{-175\} max=\{175\} step=\{5\}/);
 assert.match(controls,/min=\{\.5\} max=\{2\.8\} step=\{\.05\}/);
 assert.match(controls,/SoulNumberStepper/);
 assert.doesNotMatch(controls,/type="range"/);
 assert.match(css,/@keyframes souls-object-breathe/);
 assert.match(css,/@keyframes souls-object-talk/);
 assert.match(css,/@keyframes souls-object-happy/);
 assert.match(css,/@keyframes souls-object-surprise/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test("cutout progress is visible and save remains independent of model success",()=>{
 const page=read("web-spa/src/souls/SoulsPage.tsx");
 const cut=read("web-spa/src/souls/soulCutout.ts");
 assert.match(cut,/export type CutoutProgress="loading"\|"segmenting"\|"compositing"/);
 assert.match(cut,/onProgress\?\.\("segmenting"\)/);
 assert.match(page,/setCutoutPhase\(phase\)/);
 assert.match(page,/第一次需要下載與初始化/);
 assert.match(page,/cutout:useCutout&&cutoutDraft\?cutoutDraft:undefined/);
 assert.match(page,/await save\(s\)/);
});
