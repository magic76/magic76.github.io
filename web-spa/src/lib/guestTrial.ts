import {isCrewAndroidShell} from "./platform";
// Public endpoint only. The Worker must remain disabled until operator smoke QA.
// Move only the new public website to the verified custom Worker domain.
// Both Koolo host spellings use p.koolo.app; www is redirected to apex before app mount.
// Keep legacy 3sssi.com, preview deployments and existing integrations unchanged.
export const GUEST_TOKEN_ENDPOINT=typeof window!=="undefined"&&
 ["https://koolo.app","https://www.koolo.app"].includes(window.location?.origin)
 ?"https://p.koolo.app/api/guest/token"
 :"https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token";
export function guestTrialDiscoveryEnabled():boolean{
 return typeof window!=="undefined"&&(!isCrewAndroidShell()||["https://koolo.app","https://www.koolo.app"].includes(window.location.origin));
}
export type GuestTrialConfig={enabled:boolean;siteKey?:string;seconds?:number;signinRequired?:boolean;memberMetering?:boolean;trial?:{used:number;limit:number}};
export function invalidateGuestTrialConfig(){cachedConfig=null;cachedAt=0}
export type GuestTrialGrant={token:string;model:string;seconds:number;issuedAt:string;expiresAt:string};
// Share one in-flight GET across the home guide and Live entry. No token, proof,
 // account data or POST response is cached. Short TTL keeps operator disable responsive.
let pendingConfig:Promise<GuestTrialConfig>|null=null;
let cachedConfig:GuestTrialConfig|null=null;
let cachedAt=0;
export async function fetchGuestTrialConfig():Promise<GuestTrialConfig>{
 if(!guestTrialDiscoveryEnabled())return {enabled:false};
 if(cachedConfig&&Date.now()-cachedAt<(cachedConfig.enabled?30_000:5_000))return cachedConfig;
 if(pendingConfig)return pendingConfig;
 pendingConfig=(async():Promise<GuestTrialConfig>=>{
 try{
  const response=await fetch(GUEST_TOKEN_ENDPOINT,{cache:"no-store"});
  if(!response.ok)return {enabled:false};
  const value=await response.json();
  // Fail closed during separate Worker/Pages rollout: never burn a 60s trial claim
  // when the updated UI promises 300s. BYOK sessions are unaffected.
  return value?.enabled===true&&typeof value.siteKey==="string"&&value.siteKey&&Number(value.seconds)===300
   ?{enabled:true,siteKey:value.siteKey,seconds:300,signinRequired:value.signinRequired===true,
     memberMetering:value.memberMetering===true||value.signinRequired===true,
      ...(Number.isInteger(value.trial?.used)&&Number.isInteger(value.trial?.limit)&&value.trial.limit>0&&value.trial.used>=0&&value.trial.used<=value.trial.limit
       ?{trial:{used:value.trial.used,limit:value.trial.limit}}:{})}:{enabled:false};
 }catch{return {enabled:false}}
 })().then(config=>{cachedConfig=config;cachedAt=Date.now();return config}).finally(()=>{pendingConfig=null});
 return pendingConfig;
}
