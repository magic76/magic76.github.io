import {useEffect,useState} from "react";
import {fetchDay,fetchIndex} from "./data";

/** Keep the Explore destination usable while the public feed loads or is offline. */
export function LatestBriefingTitle({fallback}:{fallback:string}){
 const [title,setTitle]=useState("");
 useEffect(()=>{
  let active=true;
  async function load(){
   const {days}=await fetchIndex();
   if(!active||!days.length)return;
   const day=await fetchDay(days[0]);
   if(active)setTitle(day.items[0]?.title.trim()||"");
  }
  void load().catch(()=>{/* Leave the localized description in place. */});
  return ()=>{active=false};
 },[]);
 return <small className="crew-explore-headline">{title||fallback}</small>;
}
