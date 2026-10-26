const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const strip=f=>stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/"+f),"utf8"),{mode:"strip"})
 .replace(/\bexport\s+(?=(?:function|const|class)\b)/g,"");
const layout=new Function(strip("magicLayout.ts")+";return {MAGIC_TREES,MAGIC_DISTRICTS,MAGIC_CREATION_SLOTS,assignMagicCreationSites,magicCreationSites}")();
const world=new Function(strip("world.ts")+";return {MAGIC_MAX_CREATIONS,safeMagicAnchor}")();
const {MAGIC_TREES,MAGIC_DISTRICTS,MAGIC_CREATION_SLOTS,assignMagicCreationSites,magicCreationSites}=layout;
const S=Math.sqrt(10);
const plots=[[-3.25,-.5],[3.15,-.7],[-2.7,2.65],[2.7,2.55],[-4,.8],[3.95,.95]].map(([x,z])=>world.safeMagicAnchor(x/3.7,z/3.25));
const routes=[[[0,2.5],[0,5],[2.5,7.5],[5.7,8.2]],[[0,2.5],[-2,5.4],[-4.6,8]],[[0,2.5],[1.5,2.8],[5,2.1],[9.5,1.7]]];
const path3=routes.flatMap(r=>r.slice(1).flatMap((b,k)=>Array.from({length:10},(_,i)=>[r[k][0]+(b[0]-r[k][0])*i/10,r[k][1]+(b[1]-r[k][1])*i/10])));

test("there is a creation site for every allowed creation",()=>{
 assert.ok(MAGIC_CREATION_SLOTS.length>=world.MAGIC_MAX_CREATIONS);
});
for(const [x,z] of MAGIC_CREATION_SLOTS)test(`creation site ${x},${z} is clear of scenery and on the island`,()=>{
 assert.ok(Math.hypot(x/17.87,z/15.01)<=.74,"inside the island top");
 assert.ok(Math.hypot(x,z+.55)>=3.6+1.45,"clear of the castle");
 for(const t of MAGIC_TREES)assert.ok(Math.hypot(x-t.x,z-t.z)-.88*t.scale>=1.45,"tree "+t.x.toFixed(1)+","+t.z.toFixed(1));
 for(const d of MAGIC_DISTRICTS)assert.ok(Math.hypot(x-d.x,z-d.z)-2.15>=1.45,"district "+d.id);
 for(const p of plots)assert.ok(Math.hypot(x-p[0],z-p[1])>=1.4+1.45,"resident plot");
 for(const p of path3)assert.ok(Math.hypot(x-p[0],z-p[1])>=1.4,"path");
 for(const [ox,oz] of MAGIC_CREATION_SLOTS)if(ox!==x||oz!==z)assert.ok(Math.hypot(x-ox,z-oz)>=3.4,"other site");
});
test("ten identical wishes still get ten distinct sites and earlier ones never move",()=>{
 const wanted=Array.from({length:10},()=>({x:8,z:2}));
 const sites=assignMagicCreationSites(wanted);
 assert.equal(new Set(sites.map(s=>s.join())).size,10);
 assert.deepEqual(assignMagicCreationSites(wanted.slice(0,4)),sites.slice(0,4));
 for(let i=0;i<10;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(sites[i][0]-sites[j][0],sites[i][1]-sites[j][1])>=3.4);
});
test("friends stand at the free site nearest their owner",()=>{
 const creations=[{id:1,x:.9,z:0},{id:2,x:-.9,z:0},{id:3,x:-.9,z:0,friendOf:1}];
 const sites=magicCreationSites(creations,world.safeMagicAnchor);
 const owner=sites.get(1),friend=sites.get(3);
 const others=MAGIC_CREATION_SLOTS.filter(s=>s.join()!==owner.join()&&s.join()!==sites.get(2).join());
 const nearest=Math.min(...others.map(s=>Math.hypot(s[0]-owner[0],s[1]-owner[1])));
 assert.equal(Math.hypot(friend[0]-owner[0],friend[1]-owner[1]),nearest);
});
test("assembly and arrival ages survive the off-screen pause (R3F resets clock.elapsedTime)",()=>{
 for(const f of ["MagicCreations3D.tsx","MagicScene3D.tsx"]){
  const src=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/"+f),"utf8");
  assert.doesNotMatch(src,/clock\.elapsedTime-(started|arrival)\.current|\(time-arrival\.current\)/,f);
 }
});
test("creations render at their shared non-overlapping site",()=>{
 const scene=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicScene3D.tsx"),"utf8");
 const creations=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicCreations3D.tsx"),"utf8");
 assert.match(scene,/magicCreationSites\(world\.creations,safeMagicAnchor\)/);
 assert.match(creations,/magicCreationSites\(creations,safeMagicAnchor\)/);
});
