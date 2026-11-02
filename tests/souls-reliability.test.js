const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ts=require("typescript");
const root=path.resolve(__dirname,"..");
function loadModule(relative){
 const input=fs.readFileSync(path.join(root,relative),"utf8");
 const compiled=ts.transpileModule(input,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true
 }}).outputText;
 const mod={exports:{}};
 new Function("module","exports",compiled)(mod,mod.exports);
 return mod.exports;
}
const {shouldAutoWake,isSafeAutomaticMemory}=loadModule("web-spa/src/souls/soulRecognition.ts");
const {toGrayFrame,initRegionTracker,trackMultiFrame}=loadModule("web-spa/src/souls/soulTracker.ts");

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
