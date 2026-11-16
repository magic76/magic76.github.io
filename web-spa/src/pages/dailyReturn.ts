/** A page-view marker only. It never changes the completed-action streak. */
export const DAILY_LAST_VIEW_KEY="crew_fortune_daily_last_seen_v1";
export function localDailyDate(now=new Date()):string{
 return [now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");
}
function isValidDay(day:string|null):day is string{
 if(!day||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
 const [year,month,date]=day.split("-").map(Number);
 const test=new Date(year,month-1,date);
 return year>=1000&&test.getFullYear()===year&&test.getMonth()===month-1&&test.getDate()===date;
}
export function readDailyViewDate():string|null{
 try{const value=localStorage.getItem(DAILY_LAST_VIEW_KEY);return isValidDay(value)?value:null;}
 catch{return null;}
}
export function rememberDailyView(date:string):void{
 if(!isValidDay(date))return;
 try{localStorage.setItem(DAILY_LAST_VIEW_KEY,date);}catch{/* Storage may be denied. */}
}
export function hasNewDailyFortune(today=localDailyDate()):boolean{
 if(!isValidDay(today))return false;
 const last=readDailyViewDate();
 return Boolean(last&&last<today);
}
