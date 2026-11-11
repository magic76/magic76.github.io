import {useEffect,useState,type CSSProperties} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon} from "../components/Icon";
import {trackUsageEvent} from "../analytics/usage";
import {pickDailyTopics,type DailyTopic} from "./dailyTopics";
import "./dailyTopicCards.css";

/** Both home variants are SSG; keep the first client render identical to the HTML. */
export function DailyTopicCards({variant}:{variant:"mobile"|"desktop"}){
 const {t}=useTranslation("home");
 const [topics,setTopics]=useState<DailyTopic[]>([]);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>;
  const refresh=()=>{
   const now=new Date();
   setTopics(pickDailyTopics(now));
   const nextMidnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).getTime();
   clearTimeout(timer);
   timer=setTimeout(refresh,Math.max(1000,nextMidnight-Date.now()+40));
  };
  const onVisibility=()=>{if(document.visibilityState==="visible")refresh()};
  refresh();
  document.addEventListener("visibilitychange",onVisibility);
  return()=>{clearTimeout(timer);document.removeEventListener("visibilitychange",onVisibility)};
 },[]);
 return <section className={"daily-topics daily-topics--"+variant} aria-labelledby={"daily-topics-title-"+variant}>
  <div className="daily-topics-heading">
   <h2 id={"daily-topics-title-"+variant}>{t("dailyTopics.title")}</h2>
   <span>{t("dailyTopics.note")}</span>
  </div>
  <div className="daily-topics-grid">
   {topics.length===3?topics.map(topic=><Link key={topic.id}
    className="daily-topic-card"
    to={"/friend/live?id=zoe&from=home&chat=text&topic="+topic.id}
    style={{"--dt-tint-a":topic.tintA,"--dt-tint-b":topic.tintB,"--dt-ink":topic.ink} as CSSProperties}
    onClick={()=>trackUsageEvent("home_entry_click","friend")}>
    <span className="daily-topic-icon" aria-hidden="true"><Icon name={topic.icon}/></span>
    <strong>{t("dailyTopics.items."+topic.id+".title")}</strong>
    <span className="daily-topic-hook">{t("dailyTopics.items."+topic.id+".hook")}</span>
   </Link>):[0,1,2].map(index=><span key={index} className="daily-topic-card daily-topic-placeholder" aria-hidden="true">
    <span className="daily-topic-icon"/><span className="daily-topic-placeholder-line"/><span className="daily-topic-placeholder-line short"/>
   </span>)}
  </div>
 </section>;
}
