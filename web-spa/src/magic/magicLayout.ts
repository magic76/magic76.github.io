/** Single source of truth for authored scenery positions and blob shadows. */
export type TreeSite={x:number;z:number;scale:number;style:0|1};
export type DistrictSite={x:number;z:number;angle:number;id:number};
export const MAGIC_DISTRICTS:DistrictSite[]=Array.from({length:8},(_,id)=>{
 const angle=id*Math.PI/4+.18;
 return {x:Math.cos(angle)*12.5,z:Math.sin(angle)*10.4,angle,id};
});
const groups=[
 {x:-10,z:-6,n:10,spread:2.25},
 {x:10,z:-6,n:9,spread:2.3},
 {x:-11,z:5.8,n:10,spread:2.45},
 {x:11,z:6.2,n:9,spread:2.45},
 {x:0,z:-11,n:8,spread:2.1},
 {x:0,z:10.5,n:8,spread:2.3},
];
export const MAGIC_TREES:TreeSite[]=groups.flatMap((g,group)=>
 Array.from({length:g.n},(_,i)=>{
  const a=i*2.39996+group*.67;
  const radius=Math.sqrt((i+.42)/g.n)*g.spread;
  return {x:g.x+Math.cos(a)*radius,z:g.z+Math.sin(a)*radius*.9,
   scale:.7+((i*7+group*3)%9)/9*.7,style:((i+group)%2) as 0|1};
 }).filter(p=>Math.hypot(p.x/17.87,p.z/15.0)<.91 &&
   !(Math.abs(p.x)<2.6 && p.z>3.5 && p.z<12.5))
);
