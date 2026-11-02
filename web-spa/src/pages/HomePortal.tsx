import {useEffect,useRef,useState,type KeyboardEvent} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import {Icon,type IconName} from "../components/Icon";
import {PortalParticleField} from "./PortalParticleField";
import type {PortalMode} from "./portalField.mjs";
import {useGuestTrialQuota} from "../lib/useGuestTrialQuota";
import {useClientReady} from "../lib/useClientReady";
import {geminiKey} from "../lib/runtime";

const ZOE="/friend/live?id=zoe";

const MODES:readonly {id:PortalMode;icon:IconName;to:string;label:string;name:string;entry:"friend"|"teacher"|"fortune"|"play"}[]=[
 {id:"chat",icon:"chat",to:ZOE,label:"chat",name:"THE CONNECTION / CHAT",entry:"friend"},
 {id:"learn",icon:"teacher",to:"/teacher",label:"teacher",name:"THE RESONANCE / LEARN",entry:"teacher"},
 {id:"fortune",icon:"fortune",to:"/fortune",label:"fortune",name:"THE STARS / FORTUNE",entry:"fortune"},
 {id:"play",icon:"play",to:"/games/1a2b",label:"play",name:"THE PLAYGROUND / PLAY",entry:"play"}
];

/** Only a selected tab changes the invitation. Links retain immediate navigation. */
export function HomePortal(){
 const {t,i18n}=useTranslation("home");
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
 const [mode,setMode]=useState<PortalMode>("chat");
 const buttons=useRef<(HTMLButtonElement|null)[]>([]);
 const current=MODES.find(item=>item.id===mode)||MODES[0];
 const keyMode=(event:KeyboardEvent<HTMLButtonElement>,at:number)=>{
  let next=at;
  if(event.key==="ArrowRight")next=(at+1)%MODES.length;
  else if(event.key==="ArrowLeft")next=(at+MODES.length-1)%MODES.length;
  else if(event.key==="Home")next=0;
  else if(event.key==="End")next=MODES.length-1;
  else return;
  event.preventDefault();setMode(MODES[next].id);buttons.current[next]?.focus();
 };
 // SSR and the first client render both use static frames with chat focused.
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
 return <header ref={heroRef} lang={i18n.resolvedLanguage||i18n.language} className="crew-home-portal" data-mode={mode} data-paused={paused}>
  <PortalParticleField mode={mode} paused={!canAnimate} enabled={fieldEverEnabled||fieldEligible}/>
  <div className="crew-portal-content">
   <p className="crew-portal-intro">{t("world.intro")}</p>
   <span className="crew-portal-kicker" aria-hidden="true">{current.name}</span>
   <div id="crew-portal-panel" role="tabpanel" aria-labelledby={"crew-portal-tab-"+mode}>
    <div className="crew-portal-copy">
     <h1><span className="crew-portal-title-line crew-portal-title-first">{t("world.modes."+mode+".lead")}</span><br/><span className="crew-portal-title-line crew-portal-title-second">{t("world.modes."+mode+".before")} <em className="crew-portal-title-accent">{t("world.modes."+mode+".accent")}</em>{t("world.modes."+mode+".after")}</span></h1>
     <p className="crew-portal-description">{t("world.modes."+mode+".description")}</p>
    </div>
    <Link className="crew-portal-cta" to={mode==="chat"?destination:current.to}
     onClick={()=>mode==="chat"?trackUsageEvent("home_entry_click",exhausted?"settings":"friend"):trackUsageEvent("home_entry_click",current.entry)}>
     {mode==="chat"?t(cta):t("world.modes."+mode+".cta")}<span aria-hidden="true">↗</span>
    </Link>
    <div className="crew-portal-status-slot">
     {mode==="chat"&&ready&&!hasKey&&trial.resolved&&trial.enabled&&trial.remaining!==null&&trial.remaining>0&&<p className="crew-portal-remaining" role="status">{t("common:guestTrial.remaining",{count:trial.remaining,limit:trial.limit})}</p>}
    </div>
   </div>
   <div className="crew-portal-tabs" role="tablist" aria-label={t("world.tilesLabel")}>
    {MODES.map((item,i)=><button className="crew-portal-tab" key={item.id} id={"crew-portal-tab-"+item.id} data-mode={item.id} type="button" role="tab"
     aria-controls="crew-portal-panel" aria-selected={mode===item.id} tabIndex={mode===item.id?0:-1}
     ref={el=>{buttons.current[i]=el}} onClick={()=>setMode(item.id)} onKeyDown={event=>keyMode(event,i)}>
     <Icon name={item.icon}/><span>{t("world.tiles."+item.label+".name")}</span>
    </button>)}
   </div>
  </div>
 </header>;
}
