import{useEffect,useRef,useState}from"react";
import{useTranslation}from"react-i18next";
import{Link}from"react-router-dom";
import{trackUsageEvent}from"../analytics/usage";
import"./fortunePriceInterest.css";
const INTEREST_KEY="koolo_fortune_bazi_interest_v1";
const viewed=new Set<string>();
let interestRecordedThisSession=false;
function savedInterest(){try{return localStorage.getItem(INTEREST_KEY)==="yes"}catch{return false}}
export function FortunePriceInterest({readingId}:{readingId:string}){
 const{i18n}=useTranslation();
 const zh=/^zh(?:-|$)/i.test(i18n.resolvedLanguage||i18n.language);
 const copy=(z:string,e:string)=>zh?z:e;
 const[interested,setInterested]=useState(false);
 useEffect(()=>setInterested(savedInterest()),[]);
 const seen=useRef(new Set<string>());
 useEffect(()=>{
  if(seen.current.has(readingId)||viewed.has(readingId))return;
  seen.current.add(readingId);viewed.add(readingId);
  trackUsageEvent("fortune_price_view","bazi");
 },[readingId]);
 return <section className="fortune-price-interest" aria-label={copy("八字深度報告意願調查","BaZi report interest survey")}>
  <div className="fortune-price-interest-heading"><div><span className="fortune-price-interest-eyebrow">{copy("即將推出 · 意願調查","Coming soon · Interest survey")}</span>
   <h3>{copy("想更深入了解自己的命格？","Want to explore your chart in more depth?")}</h3></div>
   <strong>NT$79 <small>{copy("預計售價","Planned price")}</small></strong>
  </div>
  <p>{copy("預計提供：性格與職涯深度解析、兩個你最在意的問題、未來三年的重點與 30 天行動建議。這些內容尚未開放。","Planned: deeper personality and career insights, two questions you care about, three-year themes, and a 30-day action plan. Not yet available.")}</p>
  <div className="fortune-price-interest-preview"><strong>{copy("報告內容預覽（規劃中）","Planned report preview")}</strong>
   <ul><li>{copy("你的優勢與容易卡住的情境","Strengths and common challenges")}</li><li>{copy("兩個自選主題的命盤依據與生活建議","Chart-based reflections on two chosen topics")}</li><li>{copy("未來三年各一個關注重點（非事件預言）","One focus per year for the next three years (not predictions)")}</li></ul>
  </div>
  {interested?<p className="fortune-price-interest-thanks" role="status">{copy("已記下你的意願！目前無法購買，也不會收費。","Interest noted! Purchasing is not available and no payment is taken.")}</p>:
   <button type="button" className="fortune-price-interest-button" onClick={()=>{
    if(savedInterest()||interestRecordedThisSession){setInterested(true);return}
    interestRecordedThisSession=true;
    try{localStorage.setItem(INTEREST_KEY,"yes")}catch{}
    setInterested(true);trackUsageEvent("fortune_price_interest","bazi");
   }}>{copy("我有興趣 · NT$79","I'm interested · NT$79")}</button>}
  <small>{copy("這只是意願調查，不是預購或付款。報告內容與交付方式仍在規劃。","Interest survey only: no purchase, preorder, or payment. Content and delivery are still being planned.")}</small>
  <Link className="text-button" to="/fortune/purchases">{copy("已買過報告？到我的報告書架","Already purchased? Open your report library")}</Link>
 </section>;
}
