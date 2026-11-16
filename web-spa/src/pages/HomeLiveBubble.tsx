import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import {useClientReady} from "../lib/useClientReady";
import {hasStoredChart} from "./storedChart";
import "./homeLiveBubble.css";

/** A chart-aware content shortcut, never an audio or API-key entry. */
export function HomeLiveBubble(){
 const {t,i18n}=useTranslation("home");
 const ready=useClientReady();
 const [portalHost,setPortalHost]=useState<HTMLElement|null>(null);
 const [storedChart,setStoredChart]=useState(false);
 const [chartResolved,setChartResolved]=useState(false);
 const [fortuneHref,setFortuneHref]=useState("/fortune?daily=1");
 useEffect(()=>{setPortalHost(document.body)},[]);
 useEffect(()=>{
  if(!ready)return;
  let active=true,request=0;
  const refresh=()=>{
   const token=++request;
   const found=hasStoredChart();
   setStoredChart(found);
   setChartResolved(true);
   setFortuneHref("/fortune?daily=1");
   if(!found)return;
   // Only after mount + a locally saved chart: preserve the daily card's
   // chosen profile and actual kind (BaZi or numerology fallback).
   void import("./personalDailyLine").then(({personalDailyLine})=>
    personalDailyLine(i18n.language)
   ).then(line=>{
    if(active&&token===request&&line&&/^[a-f0-9]{64}$/.test(line.hash)&&
       (line.kind==="bazi"||line.kind==="numerology")){
     setFortuneHref("/fortune?daily=1&chart="+line.hash+"&kind="+line.kind);
    }
   }).catch(()=>{/* Plain daily deep link selects the locally saved chart. */});
  };
  const onVisible=()=>{if(document.visibilityState==="visible")refresh()};
  refresh();
  window.addEventListener("storage",refresh);
  window.addEventListener("focus",refresh);
  document.addEventListener("visibilitychange",onVisible);
  return()=>{active=false;request++;window.removeEventListener("storage",refresh);
   window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",onVisible)};
 },[ready,i18n.language]);
 // Render nothing for SSG and the first hydration frame. Do not show the
 // wrong destination briefly before the local storage check finishes.
 if(!ready||!portalHost||!chartResolved)return null;
 const target=storedChart?fortuneHref:"/teacher/shorts";
 const label=t(storedChart?"quickEntry.fortune":"quickEntry.shorts");
 return createPortal(
  <aside className="crew-home-live-bubble" aria-label={t("quickEntry.heading")}>
   <Link className="crew-live-bubble-trigger" to={target}
    onClick={()=>trackUsageEvent("home_entry_click",storedChart?"fortune":"shorts")}
    aria-label={label}>
    <span className="crew-live-bubble-icon" aria-hidden="true">{storedChart?"✦":"▶"}</span>
    <span className="crew-live-bubble-label">{label}</span>
   </Link>
  </aside>,portalHost);
}
