import {useCallback,useEffect,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {dailyProfileHash} from "./dailyCard";
import {readDailyChartMeta,readDailyPreference,DAILY_PROFILE_EVENT} from "./dailyProfileSelection";
import {readOrderChartRecords,selectOrderCharts,type OrderChartReading} from "./orderChartSelection";
import "./ecpayStage.css";

type FactPayload={fourPillars:string;dayMaster:string;element:string;strength:string;currentLuck:string;
 resource:number;output:number;officer:number;directWealth:number;indirectWealth:number;spousePalace:string};
type ReadingRecord=OrderChartReading;
type TestOrder={id:string;state:"pending"|"paid";createdAt:number;amountTwd:79|99;sandbox:true;
 lifecycle:"pending"|"paid"|"expired"|"cancelled"|"failed"|"legacy";reportState:"ready"|"not_started";
 expiresAt:number|null;nextCheckAt:number|null;canCancel:boolean;canCheck:boolean;canRetry:boolean;
 report?:{sections:{title:string;body:string}[]}};
type TestConfig={enabled:true;sandbox:true;amountTwd:99};
type Checkout={action:string;fields:Record<string,string>};
const getHistory=():ReadingRecord[]=>{
 try{return readOrderChartRecords(JSON.parse(localStorage.getItem("crew_fortune_readings_v2")||"[]"))}catch{return []}
};
const number=(v:unknown)=>Number.isInteger(Number(v))?Math.max(0,Math.min(20,Number(v))):0;
const text=(v:unknown,max=75)=>typeof v==="string"?v.trim().slice(0,max):"";
const ELEMENT_MAP:Record<string,string>={甲:"木",乙:"木",丙:"火",丁:"火",戊:"土",己:"土",庚:"金",辛:"金",壬:"水",癸:"水"};
function factsFromReading(reading:ReadingRecord):FactPayload|null{
 const r=reading.result||{},fourPillars=text(r.fourPillars);
 const dayMaster=text(r.dayMaster,12),element=text(r.dayMasterElement,4)||ELEMENT_MAP[dayMaster[0]]||"";
 if(!fourPillars||!dayMaster||!["木","火","土","金","水"].includes(element))return null;
 return {fourPillars,dayMaster,element,strength:text(r.dayMasterStrength,25),
  currentLuck:text(r.currentLuckPillar?.ganZhi,24),
  resource:number(r.careerProfile?.resourceCount),output:number(r.careerProfile?.outputCount),
  officer:number(r.careerProfile?.officerCount),directWealth:number(r.wealthProfile?.directWealthCount),
  indirectWealth:number(r.wealthProfile?.indirectWealthCount),
  spousePalace:text(r.relationshipProfile?.spousePalace,12)};
}
const formatDate=(v:number,zh:boolean)=>new Date(v*1000).toLocaleString(zh?"zh-TW":"en-US");
export function FortuneEcpayStagePage(){
 const{ i18n }=useTranslation();const zh=/^zh(?:-|$)/i.test(i18n.resolvedLanguage||i18n.language);
 const copy=(z:string,e:string)=>zh?z:e;
 const[params,setParams]=useSearchParams();
 const readingId=params.get("history"),orderId=params.get("order");
 const[records,setRecords]=useState<ReadingRecord[]>([]);
 const[config,setConfig]=useState<"loading"|"ready"|"login"|"denied"|"disabled"|"error">("loading");
 const[orders,setOrders]=useState<TestOrder[]>([]),[loadedOrder,setOrder]=useState<TestOrder|null>(null);
 const order=loadedOrder?.id===orderId?loadedOrder:null;
 const[showClosed,setShowClosed]=useState(false);
 const[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  const update=()=>setRecords(getHistory());
  update();window.addEventListener("storage",update);window.addEventListener(DAILY_PROFILE_EVENT,update);
  return()=>{window.removeEventListener("storage",update);window.removeEventListener(DAILY_PROFILE_EVENT,update)};
 },[]);
 const choices=selectOrderCharts(records,readingId);
 const selfHash=readDailyPreference().selfHash;
 function chartName(row:ReadingRecord){
  const p=row.profile;
  if(!p||typeof p.birthDate!=="string"||!p.birthDate)return copy("未命名命盤","Unnamed chart");
  const hash=dailyProfileHash(p);
  return readDailyChartMeta(hash).nickname?.trim()||(hash===selfHash?copy("本人","Myself"):copy("未命名命盤","Unnamed chart"));
 }
 function birthLabel(row:ReadingRecord){
  const p=row.profile;
  if(!p||typeof p.birthDate!=="string"||!p.birthDate)return copy("出生資料未保存","Birth details not saved");
  return [copy("出生","Born")+" "+p.birthDate,typeof p.birthTime==="string"?p.birthTime:"",typeof p.city==="string"?p.city:""].filter(Boolean).join(" · ");
 }
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  const headers={credentials:"same-origin" as const,cache:"no-store" as const,signal};
  const responses=await Promise.all([
   fetch("/api/fortune/ecpay/test-orders",headers),
   ...(orderId?[fetch("/api/fortune/ecpay/test-status?id="+encodeURIComponent(orderId),headers)]:[])
  ]);
  if(signal?.aborted)return;
  if(responses[0].ok){const d=await responses[0].json() as{orders?:TestOrder[]};setOrders(Array.isArray(d.orders)?d.orders:[])}
  if(orderId&&responses[1]?.ok){const d=await responses[1].json() as{order?:TestOrder};if(!signal?.aborted&&d.order?.id===orderId)setOrder(d.order)}
 },[orderId]);
 useEffect(()=>{
  const controller=new AbortController();
  void fetch("/api/fortune/ecpay/test-config",{credentials:"same-origin",cache:"no-store",signal:controller.signal})
   .then(async res=>{
    if(controller.signal.aborted)return;
    if(res.status===401){setConfig("login");return}
    if(res.status===403){setConfig("denied");return}
    if(res.status===503){setConfig("disabled");return}
    if(!res.ok)throw Error("config");
    const data=await res.json() as TestConfig;
    if(data.sandbox!==true||data.amountTwd!==99)throw Error("not sandbox");
    setConfig("ready");
    await refresh(controller.signal);
   }).catch(()=>{if(!controller.signal.aborted)setConfig("error")});
  return()=>controller.abort();
 },[refresh]);
 useEffect(()=>{
  if(config!=="ready"||!orderId||order?.state==="paid")return;
  const timer=window.setInterval(()=>{void refresh().catch(()=>{})},5000);
  return()=>window.clearInterval(timer);
 },[config,orderId,order?.state,refresh]);
 const selected=records.find(x=>x.id===readingId)||null;
 const facts=selected?factsFromReading(selected):null;
 function statusLabel(x:TestOrder){
  switch(x.lifecycle){
   case "paid":return copy("製作完成","Report ready");
   case "cancelled":return copy("已取消（待確認付款結果）","Cancelled locally · awaiting confirmation");
   case "expired":return copy("已逾期（待確認付款結果）","Expired · awaiting confirmation");
   case "failed":return copy("付款未完成，可重新付款","Payment unsuccessful · retry available");
   case "legacy":return copy("舊測試訂單・未確認付款","Legacy order · unconfirmed");
   default:return copy("尚未確認付款","Payment unconfirmed");
  }
 }
 function errorLabel(code:string){
  const labels:Record<string,string>={CHECK_TOO_EARLY:copy("尚未到可向綠界查詢的時間。","Too early to query ECPay."),PROVIDER_UNAVAILABLE:copy("綠界暫時無法查詢，請稍後再試。","ECPay unavailable. Try again later."),PROVIDER_UNVERIFIED:copy("尚無法確認綠界交易結果，請稍後再查，不要重複付款。","Unable to verify payment. Check later; do not pay again."),PAYMENT_NOT_CONFIRMED_FAILED:copy("舊訂單尚未確認未付款，不能重試。","Previous payment not confirmed unsuccessful."),ORDER_ALREADY_PENDING:copy("已有一筆相同命盤的未確認訂單，已開啟原訂單。","An unresolved order already exists; opened it instead."),PAYMENT_REVIEW_REQUIRED:copy("付款結果需進一步確認。","Payment needs review.")};
  return labels[code]||code;
 }
 async function orderAction(action:"check"|"cancel"){
  if(!order||busy)return;
  if(action==="cancel"&&!window.confirm(copy("取消只會關閉 Koolo 的付款流程，不會取消綠界授權；若已付款仍會保存報告。確定取消？","Cancel locally? This does not cancel ECPay authorization; confirmed payments still produce a report.")))return;
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/fortune/ecpay/test-action",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:order.id,action})});
   const result=await response.json() as {error?:string;order?:TestOrder};
   if(!response.ok)throw Error(result.error||"REQUEST_FAILED");
   if(result.order)setOrder(result.order);
  }catch(e){setError(e instanceof Error?e.message:"ERROR")}
  finally{setBusy(false);void refresh().catch(()=>{})}
 }
 async function submit(retryOrderId?:string){
  if((!facts&&!retryOrderId)||busy||config!=="ready")return;
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/fortune/ecpay/test-order",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},body:retryOrderId?JSON.stringify({retryOrderId}):JSON.stringify({facts})
   });
   const result=await response.json() as{error?:string;orderId?:string;checkout?:Checkout};
   if(response.status===409&&result.error==="ORDER_ALREADY_PENDING"&&result.orderId){setBusy(false);setParams({order:result.orderId});setError(result.error);return}
   if(!response.ok)throw Error(result.error||"CREATE_ORDER_FAILED");
   if(!result.orderId||!result.checkout||result.checkout.action!=="https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5"||
     result.checkout.fields?.TotalAmount!=="99"||typeof result.checkout.fields?.CheckMacValue!=="string")throw Error("INVALID_CHECKOUT");
   const form=document.createElement("form");
   form.action=result.checkout.action;form.method="POST";form.acceptCharset="UTF-8";
   for(const[name,value]of Object.entries(result.checkout.fields)){
    const input=document.createElement("input");input.type="hidden";input.name=name;input.value=value;form.appendChild(input);
   }
   document.body.appendChild(form);form.submit();
   // If browser navigation is blocked, recover by showing the generated order.
   window.setTimeout(()=>{if(document.contains(form)){form.remove();setBusy(false);
    setParams({order:result.orderId!});setError("CHECK_BROWSER_NAVIGATION")}},3000);
  }catch(e){setBusy(false);setError(e instanceof Error?e.message:"ERROR")}
 }
 return <main className="koolo-ecpay-stage">
  <Link className="text-button" to="/fortune/purchases">‹ {copy("返回命理書架","Back to reports")}</Link>
  <header className="hero"><span className="kicker hero-context">KOOLO × ECPAY · SANDBOX</span>
   <h1>{copy("專屬一生命書付款測試台","Personal life book payment sandbox")}</h1>
   <p>{copy("這裡只測流程，不會扣款、開通正式報告或增加語音額度。請勿使用真實信用卡。","Test the payment flow only. No real charges, paid reports or voice credits. Never enter a real credit card.")}</p>
  </header>
  <section className="panel section koolo-ecpay-stage-warning" role="note">
   <strong>{copy("僅測試 · NT$99","Sandbox only · NT$99")}</strong>
   <p>{copy("使用綠界公開測試商家，完成測試後產生示範報告。這不是正式付款，示範報告不會出現在正式「已購買報告」清單。","Uses ECPay's public test merchant. Successful sandbox payments generate a demo report, separate from live purchases.")}</p>
  </section>
  {config==="loading"&&<p role="status">{copy("正在檢查測試權限…","Checking sandbox access…")}</p>}
  {config==="login"&&<section className="panel section"><h2>{copy("請先登入 Koolo","Sign in first")}</h2><Link className="btn" to="/account">{copy("前往登入","Sign in")}</Link></section>}
  {config==="denied"&&<section className="panel section" role="status"><h2>{copy("此帳號未開放付款測試","Not an authorized test account")}</h2><p>{copy("請在 Cloudflare 設定 KOOLO_ECPAY_TEST_USER_IDS，填入登入帳號的 user.id。","Add your signed-in user.id to KOOLO_ECPAY_TEST_USER_IDS in Cloudflare.")}</p></section>}
  {config==="disabled"&&<section className="panel section" role="status"><h2>{copy("測試環境尚未啟用","Sandbox not yet enabled")}</h2><p>{copy("需先執行 0009、0013 與 0014 SQL，再設定 Cloudflare 的 KOOLO_ECPAY_STAGE_ENABLED=1 及 KOOLO_ECPAY_TEST_USER_IDS。","Apply migrations 0009, 0013 and 0014 and configure sandbox flags in Cloudflare.")}</p></section>}
  {config==="error"&&<p role="alert">{copy("測試服務暫時無法連線，請重新整理。","Unable to load sandbox. Refresh and retry.")}</p>}
  {config==="ready"&&<>
   {orderId&&<section className="panel section koolo-ecpay-stage-status">
    <h2>{copy("測試訂單狀態","Sandbox order status")}</h2>
    {!order?<p role="status">{copy("正在查詢伺服器的付款狀態…","Checking verified server payment status…")}</p>:
     <><p><strong>{order.state==="paid"?copy("測試付款成功，示範報告已保存","Sandbox paid: demo report saved"):
       statusLabel(order)}</strong></p>
      <small>{copy("訂單","Order")}：{order.id} · NT${order.amountTwd}</small>
      {order.state!=="paid"&&order.lifecycle!=="legacy"&&<div className="koolo-ecpay-stage-order-actions">
       <p>{order.lifecycle==="failed"?copy("綠界已確認前次交易未完成。重試會使用新的交易編號，原訂單保留。","ECPay confirmed the prior attempt was unsuccessful. Retry creates a new transaction number."):
        copy("若已付款，請勿再次付款。取消或逾期不代表綠界未扣款；確認付款後仍會保存報告。","If you paid, do not pay again. Local cancellation or expiry does not confirm nonpayment; verified payments still produce a report.")}</p>
       {order.lifecycle==="pending"&&order.expiresAt&&<small>{copy("本機付款期限","Local payment window")}：{formatDate(order.expiresAt,zh)}</small>}
       {order.canRetry?<button className="btn" type="button" disabled={busy} onClick={()=>void submit(order.id)}>{copy("繼續付款（重新交易）","Continue payment (new attempt)")}</button>:
        <><button className="btn secondary" type="button" disabled={busy||!order.canCheck} onClick={()=>void orderAction("check")}>{copy("向綠界確認付款結果","Verify with ECPay")}</button>
        {!order.canCheck&&order.nextCheckAt&&<small>{copy("可再次向綠界查詢時間","Next provider check")}：{formatDate(order.nextCheckAt,zh)}</small>}</>}
       {order.canCancel&&<button className="btn secondary small" type="button" disabled={busy} onClick={()=>void orderAction("cancel")}>{copy("取消訂單","Cancel order")}</button>}
      </div>}
      {order.state==="paid"&&order.report&&<div className="koolo-ecpay-stage-report">
       {order.report.sections.map((section,i)=><section className="koolo-ecpay-stage-section" key={i}>
        <h3>{section.title}</h3><p>{section.body}</p>
       </section>)}
      </div>}
     </>}
    <p><button className="btn secondary small" type="button" onClick={()=>void refresh().catch(()=>setError("STATUS_RETRY_FAILED"))}>{copy("重新檢查狀態","Refresh status")}</button></p>
   </section>}
   <section className="panel section koolo-ecpay-stage-chart">
    <h2>{copy("選擇命盤對象","Choose a person")}</h2>
    <div className="koolo-ecpay-stage-chart-tools">
     <Link to="/fortune#daily-profiles">{copy("管理命盤／設定姓名","Manage charts / names")}</Link>
     <Link to="/fortune/reading?mode=bazi">{copy("＋ 新增命盤","＋ Add chart")}</Link>
    </div>
    {choices.length===0?<p>{copy("目前沒有本機八字命盤，請先免費排盤。","No local BaZi chart found. Create a free chart first.")}</p>:
    <div className="koolo-ecpay-stage-choices">{choices.map(x=><Link className={x.id===readingId?"selected":""}
     aria-current={x.id===readingId?"true":undefined}
     to={"/fortune/ecpay/test?history="+encodeURIComponent(x.id)} key={x.id}>
      <span className="koolo-ecpay-stage-chart-name"><strong>{chartName(x)}</strong>{x.id===readingId&&<span>{copy("✓ 已選擇","✓ Selected")}</span>}</span>
      <small>{birthLabel(x)}</small>
      <small>{text(x.result?.fourPillars)||copy("八字命盤","BaZi chart")}{x.createdAt&&!Number.isNaN(Date.parse(x.createdAt))?" · "+copy("排盤","Calculated")+" "+new Date(x.createdAt).toLocaleDateString(zh?"zh-TW":"en-US"):""}</small>
     </Link>)}</div>}
    <p className="koolo-ecpay-stage-chart-privacy">{copy("姓名與出生資料僅供本機辨識；訂單只傳送命盤摘要，不傳姓名、生日、地址或 API Key。","Names and birth details are local only. Orders send calculated chart facts, never names, birth data, addresses or API keys.")}</p>
    {selected&&(!facts?<p role="alert">{copy("這份命盤缺少必要欄位，請重新計算。","This chart is missing required symbols. Recalculate it.")}</p>:
     <button className="btn" type="button" disabled={busy} onClick={()=>void submit()}>
      {busy?copy("正在前往綠界測試頁…","Opening ECPay sandbox…"):copy("測試付款 NT$99（不會真扣款）","Test NT$99 payment (no charge)")}</button>)}
   </section>
   <section className="section koolo-ecpay-stage-history">
    <h2>{copy("我的測試訂單","My sandbox orders")}</h2>
    {orders.length===0?<p>{copy("尚無測試訂單。","No sandbox orders yet.")}</p>:
     <><div className="koolo-ecpay-stage-orders">{orders.filter(x=>showClosed||!["expired","cancelled","failed"].includes(x.lifecycle)).map(x=><Link key={x.id} to={"/fortune/ecpay/test?order="+encodeURIComponent(x.id)}>
      <strong>{copy("專屬一生命書","Personal life book")} · {statusLabel(x)}</strong>
      <small>NT${x.amountTwd} · {formatDate(x.createdAt,zh)}</small>
     </Link>)}</div>
     {orders.some(x=>["expired","cancelled","failed"].includes(x.lifecycle))&&<button className="btn secondary small" type="button" aria-expanded={showClosed} onClick={()=>setShowClosed(v=>!v)}>{showClosed?copy("隱藏取消／逾期／失敗訂單","Hide closed attempts"):copy("查看取消／逾期／失敗訂單","Show closed attempts")}</button>}</>}

   </section>
  </>}
  {error&&<p role="alert" className="koolo-ecpay-stage-error">{copy("操作未完成：","Request did not complete: ")}{errorLabel(error)}</p>}
 </main>;
}
