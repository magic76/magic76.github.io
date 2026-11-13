import {useEffect,type RefObject} from "react";

// Only a focused mobile composer may enter keyboard layout. A short desktop
// window, a hardware keyboard, or a collapsed browser toolbar is not enough.
const SHORT_VIEWPORT=560;
const KEYBOARD_DROP=110;
const VERY_SHORT_VIEWPORT=480;

export function useTextChatKeyboard(chatRef:RefObject<HTMLElement|null>){
 useEffect(()=>{
  const chat=chatRef.current;
  const stage=chat?.closest<HTMLElement>(".live-stage");
  if(!chat||!stage)return;
  const viewport=window.visualViewport;
  const body=document.body;
  let fullHeight=Math.max(viewport?.height||window.innerHeight,window.innerHeight);
  let compact=false;
  const clear=()=>{
   stage.classList.remove("crew-text-keyboard-open");
   for(const name of ["--crew-text-keyboard-visible-height","--crew-text-keyboard-visible-top","--crew-text-keyboard-header-height"])
    body.style.removeProperty(name);
  };
  const sync=()=>{
   const height=Math.min(viewport?.height||window.innerHeight,window.innerHeight);
   const focused=chat.contains(document.activeElement)&&
    Boolean(document.activeElement?.closest(".crew-text-chat-form input"));
   if(!focused)fullHeight=height;
   const mobile=window.matchMedia("(max-width:640px)").matches;
   const open=mobile&&focused&&height<SHORT_VIEWPORT&&
    (fullHeight-height>KEYBOARD_DROP||height<=VERY_SHORT_VIEWPORT);
   if(open){
    const header=document.querySelector<HTMLElement>(".app-header");
    body.style.setProperty("--crew-text-keyboard-visible-height",height+"px");
    body.style.setProperty("--crew-text-keyboard-visible-top",(viewport?.offsetTop||0)+"px");
    body.style.setProperty("--crew-text-keyboard-header-height",(header?.getBoundingClientRect().height||0)+"px");
    stage.classList.add("crew-text-keyboard-open");
   }else clear();
   if(compact!==open){
    compact=open;
    chat.dispatchEvent(new Event("crew:text-keyboard-change"));
   }
  };
  // focusout is deferred so focus transfers within the composer are not mistaken
  // for keyboard closure; viewport resize also detects an Android back dismissal.
  let blurFrame=0;
  const onBlur=()=>{cancelAnimationFrame(blurFrame);blurFrame=requestAnimationFrame(sync)};
  chat.addEventListener("focusin",sync);
  chat.addEventListener("focusout",onBlur);
  viewport?.addEventListener("resize",sync);
  viewport?.addEventListener("scroll",sync);
  window.addEventListener("resize",sync);
  window.addEventListener("orientationchange",sync);
  sync();
  return()=>{
   chat.removeEventListener("focusin",sync);
   chat.removeEventListener("focusout",onBlur);
   viewport?.removeEventListener("resize",sync);
   viewport?.removeEventListener("scroll",sync);
   window.removeEventListener("resize",sync);
   window.removeEventListener("orientationchange",sync);
   cancelAnimationFrame(blurFrame);
   clear();
  };
 },[chatRef]);
}
