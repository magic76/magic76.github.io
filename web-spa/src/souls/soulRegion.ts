import {cutoutObject} from "./soulCutout";
import {componentFromAlpha} from "./soulMaskComponent";
import type {Anchor,Region} from "./soulTracker";

const clamp=(x:number)=>Math.max(0,Math.min(1,x));
/** Single-frame, user-guided object segmentation. The picture is processed locally.
 * Caller must not silently claim a whole-object track when this fails. */
export async function locateSoulRegion(image:string,point:Anchor):Promise<{box:Region;crop:string;anchors:Anchor[]}>{
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
 const component=componentFromAlpha(p,w,h,point);
 const {anchors}=component;
 const padX=Math.max(4,(component.right-component.left)*.07);
 const padY=Math.max(4,(component.bottom-component.top)*.07);
 const left=Math.max(0,Math.floor(component.left-padX));
 const top=Math.max(0,Math.floor(component.top-padY));
 const right=Math.min(w,Math.ceil(component.right+padX));
 const bottom=Math.min(h,Math.ceil(component.bottom+padY));
 const box={x:left/w,y:top/h,width:(right-left)/w,height:(bottom-top)/h};
 if(box.width<.045||box.height<.045||box.width>.97||box.height>.97)throw Error("Object bounds unreliable");
 // Composite on neutral white to avoid training comparisons against transparent-black.
 const out=document.createElement("canvas");out.width=320;out.height=320;
 const ox=out.getContext("2d");if(!ox)throw Error("Canvas unavailable");
 ox.fillStyle="#ffffff";ox.fillRect(0,0,320,320);
 const sw=right-left,sh=bottom-top,scale=Math.min(300/sw,300/sh);
 ox.drawImage(picture,left,top,sw,sh,(320-sw*scale)/2,(320-sh*scale)/2,sw*scale,sh*scale);
 return {box,crop:out.toDataURL("image/jpeg",.82),anchors};
}
