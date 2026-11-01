import {useEffect,useRef,useState,type MouseEvent} from "react";
import {Link,useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import {PortalParticleField} from "./PortalParticleField";
import {useGuestTrialQuota} from "../lib/useGuestTrialQuota";
import {useClientReady} from "../lib/useClientReady";
import {geminiKey} from "../lib/runtime";

const ZOE="/friend/live?id=zoe";

/** A single first step; the ambient particle field never controls navigation. */
export function HomePortal(){
 const {t}=useTranslation("home");
 const navigate=useNavigate();
 const ready=useClientReady();
 const hasKey=ready&&Boolean(geminiKey());
 const trial=useGuestTrialQuota(!ready||hasKey);
 const exhausted=ready&&!hasKey&&trial.resolved&&trial.enabled&&trial.remaining===0;
 const destination=exhausted?"/account#settings-gemini":ZOE;
 const cta=hasKey?"world.chatWithZoe":exhausted?"world.chatExhausted":"world.chatStart";
 const [paused,setPaused]=useState(true); // Static SSR fallback; eligible devices resume after mount.
 const [idleReady,setIdleReady]=useState(false);
 const [inViewport,setInViewport]=useState(false);
 const [foreground,setForeground]=useState(true);
 const [fieldEverEnabled,setFieldEverEnabled]=useState(false);
 const heroRef=useRef<HTMLElement|null>(null);
 const fieldEligible=idleReady&&inViewport&&foreground;
 const canAnimate=fieldEligible&&!paused;
 const [launching,setLaunching]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current!==null)clearTimeout(timer.current)},[]);
 // SSR and the first client render both use a static, chat-only hero.
 useEffect(()=>{
  const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData=Boolean((navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData);
  if(!reducedMotion&&!saveData)setPaused(false);
 },[]);
 useEffect(()=>{
  let cancelled=false;
  let idleId:number|undefined,timeoutId:number|undefined;
  const afterLoad=()=>{
   if(cancelled)return;
   if(typeof window.requestIdleCallback==="function")idleId=window.requestIdleCallback(()=>{if(!cancelled)setIdleReady(true)},{timeout:2500});
   else timeoutId=window.setTimeout(()=>{if(!cancelled)setIdleReady(true)},1100);
  };
  if(document.readyState==="complete")afterLoad();
  else window.addEventListener("load",afterLoad,{once:true});
  return()=>{
   cancelled=true;window.removeEventListener("load",afterLoad);
   if(idleId!==undefined)window.cancelIdleCallback(idleId);
   if(timeoutId!==undefined)window.clearTimeout(timeoutId);
  };
 },[]);
 useEffect(()=>{
  const host=heroRef.current;
  if(!host)return;
  if(!("IntersectionObserver" in window)){setInViewport(true);return}
  const observer=new IntersectionObserver(entries=>setInViewport(Boolean(entries[0]?.isIntersecting)),{threshold:.05});
  observer.observe(host);
  return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  const sync=()=>setForeground(!document.hidden);
  sync();document.addEventListener("visibilitychange",sync);
  return()=>document.removeEventListener("visibilitychange",sync);
 },[]);
 useEffect(()=>{if(fieldEligible)setFieldEverEnabled(true)},[fieldEligible]);
 const selectEmma=(event:MouseEvent<HTMLAnchorElement>)=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.defaultPrevented)return;
  event.preventDefault();
  trackUsageEvent("home_entry_click","teacher");
  // Only a deliberate click selects Emma; importing the store eagerly breaks SSG.
  void import("../store/teacherStore").then(({useTeacherStore})=>{
   useTeacherStore.getState().setTeacherProfile("emma");
   navigate("/teacher/live");
  }).catch(()=>navigate("/teacher/live"));
 };
 const launch=(event:MouseEvent<HTMLAnchorElement>)=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.defaultPrevented)return;
  trackUsageEvent("home_entry_click",exhausted?"settings":"friend");
  if(paused||!canAnimate||window.matchMedia("(prefers-reduced-motion: reduce)").matches||
   (navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData)return;
  event.preventDefault();
  if(timer.current!==null)return;
  setLaunching(true);
  timer.current=setTimeout(()=>{timer.current=null;navigate(destination)},480);
 };
 return <header ref={heroRef} className="crew-home-portal" data-mode="chat" data-launching={launching} data-paused={paused}>
  <PortalParticleField mode="chat" paused={!canAnimate} launching={launching} enabled={fieldEverEnabled||fieldEligible}/>
  <div className="crew-portal-content">
   <div className="crew-portal-copy">
    <h1>{t("world.chatHeading")}</h1>
    {trial.resolved&&trial.enabled&&trial.remaining!==null&&trial.remaining>0&&!trial.signinRequired&&!hasKey&&<p className="crew-portal-description">{t("world.chatSubtitle")}</p>}
   </div>
   <Link className="crew-portal-cta" to={destination} onClick={launch} aria-disabled={launching||undefined}>
    {t(cta)}<span aria-hidden="true">↗</span>
   </Link>
   {ready&&!hasKey&&trial.resolved&&trial.enabled&&trial.remaining!==null&&trial.remaining>0&&<p className="crew-portal-remaining" role="status">{t("common:guestTrial.remaining",{count:trial.remaining,limit:trial.limit})}</p>}
   <nav className="crew-portal-picks" aria-label={t("world.quickPicks")}>
    <span className="crew-portal-picks-label">{t("world.quickPicks")}</span>
    <div className="crew-portal-picks-links">
     <Link to={ZOE} onClick={()=>trackUsageEvent("home_entry_click","friend")}><span className="crew-portal-pick-avatar" aria-hidden="true">Z</span>Zoe</Link>
     <Link to="/friend/live?id=noah" onClick={()=>trackUsageEvent("home_entry_click","friend")}><span className="crew-portal-pick-avatar" aria-hidden="true">N</span>Noah</Link>
     <Link to="/teacher/live" onClick={selectEmma}><span className="crew-portal-pick-avatar" aria-hidden="true">E</span>Emma</Link>
    </div>
   </nav>
   <Link className="crew-portal-game-link" to="/games/1a2b" onClick={()=>trackUsageEvent("home_entry_click","play")}>{t("world.noVoice")}</Link>
  </div>
 </header>;
}
