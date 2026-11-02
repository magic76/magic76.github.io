/** Tiny on-device grayscale template tracker for the hidden Souls AR preview.
 * Tracks a user-selected visual feature, not a semantic object boundary.
 * Fail closed on low texture, occlusion or large frame changes. */
export type GrayFrame={width:number;height:number;pixels:Uint8Array};
export type Anchor={x:number;y:number};
export type Template={x:number;y:number;values:Float32Array;radius:number;stride:number;mean:number};
const clamp=(value:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,value));
export function toGrayFrame(rgba:Uint8ClampedArray,width:number,height:number):GrayFrame{
 const pixels=new Uint8Array(width*height);
 for(let i=0;i<pixels.length;i++){
  const j=i*4;
  pixels[i]=Math.round(rgba[j]*.299+rgba[j+1]*.587+rgba[j+2]*.114);
 }
 return{width,height,pixels};
}
function patch(frame:GrayFrame,x:number,y:number,radius:number,stride:number){
 const n=(2*radius/stride)**2,values=new Float32Array(n);let index=0,sum=0;
 for(let dy=-radius;dy<radius;dy+=stride)for(let dx=-radius;dx<radius;dx+=stride){
  const value=frame.pixels[(y+dy)*frame.width+x+dx];values[index++]=value;sum+=value;
 }
 const mean=sum/n;
 let variance=0;
 for(let i=0;i<n;i++)variance+=(values[i]-mean)**2;
 return{values,mean,deviation:Math.sqrt(variance/n)};
}
export function initTracker(frame:GrayFrame,at:Anchor):Template|null{
 const radius=12,stride=2,x=Math.round(at.x*frame.width),y=Math.round(at.y*frame.height);
 if(x<radius+1||y<radius+1||x>=frame.width-radius-1||y>=frame.height-radius-1)return null;
 const sample=patch(frame,x,y,radius,stride);
 if(sample.deviation<10)return null;
 return{x,y,values:sample.values,mean:sample.mean,radius,stride};
}
export function trackFrame(frame:GrayFrame,ref:Template):{point:Anchor;template:Template;error:number}|null{
 const {width,height}=frame,limit=18,radius=ref.radius;
 if(ref.x-radius<0||ref.y-radius<0||ref.x+radius>=width||ref.y+radius>=height)return null;
 let bestError=Infinity,bx=ref.x,by=ref.y;
 const minX=Math.max(radius+1,ref.x-limit),maxX=Math.min(width-radius-2,ref.x+limit);
 const minY=Math.max(radius+1,ref.y-limit),maxY=Math.min(height-radius-2,ref.y+limit);
 // Coarse-to-fine in a bounded window, keeping CPU cost predictable on phones.
 const measure=(x:number,y:number)=>{
  const sample=patch(frame,x,y,ref.radius,ref.stride);
  let score=0;
  for(let i=0;i<sample.values.length;i++)
   score+=Math.abs((sample.values[i]-sample.mean)-(ref.values[i]-ref.mean));
  return score/sample.values.length;
 };
 for(let y=minY;y<=maxY;y+=3)for(let x=minX;x<=maxX;x+=3){
  const e=measure(x,y);
  if(e<bestError){bestError=e;bx=x;by=y}
 }
 const roughX=bx,roughY=by;
 for(let y=Math.max(minY,roughY-2);y<=Math.min(maxY,roughY+2);y++)
  for(let x=Math.max(minX,roughX-2);x<=Math.min(maxX,roughX+2);x++){
   const e=measure(x,y);
   if(e<bestError){bestError=e;bx=x;by=y}
  }
 // A high error usually means the object left view or its appearance changed.
 if(bestError>28)return null;
 return{point:{x:clamp(bx/width,0,1),y:clamp(by/height,0,1)},template:{...ref,x:bx,y:by},error:bestError};
}


/** Several local textured anchors vote on motion instead of following one patch
 * (which may be on the table behind the object). This is a 2D tracker, not object pose. */
