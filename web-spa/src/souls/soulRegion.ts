import {cutoutObject} from "./soulCutout";
import type {Anchor,Region} from "./soulTracker";

const clamp=(x:number)=>Math.max(0,Math.min(1,x));
/** Single-frame, user-guided object segmentation. The picture is processed locally.
 * Caller must not silently claim a whole-object track when this fails. */
export async function locateSoulRegion(image:string,point:Anchor):Promise<{box:Region;crop:string}>{
 const transparent=await cutoutObject(image,{x:clamp(point.x),y:clamp(point.y)});
 const picture=await new Promise<HTMLImageElement>((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Cannot read segmentation"));img.src=transparent;
 });
 const w=picture.naturalWidth,h=picture.naturalHeight;
 if(!w||!h)throw Error("Invalid segmentation image");
 const cv=document.createElement("canvas");cv.width=w;cv.height=h;
 const ctx=cv.getContext("2d",{willReadFrequently:true});if(!ctx)throw Error("Canvas unavailable");
 ctx.drawImage(picture,0,0);
 const p=ctx.getImageData(0,0,w,h).data;
 let minX=w,minY=h,maxX=-1,maxY=-1,kept=0;
 for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){
  if(p[(y*w+x)*4+3]<140)continue;
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);
  minY=Math.min(minY,y);maxY=Math.max(maxY,y);kept++;
 }
 if(maxX<0||kept<w*h*.005/4||kept>w*h*.85/4)throw Error("Ambiguous object mask");
 const padX=Math.max(4,(maxX-minX)*.07),padY=Math.max(4,(maxY-minY)*.07);
 const left=Math.max(0,Math.floor(minX-padX)),top=Math.max(0,Math.floor(minY-padY));
 const right=Math.min(w,Math.ceil(maxX+padX)),bottom=Math.min(h,Math.ceil(maxY+padY));
 const box={x:left/w,y:top/h,width:(right-left)/w,height:(bottom-top)/h};
 if(box.width<.07||box.height<.07||box.width>.94||box.height>.94)throw Error("Object bounds unreliable");
 // Composite on neutral white to avoid training comparisons against transparent-black.
 const out=document.createElement("canvas");out.width=320;out.height=320;
 const ox=out.getContext("2d");if(!ox)throw Error("Canvas unavailable");
 ox.fillStyle="#ffffff";ox.fillRect(0,0,320,320);
 const sw=right-left,sh=bottom-top,scale=Math.min(300/sw,300/sh);
 ox.drawImage(picture,left,top,sw,sh,(320-sw*scale)/2,(320-sh*scale)/2,sw*scale,sh*scale);
 return {box,crop:out.toDataURL("image/jpeg",.82)};
}
