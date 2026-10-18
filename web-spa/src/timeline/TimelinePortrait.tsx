import {useEffect,useState} from "react";
import type {Age} from "./timeline";
/** Generated and reviewed age-progressed portrait files; fallback is explicit while assets are staged. */
export function TimelinePortrait({age,className="",alt}:{age:Age;className?:string;alt?:string}){
 const[failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[age]);
 return <span className={"timeline-image-frame "+className}>
  {!failed?<img key={age} src={"/assets/timeline/mira-"+age+".webp"} alt={alt||"Mira at age "+age} loading="lazy" onError={()=>setFailed(true)}/>:<span aria-label={"Mira age "+age} className="timeline-image-fallback">M<span>{age}</span></span>}
 </span>;
}
