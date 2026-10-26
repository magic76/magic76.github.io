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
/** Island sites for persistent AI creations (world units). Each keeps >=1.45 clear
 * of trees, district buildings, the castle, resident plots and paths, stays inside
 * 74% of the island ellipse and is >=3.4 from every other site, so a full island
 * of creations never overlaps. tests/magic-world asserts these invariants. */
export const MAGIC_CREATION_SLOTS:readonly (readonly [number,number])[]=[
 [-6,2.75],[4.25,5],[-.25,7],[7.5,0],[-3.5,-5.5],[5.25,-6.25],
 [2.75,10.75],[-7.5,-.5],[-6,9.75],[13,-2],[6.75,-9.5],[-3.25,-9]
];
/** Deterministic: in creation order, each wish takes the free site nearest to
 * where it asked to stand (a friend asks for its owner's site). */
export function assignMagicCreationSites(wanted:readonly {x:number;z:number;owner?:number}[]):[number,number][]{
 const used=new Set<number>(),sites:[number,number][]=[];
 wanted.forEach((w,i)=>{
  const o=w.owner!==undefined&&w.owner<i?sites[w.owner]:null;
  const x=o?o[0]:w.x,z=o?o[1]:w.z;
  let best=-1,score=Infinity;
  MAGIC_CREATION_SLOTS.forEach((s,k)=>{const d=Math.hypot(s[0]-x,s[1]-z);if(!used.has(k)&&d<score){score=d;best=k}});
  if(best<0){sites.push([x,z]);return}
  used.add(best);sites.push([MAGIC_CREATION_SLOTS[best][0],MAGIC_CREATION_SLOTS[best][1]]);
 });
 return sites;
}
/** World-space ground point of every creation by id (anchor = safeMagicAnchor,
 * passed in so this file stays import-free for the source-level tests). */
export function magicCreationSites(creations:readonly {id:number;x:number;z:number;friendOf?:number}[],
 anchor:(x:number,z:number)=>[number,number]):Map<number,[number,number]>{
 const sites=assignMagicCreationSites(creations.map(c=>{
  const owner=c.friendOf===undefined?-1:creations.findIndex(o=>o.id===c.friendOf);
  const [x,z]=anchor(c.x,c.z);
  return owner>=0?{x,z,owner}:{x,z};
 }));
 return new Map(creations.map((c,i)=>[c.id,sites[i]]));
}
