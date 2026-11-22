import {useEffect,useState} from "react";

type DeviceMotionHints=Navigator&{deviceMemory?:number;connection?:{saveData?:boolean}};

/** Phone-only enhancement. The normal homepage remains fully usable when motion is off. */
export function useHomeAmbientMotion(enabled:boolean){
 const [allowed,setAllowed]=useState(false);
 useEffect(()=>{
  if(!enabled){setAllowed(false);return;}
  const mobile=window.matchMedia("(max-width:767px)");
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  const refresh=()=>{
   const device=navigator as DeviceMotionHints;
   const lowMemory=typeof device.deviceMemory==="number"&&device.deviceMemory<=2;
   const lowCores=typeof device.hardwareConcurrency==="number"&&device.hardwareConcurrency<=2;
   setAllowed(mobile.matches&&!reduced.matches&&!device.connection?.saveData&&!lowMemory&&!lowCores&&document.visibilityState==="visible");
  };
  refresh();
  mobile.addEventListener("change",refresh);
  reduced.addEventListener("change",refresh);
  document.addEventListener("visibilitychange",refresh);
  return()=>{
   mobile.removeEventListener("change",refresh);
   reduced.removeEventListener("change",refresh);
   document.removeEventListener("visibilitychange",refresh);
  };
 },[enabled]);
 return allowed;
}
