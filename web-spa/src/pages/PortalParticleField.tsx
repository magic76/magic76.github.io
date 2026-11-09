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
  {/* One calm three-layer focal object: back orbit / cloud body / front glints. */}
  <svg className="crew-portal-core" viewBox="0 0 320 240" fill="none" aria-hidden="true">
   <defs>
    <radialGradient id="crew-core-fill" cx="0" cy="0" r="1" gradientTransform="translate(102 54) rotate(48) scale(245 220)" gradientUnits="userSpaceOnUse"><stop stopColor="#FFFBE8" stopOpacity=".98"/><stop offset=".3" stopColor="#FFD8A0" stopOpacity=".92"/><stop offset=".7" stopColor="#FC976A" stopOpacity=".72"/><stop offset="1" stopColor="#B35E91" stopOpacity=".37"/></radialGradient>
    <linearGradient id="crew-core-rim" x1="65" y1="52" x2="248" y2="202" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF8DF" stopOpacity=".57"/><stop offset=".55" stopColor="#FFE0B5" stopOpacity=".08"/><stop offset="1" stopColor="#F1A4C5" stopOpacity=".16"/></linearGradient>
    <radialGradient id="crew-core-halo"><stop stopColor="#FFC09A" stopOpacity=".28"/><stop offset="1" stopColor="#FFC09A" stopOpacity="0"/></radialGradient>
    <linearGradient id="crew-back-orbit" x1="8" y1="90" x2="303" y2="120" gradientUnits="userSpaceOnUse"><stop stopColor="#A5A4ED" stopOpacity="0"/><stop offset=".38" stopColor="#C9B1FF" stopOpacity=".48"/><stop offset=".68" stopColor="#EFC5A2" stopOpacity=".34"/><stop offset="1" stopColor="#A5A4ED" stopOpacity="0"/></linearGradient>
    <linearGradient id="crew-front-orbit" x1="15" y1="178" x2="300" y2="173" gradientUnits="userSpaceOnUse"><stop stopColor="#F6BC94" stopOpacity="0"/><stop offset=".3" stopColor="#F6BC94" stopOpacity=".38"/><stop offset=".67" stopColor="#C7ADF0" stopOpacity=".54"/><stop offset="1" stopColor="#A1A4F7" stopOpacity="0"/></linearGradient>
    <radialGradient id="crew-core-sheen" cx="0" cy="0" r="1" gradientTransform="translate(163 107) rotate(90) scale(83 117)" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF4D6" stopOpacity=".44"/><stop offset="1" stopColor="#FFF4D6" stopOpacity="0"/></radialGradient>
   </defs>
   <ellipse cx="162" cy="126" rx="142" ry="109" fill="url(#crew-core-halo)"/>
   <path d="M21 138C24 62 102 40 185 45c59 4 105 28 117 77" stroke="url(#crew-back-orbit)" strokeWidth="1.1"/>
   <path d="M91 192c-34 0-56-22-56-51 0-28 20-49 48-51 7-34 33-54 64-52 19-27 54-36 82-17 17 11 26 27 30 47 30-3 57 18 61 48 6 36-21 76-67 76-19 9-37 9-55 3-32 13-65 13-91-1-6 1-11 0-16-2Z" fill="url(#crew-core-fill)" stroke="url(#crew-core-rim)" strokeWidth="1.6"/>
   <ellipse cx="155" cy="114" rx="103" ry="76" fill="url(#crew-core-sheen)"/>
   <path d="M89 93c10-24 31-34 54-32m26-16c17-18 39-18 55-6" stroke="#FFF6D9" strokeWidth="3.5" strokeLinecap="round" strokeOpacity=".16"/>
   <path d="M23 145c20 49 83 77 158 74 59-3 103-26 121-73" stroke="url(#crew-front-orbit)" strokeWidth="1.2"/>
   <circle cx="43" cy="89" r="1.8" fill="#EBDAFF" opacity=".52"/><circle cx="274" cy="76" r="2" fill="#FFE3C4" opacity=".55"/><circle cx="263" cy="211" r="1.4" fill="#D3BCFF" opacity=".5"/>
  </svg>
  <svg className="crew-portal-fallback" data-mode={mode} viewBox="0 0 600 400" fill="none" preserveAspectRatio="none">
   {mode==="fortune"?<><ellipse cx="300" cy="200" rx="200" ry="142" transform="rotate(-30 300 200)" stroke="currentColor"/><ellipse cx="300" cy="200" rx="224" ry="172" stroke="currentColor" strokeDasharray="2 7" strokeWidth="3"/><ellipse cx="300" cy="200" rx="244" ry="184" transform="rotate(30 300 200)" stroke="currentColor"/><path d="M300 65 424 157 377 309 223 309 176 157Z" stroke="currentColor" opacity=".5"/><path d="m300 58 4 11 11 4-11 4-4 11-4-11-11-4 11-4ZM414 150l4 11 11 4-11 4-4 11-4-11-11-4 11-4Z" fill="currentColor"/></>:mode==="play"?<><rect x="70" y="72" width="460" height="256" rx="94" transform="rotate(9 300 200)" stroke="currentColor"/><rect x="50" y="56" width="500" height="288" rx="102" transform="rotate(9 300 200)" stroke="currentColor" strokeDasharray="2 7" strokeWidth="3"/><rect x="92" y="88" width="416" height="224" rx="84" transform="rotate(9 300 200)" stroke="currentColor"/></>:mode==="learn"?<><path d="M68 208C3 34 250 106 323 55S589 112 522 224 405 259 330 330 22 328 68 208Z" stroke="currentColor"/><path d="M52 220C-2 22 248 95 328 40S610 112 538 236 412 275 330 347 5 348 52 220Z" stroke="currentColor" strokeDasharray="2 7" strokeWidth="3"/><path d="M84 199C20 55 250 117 317 70S567 113 506 212 399 243 330 314 40 307 84 199Z" stroke="currentColor"/></>:<><path d="M80 200C80 20 520 20 520 200S80 380 80 200Z" stroke="currentColor"/><path d="M60 210C60 -20 540 30 540 210S60 420 60 210Z" stroke="currentColor" strokeDasharray="2 7" strokeWidth="3"/><path d="M40 200C40 55 560 -20 560 200S40 400 40 200Z" stroke="currentColor"/></>}
  </svg>
  <canvas ref={canvasRef}/>
 </div>;
}
