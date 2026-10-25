const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
function load(file,names){
 const raw=fs.readFileSync(path.join(__dirname,file),"utf8");
 const code=stripTypeScriptTypes(raw,{mode:"strip"}).replace(/\bexport\s+(?=(?:function|const|class)\b)/g,"");
 const module={exports:{}};
 new Function("module","exports",code+"\nmodule.exports={"+names.join(",")+"};")(module,module.exports);
 return module.exports;
}
const {ringStep,ringPoint,ringPolar,groupRingTargets}=load("../web-spa/src/magic/magicNavigation.ts",["ringStep","ringPoint","ringPolar","groupRingTargets"]);
const {MAGIC_INITIAL_WORLD,applyMagicCommand,readMagicWorldSnapshot}=load("../web-spa/src/magic/world.ts",["MAGIC_INITIAL_WORLD","applyMagicCommand","readMagicWorldSnapshot"]);
test("roaming route stays on the castle-safe annulus",()=>{
 let current=ringPoint(-1.7,.78),target=ringPoint(1.7,.82);
 for(let i=0;i<1100;i++){
  current=ringStep(current,target,.06);
  const {radius}=ringPolar(current);
  assert.ok(radius>=.60&&radius<=.93);
 }
 assert.ok(Math.hypot(current[0]-target[0],current[1]-target[1])<.1);
});
test("roaming step never advances into another resident",()=>{
 const from=ringPoint(-1,.76),target=ringPoint(-.2,.76);
 const ahead=ringPoint(-.98,.76);
 const next=ringStep(from,target,.08,[ahead]);
 const currentGap=Math.hypot(from[0]-ahead[0],from[1]-ahead[1]);
 const nextGap=Math.hypot(next[0]-ahead[0],next[1]-ahead[1]);
 assert.ok(nextGap>=.78||nextGap>currentGap);
});
test("group routing assigns distinct persistent destinations",()=>{
 let state=MAGIC_INITIAL_WORLD;
 for(const kind of ["fox","owl","dragon"]){
  const result=applyMagicCommand(state,"summon_object",{kind});
  assert.equal(result.ok,true);
  state=result.world;
 }
 const gathered=applyMagicCommand(state,"move_creatures",{x:.8,z:.1},"en");
 assert.equal(gathered.ok,true);
 assert.equal(gathered.event,"creature-group-moved");
 const points=gathered.world.objects.map(o=>[o.x*3.7*Math.sqrt(10),o.z*3.25*Math.sqrt(10)]);
 for(let i=0;i<points.length;i++){
  for(let j=i+1;j<points.length;j++){
   assert.ok(Math.hypot(points[i][0]-points[j][0],points[i][1]-points[j][1])>=1.04);
  }
 }
 const loaded=readMagicWorldSnapshot(JSON.stringify(gathered.world));
 assert.deepEqual(loaded.objects,gathered.world.objects);
});
test("group commands reject unbounded coordinates and invalid selections",()=>{
 let state=MAGIC_INITIAL_WORLD;
 state=applyMagicCommand(state,"summon_object",{kind:"fox"}).world;
 for(const args of [{x:2,z:0},{x:0,z:NaN},{x:0,z:0,kinds:["evil"]},{x:0,z:0,kinds:[]}]){
  const r=applyMagicCommand(state,"move_creatures",args);
  assert.equal(r.ok,false);
  assert.equal(r.world,state);
 }
 assert.equal(applyMagicCommand(state,"move_creatures",{x:.8,z:.4,kinds:["dragon"]}).ok,false);
});
test("formation targets respect other objects",()=>{
 const obstacles=[ringPoint(0,.76)];
 const result=groupRingTargets(ringPoint(0,.76),3,obstacles);
 assert.ok(result);
 for(const point of result)assert.ok(Math.hypot(point[0]-obstacles[0][0],point[1]-obstacles[0][1])>=1.02);
});
