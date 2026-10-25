const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {stripTypeScriptTypes}=require("node:module");
const source=fs.readFileSync("web-spa/src/magic/magicDragonMotion.ts","utf8");
const stripped=stripTypeScriptTypes(source,{mode:"strip"});
const compiled=stripped.replace(/\bexport\s+(?=(?:function|const|class)\b)/g,"")+"\nmodule.exports={magicDragonFlightPose};";
const mod={exports:{}};new Function("module","exports",compiled)(mod,mod.exports);
const {magicDragonFlightPose}=mod.exports;

test("dragon flight pose is static when animation is disabled",()=>{
 assert.deepEqual(magicDragonFlightPose(8,0),{bodyY:0,bodyPitch:0,neckPitch:0,neckYaw:0,wingPitch:[0,0],wingRoll:[0,0],tailYaw:0,tailPitch:0});
});

test("dragon flight pose stays bounded and mirrors wing roll",()=>{
 for(let t=0;t<12;t+=.17){
  const p=magicDragonFlightPose(t,1);
  assert.ok(Math.abs(p.bodyY)<=.061);
  assert.ok(Math.abs(p.bodyPitch)<=.091);
  assert.ok(Math.abs(p.neckPitch)<=.116);
  assert.ok(Math.abs(p.neckYaw)<=.056);
  assert.ok(Math.abs(p.tailYaw)<=.141);
  assert.ok(Math.abs(p.tailPitch)<=.101);
  assert.ok(Math.abs(p.wingRoll[0]+p.wingRoll[1])<1e-9);
  assert.ok(Math.abs(p.wingRoll[0])<=.601);
 }
});

test("dragon flight pose clamps unsafe motion scales",()=>{
 assert.deepEqual(magicDragonFlightPose(2,-4),magicDragonFlightPose(2,0));
 assert.deepEqual(magicDragonFlightPose(2,99),magicDragonFlightPose(2,1));
 assert.deepEqual(magicDragonFlightPose(2,Number.NaN),magicDragonFlightPose(2,0));
});
