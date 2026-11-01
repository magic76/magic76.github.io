import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import {Icon} from "../components/Icon";
import {PortalParticleField} from "./PortalParticleField";
import type {PortalMode} from "./portalField.mjs";
import {useGuestTrialQuota} from "../lib/useGuestTrialQuota";
import {useClientReady} from "../lib/useClientReady";
import {geminiKey} from "../lib/runtime";

const ZOE="/friend/live?id=zoe";

/** Direct links own navigation; focus selects only the decorative tile animation. */
export function HomePortal(){
 const {t}=useTranslation("home");
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
 const [focusedMode,setFocusedMode]=useState<PortalMode>("chat");
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
 return <header ref={heroRef} className="crew-home-portal" data-mode="chat" data-paused={paused}>
  <div className="crew-portal-content">
   <div className="crew-portal-copy">
    <h1>{t("world.chatHeading")}</h1>
   </div>
   <Link className="crew-portal-cta" to={destination} onClick={()=>trackUsageEvent("home_entry_click",exhausted?"settings":"friend")}>
    {t(cta)}<span aria-hidden="true">↗</span>
   </Link>
   {ready&&!hasKey&&trial.resolved&&trial.enabled&&trial.remaining!==null&&trial.remaining>0&&<p className="crew-portal-remaining" role="status">{t("common:guestTrial.remaining",{count:trial.remaining,limit:trial.limit})}</p>}
   <nav className="crew-portal-tiles" aria-label={t("world.tilesLabel")}>
    <PortalParticleField mode="chat" focus={focusedMode} paused={!canAnimate} enabled={fieldEverEnabled||fieldEligible}/>
    <Link className="crew-portal-tile" data-portal-tile data-mode="chat" data-focused={focusedMode==="chat"} to={ZOE}
     onPointerEnter={()=>setFocusedMode("chat")} onPointerDown={()=>setFocusedMode("chat")} onFocus={()=>setFocusedMode("chat")}
     onClick={()=>trackUsageEvent("home_entry_click","friend")}>
     <span className="crew-portal-tile-icon" aria-hidden="true"><Icon name="chat"/></span>
     <strong>{t("world.tiles.chat.name")}</strong><span>{t("world.tiles.chat.sub")}</span>
    </Link>
    <Link className="crew-portal-tile" data-portal-tile data-mode="learn" data-focused={focusedMode==="learn"} to="/teacher"
     onPointerEnter={()=>setFocusedMode("learn")} onPointerDown={()=>setFocusedMode("learn")} onFocus={()=>setFocusedMode("learn")}
     onClick={()=>trackUsageEvent("home_entry_click","teacher")}>
     <span className="crew-portal-tile-icon" aria-hidden="true">文</span>
     <strong>{t("world.tiles.teacher.name")}</strong><span>{t("world.tiles.teacher.sub")}</span>
    </Link>
    <Link className="crew-portal-tile" data-portal-tile data-mode="fortune" data-focused={focusedMode==="fortune"} to="/fortune"
     onPointerEnter={()=>setFocusedMode("fortune")} onPointerDown={()=>setFocusedMode("fortune")} onFocus={()=>setFocusedMode("fortune")}
     onClick={()=>trackUsageEvent("home_entry_click","fortune")}>
     <span className="crew-portal-tile-icon" aria-hidden="true">☾</span>
     <strong>{t("world.tiles.fortune.name")}</strong><span>{t("world.tiles.fortune.sub")}</span>
    </Link>
    <Link className="crew-portal-tile" data-portal-tile data-mode="play" data-focused={focusedMode==="play"} to="/games/1a2b"
     onPointerEnter={()=>setFocusedMode("play")} onPointerDown={()=>setFocusedMode("play")} onFocus={()=>setFocusedMode("play")}
     onClick={()=>trackUsageEvent("home_entry_click","play")}>
     <span className="crew-portal-tile-icon" aria-hidden="true">◇</span>
     <strong>{t("world.tiles.play.name")}</strong><span>{t("world.tiles.play.sub")}</span>
    </Link>
   </nav>
  </div>
 </header>;
}
