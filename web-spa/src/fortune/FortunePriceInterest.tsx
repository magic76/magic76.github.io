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
 const[stageReady,setStageReady]=useState(false);
 useEffect(()=>{const controller=new AbortController();void fetch("/api/fortune/ecpay/test-config",{credentials:"same-origin",cache:"no-store",signal:controller.signal}).then(r=>{if(r.ok&&!controller.signal.aborted)setStageReady(true)}).catch(()=>{});return()=>controller.abort()},[]);
 useEffect(()=>setInterested(savedInterest()),[]);
 const seen=useRef(new Set<string>());
 useEffect(()=>{
  if(seen.current.has(readingId)||viewed.has(readingId))return;
  seen.current.add(readingId);viewed.add(readingId);
  trackUsageEvent("fortune_price_view","bazi");
 },[readingId]);
 return <section className="fortune-price-interest" aria-label={copy("八字命理商品與體驗意願","BaZi products and trial interest")}>
  <div className="fortune-price-interest-heading"><div><span className="fortune-price-interest-eyebrow">{copy("一次購買 · 即將開放","One-time purchase · Coming soon")}</span>
   <h3>{copy("想更深入了解自己的命格？","Want to explore your chart in more depth?")}</h3></div>
  </div>
  <p>{copy("選擇你喜歡的方式，深入認識自己。不需要訂閱。","Choose how you want to explore your chart. No subscription.")}</p>
  <div className="fortune-product-options">
   <article className="fortune-product-option">
    <span className="fortune-price-interest-eyebrow">{copy("在網站閱讀","Read on the website")}</span>
    <div className="fortune-product-title"><h4>{copy("完整命盤解鎖","Full chart unlock")}</h4><strong>NT$69</strong></div>
    <p>{copy("解鎖這份命盤的完整網站內容，登入後隨時查看。","Unlock all website insights for this chart and revisit them in your account.")}</p>
    <ul><li>{copy("性格、天賦與盲點","Personality, talents and blind spots")}</li><li>{copy("事業、財富、感情與人際","Career, wealth themes and relationships")}</li><li>{copy("大運與流年深度解析","Life cycles and annual themes")}</li></ul>
    <small>{copy("預定原價 NT$69 · 限時免費活動準備中","Planned regular price NT$69 · Free trial coming soon")}</small>
   </article>
   <article className="fortune-product-option fortune-product-book">
    <span className="fortune-price-interest-eyebrow">{copy("閱讀與收藏","Read and keep")}</span>
    <div className="fortune-product-title"><h4>{copy("專屬一生命書","Personal life book")}</h4><strong>NT$99</strong></div>
    <p>{copy("包含完整命盤解鎖，再加一本專為你撰寫的個人命書。","Includes full chart access plus a personalized book written for you.")}</p>
    <ul><li>{copy("完整性格、事業、財富與感情篇章","In-depth personality, career, wealth and relationship chapters")}</li><li>{copy("人生各階段與未來五年解析","Life stages and five-year themes")}</li><li>{copy("精緻電子翻書與 PDF 收藏","Digital page-turn book and PDF to keep")}</li></ul>
    <small>{copy("已付費解鎖同一命盤，規劃只需補 NT$30 升級。","Planned NT$30 upgrade for the same previously paid chart.")}</small>
   </article>
  </div>
  <small>{copy("以上是規劃中的商品內容，尚未開放購買。","These are planned products, not yet available for purchase.")}</small>
  {interested?<p className="fortune-price-interest-thanks" role="status">{copy("已記下你的網站解鎖體驗意願！活動尚未開放領取，也不會收費。","Interest noted! Free claims are not open yet, and no payment is taken.")}</p>:
   <button type="button" className="fortune-price-interest-button" onClick={()=>{
    if(savedInterest()||interestRecordedThisSession){setInterested(true);return}
    interestRecordedThisSession=true;
    try{localStorage.setItem(INTEREST_KEY,"yes")}catch{}
    setInterested(true);trackUsageEvent("fortune_price_interest","bazi");
   }}>{copy("我想免費體驗完整命盤解鎖","I want to try full chart access free")}</button>}
  <small>{copy("目前尚未開放領取。這只是免費體驗意願調查，不是預購或付款。","Free claims are not open yet. This is an interest survey, not a preorder or payment.")}</small>
  {stageReady&&<Link className="btn secondary small" to={"/fortune/ecpay/test?history="+encodeURIComponent(readingId)}>{copy("管理員：前往綠界付款測試（不會扣款）","Admin: test ECPay payment (no charge)")}</Link>}
  <Link className="text-button" to="/purchase-info">{copy("查看商品與付款說明","Products and payment information")}</Link>
  <Link className="text-button" to="/fortune/purchases">{copy("已買過報告？到我的報告書架","Already purchased? Open your report library")}</Link>
 </section>;
}
