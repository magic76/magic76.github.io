import {useCallback,useEffect,useRef,useState} from "react";

type ChallengeApi={
 render:(host:HTMLElement,options:{sitekey:string;action:string;execution:"execute";appearance:"interaction-only";size:"flexible";callback:(token:string)=>void;"expired-callback":()=>void;"error-callback":()=>void})=>string;
 execute:(id:string)=>void;
 remove:(id:string)=>void;
};
const turnstile=()=> (window as Window&{turnstile?:ChallengeApi}).turnstile;
const TIMEOUT_MS=40000;
// Single-use, same-tab handoff. Never persist, log or include a challenge in the URL.
const HANDOFF_TTL_MS=240000;
let offered:{token:string;expiresAt:number}|null=null;
let offeredTimeout:ReturnType<typeof setTimeout>|null=null;
let micFallbackNotice=false;
let lastChallengeWasHandoff=false;
export function clearGuestChallengeHandoff(){
 offered=null;lastChallengeWasHandoff=false;micFallbackNotice=false;
 if(offeredTimeout!==null){clearTimeout(offeredTimeout);offeredTimeout=null}
}
export function offerGuestChallengeToken(token:string){
 clearGuestChallengeHandoff();
 if(!token)return;
 offered={token,expiresAt:Date.now()+HANDOFF_TTL_MS};
 offeredTimeout=setTimeout(()=>{offered=null;offeredTimeout=null},HANDOFF_TTL_MS);
 micFallbackNotice=true;
}
export function takeMicFallbackNotice(){const notice=micFallbackNotice;micFallbackNotice=false;return notice}
export function hasGuestChallengeHandoff(){return Boolean(offered&&offered.expiresAt>Date.now())}
export function takeUsedGuestHandoff(){const used=lastChallengeWasHandoff;lastChallengeWasHandoff=false;return used}
function takeGuestChallengeToken(){
 const token=offered&&offered.expiresAt>Date.now()?offered.token:"";
 offered=null;
 if(offeredTimeout!==null){clearTimeout(offeredTimeout);offeredTimeout=null}
 return token;
}

/** No script, host or token exists until a guest actually attempts to send. */
export function useGuestTextChallenge(guestMode:boolean,phase:string,siteKey:string){
 const [requested,setRequested]=useState(false);
 const host=useRef<HTMLDivElement|null>(null);
 const widget=useRef<string|null>(null);
 const pending=useRef<{resolve:(token:string)=>void;reject:(error:Error)=>void}|null>(null);
 const timeout=useRef<ReturnType<typeof setTimeout>|null>(null);
 const mounted=useRef(true);
 const settle=useCallback((error:Error|null,token="")=>{
  const waiter=pending.current;
  if(!waiter)return;
  pending.current=null;
  if(timeout.current!==null){clearTimeout(timeout.current);timeout.current=null}
  if(mounted.current)setRequested(false);
  if(error)waiter.reject(error);else waiter.resolve(token);
 },[]);
 useEffect(()=>{
  mounted.current=true;
  return()=>{
   mounted.current=false;
   settle(Error("UNMOUNTED"));
  };
 },[settle]);
 useEffect(()=>{
  if(!guestMode||["unavailable","error","exhausted","paused"].includes(phase))
   settle(Error("CHALLENGE_CANCELLED"));
 },[guestMode,phase,settle]);
 useEffect(()=>{
  if(!requested||!guestMode||phase!=="ready"||!siteKey)return;
  let cancelled=false;
  const render=()=>{
   if(cancelled||!host.current||widget.current!==null)return;
   const api=turnstile();if(!api)return;
   try{
    widget.current=api.render(host.current,{
     sitekey:siteKey,action:"crew-guest-trial",execution:"execute",appearance:"interaction-only",size:"flexible",
     callback:token=>{if(!cancelled)settle(null,token)},
     "expired-callback":()=>{if(!cancelled)settle(Error("TURNSTILE_EXPIRED"))},
     "error-callback":()=>{if(!cancelled)settle(Error("TURNSTILE_ERROR"))}
    });
    api.execute(widget.current);
   }catch{settle(Error("TURNSTILE_ERROR"))}
  };
  let script=document.getElementById("crew-guest-turnstile");
  const created=!script;
  if(!script){
   const element=document.createElement("script");element.id="crew-guest-turnstile";
   element.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
   element.async=true;element.defer=true;script=element;
  }
  const scriptError=()=>{
   if(cancelled)return;
   if(created)script?.remove(); // Permit a new download on the next Send.
   settle(Error("TURNSTILE_LOAD_FAILED"));
  };
  if(turnstile())render();else script.addEventListener("load",render);
  script.addEventListener("error",scriptError);
  if(created)document.head.appendChild(script);
  return()=>{
   cancelled=true;
   script?.removeEventListener("load",render);
   script?.removeEventListener("error",scriptError);
   if(created&&!turnstile())script?.remove();
   if(widget.current!==null){try{turnstile()?.remove(widget.current)}catch{}widget.current=null}
  };
 },[requested,guestMode,phase,siteKey,settle]);
 const waitForChallenge=()=>{
  if(pending.current)return Promise.reject(Error("TURNSTILE_BUSY"));
  const handedOff=takeGuestChallengeToken();
  lastChallengeWasHandoff=Boolean(handedOff);
  if(handedOff)return Promise.resolve(handedOff);
  return new Promise<string>((resolve,reject)=>{
   pending.current={resolve,reject};
   timeout.current=setTimeout(()=>settle(Error("TURNSTILE_TIMEOUT")),TIMEOUT_MS);
   setRequested(true);
  });
 };
 return {host,requested,waitForChallenge};
}
