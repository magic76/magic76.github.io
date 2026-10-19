import {useEffect,useState} from "react";
import {MIRA,type Age} from "./timeline";

/**
 * Canonical headshots take priority in circles. New stages reuse their approved
 * full-body photograph as a tightly cropped avatar until a portrait is published.
 */
const PUBLISHED_PORTRAIT_AGES=new Set(MIRA.portraits.map(p=>p.age));
const fullBodyApproved=(age:Age)=>MIRA.fullBodyPhotoPlan.some(p=>p.age===age&&p.status==="approved");
const fullBodyUrl=(age:Age)=>"/assets/timeline/fullbody/mira-"+age+".webp";
export function timelinePhotoUrl(age:Age,fullBody=false):string|null{
 if(fullBody&&fullBodyApproved(age))return fullBodyUrl(age);
 if(PUBLISHED_PORTRAIT_AGES.has(age))return "/assets/timeline/mira-"+age+".webp";
 return fullBodyApproved(age)?fullBodyUrl(age):null;
}

export function TimelinePortrait({age,className="",alt}:{age:Age;className?:string;alt?:string}){
 const[failed,setFailed]=useState(false);
 const feature=className.includes("timeline-feature-photo");
 const url=timelinePhotoUrl(age,feature);
 // For new chapters with no official headshot, focus the face near the top
 // of the same approved full-body picture; never show a tiny full-length figure.
 const cropFullBodyAvatar=!feature&&!PUBLISHED_PORTRAIT_AGES.has(age)&&fullBodyApproved(age);
 useEffect(()=>setFailed(false),[age,url]);
 return <span className={"timeline-image-frame "+className}>
  {url&&!failed?<img key={age+":"+url} src={url} alt={alt||"Mira at age "+age}
    className={cropFullBodyAvatar?"timeline-avatar-from-fullbody":undefined}
    loading={feature?"eager":"lazy"} fetchPriority={feature?"high":undefined} onError={()=>setFailed(true)}/>:<span aria-label={"Mira age "+age+" · photo pending"} className="timeline-image-fallback">M<span>{age}</span></span>}
 </span>;
}
