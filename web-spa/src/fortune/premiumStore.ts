import type {FortuneReading} from "./types";

// Local free-trial progress only. Never use these markers as payment entitlements.
const HISTORY_KEY="crew_fortune_readings_v2";
const TRIAL_KEY="koolo_fortune_website_trials_v1";
function readArray(key:string):unknown[]{
 try{const v=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(v)?v:[]}catch{return[]}
}
function validChart(v:unknown):v is FortuneReading{
 if(!v||typeof v!=="object"||Array.isArray(v))return false;
 const x=v as Partial<FortuneReading>;
 return typeof x.id==="string"&&x.id.length>0&&x.id.length<=200&&x.mode==="bazi"&&!!x.result&&typeof x.result==="object"&&!Array.isArray(x.result)&&typeof x.result.dayMaster==="string"&&x.result.dayMaster.length>0;
}
function savedCharts(){return readArray(HISTORY_KEY).filter(validChart)}
function trialIds(){return new Set(readArray(TRIAL_KEY).filter((v):v is string=>typeof v==="string"&&v.length>0&&v.length<=200))}
export function readPremiumChart(id:string){return savedCharts().find(x=>x.id===id)||null}
export function hasPremiumTrial(id:string){return trialIds().has(id)&&!!readPremiumChart(id)}
export function readPremiumTrials(){
 const ids=trialIds();
 return savedCharts().filter(x=>ids.has(x.id)).map(x=>({id:x.id,createdAt:typeof x.createdAt==="string"?x.createdAt:"",summary:typeof x.summary==="string"?x.summary:"",dayMaster:x.result.dayMaster}));
}
export function unlockPremiumTrial(id:string):boolean{
 const saved=savedCharts();if(!saved.some(x=>x.id===id))return false;
 const ids=trialIds();ids.add(id);
 try{localStorage.setItem(TRIAL_KEY,JSON.stringify(saved.filter(x=>ids.has(x.id)).map(x=>x.id)));return hasPremiumTrial(id)}catch{return false}
}
export function removePremiumTrial(id:string){try{localStorage.setItem(TRIAL_KEY,JSON.stringify([...trialIds()].filter(x=>x!==id)))}catch{}}
export function clearPremiumTrials(){try{localStorage.removeItem(TRIAL_KEY)}catch{}}
export function premiumHref(id?:string,chapter?:string){
 const q=new URLSearchParams();if(id)q.set("history",id);if(id&&chapter)q.set("chapter",chapter);
 return "/fortune/premium"+(q.size?"?"+q.toString():"");
}
