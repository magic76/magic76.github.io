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
const {ringStep,ringPoint,ringPolar,groupRingTargets,islandSurfaceHeight,creationGroundClearance,magicPartPivot}=load("../web-spa/src/magic/magicNavigation.ts",["ringStep","ringPoint","ringPolar","groupRingTargets","islandSurfaceHeight","creationGroundClearance","magicPartPivot"]);
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

test("curved island surface and AI part bounds keep creations out of ground",()=>{
 const samples=[[0,0],[6.9,0],[0,7.4],[11.1,1],[-9.4,-3.2]];
 const variants=[
  [{shape:"sphere",y:0,size:1.65}],
  [{shape:"capsule",y:.15,size:1.65,joint:"hinge"}],
  [{shape:"leaf",y:.1,size:1.65,joint:"flap"}],
  [{shape:"torus",y:0,size:1.65}],
  [{shape:"box",y:2.2,size:.5},{shape:"octahedron",y:0,size:1.65}],
 ];
 for(const [x,z] of samples){
  const ground=islandSurfaceHeight(x,z);
  assert.ok(ground>.9&&ground<1.6);
  for(const parts of variants){
   const offset=creationGroundClearance(parts);
   const lowest=Math.min(...parts.map(p=>p.y-p.size*
    (p.joint?.89:p.shape==="sphere"?.63:p.shape==="capsule"?.76:
    p.shape==="torus"?.71:p.shape==="octahedron"?.65:.5)));
   assert.ok(ground+offset+lowest>=ground+.19,
    "object must not clip into curved island surface");
  }
 }
 assert.equal(creationGroundClearance([]),.2);
});

test("AI sculptures and island residents share one terrain-height source",()=>{
 const scene=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicScene3D.tsx"),"utf8");
 const creations=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicCreations3D.tsx"),"utf8");
 const wonders=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicWonders3D.tsx"),"utf8");
 assert.match(scene,/islandSurfaceHeight\(next\[0\],next\[1\]\)/);
 assert.match(scene,/islandSurfaceHeight\(x,z\)\+\.08/);
 assert.match(scene,/islandSurfaceHeight\(0,-\.55\)\+\.34/);
 assert.match(creations,/islandSurfaceHeight\(desiredX,desiredZ\)\+groundClearance/);
 assert.match(creations,/creation\.assembly==="stack"\?part\.y\+3/);
 assert.match(wonders,/restingY=islandSurfaceHeight\(anchor\[0\],anchor\[1\]\)/);
 assert.match(creations,/<RoundedBox args=/);
 assert.match(creations,/<capsuleGeometry args=/);
 assert.match(creations,/part\.shape==="leaf"/);
});

test("creator pivot anchors follow scale, primitive extent and part yaw",()=>{
 assert.deepEqual(magicPartPivot({shape:"box"}),[0,0,0],"legacy parts remain centered");
 const shoulder=magicPartPivot({shape:"capsule",pivot:"top",height:1.5});
 assert.ok(Math.abs(shoulder[1]-1.14)<1e-12,"shoulder top remains at capsule cap");
 assert.equal(shoulder[0],0);
 assert.equal(shoulder[2],0);
 assert.deepEqual(magicPartPivot({shape:"box",pivot:"bottom",height:2}),[0,-1,0]);
 const wing=magicPartPivot({shape:"leaf",pivot:"right",width:1.5,yaw:90});
 assert.ok(Math.abs(wing[0])<1e-12);
 assert.ok(Math.abs(wing[2]+1.32)<1e-12);
 const left=magicPartPivot({shape:"leaf",pivot:"left",width:1.5,yaw:90});
 assert.ok(Math.abs(left[2]-1.32)<1e-12);
 const top=magicPartPivot({shape:"capsule",pivot:"top",height:1.2});
 const center=1.4,pivotWorld=center+top[1]*.65;
 const originalCenter=pivotWorld-top[1]*.65;
 assert.ok(Math.abs(originalCenter-center)<1e-12,"unrotated part stays centered on AI XYZ");
 // A 0.6 rad hinge rotates the limb's center, NOT its anchor.
 const movedCenter=pivotWorld-top[1]*.65*Math.cos(.6);
 assert.ok(movedCenter>center+.06,"limb center swings around fixed shoulder/hip anchor");
});
test("side-pivot wings receive conservative curved-island ground clearance",()=>{
 const wing={shape:"leaf",y:.04,size:1.65,width:2.2,height:.65,joint:"flap",pivot:"left"};
 const normal=creationGroundClearance([{...wing,pivot:"center"}]);
 const lateral=creationGroundClearance([wing]);
 assert.ok(lateral>normal+.7, "flapping wing edge has space to sweep down");
 const renderer=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicCreations3D.tsx"),"utf8");
 assert.match(renderer,/const pivots=useMemo\(\(\)=>creation\.parts\.map\(magicPartPivot\)/);
 assert.match(renderer,/\+pivot\[1\]\*size/);
 assert.match(renderer,/position=\{\[-pivot\[0\],-pivot\[1\],-pivot\[2\]\]\}/);
 assert.match(renderer,/linkDirection\.subVectors\(to\.position,from\.position\)/);
});
