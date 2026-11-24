import {useEffect,useState} from "react";
import {Link,useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import "./purchasedReports.css";

type ReportItem={id:string;mode:"bazi";title:string;status:"ready"|"generating"|"failed";version:string;createdAt:number;updatedAt:number};
type ReportDetail={id:string;mode:"bazi";title:string;version:string;createdAt:number;sections:{title:string;body:string}[]};
type LoadState="loading"|"ready"|"login"|"unavailable"|"error";
const dateLabel=(seconds:number,zh:boolean)=>Number.isFinite(seconds)&&seconds>0?
 new Date(seconds*1000).toLocaleDateString(zh?"zh-TW":"en-US"):"";

export function FortunePurchasedReportsPage(){
 const {i18n}=useTranslation();const zh=/^zh(?:-|$)/i.test(i18n.resolvedLanguage||i18n.language);
 const copy=(a:string,b:string)=>zh?a:b;
 const[status,setStatus]=useState<LoadState>("loading");
 const[items,setItems]=useState<ReportItem[]>([]);
 useEffect(()=>{
  const controller=new AbortController();
  void fetch("/api/fortune/reports",{credentials:"same-origin",cache:"no-store",signal:controller.signal})
   .then(async res=>{
    if(res.status===401){setStatus("login");return}
    if(res.status===503){setStatus("unavailable");return}
    if(!res.ok)throw Error("Reports request failed");
    const payload=await res.json() as {items?:ReportItem[]};
    if(!Array.isArray(payload.items))throw Error("Unexpected reports response");
    setItems(payload.items);setStatus("ready");
   })
   .catch(()=>{if(!controller.signal.aborted)setStatus("error")});
  return()=>controller.abort();
 },[]);
 return <main className="fortune-purchases">
  <Link className="text-button" to="/me">‹ {copy("返回我的 Koolo","Back to My Koolo")}</Link>
  <header className="hero"><span className="kicker">KOOLO FORTUNE</span>
   <h1>{copy("已購買報告","Purchased reports")}</h1>
   <p>{copy("用購買時的帳號登入，就能在手機或電腦重新閱讀完整報告。","Sign in with the account used to purchase to reread reports across devices.")}</p>
  </header>
  {status==="loading"&&<p role="status">{copy("正在載入你的報告…","Loading your reports…")}</p>}
  {status==="login"&&<section className="panel section fortune-purchases-message"><h2>{copy("請先登入","Sign in to continue")}</h2><p>{copy("已購買的報告綁定 Koolo 帳號，不會跟著這台裝置的本機命盤同步。","Purchased reports belong to your Koolo account, not this device's local chart history.")}</p><Link className="btn" to="/account">{copy("前往登入","Sign in")}</Link></section>}
  {status==="unavailable"&&<section className="panel section fortune-purchases-message" role="status"><h2>{copy("報告書架尚未就緒","Library is being prepared")}</h2><p>{copy("目前尚未開放收款，報告服務也可能尚未完成設定。請稍後再查看。","Payments are not active yet; the report service may still be in setup.")}</p></section>}
  {status==="error"&&<section className="panel section fortune-purchases-message" role="alert"><p>{copy("無法載入報告，請重新整理再試。","Couldn't load reports. Please refresh and try again.")}</p></section>}
  {status==="ready"&&(items.length?<section className="fortune-purchases-list" aria-label={copy("已購買報告清單","Purchased report list")}>
   {items.map(item=><article className="panel fortune-purchases-item" key={item.id}>
    <div><small>{dateLabel(item.createdAt,zh)} · {copy("八字深度報告","BaZi deep report")}</small><h2>{item.title}</h2>
     <p>{item.status==="ready"?copy("已完成 · 可隨時閱讀","Ready · Available anytime"):item.status==="generating"?copy("報告製作中","Preparing your report"):copy("製作未完成，請聯絡客服協助","Preparation needs attention; please contact support")}</p>
    </div>
    {item.status==="ready"&&<Link className="btn secondary" to={"/fortune/purchases/"+encodeURIComponent(item.id)}>{copy("查看完整報告","Read report")}</Link>}
   </article>)}
  </section>:<section className="panel section fortune-purchases-message">
   <h2>{copy("目前沒有已購買報告","No purchased reports yet")}</h2>
   <p>{copy("完整命盤解鎖（預定 NT$69）與專屬一生命書（預定 NT$99）尚未開放購買。網站解鎖的限時免費活動準備中；免費命盤仍可正常使用。","Full chart access (planned NT$69) and the personal life book (planned NT$99) are not on sale yet. A website-access free trial is being prepared; free charts remain available.")}</p>
   <Link className="btn secondary" to="/fortune/history">{copy("查看我的命盤","View local readings")}</Link>
  </section>)}
 </main>;
}
export function FortunePurchasedReportDetailPage(){
 const {reportId}=useParams();const {i18n}=useTranslation();
 const zh=/^zh(?:-|$)/i.test(i18n.resolvedLanguage||i18n.language);
 const copy=(a:string,b:string)=>zh?a:b;
 const[status,setStatus]=useState<LoadState>("loading");
 const[report,setReport]=useState<ReportDetail|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  if(!reportId){setStatus("error");return()=>controller.abort()}
  void fetch("/api/fortune/reports/"+encodeURIComponent(reportId),{credentials:"same-origin",cache:"no-store",signal:controller.signal})
   .then(async res=>{
    if(res.status===401){setStatus("login");return}
    if(res.status===503){setStatus("unavailable");return}
    if(res.status===404){setStatus("error");return}
    if(!res.ok)throw Error("Report request failed");
    const payload=await res.json() as {report?:ReportDetail};
    if(!payload.report||!Array.isArray(payload.report.sections))throw Error("Unexpected report content");
    setReport(payload.report);setStatus("ready");
   })
   .catch(()=>{if(!controller.signal.aborted)setStatus("error")});
  return()=>controller.abort();
 },[reportId]);
 return <main className="fortune-purchases">
  <Link className="text-button" to="/fortune/purchases">‹ {copy("已購買報告","Purchased reports")}</Link>
  {status==="loading"&&<p role="status">{copy("正在讀取報告…","Loading report…")}</p>}
  {status==="login"&&<section className="panel section fortune-purchases-message"><h1>{copy("請先登入購買時的帳號","Sign in with the purchasing account")}</h1><Link className="btn" to="/account">{copy("前往登入","Sign in")}</Link></section>}
  {status==="unavailable"&&<p role="status">{copy("報告服務暫時無法使用。","Report service is temporarily unavailable.")}</p>}
  {status==="error"&&<section className="panel section fortune-purchases-message" role="alert"><h1>{copy("找不到這份報告","Report not found")}</h1><p>{copy("請確認使用購買時的帳號登入；已退款的報告無法繼續閱讀。","Check that you're signed into the purchasing account. Refunded reports are not available.")}</p></section>}
  {status==="ready"&&report&&<article className="fortune-purchases-document">
   <header className="hero"><span className="kicker">{copy("八字深度報告","BAZI DEEP REPORT")} · {dateLabel(report.createdAt,zh)}</span><h1>{report.title}</h1></header>
   {report.sections.map((section,i)=><section className="panel section fortune-purchases-section" key={i}>
    <h2>{section.title}</h2><p>{section.body}</p>
   </section>)}
   <p className="fortune-purchases-note">{copy("命理解讀僅供自我探索與娛樂參考，不取代專業建議。","Fortune content is for reflection and entertainment, not professional advice.")}</p>
  </article>}
 </main>;
}
