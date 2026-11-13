import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import {pickDailyQuote} from "./dailyQuotes";
import {loadQuoteText} from "./quoteCatalog";
import "./dailyTopicCards.css";

type TodayQuote={id:string;text:string;language:string};
type TodayPersonal={hash:string;text:string;language:string;kind:"bazi"|"numerology"};
type ChartOption={hash:string;label:string;self:boolean};
function hasStoredChart():boolean{
 for(const key of ["crew_fortune_profile_v2","crew_fortune_presets_v1","crew_fortune_readings_v2"]){
  try{
   const value=localStorage.getItem(key);
   if(!value)continue;
   const parsed=JSON.parse(value);
   if(key==="crew_fortune_profile_v2"&&typeof parsed?.birthDate==="string")return true;
   if(Array.isArray(parsed)&&parsed.some(x=>typeof x?.profile?.birthDate==="string"))return true;
  }catch{/* A corrupt record must not conceal the other saved charts. */}
 }
 return false;
}
/** One SSG-safe frosted card. The chart engine only enters a lazy chunk after mount. */
export function DailyTopicCards({variant}:{variant:"mobile"|"desktop"}){
 const {t,i18n}=useTranslation("home");
 const language=i18n.language;
 const [quote,setQuote]=useState<TodayQuote|null>(null);
 const [personal,setPersonal]=useState<TodayPersonal|null>(null);
 const [charts,setCharts]=useState<ChartOption[]>([]);
 const [chartHash,setChartHash]=useState<string|null>(null);
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  let active=true,version=0;
  let timer:ReturnType<typeof setTimeout>;
  const refresh=()=>{
   const token=++version,now=new Date(),selected=pickDailyQuote(now);
   const updateQuote=()=>{
    setCharts([]);setPersonal(null);
    setQuote(previous=>previous?.id===selected.id&&previous.language===language&&previous.text?previous:null);
    void loadQuoteText(language,selected.id).then(text=>{
     if(active&&token===version&&text&&pickDailyQuote(new Date()).id===selected.id)setQuote({id:selected.id,text,language});
    });
   };
   if(!hasStoredChart())updateQuote();
   else{
    setQuote(null);setPersonal(null);
    void import("./personalDailyLine").then(async ({personalDailyLine})=>{
     const {readDailyProfiles,chooseDailyProfile,readDailyPreference,dailyProfileLabel}=await import("../fortune/dailyProfileSelection");
     if(!active||token!==version)return;
     const found=readDailyProfiles(),chosen=chooseDailyProfile(found,chartHash);
     if(!chosen){updateQuote();return;}
     const pref=readDailyPreference();
     const options=found.map(chart=>({hash:chart.hash,self:chart.hash===pref.selfHash,
      label:dailyProfileLabel(chart,language,t("dailyQuote.kind."+chart.mode))}));
     const line=await personalDailyLine(language,undefined,chosen.hash);
     if(!active||token!==version)return;
     if(!line){updateQuote();return;}
     setCharts(options);setPersonal({hash:line.hash,text:line.text,language,kind:line.kind});
    }).catch(()=>{if(active&&token===version)updateQuote()});
   }
   const nextMidnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).getTime();
   clearTimeout(timer);
   timer=setTimeout(refresh,Math.max(1000,nextMidnight-Date.now()+40));
  };
  const onVisibility=()=>{if(document.visibilityState==="visible")refresh()};
  refresh();
  document.addEventListener("visibilitychange",onVisibility);
  window.addEventListener("storage",refresh);
  return()=>{active=false;version++;clearTimeout(timer);document.removeEventListener("visibilitychange",onVisibility);window.removeEventListener("storage",refresh)};
 },[language,chartHash,revision,t]);
 const isPersonal=personal?.language===language&&Boolean(personal.text);
 const readyQuote=quote?.language===language;
 const text=isPersonal?personal!.text:readyQuote?quote!.text:"";
 const selectedOption=charts.find(chart=>chart.hash===personal?.hash);
 const title=isPersonal?t("dailyQuote.personalTitle"):t("dailyQuote.title");
 const fortuneHref=isPersonal?"/fortune?daily=1&chart="+personal!.hash+"&kind="+personal!.kind:"/fortune/reading?mode=bazi&from=daily";
 const chatHref=isPersonal&&/^[a-f0-9]{64}$/.test(personal!.hash)?fortuneHref+"&zoe=1":"";
 const selectChart=(value:string)=>{
  if(value==="__self__"&&personal){
   void import("../fortune/dailyProfileSelection").then(({saveDailyProfileChoice})=>{saveDailyProfileChoice(personal.hash,true);setChartHash(personal.hash);setRevision(x=>x+1)});
  }else if(charts.some(x=>x.hash===value)){
   void import("../fortune/dailyProfileSelection").then(({saveDailyProfileChoice})=>{saveDailyProfileChoice(value);setChartHash(value);setRevision(x=>x+1)});
  }
 };
 return <section className={"daily-quote daily-quote--"+variant} aria-labelledby={"daily-quote-title-"+variant}>
  <div className="daily-quote-card">
   <div className="daily-quote-body">
    <div className="daily-quote-heading">
     <h2 id={"daily-quote-title-"+variant}><span aria-hidden="true">✦</span> {title}</h2>
     {isPersonal&&charts.length>1?<select className="daily-quote-chart" aria-label={t("dailyQuote.chooseChart")}
      value={personal!.hash} onChange={event=>selectChart(event.target.value)}>
      {charts.map(chart=><option key={chart.hash} value={chart.hash}>{chart.self?t("dailyQuote.me")+" · ":""}{chart.label}</option>)}
      {!selectedOption?.self&&<option value="__self__">{t("dailyQuote.markSelf")}</option>}
     </select>:null}
    </div>
    {text?<p className="daily-quote-text">{text}</p>:<span className="daily-quote-placeholder" aria-hidden="true"/>}
    {isPersonal?<p className="daily-quote-basis">{t(personal!.kind==="bazi"?"dailyQuote.basisBazi":"dailyQuote.basisNumerology")}</p>:<p className="daily-quote-benefit">{t("dailyQuote.setupHint")}</p>}
   </div>
   <div className={"daily-quote-actions"+(isPersonal?"":" daily-quote-actions--setup")}>
    {isPersonal?<>
     <Link className="daily-quote-action daily-quote-action--fortune" to={fortuneHref} onClick={()=>trackUsageEvent("home_entry_click","fortune")}>{t("dailyQuote.fortuneFull")}</Link>
     {chatHref&&<Link className="daily-quote-action daily-quote-action--chat" to={chatHref} onClick={()=>trackUsageEvent("home_entry_click","friend")}>{t("dailyQuote.chatRead")}</Link>}
    </>:<Link className="daily-quote-action daily-quote-action--chat" to="/fortune/reading?mode=bazi&from=daily" onClick={()=>trackUsageEvent("home_entry_click","fortune")}>{t("dailyQuote.setupChart")}</Link>}
   </div>
  </div>
 </section>;
}
