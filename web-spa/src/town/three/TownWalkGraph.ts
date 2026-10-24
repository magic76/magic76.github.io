import type {Waypoint} from "./world";

export type WalkNode={point:Waypoint;neighbors:ReadonlyArray<string>};
// Walkable sidewalk rings around buildings/stalls/houses (not through the models).
// Bridges connect all five districts; every segment is walked, never teleported.
const LOOPS:ReadonlyArray<ReadonlyArray<readonly [string,number,number]>>=[
 [["c0",-10,-8],["c1",0,-8],["c2",10,-8],["c3",10,-1],["c4",10,9],["c5",0,9],["c6",-10,9],["c7",-10,-1]],
 [["m0",-16,-19],["m1",-21,-17],["m2",-23,-12],["m3",-21,-7],["m4",-16,-5],["m5",-11,-7],["m6",-9,-12],["m7",-11,-17]],
 [["g0",16,-19],["g1",21,-17],["g2",23,-12],["g3",21,-7],["g4",16,-5],["g5",11,-7],["g6",9,-12],["g7",11,-17]],
 [["h0",-16,5],["h1",-11,7],["h2",-9,12],["h3",-11,17],["h4",-16,19],["h5",-21,17],["h6",-23,12],["h7",-21,7]],
 [["b0",16,5],["b1",21,7],["b2",23,12],["b3",21,17],["b4",16,19],["b5",11,17],["b6",9,12],["b7",11,7]]
];
const BRIDGES:ReadonlyArray<readonly [string,string]>=[
 ["c0","m5"],["c2","g5"],["c6","h1"],["c4","b7"],
 ["c7","m4"],["c3","g4"],["h0","m4"],["b0","g4"],
 ["c5","h2"],["c5","b6"]
];
function makeWalkGraph():Readonly<Record<string,WalkNode>>{
 const nodes:Record<string,{point:Waypoint;neighbors:string[]}>={};
 for(const ring of LOOPS){
  for(const [id,x,z] of ring)nodes[id]={point:[x,z],neighbors:[]};
  for(let i=0;i<ring.length;i++){
   const from=ring[i][0],to=ring[(i+1)%ring.length][0];
   nodes[from].neighbors.push(to);nodes[to].neighbors.push(from);
  }
 }
 for(const [from,to] of BRIDGES){
  if(!nodes[from]||!nodes[to])throw Error("Unknown walk graph node");
  nodes[from].neighbors.push(to);nodes[to].neighbors.push(from);
 }
 return nodes;
}
export const WALK_GRAPH=makeWalkGraph();
export function nextSeed(value:number):number{
 let x=value>>>0;
 x^=x<<13;x^=x>>>17;x^=x<<5;
 return x>>>0||0x9e3779b9;
}
export function chooseNextWalkNode(current:string,previous:string|null,seed:number):string{
 const neighbors=WALK_GRAPH[current]?.neighbors;
 if(!neighbors?.length)throw Error("No walk path from "+current);
 const forward=neighbors.filter(id=>id!==previous);
 const candidates=forward.length?forward:neighbors;
 return candidates[Math.min(candidates.length-1,Math.floor((seed/0x100000000)*candidates.length))];
}
export function seedForFriend(id:string):number{
 let seed=2166136261;
 for(let i=0;i<id.length;i++)seed=Math.imul(seed^id.charCodeAt(i),16777619);
 return seed>>>0||1;
}
