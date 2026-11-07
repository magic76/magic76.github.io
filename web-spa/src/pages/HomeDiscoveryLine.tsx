import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";

/** A small invitation, not an automatic tab/CTA switch. Keep destination and text aligned. */
const DISCOVER=[
 {to:"/games/1a2b",detail:"play"},
 {to:"/souls",detail:"souls"},
 {to:"/friend/live?id=zoe&from=home",detail:"friend"},
 {to:"/teacher/vocabulary",detail:"learn"},
 {to:"/story",detail:"story"}
] as const;

type Phase="hold"|"erase"|"type";
export function HomeDiscoveryLine({animate}:{animate:boolean}){
 const {t}=useTranslation("home");
 // SSR and first paint show a FULL useful sentence. Animation starts only after idle/visibility gating.
 const [index,setIndex]=useState(0);
 const [phase,setPhase]=useState<Phase>("hold");
 const [count,setCount]=useState<number|null>(null);
 const [hover,setHover]=useState(false);
 const [focused,setFocused]=useState(false);
 const item=DISCOVER[index];
 const phrase=t("world.discovery.item"+index);
 const characters=Array.from(phrase);
 const visible=!animate||count===null?phrase:characters.slice(0,count).join("");
 useEffect(()=>{
  if(!animate||hover||focused)return;
  const delay=phase==="hold"?2000:phase==="erase"?20:40;
  const timer=window.setTimeout(()=>{
   if(phase==="hold"){setCount(characters.length);setPhase("erase");return;}
   if(phase==="erase"){
    if((count??characters.length)>0){setCount(Math.max(0,(count??characters.length)-1));return;}
    setIndex(value=>(value+1)%DISCOVER.length);setPhase("type");return;
   }
   if((count??0)<characters.length){setCount(value=>Math.min(characters.length,(value??0)+1));return;}
   setPhase("hold");
  },delay);
  return()=>window.clearTimeout(timer);
 },[animate,hover,focused,phase,count,index,characters.length]);
 return <span className="crew-portal-discovery">
  <span className="crew-portal-discovery-intro">{t("world.discovery.intro")}</span>
  <Link className="crew-portal-discovery-link" to={item.to} aria-label={phrase}
   onPointerEnter={()=>setHover(true)} onPointerLeave={()=>setHover(false)}
   onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
   onClick={()=>trackUsageEvent("home_entry_click",item.detail)}>
   <span aria-hidden="true">{visible}</span>
   <span className="crew-portal-discovery-caret" aria-hidden="true">▍</span>
   <span className="crew-portal-discovery-arrow" aria-hidden="true">↗</span>
  </Link>
 </span>;
}
