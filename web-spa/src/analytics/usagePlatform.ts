/** Privacy-safe launch surface, not proof of a unique person or verified install. */
import {isCrewAndroidShell} from "../lib/platform";
export type UsagePlatform="web"|"pwa"|"android_shell";
export function usagePlatform():UsagePlatform{
 if(typeof window==="undefined")return "web";
 if(isCrewAndroidShell())return "android_shell";
 if(window.matchMedia?.("(display-mode: standalone)").matches||
    (navigator as Navigator&{standalone?:boolean}).standalone===true)return "pwa";
 return "web";
}
