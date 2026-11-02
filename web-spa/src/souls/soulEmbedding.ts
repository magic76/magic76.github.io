/** Optional on-device image embeddings; installed only on demand for Souls.
 * Model files are downloaded from public CDN; no personal images leave the device. */
const BUNDLE="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/vision_bundle.mjs";
const WASM="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm";
const MODEL="https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite";
type Embedder={embed:(input:HTMLCanvasElement)=>{embeddings?:Array<{floatEmbedding?:ArrayLike<number>}>}};
let model:Promise<Embedder>|undefined;
function getModel(){
 if(!model)model=(async()=>{
  const mod=await import(/* @vite-ignore */ BUNDLE);
  const files=await mod.FilesetResolver.forVisionTasks(WASM);
  return await mod.ImageEmbedder.createFromOptions(files,{baseOptions:{modelAssetPath:MODEL,delegate:"CPU"},l2Normalize:true,quantize:false}) as Embedder;
 })().catch(err=>{model=undefined;throw err});
 return model;
}
export async function embedPhoto(canvas:HTMLCanvasElement):Promise<number[]|null>{
 try{
  const runtime=await getModel(),v=runtime.embed(canvas).embeddings?.[0]?.floatEmbedding;
  if(!v||v.length<32)return null;
  const values=Array.from(v,Number);
  if(values.some(x=>!Number.isFinite(x)))return null;
  const norm=Math.hypot(...values);
  return norm>1e-7?values.map(x=>x/norm):null;
 }catch{return null}
}
export function compareEmbeddings(a?:number[],b?:number[]):number|null{
 if(!a||!b||a.length!==b.length||a.length<32)return null;
 let dot=0,aa=0,bb=0;
 for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}
 return aa&&bb?Math.max(-1,Math.min(1,dot/Math.sqrt(aa*bb))):null;
}
/** Honest photo quality gate: reject gross over/under-exposure and blur.
 * Not a learned confidence score or a guarantee of successful recognition. */
export function photoQuality(pixels:Uint8ClampedArray,width:number,height:number):{ok:boolean;reason:"dark"|"bright"|"blur"|null;score:number}{
 let sum=0,sumEdge=0,n=0,edges=0;
 const step=4;
 const luma=(x:number,y:number)=>{
  const i=(y*width+x)*4;return pixels[i]*.299+pixels[i+1]*.587+pixels[i+2]*.114;
 };
 for(let y=step;y<height-step;y+=step)for(let x=step;x<width-step;x+=step){
  const v=luma(x,y);sum+=v;n++;
  const edge=Math.abs(4*v-luma(x-step,y)-luma(x+step,y)-luma(x,y-step)-luma(x,y+step));
  sumEdge+=edge;edges++;
 }
 const brightness=n?sum/n:0,detail=edges?sumEdge/edges:0;
 const reason=brightness<28?"dark":brightness>237?"bright":detail<8?"blur":null;
 return {ok:!reason,reason,score:Math.min(1,detail/60)};
}
