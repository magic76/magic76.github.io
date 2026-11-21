import {Arrow} from "../components/Arrow";
import {useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import {Link,useNavigate} from "react-router-dom";
import {geminiKey} from "../lib/runtime";
import {readFortuneHistoryPreviews,type FortuneHistoryPreview} from "./readingHistory";
import {ProductDiscoverability} from "../components/ProductDiscoverability";
import "./unifiedHome.css";
import {FortuneDailyCard} from "./FortuneDailyCard";
import {useSearchParams} from "react-router-dom";
import {parseFortuneInvite} from "./fortuneInvite";
import {readDailyProfiles} from "./dailyProfileSelection";
import {FortuneInviteLanding} from "./FortuneInviteLanding";

const MODES=["bazi","tarot","vedic"] as const;
const name=(mode:string,t:(key:string)=>string)=>MODES.includes(mode as typeof MODES[number])
 ?t("home."+mode):t("home.reading");

/**
 * One Web entrance for charts, history and friend narration.
 * We reuse the original Fortune reading/calculation and stored history; there is no
 * parallel Teacher-side Web calculator. Android's embedded host stays separate.
 */
export function FortuneHomePage(){
 const {t,i18n}=useTranslation("fortune");
 const navigate=useNavigate();
 const [searchParams]=useSearchParams();
 const invite=parseFortuneInvite(searchParams);
 const [list,setList]=useState<FortuneHistoryPreview[]|null>(null);
 const [hasDaily,setHasDaily]=useState(false);
 const dailyIntent=searchParams.get("daily")==="1";
 const chartHash=/^[a-f0-9]{64}$/.test(searchParams.get("chart")||"")?searchParams.get("chart")!:undefined;
 const [openingId,setOpeningId]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [needsKey,setNeedsKey]=useState(false);
 useEffect(()=>{setList(readFortuneHistoryPreviews(30));setHasDaily(readDailyProfiles().length>0)},[]);
 const dailySection=hasDaily?<section id="fortune-today" className="section fortune-journey-today">
  <FortuneDailyCard chartHash={chartHash}/>
 </section>:null;
 const latest=list?.[0];
 const readingUrl=(id:string)=>"/fortune/reading?history="+encodeURIComponent(id);
 async function explain(readingId:string){
  if(openingId)return;
  setError("");
  setNeedsKey(false);
  if(!geminiKey()){
   setNeedsKey(true);
   setError(t("landing.missingKey"));
   return;
  }
  setOpeningId(readingId);
  try{
   const {prepareFriendExplanation}=await import("./prepareFriendExplanation");
   await prepareFriendExplanation(readingId);
   navigate("/fortune/live?from=hub");
  }catch(e){
   setError(e instanceof Error?e.message:t("landing.openError"));
  }finally{setOpeningId(null)}
 }
 return <>
  {invite&&<FortuneInviteLanding invite={invite} locale={i18n.resolvedLanguage||i18n.language}/>}
  {dailyIntent?dailySection:null}
  <section className="hero fortune-journey-hero">
   <span className="kicker">Koolo FORTUNE · EXPLORE</span>
   <h1>{t("landing.title")}</h1>
   <p>{t("landing.intro")}</p>
  </section>
  {!dailyIntent?dailySection:null}
  <section className="section fortune-journey-create" id="fortune-new-reading">
   <div className="section-head">
    <h2>{t("landing.createTitle")}</h2>
    <small>{t("landing.choose")}</small>
   </div>
   <div className="fortune-home-grid">
    <Link className="fortune-home-mode bazi" to="/fortune/reading?mode=bazi">
     <span className="fortune-mode-cover fortune-mode-cover-bazi" aria-hidden="true"><span className="fortune-mode-fallback-icon">八</span><img className="fortune-mode-cover-image" src="/fortune/modes/fortune-bazi-cover.webp" alt="" width={1536} height={864} loading="lazy" decoding="async" onError={event=>{event.currentTarget.hidden=true}}/></span>
     <span className="fortune-mode-copy"><strong>{t("home.bazi")}</strong><span className="fortune-mode-description">{t("home.baziDesc")}</span></span>
    </Link>
    <Link className="fortune-home-mode tarot" to="/fortune/reading?mode=tarot">
     <span className="fortune-mode-cover fortune-mode-cover-tarot" aria-hidden="true">
      <span className="fortune-mode-fallback-icon">✦</span>
      <img className="fortune-mode-cover-image" src="/fortune/modes/fortune-tarot-cover.webp" alt="" width={1536} height={864} loading="lazy" decoding="async" onError={event=>{event.currentTarget.hidden=true}}/>
     </span>
     <span className="fortune-mode-copy"><strong>{t("home.tarot")}</strong><span className="fortune-mode-description">{t("home.tarotDesc")}</span></span>
    </Link>
    <Link className="fortune-home-mode vedic" to="/fortune/reading?mode=vedic">
     <span className="fortune-mode-cover fortune-mode-cover-vedic" aria-hidden="true">
      <span className="fortune-mode-fallback-icon">◎</span>
      <img className="fortune-mode-cover-image" src="/fortune/modes/fortune-vedic-cover.webp" alt="" width={1536} height={864} loading="lazy" decoding="async" onError={event=>{event.currentTarget.hidden=true}}/>
     </span>
     <span className="fortune-mode-copy"><strong>{t("home.vedic")}</strong><span className="fortune-mode-description">{t("home.vedicDesc")}</span></span>
    </Link>
   </div>
   <a className="text-button" href="/fortune/bazi/">{t("home.bazi")} · {t("home.baziDesc")} →</a>
  </section>
  {(list===null||Boolean(latest)||Boolean(error))&&<section className="section fortune-journey-primary" aria-label={t("landing.latest")}>
   {list===null?<div className="spa-loading" role="status">{t("home.loading")}</div>:latest?
    <div className="fortune-journey-latest">
     <span className="kicker">{t("landing.continue")}</span>
     <div className="fortune-journey-latest-head">
      <span className={"fortune-history-mark "+latest.mode}/>
      <div><h2>{name(latest.mode,t)}</h2><p>{latest.summary||t("home.reading")}</p>
       <small>{latest.createdAt?new Date(latest.createdAt).toLocaleDateString(i18n.language):""}</small>
      </div>
     </div>
     <div className="fortune-journey-actions">
      <Link className="btn" to={readingUrl(latest.id)}>{t("landing.readFull")} <Arrow/></Link>
      <button className="btn secondary" type="button" disabled={Boolean(openingId)} onClick={()=>void explain(latest.id)}>
       {t(openingId===latest.id?"landing.opening":"landing.hearFriend")} <Arrow/>
      </button>
     </div>
    </div>:
    null}
   {error&&<div className="spa-error" role="alert">{error} {needsKey&&<Link to="/settings">{t("landing.openSettings")} <Arrow/></Link>}</div>}
  </section>}
  <section className="section fortune-journey-history" aria-label={t("landing.saved")}>
   <div className="section-head">
    <h2>{t("landing.myCharts")}</h2>
    <Link className="fortune-journey-all" to="/fortune/history">{t("landing.viewAll")} <Arrow/></Link>
   </div>
   {list===null?<div className="spa-loading">{t("home.loading")}</div>:list.length?
    <div className="fortune-history-list">
     {list.slice(0,3).map(x=><Link className="fortune-history-row" to={readingUrl(x.id)} key={x.id}>
      <span className={"fortune-history-mark "+x.mode}/>
      <span><strong>{name(x.mode,t)}</strong><small>{x.summary||t("home.reading")}</small></span>
      <b>{x.createdAt?new Date(x.createdAt).toLocaleDateString(i18n.language):""} <Arrow/></b>
     </Link>)}
    </div>:
    <div className="fortune-home-empty"><strong>{t("home.empty")}</strong><span>{t("home.emptyDesc")}</span></div>}
  </section>
  {!hasDaily&&<details className="fortune-journey-daily">
   <summary>{t("landing.todayReflection")}</summary>
   <FortuneDailyCard/>
  </details>}
  <section className="section fortune-journey-other">
   <div className="section-head"><h2>{t("landing.exploreOther")}</h2></div>
   <div className="fortune-journey-other-links">
    <Link to="/fortune/live?from=culture">{t("landing.talkCulture")} <Arrow/></Link>
    <Link to="/fortune/live?from=daily">{t("landing.todayReflection")} <Arrow/></Link>
   </div>
   <p>{t("landing.disclaimer")}</p>
  </section>
  <ProductDiscoverability product="fortune"/>
 </>;
}
