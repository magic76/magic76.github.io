import {useEffect,useRef,useState,type KeyboardEvent,type MouseEvent} from "react";
import {Link,useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon,type IconName} from "../components/Icon";
import {PortalParticleField} from "./PortalParticleField";
import type {PortalMode} from "./portalField.mjs";

const MODES:readonly {id:PortalMode;icon:IconName;to:string;name:string}[]=[
 {id:"chat",icon:"chat",to:"/teacher/roles?mode=friends",name:"THE CONNECTION / CHAT"},
 {id:"play",icon:"play",to:"/games",name:"THE PLAYGROUND / PLAY"},
 {id:"learn",icon:"teacher",to:"/teacher",name:"THE RESONANCE / LEARN"},
 {id:"story",icon:"story",to:"/story",name:"THE UNFOLDING / STORY"}
];

/** The invitation is semantic HTML; the particle field only supports its meaning. */
export function HomePortal(){
 const {t}=useTranslation("home");
 const navigate=useNavigate();
 const [mode,setMode]=useState<PortalMode>("chat");
 const [paused,setPaused]=useState(false);
 const [launching,setLaunching]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const buttons=useRef<(HTMLButtonElement|null)[]>([]);
 const current=MODES.find(item=>item.id===mode)||MODES[0];
 const index=MODES.indexOf(current);
 useEffect(()=>()=>{if(timer.current!==null)clearTimeout(timer.current)},[]);
 const launch=(event:MouseEvent<HTMLAnchorElement>)=>{
  // Native link semantics survive modifier clicks, new tabs and script-free SSG.
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.defaultPrevented)return;
  if(paused||window.matchMedia("(prefers-reduced-motion: reduce)").matches||
   (navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData)return;
  event.preventDefault();
  if(timer.current!==null)return;
  setLaunching(true);
  timer.current=setTimeout(()=>{timer.current=null;navigate(current.to)},480);
 };
 const keyMode=(event:KeyboardEvent<HTMLButtonElement>,at:number)=>{
  let next=at;
  if(event.key==="ArrowRight")next=(at+1)%MODES.length;
  else if(event.key==="ArrowLeft")next=(at+MODES.length-1)%MODES.length;
  else if(event.key==="Home")next=0;
  else if(event.key==="End")next=MODES.length-1;
  else return;
  event.preventDefault();setMode(MODES[next].id);buttons.current[next]?.focus();
 };
 return <header className="crew-home-portal" data-mode={mode} data-launching={launching}>
  <PortalParticleField mode={mode} paused={paused} launching={launching}/>
  <div className="crew-portal-intro"><span>A LITTLE SPARK. A WHOLE NEW WORLD.</span><p>{t("world.intro")}</p></div>
  <span className="crew-portal-edge" aria-hidden="true">MOVE A LITTLE. FEEL A CONNECTION.</span>
  <span className="crew-portal-number" aria-hidden="true">0{index+1} / 04</span>
  <div className="crew-portal-content" id="crew-portal-panel" role="tabpanel" aria-labelledby={"crew-portal-tab-"+mode}>
   <div className="crew-portal-copy" key={mode}>
    <span className="crew-portal-kicker" aria-hidden="true">{current.name}</span>
    <h1>{t("world.modes."+mode+".lead")}<br/>{t("world.modes."+mode+".before")} <em>{t("world.modes."+mode+".accent")}</em>{t("world.modes."+mode+".after")}</h1>
    <p className="crew-portal-description">{t("world.modes."+mode+".description")}</p>
   </div>
   <Link className="crew-portal-cta" to={current.to} onClick={launch} aria-disabled={launching||undefined}>
    {t("world.modes."+mode+".cta")}<span aria-hidden="true">↗</span>
   </Link>
  </div>
  <div className="crew-portal-tabs" role="tablist" aria-label={t("portal.choose")}>
   {MODES.map((item,i)=><button key={item.id} id={"crew-portal-tab-"+item.id} type="button" role="tab"
    aria-controls="crew-portal-panel" aria-selected={mode===item.id} tabIndex={mode===item.id?0:-1}
    ref={el=>{buttons.current[i]=el}} disabled={launching}
    onClick={()=>setMode(item.id)} onKeyDown={event=>keyMode(event,i)}>
    <Icon name={item.icon}/><span>{t("portal.modes."+item.id+".label")}</span>
   </button>)}
  </div>
  <p className="crew-portal-hint">{t("world.touch")}</p>
  <button type="button" className="crew-portal-motion" aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>
   <span aria-hidden="true">{paused?"▷":"Ⅱ"}</span> {t(paused?"world.resume":"world.pause")}
  </button>
 </header>;
}
