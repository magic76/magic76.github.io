import {useEffect,useState,type ReactNode} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Arrow} from "../components/Arrow";
import {Icon,type IconName} from "../components/Icon";
import {KooloAdminEntry} from "./KooloAdminEntry";
import "./myAccountGroups.css";
import {geminiKey,geminiVerified,GEMINI_KEY_CHANGED_EVENT} from "../lib/runtime";

type RowItem={to:string;title:string;icon:IconName};
type Summary={status:"loading"}|{status:"login"}|{status:"error"}|{status:"ready";value:number};
const summarySources={
 reports:{url:"/api/fortune/reports",read:(body:Record<string,unknown>)=>Array.isArray(body.items)?body.items.length:null},
 credits:{url:"/api/voice/credits",read:(body:Record<string,unknown>)=>body.unit==="seconds"&&typeof body.availableSeconds==="number"&&Number.isSafeInteger(body.availableSeconds)&&body.availableSeconds>=0?body.availableSeconds:null}
};
function useSummary(source:keyof typeof summarySources){
 const [summary,setSummary]=useState<Summary>({status:"loading"});
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  const {url,read}=summarySources[source];
  void (async()=>{
   const response=await fetch(url,{credentials:"same-origin",cache:"no-store",signal:controller.signal});
   if(response.status===401)return {status:"login"} as const;
   if(!response.ok)throw Error("Summary unavailable");
   const value=read(await response.json());
   if(value===null)throw Error("Invalid summary");
   return {status:"ready",value} as const;
  })().then(result=>{if(!controller.signal.aborted)setSummary(result)})
   .catch(()=>{if(!controller.signal.aborted)setSummary({status:"error"})});
  return()=>controller.abort();
 },[source,revision]);
 function retry(){setSummary({status:"loading"});setRevision(value=>value+1)}
 return {summary,retry};
}
function AccountRow({to,icon,title,children}:{to:string;icon:IconName;title:string;children?:ReactNode}){
 return <Link className="koolo-account-row" to={to}>
  <Icon name={icon}/><span className="koolo-account-label">{title}</span>
  {children&&<span className="koolo-account-value">{children}</span>}<Arrow direction="chevron-right" size={16}/>
 </Link>;
}
function MyAiSettingsCard(){
 const {t}=useTranslation("common");
 const [status,setStatus]=useState<"free"|"pending"|"active"|null>(null);
 useEffect(()=>{
  const refresh=()=>{try{setStatus(geminiVerified()?"active":geminiKey()?"pending":"free")}catch{setStatus(null)}};
  refresh();
  window.addEventListener(GEMINI_KEY_CHANGED_EVENT,refresh);
  window.addEventListener("focus",refresh);
  window.addEventListener("storage",refresh);
  return()=>{window.removeEventListener(GEMINI_KEY_CHANGED_EVENT,refresh);window.removeEventListener("focus",refresh);window.removeEventListener("storage",refresh)};
 },[]);
 return <section className="koolo-my-ai-card" aria-labelledby="koolo-my-ai-title">
  <div className="koolo-my-ai-heading"><Icon name="sparkles"/><h2 id="koolo-my-ai-title">{t("auth.byokTitle")}</h2></div>
  {status&&<p className="koolo-my-ai-status" data-status={status} role="status">{t(status==="active"?"auth.byokActive":status==="pending"?"auth.byokPending":"auth.byokFree")}</p>}
  <p>{t("auth.byokBenefit")}</p>
  <Link className="btn" to="/account#settings-gemini">{t(status==="active"||status==="pending"?"auth.byokManage":"auth.byokSetup")}</Link>
  <small>{t("auth.byokPolicy")}</small>
 </section>;
}
// UI rollout only: keep direct account-owned history routes and server authorization unchanged.
const PAID_ACCOUNT_FEATURES_PUBLIC=false;

// Mounted only after admin authorization, or once the public rollout is enabled.
function PaidAccountRows(){
 const {t,i18n}=useTranslation("home");
 const label=(key:string)=>t("sectionHubs.me.groups."+key);
 const reports=useSummary("reports"),credits=useSummary("credits");
 function value(summary:Summary,source:keyof typeof summarySources){
  if(summary.status==="loading")return <span className="koolo-account-skeleton" role="status" aria-label={label("loading")}/>;
  if(summary.status==="error")return label("unavailable");
  if(summary.status==="login")return label("signIn");
  if(source==="reports"){
   // The list endpoint returns up to 100 accessible reports.
   const count=summary.value===100?"100+":String(summary.value);
   return t("sectionHubs.me.groups.reportCount",{number:count});
  }
  const seconds=summary.value;
  const format=(n:number,unit:"minute"|"second")=>new Intl.NumberFormat(i18n.resolvedLanguage||i18n.language,{style:"unit",unit,unitDisplay:"short"}).format(n);
  return [seconds>=60&&format(Math.floor(seconds/60),"minute"),(seconds%60!==0||seconds===0)&&format(seconds%60,"second")].filter(Boolean).join(" ");
 }
 return <>
   <AccountRow to="/fortune/purchases" icon="book" title={label("purchased")}>{value(reports.summary,"reports")}</AccountRow>
   <AccountRow to="/me/voice-credits" icon="mic" title={label("credits")}>{value(credits.summary,"credits")}</AccountRow>
   <AccountRow to="/me/orders" icon="history" title={label("orders")}/>
  {(reports.summary.status==="error"||credits.summary.status==="error")&&<button type="button" className="koolo-account-retry" onClick={()=>{
   if(reports.summary.status==="error")reports.retry();
   if(credits.summary.status==="error")credits.retry();
  }}>{label("retry")}</button>}
 </>;
}
export function MyAccountGroups({items}:{items:RowItem[]}){
 const {t}=useTranslation("home");
 const label=(key:string)=>t("sectionHubs.me.groups."+key);
 function row(item:RowItem){return <AccountRow key={item.to} {...item}/>}
 return <>
  <MyAiSettingsCard/>
  <section className="koolo-account-group"><h2>{label("content")}</h2><div className="koolo-account-list">
   {items.filter(item=>item.to!=="/settings"&&item.to!=="/teacher/reports").map(row)}
   <AccountRow to="/fortune/premium" icon="fortune" title={label("lifeReadings")}/>
  </div></section>
  <section className="koolo-account-group"><h2>{label("support")}</h2><div className="koolo-account-list">
   <AccountRow to="/account" icon="teacher" title={t("common:auth.account")}/>
   {items.filter(item=>item.to==="/settings").map(row)}
   <AccountRow to="/purchase-info" icon="book" title={label("payments")}/>
  </div></section>
  {PAID_ACCOUNT_FEATURES_PUBLIC&&<section className="koolo-account-group"><h2>{label("payments")}</h2><div className="koolo-account-list"><PaidAccountRows/></div></section>}
  <KooloAdminEntry>{!PAID_ACCOUNT_FEATURES_PUBLIC&&<PaidAccountRows/>}</KooloAdminEntry>
 </>;
}
