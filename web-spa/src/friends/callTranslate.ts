import {geminiKey} from "../lib/runtime";
import {nativeLanguageName,type NativeLanguage} from "../teacher/teacherLocale";
const ENDPOINT="https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:streamGenerateContent?alt=sse";
const CACHE_LIMIT=50;
const cache=new Map<string,string>();
export async function translateCallSentence(sentence:string,source:string,target:NativeLanguage,onText:(value:string)=>void,signal:AbortSignal):Promise<string>{
 const id=source+"|"+target+"|"+sentence;
 const hit=cache.get(id);
 if(hit!==undefined){cache.delete(id);cache.set(id,hit);onText(hit);return hit}
 const body=(thinking:boolean)=>JSON.stringify({systemInstruction:{parts:[{text:"Translate only the actual spoken sentence from "+source+" into "+nativeLanguageName(target)+". Return only the translation; do not invent dialogue."+(target==="zh-TW"?" Use ONLY Traditional Chinese characters and Taiwan usage. NEVER use Simplified Chinese characters. Examples: 一个→一個, 从→從, 说→說.":"")}]},contents:[{role:"user",parts:[{text:sentence}]}],generationConfig:{temperature:0,maxOutputTokens:200,...(thinking?{thinkingConfig:{thinkingLevel:"minimal"}}:{})}});
 const request=async(thinking:boolean):Promise<{status:number;text:string}>=>{
  if(signal.aborted)throw new DOMException("Aborted","AbortError");
  const controller=new AbortController();
  const stop=()=>controller.abort();
  signal.addEventListener("abort",stop,{once:true});
  const timeout=setTimeout(stop,6000);
  try{
   const response=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":geminiKey()},body:body(thinking),signal:controller.signal});
   // Consume the response within this request's own deadline, including streaming.
   if(response.status===401||response.status===403)throw new Error("key");
   if(!response.ok)return {status:response.status,text:await response.text()};
   if(!response.body)throw new Error("failed");
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
   // Return text in a Response so 400 thinking fallback uses the same request wrapper.
   return {status:200,text:value};
  }finally{clearTimeout(timeout);signal.removeEventListener("abort",stop);controller.abort()}
 };
 let lastError:unknown;
 for(let attempt=0;attempt<2;attempt++){
  if(signal.aborted)throw new DOMException("Aborted","AbortError");
  try{
   let response=await request(true);
   if(response.status===400){
    const message=response.text;
    if(/thinkingConfig|thinkingLevel|thinking/i.test(message)){
     if(signal.aborted)throw new DOMException("Aborted","AbortError");
     response=await request(false);
    }else throw new Error("failed");
   }
   if(response.status!==200)throw new Error("failed");
   const value=response.text.trim();
   if(!value)throw new Error("failed");
   if(signal.aborted)throw new DOMException("Aborted","AbortError");
   cache.set(id,value);if(cache.size>CACHE_LIMIT)cache.delete(cache.keys().next().value!);
   return value;
  }catch(error){
   if(signal.aborted)throw error;
   if(error instanceof Error&&error.message==="key")throw error;
   lastError=error;
  }
 }
 throw lastError instanceof Error?lastError:new Error("failed");
}
