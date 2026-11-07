import {isCrewAndroidShell} from "../lib/platform";

type CrewInstallEvent=Event&{
 prompt:()=>Promise<void>;
 userChoice:Promise<{outcome:"accepted"|"dismissed"}>;
};
let deferred:CrewInstallEvent|null=null;
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
export function isCrewIosSafari(){
 if(typeof navigator==="undefined")return false;
 const ua=navigator.userAgent;
 return /iPhone|iPad|iPod/.test(ua)&&/Safari/.test(ua)&&!/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}
export function canOfferCrewInstall(){
 if(typeof window==="undefined")return false;
 if(window.location.pathname.startsWith("/crew-app/")||isCrewAndroidShell()||isCrewStandalone())return false;
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
export function registerCrewPwa(){
 if(typeof window==="undefined"||!("serviceWorker" in navigator)||!canOfferCrewInstall())return;
 const register=()=>{void navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"}).catch(()=>{
  // PWA is optional; failure to register must not block Crew.
 });};
 if(document.readyState==="complete")register();
 else window.addEventListener("load",register,{once:true});
}
