import type {FortuneMode} from "./types";

// The report directory must work without loading remote astrology engines.
// Keep unreadable / legacy records intact in storage and ignore them only in the UI.
export type FortuneHistoryPreview={
 id:string;mode:FortuneMode;summary:string;createdAt:string
};
export function readFortuneHistoryPreviews(limit=30):FortuneHistoryPreview[]{
 try{
  const raw=JSON.parse(localStorage.getItem("crew_fortune_readings_v2")||"[]");
  if(!Array.isArray(raw))return[];
  return raw.filter((x:unknown):x is Record<string,unknown>=>Boolean(x)&&typeof x==="object"&&!Array.isArray(x))
   .filter(x=>typeof x.id==="string"&&x.id.length>0&&x.id.length<=200&&(x.mode==="bazi"||x.mode==="tarot"||x.mode==="vedic"))
   .slice(0,limit)
   .map(x=>({
    id:x.id as string,
    mode:x.mode as FortuneMode,
    summary:typeof x.summary==="string"?x.summary:"",
    createdAt:typeof x.createdAt==="string"?x.createdAt:""
   }));
 }catch{return []}
}

/** Remove one saved reading without discarding unrelated or unreadable entries. */
export function deleteFortuneHistoryReading(id:string):boolean{
 try{
  const raw=JSON.parse(localStorage.getItem("crew_fortune_readings_v2")||"[]");
  if(!Array.isArray(raw))return false;
  const next=raw.filter((entry:unknown)=>!(entry&&typeof entry==="object"&&!Array.isArray(entry)&&(entry as {id?:unknown}).id===id));
  if(next.length===raw.length)return false;
  localStorage.setItem("crew_fortune_readings_v2",JSON.stringify(next));
  const last=localStorage.getItem("crew_fortune_last_reading");
  if(last){try{if(JSON.parse(last)?.id===id)localStorage.removeItem("crew_fortune_last_reading")}catch{/* preserve unreadable last-reading data */}}
  return true;
 }catch{return false}
}
