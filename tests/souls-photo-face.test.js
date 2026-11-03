const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const source=fs.readFileSync(path.resolve(__dirname,"../web-spa/src/souls/soulFace.ts"),"utf8");
const compiled=stripTypeScriptTypes(source,{mode:"strip"})
 .replace(/\bexport\s+const\s+/g,"const ")
 .replace(/\bexport\s+function\s+/g,"function ");
const moduleContainer={exports:{}};
new Function("module",compiled+"\nmodule.exports={DEFAULT_FACE,safeFace,faceFromAlpha};")(moduleContainer);
const {DEFAULT_FACE,safeFace,faceFromAlpha}=moduleContainer.exports;

function alphaRect(width,height,x,y,right,bottom){
 const pixels=new Uint8ClampedArray(width*height*4);
 for(let py=y;py<bottom;py++)for(let px=x;px<right;px++)pixels[(py*width+px)*4+3]=255;
 return pixels;
}

test("legacy Soul without face metadata defaults to centered eyes",()=>{
 assert.deepEqual(safeFace(undefined),DEFAULT_FACE);
 assert.deepEqual(safeFace(null),DEFAULT_FACE);
});
test("face movement is bounded and malicious/invalid stored numbers cannot escape image",()=>{
 assert.deepEqual(safeFace({x:-999,y:1e6,scale:200}),{x:.10,y:.90,scale:1.65});
 assert.deepEqual(safeFace({x:NaN,y:Infinity,scale:-Infinity}),{x:.10,y:.10,scale:.55});
});
test("foreground alpha bounds place face on real object, not random background",()=>{
 const p=alphaRect(200,200,60,30,140,170);
 const face=faceFromAlpha(p,200,200);
 assert.ok(Math.abs(face.x-.50)<.02);
 assert.ok(face.y>.30&&face.y<.55);
 assert.ok(face.scale>=.55&&face.scale<=1.65);
});
test("small narrow foreground still receives a usable face",()=>{
 const f=faceFromAlpha(alphaRect(160,160,58,15,97,155),160,160);
 assert.ok(Math.abs(f.x-.48)<.04);
 assert.ok(f.y<.55);
 assert.ok(f.scale>=.55&&f.scale<=1.35);
});
test("empty, fully opaque and corrupt segmentation masks fall back safely",()=>{
 assert.deepEqual(faceFromAlpha(new Uint8ClampedArray(80*80*4),80,80),DEFAULT_FACE);
 assert.deepEqual(faceFromAlpha(alphaRect(80,80,0,0,80,80),80,80),DEFAULT_FACE);
 assert.deepEqual(faceFromAlpha(new Uint8ClampedArray(5),80,80),DEFAULT_FACE);
});
