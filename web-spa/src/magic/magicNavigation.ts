/** Deterministic island-ring travel. All positions remain outside the castle and cliff. */
export type Point=readonly [number,number];
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
// Navigation works in the same 10x-land-area coordinates as world.ts.
const RING_X=3.7*Math.sqrt(10),RING_Z=3.25*Math.sqrt(10);
export function ringPoint(angle:number,radius=.76):[number,number]{
 const r=clamp(radius,.61,.92);return [Math.cos(angle)*r*RING_X,Math.sin(angle)*r*RING_Z];
}
export function ringPolar(p:Point){
 const x=p[0]/RING_X,z=p[1]/RING_Z;
 return {angle:Math.atan2(z,x),radius:clamp(Math.hypot(x,z),.61,.92)};
}
export function ringStep(from:Point,to:Point,distance:number,obstacles:readonly Point[]=[]):[number,number]{
 if(!Number.isFinite(distance)||distance<=0)return [from[0],from[1]];
 const a=ringPolar(from),b=ringPolar(to);
 const delta=Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle));
 const angle=a.angle+clamp(delta,-distance/(3.1*Math.sqrt(10)),distance/(3.1*Math.sqrt(10)));
 const radius=a.radius+clamp(b.radius-a.radius,-distance/(3.4*Math.sqrt(10)),distance/(3.4*Math.sqrt(10)));
 const candidates=[0,-.11,.11,-.2,.2].map(shift=>ringPoint(angle,radius+shift));
 for(const p of candidates){
  if(obstacles.every(q=>Math.hypot(p[0]-q[0],p[1]-q[1])>=.78||
    Math.hypot(p[0]-q[0],p[1]-q[1])>Math.hypot(from[0]-q[0],from[1]-q[1])+.015))return p;
 }
 return [from[0],from[1]];
}
export function groupRingTargets(anchor:Point,count:number,obstacles:readonly Point[]):[number,number][]|null{
 if(!Number.isInteger(count)||count<1||count>6)return null;
 const polar=ringPolar(anchor),result:[number,number][]=[];
 for(let i=0;i<count;i++){
  let target:[number,number]|undefined;
  for(let n=0;n<26;n++){
   const shift=n===0?0:(n%2?1:-1)*Math.ceil(n/2)*.22;
   const p=ringPoint(polar.angle+(i-(count-1)/2)*.47+shift,Math.max(.72,polar.radius));
   if([...obstacles,...result].every(q=>Math.hypot(p[0]-q[0],p[1]-q[1])>=1.02)){target=p;break}
  }
  if(!target)return null;
  result.push(target);
 }
 return result;
}
