export type MagicSubject={x:number;z:number;ground:number;height:number;radius:number};
export type MagicOccluder={x:number;z:number;radius:number;height:number;ground:number;kind:'tree'|'district'|'castle';index?:number};
export type MagicFocusPose={camera:[number,number,number];target:[number,number,number];hiddenTrees:number[]};

// Intersect a segment with a finite upright cylinder. All math is deterministic.
export function magicOccludes(from:readonly number[],to:readonly number[],o:MagicOccluder):boolean{
 const dx=to[0]-from[0],dz=to[2]-from[2],dy=to[1]-from[1];
 const ox=from[0]-o.x,oz=from[2]-o.z;
 const a=dx*dx+dz*dz,b=2*(ox*dx+oz*dz),c=ox*ox+oz*oz-o.radius*o.radius;
 if(a<1e-8)return false;
 const disc=b*b-4*a*c;if(disc<0)return false;
 const q=Math.sqrt(disc);
 const near=(-b-q)/(2*a),far=(-b+q)/(2*a);
 const enter=Math.max(.001,near),leave=Math.min(.995,far);
 if(enter>leave)return false;
 const lo=from[1]+dy*enter,hi=from[1]+dy*leave;
 return Math.max(Math.min(lo,hi),o.ground)<Math.min(Math.max(lo,hi),o.ground+o.height);
}

export function getMagicFocusPose(subject:MagicSubject,occluders:readonly MagicOccluder[],aspect:number):MagicFocusPose{
 const portrait=aspect<.75;
 // Chibi creatures are ~2 units tall; frame them by size instead of a fixed
 // distance so small subjects don't become specks (full distance from 3.4 up).
 const fit=Math.min(1,Math.max(.51,subject.height/3.4));
 const distance=(portrait?15.5:12.7)*fit;
 const elevation=(portrait?8.5:7.9)*fit;
 const lookY=subject.ground+Math.max(.95,subject.height*.53);
 const samples=focusSamples(subject);
 const heading=Math.atan2(10.6,7.5);
 let best:number[]=[subject.x+7.5,lookY+elevation,subject.z+10.6];
 let bestScore=Infinity;
 const candidates=16;
 for(let i=0;i<candidates;i++){
  const step=i===0?0:(i%2===1?1:-1)*Math.ceil(i/2);
  const angle=heading+step*2*Math.PI/candidates;
  const cam:[number,number,number]=[subject.x+distance*Math.cos(angle),lookY+elevation,subject.z+distance*Math.sin(angle)];
  let blocked=0;
  for(const o of occluders){
   for(const p of samples)if(magicOccludes(cam,p,o))blocked+=o.kind==='tree'?1:4;
   const cameraGap=Math.hypot(cam[0]-o.x,cam[2]-o.z);
   if(cameraGap<o.radius+.35)blocked+=12;
  }
  const penalty=Math.abs(step)*.035;
  const score=blocked+penalty;
  if(score<bestScore){bestScore=score;best=cam;}
 }
 return {camera:best as [number,number,number],target:[subject.x,lookY,subject.z],hiddenTrees:magicHiddenTrees(best,subject,occluders)};
}
function focusSamples(subject:MagicSubject):[number,number,number][]{
 const lookY=subject.ground+Math.max(.95,subject.height*.53);
 return [[subject.x,subject.ground+.18,subject.z],[subject.x,lookY,subject.z],[subject.x,subject.ground+subject.height,subject.z],
  [subject.x-subject.radius*.75,lookY,subject.z],[subject.x+subject.radius*.75,lookY,subject.z]];
}
/** Trees between an arbitrary camera (e.g. after a manual orbit) and the subject. */
export function magicHiddenTrees(camera:readonly number[],subject:MagicSubject,occluders:readonly MagicOccluder[]):number[]{
 const samples=focusSamples(subject),hidden:number[]=[];
 for(const o of occluders){
  if(o.kind!=='tree'||o.index===undefined)continue;
  const near=Math.hypot(o.x-subject.x,o.z-subject.z)<1.9+subject.radius*.3;
  if(near||samples.some(p=>magicOccludes(camera,p,o)))hidden.push(o.index);
 }
 return hidden;
}
