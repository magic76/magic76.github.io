import{useEffect,useRef,useState}from"react";
import{useTranslation}from"react-i18next";
import{Link}from"react-router-dom";
import{trackUsageEvent}from"../analytics/usage";
import"./fortunePriceInterest.css";
// Fictional editorial sample; deliberately independent of the visitor's chart.
const UNLOCK_SAMPLE=[["命格總覽","Chart overview","丙火日主 · 中和（示例）","以表達、理解和推進事情為核心，並非只追求速度。木火線索較突出時，往往同時重視學習與實作；一件事情有明確目的，比單純得到稱讚更能維持投入。遇到新的任務，你可能先構思方向，再逐步補齊細節。","Example: fire day master, balanced structure. Learning and expression may reinforce each other; a meaningful goal can matter more than recognition."],["天賦與盲點","Talents and blind spots","印星 4 · 食傷 3（示例）","把資料整理成別人理解的方法，是這張示範命盤值得展開的能力線索。你可能在資訊零碎時快速抓到共通原則；反面是太早替所有人想好解法，忽略不同人的理解速度。需要分清探索、驗證與交付三種工作節奏。","Example: resource 4, output 3. Turning information into understandable methods can be a strength; premature solutions can leave collaborators behind."],["事業與職涯","Career","印星、食傷及官殺的互動（示例）","適合發揮的不是某個固定職稱，而是能把知識轉為成果的環境。目標清楚、方法有自主權、成果有回饋時，較容易長期投入；純粹重複流程或反覆改需求，可能消耗耐心。帶領合作時，把自己的判斷依據說清楚，比單靠速度更有幫助。","Example: the interaction of learning, output and responsibility suggests environments with clear goals, autonomy and meaningful feedback."],["財富與資源","Wealth and resources","正財 1 · 偏財 2（示例）","偏財線索較多並不代表收入更高，而是傳統上較重視機會及彈性。以工作資源來說，可能願意把時間或工具投入新的可能；若同時開太多方向，真正值得長期累積的事反而會被分散。正財代表的固定規劃仍是重要的平衡。","Example: direct wealth 1, indirect wealth 2. Opportunity-seeking can coexist with stable budgeting; no income or investment return is predicted."],["愛情與人際","Love and relationships","日支寅（示例）","示範命盤的關係側寫重點是行動與理解之間的平衡。遇到重要的人表達困難時，可能很快進入解決問題的模式；對方卻未必需要立即的答案。信任感比較容易建立在持續的行動、清楚的承諾及互相保留的空間，而非單次熱情。","Example: the day branch is Yin. Action-oriented care may work best alongside listening, clear commitments and room for independence."],["大運與流年","Life cycles and years","階段與年份分開閱讀（示例）","大運看較長期的生活重心，流年則看某一年與原局的互動。網站版會把每段大運的年份、年齡與主題放在同一條時間軸，並逐年區分工作、關係與資源的觀察重點。這裡不把傳統象徵解讀成必然升遷、結婚或發財。","The planned view separates long-term cycles from annual themes, showing dates, age ranges and distinct work, relationship and resource insights."]] as const;
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
    <details className="fortune-unlock-sample"><summary>{copy("免費試閱網站深度解析","Preview the website insights")}</summary><p className="fortune-unlock-sample-note">{copy("以下使用虛構命盤展示內容深度，並非你的付費解析。","Illustrative fictional chart, not your personal unlocked reading.")}</p>{UNLOCK_SAMPLE.map(([zt,et,evidence,zb,eb])=><details key={zt}><summary>{copy(zt,et)}</summary>{zh&&<small>{evidence}</small>}<p>{copy(zb,eb)}</p></details>)}</details>
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
