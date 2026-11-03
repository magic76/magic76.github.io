/** Serializable stage-relative transform for a static Soul photo/cutout.
 * The SVG face shares the same transformed parent and stays attached to its object.
 */
export type SoulTransform={x:number;y:number;scale:number;rotation:number};
export type PointerPosition={id:number;x:number;y:number};
export const DEFAULT_TRANSFORM:SoulTransform={x:0,y:0,scale:1,rotation:0};
export const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:min));
export function safeTransform(value:Partial<SoulTransform>|undefined|null):SoulTransform{
 const angle=value?.rotation??0;
 const rotation=Number.isFinite(angle)?((angle+180)%360+360)%360-180:0;
 return {
  x:clamp(value?.x??0,-.65,.65),y:clamp(value?.y??0,-.65,.65),
  scale:clamp(value?.scale??1,.5,2.8),rotation
 };
}
function center(a:PointerPosition,b:PointerPosition){
 return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};
}
function distance(a:PointerPosition,b:PointerPosition){
 return Math.hypot(b.x-a.x,b.y-a.y);
}
function angle(a:PointerPosition,b:PointerPosition){
 return Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
}
/** Computes one gesture from a captured baseline; never compounds pointer deltas. */
export function applyGesture(
 baseline:SoulTransform,start:PointerPosition[],current:PointerPosition[],
 surfaceWidth:number,surfaceHeight:number
):SoulTransform{
 if(!start.length||start.length!==current.length||surfaceWidth<=0||surfaceHeight<=0)
  return safeTransform(baseline);
 const byId=new Map(current.map(point=>[point.id,point]));
 const matched=start.map(p=>byId.get(p.id));
 if(matched.some(p=>!p))return safeTransform(baseline);
 const now=matched as PointerPosition[];
 if(start.length===1){
  return safeTransform({...baseline,
   x:baseline.x+(now[0].x-start[0].x)/surfaceWidth,
   y:baseline.y+(now[0].y-start[0].y)/surfaceHeight});
 }
 const a=start[0],b=start[1],c=now[0],d=now[1];
 const from=center(a,b),to=center(c,d);
 const initialDistance=distance(a,b),currentDistance=distance(c,d);
 const scale=initialDistance>8?baseline.scale*currentDistance/initialDistance:baseline.scale;
 const rotation=initialDistance>8?baseline.rotation+angle(c,d)-angle(a,b):baseline.rotation;
 return safeTransform({
  x:baseline.x+(to.x-from.x)/surfaceWidth,
  y:baseline.y+(to.y-from.y)/surfaceHeight,scale,rotation
 });
}
