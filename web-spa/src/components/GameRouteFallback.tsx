import {useEffect,useState} from "react";

// A transient stalled lazy() route never reaches RouteErrorBoundary because no
// rejection is raised. Prefer one full-page SSG navigation for game routes.
const RETRY_KEY="crew_game_pending_recovery_v1";
const RETRY_WINDOW_MS=60_000;
const STALL_MS=12_000;

export function GameRouteFallback({pathname,label}:{pathname:string;label:string}){
 const [showRetry,setShowRetry]=useState(false);
 useEffect(()=>{
  if(!/^\/games(?:\/|$)/.test(pathname))return;
  const timer=window.setTimeout(()=>{
   if(navigator.onLine===false||document.visibilityState==="hidden"){setShowRetry(true);return}
   try{
    const now=Date.now();
    const previous=JSON.parse(sessionStorage.getItem(RETRY_KEY)||"null") as {path?:string;at?:number}|null;
    if(previous?.path===pathname&&typeof previous.at==="number"&&now-previous.at<RETRY_WINDOW_MS){
     setShowRetry(true);
     return;
    }
    sessionStorage.setItem(RETRY_KEY,JSON.stringify({path:pathname,at:now}));
    const url=new URL(window.location.href);
    url.searchParams.set("__crew_reload",now.toString(36));
    window.location.replace(url.toString());
   }catch{setShowRetry(true)}
  },STALL_MS);
  return()=>window.clearTimeout(timer);
 },[pathname]);
 return <div className="spa-loading" role="status" aria-live="polite">
  <span>{label}</span>
  {showRetry&&<div><button type="button" className="btn small" onClick={()=>window.location.reload()}>
   {document.documentElement.lang.startsWith("zh")?"重新載入":"Reload"}
  </button></div>}
 </div>;
}
