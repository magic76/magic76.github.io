import{useEffect,useRef,useState}from"react";
import{trackUsageEvent}from"../analytics/usage";
import"./fortunePriceInterest.css";

/** Interest-only pricing experiment: never initiates payment or gates the free report. */
export function FortunePriceInterest({readingId}:{readingId:string}){
 const[interested,setInterested]=useState(false);
 const seen=useRef(new Set<string>());
 useEffect(()=>{
  if(seen.current.has(readingId))return;
  seen.current.add(readingId);
  trackUsageEvent("fortune_price_view","bazi");
 },[readingId]);
 return <section className="fortune-price-interest" aria-label="八字深度報告意願調查">
  <div className="fortune-price-interest-heading">
   <div><span className="fortune-price-interest-eyebrow">即將推出 · 意願調查</span>
    <h3>想更深入了解自己的命格？</h3></div>
   <strong>NT$79 <small>預計售價</small></strong>
  </div>
  <p>我們正在評估「八字完整深度報告」，包含性格、事業、人際與人生階段的延伸解析。基本命盤與免費摘要仍可查看；完整分析與未來三年逐年解讀將規劃於深度版。</p>
  {interested?<p className="fortune-price-interest-thanks" role="status">收到你的意願！目前尚未開放購買，也不會收取任何費用。</p>:
   <button type="button" className="fortune-price-interest-button" onClick={()=>{
    setInterested(true);
    trackUsageEvent("fortune_price_interest","bazi");
   }}>我有興趣</button>}
  <small>這是價格意願測試，非正式商品。點擊不會付款、預訂或解鎖付費內容。</small>
 </section>;
}
