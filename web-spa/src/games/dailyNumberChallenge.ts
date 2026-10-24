import {secretNumber,type DigitCount} from "./numberGameEngine";

/** One public UTC challenge per day/difficulty. No backend, key or user account needed. */
export function dailyNumberDate(at=new Date()){return at.toISOString().slice(0,10);}
export function dailyNumberSecret(digits:DigitCount,date:string):string{
 let seed=2166136261;
 for(const char of "crew-1a2b-v1:"+date+":"+digits)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
 return secretNumber(digits,random);
}
export type NumberRecord={best:number|null;played:number;wins:number;streak:number;lastDaily:string};
const empty=():NumberRecord=>({best:null,played:0,wins:0,streak:0,lastDaily:""});
const recordKey=(digits:DigitCount)=>"crew_1a2b_record_v1_"+digits;
const dailyKey=(digits:DigitCount,date:string)=>"crew_1a2b_daily_v1_"+date+"_"+digits;
export function readNumberRecord(digits:DigitCount):NumberRecord{
 try{
  if(typeof localStorage==="undefined")return empty();
  const raw=JSON.parse(localStorage.getItem(recordKey(digits))||"null") as Partial<NumberRecord>|null;
  if(!raw||typeof raw!=="object")return empty();
  return {best:typeof raw.best==="number"&&raw.best>=1&&raw.best<=10?raw.best:null,
   played:Number.isInteger(raw.played)&&Number(raw.played)>=0?Number(raw.played):0,
   wins:Number.isInteger(raw.wins)&&Number(raw.wins)>=0?Number(raw.wins):0,
   streak:Number.isInteger(raw.streak)&&Number(raw.streak)>=0?Number(raw.streak):0,
   lastDaily:typeof raw.lastDaily==="string"?raw.lastDaily:""};
 }catch{return empty();}
}
export function readDailyResult(digits:DigitCount,date:string):{attempts:number;won:boolean}|null{
 try{
  if(typeof localStorage==="undefined")return null;
  const raw=JSON.parse(localStorage.getItem(dailyKey(digits,date))||"null") as {attempts?:number;won?:boolean}|null;
  return raw&&Number.isInteger(raw.attempts)&&Number(raw.attempts)>=1&&Number(raw.attempts)<=10&&typeof raw.won==="boolean"?
   {attempts:Number(raw.attempts),won:raw.won}:null;
 }catch{return null;}
}
export function saveNumberResult(digits:DigitCount,attempts:number,won:boolean,date:string|null):NumberRecord{
 const old=readNumberRecord(digits);
 if(typeof localStorage==="undefined"||(date&&readDailyResult(digits,date)))return old;
 const next:NumberRecord={...old,played:old.played+1,wins:old.wins+(won?1:0),
  best:won?Math.min(old.best??Infinity,attempts):old.best};
 if(date){
  const diff=old.lastDaily?Math.round((Date.parse(date+"T00:00:00Z")-Date.parse(old.lastDaily+"T00:00:00Z"))/86400000):0;
  next.streak=diff===1?old.streak+1:1;next.lastDaily=date;
 }
 try{
  if(date)localStorage.setItem(dailyKey(digits,date),JSON.stringify({attempts,won}));
  localStorage.setItem(recordKey(digits),JSON.stringify(next));
 }catch{/* Optional persistence; never block play. */}
 return next;
}
