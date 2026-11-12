/** URL-safe, stable IDs. Date selection uses the visitor's LOCAL calendar day. */
export const DAILY_QUOTE_IDS=Array.from({length:30},(_,i)=>`q${String(i+1).padStart(2,"0")}`);
const QUOTE_IDS=new Set(DAILY_QUOTE_IDS);
export function getDailyQuote(id:string|null):{id:string}|undefined{
 return id&&QUOTE_IDS.has(id)?{id}:undefined;
}
export function pickDailyQuote(date:Date):{id:string}{
 const localDay=Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
 return {id:DAILY_QUOTE_IDS[((localDay%DAILY_QUOTE_IDS.length)+DAILY_QUOTE_IDS.length)%DAILY_QUOTE_IDS.length]};
}
