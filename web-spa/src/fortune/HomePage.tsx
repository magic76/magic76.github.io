import {useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import {Link,useNavigate} from "react-router-dom";
import {ensureFortuneServices,geminiKey} from "../lib/runtime";
import {saveFortuneSpeakingContext} from "../teacher/fortuneSpeaking";
import {readFortuneHistoryPreviews,type FortuneHistoryPreview} from "./readingHistory";
import type {FortuneReading} from "./types";
import {ProductDiscoverability} from "../components/ProductDiscoverability";
import "./unifiedHome.css";

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
 const en=i18n.language.startsWith("en");
 const navigate=useNavigate();
 const [list,setList]=useState<FortuneHistoryPreview[]|null>(null);
 const [openingId,setOpeningId]=useState<string|null>(null);
 const [error,setError]=useState("");
 useEffect(()=>{setList(readFortuneHistoryPreviews(30))},[]);
 const latest=list?.[0];
 const readingUrl=(id:string)=>"/fortune/reading?history="+encodeURIComponent(id);
 async function explain(readingId:string){
  if(openingId)return;
  setError("");
  if(!geminiKey()){
   navigate(readingUrl(readingId));
   return;
  }
  setOpeningId(readingId);
  try{
   await ensureFortuneServices();
   const reading=window.CrewFortuneProfile.get(readingId) as FortuneReading|null;
   if(!reading||!reading.result||!MODES.includes(reading.mode)){
    throw Error(en?"This saved chart is unavailable. Open its reading to check the record.":"這份命盤紀錄暫時無法讀取，請先打開完整命盤確認。");
   }
   // Only transfer derived explanatory chapters after explicit user action.
   saveFortuneSpeakingContext(reading);
   navigate("/fortune/live?from=hub");
  }catch(e){
   setError(e instanceof Error?e.message:(en?"Unable to open the saved chart.":"無法開啟命盤。"));
  }finally{setOpeningId(null)}
 }
 return <>
  <section className="hero fortune-journey-hero">
   <span className="kicker">CREW FORTUNE · EXPLORE</span>
   <h1>{en?"Explore your chart":"探索你的命盤"}</h1>
   <p>{en?"Read your chart, revisit past readings, or listen to a Crew Friend explain it. You decide what to ask.":"先看命盤、回顧過去的紀錄，或聽 Crew Friend 主動講解；想問什麼，隨時打斷就好。"}</p>
  </section>
  <section className="section fortune-journey-primary" aria-label={en?"Your latest reading":"你的命盤"}>
   {list===null?<div className="spa-loading" role="status">{t("home.loading")}</div>:latest?
    <div className="fortune-journey-latest">
     <span className="kicker">{en?"CONTINUE YOUR READING":"接續你的命盤"}</span>
     <div className="fortune-journey-latest-head">
      <span className={"fortune-history-mark "+latest.mode}/>
      <div><h2>{name(latest.mode,t)}</h2><p>{latest.summary||t("home.reading")}</p>
       <small>{latest.createdAt?new Date(latest.createdAt).toLocaleDateString(i18n.language):""}</small>
      </div>
     </div>
     <div className="fortune-journey-actions">
      <Link className="btn" to={readingUrl(latest.id)}>{en?"Read full chart":"查看完整解讀"} →</Link>
      <button className="btn secondary" type="button" disabled={Boolean(openingId)} onClick={()=>void explain(latest.id)}>
       {openingId===latest.id?(en?"Opening…":"正在開啟…"):(en?"Hear a friend explain":"聽朋友講解")} →
      </button>
     </div>
    </div>:
    <div className="fortune-journey-empty">
     <span className="kicker">{en?"FIRST VISIT":"第一次探索"}</span>
     <h2>{en?"Start with your own chart":"先建立你的第一份命盤"}</h2>
     <p>{en?"Choose a tradition below. The calculator is available without a Gemini key; the voice explanation is optional.":"從下方選擇命理系統，先算出自己的資料。計算不需要 Gemini Key，朋友語音講解再按需開啟。"}</p>
     <a href="#fortune-new-reading" className="btn">{en?"Create my chart":"建立新命盤"} ↓</a>
    </div>}
   {error&&<div className="spa-error" role="alert">{error}</div>}
  </section>
  <section className="section fortune-journey-history" aria-label={en?"Saved charts":"歷史命盤"}>
   <div className="section-head">
    <h2>{en?"My saved charts":"我的命盤紀錄"}</h2>
    <Link className="fortune-journey-all" to="/fortune/history">{en?"View all records":"查看全部紀錄"} →</Link>
   </div>
   {list===null?<div className="spa-loading">{t("home.loading")}</div>:list.length?
    <div className="fortune-history-list">
     {list.slice(0,3).map(x=><Link className="fortune-history-row" to={readingUrl(x.id)} key={x.id}>
      <span className={"fortune-history-mark "+x.mode}/>
      <span><strong>{name(x.mode,t)}</strong><small>{x.summary||t("home.reading")}</small></span>
      <b>{x.createdAt?new Date(x.createdAt).toLocaleDateString(i18n.language):""} ›</b>
     </Link>)}
    </div>:
    <div className="fortune-home-empty"><strong>{t("home.empty")}</strong><span>{t("home.emptyDesc")}</span></div>}
  </section>
  <section className="section fortune-journey-create" id="fortune-new-reading">
   <div className="section-head">
    <h2>{en?"Create a new reading":"建立新命盤"}</h2>
    <small>{en?"Choose one tradition":"選擇想探索的命理系統"}</small>
   </div>
   <div className="fortune-home-grid">
    <Link className="fortune-home-mode bazi" to="/fortune/reading?mode=bazi"><span className="mode-icon">八</span>
     <strong>{t("home.bazi")}</strong><span>{t("home.baziDesc")}</span></Link>
    <Link className="fortune-home-mode tarot" to="/fortune/reading?mode=tarot"><span className="mode-icon">✦</span>
     <strong>{t("home.tarot")}</strong><span>{t("home.tarotDesc")}</span></Link>
    <Link className="fortune-home-mode vedic" to="/fortune/reading?mode=vedic"><span className="mode-icon">◎</span>
     <strong>{t("home.vedic")}</strong><span>{t("home.vedicDesc")}</span></Link>
   </div>
  </section>
  <section className="section fortune-journey-other">
   <div className="section-head"><h2>{en?"Explore without a chart":"還不想建立命盤？"}</h2></div>
   <div className="fortune-journey-other-links">
    <Link to="/fortune/live?from=culture">{en?"Talk about fortune traditions":"聊聊不同文化的命理說法"} →</Link>
    <Link to="/fortune/live?from=daily">{en?"Today's reflection topic":"聽聽今日反思主題"} →</Link>
   </div>
   <p>{en?"Cultural conversation and daily reflection are not personalized forecasts. Stored charts remain in this browser, not synchronized between devices.":"文化探索與每日反思並非個人運勢預測。命盤紀錄儲存在目前瀏覽器，不會自動跨裝置同步。"}</p>
  </section>
  <ProductDiscoverability product="fortune"/>
 </>;
}
