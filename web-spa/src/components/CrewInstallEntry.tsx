import {useEffect,useRef,useState,useSyncExternalStore} from "react";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import {
 canOfferCrewInstall,emptyCrewInstallPrompt,getCrewInstallPrompt,
 isCrewEmbeddedBrowser,isCrewIosDevice,isCrewIosSafari,
 requestCrewInstall,registerCrewPwa,subscribeCrewInstall
} from "../runtime/pwa";
import {getCrewInstallCopy} from "./crewInstallCopy";
import "./crewInstallEntry.css";

type InstallSource="footer"|"menu"|"nudge"|"fortune";
const NUDGE_KEY="crew_pwa_install_nudge_v1";
const ENGAGED_KEY="crew_pwa_engaged_v1";
const DAY=24*60*60*1000;

function getGuide(copy:ReturnType<typeof getCrewInstallCopy>){
 if(isCrewEmbeddedBrowser())return copy.external;
 if(isCrewIosSafari())return copy.ios;
 if(isCrewIosDevice())return copy.external;
 if(/Android/i.test(navigator.userAgent))return copy.android;
 return copy.desktop;
}
function useInstallAction(source:InstallSource){
 const {i18n}=useTranslation();
 const prompt=useSyncExternalStore(subscribeCrewInstall,getCrewInstallPrompt,emptyCrewInstallPrompt);
 const [supported,setSupported]=useState(false);
 const [guide,setGuide]=useState(false);
 useEffect(()=>{registerCrewPwa();const sync=()=>setSupported(canOfferCrewInstall());sync();return subscribeCrewInstall(sync);},[]);
 const copy=getCrewInstallCopy(i18n.resolvedLanguage||i18n.language);
 const action=()=>{
  trackUsageEvent("pwa_install_click",source);
  if(prompt){
   setGuide(false);
   void requestCrewInstall().then(accepted=>{
    if(!accepted)trackUsageEvent("pwa_install_dismiss","native");
   });
  }else setGuide(true);
 };
 return {supported,prompt,guide,setGuide,copy,action};
}
function InstallGuide({message,closeLabel,onClose}:{message:string;closeLabel:string;onClose:()=>void}){
 return <div className="crew-install-guide" role="status">
  <span>{message}</span>
  <button type="button" aria-label={closeLabel} onClick={onClose}>×</button>
 </div>;
}

/** Existing footer install action remains for browsers that can install. */
export function CrewInstallEntry(){
 const {supported,prompt,guide,setGuide,copy,action}=useInstallAction("footer");
 if(!supported||(!prompt&&!isCrewIosSafari()))return null;
 return <div className="crew-install-entry">
  <button type="button" className="crew-install-action" onClick={action}>{prompt?copy.install:copy.add}</button>
  {guide&&<InstallGuide message={getGuide(copy)} closeLabel={copy.close} onClose={()=>setGuide(false)}/>}
 </div>;
}

/** Contextual non-modal CTA in the lazy fortune route. */
export function CrewInstallInline(){
 const {supported,prompt,guide,setGuide,copy,action}=useInstallAction("fortune");
 if(!supported||(!prompt&&!isCrewIosSafari()&&!isCrewIosDevice()&&!isCrewEmbeddedBrowser()&&!/Android/i.test(navigator.userAgent)))return null;
 return <div className="crew-install-inline">
  <button type="button" className="crew-install-action" onClick={action}>{copy.add}</button>
  {guide&&<InstallGuide message={getGuide(copy)} closeLabel={copy.close} onClose={()=>setGuide(false)}/>}
 </div>;
}

/** Always discoverable in the hamburger menu; hidden in standalone and Android shell. */
export function CrewInstallMenuAction(){
 const {supported,guide,setGuide,copy,action}=useInstallAction("menu");
 if(!supported)return null;
 return <section className="crew-feature-menu-install-wrap" aria-label={copy.install}>
  <button type="button" className="crew-feature-menu-install-btn" onClick={action}>
   <span className="crew-feature-menu-install-icon" aria-hidden="true">↓</span>
   <span className="crew-feature-menu-install-copy"><strong>{copy.install}</strong><small>{copy.menuDesc}</small></span>
   <span aria-hidden="true">→</span>
  </button>
  {guide&&<InstallGuide message={getGuide(copy)} closeLabel={copy.close} onClose={()=>setGuide(false)}/>}
 </section>;
}

/** Non-modal invitation after meaningful use; never interrupts Live or game routes. */
export function CrewInstallNudge(){
 const {supported,prompt,guide,setGuide,copy,action}=useInstallAction("nudge");
 const [engaged,setEngaged]=useState(false);
 const [dismissed,setDismissed]=useState(false);
 const impression=useRef(false);
 useEffect(()=>{
  const eligible=()=>{
   try{
    const snooze=localStorage.getItem(NUDGE_KEY);
    return localStorage.getItem(ENGAGED_KEY)==="1"&&snooze!=="never"&&
     (!snooze||Number(snooze)<Date.now());
   }catch{return false;}
  };
  setEngaged(eligible());
  const onExperience=()=>setEngaged(eligible());
  window.addEventListener("crew-pwa-engaged",onExperience);
  return()=>window.removeEventListener("crew-pwa-engaged",onExperience);
 },[]);
 const visible=supported&&engaged&&!dismissed&&(Boolean(prompt)||isCrewIosSafari());
 useEffect(()=>{
  if(!visible||impression.current)return;
  impression.current=true;
  // Even if the user navigates away without clicking, don't show repeatedly.
  try{localStorage.setItem(NUDGE_KEY,String(Date.now()+7*DAY));}catch{/* optional */}
  trackUsageEvent("pwa_install_view","nudge");
 },[visible]);
 const dismiss=(never:boolean)=>{
  try{localStorage.setItem(NUDGE_KEY,never?"never":String(Date.now()+14*DAY));}catch{/* optional */}
  trackUsageEvent("pwa_install_dismiss","nudge");
  setDismissed(true);
 };
 if(!visible)return null;
 return <aside className="crew-install-nudge" aria-label={copy.inviteTitle}>
  <div className="crew-install-nudge-heading">
   <span className="crew-install-nudge-icon" aria-hidden="true">✳</span>
   <span><strong>{copy.inviteTitle}</strong><small>{copy.inviteDesc}</small></span>
  </div>
  {guide&&<InstallGuide message={getGuide(copy)} closeLabel={copy.close} onClose={()=>setGuide(false)}/>}
  <div className="crew-install-nudge-actions">
   <button type="button" className="crew-install-nudge-primary" onClick={action}>{prompt?copy.install:copy.add}</button>
   <button type="button" className="crew-install-nudge-later" onClick={()=>dismiss(false)}>{copy.later}</button>
  </div>
  <button type="button" className="crew-install-nudge-never" onClick={()=>dismiss(true)}>{copy.never}</button>
 </aside>;
}
