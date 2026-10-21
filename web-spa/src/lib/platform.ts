/** UI hint from our own Android WebView shell, not an authentication boundary.
 * Other Android browsers and third-party WebViews should still see Play links. */
const ANDROID_SHELL_UA_TOKEN="CrewAndroidShell/1";

export function isCrewAndroidShell(userAgent?:string):boolean{
 const ua=userAgent??(typeof navigator==="undefined"?"":navigator.userAgent);
 return ua.split(/\s+/).includes(ANDROID_SHELL_UA_TOKEN);
}
