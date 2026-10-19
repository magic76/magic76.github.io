import type {Age,Note} from "./timeline";
import {friendMemoryEnabled} from "../friends/friendMemory";

/** Additive metadata: existing v1 keepsakes remain the canonical prompt source.
 * Never duplicate private conversation history or auto-save transcript turns.
 */
const KEY="crew_timeline_mira_echo_meta_v2";
type EchoMeta={age:Age;text:string;savedAt:number};
export type TimelineEcho=Note & {savedAt?:number};
const normalized=(text:string)=>text.replace(/[\r\n\t]/g," ").trim().slice(0,240);
function read():EchoMeta[]{
 if(typeof localStorage==="undefined")return[];
 try{
  const stored:unknown=JSON.parse(localStorage.getItem(KEY)||"[]");
  if(!Array.isArray(stored))return[];
  return stored.filter((v):v is EchoMeta=>Boolean(v&&typeof v==="object"&&
   typeof v.age==="number"&&typeof v.text==="string"&&typeof v.savedAt==="number"))
   .slice(-12);
 }catch{return[];}
}
export function recordTimelineEcho(age:Age,text:string):void{
 if(!friendMemoryEnabled()||typeof localStorage==="undefined")return;
 const value=normalized(text);if(value.length<4)return;
 const list=read().filter(x=>x.age!==age||x.text!==value);
 try{localStorage.setItem(KEY,JSON.stringify([...list,{age,text:value,savedAt:Date.now()}].slice(-12)));}
 catch{/* v1 save still succeeds when metadata storage is unavailable. */}
}
/** Only previously saved, consented v1 notes are eligible, so stale metadata
 * cannot resurrect deleted/opted-out memories.
 */
export function timelineEchoesAtAge(age:Age,knownNotes:Note[]):TimelineEcho[]{
 if(!friendMemoryEnabled())return[];
 const metadata=read();
 return knownNotes.filter(n=>n.age<age).map(n=>({
  ...n,savedAt:metadata.find(m=>m.age===n.age&&m.text===n.text)?.savedAt
 })).sort((a,b)=>b.age-a.age);
}
export function deleteTimelineEcho(age:Age,text:string):void{
 if(typeof localStorage==="undefined")return;
 const value=normalized(text);
 try{localStorage.setItem(KEY,JSON.stringify(read().filter(n=>n.age!==age||n.text!==value)));}
 catch{/* v1 deletion remains authoritative. */}
}
export function clearTimelineEchoes():void{
 if(typeof localStorage!=="undefined")try{localStorage.removeItem(KEY);}catch{/* Optional metadata. */}
}
