import{useEffect,useState}from"react";
import{Link,useLocation,useSearchParams}from"react-router-dom";
import{useTranslation}from"react-i18next";
import"./account.css";
import{GeminiConnectionPanel}from"./GeminiConnectionPanel";
type User={id:string;name:string;provider:"google"|"github"};
type Session={enabled:boolean;providers:{google:boolean;github:boolean};user:User|null;trial?:{used:number;limit:number;lastUsedAt?:number};textTrial?:{used:number;limit:number}};
export function AccountPage(){
 const {t,i18n}=useTranslation(["common","voice"]);const [query]=useSearchParams();const location=useLocation();
 const geminiFirst=location.hash==="#settings-gemini"||query.has("returnTo");
 useEffect(()=>{
  if(!geminiFirst)return;
  const frame=requestAnimationFrame(()=>document.getElementById("settings-gemini")?.scrollIntoView({block:"start",behavior:"auto"}));
  return()=>cancelAnimationFrame(frame);
 },[geminiFirst,location.hash]);
 const [state,setState]=useState<Session|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [quotaRefresh,setQuotaRefresh]=useState(0);
 useEffect(()=>{
  const now=Date.now(),dayMs=86400000,offsetMs=8*3600000;
  const next=Math.floor((now+offsetMs)/dayMs+1)*dayMs-offsetMs;
  const timer=window.setTimeout(()=>setQuotaRefresh(count=>count+1),next-now+1000);
  return()=>window.clearTimeout(timer);
 },[quotaRefresh]);
 useEffect(()=>{
  const controller=new AbortController();
  void fetch("/api/auth/session",{credentials:"same-origin",cache:"no-store",signal:controller.signal})
   .then(async r=>{if(!r.ok)throw Error("unavailable");return await r.json() as Session})
   .then(s=>{if(!controller.signal.aborted)setState(s)})
   .catch(()=>{if(!controller.signal.aborted)setError(t("auth.unavailable"))})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[t,quotaRefresh]);
 async function signOut(){
  if(busy)return;setBusy(true);setError("");
  try{
   const r=await fetch("/api/auth/logout",{method:"POST",credentials:"same-origin"});
   if(!r.ok)throw Error("logout");
   setState(prev=>prev?{...prev,user:null}:prev);
  }catch{setError(t("auth.failed"))}
  finally{setBusy(false)}
 }
 const authError=query.get("auth_error");
 const signInPanel=<section className="panel section crew-account-panel" aria-label={t("auth.title")}>
   {loading?<p role="status">{t("auth.loading")}</p>:
   state?.user?<><div className="crew-account-identity"><div className="crew-account-avatar" aria-hidden="true">{state.user.name.slice(0,1).toUpperCase()}</div><div><strong>{state.user.name}</strong><small>{t("auth.signedIn")} · {state.user.provider==="google"?"Google":"GitHub"}</small></div></div>
    {state.trial&&<section className="crew-account-trial" aria-label={t("guestTrial.homeTitle")}>
      <strong>{t("guestTrial.homeTitle")}</strong>
      <p role="status">{t("auth.trialCount",{used:state.trial.used,limit:state.trial.limit})}</p>
      {state.trial.used<state.trial.limit
       ?<Link className="btn secondary small" to="/teacher/roles?mode=teacher">{t("guestTrial.start")}</Link>
       :<p role="status">{t("guestTrial.usedMemberNoCount")}</p>}
     </section>}
    {state.textTrial&&<section className="crew-account-trial" aria-label={t("voice:textChat.ui.freePractice")}>
      <strong>{t("voice:textChat.ui.freeDaily",{count:state.textTrial.limit})}</strong>
      <p role="status">{t("voice:textChat.ui.remaining",{count:Math.max(0,state.textTrial.limit-state.textTrial.used)})}</p>
     </section>}
    <button className="btn secondary" disabled={busy} type="button" onClick={()=>void signOut()}>{t("auth.signOut")}</button></>:
   state?.enabled?<><h2>{t("auth.choose")}</h2><div className="crew-account-buttons">
    {state.providers.google&&<a className="btn crew-account-provider" href="/api/auth/google/start">Google</a>}
    {state.providers.github&&<a className="btn secondary crew-account-provider" href="/api/auth/github/start">GitHub</a>}
   </div></>:<p role="status">{t("auth.unavailable")}</p>}
   {authError&&<p role="alert" className="crew-account-error">{t(authError==="cancelled"?"auth.cancelled":"auth.failed")}</p>}
   {error&&<p role="alert" className="crew-account-error">{error}</p>}
   <p className="crew-account-privacy">{t("auth.localData")}</p>
   <Link className="btn secondary" to="/fortune/purchases">{/^zh/.test(i18n.resolvedLanguage||i18n.language)?"查看已購買命理報告":"View purchased fortune reports"}</Link>
   <Link className="crew-account-back" to="/settings">{t("auth.backSettings")}</Link>
  </section>;
 const aiPanel=<details className="crew-account-ai section panel" open={geminiFirst||undefined}>
   <summary className="crew-account-section-heading">{t("auth.aiSettings")}</summary>
   <p className="meta">{t("auth.aiIntro")}</p>
   <GeminiConnectionPanel section="key"/>
  </details>;
 return <div className="crew-account-page">
  <section className="hero"><span className="kicker">{t("auth.account")}</span><h1>{t("auth.title")}</h1><p>{t("auth.intro")}</p></section>
  {geminiFirst?<>{aiPanel}{signInPanel}</>:<>{signInPanel}{aiPanel}</>}
  <section className="section panel crew-account-preferences">
   <h2>{t("auth.preferences")}</h2>
   <p className="meta">{t("auth.preferencesIntro")}</p>
   <p className="meta">{i18n.language.startsWith("zh")?"登入不會自動同步這台裝置的學習紀錄；請在資料管理中自行備份。":"Signing in does not automatically sync learning records stored on this device. Back up your data in settings."}</p>
   <div className="crew-account-settings-links">
    <Link to="/settings#settings-voice">{t("auth.voiceSettings")}</Link>
    <Link to="/settings#settings-learning">{t("auth.learningSettings")}</Link>
    <Link to="/settings#settings-data">{t("auth.dataSettings")}</Link>
    <Link to="/settings#settings-device">{t("auth.deviceSettings")}</Link>
   </div>
  </section>
 </div>;
}
