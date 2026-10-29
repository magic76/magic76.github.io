import {isCrewAndroidShell} from "./platform";
// Public endpoint only. The Worker must remain disabled until operator smoke QA.
export const GUEST_TOKEN_ENDPOINT="https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token";
export function guestTrialDiscoveryEnabled():boolean{
 return typeof window!=="undefined"&&!isCrewAndroidShell();
}
export type GuestTrialConfig={enabled:boolean;siteKey?:string;seconds?:number;signinRequired?:boolean;memberMetering?:boolean};
export type GuestTrialGrant={token:string;model:string;seconds:number;issuedAt:string;expiresAt:string};
export async function fetchGuestTrialConfig():Promise<GuestTrialConfig>{
 if(!guestTrialDiscoveryEnabled())return {enabled:false};
 try{
  const response=await fetch(GUEST_TOKEN_ENDPOINT,{cache:"no-store"});
  if(!response.ok)return {enabled:false};
  const value=await response.json();
  // Fail closed during separate Worker/Pages rollout: never burn a 60s trial claim
  // when the updated UI promises 180s. BYOK sessions are unaffected.
  return value?.enabled===true&&typeof value.siteKey==="string"&&value.siteKey&&Number(value.seconds)===180
   ?{enabled:true,siteKey:value.siteKey,seconds:180,signinRequired:value.signinRequired===true,
     memberMetering:value.memberMetering===true||value.signinRequired===true}:{enabled:false};
 }catch{return {enabled:false}}
}
