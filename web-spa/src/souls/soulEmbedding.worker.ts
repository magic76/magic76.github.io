export {}; // Keep the worker's Request type out of the browser global namespace.
/** Isolated on-device inference. No user pixels are uploaded by this worker. */
const BUNDLE="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/vision_bundle.mjs";
const WASM="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm";
const MODEL="https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite";
type Embedder={embed:(input:ImageBitmap)=>{embeddings?:Array<{floatEmbedding?:ArrayLike<number>}>}};
type Request={id:number;bitmap:ImageBitmap};
type Answer={id:number;embedding?:number[];error?:string};
const scope=self as unknown as {onmessage:(event:MessageEvent<Request>)=>void;postMessage:(answer:Answer)=>void};
let model:Promise<Embedder>|null=null;
function load(){
 if(!model)model=(async()=>{
  const mod=await import(/* @vite-ignore */ BUNDLE);
  if(!mod.FilesetResolver||!mod.ImageEmbedder)throw Error("Image embedding runtime unavailable");
  const files=await mod.FilesetResolver.forVisionTasks(WASM);
  return mod.ImageEmbedder.createFromOptions(files,{baseOptions:{modelAssetPath:MODEL,delegate:"CPU"},l2Normalize:true,quantize:false}) as Promise<Embedder>;
 })().catch(err=>{model=null;throw err});
 return model;
}
scope.onmessage=event=>{
 const {id,bitmap}=event.data;
 void (async()=>{
  try{
   const embedder=await load(),vector=embedder.embed(bitmap).embeddings?.[0]?.floatEmbedding;
   if(!vector||vector.length<32)throw Error("No float embedding");
   const values=Array.from(vector,Number),norm=Math.hypot(...values);
   if(!norm||values.some(x=>!Number.isFinite(x)))throw Error("Invalid embedding");
   scope.postMessage({id,embedding:values.map(x=>x/norm)});
  }catch(error){
   scope.postMessage({id,error:error instanceof Error?error.message:"Embedding unavailable"});
  }finally{bitmap.close()}
 })();
};
