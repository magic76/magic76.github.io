import {AccountListLoading} from "../components/AccountListLoading";
import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import "./voiceCredits.css";

type CreditEvent={id:string;type:"topup"|"reserve"|"consume"|"release"|"refund"|"adjustment";deltaAvailableSeconds:number;deltaReservedSeconds:number;createdAt:number};
type CreditWallet={unit:"seconds";availableSeconds:number;reservedSeconds:number;totalSeconds:number;topupsEnabled:false;paidVoiceEnabled:false;history:CreditEvent[]};
type PageState="loading"|"login"|"unavailable"|"error"|"ready";
const minutes=(seconds:number)=>String(Math.floor(seconds/60));
const clock=(seconds:number)=>Math.floor(seconds/60)+"m "+String(seconds%60).padStart(2,"0")+"s";
const sign=(seconds:number)=>seconds>0?"+":seconds<0?"−":"";
const eventNames:Record<CreditEvent["type"],[string,string]>={
 topup:["儲值入帳","Top-up"],reserve:["通話預留","Call reservation"],
 consume:["通話結算","Call settlement"],release:["未用額度退回","Unused time released"],
 refund:["退款調整","Refund"],adjustment:["額度調整","Credit adjustment"]
};
export function VoiceCreditsPage(){
 const {i18n}=useTranslation();const zh=/^zh(?:-|$)/i.test(i18n.resolvedLanguage||i18n.language);
 const copy=(a:string,b:string)=>zh?a:b;
 const[state,setState]=useState<PageState>("loading");
 const [revision,setRevision]=useState(0);
 const[wallet,setWallet]=useState<CreditWallet|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  void fetch("/api/voice/credits",{credentials:"same-origin",cache:"no-store",signal:controller.signal})
   .then(async res=>{
    if(controller.signal.aborted)return;
    if(res.status===401){setState("login");return}
    if(res.status===503){setState("unavailable");return}
    if(!res.ok)throw Error("Wallet request failed");
    const data=await res.json() as CreditWallet;
    if(!data||data.unit!=="seconds"||!Number.isSafeInteger(data.availableSeconds)||
       !Number.isSafeInteger(data.reservedSeconds)||!Array.isArray(data.history))throw Error("Invalid wallet response");
    if(controller.signal.aborted)return;
    setWallet(data);setState("ready");
   }).catch(()=>{if(!controller.signal.aborted)setState("error")});
  return()=>controller.abort();
 },[revision]);
 return <main className="koolo-credits-page">
  <Link className="text-button" to="/me">‹ {copy("返回我的 Koolo","Back to My Koolo")}</Link>
  <header className="hero"><span className="kicker">KOOLO VOICE</span>
   <h1>{copy("語音額度","Voice credits")}</h1>
   <p>{copy("未來購買的語音時間將綁定你的 Koolo 帳號，可以在不同裝置接續使用。","Purchased voice time will belong to your Koolo account and follow you across devices.")}</p>
  </header>
  {state==="loading"&&<AccountListLoading label={copy("正在讀取語音額度…","Loading voice credits…")}/>}
  {state==="login"&&<section className="panel section koolo-credits-message">
   <h2>{copy("登入後才能查看額度","Sign in to view credits")}</h2>
   <p>{copy("語音額度與帳號綁定。免費語音體驗不受影響。","Voice credits belong to your account. Free voice trials are unaffected.")}</p>
   <Link className="btn" to="/account">{copy("前往登入","Sign in")}</Link>
  </section>}
  {(state==="unavailable"||state==="error")&&<section className="panel section koolo-credits-message" role="alert">
   <p>{copy("暫時讀不到語音餘額。","Your voice balance is temporarily unavailable.")}</p>
   <button type="button" className="btn secondary" onClick={()=>{setState("loading");setRevision(n=>n+1)}}>{copy("重試","Retry")}</button>
  </section>}
  {state==="ready"&&wallet&&<>
   <section className="panel section koolo-credits-summary" aria-label={copy("語音額度摘要","Voice credit summary")}>
    <div className="koolo-credits-balance"><span>{copy("可用語音額度","Available voice time")}</span>
     <strong><span>{minutes(wallet.availableSeconds)}</span> <small>{copy("分","min")}</small> <span>{String(wallet.availableSeconds%60).padStart(2,"0")}</span> <small>{copy("秒","sec")}</small></strong>
    </div>
    <div className="koolo-credits-reserved">{copy("通話中預留","Reserved for calls")}：{clock(wallet.reservedSeconds)}</div>
    <p className="koolo-credits-disabled" role="status">{copy("儲值與付費語音尚未開放，現有免費通話不會扣除此額度。","Top-ups and paid calls are not available yet. Current free calls do not deduct these credits.")}</p>
   </section>
   <section className="section koolo-credits-history">
    <h2>{copy("額度紀錄","Credit history")}</h2>
    {wallet.history.length===0?<div className="panel koolo-credits-empty">{copy("目前沒有儲值或扣除紀錄。","No top-up or usage records yet.")}</div>:
     <div className="koolo-credits-list">
      {wallet.history.map(row=><article className="panel koolo-credits-record" key={row.id}>
       <div><strong>{eventNames[row.type][zh?0:1]}</strong><small>{new Date(row.createdAt*1000).toLocaleString(zh?"zh-TW":"en-US")}</small></div>
       <div className="koolo-credits-deltas"><span>{copy("可用","Available")} {sign(row.deltaAvailableSeconds)}{clock(Math.abs(row.deltaAvailableSeconds))}</span>
        {row.deltaReservedSeconds!==0&&<small>{copy("預留","Reserved")} {sign(row.deltaReservedSeconds)}{clock(Math.abs(row.deltaReservedSeconds))}</small>}</div>
      </article>)}
     </div>}
   </section>
  </>}
 </main>;
}
