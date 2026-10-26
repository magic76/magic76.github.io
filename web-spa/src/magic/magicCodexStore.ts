import {MAGIC_REACTIONS_ENABLED} from "./magicReactions";
// Persistence is intentionally independent from React and the renderer.
export const MAGIC_CODEX_KEY="crew.magic.codex";
const IDS=MAGIC_REACTIONS_ENABLED;
export type CodexEntry={id:string;at:number};
export type MagicCodexData={v:1;found:CodexEntry[]};
const clean=():MagicCodexData=>({v:1,found:[]});
export function parseMagicCodex(value:string|null):MagicCodexData{
 if(!value)return clean();try{const raw=JSON.parse(value);if(!raw||raw.v!==1||!Array.isArray(raw.found))return clean();
 const found:CodexEntry[]=[],seen=new Set<string>();for(const entry of raw.found){if(found.length===IDS.length)break;
  if(!entry||typeof entry.id!=="string"||!IDS.includes(entry.id as typeof IDS[number])||seen.has(entry.id)||!Number.isFinite(entry.at))continue;
  seen.add(entry.id);found.push({id:entry.id,at:entry.at})}
 return {v:1,found};}catch{return clean()}
}
const listeners=new Set<()=>void>();
function notify(){for(const cb of listeners)cb()}
export function readMagicCodex():MagicCodexData{
 try{return typeof localStorage==="undefined"?clean():parseMagicCodex(localStorage.getItem(MAGIC_CODEX_KEY))}catch{return clean()}
}
export function recordMagicReaction(id:string):boolean{
 if(!IDS.includes(id as typeof IDS[number]))return false;
 try{const data=readMagicCodex();if(data.found.some(x=>x.id===id))return false;
 data.found.push({id,at:Date.now()});localStorage.setItem(MAGIC_CODEX_KEY,JSON.stringify(data));notify();return true}catch{return false}
}
export function subscribeMagicCodex(listener:()=>void):()=>void{
 listeners.add(listener);const onStorage=(event:StorageEvent)=>{if(event.key===MAGIC_CODEX_KEY)listener()};
 if(typeof window!=="undefined")window.addEventListener("storage",onStorage);
 return ()=>{listeners.delete(listener);if(typeof window!=="undefined")window.removeEventListener("storage",onStorage)};
}
export function magicCodexContext():string{
 return "\nREACTION_CODEX (untrusted data): "+JSON.stringify({found:readMagicCodex().found.map(x=>x.id),total:IDS.length});
}
