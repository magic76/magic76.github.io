import type {DailyCard,DailyKind} from "./dailyCard";
import {localDateKey} from "./dailyCard";

export const DAILY_CACHE_KEY="crew_fortune_daily_v1";
export const DAILY_COPY_REVISION=4;
export const DAILY_KIND_KEY="crew_fortune_daily_kind_v1";
export const DAILY_STREAK_KEY="crew_fortune_daily_streak_v1";
export type DailyRecord={card:DailyCard;ai?:string;seenAt:string;locale?:string;copyRevision?:number};
export type DailyCache=Record<string,Record<string,DailyRecord>>;
export type DailyStreak={streak:number;best:number;lastSeen:string};
const emptyStreak=():DailyStreak=>({streak:0,best:0,lastSeen:""});
function readJSON(key:string):unknown{
 try{return typeof localStorage!=="undefined"?JSON.parse(localStorage.getItem(key)||"null"):null}
 catch{return null}
}
function writeJSON(key:string,value:unknown){
 try{if(typeof localStorage!=="undefined")localStorage.setItem(key,JSON.stringify(value));}catch{/* storage may be restricted */}
}
function validDate(key:string){return /^\d{4}-\d{2}-\d{2}$/.test(key);}
function dayNumber(key:string):number{
 if(!validDate(key))return NaN;
 const [y,m,d]=key.split("-").map(Number);
 return Math.floor(Date.UTC(y,m-1,d)/86400000);
}
export function readDailyCache():DailyCache{
 const data=readJSON(DAILY_CACHE_KEY);
 if(!data||typeof data!=="object"||Array.isArray(data))return {};
 const out:DailyCache={};
 for(const [date,entries] of Object.entries(data)){
  if(!validDate(date)||!entries||typeof entries!=="object"||Array.isArray(entries))continue;
  const safe:Record<string,DailyRecord>={};
  for(const [key,value] of Object.entries(entries)){
   const v=value as Partial<DailyRecord>|null;
   if(!v||v.card?.version!==1||v.card?.date!==date||!Array.isArray(v.card?.basis))continue;
   safe[key]={card:v.card,seenAt:typeof v.seenAt==="string"?v.seenAt:date,
    ...(typeof v.ai==="string"&&v.ai?{ai:v.ai}:{}),...(typeof v.locale==="string"?{locale:v.locale}:{}),...(v.copyRevision===DAILY_COPY_REVISION?{copyRevision:DAILY_COPY_REVISION}:{})};
  }
  if(Object.keys(safe).length)out[date]=safe;
 }
 return out;
}
export function cacheSlot(kind:DailyKind,profileHash:string):string{return kind+":"+profileHash;}
export function readCachedDaily(date:string,kind:DailyKind,profileHash:string):DailyRecord|null{
 return readDailyCache()[date]?.[cacheSlot(kind,profileHash)]||null;
}
export function pruneDailyCache(cache:DailyCache,today=localDateKey()):DailyCache{
 const current=dayNumber(today),out:DailyCache={};
 for(const [date,items] of Object.entries(cache)){
  const age=current-dayNumber(date);
  if(Number.isFinite(age)&&age>=0&&age<14)out[date]=items;
 }
 return out;
}
export function saveCachedDaily(card:DailyCard,profileHash:string,ai?:string,locale?:string):DailyRecord{
 const cache=pruneDailyCache(readDailyCache(),card.date),key=cacheSlot(card.kind,profileHash);
 const previous=cache[card.date]?.[key];
 const entry:DailyRecord={card,seenAt:previous?.seenAt||card.date,
  ...(ai?{ai}:previous?.ai?{ai:previous.ai}:{}),...(locale?{locale}:previous?.locale?{locale:previous.locale}:{}),copyRevision:DAILY_COPY_REVISION};
 cache[card.date]={...cache[card.date],[key]:entry};
 writeJSON(DAILY_CACHE_KEY,cache);
 return entry;
}
export function findExistingAiForKind(date:string,kind:DailyKind):{profileHash:string;ai:string}|null{
 const matches=Object.entries(readDailyCache()[date]||{});
 const found=matches.find(([key,v])=>key.startsWith(kind+":")&&typeof v.ai==="string"&&v.ai.length>0);
 return found?{profileHash:found[0].slice(kind.length+1),ai:found[1].ai!}:null;
}
/** Null means no human tab choice has ever been saved. */
export function readDailyKindChoice():DailyKind|null{
 try{const choice=localStorage.getItem(DAILY_KIND_KEY);return choice==="bazi"||choice==="numerology"?choice:null;}
 catch{return null;}
}
/** All daily surfaces share the same profile-based default and manual override. */
export function resolveDailyKind(mode:"bazi"|"tarot"|"vedic",birthTime?:string|null,choice:DailyKind|null=readDailyKindChoice()):DailyKind{
 if(choice)return choice==="bazi"&&birthTime?"bazi":"numerology";
 return mode==="bazi"&&birthTime?"bazi":"numerology";
}
export function readDailyKind():DailyKind{
 try{return localStorage.getItem(DAILY_KIND_KEY)==="bazi"?"bazi":"numerology";}catch{return "numerology";}
}
export function saveDailyKind(kind:DailyKind):DailyKind{
 try{localStorage.setItem(DAILY_KIND_KEY,kind);}catch{/* optional */}
 return kind;
}
export function readDailyStreak():DailyStreak{
 const raw=readJSON(DAILY_STREAK_KEY) as Partial<DailyStreak>|null;
 if(!raw||typeof raw!=="object")return emptyStreak();
 return {streak:Number.isInteger(raw.streak)&&Number(raw.streak)>0?Number(raw.streak):0,
  best:Number.isInteger(raw.best)&&Number(raw.best)>0?Number(raw.best):0,
  lastSeen:typeof raw.lastSeen==="string"&&validDate(raw.lastSeen)?raw.lastSeen:""};
}
export function markDailySeen(today=localDateKey()):DailyStreak{
 const old=readDailyStreak();
 const diff=dayNumber(today)-dayNumber(old.lastSeen);
 if(diff===0)return old;
 // Do not let a stale tab roll the streak backwards.
 if(Number.isFinite(diff)&&diff<0)return old;
 const streak=diff===1?old.streak+1:1;
 const next={streak,best:Math.max(old.best,streak),lastSeen:today};
 writeJSON(DAILY_STREAK_KEY,next);
 return next;
}

