import {useCallback,useEffect,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import "./ecpayStage.css";

type FactPayload={fourPillars:string;dayMaster:string;element:string;strength:string;currentLuck:string;
 resource:number;output:number;officer:number;directWealth:number;indirectWealth:number;spousePalace:string};
type ReadingRecord={id:string;mode:string;createdAt?:string;result?:Record<string,any>};
type TestOrder={id:string;state:"pending"|"paid";createdAt:number;sandbox:true;report?:{sections:{title:string;body:string}[]}};
type TestConfig={enabled:true;sandbox:true;amountTwd:79};
type Checkout={action:string;fields:Record<string,string>};
const getHistory=():ReadingRecord[]=>{
 try{const raw=JSON.parse(localStorage.getItem("crew_fortune_readings_v2")||"[]");
  return Array.isArray(raw)?raw.filter((x:unknown):x is ReadingRecord=>!!x&&typeof x==="object"&&
   (x as ReadingRecord).mode==="bazi"&&typeof (x as ReadingRecord).id==="string"&&
   !!(x as ReadingRecord).result).slice(0,20):[];
 }catch{return []}
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
 const[orders,setOrders]=useState<TestOrder[]>([]),[order,setOrder]=useState<TestOrder|null>(null);
 const[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>setRecords(getHistory()),[]);
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  const headers={credentials:"same-origin" as const,cache:"no-store" as const,signal};
  const responses=await Promise.all([
   fetch("/api/fortune/ecpay/test-orders",headers),
   ...(orderId?[fetch("/api/fortune/ecpay/test-status?id="+encodeURIComponent(orderId),headers)]:[])
  ]);
  if(signal?.aborted)return;
  if(responses[0].ok){const d=await responses[0].json() as{orders?:TestOrder[]};setOrders(Array.isArray(d.orders)?d.orders:[])}
  if(orderId&&responses[1]?.ok){const d=await responses[1].json() as{order?:TestOrder};if(d.order)setOrder(d.order)}
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
    if(data.sandbox!==true||data.amountTwd!==79)throw Error("not sandbox");
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
 async function submit(){
  if(!facts||busy||config!=="ready")return;
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/fortune/ecpay/test-order",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({facts})
   });
   const result=await response.json() as{error?:string;orderId?:string;checkout?:Checkout};
   if(!response.ok)throw Error(result.error||"CREATE_ORDER_FAILED");
   if(!result.orderId||!result.checkout||result.checkout.action!=="https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5"||
     typeof result.checkout.fields?.CheckMacValue!=="string")throw Error("INVALID_CHECKOUT");
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
  <header className="hero"><span className="kicker">KOOLO × ECPAY · SANDBOX</span>
   <h1>{copy("綠界付款測試台","ECPay payment sandbox")}</h1>
   <p>{copy("這裡只測流程，不會扣款、開通正式報告或增加語音額度。請勿使用真實信用卡。","Test the payment flow only. No real charges, paid reports or voice credits. Never enter a real credit card.")}</p>
  </header>
  <section className="panel section koolo-ecpay-stage-warning" role="note">
   <strong>{copy("僅測試 · NT$79","Sandbox only · NT$79")}</strong>
   <p>{copy("使用綠界公開測試商家，完成測試後產生示範報告。這不是正式付款，示範報告不會出現在正式「已購買報告」清單。","Uses ECPay's public test merchant. Successful sandbox payments generate a demo report, separate from live purchases.")}</p>
  </section>
  {config==="loading"&&<p role="status">{copy("正在檢查測試權限…","Checking sandbox access…")}</p>}
  {config==="login"&&<section className="panel section"><h2>{copy("請先登入 Koolo","Sign in first")}</h2><Link className="btn" to="/account">{copy("前往登入","Sign in")}</Link></section>}
  {config==="denied"&&<section className="panel section" role="status"><h2>{copy("此帳號未開放付款測試","Not an authorized test account")}</h2><p>{copy("請在 Cloudflare 設定 KOOLO_ECPAY_TEST_USER_IDS，填入登入帳號的 user.id。","Add your signed-in user.id to KOOLO_ECPAY_TEST_USER_IDS in Cloudflare.")}</p></section>}
  {config==="disabled"&&<section className="panel section" role="status"><h2>{copy("測試環境尚未啟用","Sandbox not yet enabled")}</h2><p>{copy("需先執行 0009 SQL，再設定 Cloudflare 的 KOOLO_ECPAY_STAGE_ENABLED=1 及 KOOLO_ECPAY_TEST_USER_IDS。","Apply migration 0009 and configure sandbox flags in Cloudflare.")}</p></section>}
  {config==="error"&&<p role="alert">{copy("測試服務暫時無法連線，請重新整理。","Unable to load sandbox. Refresh and retry.")}</p>}
  {config==="ready"&&<>
   {orderId&&<section className="panel section koolo-ecpay-stage-status">
    <h2>{copy("測試訂單狀態","Sandbox order status")}</h2>
    {!order?<p role="status">{copy("正在查詢伺服器的付款狀態…","Checking verified server payment status…")}</p>:
     <><p><strong>{order.state==="paid"?copy("測試付款成功，示範報告已保存","Sandbox paid: demo report saved"):
       copy("等待綠界伺服器通知（尚未確認付款）","Awaiting ECPay server notification")}</strong></p>
      <small>{copy("訂單","Order")}：{order.id}</small>
      {order.state==="paid"&&order.report&&<div className="koolo-ecpay-stage-report">
       {order.report.sections.map((section,i)=><section className="koolo-ecpay-stage-section" key={i}>
        <h3>{section.title}</h3><p>{section.body}</p>
       </section>)}
      </div>}
     </>}
    <p><button className="btn secondary small" type="button" onClick={()=>void refresh().catch(()=>setError("STATUS_RETRY_FAILED"))}>{copy("重新檢查狀態","Refresh status")}</button></p>
   </section>}
   <section className="panel section koolo-ecpay-stage-chart">
    <h2>{copy("選擇命盤，建立測試訂單","Select chart for test order")}</h2>
    <p>{copy("只傳送命盤摘要（四柱、日主、十神統計），不傳出生姓名、生日、地址或 API Key。","Only calculated chart summary symbols are sent; not names, birth data, addresses or API keys.")}</p>
    {records.length===0?<p>{copy("目前沒有本機八字命盤，先免費算一次，再回來測試。","No local BaZi chart found. Create a free chart first.")} <Link to="/fortune/reading?mode=bazi">{copy("前往算命","Create chart")}</Link></p>:
    <div className="koolo-ecpay-stage-choices">{records.map(x=><Link className={x.id===readingId?"selected":""}
     to={"/fortune/ecpay/test?history="+encodeURIComponent(x.id)} key={x.id}>
      {text(x.result?.fourPillars)||copy("八字命盤","BaZi chart")} <small>{x.createdAt?new Date(x.createdAt).toLocaleDateString():""}</small>
     </Link>)}</div>}
    {selected&&(!facts?<p role="alert">{copy("這份命盤缺少必要欄位，請重新計算。","This chart is missing required symbols. Recalculate it.")}</p>:
     <button className="btn" type="button" disabled={busy} onClick={()=>void submit()}>
      {busy?copy("正在前往綠界測試頁…","Opening ECPay sandbox…"):copy("測試付款 NT$79（不會真扣款）","Test NT$79 payment (no charge)")}</button>)}
   </section>
   <section className="section koolo-ecpay-stage-history">
    <h2>{copy("我的測試訂單","My sandbox orders")}</h2>
    {orders.length===0?<p>{copy("尚無測試訂單。","No sandbox orders yet.")}</p>:
     <div className="koolo-ecpay-stage-orders">{orders.map(x=><Link key={x.id} to={"/fortune/ecpay/test?order="+encodeURIComponent(x.id)}>
      <strong>{x.state==="paid"?copy("測試成功","Sandbox paid"):copy("等待付款","Pending")}</strong>
      <small>{formatDate(x.createdAt,zh)}</small>
     </Link>)}</div>}
   </section>
  </>}
  {error&&<p role="alert" className="koolo-ecpay-stage-error">{copy("操作未完成：","Request did not complete: ")}{error}</p>}
 </main>;
}
