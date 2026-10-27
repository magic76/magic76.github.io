import{useTranslation}from"react-i18next";
import{useRouteNamespace}from"../i18n/useRouteNamespace";
import{formatVedicTerm}from"./fortuneTerminology";
import type{FortuneMode}from"./types";
type Entry={key:string;label:string;descriptionKey:string};
const GODS=["比肩","劫財","食神","傷官","偏財","正財","七殺","正官","偏印","正印"];
function termsFor(mode:FortuneMode,r:any):Entry[]{
 const entries:Entry[]=[];
 const add=(key:string,label:string,descriptionKey:string)=>{if(!entries.some(x=>x.key===key))entries.push({key,label,descriptionKey})};
 if(mode==="bazi"){
  const raw=[r.dayMasterTenGod,...(r.annualTimeline||[]).slice(0,4).map((y:any)=>y.stemTenGod),...(r.relationshipProfile?.spousePalaceTenGods||[])].join(" ");
  GODS.filter(g=>raw.includes(g)).forEach(g=>add("god-"+g,g,"glossary.tenGods."+g));
 }else if(mode==="tarot"){
  const nums=[r.lifePathDisplay,r.birthdayNumber,r.attitudeNumber,...(r.pinnacles||[]),...(r.challenges||[])];
  const candidates=new Set(nums.map(x=>String(x||"").split("/")[0]));
  [...candidates].filter(n=>["1","2","3","4","5","6","7","8","9","11","22","33"].includes(n))
   .forEach(n=>add("number-"+n,n,"glossary.numbers."+n));
  if((r.pinnacles||[]).length)add("pinnacle","Pinnacle","glossary.terms.pinnacle");
  if((r.challenges||[]).length)add("challenge","Challenge","glossary.terms.challenge");
 }else{
  const planets=new Set((r.planets||[]).map((x:any)=>String(x.name)));
  for(const name of ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"])
   if(planets.has(name))add("planet-"+name,name,"glossary.planets."+name);
  const houses=new Set((r.planets||[]).map((x:any)=>Number(x.house)));
  for(const n of [...houses].filter(n=>n>=1&&n<=12).sort((a,b)=>a-b))
   add("house-"+n,"House "+n,"glossary.houses."+n);
  if(r.currentMahadasha)add("md","Mahadasha","glossary.terms.Mahadasha");
  if(r.currentAntardasha)add("ad","Antardasha","glossary.terms.Antardasha");
  if(r.lagnaNakshatra||r.moonNakshatra)add("nak","Nakshatra","glossary.terms.Nakshatra");
 }
 return entries;
}
export function FortuneGlossary({mode,result}:{mode:FortuneMode;result:any}){
 const loaded=useRouteNamespace("fortuneReport");
 const{t,i18n}=useTranslation("fortuneReport");
 if(!loaded)return null;
 const items=termsFor(mode,result);
 if(!items.length)return null;
 const locale=i18n.resolvedLanguage||i18n.language;
 return <details className="fortune-reading-more fortune-glossary">
  <summary>{t("glossary.title")} ({items.length})</summary>
  <dl>{items.map(item=><div key={item.key}><dt>{formatVedicTerm(item.label,locale)}</dt><dd>{t(item.descriptionKey)}</dd></div>)}</dl>
 </details>;
}
