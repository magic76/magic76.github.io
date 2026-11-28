/** Intent-based global navigation. Existing product deep links remain unchanged. */
export type CrewSection = "home" | "chat" | "explore" | "learn" | "me";
export const CREW_SECTIONS:readonly CrewSection[]=["home","learn","explore","chat","me"];

export function sectionForRoute(pathname:string,search=""):CrewSection{
 const root=pathname.split("/")[1];
 if(!root)return "home";
 if(["chat","explore","learn","me"].includes(root))return root as CrewSection;
 if(root==="friend")return "chat";
 if(root==="teacher"){
  if(pathname.startsWith("/teacher/shorts")||pathname.startsWith("/teacher/friends"))return "chat";
  if(pathname.startsWith("/teacher/fortune"))return "explore";
  // Personal storage stays in Mine; reports, phrasebook and practice are learning tools.
  if(pathname.startsWith("/teacher/me")||pathname.startsWith("/teacher/memory"))return "me";
  return "learn";
 }
 // Personal collections reached from Mine stay on Mine, not Explore.
 if(pathname==="/story/me"||pathname==="/fortune/history"||(pathname==="/fortune/premium"&&!new URLSearchParams(search).has("history"))||pathname.startsWith("/fortune/purchases"))return "me";
 if(root==="town"||root==="magic"||root==="discover"||root==="orb"||root==="guides")return "explore";
 if(["fortune","timeline","games","story","research","briefing","circle","books","mate","souls"].includes(root))return "explore";
 if(["settings","account","privacy","usage","feedback"].includes(root))return "me";
 return "home";
}
