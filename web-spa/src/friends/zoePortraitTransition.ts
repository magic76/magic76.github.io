import type {MouseEvent} from "react";

type PortraitSnapshot={
 href:string;
 src:string;
 bounds:DOMRect;
 position:string;
 radius:string;
 expires:number;
};

const reducedMotion="(prefers-reduced-motion: reduce)";
let pending:PortraitSnapshot|undefined;

/** Snapshot the clicked portrait while the Link keeps control of navigation. */
export function captureZoePortrait(event:MouseEvent<HTMLAnchorElement>,image:HTMLImageElement|null|undefined){
 const link=event.currentTarget;
 if(event.defaultPrevented||event.button!==0||event.metaKey||event.altKey||event.ctrlKey||event.shiftKey||
  (link.target&&link.target!=="_self")||matchMedia(reducedMotion).matches||!image?.complete||!image.naturalWidth)return;

 const bounds=image.getBoundingClientRect();
 if(!bounds.width||!bounds.height)return;
 const style=getComputedStyle(image);
 pending={href:link.href,src:image.currentSrc||image.src,bounds,position:style.objectPosition,
  radius:style.borderRadius==="0px"?getComputedStyle(link).borderRadius:style.borderRadius,
  expires:performance.now()+2500};
}

/** Wait for the lazy chat route to commit and apply its body theme. */
export function playZoePortraitTransition(avatar:HTMLDivElement|null){
 if(!avatar||pending?.href!==window.location.href)return;
 let animation:Animation|undefined;
 const motion=matchMedia(reducedMotion);
 const cancel=()=>animation?.cancel();
 const frame=requestAnimationFrame(()=>{
  const source=pending;
  if(source?.href!==window.location.href)return;
  pending=undefined;
  const target=avatar.querySelector("img");
  if(!target||typeof target.animate!=="function"||motion.matches||source.expires<performance.now())return;

  const bounds=target.getBoundingClientRect();
  if(!bounds.width||!bounds.height)return;
  const style=getComputedStyle(target);
  const photo=new Image();
  photo.src=source.src;
  photo.alt="";
  photo.setAttribute("aria-hidden","true");
  Object.assign(photo.style,{
   position:"fixed",pointerEvents:"none",zIndex:"1000",objectFit:"cover",
   top:source.bounds.top+"px",left:source.bounds.left+"px",
  });
  document.body.append(photo);
  // This animation hides only the duplicate portrait while the overlay is in flight.
  const hide=target.animate([{opacity:0},{opacity:0}],{duration:240});
  animation=photo.animate([
   {width:source.bounds.width+"px",height:source.bounds.height+"px",borderRadius:source.radius,
    objectPosition:source.position,transform:"none"},
   {width:bounds.width+"px",height:bounds.height+"px",borderRadius:style.borderRadius,
    objectPosition:style.objectPosition,transform:`translate(${bounds.left-source.bounds.left}px,${bounds.top-source.bounds.top}px)`},
  ],{duration:240,easing:"cubic-bezier(.2,.75,.3,1)"});

  const cleanup=()=>{
   hide.cancel();
   photo.remove();
   motion.removeEventListener("change",cancel);
   window.removeEventListener("resize",cancel);
  };
  motion.addEventListener("change",cancel);
  window.addEventListener("resize",cancel);
  void animation.finished.then(cleanup,cleanup);
 });
 return()=>{cancelAnimationFrame(frame);cancel()};
}
