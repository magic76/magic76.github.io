import {useEffect,useRef,useState} from "react";
import {createPortalField,type PortalFieldController,type PortalMode} from "./portalField.mjs";

export function PortalParticleField({mode,paused,launching,enabled}:{mode:PortalMode;paused:boolean;launching:boolean;enabled:boolean}){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const controller=useRef<PortalFieldController|null>(null);
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  const canvas=canvasRef.current,host=canvas?.closest<HTMLElement>(".crew-home-portal");
  if(!enabled||!canvas||!host)return;
  const field=createPortalField(canvas,host);
  controller.current=field;setReady(Boolean(field));
  return()=>{field?.destroy();controller.current=null};
 },[enabled]);
 useEffect(()=>controller.current?.setMode(mode),[mode]);
 useEffect(()=>controller.current?.setPaused(paused),[paused]);
 useEffect(()=>controller.current?.setLaunching(launching),[launching]);
 return <div className="crew-portal-field" data-ready={ready} aria-hidden="true">
  <svg className="crew-portal-fallback" viewBox="0 0 600 400" fill="none" preserveAspectRatio="none">
   <path d="M80 200C80 20 520 20 520 200S80 380 80 200Z" stroke="currentColor"/>
   <path d="M60 210C60 -20 540 30 540 210S60 420 60 210Z" stroke="currentColor" strokeDasharray="2 7" strokeWidth="3"/>
   <path d="M40 200C40 55 560 -20 560 200S40 400 40 200Z" stroke="currentColor"/>
  </svg>
  <canvas ref={canvasRef}/>
 </div>;
}
