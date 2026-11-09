import {useEffect,useRef,useState} from "react";
import {createPortalField,type PortalFieldController,type PortalMode} from "./portalField.mjs";

type Props={mode:PortalMode;paused?:boolean;launching?:boolean;enabled:boolean};
export function PortalParticleField({mode,paused=false,launching=false,enabled}:Props){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const controller=useRef<PortalFieldController|null>(null);
 const [ready,setReady]=useState(false);
 // Idle initialization always uses the latest manually selected tab.
 const latest=useRef({mode,paused,launching});
 latest.current={mode,paused,launching};
 useEffect(()=>{
  const canvas=canvasRef.current,host=canvas?.closest<HTMLElement>(".crew-home-portal");
  if(!enabled||!canvas||!host)return;
  const state=latest.current;
  const field=createPortalField(canvas,host,state.mode);
  controller.current=field;
  if(field){field.setPaused(state.paused);field.setLaunching(state.launching)}
  setReady(Boolean(field));
  return()=>{field?.destroy();controller.current=null};
 },[enabled]);
 useEffect(()=>controller.current?.setMode(mode),[mode,enabled]);
 useEffect(()=>controller.current?.setPaused(paused),[paused,enabled]);
 useEffect(()=>controller.current?.setLaunching(launching),[launching,enabled]);
 return <div className="crew-portal-field" data-ready={ready} aria-hidden="true">
  <svg className="crew-portal-fallback" data-mode={mode} viewBox="0 0 600 400" fill="none" preserveAspectRatio="none">
   {mode==="fortune"?<><ellipse cx="300" cy="200" rx="200" ry="142" transform="rotate(-30 300 200)" stroke="currentColor"/><ellipse cx="300" cy="200" rx="224" ry="172" stroke="currentColor" strokeDasharray="2 7" strokeWidth="3"/><ellipse cx="300" cy="200" rx="244" ry="184" transform="rotate(30 300 200)" stroke="currentColor"/><path d="M300 65 424 157 377 309 223 309 176 157Z" stroke="currentColor" opacity=".5"/><path d="m300 58 4 11 11 4-11 4-4 11-4-11-11-4 11-4ZM414 150l4 11 11 4-11 4-4 11-4-11-11-4 11-4Z" fill="currentColor"/></>:mode==="play"?<><rect x="70" y="72" width="460" height="256" rx="94" transform="rotate(9 300 200)" stroke="currentColor"/><rect x="50" y="56" width="500" height="288" rx="102" transform="rotate(9 300 200)" stroke="currentColor" strokeDasharray="2 7" strokeWidth="3"/><rect x="92" y="88" width="416" height="224" rx="84" transform="rotate(9 300 200)" stroke="currentColor"/></>:mode==="learn"?<><path d="M68 208C3 34 250 106 323 55S589 112 522 224 405 259 330 330 22 328 68 208Z" stroke="currentColor"/><path d="M52 220C-2 22 248 95 328 40S610 112 538 236 412 275 330 347 5 348 52 220Z" stroke="currentColor" strokeDasharray="2 7" strokeWidth="3"/><path d="M84 199C20 55 250 117 317 70S567 113 506 212 399 243 330 314 40 307 84 199Z" stroke="currentColor"/></>:<><path d="M80 200C80 20 520 20 520 200S80 380 80 200Z" stroke="currentColor"/><path d="M60 210C60 -20 540 30 540 210S60 420 60 210Z" stroke="currentColor" strokeDasharray="2 7" strokeWidth="3"/><path d="M40 200C40 55 560 -20 560 200S40 400 40 200Z" stroke="currentColor"/></>}
  </svg>
  <canvas ref={canvasRef}/>
 </div>;
}
