import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import zoePortrait from "../../../assets/friends/crew_friend_zoe.webp";
import {Icon} from "../components/Icon";
import {trackUsageEvent} from "../analytics/usage";
import {useGuestTrialQuota} from "../lib/useGuestTrialQuota";
import {useClientReady} from "../lib/useClientReady";
import {geminiKey} from "../lib/runtime";
import "./homeLiveBubble.css";

const ZOE_LIVE="/friend/live?id=zoe&from=home&entry=bubble";

/** An immediate Live entry, not an in-home chat or another setup flow. */
export function HomeLiveBubble(){
 const {t}=useTranslation("home");
 const ready=useClientReady();
 const hasKey=ready&&Boolean(geminiKey());
 const trial=useGuestTrialQuota(!ready||hasKey);
 const needsSetup=ready&&!hasKey&&trial.resolved&&(!trial.enabled||trial.remaining===0);
 const [portalHost,setPortalHost]=useState<HTMLElement|null>(null);
 const [heroVisible,setHeroVisible]=useState(true);
 const [showInvite,setShowInvite]=useState(false);
 const invited=useRef(false);
 const rootRef=useRef<HTMLElement|null>(null);

 // The animated home shell has a transform. Portal to body so fixed placement
 // stays relative to the viewport, not the full page document.
 useEffect(()=>{setPortalHost(document.body)},[]);
 useEffect(()=>{
  const hero=document.querySelector<HTMLElement>(".crew-home-portal");
  if(!hero)return;
  if(!("IntersectionObserver" in window)){
   const update=()=>{const bounds=hero.getBoundingClientRect();setHeroVisible(bounds.bottom>0&&bounds.top<window.innerHeight)};
   update();
   window.addEventListener("scroll",update,{passive:true});
   window.addEventListener("resize",update);
   return()=>{window.removeEventListener("scroll",update);window.removeEventListener("resize",update)};
  }
  const observer=new IntersectionObserver(entries=>setHeroVisible(Boolean(entries[0]?.isIntersecting)),{threshold:.05});
  observer.observe(hero);
  return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  if(heroVisible){setShowInvite(false);return}
  if(invited.current)return;
  invited.current=true;
  setShowInvite(true);
  const timer=window.setTimeout(()=>setShowInvite(false),6500);
  return()=>window.clearTimeout(timer);
 },[heroVisible]);
 useEffect(()=>{
  const node=rootRef.current;
  if(!node)return;
  if(!("IntersectionObserver" in window)){
   if(getComputedStyle(node).display!=="none")trackUsageEvent("home_live_bubble_view");
   return;
  }
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)&&getComputedStyle(node).display!=="none"){
    trackUsageEvent("home_live_bubble_view");
    observer.disconnect();
   }
  },{threshold:.5});
  observer.observe(node);
  return()=>observer.disconnect();
 },[portalHost]);

 function visit(){
  trackUsageEvent("home_live_bubble_click");
  trackUsageEvent("home_entry_click",needsSetup?"settings":"friend");
 }
 const target=needsSetup?"/account#settings-gemini":ZOE_LIVE;
 const label=needsSetup?t("liveBubble.setup"):t("liveBubble.start");
 const invite=needsSetup?t("world.chatExhausted"):t("liveBubble.invite");
 return portalHost?createPortal(
  <aside ref={rootRef} className="crew-home-live-bubble" aria-label={t("world.chatHeading")}>
   {showInvite&&<span className="crew-live-bubble-invite" aria-hidden="true">{invite}</span>}
   <Link className="crew-live-bubble-trigger" to={target} onClick={visit}
    onMouseEnter={()=>{if(!needsSetup)void import("../friends/FriendLivePage")}}
    onTouchStart={()=>{if(!needsSetup)void import("../friends/FriendLivePage")}}
    onFocus={()=>{if(!needsSetup)void import("../friends/FriendLivePage")}}
    aria-label={needsSetup?t("world.chatExhausted"):t("world.chatWithZoe")}>
    <span className="crew-live-bubble-avatar">
     <img src={zoePortrait} alt="" width="56" height="56" decoding="async"/>
     <span className="crew-live-bubble-mic" aria-hidden="true"><Icon name={needsSetup?"settings":"mic"}/></span>
    </span>
    <span className="crew-live-bubble-label">{label}</span>
   </Link>
  </aside>,portalHost):null;
}
