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

/** Three.js uses Y as the vertical axis. Surface height must be shared by
 * creatures, AI-authored geometry, wonders and landmarks: never place a
 * grounded object at a hard-coded world Y while the island is curved. */
export function islandSurfaceHeight(x:number,z:number):number{
 const radiusX=5.65*Math.sqrt(10),radiusZ=5.65*.84*Math.sqrt(10);
 return .55+1.017*Math.sqrt(Math.max(.15,1-(x/radiusX)**2-(z/radiusZ)**2));
}

/** Geometry parts are centered at their authored (x,y,z) points. Find the
 * lowest physical extremity, including animated joint rotations, so size 1.65
 * feet/wings cannot sink into the surface. All inputs are reducer-validated.
 * Small contact clearance also covers triangulation and breathing motion.
 */
/** Local attachment point (in authored part coordinates, before size). A real
 * joint rotates the entire part around this location, not its geometric center.
 * Side anchors follow the part's yaw so flapping wings attach at the root.
 * Old creations without a pivot retain the original centered animation.
 */
export function magicPartPivot(part:{
 shape:string;pivot?:string;yaw?:number;width?:number;height?:number
}):[number,number,number]{
 const yHalf=part.shape==="sphere"?.63:part.shape==="capsule"?.76:
  part.shape==="cone"?.59:part.shape==="torus"?.71:
  part.shape==="octahedron"?.65:part.shape==="leaf"?.38:.5;
 const xHalf=part.shape==="leaf"?.88:part.shape==="sphere"?.63:
  part.shape==="capsule"?.34:part.shape==="octahedron"?.65:.5;
 const x=part.pivot==="left"?-xHalf*(part.width??1):
  part.pivot==="right"?xHalf*(part.width??1):0;
 const y=part.pivot==="top"?yHalf*(part.height??1):
  part.pivot==="bottom"?-yHalf*(part.height??1):0;
 const angle=(part.yaw??0)*Math.PI/180;
 return [x*Math.cos(angle),y,-x*Math.sin(angle)];
}

export function creationGroundClearance(parts:readonly {shape:string;y:number;size:number;joint?:string;height?:number;width?:number;depth?:number;pivot?:string}[]):number{
 let bottom=Infinity;
 for(const part of parts){
  const halfHeight=part.joint&&part.joint!=="fixed"?.89:
   part.shape==="sphere"?.63:part.shape==="cone"?.59:
   part.shape==="torus"?.71:part.shape==="octahedron"?.65:
   part.shape==="capsule"?.76:part.shape==="leaf"?.38:.5;
  // Rotating articulated pieces can sweep sideways dimensions into Y.
  // Be conservative for explicit joints, while preserving old saved geometry.
  const articulated=part.joint!==undefined&&part.joint!=="fixed";
  const span=articulated?Math.max(halfHeight*(part.height??1),
   .72*(part.width??1),.72*(part.depth??1)):halfHeight*(part.height??1);
  // A lateral wing pivot can sweep a formerly horizontal part downward.
  // Conservatively reserve that possible reach on uneven island terrain.
  const lateral=part.pivot==="left"||part.pivot==="right"?
   .9*(part.width??1)+.3*(part.height??1):0;
  bottom=Math.min(bottom,part.y-part.size*Math.max(span,lateral));
 }
 return Number.isFinite(bottom)?.2-bottom:.2;
}
