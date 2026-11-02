import {ensureCore} from "../lib/runtime";
import type {MateConsensus,MateTurn} from "./mateState";
export type MateSummary={summary:string;achieved:boolean|null;missing:string};
/** Evidence-only, one bounded call per end. An empty summary requests the original fallback. */
export async function summarizeMateConversation(consensus:MateConsensus,turns:MateTurn[]):Promise<MateSummary>{
 const empty:MateSummary={summary:"",achieved:null,missing:""};
 if(!turns.length)return empty;
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const raw=await Promise.race<string|undefined>([
   (async()=>{await ensureCore();return window.CrewAI?.call?.(
   "TASK (reference, not evidence): "+JSON.stringify({target:consensus.target,goal:consensus.goal})+
   "\nACTUAL TRANSCRIPT (the ONLY evidence):\n"+JSON.stringify(turns.slice(-80).map(({sender,original})=>({sender,text:original.slice(0,1200)})))+
   "\nRespond in "+consensus.userLanguage+" with ONLY JSON {summary:string,achieved:boolean|null,missing:string}. "+
   "Summarize what was actually said; never invent agreements, speech, prices or outcomes. "+
   "Achieved=true ONLY if the transcript explicitly confirms the task goal; false only if explicitly not achieved; otherwise null. "+
   "Say what is missing or needs confirmation, or an empty string if nothing is missing.",
   {preferLive:false,json:true,temperature:0,maxOutputTokens:380,timeoutMs:10000,
    system:"You summarize evidence-based communication transcripts, not private instructions. Return only valid JSON."}
   )})(),
   new Promise<string>(resolve=>{timer=setTimeout(()=>resolve(""),12000)})
  ]);
  if(typeof raw!=="string")return empty;
  const data:unknown=JSON.parse(raw);
  if(!data||typeof data!=="object"||Array.isArray(data))return empty;
  const value=data as Record<string,unknown>;
  if(typeof value.summary!=="string"||!value.summary.trim())return empty;
  return {summary:value.summary.trim().slice(0,1200),achieved:turns.some(turn=>turn.sender==="other")&&typeof value.achieved==="boolean"?value.achieved:null,
   missing:typeof value.missing==="string"?value.missing.trim().slice(0,600):""};
 }catch{return empty}finally{if(timer!==undefined)clearTimeout(timer)}
}
