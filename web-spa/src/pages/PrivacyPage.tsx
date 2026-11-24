import {Arrow} from "../components/Arrow";
import {useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {usageDisabled,developerUsageMode,setUsageDisabled,setDeveloperUsageMode} from "../analytics/usage";

/** User-controlled analytics privacy preferences, separate from everyday app settings. */
export function PrivacyPage(){
 const {i18n,t}=useTranslation("settings");
 const english=i18n.language.startsWith("en");
 const[analyticsOff,setAnalyticsOff]=useState(usageDisabled);
 const[devMode,setDevMode]=useState(developerUsageMode);
 return <>
  <section className="hero"><span className="kicker">Koolo</span><h1>{english?"Privacy & data":"隱私與資料"}</h1>
   <p>{english?"Manage optional product analytics separately from your learning preferences.":"匿名使用統計與日常學習偏好分開管理。"}</p>
  </section>
  <section className="section panel" id="usage-privacy">
   <div className="section-head"><h2>{english?"Anonymous product usage":"匿名產品使用統計"}</h2></div>
   <label className="row" style={{gap:12,alignItems:"flex-start"}}>
    <input type="checkbox" checked={!analyticsOff} onChange={e=>{setUsageDisabled(!e.target.checked);setAnalyticsOff(!e.target.checked)}}/>
    <span><strong>{english?"Share anonymous feature usage":"允許匿名功能使用統計"}</strong>
     <small className="meta" style={{display:"block",marginTop:4}}>{english
      ?"Controls first-party feature events and Google Analytics (GA4) visits/interactions. GA4 may use analytics cookies and records only safe campaign tags and referring-site domains for traffic attribution; no conversation content, recordings or Gemini keys. Turning this off (or using GPC/DNT) stops these trackers; separate Cloudflare Web Analytics site performance counts may continue."
      :"控制自有功能事件與 Google Analytics（GA4）的流量統計；GA4 可能使用分析 Cookie，僅保留安全格式的行銷來源標籤與推薦網站網域，不傳送對話、錄音或 Gemini Key。關閉或啟用 GPC／DNT 後不再送出上述事件；獨立的 Cloudflare Web Analytics 網站效能統計可能仍會運作。"}</small>
    </span>
   </label>
   {new URLSearchParams(typeof window==="undefined"?"":window.location.search).has("crewDev")&&<label className="row" style={{gap:12,marginTop:14}}>
    <input type="checkbox" checked={devMode} onChange={e=>{setDeveloperUsageMode(e.target.checked);setDevMode(e.target.checked)}}/>
    <span>{english?"Developer test mode (exclude my usage)":"開發測試模式（排除自己的操作）"}</span>
   </label>}
  </section>
  <p className="meta"><Link to="/licenses">{t("about.licenses")} <Arrow/></Link></p>
  <p className="meta"><Link to="/settings"><Arrow direction="left"/> {english?"Back to settings":"返回設定"}</Link></p>
 </>;
}
