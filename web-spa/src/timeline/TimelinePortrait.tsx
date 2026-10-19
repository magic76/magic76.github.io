import {useEffect,useState} from "react";
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
 const[failed,setFailed]=useState(false);
 const[verified,setVerified]=useState<{key:string;url:string}|null>(null);
 const feature=className.includes("timeline-feature-photo");
 const candidate=timelinePhotoUrl(age,feature,characterId);
 const photoKey=characterId+":"+age+":"+(feature?"fullbody":"avatar");
 const url=characterId==="mira"?candidate:verified?.key===photoKey?verified.url:null;
 useEffect(()=>{
  if(characterId==="mira"||!candidate)return;
  let cancelled=false,objectUrl:string|undefined;
  const asset=approvedPortrait(portraitManifest,characterId,age,feature?"fullbody":"avatar");
  const cacheKey=photoKey+":"+asset?.sha256;
  let request=verifiedBlobs.get(cacheKey);
  if(!request){request=verifiedPortraitBlob(asset);verifiedBlobs.set(cacheKey,request);void request.then(blob=>{if(!blob)verifiedBlobs.delete(cacheKey)});}
  void request.then(blob=>{
   if(cancelled||!blob)return;
   objectUrl=URL.createObjectURL(blob);setVerified({key:photoKey,url:objectUrl});
  });
  return()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[characterId,age,feature,candidate,photoKey]);
 const personName=characterId==="mira"?"Mira":characterId==="ethan"?"Ethan":"Hana";
 // For new chapters with no official headshot, focus the face near the top
 // of the same approved full-body picture; never show a tiny full-length figure.
 const cropFullBodyAvatar=characterId==="mira"&&!feature&&!PUBLISHED_PORTRAIT_AGES.has(age)&&fullBodyApproved(age);
 useEffect(()=>setFailed(false),[photoKey,url]);
 return <span className={"timeline-image-frame "+className}>
  {url&&!failed?<img key={age+":"+url} src={url} alt={alt||personName+" at age "+age}
    className={cropFullBodyAvatar?"timeline-avatar-from-fullbody":undefined}
    loading={priority?"eager":"lazy"} fetchPriority={priority?"high":undefined} onError={()=>setFailed(true)}/>:<span aria-label={personName+" age "+age+" · photo pending"} className={"timeline-image-fallback timeline-placeholder-"+characterId}>{personName[0]}<span>{age}</span></span>}
 </span>;
}

