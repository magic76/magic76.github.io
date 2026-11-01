import {useEffect,useRef,useState} from "react";
import {createPortalField,type PortalFieldController,type PortalMode} from "./portalField.mjs";

type Props={mode:PortalMode;focus?:PortalMode;paused?:boolean;launching?:boolean;enabled:boolean};
export function PortalParticleField({mode,focus=mode,paused=false,launching=false,enabled}:Props){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const controller=useRef<PortalFieldController|null>(null);
 const [ready,setReady]=useState(false);
 // The idle-delayed mount must use the user's latest focused tile.
 const latest=useRef({focus,paused,launching});
 latest.current={focus,paused,launching};
 useEffect(()=>{
  const canvas=canvasRef.current,host=canvas?.closest<HTMLElement>(".crew-portal-tiles");
  if(!enabled||!canvas||!host)return;
  const state=latest.current;
  const field=createPortalField(canvas,host,state.focus);
  controller.current=field;
  if(field){field.setPaused(state.paused);field.setLaunching(state.launching)}
  setReady(Boolean(field));
  return()=>{field?.destroy();controller.current=null};
 },[enabled]);
 useEffect(()=>controller.current?.setMode(focus),[focus,enabled]);
 useEffect(()=>controller.current?.setPaused(paused),[paused,enabled]);
 useEffect(()=>controller.current?.setLaunching(launching),[launching,enabled]);
 return <div className="crew-portal-field" data-ready={ready} aria-hidden="true">
  <div className="crew-portal-fallback">{(["chat","learn","fortune","play"] as const).map(tileMode=><svg key={tileMode} data-mode={tileMode} viewBox="0 0 200 160" fill="none" preserveAspectRatio="none">
   {tileMode==="fortune"?<><circle cx="100" cy="54" r="38" stroke="currentColor" strokeDasharray="1 5"/><ellipse cx="100" cy="54" rx="46" ry="30" stroke="currentColor"/><path d="M100 21 132 43 120 82 78 82 66 43Z" stroke="currentColor"/></>:tileMode==="play"?<><rect x="54" y="24" width="92" height="58" rx="17" transform="rotate(9 100 54)" stroke="currentColor" strokeDasharray="1 5" strokeWidth="2"/><rect x="63" y="30" width="74" height="47" rx="13" transform="rotate(-8 100 54)" stroke="currentColor"/></>:tileMode==="learn"?<><path d="M49 56C31 14 89 38 104 22S166 30 150 56 125 68 107 86 39 79 49 56Z" stroke="currentColor" strokeDasharray="1 5" strokeWidth="2"/><path d="M51 59C50 21 93 36 113 25S164 40 147 62 111 69 99 82 45 86 51 59Z" stroke="currentColor"/></>:<><ellipse cx="100" cy="54" rx="50" ry="30" stroke="currentColor"/><path d="M45 54C45 9 155 9 155 54S45 99 45 54Z" stroke="currentColor" strokeDasharray="1 5" strokeWidth="2"/></>}
  </svg>)}</div>
  <canvas ref={canvasRef}/>
 </div>;
}
