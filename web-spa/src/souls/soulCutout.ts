/** On-demand local object segmentation. Never needed for recognition or chat. */
const TASKS="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/vision_bundle.mjs";
const WASM="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm";
const MODEL="https://storage.googleapis.com/mediapipe-models/interactive_segmenter_v2/magic_touch/int8/1/interactive_segmentation.task";
type SegmentationModel={
 setImage:(source:HTMLImageElement)=>void;
 segment:(strokes:Array<{brushMode:unknown;point:Array<{x:number;y:number}>;isCompleted:boolean}>)=>{width:number;height:number;getAsFloat32Array:()=>Float32Array;close?:()=>void};
 close?:()=>void;
};
let loading:Promise<{segmenter:SegmentationModel;positive:unknown}>|undefined;
async function engine(){
 if(!loading)loading=(async()=>{
  const mod=await import(/* @vite-ignore */ TASKS);
  if(!mod.FilesetResolver||!mod.InteractiveSegmenter||!mod.BrushMode)throw Error("Interactive segmentation unavailable");
  const fileset=await mod.FilesetResolver.forVisionTasks(WASM);
  const segmenter=await mod.InteractiveSegmenter.createFromOptions(fileset,{baseOptions:{modelAssetPath:MODEL,delegate:"CPU"}});
  return {segmenter:segmenter as SegmentationModel,positive:mod.BrushMode.POSITIVE};
 })().catch(error=>{loading=undefined;throw error});
 return loading;
}
function loadPhoto(src:string):Promise<HTMLImageElement>{
 return new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Could not read source image"));img.src=src;
 });
}
/** Point coordinates normalized to photo width/height; no image pixels are uploaded to the segmentation service. */
export async function cutoutObject(image:string,point:{x:number;y:number}):Promise<string>{
 if(!image.startsWith("data:image/"))throw Error("Unsupported image");
 const img=await loadPhoto(image);
 const {segmenter,positive}=await engine();
 const w=img.naturalWidth,h=img.naturalHeight;
 segmenter.setImage(img);
 const mask=segmenter.segment([{brushMode:positive,point:[{
  x:Math.min(1,Math.max(0,point.x)),y:Math.min(1,Math.max(0,point.y))
 }],isCompleted:true}]);
 try{
  const pixels=mask.getAsFloat32Array(),mw=mask.width,mh=mask.height;
  if(!mw||!mh||pixels.length!==mw*mh)throw Error("Segmentation mask invalid");
  const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  if(!ctx)throw Error("Canvas unavailable");
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
  if(kept<w*h*.005||kept>w*h*.96)throw Error("Please tap the object, not the background");
  ctx.putImageData(rgba,0,0);
  return canvas.toDataURL("image/png");
 }finally{mask.close?.()}
}
