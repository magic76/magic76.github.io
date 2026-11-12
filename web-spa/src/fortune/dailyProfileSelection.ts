import {dailyProfileHash} from "./dailyCard";
import type {FortuneProfile,FortuneMode} from "./types";

/** An optional, device-local preference; existing fortune records are never modified. */
export const HOME_DAILY_CHART_KEY="crew_home_daily_chart_v1";
export type DailyChart={hash:string;profile:Partial<FortuneProfile>;mode:FortuneMode};
type Preference={selectedHash?:string;selfHash?:string;manualOverride?:boolean};
const sha=/^[a-f0-9]{64}$/;
function json(key:string):unknown{
 try{return typeof localStorage!=="undefined"?JSON.parse(localStorage.getItem(key)||"null"):null;}catch{return null;}
}
function dateValid(v:unknown):v is string{
 if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
 const [y,m,d]=v.split("-").map(Number),date=new Date(Date.UTC(y,m-1,d));
 return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;
}
function chartProfile(value:unknown):value is Partial<FortuneProfile>{
 return Boolean(value&&typeof value==="object"&&dateValid((value as Partial<FortuneProfile>).birthDate));
}
function modeOf(value:unknown):FortuneMode{
 return value==="bazi"||value==="vedic"?value:"tarot";
}
export function readDailyProfiles():DailyChart[]{
 const source:{profile:unknown;mode:FortuneMode}[]=[];
 const primary=json("crew_fortune_profile_v2");
 if(chartProfile(primary))source.push({profile:primary,mode:"tarot"});
 const presets=json("crew_fortune_presets_v1");
 if(Array.isArray(presets)){
  const sorted=presets.filter(v=>v&&typeof v==="object"&&chartProfile(v.profile))
   .sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
  for(const row of sorted)source.push({profile:row.profile,mode:modeOf(row.mode)});
 }
 const readings=json("crew_fortune_readings_v2");
 if(Array.isArray(readings))for(const row of readings){
  if(row&&typeof row==="object"&&chartProfile(row.profile))source.push({profile:row.profile,mode:modeOf(row.mode)});
 }
 const seen=new Set<string>(),charts:DailyChart[]=[];
 for(const item of source){
  const profile=item.profile as Partial<FortuneProfile>,hash=dailyProfileHash(profile);
  if(seen.has(hash)){
   const existing=charts.find(x=>x.hash===hash);
   if(existing&&existing.mode==="tarot"&&item.mode!=="tarot")existing.mode=item.mode;
   continue;
  }
  seen.add(hash);charts.push({hash,profile,mode:item.mode});
 }
 return charts;
}
export function readDailyPreference():Preference{
 const raw=json(HOME_DAILY_CHART_KEY);
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return {};
 const pref=raw as Preference;
 return { ...(typeof pref.selectedHash==="string"&&sha.test(pref.selectedHash)?{selectedHash:pref.selectedHash}:{}),
  ...(typeof pref.selfHash==="string"&&sha.test(pref.selfHash)?{selfHash:pref.selfHash}:{}),
  ...(pref.manualOverride===true?{manualOverride:true}:{})};
}
export function chooseDailyProfile(charts:DailyChart[],requestedHash?:string|null):DailyChart|undefined{
 // An explicit deep link may only select an exact local profile hash.
 if(requestedHash!==undefined&&requestedHash!==null){
  return sha.test(requestedHash)?charts.find(chart=>chart.hash===requestedHash):undefined;
 }
 const pref=readDailyPreference();
 return (pref.manualOverride?charts.find(x=>x.hash===pref.selectedHash):undefined)||
  charts.find(x=>x.hash===pref.selfHash)||charts.find(x=>x.hash===pref.selectedHash)||charts[0];
}
export function saveDailyProfileChoice(hash:string,markSelf=false):void{
 if(!sha.test(hash)||!readDailyProfiles().some(chart=>chart.hash===hash))return;
 const old=readDailyPreference();
 try{localStorage.setItem(HOME_DAILY_CHART_KEY,JSON.stringify({selectedHash:hash,...(markSelf?{selfHash:hash}:old.selfHash?{selfHash:old.selfHash}:{}),manualOverride:!markSelf}));}
 catch{/* private browsing / disabled storage */}
}
export function dailyProfileLabel(chart:DailyChart,locale:string,kindLabel:string):string{
 const [year,month,day]=chart.profile.birthDate!.split("-").map(Number);
 const date=new Intl.DateTimeFormat(locale,{year:"numeric",month:"short",day:"numeric"}).format(new Date(Date.UTC(year,month-1,day,12)));
 const time=typeof chart.profile.birthTime==="string"&&/^\d{2}:\d{2}$/.test(chart.profile.birthTime)?" "+chart.profile.birthTime:"";
 return date+time+" · "+kindLabel;
}