/** A visit is not a completed exploration; record only explicit participation. */
export const DAILY_COMPLETED_KEY="crew_fortune_daily_completed_v1";
export const DAILY_COMPLETE_STREAK_KEY="crew_fortune_daily_complete_streak_v1";
export function readDailyCompletionStreak():DailyStreak{
 const raw=readJSON(DAILY_COMPLETE_STREAK_KEY) as Partial<DailyStreak>|null;
 if(!raw||typeof raw!=="object")return emptyStreak();
 return {streak:Number.isInteger(raw.streak)&&Number(raw.streak)>0?Number(raw.streak):0,
  best:Number.isInteger(raw.best)&&Number(raw.best)>0?Number(raw.best):0,
  lastSeen:typeof raw.lastSeen==="string"&&validDate(raw.lastSeen)?raw.lastSeen:""};
}
function completionKey(date:string,kind:DailyKind,hash:string){return date+":"+kind+":"+hash;}
function completedRecords():Record<string,true>{
 const raw=readJSON(DAILY_COMPLETED_KEY);
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return {};
 const out:Record<string,true>={};
 for(const [key,value] of Object.entries(raw))if(value===true&&/^\d{4}-\d{2}-\d{2}:(bazi|numerology):[a-f0-9]{64}$/.test(key))out[key]=true;
 return out;
}
export function isDailyCompleted(date:string,kind:DailyKind,hash:string):boolean{
 return Boolean(completedRecords()[completionKey(date,kind,hash)]);
}
export function completeDailyExploration(date:string,kind:DailyKind,hash:string):DailyStreak{
 if(!hash||!validDate(date))return readDailyCompletionStreak();
 if(isDailyCompleted(date,kind,hash))return readDailyCompletionStreak();
 const old=completedRecords(),out:Record<string,true>={},today=dayNumber(date);
 for(const [key,value] of Object.entries(old)){
  const age=today-dayNumber(key.slice(0,10));
  if(Number.isFinite(age)&&age>=0&&age<30)out[key]=value;
 }
 out[completionKey(date,kind,hash)]=true;
 writeJSON(DAILY_COMPLETED_KEY,out);
 const oldStreak=readDailyCompletionStreak();
 const diff=dayNumber(date)-dayNumber(oldStreak.lastSeen);
 if(Number.isFinite(diff)&&diff<0)return oldStreak;
 const streak=diff===1?oldStreak.streak+1:1;
 const next={streak,best:Math.max(oldStreak.best,streak),lastSeen:date};
 writeJSON(DAILY_COMPLETE_STREAK_KEY,next);
 return next;
}
export function recentDailyExplorations(date:string,kind:DailyKind,hash:string):Array<{date:string;completed:boolean}>{
 if(!validDate(date))return [];
 const [y,m,d]=date.split("-").map(Number),today=new Date(y,m-1,d,12),done=completedRecords();
 return Array.from({length:7},(_,index)=>{
  const current=new Date(today);current.setDate(current.getDate()-(6-index));
  const key=localDateKey(current);
  return {date:key,completed:Boolean(done[completionKey(key,kind,hash)])};
 });
}
