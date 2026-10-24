import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {latestMagicSpotlight,type MagicChallenge,type MagicChoice,type MagicPanel} from "./world";
import {MagicChallengeCard,MagicGeneratedCard} from "./MagicInteractionCard";

type Props={
 challenge:MagicChallenge|null;panels:MagicPanel[];zh:boolean;
 onAnswer:(choice:MagicChoice)=>void;onSelect:(panelId:number,choice:MagicChoice)=>void
};
export function MagicMobileInteraction({challenge,panels,zh,onAnswer,onSelect}:Props){
 const [mobile,setMobile]=useState(false);
 const [open,setOpen]=useState(false);
 const dialog=useRef<HTMLDivElement|null>(null);
 const closeButton=useRef<HTMLButtonElement|null>(null);
 const lastShown=useRef<string|null>(null);
 const current=latestMagicSpotlight(challenge,panels);
 const key=current?current.kind+":"+current.id:null;

 useEffect(()=>{
  const query=window.matchMedia("(max-width: 790px)");
  const update=()=>setMobile(query.matches);
  update();
  query.addEventListener("change",update);
  return()=>query.removeEventListener("change",update);
 },[]);
 useEffect(()=>{
  if(!mobile||!key){setOpen(false);return}
  if(key!==lastShown.current){lastShown.current=key;setOpen(true)}
 },[key,mobile]);
 useEffect(()=>{
  if(!open||!mobile)return;
  const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  dialog.current?.focus();
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();setOpen(false);return}
   if(event.key!=="Tab"||!dialog.current)return;
   const focusable=Array.from(dialog.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
   if(!focusable.length)return;
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){
    event.preventDefault();last.focus();
   }else if(!event.shiftKey&&document.activeElement===last){
    event.preventDefault();first.focus();
   }
  };
  document.addEventListener("keydown",onKey);
  return()=>{
   document.removeEventListener("keydown",onKey);
   document.body.style.overflow=previousOverflow;
   if(previousFocus?.isConnected)previousFocus.focus();
  };
 },[mobile,open]);

 if(!mobile||!current)return null;
 const activePanel=current.kind==="panel"?panels.find(panel=>panel.id===current.id):undefined;
 const activeChallenge=current.kind==="challenge"&&challenge?.id===current.id?challenge:null;
 const title=zh?"新魔法已出現":"A new spell has appeared";
 const completed=Boolean(activeChallenge?.selected||activePanel?.selected);
 const answer=(choice:MagicChoice)=>{
  onAnswer(choice);
  // The selected choice becomes disabled immediately. Move focus to a stable
  // control so keyboard/switch users are not left focused on a disabled node.
  requestAnimationFrame(()=>closeButton.current?.focus());
 };
 const select=(panelId:number,choice:MagicChoice)=>{
  onSelect(panelId,choice);
  requestAnimationFrame(()=>closeButton.current?.focus());
 };
 return <>
  <button type="button" className="magic-stage-interaction-entry" aria-haspopup="dialog"
   aria-label={zh?"查看最新魔法互動":"Open latest magic interaction"} onClick={()=>setOpen(true)}>
   <span aria-hidden="true">✦</span> {completed?(zh?"查看魔法結果":"View magic result"):(zh?"探索新魔法":"Explore new magic")}
  </button>
  {open&&typeof document!=="undefined"&&createPortal(
   <div className="magic-mobile-overlay">
    <button className="magic-mobile-backdrop" type="button" onClick={()=>setOpen(false)}
     aria-label={zh?"關閉魔法卡片":"Close magic card"}/>
    <div className="magic-mobile-dialog" role="dialog" aria-modal="true" aria-labelledby="magic-dialog-title"
     ref={dialog} tabIndex={-1}>
     <div className="magic-mobile-dialog-heading">
      <div><span>CREW MAGIC</span><h2 id="magic-dialog-title">{title}</h2></div>
      <button type="button" className="magic-mobile-dialog-close" ref={closeButton} onClick={()=>setOpen(false)}
       aria-label={zh?"關閉並返回魔法島":"Close and return to magic island"}>×</button>
     </div>
     {activeChallenge?<MagicChallengeCard challenge={activeChallenge} zh={zh} onAnswer={answer}/>:null}
     {activePanel?<MagicGeneratedCard panel={activePanel} zh={zh} onSelect={select}/>:null}
    </div>
   </div>,document.body)}
 </>;
}
