import {DEFAULT_FACE,faceFromAlpha,type SoulFace} from "./soulFace";

function loadImage(src:string):Promise<HTMLImageElement>{
 return new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>reject(new Error("Image could not be loaded"));
  image.src=src;
 });
}
export async function suggestedFace(src:string):Promise<SoulFace>{
 const image=await loadImage(src);
 const canvas=document.createElement("canvas");canvas.width=canvas.height=320;
 const ctx=canvas.getContext("2d",{willReadFrequently:true});
 if(!ctx)return {...DEFAULT_FACE};
 ctx.drawImage(image,0,0,320,320);
 return faceFromAlpha(ctx.getImageData(0,0,320,320).data,320,320);
}
