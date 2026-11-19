import {useEffect,useState} from "react";

/** Loads the personal daily fortune context without blocking friend chat rendering. */
export function useFriendDailyFortuneContext({validDailyHash,personalChartHash,dailyLocale,dailyHandoff,dailyKind,language}:{
 validDailyHash:boolean;personalChartHash:string|null;dailyLocale:string;dailyHandoff:boolean;
 dailyKind:"bazi"|"numerology"|null;language:string;
}){
 const dailyLookupKey=validDailyHash?dailyLocale+":"+personalChartHash+":"+String(dailyKind)+":"+String(dailyHandoff):"";
 const [dailyLookup,setDailyLookup]=useState<{key:string;context:string;hash:string;handoff?:string}|null>(null);
 useEffect(()=>{
  if(!dailyLookupKey)return;
  let active=true;
  setDailyLookup(null);
  void Promise.all([import("../pages/personalDailyLine"),import("../pages/dailyFortuneReader")])
   .then(async ([{personalDailyLine},{buildDailyFortuneContext}])=>{
    const line=await personalDailyLine(dailyLocale,undefined,personalChartHash).catch(()=>null);
    const matching=!!line&&(!dailyHandoff||!dailyKind||line.card.kind===dailyKind);
    const handoff=dailyHandoff?(await import("../fortune/fortuneChatHandoff")).buildFortuneChatHandoff(matching?line!.card:null,personalChartHash!,dailyKind,dailyLocale,language):null;
    const handoffContext=handoff?await handoff:"";
    if(active)setDailyLookup({key:dailyLookupKey,hash:line?.hash||"",context:matching?buildDailyFortuneContext(line!.card):"",handoff:handoffContext});
   }).catch(()=>{if(active)setDailyLookup({key:dailyLookupKey,hash:"",context:""})});
  return()=>{active=false};
 },[dailyLookupKey,personalChartHash,dailyLocale,language,dailyHandoff,dailyKind]);
 const dailyFortune=dailyLookup?.key===dailyLookupKey&&dailyLookup.hash===personalChartHash&&dailyLookup.context?dailyLookup:null;
 const dailyLookupPending=Boolean(dailyLookupKey&&dailyLookup?.key!==dailyLookupKey);
 return {dailyLookup,dailyFortune,dailyLookupPending};
}
