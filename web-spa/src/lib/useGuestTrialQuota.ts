import {useEffect,useState} from "react";
import {fetchGuestTrialConfig,guestTrialDiscoveryEnabled,invalidateGuestTrialConfig} from "./guestTrial";
export type GuestTrialQuota={enabled:boolean;remaining:number|null;limit:number|null;signinRequired:boolean};
const EMPTY:GuestTrialQuota={enabled:false,remaining:null,limit:null,signinRequired:false};
/** Never invent quota counts: a null means the API cannot verify the visitor's allowance. */
export function useGuestTrialQuota():GuestTrialQuota{
 const [status,setStatus]=useState<GuestTrialQuota>(EMPTY);
 useEffect(()=>{
  if(!guestTrialDiscoveryEnabled())return;
  let alive=true;
  const refresh=async()=>{
   const config=await fetchGuestTrialConfig();
   if(!alive)return;
   if(!config.enabled){setStatus(EMPTY);return}
   let trial=config.trial;
   if(config.memberMetering||config.signinRequired){
    try{
     const response=await fetch("/api/auth/session",{credentials:"same-origin",cache:"no-store"});
     if(response.ok){
      const data=await response.json();
      if(data?.user?.id)trial=data.trial;
      else if(config.signinRequired)trial=undefined;
     }else if(config.signinRequired)trial=undefined;
    }catch{if(config.signinRequired)trial=undefined}
   }
   const valid=Number.isInteger(trial?.used)&&Number.isInteger(trial?.limit)&&
    trial!.limit>0&&trial!.used>=0&&trial!.used<=trial!.limit;
   setStatus({enabled:true,remaining:valid?trial!.limit-trial!.used:null,
    limit:valid?trial!.limit:null,signinRequired:Boolean(config.signinRequired)});
  };
  const onUsed=()=>{invalidateGuestTrialConfig();void refresh()};
  void refresh();
  window.addEventListener("crew:guest-trial-used",onUsed);
  return()=>{alive=false;window.removeEventListener("crew:guest-trial-used",onUsed)};
 },[]);
 return status;
}