export type Region={x:number;y:number;width:number;height:number};
export type MultiTracker={point:Anchor;anchors:Template[];box?:Region};
const median=(numbers:number[])=>{
 const ordered=numbers.slice().sort((a,b)=>a-b);
 const m=Math.floor(ordered.length/2);
 return ordered.length%2?ordered[m]:(ordered[m-1]+ordered[m])/2;
};
export function initMultiTracker(frame:GrayFrame,at:Anchor):MultiTracker|null{
 // Stay near the user's face placement to avoid learning distant background features.
 const offsets:[[number,number],...Array<[number,number]>]=[
  [0,0],[-.075,0],[.075,0],[0,-.055],[0,.055],
  [-.055,-.04],[.055,-.04],[-.055,.04],[.055,.04]
 ];
 const anchors:Template[]=[];
 for(const [dx,dy] of offsets){
  const point={x:at.x+dx,y:at.y+dy};
  const found=initTracker(frame,point);
  if(found)anchors.push(found);
 }
 // Do not pretend that a textureless/ambiguous object is being tracked.
 return anchors.length>=2?{point:{...at},anchors}:null;
}
export function trackMultiFrame(frame:GrayFrame,ref:MultiTracker):MultiTracker|null{
 const observations:Array<{original:Template;result:ReturnType<typeof trackFrame>;dx:number;dy:number}>=[];
 for(const anchor of ref.anchors){
  const result=trackFrame(frame,anchor);
  if(!result||result.error>23)continue;
  observations.push({original:anchor,result,dx:result.template.x-anchor.x,dy:result.template.y-anchor.y});
 }
 if(observations.length<2)return null;
 const dx=median(observations.map(o=>o.dx)),dy=median(observations.map(o=>o.dy));
 // Discard features that move independently of the majority.
 let inliers=observations.filter(o=>Math.abs(o.dx-dx)<=7&&Math.abs(o.dy-dy)<=7);
 if(inliers.length<2||inliers.length<Math.ceil(ref.anchors.length*.5))return null;
 const originX=inliers.reduce((n,o)=>n+o.original.x,0)/inliers.length;
 const originY=inliers.reduce((n,o)=>n+o.original.y,0)/inliers.length;
 const targetX=inliers.reduce((n,o)=>n+o.result!.template.x,0)/inliers.length;
 const targetY=inliers.reduce((n,o)=>n+o.result!.template.y,0)/inliers.length;
 let a=1,b=0;
 if(inliers.length>=3){
  // Least-squares similarity transform: translation + uniform scale + rotation.
  let xx=0,dot=0,cross=0;
  for(const o of inliers){
   const x=o.original.x-originX,y=o.original.y-originY;
   const u=o.result!.template.x-targetX,v=o.result!.template.y-targetY;
   xx+=x*x+y*y;dot+=x*u+y*v;cross+=x*v-y*u;
  }
  if(xx>15){a=dot/xx;b=cross/xx}
  const scale=Math.hypot(a,b),rotation=Math.abs(Math.atan2(b,a));
  // Per-frame jumps beyond these limits are more likely mismatched features.
  if(scale<.87||scale>1.14||rotation>.29)return null;
  inliers=inliers.filter(o=>{
   const x=o.original.x-originX,y=o.original.y-originY;
   const tx=targetX+a*x-b*y,ty=targetY+b*x+a*y;
   return Math.hypot(o.result!.template.x-tx,o.result!.template.y-ty)<=5;
  });
  if(inliers.length<3||inliers.length<Math.ceil(ref.anchors.length*.5))return null;
 }
 const map=(x:number,y:number)=>{
  const ox=x-originX,oy=y-originY;
  return{x:targetX+a*ox-b*oy,y:targetY+b*ox+a*oy};
 };
 const face=map(ref.point.x*frame.width,ref.point.y*frame.height);
 const point={x:clamp(face.x/frame.width,0,1),y:clamp(face.y/frame.height,0,1)};
 const anchors=inliers.map(o=>{
  const found=o.result!;
  if(found.error>13||inliers.length<3)return found.template;
  const fresh=patch(frame,found.template.x,found.template.y,found.template.radius,found.template.stride);
  if(fresh.deviation<10)return found.template;
  const values=found.template.values.map((v,i)=>v*.93+fresh.values[i]*.07);
  return {...found.template,values,mean:found.template.mean*.93+fresh.mean*.07};
 });
 let box:Region|undefined;
 if(ref.box){
  const {x,y,width,height}=ref.box;
  const corners=[[x,y],[x+width,y],[x,y+height],[x+width,y+height]].map(([u,v])=>map(u*frame.width,v*frame.height));
  const left=clamp(Math.min(...corners.map(c=>c.x))/frame.width,0,1);
  const right=clamp(Math.max(...corners.map(c=>c.x))/frame.width,0,1);
  const top=clamp(Math.min(...corners.map(c=>c.y))/frame.height,0,1);
  const bottom=clamp(Math.max(...corners.map(c=>c.y))/frame.height,0,1);
  if(right-left<.04||bottom-top<.04)return null;
  box={x:left,y:top,width:right-left,height:bottom-top};
  // Reject a face anchor that has clearly escaped the tracked object bounds.
  if(point.x<left-.08||point.x>right+.08||point.y<top-.08||point.y>bottom+.08)return null;
 }
 return {point,anchors,box};
}
export function initRegionTracker(frame:GrayFrame,box:Region,face?:Anchor):MultiTracker|null{
 const left=clamp(box.x,0,1),top=clamp(box.y,0,1),right=clamp(box.x+box.width,0,1),bottom=clamp(box.y+box.height,0,1);
 const w=right-left,h=bottom-top;
 if(w<.08||h<.08)return null;
 const anchors:Template[]=[];
 for(const fx of [.2,.4,.6,.8])for(const fy of [.2,.4,.6,.8]){
  const anchor=initTracker(frame,{x:left+w*fx,y:top+h*fy});
  if(anchor)anchors.push(anchor);
 }
 if(anchors.length<3)return null;
 const point=face&&face.x>=left&&face.x<=right&&face.y>=top&&face.y<=bottom?
  {...face}:{x:left+w*.5,y:top+h*.35};
 return {point,anchors,box:{x:left,y:top,width:w,height:h}};
}
