import {flushSync} from "react-dom";

/** Progressive enhancement: preserve one smooth visual surface when React replaces a view. */
export function transitionUI(update:()=>void){
 const doc=document as Document&{startViewTransition?:(callback:()=>void)=>unknown};
 if(typeof doc.startViewTransition!=="function"||window.matchMedia("(prefers-reduced-motion: reduce)").matches){update();return;}
 doc.startViewTransition(()=>flushSync(update));
}
