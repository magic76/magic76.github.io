import {prepareKokoro,generateKokoro} from "./learningSpeechKokoro";
type KokoroRequest={id:number;type:"prepare"|"generate";language:string;text?:string;speed?:"normal"|"slow";webgpu?:boolean};
type KokoroScope={onmessage:((event:MessageEvent<KokoroRequest>)=>void)|null;postMessage:(message:unknown,transfer?:Transferable[])=>void};
const scope=self as unknown as KokoroScope;
let queue=Promise.resolve();
scope.onmessage=event=>{
 const request=event.data;
 queue=queue.catch(()=>{}).then(async()=>{
  try{
   if(request.type==="prepare"){
    await prepareKokoro(request.language,Boolean(request.webgpu));
    scope.postMessage({id:request.id,ok:true});return;
   }
   if(request.type==="generate"&&typeof request.text==="string"){
    const audio=await generateKokoro(request.text,request.language,request.speed||"normal",Boolean(request.webgpu));
    const buffer=await audio.arrayBuffer();
    scope.postMessage({id:request.id,ok:true,buffer},[buffer]);return;
   }
   throw Error("KOKORO_REQUEST_INVALID");
  }catch(error){
   scope.postMessage({id:request.id,ok:false,error:error instanceof Error?error.message:String(error)});
  }
 });
};
