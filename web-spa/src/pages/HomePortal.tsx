import {lazy,Suspense,useEffect,useRef,useState,type MouseEvent} from "react";
import {Link,useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import {HomeModeRail,type HomeMode} from "./HomeModeRail";
import {readLatestFriendResume,type FriendResume} from "../live/sessionTranscript";
import {PortalParticleField} from "./PortalParticleField";
import {HomeDiscoveryLine} from "./HomeDiscoveryLine";

import {readHomeDeepLink,HOME_FRIEND_IDS,HOME_FRIEND_NAMES} from "./homeDeepLink.mjs";
import {formatResumePreview} from "./formatResumePreview";
import {shortsChatUrl,shortsPhotoQuestions} from "../teacher/shortsSocial";
import type {ShortFeed} from "../teacher/shortsFeed";
import {useGuestTrialQuota} from "../lib/useGuestTrialQuota";
import {GUEST_TEXT_DAILY_TURNS} from "../live/guestAllowance";
import {useClientReady} from "../lib/useClientReady";
import {geminiKey} from "../lib/runtime";

const HomeTargetLanguage=lazy(()=>import("./HomeTargetLanguage"));

const ZOE="/friend/live?id=zoe";
const HOME_ZOE=ZOE+"&from=home&chat=text";
let friendRouteWarmup:Promise<unknown>|null=null;
function warmFriendStart(){
 if(typeof document==="undefined")return;
 if(!document.querySelector('link[rel="preconnect"][href="https://challenges.cloudflare.com"]')){
  const link=document.createElement("link");link.rel="preconnect";link.href="https://challenges.cloudflare.com";link.crossOrigin="anonymous";document.head.appendChild(link);
 }
 // This is the same FriendLivePage chunk lazy-loaded by App.tsx; no guest or mic request.
 if(!friendRouteWarmup)friendRouteWarmup=import("../friends/FriendLivePage").catch(()=>{friendRouteWarmup=null});
}

const PREVIEW_HIDDEN_KEY="crew_home_hide_message_preview_v1";

/** Only a selected tab changes the invitation. Links retain immediate navigation. */
export function HomePortal({shortsFeed}:{shortsFeed?:ShortFeed|null}={}){
 const {t,i18n}=useTranslation("home");
 const navigate=useNavigate();
 const ready=useClientReady();
 const hasKey=ready&&Boolean(geminiKey());
 const trial=useGuestTrialQuota(!ready||hasKey);
 const exhausted=ready&&!hasKey&&trial.resolved&&trial.enabled&&trial.remaining===0;
 const trialAvailable=ready&&!hasKey&&trial.resolved&&trial.enabled&&trial.remaining!==0;
 const [deepLink,setDeepLink]=useState<ReturnType<typeof readHomeDeepLink>>({tab:null,friend:null,game:null,short:null});
 // A Shorts ID is active only when it matches a post from the validated network feed.
 const selectedPost=deepLink.short?shortsFeed?.posts.find(post=>post.id===deepLink.short)||null:null;
 const [resume,setResume]=useState<FriendResume|null>(null);
 const [previewHidden,setPreviewHidden]=useState(false);
 const resumeId=resume&&HOME_FRIEND_IDS.includes(resume.friendId)?resume.friendId:null;
 // A valid explicit friend deep link takes priority over someone else's saved chat.
 const canResume=Boolean(resumeId&&!selectedPost&&(!deepLink.friend||deepLink.friend===resumeId));
 const friendId=deepLink.tab==="chat"&&deepLink.friend?deepLink.friend:canResume&&resumeId?resumeId:"zoe";
 const friendName=HOME_FRIEND_NAMES[friendId]||"Zoe";
 const questions=selectedPost?shortsPhotoQuestions(selectedPost,(key,detail)=>t("shorts."+key,{detail})):[];
 const shortsDestination=selectedPost?shortsChatUrl(selectedPost,undefined,questions.length?0:undefined):null;
 const destination=exhausted?"/account#settings-gemini":shortsDestination||
  (friendId==="zoe"?HOME_ZOE:"/friend/live?id="+friendId+"&from=home&chat=text");
 const teacherDestination=exhausted?"/account#settings-gemini":"/teacher/live?lesson=daily_u1_l1";
 const cta=hasKey?"world.chatWithFriend":exhausted?"world.chatExhausted":trialAvailable?"world.chatTrialWith":"world.chatNeutralWith";
 const gameId=deepLink.tab==="play"&&deepLink.game?deepLink.game:"1a2b";
 const [preparing,setPreparing]=useState(false);
 const [launching,setLaunching]=useState(false);
 const navigationTimer=useRef<number|null>(null);
 const [paused,setPaused]=useState(true); // Static SSR fallback; eligible devices resume after mount.
 const [idleReady,setIdleReady]=useState(false);
 const [inViewport,setInViewport]=useState(false);
 const [foreground,setForeground]=useState(true);
 const [fieldEverEnabled,setFieldEverEnabled]=useState(false);
 const heroRef=useRef<HTMLElement|null>(null);
 const fieldEligible=idleReady&&inViewport&&foreground;
 const canAnimate=fieldEligible&&!paused;
 const [mode,setMode]=useState<HomeMode>("chat");
 const [manuallySelected,setManuallySelected]=useState(false);
 const target=destination;
 const destinations={chat:destination,learn:teacherDestination,
  fortune:"/fortune/reading?mode=tarot",play:"/games/"+gameId};
 const onModeChange=(next:HomeMode)=>{setMode(next);setManuallySelected(true)};
 const onRailNavigate=(next:HomeMode)=>{
  trackUsageEvent("home_entry_click",exhausted&&(next==="chat"||next==="learn")?"settings":next==="chat"?"friend":next);
  if(next==="chat"&&selectedPost&&!exhausted){
   trackUsageEvent("shorts_hook_click","shorts_home");trackUsageEvent("shorts_chat_click","shorts_home");
  }
 };
 const togglePreview=()=>{
  const next=!previewHidden;setPreviewHidden(next);
  try{localStorage.setItem(PREVIEW_HIDDEN_KEY,next?"1":"0")}catch{/* Optional privacy choice. */}
 };
 const handleLaunch=(event:MouseEvent<HTMLAnchorElement>)=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  if(navigationTimer.current!==null)return;
  setPreparing(true);
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(!reduced)setLaunching(true);
  trackUsageEvent("home_entry_click",exhausted?"settings":"friend");
  if(mode==="chat"&&selectedPost&&!exhausted){
   trackUsageEvent("shorts_hook_click","shorts_home");trackUsageEvent("shorts_chat_click","shorts_home");
  }
  navigationTimer.current=window.setTimeout(()=>navigate(target),120);
 };
 // A query never participates in SSR or the initial hydration render.
 useEffect(()=>{
  const link=readHomeDeepLink(window.location.search);
  setDeepLink(link);
  if(link.tab)setMode(link.tab);
  setResume(readLatestFriendResume());
  try{setPreviewHidden(localStorage.getItem(PREVIEW_HIDDEN_KEY)==="1")}catch{/* Optional privacy choice. */}
 },[]);
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
 useEffect(()=>()=>{if(navigationTimer.current!==null)window.clearTimeout(navigationTimer.current)},[]);
 return <header ref={heroRef} lang={i18n.language} className="crew-home-portal" data-mode={mode} data-paused={paused}>
  <PortalParticleField mode={mode} paused={!canAnimate} launching={launching} enabled={fieldEverEnabled||fieldEligible}/>
  <div className="crew-portal-content crew-portal-layout2">
   <aside className="crew-portal-layout2-rail">
    <h2>{t("layout2.more")}</h2>
    <HomeModeRail prefix="crew-portal-mode" mode={mode} onChange={onModeChange} destinations={destinations}
     onNavigate={onRailNavigate} chatName={friendName}
     chatAction={selectedPost?(questions[0]?.label||t("world.shortsFallback")):undefined}/>
   </aside>
   <div className="crew-portal-layout2-main">
    <p className="crew-portal-intro">{t("world.intro")}</p>
    <span className="crew-portal-kicker" aria-hidden="true">{friendName.toUpperCase()} · AI FRIEND</span>
    <div className="crew-portal-copy">
     <h1>{canResume?t("layout2.resumeTitle",{name:friendName}):t("layout2.title",{name:friendName})}</h1>
     <p className="crew-portal-description">{canResume?(previewHidden?t("layout2.previewHidden"):t("layout2.previewLabel")+" "+formatResumePreview(resume?.preview||"")):t("layout2.description")}</p>
    </div>
    <Link className="crew-portal-cta" to={target} data-preparing={preparing} aria-busy={preparing}
     onPointerDown={warmFriendStart} onTouchStart={warmFriendStart} onFocus={warmFriendStart} onMouseEnter={warmFriendStart} onClick={handleLaunch}>
     {!exhausted?<img className="crew-portal-cta-avatar" src={"/assets/friends/crew_friend_"+(selectedPost?.friendId||friendId)+".webp"} alt="" width="32" height="32"/>:null}
     <span className="crew-portal-cta-label">{preparing?t("world.preparing"):exhausted?t("world.chatExhausted"):selectedPost?(questions[0]?.label||t("world.shortsFallback")):canResume?t("layout2.resumeAction"):hasKey?t(cta,{name:friendName}):t("layout2.action",{name:friendName})}</span><span className="crew-portal-cta-arrow" aria-hidden="true">↗</span>
    </Link>
    <div className="crew-portal-invitation-meta">
     {!hasKey&&<div className="crew-portal-status-slot">
      {ready&&!hasKey&&trial.resolved&&trial.enabled&&trial.remaining!==null&&trial.remaining>0&&trial.seconds!==null&&<p className="crew-portal-remaining" role="status">{t("world.freeAllowance.full",{count:GUEST_TEXT_DAILY_TURNS,minutes:trial.seconds/60})}</p>}
      {ready&&!hasKey&&trial.resolved&&trial.enabled&&trial.remaining===0&&<p className="crew-portal-remaining" role="status">{t("world.freeAllowance.voiceUsed",{count:GUEST_TEXT_DAILY_TURNS})}</p>}
      {ready&&!hasKey&&(!trial.resolved||!trial.enabled||trial.remaining===null||(trial.remaining>0&&trial.seconds===null))&&<p className="crew-portal-remaining" role="status">{t("world.freeAllowance.textOnly",{count:GUEST_TEXT_DAILY_TURNS})}</p>}
     </div>}
     <div className="crew-portal-practice-holder">
      {ready?<Suspense fallback={<span className="crew-portal-practice-preview" aria-hidden="true">{t("world.practiceLang.label")} {t("friends:languages.英文",{defaultValue:"English"})} <span aria-hidden="true">▾</span></span>}><HomeTargetLanguage/></Suspense>
       :<span className="crew-portal-practice-preview" aria-hidden="true">{t("world.practiceLang.label")} {t("friends:languages.英文",{defaultValue:"English"})} <span aria-hidden="true">▾</span></span>}
     </div>
    </div>
    <Link className="crew-portal-layout2-voice" to={"/friend/live?id="+encodeURIComponent(friendId)+"&from=home&entry=bubble"} onClick={()=>trackUsageEvent("home_entry_click","voice")}>{t("layout2.voice")} ↗</Link>
    {canResume&&<button type="button" className="crew-portal-layout2-hide" onClick={togglePreview}>{previewHidden?t("layout2.showPreview"):t("layout2.hidePreview")}</button>}
    <div className="crew-portal-discovery-slot">{mode==="chat"&&!selectedPost&&<HomeDiscoveryLine animate={canAnimate&&!manuallySelected}/>}</div>
   </div>
  </div>
 </header>;
}
