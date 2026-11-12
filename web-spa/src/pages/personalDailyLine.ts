import i18n,{loadUiNamespace} from "../i18n";
import {buildDailyCard,localDateKey,type DailyKind} from "../fortune/dailyCard";
import {readDailyKind} from "../fortune/dailyStore";
import {readDailyProfiles,chooseDailyProfile} from "../fortune/dailyProfileSelection";

/** Only imported after a known saved birth chart, never from the initial home graph. */
export async function personalDailyLine(language:string,date=localDateKey(),requestedHash?:string|null){
 const chart=chooseDailyProfile(readDailyProfiles(),requestedHash);
 if(!chart)return null;
 await loadUiNamespace("fortuneDaily");
 const translate=(key:string,values?:Record<string,string|number>)=>String(i18n.t(key,{ns:"fortuneDaily",lng:language,...values}));
 const preferred:DailyKind=readDailyKind()==="bazi"&&chart.profile.birthTime?"bazi":"numerology";
 const input={profile:chart.profile,localDate:date,lang:language,translate,almanac:"optional" as const};
 let kind:DailyKind=preferred;
 let result=buildDailyCard({...input,kind});
 // BaZi calculation requires runtime scripts that the homepage intentionally never loads.
 // Use the same existing numerology method as the Fortune card's alternative instead.
 if("status" in result&&kind==="bazi"){
  kind="numerology";
  result=buildDailyCard({...input,kind});
 }
 if("status" in result)return null;
 return {text:result.theme,hash:chart.hash,kind,date,language,card:{
  date:result.date,kind:result.kind,headline:result.headline,theme:result.theme,
  do:result.do,avoid:result.avoid,luckyColor:{name:result.luckyColor.name},basis:result.basis
 }};
}
