import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const source=readFileSync(path.join(root,"web-spa/public/neon-swarm-lab/index.html"),"utf8");
const a=source.indexOf("const LEG_STEP="),b=source.indexOf("function taperedLimb(",a);
assert.ok(a>=0&&b>a,"Grounded IK helpers exist");
const {footTrajectory,legIK}=new Function("TAU",source.slice(a,b)+"\nreturn {footTrajectory,legIK};")(Math.PI*2);

test("runner phases have contact, down, passing and up with ground-fixed stance",()=>{
 for(const [phase,name] of [[0,"contact"],[.2,"down"],[.47,"passing"],[.77,"up"]]){
  const pose=footTrajectory(phase*Math.PI*2,1,true,"run",0);
  assert.equal(pose.beat,name);
  assert.equal(pose.planted,phase<.58);
  if(pose.planted)assert.equal(pose.y,41);
  else assert.ok(pose.y<41);
 }
});
test("left and right step cycles alternate, body bounce does not move grounded soles",()=>{
 assert.equal(footTrajectory(.1*Math.PI*2,1,false,"run").planted,true);
 assert.equal(footTrajectory(.6*Math.PI*2,1,true,"run").planted,false);
 for(const bob of [-3,-1,0,2,4])assert.equal(footTrajectory(.17*Math.PI*2,1,true,"run",bob).y-bob,41);
});
test("two-segment IK is finite and stable through complete running cycle",()=>{
 for(let phase=0;phase<1;phase+=.025){
  for(const front of [false,true]){
   const hipX=front?7:-9,hipY=front?13:12;
   const foot=footTrajectory(phase*Math.PI*2,1,front,"run");
   const ik=legIK(hipX,hipY,foot.x,foot.y-3,front);
   assert.ok([ik.kneeX,ik.kneeY,ik.ankleX,ik.ankleY].every(Number.isFinite));
   assert.ok(Math.abs(Math.hypot(ik.kneeX-hipX,ik.kneeY-hipY)-ik.thigh)<1e-8);
   assert.ok(ik.reachable<=ik.thigh+ik.calf);
  }
 }
});
test("dash/hit/death/victory use distinct leg poses; all stay finite",()=>{
 const poses=["run","dash","hit","death","victory"].map(type=>footTrajectory(0,1,true,type));
 assert.equal(new Set(poses.map(p=>p.x.toFixed(2)+":"+p.y.toFixed(2)+":"+p.roll.toFixed(2))).size,5);
 assert.ok(poses.every(p=>[p.x,p.y,p.roll].every(Number.isFinite)));
});
test("fixed leg cutout removed; shots recoil torso but not foot placement; no network imports",()=>{
 assert.match(source,/heroUpper\.src='data:image\/webp;base64/);
 assert.match(source,/function taperedLimb\(/);
 assert.match(source,/ctx\.translate\(0,-lift\)/);
 assert.match(source,/function drawMotionLeg\(/);
 assert.doesNotMatch(source,/const fullGait=dash\?1\.05:swing/);
 assert.doesNotMatch(source,/<script[^>]+src=/);
 assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|WebSocket\(/);
});
