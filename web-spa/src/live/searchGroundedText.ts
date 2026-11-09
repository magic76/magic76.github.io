import {geminiKey} from "../lib/runtime";
import {extractGroundingSources,extractSearchSuggestions,type GroundingSource} from "./grounding";
export type GroundedAnswer={text:string;sources:GroundingSource[];searchSuggestions?:string};
/** BYOK direct request; do not store queries, citations or credentials. */
export async function searchGroundedText(prompt:string,system:string):Promise<GroundedAnswer>{
 const key=geminiKey();if(!key)throw Error("Gemini Key required");
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key="+encodeURIComponent(key),{
   method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,
   body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:prompt.slice(0,4500)}]}],
    tools:[{googleSearch:{}}],generationConfig:{temperature:0.35,maxOutputTokens:1600}})
  });
  if(!response.ok){
   // Distinguish rejected keys and quota exhaustion from unsupported Search.
   // Never include URLs, credentials or provider response bodies in UI errors.
   const status=response.status;
   const kind=status===401?"key":status===429?"quota":[400,403,404].includes(status)?"model":"service";
   throw Object.assign(new Error("Search request failed ("+status+")"),{kind,status});
  }
  const data=await response.json(),candidate=data?.candidates?.[0];
  const text=(candidate?.content?.parts||[]).map((part:{text?:unknown})=>typeof part.text==="string"?part.text:"").join("").trim();
  if(!text)throw Error("Empty response");
  return {text,sources:extractGroundingSources(candidate?.groundingMetadata),searchSuggestions:extractSearchSuggestions(candidate?.groundingMetadata)};
 }finally{clearTimeout(timer)}
}
