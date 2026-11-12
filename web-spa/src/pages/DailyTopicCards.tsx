import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import {pickDailyQuote} from "./dailyQuotes";
import {loadQuoteText} from "./quoteCatalog";
import "./dailyTopicCards.css";

type TodayQuote={id:string;text:string;language:string};
/** One SSG-safe card, then device-local daily selection after mount. */
export function DailyTopicCards({variant}:{variant:"mobile"|"desktop"}){
 const {t,i18n}=useTranslation("home");
 const language=i18n.language;
 const [quote,setQuote]=useState<TodayQuote|null>(null);
 useEffect(()=>{
  let active=true;
  let timer:ReturnType<typeof setTimeout>;
  const refresh=()=>{
   const now=new Date();
   const selected=pickDailyQuote(now);
   setQuote(previous=>previous?.id===selected.id&&previous.language===language&&previous.text?previous:null);
   void loadQuoteText(language,selected.id).then(text=>{
    if(active&&text&&pickDailyQuote(new Date()).id===selected.id)setQuote({id:selected.id,text,language});
   });
   const nextMidnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).getTime();
   clearTimeout(timer);
   timer=setTimeout(refresh,Math.max(1000,nextMidnight-Date.now()+40));
  };
  const onVisibility=()=>{if(document.visibilityState==="visible")refresh()};
  refresh();
  document.addEventListener("visibilitychange",onVisibility);
  return()=>{active=false;clearTimeout(timer);document.removeEventListener("visibilitychange",onVisibility)};
 },[language]);
 return <section className={"daily-quote daily-quote--"+variant} aria-labelledby={"daily-quote-title-"+variant}>
  <div className="daily-quote-card">
   <div className="daily-quote-body">
    <h2 id={"daily-quote-title-"+variant}><span aria-hidden="true">✦</span> {t("dailyQuote.title")}</h2>
    {quote?.language===language?<p className="daily-quote-text">{quote.text}</p>:<span className="daily-quote-placeholder" aria-hidden="true"/>}
   </div>
   <div className="daily-quote-actions">
    <Link className="daily-quote-action daily-quote-action--fortune" to="/fortune" onClick={()=>trackUsageEvent("home_entry_click","fortune")}>{t("dailyQuote.fortune")}</Link>
    {quote?.language===language?<Link className="daily-quote-action daily-quote-action--chat" to={"/friend/live?id=zoe&from=home&chat=text&quote="+quote.id} onClick={()=>trackUsageEvent("home_entry_click","friend")}>{t("dailyQuote.chat")}</Link>
     :<span className="daily-quote-action daily-quote-action--chat daily-quote-action--pending" aria-hidden="true">{t("dailyQuote.chat")}</span>}
   </div>
  </div>
 </section>;
}
