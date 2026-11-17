import {useEffect,type RefObject} from "react";

export function useFriendTextViewport(textMode:boolean,textStage:RefObject<HTMLElement|null>){
 // Android/iOS soft keyboards may resize visualViewport without changing dvh.
 useEffect(()=>{
  if(!textMode)return;
  const viewport=window.visualViewport;
  const sync=()=>{
   const stage=textStage.current;
   if(!stage)return;
   // Measure the real header + shell offset, including the visual viewport shift.
   stage.style.setProperty("--crew-friend-viewport-height",(viewport?.height||window.innerHeight)+"px");
   stage.style.setProperty("--crew-friend-stage-top",Math.max(0,stage.getBoundingClientRect().top-(viewport?.offsetTop||0))+"px");
  };
  sync();viewport?.addEventListener("resize",sync);viewport?.addEventListener("scroll",sync);window.addEventListener("resize",sync);
  return()=>{viewport?.removeEventListener("resize",sync);viewport?.removeEventListener("scroll",sync);window.removeEventListener("resize",sync)};
 },[textMode]);
}

export function useFriendBodyTheme(creatureEmbed:boolean){
 useEffect(()=>{document.body.className="teacher-theme session-page friend-session-page"+(creatureEmbed?" creature-voice-embed-body":"");return()=>{document.body.className=""}},[creatureEmbed]);
}

/** Match browser chrome to the black voice screen, then restore it for text. */
export function useFriendVoiceTheme(enabled:boolean){
 useEffect(()=>{
  if(!enabled)return;
  const meta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const previous=meta?.getAttribute("content");
  if(meta)meta.setAttribute("content","#000");
  return()=>{if(meta){if(previous===null)meta.removeAttribute("content");else meta.setAttribute("content",previous)}};
 },[enabled]);
}
