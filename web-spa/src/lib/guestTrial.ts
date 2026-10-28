import {isCrewAndroidShell} from "./platform";
// Public endpoint only. The Worker must remain disabled until operator smoke QA.
export const GUEST_TOKEN_ENDPOINT="https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token";
// Private QA requires a separate secret entered by a tester, never persisted.
export const GUEST_QA_ENDPOINT="https://crew-guest-trial.shanliyoung.workers.dev/api/guest/qa";
export function guestTrialDiscoveryEnabled():boolean{
 return import.meta.env.VITE_CREW_GUEST_TRIAL_ENABLED==="1"&&typeof window!=="undefined"&&!isCrewAndroidShell();
}
export type GuestTrialConfig={enabled:boolean;siteKey?:string;seconds?:number};
export async function fetchGuestTrialConfig():Promise<GuestTrialConfig>{
 if(!guestTrialDiscoveryEnabled())return {enabled:false};
 try{
  const response=await fetch(GUEST_TOKEN_ENDPOINT,{cache:"no-store"});
  if(!response.ok)return {enabled:false};
  const value=await response.json();
  return value?.enabled===true&&typeof value.siteKey==="string"&&value.siteKey
   ?{enabled:true,siteKey:value.siteKey,seconds:Number(value.seconds)||180}:{enabled:false};
 }catch{return {enabled:false}}
}
