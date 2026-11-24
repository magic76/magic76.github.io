import{useEffect,useRef,useState}from"react";
import{useTranslation}from"react-i18next";
import{Link}from"react-router-dom";
import{trackUsageEvent}from"../analytics/usage";
import"./fortunePriceInterest.css";
import{FortuneBaziWebsiteReading}from"./FortuneBaziWebsiteReading";
const INTEREST_KEY="koolo_fortune_bazi_interest_v1";
const viewed=new Set<string>();
let interestRecordedThisSession=false;
function savedInterest(){try{return localStorage.getItem(INTEREST_KEY)==="yes"}catch{return false}}
export function FortunePriceInterest({readingId,result}:{readingId:string;result:any}){
 const{i18n}=useTranslation();
 const zh=/^zh(?:-|$)/i.test(i18n.resolvedLanguage||i18n.language);
 const copy=(z:string,e:string)=>zh?z:e;
 const[opened,setOpened]=useState(false);
 const[stageReady,setStageReady]=useState(false);
 useEffect(()=>{const controller=new AbortController();void fetch("/api/fortune/ecpay/test-config",{credentials:"same-origin",cache:"no-store",signal:controller.signal}).then(r=>{if(r.ok&&!controller.signal.aborted)setStageReady(true)}).catch(()=>{});return()=>controller.abort()},[]);
 const seen=useRef(new Set<string>());
 useEffect(()=>{
  if(seen.current.has(readingId)||viewed.has(readingId))return;
  seen.current.add(readingId);viewed.add(readingId);
  trackUsageEvent("fortune_price_view","bazi");
 },[readingId]);
 return <section className="fortune-price-interest" aria-label={copy("八字命理商品與體驗意願","BaZi products and trial interest")}>
  <div className="fortune-price-interest-heading"><div><span className="fortune-price-interest-eyebrow">{copy("網站解析開放體驗","Website reading trial")}</span>
   <h3>{copy("更深入認識自己","Explore your life in more depth")}</h3></div>
  </div>
  <p>{copy("從性格到未來五年，先免費閱讀自己的完整解析。","Explore your personality and the next five years free.")}</p>
  <div className="fortune-product-options">
   <article className="fortune-product-option">
    <span className="fortune-price-interest-eyebrow">{copy("在網站閱讀","Read on the website")}</span>
    <div className="fortune-product-title"><h4>{copy("完整人生解析","Full life reading")}</h4><div className="fortune-trial-price"><s>NT$69</s><strong>{copy("限時免費","Free trial")}</strong></div></div>
    <p>{copy("完整命盤解鎖：依你的個人命盤整理 8 大主題、24 個解析細項，包含未來五年逐年解讀。","Full chart unlock: 8 topics, 24 insights and five individual years based on your chart.")}</p>
    <div className="fortune-trial-topics">{[["性格天賦","Personality"],["事業發展","Career"],["財富格局","Resources"],["愛情伴侶","Love"],["人際家庭","People"],["人生階段","Life stages"],["未來五年","Five years"],["行動建議","Action guide"]].map(([z,e])=><span key={z}>{copy(z,e)}</span>)}</div>
    <button type="button" className="fortune-price-interest-button" aria-expanded={opened} aria-controls="fortune-personal-trial" onClick={()=>{
     setOpened(v=>!v);
     if(!opened&&!savedInterest()&&!interestRecordedThisSession){interestRecordedThisSession=true;try{localStorage.setItem(INTEREST_KEY,"yes")}catch{}trackUsageEvent("fortune_price_interest","bazi")}
    }}>{opened?copy("收合完整解析","Close full reading"):copy("免費閱讀我的完整解析","Read my full reading free")}</button>
    <small>{copy("預定原價 NT$69 · 目前免費閱讀，不需付款。","Planned regular price NT$69 · Read free now, no payment.")}</small>
   </article>
   <div id="fortune-personal-trial" className="fortune-trial-reading" hidden={!opened}>{opened&&<FortuneBaziWebsiteReading result={result} zh={zh}/>}</div>
   <article className="fortune-product-option fortune-product-book">
    <span className="fortune-price-interest-eyebrow">{copy("閱讀與收藏","Read and keep")}</span>
    <div className="fortune-product-title"><h4>{copy("專屬一生命書","Personal life book")}</h4><strong>NT$99</strong></div>
    <p>{copy("規劃包含完整網站解析，再加一本專為你撰寫的個人命書。","Planned: full website insights plus a personalized book.")}</p>
    <ul><li>{copy("完整性格、事業、財富與感情篇章","In-depth personality, career, wealth and relationship chapters")}</li><li>{copy("人生各階段與未來五年解析","Life stages and five-year themes")}</li><li>{copy("精緻電子翻書與 PDF 收藏","Digital page-turn book and PDF to keep")}</li></ul>
    <small>{copy("已付費解鎖同一命盤，規劃只需補 NT$30 升級。","Planned NT$30 upgrade for the same previously paid chart.")}</small>
   </article>
  </div>
  <small>{copy("網站版已開放免費體驗；正式付費商品尚未開放購買。","Website reading is free to try; paid products are not yet available.")}</small>
  {stageReady&&<Link className="btn secondary small" to={"/fortune/ecpay/test?history="+encodeURIComponent(readingId)}>{copy("管理員：前往綠界付款測試（不會扣款）","Admin: test ECPay payment (no charge)")}</Link>}
  <Link className="text-button" to="/purchase-info">{copy("查看商品與付款說明","Products and payment information")}</Link>
  <Link className="text-button" to="/fortune/purchases">{copy("已買過報告？到我的報告書架","Already purchased? Open your report library")}</Link>
 </section>;
}
