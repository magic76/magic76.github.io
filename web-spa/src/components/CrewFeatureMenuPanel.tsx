import {useCallback,useEffect,useRef,useState,type RefObject} from "react";
import {createPortal} from "react-dom";
import {Link,useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import {loadCrewFeatureMenuLocale} from "./crewFeatureMenuLocale";
export {loadCrewFeatureMenuLocale};

type MenuDetail=Parameters<typeof trackUsageEvent>[1];
type MenuItem={id:string;to:string;icon:string;detail:MenuDetail};
type MenuGroup={id:string;icon:string;items:readonly MenuItem[]};

/** Lazy-loaded catalog: every destination goes directly to a real Crew page. */
export const FEATURE_MENU_GROUPS:readonly MenuGroup[]=[
 {id:"chat",icon:"💬",items:[
  {id:"friends",to:"/teacher/roles?mode=friends",icon:"💬",detail:"friend"},
  {id:"shorts",to:"/teacher/shorts",icon:"📸",detail:"shorts"},
  {id:"friendMemory",to:"/settings#memory-settings",icon:"🧠",detail:"settings"}
 ]},
 {id:"learn",icon:"🎓",items:[
  {id:"teacher",to:"/teacher/roles?mode=teacher",icon:"🎤",detail:"learn"},
  {id:"courses",to:"/teacher/course",icon:"🗣️",detail:"learn"},
  {id:"vocabulary",to:"/teacher/vocabulary",icon:"📝",detail:"learn"},
  {id:"pronunciation",to:"/teacher/pronunciation",icon:"🔊",detail:"learn"},
  {id:"textbook",to:"/teacher/textbook",icon:"📷",detail:"learn"},
  {id:"phrasebook",to:"/teacher/phrasebook",icon:"💡",detail:"learn"},
  {id:"reading",to:"/teacher/reading-library",icon:"📖",detail:"learn"}
 ]},
 {id:"games",icon:"🎮",items:[
  {id:"games",to:"/games",icon:"🕹️",detail:"play"},
  {id:"gomoku",to:"/games/gomoku",icon:"⚫",detail:"play"},
  {id:"onea2b",to:"/games/1a2b",icon:"🔢",detail:"play"},
  {id:"connect4",to:"/games/connect4",icon:"🔴",detail:"play"},
  {id:"reversi",to:"/games/reversi",icon:"⚪",detail:"play"},
  {id:"numberBomb",to:"/games/number-bomb",icon:"💣",detail:"play"},
  {id:"memoryGame",to:"/games/memory",icon:"🃏",detail:"play"}
 ]},
 {id:"explore",icon:"✨",items:[
  {id:"souls",to:"/souls",icon:"✨",detail:"souls"},
  {id:"mate",to:"/mate",icon:"🤝",detail:"mate"},
  {id:"story",to:"/story",icon:"📖",detail:"story"},
  {id:"fortune",to:"/fortune",icon:"🔮",detail:"fortune"},
  {id:"timeline",to:"/timeline",icon:"🕰️",detail:"timeline"},
  {id:"town",to:"/town",icon:"🏘️",detail:"town"},
  {id:"magic",to:"/magic",icon:"🪄",detail:"magic"},
  {id:"discover",to:"/discover",icon:"🌍",detail:"discover"},
  {id:"research",to:"/research",icon:"📚",detail:"briefing"}
 ]},
 {id:"me",icon:"👤",items:[
  {id:"records",to:"/me",icon:"👤",detail:"me"},
  {id:"reports",to:"/teacher/reports",icon:"📊",detail:"me"},
  {id:"personalMemory",to:"/teacher/memory",icon:"🧠",detail:"me"},
  {id:"myStories",to:"/story/me",icon:"📚",detail:"story"},
  {id:"fortuneHistory",to:"/fortune/history",icon:"🔮",detail:"fortune"},
  {id:"settings",to:"/settings",icon:"⚙️",detail:"settings"}
 ]}
];

export default function CrewFeatureMenuPanel({onClose,triggerRef}:{onClose:()=>void;triggerRef:RefObject<HTMLButtonElement|null>}){
 const {t,i18n}=useTranslation("featureMenu");
 useEffect(()=>{void loadCrewFeatureMenuLocale()},[i18n.language]);
 const closeRef=useRef<HTMLButtonElement>(null);
 const dialogRef=useRef<HTMLElement>(null);
 const navigate=useNavigate();
 const [closing,setClosing]=useState(false);
 const [expandedGroup,setExpandedGroup]=useState<string|null>("chat");
 const destinationRef=useRef<string|null>(null);
 const finishedRef=useRef(false);
 const closingRef=useRef(false);
 const finishClose=useCallback(()=>{
  if(finishedRef.current)return;
  finishedRef.current=true;
  onClose();
  if(destinationRef.current)navigate(destinationRef.current);
 },[onClose,navigate]);
 const beginClose=useCallback((destination?:string)=>{
  if(closingRef.current)return;
  closingRef.current=true;
  destinationRef.current=destination||null;
  setClosing(true);
 },[]);
 // Keep the drawer mounted for the exit animation; always settle if the
 // animation event is skipped by reduced-motion, a hidden tab, or a WebView.
 useEffect(()=>{
  if(!closing)return;
  const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const timeout=window.setTimeout(finishClose,reduced?0:270);
  return()=>window.clearTimeout(timeout);
 },[closing,finishClose]);
 useEffect(()=>{
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  closeRef.current?.focus();
  function onKeyDown(event:KeyboardEvent){
   if(event.key==="Escape"){event.preventDefault();beginClose();return}
   if(event.key!=="Tab")return;
   const dialog=dialogRef.current;
   if(!dialog)return;
   const focusable=[...dialog.querySelectorAll<HTMLElement>('a[href]:not([tabindex="-1"]),button:not([disabled]),[tabindex]:not([tabindex="-1"])')];
   const first=focusable[0],last=focusable[focusable.length-1];
   if(!first||!last){event.preventDefault();return}
   if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){
    event.preventDefault();last.focus();
   }else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){
    event.preventDefault();first.focus();
   }
  }
  const onBack=()=>beginClose();
  document.addEventListener("keydown",onKeyDown);
  window.addEventListener("popstate",onBack);
  return()=>{
   document.body.style.overflow=oldOverflow;
   document.removeEventListener("keydown",onKeyDown);
   window.removeEventListener("popstate",onBack);
   triggerRef.current?.focus();
  };
 },[beginClose,triggerRef]);
 return createPortal(
  <div className="crew-feature-menu-layer" data-state={closing?"closing":"open"}>
   <div className="crew-feature-menu-backdrop" onClick={()=>beginClose()} aria-hidden="true"/>
   <aside id="crew-feature-menu-dialog" className="crew-feature-menu-panel" ref={dialogRef} role="dialog"
    aria-modal="true" aria-labelledby="crew-feature-menu-title"
    onAnimationEnd={event=>{if(closing&&event.target===event.currentTarget)finishClose()}}>
    <div className="crew-feature-menu-heading">
     <div><h2 id="crew-feature-menu-title">{t("title")}</h2>
      <p>{t("subtitle")}</p></div>
     <button className="crew-feature-menu-close" type="button" ref={closeRef}
      onClick={()=>beginClose()} aria-label={t("close")}>×</button>
    </div>
    <nav className="crew-feature-menu-content" aria-label={t("title")}>
     {FEATURE_MENU_GROUPS.map(group=>{
      const expanded=expandedGroup===group.id;
      const listId="crew-menu-items-"+group.id;
      return <section key={group.id} className="crew-feature-menu-section" aria-labelledby={"crew-menu-group-"+group.id}>
       <h3 className="crew-feature-menu-group-heading">
        <button id={"crew-menu-group-"+group.id} type="button" className="crew-feature-menu-group-trigger"
         aria-expanded={expanded} aria-controls={listId}
         onClick={()=>setExpandedGroup(current=>current===group.id?null:group.id)}>
         <span className="crew-feature-menu-group-icon" aria-hidden="true">{group.icon}</span>
         <span className="crew-feature-menu-group-label">
          <strong>{t("groups."+group.id)}</strong>
          <small>{group.items.length} {t("featureCount")}</small>
         </span>
         <span className="crew-feature-menu-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25"
           strokeLinecap="round" strokeLinejoin="round" focusable="false">
           <path d="m6 9 6 6 6-6"/>
          </svg>
         </span>
        </button>
       </h3>
       <div id={listId} className="crew-feature-menu-branch" data-expanded={expanded?"true":"false"} aria-hidden={!expanded}>
        <div className="crew-feature-menu-branch-inner">
         <div className="crew-feature-menu-list">
          {group.items.map(item=><Link key={item.id} to={item.to} className="crew-feature-menu-card"
           tabIndex={expanded?0:-1}
           onClick={event=>{
            if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
            event.preventDefault();
            trackUsageEvent("menu_item_click",item.detail);
            beginClose(item.to);
           }}>
           <span className="crew-feature-menu-branch-mark" aria-hidden="true">↳</span>
           <span className="crew-feature-menu-icon" aria-hidden="true">{item.icon}</span>
           <span className="crew-feature-menu-card-copy">
            <strong>{t("items."+item.id+".title")}</strong>
            <small>{t("items."+item.id+".desc")}</small>
           </span>
           <span className="crew-feature-menu-link-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" focusable="false">
             <path d="m9 6 6 6-6 6"/>
            </svg>
           </span>
          </Link>)}
         </div>
        </div>
       </div>
      </section>;
     })}
    </nav>
   </aside>
  </div>,document.body);
}
