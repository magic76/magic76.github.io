import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useRouteNamespace} from "../i18n/useRouteNamespace";
import {readDailyProfiles,readDailyChartMeta,saveDailyChartMeta,readDailyPreference,chooseDailyProfile,saveDailyProfileChoice,dailyProfileLabel,DAILY_PROFILE_EVENT,type DailyChart} from "./dailyProfileSelection";
import "./dailyProfileManager.css";

function ProfileRow({chart,active,self,onChange}:{chart:DailyChart;active:boolean;self:boolean;onChange:()=>void}){
 const {t,i18n}=useTranslation("fortuneDaily");
 const meta=readDailyChartMeta(chart.hash);
 const [nickname,setNickname]=useState(meta.nickname||"");
 const [error,setError]=useState(false);
 const label=dailyProfileLabel(chart,i18n.resolvedLanguage||i18n.language,t(chart.mode==="bazi"?"bazi":"numerology"));
 function change(patch:{nickname?:string;hidden?:boolean}){setError(!saveDailyChartMeta(chart.hash,patch));onChange();}
 return <div className="daily-profile-row">
  <div><strong>{label}</strong>{active&&<small> · {t("profiles.active")}</small>}{self&&<small> · {t("dailyQuote.me",{ns:"home"})}</small>}{meta.hidden&&<small> · {t("profiles.hidden")}</small>}</div>
  <form className="daily-profile-name" onSubmit={e=>{e.preventDefault();change({nickname});}}>
   <label><span>{t("profiles.nickname")}</span><input value={nickname} maxLength={40} onChange={e=>setNickname(e.target.value)}/></label>
   <button className="btn secondary small" type="submit" disabled={nickname.trim()===(meta.nickname||"")}>{t("profiles.save")}</button>
  </form>
  <div className="daily-profile-actions">
   {meta.hidden?<button type="button" className="btn secondary small" onClick={()=>change({hidden:false})}>{t("profiles.restore")}</button>:<>
    {!self&&<button type="button" className="btn secondary small" onClick={()=>{saveDailyProfileChoice(chart.hash,true);onChange();}}>{t("profiles.self")}</button>}
    {!active&&<button type="button" className="btn secondary small" onClick={()=>{saveDailyProfileChoice(chart.hash);onChange();}}>{t("profiles.useHome")}</button>}
    <button type="button" className="btn secondary small" onClick={()=>change({hidden:true})}>{t("profiles.remove")}</button>
   </>}
  </div>
  {error&&<p role="alert">{t("loadFailed")}</p>}
 </div>;
}
export function DailyProfileManager(){
 const {t,i18n}=useTranslation("fortuneDaily");
 const ready=useRouteNamespace("fortuneDaily");
 const [charts,setCharts]=useState<DailyChart[]|null>(null);
 const detailsRef=useRef<HTMLDetailsElement|null>(null);
 const refresh=()=>setCharts(readDailyProfiles(true));
 useEffect(()=>{refresh();window.addEventListener("storage",refresh);window.addEventListener(DAILY_PROFILE_EVENT,refresh);return()=>{window.removeEventListener("storage",refresh);window.removeEventListener(DAILY_PROFILE_EVENT,refresh);};},[]);
 useEffect(()=>{const openFromHash=()=>{if(window.location.hash==="#daily-profiles"&&detailsRef.current){detailsRef.current.open=true;detailsRef.current.scrollIntoView({block:"start"});}};openFromHash();window.addEventListener("hashchange",openFromHash);return()=>window.removeEventListener("hashchange",openFromHash);},[ready,charts===null]);
 const active=chooseDailyProfile((charts||[]).filter(c=>!readDailyChartMeta(c.hash).hidden));
 const self=readDailyPreference().selfHash;
 if(!ready||charts===null)return null;
 return <details ref={detailsRef} className="section daily-profile-manager" id="daily-profiles">
  <summary><span>{t("profiles.title")}</span>{active&&<small>{dailyProfileLabel(active,i18n.resolvedLanguage||i18n.language,t(active.mode==="bazi"?"bazi":"numerology"))}</small>}</summary>
  <div className="daily-profile-manager-content">
  <div className="daily-profile-manager-add"><Link to="/fortune/reading?mode=bazi" className="btn secondary small">{t("profiles.add")}</Link></div>
  <p>{t("profiles.device")} · {t("profiles.note")}</p>
  {charts.length?charts.map(chart=><ProfileRow key={chart.hash} chart={chart} active={active?.hash===chart.hash} self={self===chart.hash} onChange={refresh}/>):<p>{t("profiles.empty")}</p>}
  </div>
 </details>;
}
