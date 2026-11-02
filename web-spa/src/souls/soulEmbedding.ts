/** On-device embeddings are optional; a dedicated Worker keeps the synchronous
 * MediaPipe inference off the camera and Gemini Live UI thread. No uploaded pixels. */
type Response={id:number;embedding?:number[];error?:string};
type Pending={resolve:(value:number[]|null)=>void;timeout:ReturnType<typeof setTimeout>};
const pending=new Map<number,Pending>();
let worker:Worker|null=null,seq=0,failedAt=0;
let status:"idle"|"loading"|"ready"|"unavailable"="idle";
export function embeddingStatus(){return status}
function shutdown(){
 if(worker){worker.terminate();worker=null}
 for(const request of pending.values()){clearTimeout(request.timeout);request.resolve(null)}
 pending.clear();failedAt=Date.now();status="unavailable";
}
function ensureWorker():Worker|null{
 if(worker)return worker;
 if(status==="unavailable"&&Date.now()-failedAt<60000)return null;
 if(typeof Worker==="undefined"||typeof createImageBitmap!=="function"){
  status="unavailable";failedAt=Date.now();return null;
 }
 try{
  worker=new Worker(new URL("./soulEmbedding.worker.ts",import.meta.url),{type:"module"});
  status="loading";
  worker.onmessage=(event:MessageEvent<Response>)=>{
   const {id,embedding,error}=event.data,request=pending.get(id);
   if(!request)return;
   clearTimeout(request.timeout);pending.delete(id);
   if(error){request.resolve(null);shutdown();return}
   if(!embedding||embedding.length<32||embedding.some(v=>!Number.isFinite(v))){
    request.resolve(null);shutdown();return;
   }
   status="ready";request.resolve(embedding);
  };
  worker.onerror=()=>shutdown();
  return worker;
 }catch{shutdown();return null}
}
export async function embedPhoto(canvas:HTMLCanvasElement):Promise<number[]|null>{
 const target=ensureWorker();if(!target)return null;
 let bitmap:ImageBitmap;
 try{bitmap=await createImageBitmap(canvas)}catch{return null}
 return new Promise(resolve=>{
  const id=++seq;
  const timeout=setTimeout(()=>shutdown(),22000);
  pending.set(id,{resolve,timeout});
  try{target.postMessage({id,bitmap},[bitmap])}
  catch{bitmap.close();clearTimeout(timeout);pending.delete(id);resolve(null);shutdown()}
 });
}

/** Cosine similarity (not a calibrated probability of object identity). */
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
