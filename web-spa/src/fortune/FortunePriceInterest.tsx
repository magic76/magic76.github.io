import {useEffect,useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import {trackUsageEvent} from "../analytics/usage";
import "./fortunePriceInterest.css";

type Tier="standard"|"premium";
const INTEREST_KEYS:Record<Tier,string>={
 standard:"koolo_fortune_bazi_interest_v1",
 premium:"koolo_fortune_bazi_premium_interest_v1"
};
const viewed=new Set<string>();
const interestedThisSession=new Set<Tier>();
function savedInterest(tier:Tier){
 try{return localStorage.getItem(INTEREST_KEYS[tier])==="yes"}catch{return false}
}

export function FortunePriceInterest({readingId}:{readingId:string}){
 const {i18n}=useTranslation();
 const zh=/^zh(?:-|$)/i.test(i18n.resolvedLanguage||i18n.language);
 const copy=(z:string,e:string)=>zh?z:e;
 const [interested,setInterested]=useState<Record<Tier,boolean>>({standard:false,premium:false});
 const [stageReady,setStageReady]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  void fetch("/api/fortune/ecpay/test-config",{credentials:"same-origin",cache:"no-store",signal:controller.signal})
   .then(r=>{if(r.ok&&!controller.signal.aborted)setStageReady(true)}).catch(()=>{});
  return()=>controller.abort();
 },[]);
 useEffect(()=>setInterested({standard:savedInterest("standard"),premium:savedInterest("premium")}),[]);
 const seen=useRef(new Set<string>());
 useEffect(()=>{
  if(seen.current.has(readingId)||viewed.has(readingId))return;
  seen.current.add(readingId);viewed.add(readingId);
  trackUsageEvent("fortune_price_view","bazi");
 },[readingId]);
 function registerInterest(tier:Tier){
  if(savedInterest(tier)||interestedThisSession.has(tier)){
   setInterested(prev=>({...prev,[tier]:true}));return;
  }
  interestedThisSession.add(tier);
  try{localStorage.setItem(INTEREST_KEYS[tier],"yes")}catch{/* Interest is optional. */}
  setInterested(prev=>({...prev,[tier]:true}));
  trackUsageEvent("fortune_price_interest","bazi");
 }
 return <section id="fortune-plans" className="fortune-price-interest" aria-label={copy("八字深度解讀雙方案","BaZi deep reading plans")}>
  <header className="fortune-plans-intro">
   <span className="fortune-price-interest-eyebrow">{copy("命盤解讀 · 方案預覽","Birth chart · Plan preview")}</span>
   <h3>{copy("想更深入了解自己的命格？","Want to understand your chart more deeply?")}</h3>
   <p>{copy("選一種適合自己的解讀方式。兩款方案目前皆為展示與意願調查，尚未開放購買。","Explore two ways to read your chart. Both plans are previews only; purchasing isn't available yet.")}</p>
  </header>
  <div className="fortune-plans-grid">
   <article className="fortune-plan-card fortune-plan-standard">
    <div className="fortune-plan-topline"><span>{copy("即時解讀","Instant reading")}</span><span>{copy("基礎方案","Essentials")}</span></div>
    <h4>{copy("個人命格深度解讀","Deep BaZi Reading")}</h4>
    <div className="fortune-plan-price"><strong>NT$79</strong><small>{copy("一次性 · 預計售價","One-time · Planned")}</small></div>
    <p>{copy("適合想快速掌握命格、職涯與近期方向的人。","For a clear, focused look at your strengths and near-term priorities.")}</p>
    <ul>
     <li>{copy("性格與職涯的深度分析","Personality and career insights")}</li>
     <li>{copy("兩個自選主題與未來三年重點","Two selected topics and three-year themes")}</li>
     <li>{copy("30 天實用行動建議","A practical 30-day reflection plan")}</li>
     <li>{copy("線上閱讀、帳號保存（規劃中）","Online reading and account library (planned)")}</li>
    </ul>
    {interested.standard?<p className="fortune-plan-thanks" role="status">{copy("已記下你對 NT$79 方案的興趣","Interest in NT$79 saved")}</p>:
     <button type="button" className="fortune-price-interest-button" onClick={()=>registerInterest("standard")}>{copy("我對 NT$79 有興趣","I'm interested in NT$79")}</button>}
   </article>
   <article className="fortune-plan-card fortune-plan-premium">
    <div className="fortune-plan-topline"><span>{copy("專屬命書","Personal destiny book")}</span><span className="fortune-plan-highlight">{copy("精美收藏版","Collector's edition")}</span></div>
    <div className="fortune-plan-mini-cover" aria-hidden="true"><span>KOOLO FORTUNE</span><b>{copy("專屬命書","DESTINY BOOK")}</b><i>✦</i></div>
    <h4>{copy("AI 命理老師・專屬命書","AI Fortune Guide · Destiny Book")}</h4>
    <div className="fortune-plan-price"><strong>NT$379</strong><small>{copy("一次性 · 預計售價","One-time · Planned")}</small></div>
    <p>{copy("像委託老師整理命盤，提交個人問題後，稍後收到值得收藏的專屬報告。","Submit personal questions and receive a carefully designed book after preparation.")}</p>
    <ul>
     <li>{copy("完整五行圖解、事業、感情與大運","Five-element charts, work, relationships and cycles")}</li>
     <li>{copy("個人問題的深入書面解讀","In-depth answers to personal questions")}</li>
     <li>{copy("封面、圖文內頁與老師的一封信","Designed cover, illustrated pages and closing letter")}</li>
     <li>{copy("PDF 下載與永久收藏（規劃中）","PDF and permanent library access (planned)")}</li>
    </ul>
    <Link className="fortune-plan-sample-link" to={"/fortune/report-sample?history="+encodeURIComponent(readingId)}>{copy("翻閱精美命書樣本","Explore the book sample")} <span aria-hidden="true">→</span></Link>
    {interested.premium?<p className="fortune-plan-thanks" role="status">{copy("已記下你對 NT$379 方案的興趣","Interest in NT$379 saved")}</p>:
     <button type="button" className="fortune-price-interest-button premium" onClick={()=>registerInterest("premium")}>{copy("我對 NT$379 有興趣","I'm interested in NT$379")}</button>}
   </article>
  </div>
  <p className="fortune-plans-notice">{copy("目前尚未開放購買，不會收費；兩款方案的正式內容、交付時間及下載方式將於開放時確認。AI 命理解讀僅供自我探索與娛樂參考。","Purchasing isn't available yet and no payment will be taken. Final scope, delivery time and download options will be confirmed before launch. AI readings are for reflection and entertainment.")}</p>
  {stageReady&&<Link className="btn secondary small" to={"/fortune/ecpay/test?history="+encodeURIComponent(readingId)}>{copy("管理員：前往綠界付款測試（不會扣款）","Admin: test ECPay payment (no charge)")}</Link>}
  <Link className="fortune-plans-library" to="/fortune/purchases">{copy("已買過報告？到我的報告書架","Already purchased? Open your report library")}</Link>
 </section>;
}
