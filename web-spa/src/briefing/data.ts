import type {BriefingDay, BriefingIndex, BriefingItem} from "./types";
const base = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + "/";
const prefix = base + "briefings/";
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
export async function fetchIndex(): Promise<BriefingIndex> {
 const r = await fetch(prefix + "index.json", {cache:"no-cache"});
 if (!r.ok) throw Error("無法載入研究報告索引 ("+r.status+")");
 const v: unknown = await r.json();
 if (!v || typeof v !== "object" || !Array.isArray((v as BriefingIndex).days)) throw Error("報告索引格式錯誤");
 return {days:[...new Set((v as BriefingIndex).days.filter((d):d is string=>typeof d === "string" && isDate(d)))].sort().reverse()};
}
function validItem(v:unknown):v is BriefingItem {
 if (!v || typeof v !== "object") return false;
 const a=v as BriefingItem;
 return typeof a.id==="string" && typeof a.title==="string" && typeof a.summary==="string"
 && typeof a.publishedAt==="string" && typeof a.topic==="string"
 && Array.isArray(a.projects) && Array.isArray(a.sources) && Array.isArray(a.actions);
}
export async function fetchDay(date:string):Promise<BriefingDay> {
 if(!isDate(date)) throw Error("日期無效");
 const r=await fetch(prefix + encodeURIComponent(date)+".json",{cache:"no-cache"});
 if(!r.ok)throw Error("報告尚未產出 ("+r.status+")");
 const v:unknown=await r.json();
 if(!v || typeof v!=="object" || (v as BriefingDay).date!==date || !Array.isArray((v as BriefingDay).items))throw Error("報告格式錯誤");
 const day=v as BriefingDay;
 return {...day,edition:"public",items:day.items.filter(validItem)};
}
export function rankItems(items:BriefingItem[],query:string,project:string,saved:(id:string)=>boolean,onlySaved:boolean) {
 const q=query.trim().toLocaleLowerCase();
 return [...items].filter(x=>(project==="all"||x.projects.includes(project))&&(!onlySaved||saved(x.id))&&(!q||[x.title,x.summary,x.topic,...x.projects].join(" ").toLocaleLowerCase().includes(q)))
  .sort((a,b)=>b.score-a.score);
}
