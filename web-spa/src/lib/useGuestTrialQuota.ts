import {useSyncExternalStore} from "react";
import {fetchGuestTrialConfig,guestTrialDiscoveryEnabled,invalidateGuestTrialConfig} from "./guestTrial";
export type GuestTrialQuota={enabled:boolean;remaining:number|null;limit:number|null;seconds:number|null;signinRequired:boolean;member:boolean;memberTextLimit:number|null;resolved:boolean};
const EMPTY:GuestTrialQuota={enabled:false,remaining:null,limit:null,seconds:null,signinRequired:false,member:false,memberTextLimit:null,resolved:false};

// The homepage and portal share one request, snapshot and trial-used listener.
// A skipped (SSR or BYOK) subscriber never starts discovery or session requests.
let status:GuestTrialQuota=EMPTY;
let pending:Promise<GuestTrialQuota>|null=null;
let revision=0;
let midnightTimer:number|null=null;
const subscribers=new Set<()=>void>();
const snapshot=()=>status;
const emptySnapshot=()=>EMPTY;
const noSubscribe=()=>()=>{};

/** Never invent quota counts: a null means the API cannot verify the visitor's allowance. */
async function loadQuota():Promise<GuestTrialQuota>{
 const config=await fetchGuestTrialConfig();
 if(!config.enabled)return {...EMPTY,resolved:true};
 let trial=config.trial,member=false,memberTextLimit:number|null=null;
 if(config.memberMetering||config.signinRequired){
  try{
   const response=await fetch("/api/auth/session",{credentials:"same-origin",cache:"no-store"});
   if(response.ok){
    const data=await response.json();
    if(data?.user?.id){trial=data.trial;member=true;if(config.dailyQuota&&data.textTrial?.limit===50)memberTextLimit=data.textTrial.limit}
    else if(config.signinRequired)trial=undefined;
   }else if(config.signinRequired)trial=undefined;
  }catch{if(config.signinRequired)trial=undefined}
 }
 const valid=Number.isInteger(trial?.used)&&Number.isInteger(trial?.limit)&&
  trial!.limit>0&&trial!.used>=0&&trial!.used<=trial!.limit;
 return {enabled:true,remaining:valid?trial!.limit-trial!.used:null,
  limit:valid?trial!.limit:null,seconds:typeof config.seconds==="number"&&config.seconds>0?config.seconds:null,signinRequired:Boolean(config.signinRequired),member,memberTextLimit,resolved:true};
}
function refresh(force=false){
 if(!guestTrialDiscoveryEnabled())return;
 if(pending&&!force)return;
 const requestId=++revision;
 const request=loadQuota().catch(()=>({...EMPTY,resolved:true}));
 pending=request;
 void request.then(next=>{
  if(requestId!==revision||!subscribers.size)return;
  status=next;
  for(const notify of subscribers)notify();
 }).finally(()=>{if(pending===request)pending=null});
}
function scheduleDailyRefresh(){
 if(midnightTimer!==null)window.clearTimeout(midnightTimer);
 const now=Date.now(),dayMs=86400000,offsetMs=8*3600000;
 const next=Math.floor((now+offsetMs)/dayMs+1)*dayMs-offsetMs;
 midnightTimer=window.setTimeout(()=>{midnightTimer=null;refresh(true);if(subscribers.size)scheduleDailyRefresh()},next-now+1000);
}
function onVisible(){if(document.visibilityState==="visible")refresh(true)}
function onTrialUsed(){
 invalidateGuestTrialConfig();
 refresh(true);
}
function subscribe(notify:()=>void){
 const first=subscribers.size===0;
 subscribers.add(notify);
 if(first){
  window.addEventListener("crew:guest-trial-used",onTrialUsed);
  document.addEventListener("visibilitychange",onVisible);
  scheduleDailyRefresh();refresh();
 }
 return ()=>{
  subscribers.delete(notify);
  if(!subscribers.size){
   window.removeEventListener("crew:guest-trial-used",onTrialUsed);
   document.removeEventListener("visibilitychange",onVisible);
   if(midnightTimer!==null){window.clearTimeout(midnightTimer);midnightTimer=null}
   // Preserve an in-flight request across React StrictMode effect remounts.
   status=EMPTY;
  }
 };
}
export function useGuestTrialQuota(skip:boolean):GuestTrialQuota{
 return useSyncExternalStore(skip?noSubscribe:subscribe,skip?emptySnapshot:snapshot,emptySnapshot);
}
