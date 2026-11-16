import {useEffect,useRef,type ReactNode} from "react";
import {createPortal} from "react-dom";

/** Header control stays in the call header, while the sheet itself portals to body. */
export function FriendCallMenuTrigger({active,open,label,onToggle}:{active:boolean;open:boolean;label:string;onToggle:()=>void}){
 return active?<button type="button" className="friend-call-menu-trigger" aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls="friend-call-menu-dialog" onClick={onToggle}>⋯</button>:null;
}

/** Reparent existing options into the dialog only during an active voice call. */
export function FriendCallMenu({inCall,open,onClose,title,closeLabel,children}:{inCall:boolean;open:boolean;onClose:()=>void;title:string;closeLabel:string;children:ReactNode}){
 const panelRef=useRef<HTMLDivElement>(null),closeRef=useRef(onClose);
 closeRef.current=onClose;
 useEffect(()=>{
  if(!inCall||!open)return;
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const priorOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  panelRef.current?.querySelector<HTMLButtonElement>(".friend-call-menu-close")?.focus();
  const onKeyDown=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();closeRef.current();return}
   if(event.key!=="Tab")return;
   const panel=panelRef.current;
   if(!panel)return;
   const focusable=Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])'));
   if(!focusable.length){event.preventDefault();panel.focus();return}
   const first=focusable[0],last=focusable[focusable.length-1];
   if(!panel.contains(document.activeElement)){event.preventDefault();first.focus()}
   else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  };
  document.addEventListener("keydown",onKeyDown);
  return()=>{document.removeEventListener("keydown",onKeyDown);document.body.style.overflow=priorOverflow;if(previous?.isConnected)previous.focus()};
 },[inCall,open]);
 if(!inCall)return <>{children}</>;
 if(!open)return null;
 return createPortal(<div className="friend-call-menu-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)closeRef.current()}}>
  <div id="friend-call-menu-dialog" ref={panelRef} className="friend-call-menu-panel" role="dialog" aria-modal="true" aria-labelledby="friend-call-menu-title" tabIndex={-1}>
   <div className="friend-call-menu-heading"><h2 id="friend-call-menu-title">{title}</h2><button type="button" className="friend-call-menu-close" aria-label={closeLabel} onClick={()=>closeRef.current()}>×</button></div>
   <div className="friend-call-menu-scroll">{children}</div>
  </div>
 </div>,document.body);
}
