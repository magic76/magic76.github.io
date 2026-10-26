import {useEffect,useRef,useState} from "react";
import {MIRA,type Age} from "./timeline";
import type {TimelineCharacterId} from "./timelineCharacters";
import portraitManifest from "../../../contracts/crew-timeline/person-portraits-v1.json";
import {approvedPortrait,verifiedPortraitBlob} from "./portraitAssetPolicy.mjs";

// At most 48 compressed images; decoded image lifetimes remain with the browser.
const verifiedBlobs=new Map<string,Promise<Blob|null>>();

/**
 * Canonical headshots take priority in circles. New stages reuse their approved
 * full-body photograph as a tightly cropped avatar until a portrait is published.
 */
const PUBLISHED_PORTRAIT_AGES=new Set(MIRA.portraits.map(p=>p.age));
const fullBodyApproved=(age:Age)=>MIRA.fullBodyPhotoPlan.some(p=>p.age===age&&p.status==="approved");
const fullBodyUrl=(age:Age)=>"/assets/timeline/fullbody/mira-"+age+".webp";
export function timelinePhotoUrl(age:Age,fullBody=false,characterId:TimelineCharacterId="mira"):string|null{
 if(characterId!=="mira"){
  const asset=approvedPortrait(portraitManifest,characterId,age,fullBody?"fullbody":"avatar");
  return asset?"/assets/"+asset.path:null;
 }
 if(fullBody&&fullBodyApproved(age))return fullBodyUrl(age);
 if(PUBLISHED_PORTRAIT_AGES.has(age))return "/assets/timeline/mira-"+age+".webp";
 return fullBodyApproved(age)?fullBodyUrl(age):null;
}

export function TimelinePortrait({age,className="",alt,priority=false,characterId="mira"}:{age:Age;className?:string;alt?:string;priority?:boolean;characterId?:TimelineCharacterId}){
 const frameRef=useRef<HTMLSpanElement>(null);
 const[failed,setFailed]=useState(false);
 const[verified,setVerified]=useState<{key:string;url:string}|null>(null);
 const[retry,setRetry]=useState(0);
 const feature=className.includes("timeline-feature-photo");
 const candidate=timelinePhotoUrl(age,feature,characterId);
 const photoKey=characterId+":"+age+":"+(feature?"fullbody":"avatar");
 const[exposure,setExposure]=useState({key:photoKey,visible:priority});
 const visible=priority||(exposure.key===photoKey&&exposure.visible);
 const asset=characterId==="mira"?null:approvedPortrait(portraitManifest,characterId,age,feature?"fullbody":"avatar");
 const cacheKey=photoKey+":"+asset?.sha256;
 const url=visible?(characterId==="mira"?candidate:verified?.key===photoKey?verified.url:null):null;

 // Do not fetch every age and character on mount: preload only visible or
 // nearby cards, while the selected age (priority) remains immediately ready.
 useEffect(()=>{
  if(visible||!candidate)return;
  const frame=frameRef.current;
  if(!frame)return;
  if(typeof IntersectionObserver==="undefined"){setExposure({key:photoKey,visible:true});return;}
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){
    setExposure({key:photoKey,visible:true});
    observer.disconnect();
   }
  },{rootMargin:"240px"});
  observer.observe(frame);
  return()=>observer.disconnect();
 },[visible,candidate,photoKey]);

 // Cache approved compressed bytes, never object URLs tied to mounted elements.
 // Keep the existing strict path, dimensions and SHA-256 checks unchanged.
 useEffect(()=>{
  if(characterId==="mira"||!visible||!candidate||!asset)return;
  let cancelled=false,objectUrl:string|undefined;
  let request=verifiedBlobs.get(cacheKey);
  if(!request){
   request=verifiedPortraitBlob(asset);
   verifiedBlobs.set(cacheKey,request);
   void request.then(blob=>{if(!blob)verifiedBlobs.delete(cacheKey)});
  }
  void request.then(blob=>{
   if(cancelled)return;
   if(!blob){setFailed(true);return;}
   objectUrl=URL.createObjectURL(blob);
   setVerified({key:photoKey,url:objectUrl});
  });
  return()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[characterId,visible,candidate,photoKey,cacheKey,retry]);

 // A transient CDN/network failure gets one bounded retry, not a permanent
 // placeholder. Corrupt bytes still fail closed after the retry.
 useEffect(()=>{
  if(!failed||!visible||!candidate||retry!==0)return;
  const timer=window.setTimeout(()=>{
   if(characterId!=="mira")verifiedBlobs.delete(cacheKey);
   setFailed(false);
   setRetry(1);
  },2200);
  return()=>window.clearTimeout(timer);
 },[failed,visible,candidate,retry,characterId,cacheKey]);
 useEffect(()=>{setFailed(false);setRetry(0);setVerified(null)},[photoKey]);
 const personName=characterId==="mira"?"Mira":characterId==="ethan"?"Ethan":"Hana";
 // New Mira stages use a face-focused crop of their approved full-body image.
 const cropFullBodyAvatar=characterId==="mira"&&!feature&&!PUBLISHED_PORTRAIT_AGES.has(age)&&fullBodyApproved(age);
 return <span ref={frameRef} className={"timeline-image-frame "+className}>
  {url&&!failed?<img key={photoKey+":"+url} src={url} alt={alt||""}
    className={cropFullBodyAvatar?"timeline-avatar-from-fullbody":undefined}
    loading={priority?"eager":"lazy"} fetchPriority={priority?"high":undefined} onError={()=>setFailed(true)}/>:<span {...(alt?{role:"img","aria-label":alt}:{"aria-hidden":true})} data-photo-state={failed?"unavailable":visible?"loading":"pending"} className={"timeline-image-fallback timeline-placeholder-"+characterId}>{personName[0]}<span>{age}</span></span>}
 </span>;
}
