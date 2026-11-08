/** Intent-based global navigation. Existing product deep links remain unchanged. */
export type CrewSection = "home" | "chat" | "explore" | "learn" | "me";
export const CREW_SECTIONS:readonly CrewSection[]=["home","chat","explore","learn","me"];

export function sectionForRoute(pathname:string,search=""):CrewSection{
 const root=pathname.split("/")[1];
 if(!root)return "home";
 if(["chat","explore","learn","me"].includes(root))return root as CrewSection;
 if(root==="friend")return "chat";
 if(root==="teacher"){
  if(pathname.startsWith("/teacher/shorts")||pathname.startsWith("/teacher/friends"))return "chat";
  if(pathname.startsWith("/teacher/fortune"))return "explore";
  if(pathname.startsWith("/teacher/me")||pathname.startsWith("/teacher/memory")||
     pathname.startsWith("/teacher/reports")||pathname.startsWith("/teacher/phrasebook"))return "me";
  if(pathname.startsWith("/teacher/roles")&&new URLSearchParams(search).get("mode")==="friends")return "chat";
  return "learn";
 }
 if(root==="town"||root==="magic"||root==="discover")return "explore";
 if(["fortune","timeline","games","story","research","briefing","circle","books","mate","souls"].includes(root))return "explore";
 if(["settings","account","privacy","usage","feedback"].includes(root))return "me";
 return "home";
}
