import i18n,{loadUiNamespace} from "../i18n";
import {buildDailyCard,localDateKey,type DailyKind} from "../fortune/dailyCard";
import {DAILY_COPY_REVISION,readCachedDaily,readDailyKindChoice,resolveDailyKind} from "../fortune/dailyStore";
import {readSavedBaziResult} from "../fortune/dailyBaziSource";
import {DAILY_SOLAR} from "../fortune/dailySolar";
import {readDailyProfiles,chooseDailyProfile} from "../fortune/dailyProfileSelection";

/** Only imported after a known saved birth chart, never from the initial home graph. */
export async function personalDailyLine(language:string,date=localDateKey(),requestedHash?:string|null){
 const chart=chooseDailyProfile(readDailyProfiles(),requestedHash);
 if(!chart)return null;
 await loadUiNamespace("fortuneDaily");
 const translate=(key:string,values?:Record<string,string|number>)=>String(i18n.t(key,{ns:"fortuneDaily",lng:language,...values}));
 const preferred:DailyKind=resolveDailyKind(chart.mode,chart.profile.birthTime,readDailyKindChoice());
 const input={profile:chart.profile,localDate:date,lang:language,translate,almanac:"optional" as const};
 let kind:DailyKind=preferred;
 const cached=kind==="bazi"?readCachedDaily(date,"bazi",chart.hash):null;
 // Only reuse a same-profile, same-locale, current-copy BaZi card.
 const validCache=cached?.card.kind==="bazi"&&cached.card.date===date&&
  cached.locale===language&&cached.copyRevision===DAILY_COPY_REVISION;
 const savedBazi=kind==="bazi"&&!validCache?readSavedBaziResult(chart.hash):null;
 let result=validCache?cached!.card:kind==="bazi"&&savedBazi?
  buildDailyCard({...input,kind,bazi:savedBazi,lunar:DAILY_SOLAR}):
  buildDailyCard({...input,kind:"numerology"});
 if(kind==="bazi"&&!validCache&&(!savedBazi||"status" in result)){
  kind="numerology";
  result=buildDailyCard({...input,kind});
 }
 if("status" in result)return null;
 return {text:result.theme,hash:chart.hash,kind,date,language,card:{
  date:result.date,kind:result.kind,headline:result.headline,theme:result.theme,
  do:result.do,avoid:result.avoid,luckyColor:{name:result.luckyColor.name},basis:result.basis
 }};
}
