import {lazy,Suspense,useCallback,useEffect,useRef,useState} from "react";
import {useLocation} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import "./crewFeatureMenu.css";
import {loadUiNamespace} from "../i18n";

// Only the compact trigger ships with Crew's initial JavaScript.
const CrewFeatureMenuPanel=lazy(()=>Promise.all([loadUiNamespace("featureMenu"),import("./CrewFeatureMenuPanel")]).then(([,component])=>component));

export function CrewFeatureMenu(){
 const {t}=useTranslation("common");
 const location=useLocation();
 const [open,setOpen]=useState(false);
 const triggerRef=useRef<HTMLButtonElement>(null);
 const close=useCallback(()=>setOpen(false),[]);
 useEffect(()=>{close()},[location.pathname,location.search,close]);
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
  {open&&<Suspense fallback={null}><CrewFeatureMenuPanel onClose={close} triggerRef={triggerRef}/></Suspense>}
 </>;
}
