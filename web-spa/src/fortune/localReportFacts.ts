import type{FortuneMode}from"./types";
import type{FortuneChapterId,FortuneTranslator}from"./report";
import type{YearHighlight}from"./yearHighlights";
import type{CurrentPhase}from"./currentPhase";

/** Localized, human-labelled deterministic facts. Never stringify raw chart objects. */
const elements=["木","火","土","金","水"];
const valid=(x:unknown)=>x!==undefined&&x!==null&&x!=="";
function value(x:unknown):string{
 if(!valid(x))return "";
 if(typeof x==="number")return Number.isFinite(x)?String(Math.round(x*10)/10):"";
 if(typeof x==="string")return /^-?\d+\.\d{2,}$/.test(x)?String(Math.round(Number(x)*10)/10):x;
 if(Array.isArray(x))return x.map(value).filter(Boolean).join(" / ");
 return "";
}
const yearNow=()=>new Date().getFullYear();
const localDate=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
export function localizedElementFocus(r:any,tr:FortuneTranslator):string{
 const ranked=elements.map(name=>({name,n:Number(r?.weightedFiveElements?.[name])}))
  .filter(x=>Number.isFinite(x.n)).sort((a,b)=>b.n-a.n);
 return ranked.length?tr("elementFocus."+ranked[0].name):tr("factLabels.noData");
}
const PLANET_LORDS=new Set(["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"]);
export function localizedPlanetFocus(r:any,tr:FortuneTranslator):string{
 const lord=String(r?.currentMahadasha?.lord||"");
 return PLANET_LORDS.has(lord)?tr("planetFocus."+lord):lord||tr("factLabels.noData");
}
const STRENGTH_LABELS=new Set(["偏旺","身強","中和","身弱","偏弱","偏強","平衡"]);
function localStrength(raw:unknown,tr:FortuneTranslator):string{
 const v=String(raw??"");return STRENGTH_LABELS.has(v)?tr("baziUi.strengthValues."+v):v;
}
export function localizedReportFacts(mode:FortuneMode,r:any,id:FortuneChapterId,tr:FortuneTranslator,phase:CurrentPhase|undefined,highlights:YearHighlight[]):string{
 const parts:string[]=[];
 const add=(key:string,raw:unknown)=>{const v=value(raw);if(v)parts.push(tr("factLabels."+key)+": "+v)};
 const elem=(ch:unknown)=>{const v=String(ch||"");return elements.includes(v)?tr("elements."+v):v};
 const gods=(xs:unknown)=>Array.isArray(xs)?xs.map(g=>{const token=String(g);return tr("glossary.tenGods."+token)+" ("+token+")"}).join(" / "):xs;
 const listing=(xs:unknown[])=>xs.map(value).filter(Boolean).join("; ");
 const focusYears=highlights.map(x=>x.year+" · "+x.label).join("; ");
 const year=yearNow();
 if(mode==="bazi"){
  switch(id){
   case"overview":add("pillars",r.fourPillars);add("dayMaster",r.dayMaster);
    {const weighted=elements.filter(k=>Number.isFinite(Number(r?.weightedFiveElements?.[k]))).map(k=>elem(k)+" "+value(Number(r.weightedFiveElements[k]))).join(" / ");add("fiveElements",weighted)}
    add("strength",localStrength(r.dayMasterStrength,tr));break;
   case"personality":add("dayMaster",r.dayMaster);add("strength",localStrength(r.dayMasterStrength,tr));add("element",elem(r.dayMasterElement));break;
   case"career":add("officer",r.careerProfile?.officerCount);add("output",r.careerProfile?.outputCount);add("resource",r.careerProfile?.resourceCount);break;
   case"wealth":add("directWealth",r.wealthProfile?.directWealthCount);add("indirectWealth",r.wealthProfile?.indirectWealthCount);add("wealthElement",elem(r.wealthProfile?.wealthElement));break;
   case"relationships":add("spousePalace",r.relationshipProfile?.spousePalace);add("tenGods",gods(r.relationshipProfile?.spousePalaceTenGods));break;
   case"family":add("natalInteractions",listing(r.natalInteractions||[]));break;
   case"currentCycle":add("currentLuck",r.currentLuckPillar?.ganZhi);add("period",r.currentLuckPillar?.startYear&&r.currentLuckPillar?.endYear?r.currentLuckPillar.startYear+"–"+r.currentLuckPillar.endYear:"");add("nextLuck",phase?.next);break;
   case"longTerm":{
    const upcoming=(r.luckPillars||[]).filter((x:any)=>Number(x.endYear)>=year).sort((a:any,b:any)=>Number(a.startYear)-Number(b.startYear)).slice(0,3);
    add("cycleYears",listing(upcoming.map((x:any)=>x.ganZhi+" ("+x.startYear+"–"+x.endYear+")")));break;
   }
   case"keyYears":add("keyYears",focusYears);break;
   case"advice":add("dayMaster",r.dayMaster);add("currentLuck",r.currentLuckPillar?.ganZhi);break;
  }
 }else if(mode==="tarot"){
  const stages=(r.pinnacles||[]).map((n:any,i:number)=>tr("factLabels.stage",{index:i+1,range:r.pinnacleTiming?.[i]||"—",number:value(n)}));
  switch(id){
   case"overview":add("birthCards",r.birthCardDisplay);add("lifePath",r.lifePathDisplay);add("attitude",r.attitudeNumber);break;
   case"personality":add("coreCard",r.personalityCardName);add("soulCard",r.soulCardName);add("birthdayNumber",r.birthdayNumber);break;
   case"career":add("lifePath",r.lifePathDisplay);add("stages",listing(stages));break;
   case"wealth":add("personalYear",r.personalYear);add("personalMonth",r.personalMonth);add("challenges",listing(r.challenges||[]));break;
   case"relationships":add("coreCard",r.personalityCardName);add("soulCard",r.soulCardName);add("attitude",r.attitudeNumber);break;
   case"family":add("attitude",r.attitudeNumber);add("birthCards",r.birthCardDisplay);break;
   case"currentCycle":add("calendarYear",r.personalYearCalendarYear);add("personalYear",r.personalYear);add("personalMonth",r.personalMonth);break;
   case"longTerm":add("stages",listing(stages));add("challenges",listing(r.challenges||[]));break;
   case"keyYears":add("keyYears",focusYears);break;
   case"advice":add("personalYear",r.personalYear);add("coreCard",r.personalityCardName);break;
  }
 }else{
  const house=(n:number)=>(r.houses||[]).find((x:any)=>Number(x.house)===n);
  const periods=(r.mahadashaTimeline||[]).filter((x:any)=>String(x.endDate||"")>=localDate()).sort((a:any,b:any)=>String(a.startDate).localeCompare(String(b.startDate))).slice(0,3);
  switch(id){
   case"overview":add("ascendant",r.lagnaSign);add("moonSign",r.moonSign);add("sunSign",r.sunSign);break;
   case"personality":add("ascendant",r.lagnaSign);add("nakshatra",r.lagnaNakshatra);add("moonSign",r.moonSign);break;
   case"career":add("careerHouseLord",house(10)?.lord);add("mahadasha",r.currentMahadasha?.lord);break;
   case"wealth":add("wealthHouseLord",house(2)?.lord);add("communityHouseLord",house(11)?.lord);break;
   case"relationships":add("relationshipHouseLord",house(7)?.lord);break;
   case"family":add("familyHouseLord",house(4)?.lord);add("childrenHouseLord",house(5)?.lord);break;
   case"currentCycle":add("mahadasha",r.currentMahadasha?.lord);add("antardasha",r.currentAntardasha?.lord);add("periodEnd",r.currentMahadasha?.endDate);break;
   case"longTerm":add("cycleYears",listing(periods.map((x:any)=>x.lord+" ("+x.startDate+"–"+x.endDate+")")));break;
   case"keyYears":add("keyYears",focusYears);break;
   case"advice":add("ascendant",r.lagnaSign);add("mahadasha",r.currentMahadasha?.lord);break;
  }
 }
 return parts.join("; ")||tr("factLabels.noData");
}
