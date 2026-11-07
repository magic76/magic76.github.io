import {useEffect,useRef} from "react";
import type {MouseEvent} from "react";
import {useTranslation} from "react-i18next";
import type {FortuneReading} from "./types";
import {FortuneIdentityCard} from "./FortuneIdentityCard";

/** Native dialog keeps keyboard focus within the reveal and Escape dismisses it. */
export function FortuneIdentityRevealDialog({reading,open,onClose}:{reading:FortuneReading;open:boolean;onClose:()=>void}){
 const dialogRef=useRef<HTMLDialogElement|null>(null);
 const {i18n}=useTranslation("fortune");
 const zh=/^zh(?:-|$)/i.test(i18n.language);
 useEffect(()=>{
  const dialog=dialogRef.current;
  if(!dialog||!open)return;
  const previouslyFocused=document.activeElement;
  const previousBodyOverflow=document.body.style.overflow;
  if(!dialog.open)dialog.showModal();
  document.body.style.overflow="hidden";
  dialog.querySelector<HTMLButtonElement>(".fortune-identity-reveal-close")?.focus();
  return ()=>{
   if(dialog.open)dialog.close();
   document.body.style.overflow=previousBodyOverflow;
   const restore=previouslyFocused instanceof HTMLElement&&previouslyFocused.isConnected
    ?previouslyFocused
    :document.querySelector<HTMLButtonElement>(".fortune-identity-entry-button");
   restore?.focus();
  };
 },[open]);
 const handleBackdrop=(event:MouseEvent<HTMLDialogElement>)=>{
  if(event.target!==event.currentTarget)return;
  const bounds=event.currentTarget.getBoundingClientRect();
  if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)onClose();
 };
 return <dialog ref={dialogRef} className="fortune-identity-reveal-dialog"
  aria-label={zh?"我的命格身份":"My fortune archetype"}
  onCancel={event=>{event.preventDefault();onClose()}}
  onClose={onClose}
  onClick={handleBackdrop}>
  <div className="fortune-identity-reveal-header">
   <span>{zh?"✦ 你的命格揭曉":"✦ Your archetype revealed"}</span>
   <button type="button" className="fortune-identity-reveal-close" onClick={onClose}
    aria-label={zh?"關閉命格身份視窗":"Close fortune archetype"}>×</button>
  </div>
  <div className="fortune-identity-reveal-body"><FortuneIdentityCard reading={reading} onContinue={onClose}/></div>
 </dialog>;
}
