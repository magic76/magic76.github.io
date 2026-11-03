/** On-demand, on-device object cutout. This is optional for saved Soul portraits. */
import {resolveCutoutApi,type CutoutSegmenter} from "./soulCutoutCompat";

const TASKS="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/vision_bundle.mjs";
const WASM="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm";
const MODEL="https://storage.googleapis.com/mediapipe-models/interactive_segmenter_v2/magic_touch/int8/1/interactive_segmentation.task";

export type CutoutFailureKind="image"|"runtime"|"model"|"inference"|"selection";
export class CutoutError extends Error{
 constructor(public readonly kind:CutoutFailureKind,message:string){
  super(message);this.name="CutoutError";
 }
}
function why(error:unknown){return error instanceof Error?error.message:String(error)}
let loading:Promise<CutoutSegmenter>|undefined;
async function engine(){
 if(!loading)loading=(async()=>{
  let api;
  try{
   // Do NOT check mod.BrushMode: the @mediapipe/tasks-vision ESM entry does not export it.
   api=resolveCutoutApi(await import(/* @vite-ignore */ TASKS));
  }catch(error){throw new CutoutError("runtime","MediaPipe bundle unavailable: "+why(error))}
  try{
   const fileset=await api.FilesetResolver.forVisionTasks(WASM);
   return await api.InteractiveSegmenter.createFromOptions(fileset,{
    baseOptions:{modelAssetPath:MODEL,delegate:"CPU"}
   });
  }catch(error){throw new CutoutError("model","MagicTouch model could not initialize: "+why(error))}
 })().catch(error=>{loading=undefined;throw error});
 return loading;
}
function loadPhoto(src:string):Promise<HTMLImageElement>{
 return new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>resolve(img);
  img.onerror=()=>reject(new CutoutError("image","Cannot decode photo"));
  img.src=src;
 });
}
/** Normalized tap point, 0..1 in the 640x640 source photo. No pixels are uploaded. */
export async function cutoutObject(image:string,point:{x:number;y:number}):Promise<string>{
 if(!image.startsWith("data:image/"))throw new CutoutError("image","Unsupported source photo");
 const img=await loadPhoto(image);
 const segmenter=await engine();
 const w=img.naturalWidth,h=img.naturalHeight;
 let mask;
 try{
  segmenter.setImage(img);
  // BrushMode.POSITIVE === 1 in the MediaPipe SDK. The enum is not a package-root export.
  mask=segmenter.segment([{brushMode:1,point:[{
   x:Math.min(1,Math.max(0,point.x)),y:Math.min(1,Math.max(0,point.y))
  }],isCompleted:true}]);
 }catch(error){throw new CutoutError("inference","MagicTouch segmentation failed: "+why(error))}
 try{
  const pixels=mask.getAsFloat32Array(),mw=mask.width,mh=mask.height;
  if(!mw||!mh||pixels.length!==mw*mh)
   throw new CutoutError("inference","Segmentation returned an invalid mask");
  const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  if(!ctx)throw new CutoutError("image","Canvas unavailable");
  ctx.drawImage(img,0,0,w,h);
  const rgba=ctx.getImageData(0,0,w,h);
  let kept=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const mi=Math.min(mh-1,Math.floor(y*mh/h))*mw+Math.min(mw-1,Math.floor(x*mw/w));
   const conf=pixels[mi];
   const alpha=Math.min(1,Math.max(0,(conf-.25)/.55));
   const k=(y*w+x)*4+3;
   rgba.data[k]=Math.round(rgba.data[k]*alpha);
   if(alpha>.5)kept++;
  }
  if(kept<w*h*.005||kept>w*h*.96)
   throw new CutoutError("selection","Selected mask is almost empty or covers the whole image");
  ctx.putImageData(rgba,0,0);
  return canvas.toDataURL("image/png");
 }catch(error){
  if(error instanceof CutoutError)throw error;
  throw new CutoutError("inference","Could not read segmentation mask: "+why(error));
 }finally{mask.close?.()}
}
