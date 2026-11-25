import {useEffect,useId,useRef,useState} from "react";
import {useTranslation} from "react-i18next";

export function FriendVoiceMute({volume,onVolume,compact=false}:{volume:number;onVolume:(value:number)=>void;compact?:boolean}){
 const {t}=useTranslation("voice");
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const panelId=useId();
 const value=Math.max(0,Math.min(100,volume)),muted=value===0;
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))setOpen(false)};
  const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);trigger.current?.focus()}};
  document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
  return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape)};
 },[open]);
 return <div ref={root} className={"friend-voice-volume"+(compact?" is-compact":"")}>
  <button ref={trigger} type="button" className="friend-voice-mute" aria-label={t("controls.volumeSummary",{v:value})} aria-expanded={open} aria-controls={panelId} data-muted={muted} title={t("controls.volumeAria")} onClick={()=>setOpen(v=>!v)}>
   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5 6 9H3v6h3l5 4z"/>
    {muted?<path d="m16 9 6 6m0-6-6 6"/>:<path d="M15 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"/>}
   </svg>
   {!compact&&<span className="friend-voice-mute-caption">{value}%</span>}
  </button>
  <div id={panelId} className="friend-voice-volume-panel" hidden={!open}>
   <label htmlFor={panelId+"-range"}>{t("controls.volumeLabel")} <output>{value}%</output></label>
   <input id={panelId+"-range"} type="range" min="0" max="100" step="1" value={value} onChange={e=>onVolume(Number(e.target.value))} aria-label={t("controls.volumeRange")} aria-valuetext={value+"%"}/>
   <div className="friend-voice-volume-limits"><button type="button" onClick={()=>onVolume(0)} aria-label={t("controls.volumeSummary",{v:0})}>0%</button><button type="button" onClick={()=>onVolume(100)} aria-label={t("controls.volumeSummary",{v:100})}>100%</button></div>
  </div>
 </div>;
}
