const assert=require("node:assert/strict");
const {test}=require("node:test");
const fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.join(__dirname,"..","web-spa","src","town","three");
const memo=new Map();
function load(name){
 if(memo.has(name))return memo.get(name).exports;
 const source=fs.readFileSync(path.join(root,name+".ts"),"utf8");
 const output=ts.transpileModule(source,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS
 }}).outputText;
 const item={exports:{}};memo.set(name,item);
 new Function("require","exports","module",output)((spec)=>{
  if(!spec.startsWith("./"))throw Error("Unexpected test dependency "+spec);
  return load(spec.slice(2));
 },item.exports,item);
 return item.exports;
}
const {PEOPLE}=load("world"),{WALK_GRAPH,nextSeed,chooseNextWalkNode,seedForFriend}=load("TownWalkGraph");
const nav=load("TownNavigation"),{advanceWithAvoidance}=load("TownTraffic");

test("The island perimeter surrounds all five districts and every spawn",()=>{
 assert.equal(PEOPLE.length,16);
 assert.equal(new Set(PEOPLE.map(p=>p.startNode)).size,16);
 for(const p of PEOPLE){
  const point=WALK_GRAPH[p.startNode]?.point;
  assert.ok(point,p.id+" missing spawn");
  assert.ok(nav.insideLand(point[0],point[1],nav.PERSON_RADIUS),p.id+" spawns outside island");
  assert.ok(nav.isWalkable(point[0],point[1]),p.id+" spawns inside obstacle");
 }
 const outer=Array.from({length:120},(_,i)=>nav.coastPoint(i*2*Math.PI/120));
 assert.ok(outer.every(p=>Number.isFinite(p[0])&&Number.isFinite(p[1])));
 assert.ok(outer.some(p=>p[0]>25)&&outer.some(p=>p[0]<-25));
 assert.ok(outer.some(p=>p[1]>21)&&outer.some(p=>p[1]<-21));
});
test("Every defined pedestrian graph segment avoids buildings, pond, trees and shoreline",()=>{
 const unique=new Set();
 for(const [id,node] of Object.entries(WALK_GRAPH)){
  for(const other of node.neighbors){
   assert.ok(WALK_GRAPH[other],id+" points at missing node "+other);
   const key=[id,other].sort().join("/");
   if(unique.has(key))continue;unique.add(key);
   const end=WALK_GRAPH[other].point;
   assert.ok(nav.segmentIsWalkable(node.point[0],node.point[1],end[0],end[1]),
    key+" intersects an obstacle or leaves the island");
  }
 }
 assert.equal(unique.size,50);
});
test("All sixteen residents maintain personal space with collision-aware step resolution",()=>{
 const traffic=new Map(PEOPLE.map(p=>[p.id,{x:WALK_GRAPH[p.startNode].point[0],z:WALK_GRAPH[p.startNode].point[1]}]));
 const agents=PEOPLE.map(p=>({id:p.id,node:p.startNode,previous:null,next:null,seed:seedForFriend(p.id)}));
 let moved=0;
 for(let tick=0;tick<1800;tick++){
  for(const resident of agents){
   const here=traffic.get(resident.id);
   if(!resident.next){
    resident.seed=nextSeed(resident.seed);
    resident.next=chooseNextWalkNode(resident.node,resident.previous,resident.seed);
   }
   const destination=WALK_GRAPH[resident.next].point;
   const result=advanceWithAvoidance(resident.id,here.x,here.z,destination[0],destination[1],.07,traffic);
   if(result.moved) moved++;
   here.x=result.x;here.z=result.z;
   if(Math.hypot(here.x-destination[0],here.z-destination[1])<.07){
    here.x=destination[0];here.z=destination[1];
    resident.previous=resident.node;resident.node=resident.next;resident.next=null;
   }
   assert.ok(nav.isWalkable(here.x,here.z),resident.id+" walked into static scenery");
   for(const [otherId,other] of traffic){
    if(otherId===resident.id)continue;
    assert.ok(Math.hypot(here.x-other.x,here.z-other.z)>=nav.MIN_FRIEND_DISTANCE-1e-7,
     resident.id+" overlapped "+otherId+" at tick "+tick);
   }
  }
 }
 assert.ok(moved>5000,"residents stopped exploring");
});
test("Head-on residents can turn without interpenetrating",()=>{
 const traffic=new Map([
  ["zoe",{x:-2,z:0}],["noah",{x:2,z:0}]
 ]);
 let total=0,minDistance=Infinity;
 for(let tick=0;tick<220;tick++){
  for(const [id,toX] of [["zoe",2],["noah",-2]]){
   const pos=traffic.get(id);
   const next=advanceWithAvoidance(id,pos.x,pos.z,toX,0,.09,traffic);
   pos.x=next.x;pos.z=next.z;total+=next.moved;
   minDistance=Math.min(minDistance,Math.hypot(
    traffic.get("zoe").x-traffic.get("noah").x,
    traffic.get("zoe").z-traffic.get("noah").z));
  }
 }
 assert.ok(minDistance>=nav.MIN_FRIEND_DISTANCE-1e-7);
 assert.ok(total>3.8,"head-on pair needs meaningful progress");
});
