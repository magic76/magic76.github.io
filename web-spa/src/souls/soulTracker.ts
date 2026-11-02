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
