import {useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon,type IconName} from "../components/Icon";
import {HomeAtmosphere,type HomeProduct} from "./HomeAtmosphere";

type PortalMode=Extract<HomeProduct,"chat"|"play"|"learn"|"story">;
const MODES:readonly {id:PortalMode;icon:IconName;to:string}[]=[
 {id:"chat",icon:"chat",to:"/teacher/roles?mode=friends"},
 {id:"play",icon:"play",to:"/games"},
 {id:"learn",icon:"teacher",to:"/teacher"},
 {id:"story",icon:"story",to:"/story"}
];

/** A first-screen, task-first portal. The actual destinations work without a Gemini key when supported. */
export function HomePortal(){
 const {t}=useTranslation("home");
 const [mode,setMode]=useState<PortalMode>("chat");
 const current=MODES.find(item=>item.id===mode)||MODES[0];
 const name=(id:PortalMode)=>t("portal.modes."+id+".label");
 return <header className="crew-home-intro crew-home-portal" data-mode={mode}>
  <HomeAtmosphere activeProduct={mode}/>
  <div className="crew-home-intro-copy crew-home-portal-copy">
   <span className="crew-home-eyebrow">{t("eyebrow")}</span>
   <h1>{t("portal.headingLead")}<em>{t("portal.headingAccent")}</em></h1>
   <p>{t("portal.description")}</p>
   <div className="crew-home-portal-actions">
    <Link className="crew-home-portal-start" to={current.to}>
     {t("portal.start",{mode:name(current.id)})}<span aria-hidden="true">↗</span>
    </Link>
    <Link className="crew-home-portal-secondary" to="/explore">{t("portal.explore")} <span aria-hidden="true">→</span></Link>
   </div>
   <p className="crew-home-portal-hint" aria-live="polite" aria-atomic="true">{t("portal.modes."+mode+".hint")}</p>
  </div>
  <div className="crew-home-portal-stage" role="group" aria-label={t("portal.choose")}>
   <span className="crew-home-portal-stage-halo" aria-hidden="true"/>
   <span className="crew-home-portal-ring outer" aria-hidden="true"/>
   <span className="crew-home-portal-ring inner" aria-hidden="true"/>
   <Link key={mode} className="crew-home-portal-center" to={current.to} aria-label={t("portal.start",{mode:name(current.id)})}>
    <span className="crew-home-portal-emblem"><Icon name={current.icon}/></span>
    <span className="crew-home-portal-center-title">{t("portal.modes."+mode+".title")}</span>
    <small>{t("portal.tap")}</small>
   </Link>
   <div className="crew-home-portal-modes">
    {MODES.map(item=><button key={item.id} type="button" data-mode={item.id}
     className="crew-home-portal-mode" aria-pressed={mode===item.id}
     onClick={()=>setMode(item.id)}>
     <span className="crew-home-portal-mode-icon"><Icon name={item.icon}/></span>
     <span>{name(item.id)}</span>
    </button>)}
   </div>
  </div>
 </header>;
}
