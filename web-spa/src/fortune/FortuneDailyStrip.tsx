import {Arrow} from "../components/Arrow";
import {useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useRouteNamespace} from "../i18n/useRouteNamespace";
import {buildDailyCard,dailyProfileHash,localDateKey,type DailyKind} from "./dailyCard";
import {DAILY_COPY_REVISION,readDailyKind,readCachedDaily,saveCachedDaily} from "./dailyStore";
import type {FortuneReading} from "./types";
import "./dailyCard.css";

export function FortuneDailyStrip({reading}:{reading:FortuneReading}){
 const {t,i18n}=useTranslation("fortuneDaily");
 const ready=useRouteNamespace("fortuneDaily");
 const[date,setDate]=useState(()=>localDateKey());
 useEffect(()=>{
  const check=()=>{if(document.visibilityState==="visible")setDate(localDateKey());};
  const interval=window.setInterval(check,60000);
  document.addEventListener("visibilitychange",check);
  return()=>{window.clearInterval(interval);document.removeEventListener("visibilitychange",check);};
 },[]);
 const kind:DailyKind=reading.mode==="bazi"?"bazi":reading.mode==="tarot"?"numerology":readDailyKind();
 const actualKind=kind==="bazi"&&!reading.profile.birthTime?"numerology":kind;
 const lang=i18n.resolvedLanguage||i18n.language;
 const hash=useMemo(()=>dailyProfileHash(reading.profile),[reading.profile]);
 const card=useMemo(()=>{
  if(!ready)return null;
  const stored=readCachedDaily(date,actualKind,hash);
  if(stored?.locale===lang&&stored.copyRevision===DAILY_COPY_REVISION)return stored.card;
  const result=buildDailyCard({kind:actualKind,profile:reading.profile,localDate:date,lang,
   bazi:reading.mode==="bazi"?reading.result:undefined});
  if("status" in result)return null;
  saveCachedDaily(result,hash,undefined,lang);
  return result;
 },[ready,lang,date,actualKind,hash,reading.profile,reading.result]);
 if(!ready||!card)return null;
 return <section className="fortune-daily-strip" aria-label={t("today")}>
  <div><small>{t("today")} · {t(actualKind)}</small><strong>{card.headline}</strong>
   <span>{t("colorSummary",{color:card.luckyColor.name})}</span></div>
  <Link to="/fortune">{t("viewDaily")} <Arrow/></Link>
 </section>;
}
