import {useEffect,type RefObject} from "react";

// On phones the stage is sized from the viewport, but longer locales wrap the
// page heading and push it down. Publish the stage's document offset so CSS can
// keep the quick row and story bar above the fixed bottom navigation.
export function useStageFit(ref:RefObject<HTMLElement|null>,dependency:unknown){
 useEffect(()=>{
  const stage=ref.current;
  if(!stage)return;
  const measure=()=>stage.style.setProperty("--magic-stage-top",Math.round(stage.getBoundingClientRect().top+window.scrollY)+"px");
  measure();
  const header=stage.closest(".magic-page")?.querySelector(".magic-header");
  const observer=typeof ResizeObserver==="undefined"?null:new ResizeObserver(measure);
  if(header)observer?.observe(header);
  window.addEventListener("resize",measure);
  return()=>{observer?.disconnect();window.removeEventListener("resize",measure);};
 },[ref,dependency]);
}
