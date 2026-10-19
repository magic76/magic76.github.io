import {useEffect,useState} from "react";
import {MIRA,type Age} from "./timeline";

/**
 * Use only published portraits, or explicitly approved independent full-body photographs.
 * Never request missing age image URLs or display crops from multi-age concept posters.
 */
const PUBLISHED_PORTRAIT_AGES=new Set(MIRA.portraits.map(p=>p.age));
const fullBodyApproved=(age:Age)=>MIRA.fullBodyPhotoPlan.some(p=>p.age===age&&p.status==="approved");
export function timelinePhotoUrl(age:Age,fullBody=false):string|null{
 if(fullBody&&fullBodyApproved(age))return "/assets/timeline/fullbody/mira-"+age+".webp";
 return PUBLISHED_PORTRAIT_AGES.has(age)?"/assets/timeline/mira-"+age+".webp":null;
}

export function TimelinePortrait({age,className="",alt}:{age:Age;className?:string;alt?:string}){
 const[failed,setFailed]=useState(false);
 const feature=className.includes("timeline-feature-photo");
 const url=timelinePhotoUrl(age,feature);
 useEffect(()=>setFailed(false),[age,url]);
 return <span className={"timeline-image-frame "+className}>
  {url&&!failed?<img key={age+":"+url} src={url} alt={alt||"Mira at age "+age} loading="lazy" onError={()=>setFailed(true)}/>:<span aria-label={"Mira age "+age+" · photo pending"} className="timeline-image-fallback">M<span>{age}</span></span>}
 </span>;
}
