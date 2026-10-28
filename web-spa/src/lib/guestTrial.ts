import {isCrewAndroidShell} from "./platform";
// Public endpoint only. The Worker must remain disabled until operator smoke QA.
export const GUEST_TOKEN_ENDPOINT="https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token";
export function guestTrialDiscoveryEnabled():boolean{
 return typeof window!=="undefined"&&!isCrewAndroidShell();
}
export type GuestTrialConfig={enabled:boolean;siteKey?:string;seconds?:number;signinRequired?:boolean};
export type GuestTrialGrant={token:string;model:string;seconds:number;issuedAt:string;expiresAt:string};
export async function fetchGuestTrialConfig():Promise<GuestTrialConfig>{
 if(!guestTrialDiscoveryEnabled())return {enabled:false};
 try{
  const response=await fetch(GUEST_TOKEN_ENDPOINT,{cache:"no-store"});
  if(!response.ok)return {enabled:false};
  const value=await response.json();
  return value?.enabled===true&&typeof value.siteKey==="string"&&value.siteKey
   ?{enabled:true,siteKey:value.siteKey,seconds:Number(value.seconds)||60,signinRequired:value.signinRequired===true}:{enabled:false};
 }catch{return {enabled:false}}
}
