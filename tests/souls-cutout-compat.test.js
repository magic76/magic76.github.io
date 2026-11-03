const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const bridge=fs.readFileSync(path.join(root,"web-spa/src/souls/soulCutoutCompat.ts"),"utf8");
const cutout=fs.readFileSync(path.join(root,"web-spa/src/souls/soulCutout.ts"),"utf8");
const page=fs.readFileSync(path.join(root,"web-spa/src/souls/SoulsPage.tsx"),"utf8");
const js=stripTypeScriptTypes(bridge,{mode:"strip"})
 .replace(/\bexport\s+const\s+/g,"const ")
 .replace(/\bexport\s+function\s+/g,"function ");
const loaded={exports:{}};
new Function("module",js+"\nmodule.exports={POSITIVE_BRUSH_MODE,resolveCutoutApi};")(loaded);
const {POSITIVE_BRUSH_MODE,resolveCutoutApi}=loaded.exports;

test("MediaPipe package-root exports work WITHOUT BrushMode (the observed regression)",async()=>{
 const segmenter={
  setImage:()=>{},
  segment:strokes=>({width:2,height:2,getAsFloat32Array:()=>new Float32Array(4),
   strokes})
 };
 const moduleExports={
  FilesetResolver:{forVisionTasks:async url=>({url})},
  InteractiveSegmenter:{createFromOptions:async()=>segmenter}
 };
 // The official @mediapipe/tasks-vision index exposes both constructors,
 // but does NOT expose the nested BrushMode enum.
 assert.equal("BrushMode" in moduleExports,false);
 const resolved=resolveCutoutApi(moduleExports);
 assert.equal(resolved.positive,1);
 assert.equal(POSITIVE_BRUSH_MODE,1);
 const files=await resolved.FilesetResolver.forVisionTasks("wasm");
 const loadedSegmenter=await resolved.InteractiveSegmenter.createFromOptions(files,{
  baseOptions:{modelAssetPath:"model.task",delegate:"CPU"}
 });
 assert.equal(loadedSegmenter,segmenter);
 const mask=loadedSegmenter.segment([{brushMode:resolved.positive,
  point:[{x:.5,y:.5}],isCompleted:true}]);
 assert.equal(mask.strokes[0].brushMode,1);
});

test("an SDK with missing required exports is rejected explicitly",()=>{
 assert.throws(()=>resolveCutoutApi({}),/InteractiveSegmenter API missing/);
 assert.throws(()=>resolveCutoutApi({FilesetResolver:{forVisionTasks:async()=>({})}}),/InteractiveSegmenter API missing/);
 assert.throws(()=>resolveCutoutApi({InteractiveSegmenter:{createFromOptions:async()=>({})}}),/InteractiveSegmenter API missing/);
 assert.throws(()=>resolveCutoutApi(null),/InteractiveSegmenter API missing/);
});

test("runCutout does not require a non-exported BrushMode symbol",()=>{
 assert.match(cutout,/resolveCutoutApi\(await import\(/);
 assert.match(cutout,/segmenter\.segment\(\[\{brushMode:1/);
 assert.doesNotMatch(cutout,/!mod\.BrushMode|mod\.BrushMode\.POSITIVE/);
 assert.match(cutout,/magic_touch\/int8\/1\/interactive_segmentation\.task/);
});

test("model failure and unsuitable mask are distinct, without blocking creation",()=>{
 assert.match(cutout,/export class CutoutError/);
 assert.match(cutout,/new CutoutError\("runtime"/);
 assert.match(cutout,/new CutoutError\("model"/);
 assert.match(cutout,/new CutoutError\("inference"/);
 assert.match(cutout,/new CutoutError\("selection"/);
 assert.match(page,/reason==="runtime"\|\|reason==="model"/);
 assert.match(page,/reason==="selection"/);
 assert.match(page,/reason==="inference"/);
 assert.match(page,/await save\(s\)/);
});
