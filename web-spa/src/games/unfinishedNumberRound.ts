import type {DigitCount,GuessRow} from "./numberGameEngine";

/** Device-local in-progress 1A2B only. Finished records remain in dailyNumberChallenge.ts. */
const KEY="crew_1a2b_unfinished_v1";
export type UnfinishedNumberRound={mode:"guess"|"reverse";digits:DigitCount;dailyDate:string|null;secret:string;history:GuessRow[];at:number};
const legalDigits=(value:unknown,digits:number)=>typeof value==="string"&&value.length===digits&&
 /^[0-9]+$/.test(value)&&value[0]!=="0"&&new Set(value).size===digits;
function valid(value:unknown):value is UnfinishedNumberRound{
 if(!value||typeof value!=="object")return false;
 const v=value as UnfinishedNumberRound;
 if(v.mode!=="guess"&&v.mode!=="reverse")return false;
 if(v.digits!==3&&v.digits!==4&&v.digits!==5)return false;
 if(!legalDigits(v.secret,v.digits)||!Number.isFinite(v.at)||v.at<=0||v.at>Date.now()+300000||Date.now()-v.at>30*86400000)return false;
 if(v.dailyDate!==null){
  if(v.mode!=="guess"||typeof v.dailyDate!=="string"||v.dailyDate!==new Date().toISOString().slice(0,10))return false;
  try{if(localStorage.getItem("crew_1a2b_daily_v1_"+v.dailyDate+"_"+v.digits))return false}catch{return false}
 }
 if(!Array.isArray(v.history)||v.history.length<1||v.history.length>=10)return false;
 return v.history.every((row,i)=>{
  if(!row||!legalDigits(row.guess,v.digits)||!row.result||!Number.isInteger(row.result.a)||!Number.isInteger(row.result.b)||
   row.result.a<0||row.result.b<0||row.result.a+row.result.b>v.digits||row.result.a===v.digits)return false;
  if(v.mode==="guess"){
   const a=[...row.guess].filter((char,j)=>char===v.secret[j]).length;
   const b=[...row.guess].filter(char=>v.secret.includes(char)).length-a;
   if(a!==row.result.a||b!==row.result.b)return false;
  }
  return i<10;
 });
}
export function readUnfinishedNumberRound():UnfinishedNumberRound|null{
 try{
  const value:unknown=JSON.parse(localStorage.getItem(KEY)||"null");
  return valid(value)?value:null;
 }catch{return null}
}
export function saveUnfinishedNumberRound(round:UnfinishedNumberRound){
 if(!valid(round))return;
 try{localStorage.setItem(KEY,JSON.stringify(round))}catch{/* Storage optional: gameplay remains usable. */}
}
export function clearUnfinishedNumberRound(){try{localStorage.removeItem(KEY)}catch{}}
