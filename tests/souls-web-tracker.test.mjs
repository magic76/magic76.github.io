import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
import {
  normalizeDetection, newTracker, lockTarget, updateTracker,
  matchTarget, coverRect, intersectionOverUnion,hitRect
} from "../web-spa/public/souls-vision-lab/tracking.mjs";
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"..");
const base="web-spa/public/souls-vision-lab/";
const source=name=>readFileSync(resolve(root,base+name),"utf8");
const box=(x,y,w,h)=>({x,y,width:w,height:h});
const detected=(label,x,y,w=120,h=120)=>({label,score:.9,box:box(x,y,w,h)});

test("detector normalizes valid MediaPipe bounding boxes",()=>{
 const actual=normalizeDetection({boundingBox:{originX:20,originY:30,width:100,height:150},
   categories:[{categoryName:"cup",score:.89}]},640,480);
 assert.deepEqual(actual,{label:"cup",score:.89,box:box(20,30,100,150)});
 assert.equal(normalizeDetection({boundingBox:{originX:20,originY:30,width:0,height:150}},640,480),null);
 assert.equal(normalizeDetection(null,640,480),null);
});

test("CSS object-fit cover mapping retains cropping offsets",()=>{
 // 640x480 becomes 200x300 via scale=.625 and crops 100px from each side.
 const p=coverRect(box(100,100,160,180),640,480,200,300);
 assert.deepEqual(p,{x:-37.5,y:62.5,width:100,height:112.5});
 assert.equal(hitRect(p,0,100),true);
 assert.equal(hitRect(p,200,100),false);
});

test("IoU is safe for disjoint or identical rectangles",()=>{
 assert.equal(intersectionOverUnion(box(10,10,30,30),box(10,10,30,30)),1);
 assert.equal(intersectionOverUnion(box(10,10,30,30),box(50,50,30,30)),0);
});

test("a moving cup keeps the selected target under small coherent displacement",()=>{
 const first=detected("cup",120,90);
 let t=lockTarget(newTracker(),first,1000);
 t=updateTracker(t,[detected("cup",136,100)],1240,640,480);
 assert.equal(t.state,"tracking");
 assert.equal(t.target.box.x,136);
 assert.equal(t.seen,2);
});

test("never replace the chosen cup with a distant cup or teddy bear",()=>{
 let t=lockTarget(newTracker(),detected("cup",60,60),1000);
 const unrelated=[detected("cup",450,300),detected("teddy bear",62,60)];
 assert.equal(matchTarget(t.target,unrelated,640,480),null);
 t=updateTracker(t,unrelated,1300,640,480);
 assert.equal(t.state,"occluded");
 assert.equal(t.target.box.x,60);
 t=updateTracker(t,unrelated,1500,640,480);
 t=updateTracker(t,unrelated,2700,640,480);
 assert.equal(t.state,"lost");
 assert.equal(t.lossCount,1);
});

test("temporary empty inference results do not lose a previously visible item",()=>{
 let t=lockTarget(newTracker(),detected("cup",100,100),1000);
 t=updateTracker(t,[],1170,640,480);
 assert.equal(t.state,"occluded");
 t=updateTracker(t,[detected("cup",108,100)],1330,640,480);
 assert.equal(t.state,"tracking");
 assert.equal(t.missed,0);
});

test("ambiguous two identical nearby objects do not force a target swap",()=>{
 const origin=detected("cup",110,100,100,90);
 const a=detected("cup",106,100,100,90);
 const b=detected("cup",114,100,100,90);
 assert.equal(matchTarget({label:"cup",box:origin.box},[a,b],640,480),null);
});

test("model exceptions are not considered evidence of a missing object",()=>{
 const app=source("app.mjs");
 assert.match(app,/const result=detector\.detectForVideo\(video,Math\.round\(now\)\)/);
 assert.match(app,/catch\(error\)\{\s*\/\/ An inference exception is not evidence/);
 assert.match(app,/if\(errors>2\)/);
 assert.match(app,/stopCamera\(false\)/);
});

test("standalone experiment remains private, unlinked, and independent of Gemini",()=>{
 const html=source("index.html"),app=source("app.mjs"),css=source("style.css");
 assert.match(html,/name="robots" content="noindex,nofollow"/);
 assert.match(html,/src="\.\/app\.mjs"/);
 assert.match(app,/getUserMedia\(\{audio:false/);
 assert.match(app,/vision_bundle\.mjs/);
 assert.match(app,/efficientdet_lite0/);
 assert.match(css,/\.stage video\{object-fit:cover\}/);
 assert.doesNotMatch(app,/fetch\(.+(frame|video|blob)/i);
 assert.doesNotMatch(app,/GeminiLive|useLiveSession|SoulChat/);
});
