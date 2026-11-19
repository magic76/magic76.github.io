import {geminiKey} from "../lib/runtime";
import {nativeLanguageName,type NativeLanguage} from "../teacher/teacherLocale";
const ENDPOINT="https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:streamGenerateContent?alt=sse";
const CACHE_LIMIT=50;
const cache=new Map<string,string>();
export async function translateCallSentence(sentence:string,source:string,target:NativeLanguage,onText:(value:string)=>void,signal:AbortSignal):Promise<string>{
 const id=source+"|"+target+"|"+sentence;
 const hit=cache.get(id);
 if(hit!==undefined){cache.delete(id);cache.set(id,hit);onText(hit);return hit}
 for(let attempt=0;attempt<2;attempt++){
 const controller=new AbortController();
 const stop=()=>controller.abort();
 if(signal.aborted)stop();else signal.addEventListener("abort",stop,{once:true});
 const timeout=setTimeout(stop,attempt===0?6500:8000);
 try{
  const body=(thinking:boolean)=>JSON.stringify({systemInstruction:{parts:[{text:"Translate only the actual spoken sentence from "+source+" into "+nativeLanguageName(target)+". Return only the translation; do not invent dialogue."}]},contents:[{role:"user",parts:[{text:sentence}]}],generationConfig:{temperature:0,maxOutputTokens:200,...(thinking?{thinkingConfig:{thinkingLevel:"minimal"}}:{})}});
  let response=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":geminiKey()},body:body(true),signal:controller.signal});
  if(response.status===400){
   const message=await response.text();
   if(/thinkingConfig|thinkingLevel|thinking/i.test(message))response=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":geminiKey()},body:body(false),signal:controller.signal});
   else throw new Error("failed");
  }
  if(response.status===401||response.status===403)throw new Error("key");
  if(!response.ok||!response.body)throw new Error(response.status===429||response.status>=500?"retryable":"failed");
  const reader=response.body.getReader(),decoder=new TextDecoder();
  let buffer="",result="";
  const consume=(line:string)=>{
   if(!line.startsWith("data:"))return;
   const payload=line.slice(5).trim();if(!payload||payload==="[DONE]")return;
   let data:unknown;
   try{data=JSON.parse(payload)}catch{return}
   const parts=(data as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>} ).candidates?.[0]?.content?.parts;
   const next=parts?.map(p=>p.text||"").join("")||"";
   if(next){result+=next;onText(result)}
  };
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   buffer+=decoder.decode(value,{stream:true});
   const lines=buffer.split(/\r?\n/);buffer=lines.pop()||"";
   for(const line of lines)consume(line);
  }
  buffer+=decoder.decode();if(buffer)consume(buffer);
  const value=result.trim();if(!value)throw new Error("failed");
  cache.set(id,value);if(cache.size>CACHE_LIMIT)cache.delete(cache.keys().next().value!);
  return value;
 }catch(error){
  if(signal.aborted)throw error;
  if(attempt===1||error instanceof Error&&error.message==="key")throw error;
  if(controller.signal.aborted||error instanceof Error&&error.message==="retryable"){
   await new Promise<void>((resolve,reject)=>{
    const timer=setTimeout(()=>{signal.removeEventListener("abort",cancel);resolve()},250);
    const cancel=()=>{clearTimeout(timer);reject(new DOMException("Aborted","AbortError"))};
    signal.addEventListener("abort",cancel,{once:true});
    if(signal.aborted)cancel();
   });
   continue;
  }
  throw error;
 }finally{clearTimeout(timeout);signal.removeEventListener("abort",stop);controller.abort()}
 }
 throw new Error("failed");
}
