import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {Link,useLocation} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import "./crewFeatureMenu.css";

type MenuDetail=Parameters<typeof trackUsageEvent>[1];
type MenuItem={id:string;to:string;icon:string;detail:MenuDetail};
type MenuGroup={id:string;items:readonly MenuItem[]};

/** A discoverable index of user-facing features, not every internal subroute. */
export const FEATURE_MENU_GROUPS:readonly MenuGroup[]=[
 {id:"chat",items:[
  {id:"friends",to:"/teacher/roles?mode=friends",icon:"💬",detail:"friend"},
  {id:"teacher",to:"/teacher/roles?mode=teacher",icon:"🎓",detail:"learn"},
  {id:"games",to:"/games",icon:"🎮",detail:"play"},
  {id:"shorts",to:"/teacher/shorts",icon:"📸",detail:"shorts"}
 ]},
 {id:"explore",items:[
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
 {id:"me",items:[
  {id:"records",to:"/me",icon:"👤",detail:"me"},
  {id:"settings",to:"/settings",icon:"⚙️",detail:"settings"}
 ]}
];

export function CrewFeatureMenu(){
 const {t}=useTranslation("common");
 const location=useLocation();
 const [open,setOpen]=useState(false);
 const triggerRef=useRef<HTMLButtonElement>(null);
 const closeRef=useRef<HTMLButtonElement>(null);
 const dialogRef=useRef<HTMLElement>(null);
 // AppChrome can survive route updates; no stale drawer on navigation.
 useEffect(()=>{setOpen(false)},[location.pathname,location.search]);
 useEffect(()=>{
  if(!open)return;
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  closeRef.current?.focus();
  function onKeyDown(event:KeyboardEvent){
   if(event.key==="Escape"){event.preventDefault();setOpen(false);return}
   if(event.key!=="Tab")return;
   const dialog=dialogRef.current;
   if(!dialog)return;
   const focusable=[...dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')];
   const first=focusable[0],last=focusable[focusable.length-1];
   if(!first||!last){event.preventDefault();return}
   if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){
    event.preventDefault();last.focus();
   }else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){
    event.preventDefault();first.focus();
   }
  }
  const onBack=()=>setOpen(false);
  document.addEventListener("keydown",onKeyDown);
  window.addEventListener("popstate",onBack);
  return()=>{
   document.body.style.overflow=oldOverflow;
   document.removeEventListener("keydown",onKeyDown);
   window.removeEventListener("popstate",onBack);
   triggerRef.current?.focus();
  };
 },[open]);
 const toggle=()=>{
  if(!open)trackUsageEvent("menu_open");
  setOpen(value=>!value);
 };
 return <>
  <button ref={triggerRef} type="button" className="crew-feature-menu-trigger" onClick={toggle}
   aria-haspopup="dialog" aria-expanded={open} aria-controls={open?"crew-feature-menu-dialog":undefined}
   aria-label={t("featureMenu.trigger")}>
   <span className="crew-feature-menu-hamburger" aria-hidden="true"><i/><i/><i/></span>
   <span className="crew-feature-menu-label-full">{t("featureMenu.trigger")}</span>
   <span className="crew-feature-menu-label-short">{t("featureMenu.shortTrigger")}</span>
  </button>
  {open&&typeof document!=="undefined"&&createPortal(
   <div className="crew-feature-menu-layer">
    <div className="crew-feature-menu-backdrop" onClick={()=>setOpen(false)} aria-hidden="true"/>
    <aside id="crew-feature-menu-dialog" className="crew-feature-menu-panel" ref={dialogRef} role="dialog"
     aria-modal="true" aria-labelledby="crew-feature-menu-title">
     <div className="crew-feature-menu-heading">
      <div><h2 id="crew-feature-menu-title">{t("featureMenu.title")}</h2>
       <p>{t("featureMenu.subtitle")}</p></div>
      <button className="crew-feature-menu-close" type="button" ref={closeRef}
       onClick={()=>setOpen(false)} aria-label={t("featureMenu.close")}>×</button>
     </div>
     <nav className="crew-feature-menu-content" aria-label={t("featureMenu.title")}>
      {FEATURE_MENU_GROUPS.map(group=>
       <section key={group.id} className="crew-feature-menu-section" aria-labelledby={"crew-menu-group-"+group.id}>
        <h3 id={"crew-menu-group-"+group.id}>{t("featureMenu.groups."+group.id)}</h3>
        <div className="crew-feature-menu-grid">
         {group.items.map(item=><Link key={item.id} to={item.to} className="crew-feature-menu-card"
          onClick={()=>{trackUsageEvent("menu_item_click",item.detail);setOpen(false)}}>
          <span className="crew-feature-menu-icon" aria-hidden="true">{item.icon}</span>
          <strong>{t("featureMenu.items."+item.id+".title")}</strong>
          <small>{t("featureMenu.items."+item.id+".desc")}</small>
         </Link>)}
        </div>
       </section>)}
     </nav>
    </aside>
   </div>,document.body)}
 </>;
}
