import {useEffect,useId,useRef,useState,type ReactNode} from "react";
import {createPortal} from "react-dom";
import "./gamePanel.css";

type GamePanelProps={
 title:string;
 label:string;
 children:ReactNode;
 variant?:"drawer"|"modal";
 className?:string;
};

/** Shared, non-destructive game settings and information surface.
 * Content stays separate from voice/session components so opening a panel
 * never tears down a Live connection or restarts a game.
 */
export function GamePanel({title,label,children,variant="drawer",className=""}:GamePanelProps){
 const [open,setOpen]=useState(false);
 const titleId=useId();
 const panelId=useId();
 const triggerRef=useRef<HTMLButtonElement>(null);
 const closeRef=useRef<HTMLButtonElement>(null);
 const dialogRef=useRef<HTMLElement>(null);
 const backdropRef=useRef<HTMLDivElement>(null);
 const backdropPointerRef=useRef(false);
 useEffect(()=>{
  if(!open)return;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  // The dialog is portalled to body. Make every sibling inert while it is open
  // so touch exploration and virtual cursors cannot wander into the game below.
  const backdrop=backdropRef.current;
  const inerted=backdrop?Array.from(document.body.children).filter((element):element is HTMLElement=>element instanceof HTMLElement&&element!==backdrop).map(element=>({element,wasInert:element.hasAttribute("inert")})):[];
  inerted.forEach(({element})=>element.setAttribute("inert",""));
  closeRef.current?.focus();
  const onKeyDown=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();setOpen(false);return;}
   if(event.key!=="Tab"||!dialogRef.current)return;
   const focusable=Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
    'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
   )).filter(element=>element.getClientRects().length>0);
   if(!focusable.length){event.preventDefault();return;}
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&(document.activeElement===first||!dialogRef.current.contains(document.activeElement))){
    event.preventDefault();last.focus();
   }else if(!event.shiftKey&&(document.activeElement===last||!dialogRef.current.contains(document.activeElement))){
    event.preventDefault();first.focus();
   }
  };
  document.addEventListener("keydown",onKeyDown);
  return ()=>{
   document.removeEventListener("keydown",onKeyDown);
   inerted.forEach(({element,wasInert})=>{if(!wasInert)element.removeAttribute("inert")});
   document.body.style.overflow=previousOverflow;
   triggerRef.current?.focus();
  };
 },[open]);
 const backdropPointer=(event:React.PointerEvent<HTMLDivElement>)=>{backdropPointerRef.current=event.target===event.currentTarget};
 const cancelBackdropPointer=()=>{backdropPointerRef.current=false};
 const closeFromBackdrop=(event:React.PointerEvent<HTMLDivElement>)=>{
  if(backdropPointerRef.current&&event.target===event.currentTarget)setOpen(false);
  backdropPointerRef.current=false;
 };
 return <>
  <button ref={triggerRef} type="button" className="crew-game-panel-trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls={open?panelId:undefined} onClick={()=>setOpen(true)}>{label}</button>
  {open&&typeof document!=="undefined"?createPortal(
   <div ref={backdropRef} className={"crew-game-panel-backdrop is-"+variant} onPointerDown={backdropPointer} onPointerUp={closeFromBackdrop} onPointerCancel={cancelBackdropPointer}>
    <section ref={dialogRef} id={panelId} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={"crew-game-panel is-"+variant+" "+className}>
     <header className="crew-game-panel-header">
      <h2 id={titleId}>{title}</h2>
      <button ref={closeRef} type="button" className="crew-game-panel-close" aria-label="Close / 關閉" onClick={()=>setOpen(false)}>×</button>
     </header>
     <div className="crew-game-panel-content">{children}</div>
    </section>
   </div>,document.body):null}
 </>;
}
