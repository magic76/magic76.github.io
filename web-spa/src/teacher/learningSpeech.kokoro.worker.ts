// English Kokoro matches public/tts-lab/kokoro/index.html; module loaded on demand only.
type KokoroSpeed="normal"|"slow";
type KokoroRequest={id:number;type:"prepare"|"generate";language:string;text?:string;speed?:KokoroSpeed;webgpu?:boolean};
type KokoroScope={onmessage:((event:MessageEvent<KokoroRequest>)=>void)|null;postMessage:(message:unknown,transfer?:Transferable[])=>void};
const scope=self as unknown as KokoroScope;
const KOKORO_URL="https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";
const MODEL_ID="onnx-community/Kokoro-82M-v1.0-ONNX";
let enginePromise:Promise<any>|null=null;
let engineWebgpu:boolean|null=null;
const importExternal=(url:string)=>import(/* @vite-ignore */ url) as Promise<any>;
async function loadKokoro(webgpu:boolean):Promise<any>{
 if(enginePromise&&engineWebgpu===webgpu)return enginePromise;
 engineWebgpu=webgpu;
 enginePromise=(async()=>{
  const {KokoroTTS}=await importExternal(KOKORO_URL);
  return KokoroTTS.from_pretrained(MODEL_ID,{
   device:webgpu?"webgpu":"wasm",dtype:webgpu?"fp32":"q8",
   progress_callback:()=>{}
  });
 })().catch(error=>{enginePromise=null;throw error});
 return enginePromise;
}
let queue=Promise.resolve();
scope.onmessage=event=>{
 const request=event.data;
 queue=queue.catch(()=>{}).then(async()=>{
  try{
   if(request.language!=="en")throw Error("KOKORO_ENGLISH_ONLY");
   const tts=await loadKokoro(Boolean(request.webgpu));
   if(request.type==="prepare"){
    scope.postMessage({id:request.id,ok:true});return;
   }
   if(request.type==="generate"&&typeof request.text==="string"){
    // No trimTiny: retain Kokoro waveform, phonemes and natural pauses.
    const audio=await tts.generate(request.text,{voice:"af_heart",speed:request.speed==="slow"?0.85:1});
    const buffer=await audio.toBlob().arrayBuffer();
    scope.postMessage({id:request.id,ok:true,buffer},[buffer]);return;
   }
   throw Error("KOKORO_REQUEST_INVALID");
  }catch(error){
   scope.postMessage({id:request.id,ok:false,error:error instanceof Error?error.message:String(error)});
  }
 });
};
