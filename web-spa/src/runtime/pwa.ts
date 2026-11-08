import {isCrewAndroidShell} from "../lib/platform";
import {trackUsageEvent} from "../analytics/usage";

type CrewInstallEvent=Event&{
 prompt:()=>Promise<void>;
 userChoice:Promise<{outcome:"accepted"|"dismissed"}>;
};
let deferred:CrewInstallEvent|null=null;
let installed=false;
let registrationStarted=false;
const listeners=new Set<()=>void>();
const notify=()=>listeners.forEach(listener=>listener());

if(typeof window!=="undefined"){
 window.addEventListener("beforeinstallprompt",event=>{
  // Show our own subtle action only when the browser says installation is available.
  event.preventDefault();
  deferred=event as CrewInstallEvent;
  notify();
 });
 window.addEventListener("appinstalled",()=>{
  deferred=null;
  installed=true;
  trackUsageEvent("pwa_install_success","native");
  notify();
 });
}
export const subscribeCrewInstall=(listener:()=>void)=>{
 listeners.add(listener);
 return()=>{listeners.delete(listener)};
};
export const getCrewInstallPrompt=()=>deferred;
export const emptyCrewInstallPrompt=()=>null;
export function isCrewStandalone(){
 if(typeof window==="undefined")return false;
 return window.matchMedia("(display-mode: standalone)").matches||
  Boolean((navigator as Navigator&{standalone?:boolean}).standalone);
}
export function isCrewIosDevice(){
 if(typeof navigator==="undefined")return false;
 return /iPhone|iPad|iPod/.test(navigator.userAgent)||
  (navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
}
export function isCrewEmbeddedBrowser(){
 if(typeof navigator==="undefined")return false;
 return /FBAN|FBAV|Instagram|Threads|Barcelona|Line\/|MicroMessenger|; wv\)|WebView/i.test(navigator.userAgent);
}
export function isCrewInstalled(){return installed||isCrewStandalone();}
export function isCrewIosSafari(){
 if(typeof navigator==="undefined")return false;
 const ua=navigator.userAgent;
 return /iPhone|iPad|iPod/.test(ua)&&/Safari/.test(ua)&&!/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}
export function canOfferCrewInstall(){
 if(typeof window==="undefined")return false;
 if(window.location.pathname.startsWith("/crew-app/")||isCrewAndroidShell()||isCrewInstalled())return false;
 return window.location.protocol==="https:"||window.location.hostname==="localhost";
}
export async function requestCrewInstall(){
 const prompt=deferred;
 if(!prompt)return false;
 deferred=null;
 notify();
 try{
  await prompt.prompt();
  const choice=await prompt.userChoice;
  return choice.outcome==="accepted";
 }catch{return false;}
}
// Registration/update is separate from showing install UI: an already installed
// standalone PWA must still refresh its worker on every visit.
export function canRegisterCrewPwa(){
 if(typeof window==="undefined")return false;
 if(window.location.pathname.startsWith("/crew-app/")||isCrewAndroidShell())return false;
 return window.location.protocol==="https:"||window.location.hostname==="localhost";
}
export function registerCrewPwa(){
 if(typeof window==="undefined"||!("serviceWorker" in navigator)||!canRegisterCrewPwa()||registrationStarted)return;
 registrationStarted=true;
 const register=()=>{void navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"}).catch(()=>{
  // PWA is optional; failure to register must not block Crew.
 });};
 if(document.readyState==="complete")register();
 else window.addEventListener("load",register,{once:true});
}
