import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import vm from "node:vm";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=(name)=>readFileSync(path.join(root,name),"utf8");
const html=read("web-spa/public/neon-swarm-lab/index.html");
const source=read("web-spa/public/neon-swarm-lab/hero-sprites.js");
const sandbox={window:{}};
vm.runInNewContext(source,sandbox,{timeout:5000});
const sheets=sandbox.window.CREW_NEON_SPRITES;

test("Each cleaned sprite atlas has the proper WebP signature and 28 complete frames",()=>{
 const counts={idle:4,run:8,dash:4,hit:4,death:4,victory:4};
 assert.deepEqual(Object.keys(sheets).sort(),Object.keys(counts).sort());
 for(const [state,frames] of Object.entries(counts)){
  const a=sheets[state];
  assert.equal(a.frames,frames,state);
  assert.equal(a.cols*a.rows,frames,state);
  assert.equal(a.w,208,state);
  assert.equal(a.h,184,state);
  assert.equal(a.baseline,157,state);
  assert.match(a.src,/^data:image\/webp;base64,/);
  const bytes=Buffer.from(a.src.split(",")[1],"base64");
  assert.ok(bytes.length>10000 && bytes.length<100000,state);
  assert.equal(bytes.toString("ascii",0,4),"RIFF");
  assert.equal(bytes.toString("ascii",8,12),"WEBP");
 }
 assert.ok(source.length<400_000,"Preprocessed WebP is small enough for mobile");
});

test("Game uses fixed frame size and grounded baseline: no per-frame character zoom",()=>{
 assert.match(html,/<script src="\/neon-swarm-lab\/hero-sprites\.js"><\/script>/);
 assert.match(html,/const CREW_FRAME_W=208,CREW_FRAME_H=184/);
 assert.match(html,/function heroAtlasState\(p,action\)/);
 assert.match(html,/function heroAtlasFrame\(state,p\)/);
 assert.match(html,/function drawHeroAtlas\(p,alpha=1,echo=false,forceState=null\)/);
 assert.match(html,/ctx\.drawImage\(image,sx,sy,CREW_FRAME_W,CREW_FRAME_H,-CREW_FRAME_W\/2,34-spec\.baseline,CREW_FRAME_W,CREW_FRAME_H\)/);
 assert.match(html,/if\(!item\?\.image\.complete\|\|!item\.image\.naturalWidth\)/);
 assert.match(html,/function drawHero\(p\)[\s\S]+?drawHeroAtlas\(p\)/);
 assert.match(html,/heroAtlasState\(p,animationAction\(p\)\)/);
 assert.doesNotMatch(html,/fetch\(["']https?:\/\//);
});

test("Lab remains self-contained and does not change gameplay or Zoe privacy semantics",()=>{
 assert.match(html,/function spawnBoss\(\)/);
 assert.match(html,/function choose\(v\)/);
 assert.match(html,/function shoot\(\)/);
 assert.match(html,/DEMO/);
 assert.match(html,/noindex, nofollow/);
 assert.match(html,/id="start"/);
 assert.match(html,/id="game"/);
});
