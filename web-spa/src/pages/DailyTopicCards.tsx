import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import {pickDailyQuote} from "./dailyQuotes";
import {loadQuoteText} from "./quoteCatalog";
import {hasStoredChart} from "./storedChart";
import "./dailyTopicCards.css";

type TodayQuote={id:string;text:string;language:string};
type TodayPersonal={hash:string;text:string;language:string;kind:"bazi"|"numerology";headline:string;action:string;color:{name:string;hex:string}};
type ChartOption={hash:string;label:string};

/** One SSG-safe frosted card. The chart engine only enters a lazy chunk after mount. */
export function DailyTopicCards({variant}:{variant:"mobile"|"desktop"}){
 const {t,i18n}=useTranslation("home");
 const language=i18n.language;
 const [quote,setQuote]=useState<TodayQuote|null>(null);
 const [personal,setPersonal]=useState<TodayPersonal|null>(null);
 const [charts,setCharts]=useState<ChartOption[]>([]);
 const [needsChartSelection,setNeedsChartSelection]=useState(false);
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
   setNeedsChartSelection(false);
   if(!hasStoredChart())updateQuote();
   else{
    setQuote(null);setPersonal(null);
    void import("./personalDailyLine").then(async ({personalDailyLine})=>{
     const {readDailyProfiles,chooseDailyProfile,readDailyPreference,dailyProfileName}=await import("../fortune/dailyProfileSelection");
     if(!active||token!==version)return;
     const found=readDailyProfiles(),chosen=chooseDailyProfile(found);
     if(!chosen){setNeedsChartSelection(found.length>0||readDailyProfiles(true).length>0);updateQuote();return;}
     const pref=readDailyPreference();
     const options=found.map((chart,index)=>({hash:chart.hash,
      label:dailyProfileName(chart.hash,chart.hash===pref.selfHash?t("dailyQuote.me"):t("dailyQuote.unnamedChart",{number:index+1}))}));
     const line=await personalDailyLine(language,undefined,chosen.hash);
     if(!active||token!==version)return;
     if(!line){updateQuote();return;}
     setCharts(options);setPersonal({hash:line.hash,text:line.text,language,kind:line.kind,headline:line.card.headline,action:line.card.do[0],color:line.card.luckyColor});
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
  window.addEventListener("crew-daily-profile-change",refresh);
  return()=>{active=false;version++;clearTimeout(timer);document.removeEventListener("visibilitychange",onVisibility);window.removeEventListener("storage",refresh);window.removeEventListener("crew-daily-profile-change",refresh)};
 },[language,t]);
 const isPersonal=personal?.language===language&&Boolean(personal.text);
 const readyQuote=quote?.language===language;
 const text=isPersonal?personal!.text:readyQuote?quote!.text:"";
 const title=isPersonal?t("dailyQuote.personalTitle"):t("dailyQuote.title");
 const fortuneHref=isPersonal?"/fortune?daily=1&chart="+personal!.hash+"&kind="+personal!.kind:"/fortune/reading?mode=bazi&from=daily";
 const selectChart=(value:string)=>{
  if(charts.some(x=>x.hash===value)){
   void import("../fortune/dailyProfileSelection").then(({saveDailyProfileChoice})=>{saveDailyProfileChoice(value)});
  }
 };
 return <section className={"daily-quote daily-quote--"+variant} aria-labelledby={"daily-quote-title-"+variant}>
  <div className="daily-quote-card">
   <div className="daily-quote-body">
     {isPersonal&&charts.length>0?<select className="daily-quote-chart" aria-label={t("dailyQuote.chooseChart")}
      value={personal!.hash} onChange={event=>selectChart(event.target.value)}>
      {charts.map(chart=><option key={chart.hash} value={chart.hash}>{chart.label}</option>)}
     </select>:null}
    <div className="daily-quote-heading">
     <h2 id={"daily-quote-title-"+variant}><span aria-hidden="true">✦</span> {title}</h2>
    </div>
    {isPersonal&&<p className="daily-quote-basis">{t(personal!.kind==="bazi"?"dailyQuote.basisBazi":"dailyQuote.basisNumerology")} · {t("luckyColor",{ns:"fortuneDaily"})} <span className="daily-quote-swatch" style={{backgroundColor:personal!.color.hex}} aria-hidden="true"/>{personal!.color.name}</p>}
    {isPersonal&&<strong className="daily-quote-headline">{personal!.headline}</strong>}
    {text?<p className="daily-quote-text">{text}</p>:<span className="daily-quote-placeholder" aria-hidden="true"/>}
    {isPersonal&&<p className="daily-quote-basis daily-quote-action-hint">{personal!.action}</p>}
    {!isPersonal&&!needsChartSelection&&<p className="daily-quote-benefit">{t("dailyQuote.setupHint")}</p>}
   </div>
   <div className="daily-quote-actions">
    {isPersonal?
     <Link className="daily-quote-action daily-quote-action--fortune" to={fortuneHref} onClick={()=>trackUsageEvent("home_entry_click","fortune")}>{t("dailyQuote.fortuneFull")}</Link>
    :needsChartSelection?<Link className="daily-quote-action daily-quote-action--fortune" to="/fortune#daily-profiles">{t("dailyQuote.chooseChart")}</Link>:<Link className="daily-quote-action daily-quote-action--chat" to="/fortune/reading?mode=bazi&from=daily" onClick={()=>trackUsageEvent("home_entry_click","fortune")}>{t("dailyQuote.setupChart")}</Link>}
   </div>
  </div>
 </section>;
}
