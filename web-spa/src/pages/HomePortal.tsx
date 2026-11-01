import {useEffect,useRef,useState,type KeyboardEvent,type MouseEvent} from "react";
import {Link,useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import {Icon,type IconName} from "../components/Icon";
import {PortalParticleField} from "./PortalParticleField";
import type {PortalMode} from "./portalField.mjs";
import {useGuestTrialQuota} from "../lib/useGuestTrialQuota";
import {useClientReady} from "../lib/useClientReady";
import {geminiKey} from "../lib/runtime";

const MODES:readonly {id:PortalMode;icon:IconName;to:string;name:string}[]=[
 {id:"chat",icon:"chat",to:"/teacher/roles?mode=friends",name:"THE CONNECTION / CHAT"},
 {id:"play",icon:"play",to:"/games",name:"THE PLAYGROUND / PLAY"},
 {id:"learn",icon:"teacher",to:"/learn",name:"THE RESONANCE / LEARN"},
 {id:"story",icon:"story",to:"/story",name:"THE UNFOLDING / STORY"}
];

/** The invitation is semantic HTML; the particle field only supports its meaning. */
export function HomePortal(){
 const {t}=useTranslation("home");
 const navigate=useNavigate();
 const ready=useClientReady();
 const trial=useGuestTrialQuota(!ready||Boolean(geminiKey()));
 const [mode,setMode]=useState<PortalMode>("chat");
 const [interacting,setInteracting]=useState(false);
 const [paused,setPaused]=useState(true); // Static SSR fallback; eligible devices automatically resume after mount.
 const [idleReady,setIdleReady]=useState(false);
 const [inViewport,setInViewport]=useState(false);
 const [foreground,setForeground]=useState(true);
 const [fieldEverEnabled,setFieldEverEnabled]=useState(false);
 const heroRef=useRef<HTMLElement|null>(null);
 const fieldEligible=idleReady&&inViewport&&foreground;
 const canAnimate=fieldEligible&&!paused;
 const [launching,setLaunching]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const buttons=useRef<(HTMLButtonElement|null)[]>([]);
 const current=MODES.find(item=>item.id===mode)||MODES[0];
 const index=MODES.indexOf(current);
 useEffect(()=>()=>{if(timer.current!==null)clearTimeout(timer.current)},[]);
 // Keep the lightweight server-rendered SVG during hydration. On both mobile
 // and desktop, resume automatically after load + idle + viewport eligibility.
 // Respect users who request less motion or enable browser data saving.
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
 // Initialize Canvas only after the hero is ready, even if animation stays
 // paused by preference; reduced-motion users still get the real static shape.
 useEffect(()=>{if(fieldEligible)setFieldEverEnabled(true)},[fieldEligible]);
 // Rotate the four KV scenes every five seconds; choosing a tab restarts the timer.
 // Pause halts both the particle field and automatic selection.
 useEffect(()=>{
  if(paused||launching||window.matchMedia("(prefers-reduced-motion: reduce)").matches||
   (navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData||!canAnimate||interacting)return;
  const id=window.setTimeout(()=>{
   setMode(previous=>{
    const currentIndex=MODES.findIndex(item=>item.id===previous);
    return MODES[(currentIndex+1)%MODES.length].id;
   });
  },5000);
  return()=>window.clearTimeout(id);
 },[mode,paused,launching,canAnimate,interacting]);
 const launch=(event:MouseEvent<HTMLAnchorElement>)=>{
  // Native link semantics survive modifier clicks, new tabs and script-free SSG.
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.defaultPrevented)return;
  trackUsageEvent("home_entry_click",current.id==="chat"?"friend":current.id);
  if(paused||!canAnimate||window.matchMedia("(prefers-reduced-motion: reduce)").matches||
   (navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData)return;
  event.preventDefault();
  if(timer.current!==null)return;
  setLaunching(true);
  timer.current=setTimeout(()=>{timer.current=null;navigate(current.to)},480);
 };
 const keyMode=(event:KeyboardEvent<HTMLButtonElement>,at:number)=>{
  let next=at;
  if(event.key==="ArrowRight")next=(at+1)%MODES.length;
  else if(event.key==="ArrowLeft")next=(at+MODES.length-1)%MODES.length;
  else if(event.key==="Home")next=0;
  else if(event.key==="End")next=MODES.length-1;
  else return;
  event.preventDefault();setMode(MODES[next].id);buttons.current[next]?.focus();
 };
 return <header ref={heroRef} className="crew-home-portal" data-mode={mode} data-launching={launching} data-paused={paused}>
  <PortalParticleField mode={mode} paused={!canAnimate} launching={launching} enabled={fieldEverEnabled||fieldEligible}/>
  <div className="crew-portal-intro"><p>{t("world.intro")}</p></div>
  <span className="crew-portal-number" aria-hidden="true">0{index+1} / 04</span>
  <div className="crew-portal-content" id="crew-portal-panel" role="tabpanel" aria-labelledby={"crew-portal-tab-"+mode}>
   <div className="crew-portal-copy" key={mode}>
    <span className="crew-portal-kicker" aria-hidden="true">{current.name}</span>
    <h1><span className="crew-portal-title-line crew-portal-title-first">{t("world.modes."+mode+".lead")}</span><br/><span className="crew-portal-title-line crew-portal-title-second">{t("world.modes."+mode+".before")} <em className="crew-portal-title-accent">{t("world.modes."+mode+".accent")}</em>{t("world.modes."+mode+".after")}</span></h1>
    <p className="crew-portal-description">{t("world.modes."+mode+".description")}</p>
   </div>
   <Link className="crew-portal-cta" to={current.to} onClick={launch} aria-disabled={launching||undefined}>
    {t("world.modes."+mode+".cta")}<span aria-hidden="true">↗</span>
   </Link>
   {trial.enabled&&<Link className="crew-portal-trial-chip" to={trial.remaining===0?"/settings#settings-gemini":"/teacher/roles?mode=teacher"}
    onClick={()=>trackUsageEvent(trial.remaining===0?"home_entry_click":"guest_trial_start_click",trial.remaining===0?"settings":"teacher")}>
    <span>{t(trial.remaining===0?"common:guestTrial.continueKey":"common:guestTrial.homeStart")}</span>
    {trial.remaining!==null&&trial.limit!==null&&<small role="status">{t("common:guestTrial.remaining",{count:trial.remaining,limit:trial.limit})}</small>}
   </Link>}
  </div>
  <div className="crew-portal-tabs" role="tablist" aria-label={t("portal.choose")}
    onMouseEnter={()=>setInteracting(true)} onMouseLeave={()=>setInteracting(false)}
    onFocusCapture={()=>setInteracting(true)}
    onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setInteracting(false)}}>
   {MODES.map((item,i)=><button key={item.id} id={"crew-portal-tab-"+item.id} type="button" role="tab"
    aria-controls="crew-portal-panel" aria-selected={mode===item.id} tabIndex={mode===item.id?0:-1}
    ref={el=>{buttons.current[i]=el}} disabled={launching}
    onClick={()=>setMode(item.id)} onKeyDown={event=>keyMode(event,i)}>
    <Icon name={item.icon}/><span>{t("portal.modes."+item.id+".label")}</span><i className="crew-portal-tab-progress" aria-hidden="true"/>
   </button>)}
  </div>
  <p className="crew-portal-hint">{t("world.touch")}</p>
  <button type="button" className="crew-portal-motion" aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>
   <span aria-hidden="true">{paused?"▷":"Ⅱ"}</span> {t(paused?"world.resume":"world.pause")}
  </button>
 </header>;
}
