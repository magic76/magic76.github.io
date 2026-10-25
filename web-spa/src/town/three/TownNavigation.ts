import {CENTER_TREES,EDGE_TREES,GROVE_TREE_SPOTS,MARKET_STALL_SPOTS,STORY_HOUSES,LANDMARKS,GROVE_CABIN,HARBOR_LIGHTHOUSE} from "./TownLayout";
export type Obstacle={x:number;z:number;r:number;id:string};
export const PERSON_RADIUS=.43;
export const MIN_FRIEND_DISTANCE=1.03;
export const ISLAND_RADIUS={x:26,z:22,power:6} as const;
export const GREEN_RADIUS={x:25,z:21,power:6} as const;
// A subtly wavy superellipse gives an unmistakable island edge without clipping street corners.
export function coastPoint(theta:number,inset=0):[number,number]{
 const cx=Math.cos(theta),cz=Math.sin(theta);
 const n=ISLAND_RADIUS.power;
 const d=Math.pow(Math.pow(Math.abs(cx),n)+Math.pow(Math.abs(cz),n),1/n);
 const wave=1+.009*Math.sin(theta*7+.3)+.006*Math.sin(theta*13-.5);
 return [(ISLAND_RADIUS.x-inset)*cx/d*wave,(ISLAND_RADIUS.z-inset)*cz/d*wave];
}
export function insideLand(x:number,z:number,margin=PERSON_RADIUS):boolean{
 const rx=GREEN_RADIUS.x-margin,rz=GREEN_RADIUS.z-margin;
 return Math.pow(Math.abs(x)/rx,6)+Math.pow(Math.abs(z-.5)/rz,6)<1;
}
const buildings:Obstacle[]=[
 {id:"cafe",x:LANDMARKS.cafe[0],z:LANDMARKS.cafe[1],r:2.12},
 {id:"studio",x:LANDMARKS.studio[0],z:LANDMARKS.studio[1],r:2.05},
 {id:"play",x:LANDMARKS.play[0],z:LANDMARKS.play[1],r:2.0},
 {id:"gazebo",x:LANDMARKS.gazebo[0],z:LANDMARKS.gazebo[1],r:1.46},
 {id:"center-pond",x:LANDMARKS.pond[0],z:LANDMARKS.pond[1],r:2.47},
 {id:"market-fountain",x:-16,z:-12,r:1.32},
 {id:"grove-cabin",x:GROVE_CABIN[0],z:GROVE_CABIN[1],r:1.98},
 {id:"harbor-water",x:16,z:12,r:5.55},
 {id:"harbor-lighthouse",x:HARBOR_LIGHTHOUSE[0],z:HARBOR_LIGHTHOUSE[1],r:.91},
 ...MARKET_STALL_SPOTS.map(([x,z],i)=>({id:"stall-"+i,x,z,r:1.25})),
 ...STORY_HOUSES.map(([x,z],i)=>({id:"house-"+i,x,z,r:1.8})),
 ...CENTER_TREES.map(([x,z,s],i)=>({id:"tree-"+i,x,z,r:s*.55})),
 ...EDGE_TREES.map(([x,z,s],i)=>({id:"coast-tree-"+i,x,z,r:s*.55})),
 ...GROVE_TREE_SPOTS.map(([x,z,s],i)=>({id:"grove-tree-"+i,x,z,r:s*.5}))
];
export const STATIC_OBSTACLES:ReadonlyArray<Obstacle>=buildings;
export function isWalkable(x:number,z:number,radius=PERSON_RADIUS):boolean{
 if(!insideLand(x,z,radius))return false;
 for(const obstacle of STATIC_OBSTACLES){
  const dx=x-obstacle.x,dz=z-obstacle.z;
  if(dx*dx+dz*dz<(obstacle.r+radius)**2)return false;
 }
 return true;
}
export function segmentIsWalkable(ax:number,az:number,bx:number,bz:number,radius=PERSON_RADIUS):boolean{
 const distance=Math.hypot(bx-ax,bz-az);
 for(let i=0,n=Math.ceil(distance/.32);i<=n;i++){
  const t=i/n;
  if(!isWalkable(ax+(bx-ax)*t,az+(bz-az)*t,radius))return false;
 }
 return true;
}
