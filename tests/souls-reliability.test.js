const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
function loadModule(relative,names){
 const source=fs.readFileSync(path.join(root,relative),"utf8");
 const js=stripTypeScriptTypes(source,{mode:"strip"})
  .replace(/\bexport\s+function\s+/g,"function ")
  .replace(/\bexport\s+const\s+/g,"const ");
 const mod={exports:{}};
 new Function("module",js+"\nmodule.exports={"+names.join(",")+"};")(mod);
 return mod.exports;
}
const {shouldAutoWake,isSafeAutomaticMemory}=loadModule("web-spa/src/souls/soulRecognition.ts",["shouldAutoWake","isSafeAutomaticMemory"]);
const {toGrayFrame,initRegionTracker,trackMultiFrame}=loadModule("web-spa/src/souls/soulTracker.ts",["toGrayFrame","initRegionTracker","trackMultiFrame"]);

test("identity: no automatic wake for missing embeddings, ambiguous candidates or different objects",()=>{
 const strong={score:.95,legacy:.96,cosine:.95,hasEmbedding:true,embeddingExpected:true};
 assert.equal(shouldAutoWake(strong,{score:.6}),true);
 assert.equal(shouldAutoWake(strong,{score:.91}),false,"near equal second candidate must require confirmation");
 assert.equal(shouldAutoWake({...strong,hasEmbedding:false,cosine:null},{score:.4}),false);
 assert.equal(shouldAutoWake({...strong,legacy:.70},{score:.2}),false);
 assert.equal(shouldAutoWake({...strong,cosine:.72},{score:.2}),false);
 assert.equal(shouldAutoWake({...strong,score:NaN},{score:.2}),false);
 const legacy={score:.97,legacy:.97,cosine:null,hasEmbedding:false,embeddingExpected:false};
 assert.equal(shouldAutoWake(legacy,{score:.7}),true,"old records must remain usable");
 assert.equal(shouldAutoWake({...legacy,legacy:.90},{score:.3}),false);
});

test("memory: private details are not automatically persisted; non-sensitive memories remain possible",()=>{
 assert.equal(isSafeAutomaticMemory("喜歡熱茶","我喜歡喝熱茶"),true);
 assert.equal(isSafeAutomaticMemory("Email: a@example.com","我的email是a@example.com"),false);
 assert.equal(isSafeAutomaticMemory("電話 0912345678","0912345678"),false);
 assert.equal(isSafeAutomaticMemory("我的住址在某某路","我住址在某某路"),false);
 assert.equal(isSafeAutomaticMemory("API token abc","secret key"),false);
 assert.equal(isSafeAutomaticMemory("https://example.com","分享網站"),false);
});

const width=180,height=140;
const shade=(x,y)=>Math.max(0,Math.min(255,Math.round(
  122+32*Math.sin(x*.28+y*.06)+29*Math.cos(x*.13-y*.24)+26*Math.sin(x*.09+y*.32)
)));
function syntheticFrame(dx=0,dy=0,scale=1,rotation=0){
 const pixels=new Uint8Array(width*height),sin=Math.sin(rotation),cos=Math.cos(rotation);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const px=x-89-dx,py=y-70-dy;
  const ox=(px*cos+py*sin)/scale+89,oy=(-px*sin+py*cos)/scale+70;
  pixels[y*width+x]=shade(ox,oy);
 }
 return {width,height,pixels};
}
test("region tracking: coherent translation carries face and bounding region",()=>{
 const initial=syntheticFrame();
 const roi={x:54/width,y:39/height,width:76/width,height:61/height};
 const tracker=initRegionTracker(initial,roi,{x:93/width,y:69/height});
 assert.ok(tracker,"textured object must initialize multi-anchor tracker");
 const shifted=trackMultiFrame(syntheticFrame(3,2),tracker);
 assert.ok(shifted,"coherent movement must remain trackable");
 assert.ok(Math.abs(shifted.point.x-(96/width))<.018);
 assert.ok(Math.abs(shifted.point.y-(71/height))<.018);
 assert.ok(shifted.box&&shifted.box.x>roi.x);
 assert.ok(shifted.box&&shifted.box.y>roi.y);
});
test("region tracking: significant similarity change does not silently produce a stale box",()=>{
 const initial=syntheticFrame();
 const roi={x:54/width,y:39/height,width:76/width,height:61/height};
 const tracker=initRegionTracker(initial,roi,{x:93/width,y:69/height});
 assert.ok(tracker);
 const small=trackMultiFrame(syntheticFrame(2,1,1.012,.018),tracker);
 // A geometric fit may reject complex appearance changes, which is safe.
 if(small){assert.ok(small.box);assert.ok(small.box.width>0&&small.box.height>0)}
 const blank={width,height,pixels:new Uint8Array(width*height)};
 assert.equal(trackMultiFrame(blank,tracker),null,"occluded object cannot continue a fake track");
});


test("mask-guided tracking never substitutes background-only seed points",()=>{
 const frame=syntheticFrame();
 const roi={x:54/width,y:39/height,width:76/width,height:61/height};
 const face={x:93/width,y:69/height};
 const background=[{x:.03,y:.03},{x:.92,y:.93},{x:.8,y:.03},{x:.03,y:.75}];
 assert.equal(initRegionTracker(frame,roi,face,background),null);
 const foreground=[
  {x:67/width,y:55/height},{x:81/width,y:56/height},
  {x:103/width,y:67/height},{x:115/width,y:77/height},
  {x:76/width,y:85/height}
 ];
 const tracker=initRegionTracker(frame,roi,face,foreground);
 assert.ok(tracker,"foreground textured points must initialize object tracker");
 assert.ok(tracker.anchors.length<=foreground.length);
 const moved=trackMultiFrame(syntheticFrame(2,1),tracker);
 assert.ok(moved,"tracked foreground points should survive small coherent motion");
});


const {componentFromAlpha}=loadModule("web-spa/src/souls/soulMaskComponent.ts",["componentFromAlpha"]);
function mockMask(width,height,rectangles){
 const pixels=new Uint8ClampedArray(width*height*4);
 for(const [left,top,right,bottom] of rectangles){
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
   pixels[(y*width+x)*4+3]=255;
  }
 }
 return pixels;
}
test("mask component ignores distant false-positive foreground pixels",()=>{
 const w=150,h=120;
 const pixels=mockMask(w,h,[[40,24,99,91],[0,0,3,3],[140,108,149,119]]);
 const component=componentFromAlpha(pixels,w,h,{x:.45,y:.46});
 assert.ok(component.left>=37&&component.left<=44);
 assert.ok(component.top>=21&&component.top<=27);
 assert.ok(component.right>=95&&component.right<=102);
 assert.ok(component.bottom>=87&&component.bottom<=93);
 assert.ok(component.anchors.length>3);
});
test("mask component selects only the object touched, not the other foreground object",()=>{
 const w=180,h=120;
 const pixels=mockMask(w,h,[[16,20,65,90],[108,25,164,95]]);
 const left=componentFromAlpha(pixels,w,h,{x:.2,y:.4});
 const right=componentFromAlpha(pixels,w,h,{x:.75,y:.4});
 assert.ok(left.right<85,"left object box must not expand to right object");
 assert.ok(right.left>100,"right object box must not expand to left object");
});
test("mask component refuses ungrounded empty or distant tap",()=>{
 const w=150,h=120;
 assert.throws(()=>componentFromAlpha(mockMask(w,h,[]),w,h,{x:.5,y:.5}));
 assert.throws(()=>componentFromAlpha(mockMask(w,h,[[5,5,30,30]]),w,h,{x:.8,y:.8}));
});
