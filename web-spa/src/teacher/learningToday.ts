import {history} from "../lib/runtime";

export type LearningToday={
 practiceSeconds:number;sessionCount:number;progressPercent:number;
};
const GOAL_KEY="crew_web_daily_goal_minutes_v1";
export const DAILY_GOALS=[5,10,15,20,30] as const;
export const DEFAULT_GOAL_MINUTES=15;

/** Native Teacher counts real speaking seconds, not fabricated "daily activity".
 * The Web equivalent only counts stored Teacher sessions with actual learner turns.
 * WebView's local data is independent of Android SharedPreferences. */
export function calculateTodayLearning(records:unknown,goalMinutes:number,now=new Date()):LearningToday{
 const today=now.toDateString();
 let seconds=0,sessionCount=0;
 if(Array.isArray(records))for(const item of records){
  if(!item||typeof item!=="object")continue;
  const stamp=typeof item.ts==="string"?new Date(item.ts):null;
  if(!stamp||!Number.isFinite(stamp.getTime())||stamp.toDateString()!==today)continue;
  const turns=Array.isArray(item.turns)?item.turns:[];
  if(!turns.some((turn:unknown)=>turn&&typeof turn==="object"
    &&typeof (turn as {input?:unknown}).input==="string"
    &&(turn as {input:string}).input.trim().length>0))continue;
  const ms=Number(item.durationMs);
  if(!Number.isFinite(ms)||ms<=0)continue;
  seconds+=Math.round(Math.min(ms,4*60*60*1000)/1000);
  sessionCount++;
 }
 const goal=Math.max(1,goalMinutes)*60;
 return{practiceSeconds:seconds,sessionCount,progressPercent:Math.max(0,Math.min(100,Math.round(100*seconds/goal)))};
}

export function getDailyGoalMinutes():number{
 try{
  const saved=Number(localStorage.getItem(GOAL_KEY));
  return DAILY_GOALS.find(n=>n===saved)||DEFAULT_GOAL_MINUTES;
 }catch{return DEFAULT_GOAL_MINUTES}
}
export function setDailyGoalMinutes(value:number):void{
 if(!DAILY_GOALS.some(n=>n===value))return;
 try{localStorage.setItem(GOAL_KEY,String(value))}catch{/* Browser storage is optional. */}
}
export function currentLearningToday(goalMinutes:number):LearningToday{
 return calculateTodayLearning(history("teacher"),goalMinutes);
}
