import {useCallback,useEffect,useRef,useState} from 'react';
import type {RootState,Frameloop} from '@react-three/fiber';
export function useMagicFrameloop(reducedMotion:boolean){
 const [pageVisible,setPageVisible]=useState(()=>typeof document==='undefined'||!document.hidden);
 const [inView,setInView]=useState(true);
 const observer=useRef<IntersectionObserver|null>(null);
 const element=useRef<HTMLCanvasElement|null>(null);
 const invalidate=useRef<(()=>void)|null>(null);
 const attach=useCallback((canvas:HTMLCanvasElement|null)=>{
  observer.current?.disconnect();observer.current=null;element.current=canvas;
  if(!canvas||typeof IntersectionObserver==='undefined'){setInView(true);return;}
  const instance=new IntersectionObserver(entries=>setInView(Boolean(entries[0]?.isIntersecting)),{rootMargin:'96px 0px',threshold:0});
  observer.current=instance;instance.observe(canvas);
 },[]);
 useEffect(()=>{
  const sync=()=>setPageVisible(!document.hidden);
  sync();document.addEventListener('visibilitychange',sync);
  return()=>document.removeEventListener('visibilitychange',sync);
 },[]);
 useEffect(()=>()=>observer.current?.disconnect(),[]);
 const frameloop:Frameloop=(!pageVisible||!inView)?'never':reducedMotion?'demand':'always';
 const previous=useRef(frameloop);
 useEffect(()=>{
  if(previous.current==='never'&&frameloop!=='never')invalidate.current?.();
  previous.current=frameloop;
 },[frameloop]);
 const onCreated=useCallback((state:RootState)=>{
  invalidate.current=state.invalidate;
  attach(state.gl.domElement);
 },[attach]);
 return {frameloop,onCreated};
}
