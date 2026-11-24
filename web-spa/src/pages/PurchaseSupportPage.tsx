import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import "./purchaseSupport.css";
const SUPPORT="cs@koolo.app";
function useCopy(){
 const {i18n}=useTranslation();const zh=/^zh(?:-|$)/i.test(i18n.resolvedLanguage||i18n.language);
 return (z:string,e:string)=>zh?z:e;
}
export function PurchaseInfoPage(){
 const c=useCopy();
 return <div className="koolo-purchase-support">
  <header className="hero"><span className="kicker">KOOLO</span><h1>{c("購買與付款說明","Purchases and payments")}</h1><p>{c("商品、交付、退款與客服資訊。","Products, delivery, refunds and support.")}</p></header>
  <section className="panel section"><strong>{c("目前尚未開放正式購買","Paid products are not available yet")}</strong><p>{c("以下商品正在規劃，免費功能照常使用。網站完整解析目前可免費閱讀，不會扣款，也不是預購。","The offers below are planned. Free features remain available. The full website reading is currently free to try; no charge or preorder.")}</p></section>
  <section className="panel section"><h2>{c("商品與預定售價","Planned products and prices")}</h2>
   <article><h3>{c("完整命盤解鎖 · 預定 NT$69","Full chart unlock · planned NT$69")}</h3><p>{c("單次購買，解鎖同一份八字命盤的完整網站解析，包含性格、天賦、事業、財富、感情、大運與流年。登入購買帳號後即可查看。","One-time purchase of full website insights for one BaZi chart: personality, talents, career, wealth themes, relationships, life cycles and annual themes. View in the purchasing account.")}</p><p>{c("預定原價 NT$69，目前開放網站版限時免費閱讀，包含 8 大主題、24 個解析細項與未來五年逐年解讀。","Planned regular price NT$69; the website edition is currently free to read, with 8 topics, 24 insights and five individual years.")}</p></article>
   <article><h3>{c("專屬一生命書 · 預定 NT$99","Personal life book · planned NT$99")}</h3><p>{c("包含同一命盤的完整網站解鎖及專屬數位命書，規劃提供人生各階段、未來五年逐年解析、電子翻書與 PDF 收藏。","Includes full access to the same chart and a personalized digital book with life stages, five-year themes, page-turn reading and PDF export.")}</p><p>{c("已付費解鎖同一命盤者，規劃補 NT$30 升級。免費體驗不等同已支付 NT$69。兩項商品均不自動續費；正式交付期限、保存條件與升級規則將於開放前確認。命理解讀不保證特定人生結果。","A planned NT$30 upgrade applies to the same previously paid chart; a free trial is not a NT$69 payment. Neither product renews automatically. Delivery, retention and upgrade terms will be confirmed before launch. Interpretations do not guarantee life outcomes.")}</p></article>
   <article><h3>{c("語音時間儲值 · 尚未定價","Voice time top-up · pricing TBD")}</h3><p>{c("預計按購買的語音時間使用，綁定 Koolo 帳號，不自動續費。","Planned prepaid voice time linked to your Koolo account, with no automatic renewal.")}</p></article>
  </section>
  <section className="panel section"><h2>{c("付款與交付","Payment and delivery")}</h2><p>{c("正式開放後，結帳將顯示商品、台幣總金額、可用付款方式及交付條件，再前往綠界付款頁。","Once launched, checkout will show the product, TWD total, payment methods and delivery terms before redirecting to ECPay.")}</p><p>{c("付款成功與商品交付是兩個不同狀態。請以帳號的訂單紀錄為準，不要因畫面關閉或暫時未顯示付款結果而重複付款。","Payment confirmation and delivery are separate. Check your account order history; do not pay again solely because a page closed or confirmation is delayed.")}</p><Link to="/me/orders">{c("查看我的訂單","View my orders")}</Link></section>
  <section className="panel section"><h2>{c("付款異常與退款","Payment problems and refunds")}</h2>
   <ul><li>{c("付款結果不明：先查看訂單及銀行通知，勿重複付款；若已扣款但仍未確認，請聯絡客服對帳。","Unknown result: check your order and bank notice; do not pay again. Contact support if charged without confirmation.")}</li><li>{c("已付款但未交付：保留訂單編號，聯絡客服協助補發或退款，不必再次購買。","Paid but not delivered: keep your order number and contact support for delivery recovery or refund without repurchasing.")}</li><li>{c("重複扣款、錯誤金額或無法交付：經核對後處理應退金額，退款進度依付款機構實際結果確認。","Duplicate charges, incorrect amounts or failed delivery: we will review the amount due for refund and confirm the payment provider's actual outcome.")}</li></ul>
   <p>{c("退款由管理員核對後處理，使用者不需在網站提交退款操作，請透過客服聯繫。","Refunds are processed by authorized administrators after review. Contact support for assistance; there is no self-service refund action.")}</p><p>{c("正式交易適用的消費者權利依法保障。若有依法適用的解除權例外，將在購買前明確告知並取得必要同意。","Applicable consumer rights are protected by law. Any lawful exception to cancellation rights will be disclosed and required consent obtained before purchase.")}</p>
  </section>
  <section className="panel section"><h2>{c("聯絡客服","Contact support")}</h2><p><a href={"mailto:"+SUPPORT}>{SUPPORT}</a></p><p>{c("請提供訂單編號、付款時間、金額及遇到的問題。不要提供完整卡號、信用卡安全碼、銀行密碼、登入憑證或完整命盤個資。","Include the order reference, payment time, amount and issue. Never include full card numbers, CVV, bank passwords, login credentials or complete birth details.")}</p><Link to="/privacy">{c("隱私與資料","Privacy and data")}</Link></section>
 </div>;
}
type Order={id:string;source:"fortune"|"billing";kind:"fortune_report"|"voice_pack";legacy:boolean;amountTwd:number;status:"pending"|"paid"|"canceled"|"refunded"|"chargeback";delivery:"unavailable"|"ready"|"processing"|"failed"|"review";createdAt:number;reportId?:string};
export function PurchaseOrdersPage(){
 const c=useCopy();
 const [state,setState]=useState("loading"),[orders,setOrders]=useState<Order[]>([]),[revision,setRevision]=useState(0);
 useEffect(()=>{const controller=new AbortController();setState("loading");
  void fetch("/api/membership/orders",{credentials:"same-origin",cache:"no-store",signal:controller.signal}).then(async res=>{
   if(controller.signal.aborted)return;
   if(res.status===401){setState("login");return}
   if(!res.ok)throw Error("orders");
   const body=await res.json();
   if(!Array.isArray(body.orders)||body.checkoutEnabled!==false)throw Error("invalid orders");
   if(!controller.signal.aborted){setOrders(body.orders);setState("ready")}
  }).catch(()=>{if(!controller.signal.aborted)setState("error")});return()=>controller.abort();
 },[revision]);
 const payment=(s:Order["status"])=>({pending:c("付款尚未確認","Awaiting payment confirmation"),paid:c("付款已確認","Payment confirmed"),canceled:c("已取消","Canceled"),refunded:c("已退款","Refunded"),chargeback:c("款項有爭議","Payment disputed")})[s];
 const delivery=(s:Order["delivery"])=>({unavailable:c("尚未開通","Unavailable"),ready:c("已交付","Delivered"),processing:c("製作中","Preparing"),failed:c("製作未完成，請聯絡客服","Preparation failed; contact support"),review:c("交付待確認，請聯絡客服","Delivery needs review; contact support")})[s];
 return <div className="koolo-purchase-support">
  <header className="hero"><span className="kicker">KOOLO</span><h1>{c("我的訂單","My orders")}</h1><p>{c("付款與交付分開顯示。結果未確認前請勿再次付款。","Payment and delivery are shown separately. Do not pay again while the result is unknown.")}</p></header>
  <p><Link to="/purchase-info">{c("購買、退款與客服說明","Purchase, refund and support information")}</Link></p>
  {state==="loading"&&<p role="status">{c("正在查詢訂單…","Loading orders…")}</p>}
  {state==="login"&&<section className="panel section"><Link to="/account">{c("請使用購買時的帳號登入","Sign in with the purchasing account")}</Link></section>}
  {state==="error"&&<section className="panel section" role="alert"><p>{c("訂單暫時無法查詢，不代表未付款。請稍後重新查詢，不要再次付款。","Orders are temporarily unavailable. This does not mean unpaid. Refresh later and do not pay again.")}</p><button className="btn secondary" onClick={()=>setRevision(x=>x+1)}>{c("重新查詢","Refresh")}</button></section>}
  {state==="ready"&&<><button className="btn secondary" onClick={()=>setRevision(x=>x+1)}>{c("重新查詢","Refresh")}</button>
   {!orders.length&&<p>{c("目前沒有正式商品訂單。","No paid-product orders yet.")}</p>}
   {orders.map(o=><section className="panel section" key={o.source+":"+o.id}>
    <h2>{o.kind==="voice_pack"?c("語音時間","Voice time"):o.legacy?c("八字深度報告","BaZi deep report"):c("命理報告","Fortune report")}</h2>
    <p>NT$ {o.amountTwd}</p><p>{payment(o.status)} · {delivery(o.delivery)}</p>
    <small className="purchase-order-id">{c("訂單編號","Order reference")}：{o.id}</small>
    {o.status==="paid"&&o.delivery==="ready"&&o.reportId&&<p><Link to={"/fortune/purchases/"+encodeURIComponent(o.reportId)}>{c("閱讀報告","Read report")}</Link></p>}
    {o.status==="paid"&&o.delivery==="ready"&&o.kind==="voice_pack"&&<p><Link to="/me/voice-credits">{c("查看語音額度","View voice credits")}</Link></p>}
    <p><a href={"mailto:"+SUPPORT+"?subject="+encodeURIComponent("Koolo order "+o.id)}>{c("這筆訂單需要協助","Get help with this order")}</a></p>
   </section>)}
  </>}
 </div>;
}
