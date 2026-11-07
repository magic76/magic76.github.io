import {useEffect,useRef,useState,type KeyboardEvent,type MouseEvent} from "react";
import {Link,useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import {Icon,type IconName} from "../components/Icon";
import {PortalParticleField} from "./PortalParticleField";
import {HomeDiscoveryLine} from "./HomeDiscoveryLine";
import type {PortalMode} from "./portalField.mjs";
import {readHomeDeepLink,HOME_FRIEND_NAMES} from "./homeDeepLink.mjs";
import {shortsChatUrl,shortsPhotoQuestions} from "../teacher/shortsSocial";
import type {ShortFeed} from "../teacher/shortsFeed";
import {useGuestTrialQuota} from "../lib/useGuestTrialQuota";
import {useClientReady} from "../lib/useClientReady";
import {geminiKey} from "../lib/runtime";

const ZOE="/friend/live?id=zoe";
const HOME_ZOE=ZOE+"&from=home";
let friendRouteWarmup:Promise<unknown>|null=null;
function warmFriendStart(){
 if(typeof document==="undefined")return;
 if(!document.querySelector('link[rel="preconnect"][href="https://challenges.cloudflare.com"]')){
  const link=document.createElement("link");link.rel="preconnect";link.href="https://challenges.cloudflare.com";link.crossOrigin="anonymous";document.head.appendChild(link);
 }
 // This is the same FriendLivePage chunk lazy-loaded by App.tsx; no guest or mic request.
 if(!friendRouteWarmup)friendRouteWarmup=import("../friends/FriendLivePage").catch(()=>{friendRouteWarmup=null});
}

const MODES:readonly {id:PortalMode;icon:IconName;to:string;label:string;name:string;entry:"friend"|"learn"|"fortune"|"play"}[]=[
 {id:"chat",icon:"chat",to:ZOE,label:"chat",name:"THE CONNECTION / CHAT",entry:"friend"},
 {id:"learn",icon:"teacher",to:"/teacher/live?lesson=daily_u1_l1",label:"teacher",name:"THE RESONANCE / LEARN",entry:"learn"},
 {id:"fortune",icon:"fortune",to:"/fortune/reading?mode=tarot",label:"fortune",name:"THE STARS / FORTUNE",entry:"fortune"},
 {id:"play",icon:"play",to:"/games/1a2b",label:"play",name:"THE PLAYGROUND / PLAY",entry:"play"}
];

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
 const friendId=deepLink.tab==="chat"&&deepLink.friend?deepLink.friend:"zoe";
 const friendName=HOME_FRIEND_NAMES[friendId]||"Zoe";
 // A Shorts ID is active only when it matches a post from the validated network feed.
 const selectedPost=deepLink.short?shortsFeed?.posts.find(post=>post.id===deepLink.short)||null:null;
 const questions=selectedPost?shortsPhotoQuestions(selectedPost,(key,detail)=>t("shorts."+key,{detail})):[];
 const shortsDestination=selectedPost?shortsChatUrl(selectedPost,undefined,questions.length?0:undefined):null;
 const destination=exhausted?"/account#settings-gemini":shortsDestination||
  (friendId==="zoe"?HOME_ZOE:"/friend/live?id="+friendId+"&from=home");
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
 const [mode,setMode]=useState<PortalMode>("chat");
 const [manuallySelected,setManuallySelected]=useState(false);
 const buttons=useRef<(HTMLButtonElement|null)[]>([]);
 const current=MODES.find(item=>item.id===mode)||MODES[0];
 const target=mode==="chat"?destination:mode==="learn"?teacherDestination:
  mode==="play"?"/games/"+gameId:current.to;
 const handleLaunch=(event:MouseEvent<HTMLAnchorElement>)=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  if(navigationTimer.current!==null)return;
  setPreparing(true);
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(!reduced)setLaunching(true);
  trackUsageEvent("home_entry_click",exhausted&&(mode==="chat"||mode==="learn")?"settings":current.entry);
  if(mode==="chat"&&selectedPost&&!exhausted){
   trackUsageEvent("shorts_hook_click","shorts_home");trackUsageEvent("shorts_chat_click","shorts_home");
  }
  navigationTimer.current=window.setTimeout(()=>navigate(target),120);
 };
 const keyMode=(event:KeyboardEvent<HTMLButtonElement>,at:number)=>{
  let next=at;
  if(event.key==="ArrowRight")next=(at+1)%MODES.length;
  else if(event.key==="ArrowLeft")next=(at+MODES.length-1)%MODES.length;
  else if(event.key==="Home")next=0;
  else if(event.key==="End")next=MODES.length-1;
  else return;
  event.preventDefault();setMode(MODES[next].id);setManuallySelected(true);buttons.current[next]?.focus();
 };
 // A query never participates in SSR or the initial hydration render.
 useEffect(()=>{
  const link=readHomeDeepLink(window.location.search);
  setDeepLink(link);
  if(link.tab)setMode(link.tab);
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
  <div className="crew-portal-content">
   <p className="crew-portal-intro">{t("world.intro")}</p>
   <span className="crew-portal-kicker" aria-hidden="true">{current.name}</span>
   <div id="crew-portal-panel" role="tabpanel" aria-labelledby={"crew-portal-tab-"+mode}>
    <div className="crew-portal-copy">
     <h1><span className="crew-portal-title-line crew-portal-title-first">{t("world.modes."+mode+".lead")}</span><br/><span className="crew-portal-title-line crew-portal-title-second">{t("world.modes."+mode+".before")} <em className="crew-portal-title-accent">{t("world.modes."+mode+".accent")}</em>{t("world.modes."+mode+".after")}</span></h1>
     <p className="crew-portal-description" data-discovery={mode==="chat"&&!selectedPost?"true":"false"}>{mode==="chat"&&!selectedPost?<HomeDiscoveryLine animate={canAnimate&&!manuallySelected}/>:t("world.modes."+mode+".description")}</p>
    </div>
    <Link className="crew-portal-cta" to={target} data-preparing={preparing} aria-busy={preparing}
     onPointerDown={mode==="chat"?warmFriendStart:undefined} onTouchStart={mode==="chat"?warmFriendStart:undefined}
     onFocus={mode==="chat"?warmFriendStart:undefined} onMouseEnter={mode==="chat"?warmFriendStart:undefined}
     onClick={handleLaunch}>
     {mode==="chat"&&!exhausted?<img className="crew-portal-cta-avatar" src={"/assets/friends/crew_friend_"+(selectedPost?.friendId||friendId)+".webp"} alt="" width="32" height="32"/>:null}
     <span className="crew-portal-cta-label">{preparing?t("world.preparing"):mode==="chat"&&!exhausted&&selectedPost?(questions[0]?.label||t("world.shortsFallback")):mode==="chat"?t(cta,{name:friendName}):mode==="learn"?(exhausted?t("world.chatExhausted"):trialAvailable?t("world.teacherTrial"):t("world.modes.learn.cta")):mode==="play"?t("world.game"+(gameId==="1a2b"?"1a2b":gameId==="connect4"?"Connect4":"Reversi")):t("world.modes."+mode+".cta")}</span><span className="crew-portal-cta-arrow" aria-hidden="true">↗</span>
    </Link>
    <div className="crew-portal-status-slot">
     {mode==="chat"&&ready&&!hasKey&&trial.resolved&&trial.enabled&&trial.remaining!==null&&trial.remaining>0&&<p className="crew-portal-remaining" role="status">{t(trial.member?"common:guestTrial.memberRemaining":"common:guestTrial.remaining",{count:trial.remaining,limit:trial.limit})}</p>}
    </div>
   </div>
   <div className="crew-portal-tabs" role="tablist" aria-label={t("world.tilesLabel")}>
    {MODES.map((item,i)=><button className="crew-portal-tab" key={item.id} id={"crew-portal-tab-"+item.id} data-mode={item.id} type="button" role="tab"
     aria-controls="crew-portal-panel" aria-selected={mode===item.id} tabIndex={mode===item.id?0:-1}
     ref={el=>{buttons.current[i]=el}} onClick={()=>{setMode(item.id);setManuallySelected(true)}} onKeyDown={event=>keyMode(event,i)}>
     <Icon name={item.icon}/><span>{t("world.tiles."+item.label+".name")}</span>
    </button>)}
   </div>
  </div>
 </header>;
}
