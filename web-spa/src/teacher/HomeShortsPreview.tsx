import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {fetchShortsFeed,type ShortFeed} from "./shortsFeed";
import {trackUsageEvent} from "../analytics/usage";
import "./homeShorts.css";

/** Lightweight homepage preview: photo content stays in the network feed, not the JS bundle. */
export function HomeShortsPreview(){
 const {t}=useTranslation("teacher");
 const [feed,setFeed]=useState<ShortFeed|null>(null);
 const sectionRef=useRef<HTMLElement|null>(null);
 const impressionSent=useRef(false);
 const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
 useEffect(()=>{
  const controller=new AbortController();
  fetchShortsFeed(controller.signal)
   .then(value=>{if(!controller.signal.aborted){setFeed(value);setStatus("ready");}})
   .catch(()=>{if(!controller.signal.aborted)setStatus("error");});
  return()=>controller.abort();
 },[]);
 // One newest post per friend gives all five Friends a chance to appear.
 const seen=new Set<string>();
 const posts=feed?.posts.filter(post=>{
  if(seen.has(post.friendId))return false;
  seen.add(post.friendId);return true;
 }).slice(0,5)||[];
 useEffect(()=>{
  if(status!=="ready"||!posts.length||impressionSent.current||!sectionRef.current)return;
  const mark=()=>{if(!impressionSent.current){impressionSent.current=true;trackUsageEvent("shorts_view","shorts_home");}};
  if(typeof IntersectionObserver==="undefined"){mark();return;}
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){mark();observer.disconnect();}
  },{threshold:0.25});
  observer.observe(sectionRef.current);
  return()=>observer.disconnect();
 },[status,feed]);
 return <section ref={sectionRef} className="section crew-home-shorts" aria-labelledby="crew-home-shorts-title">
  <div className="crew-home-shorts-heading">
   <div><span className="kicker">CREW SHORTS</span>
    <h2 id="crew-home-shorts-title">{t("practice.shortsTitle")}</h2>
    <p>{t("practice.shortsIntro")}</p></div>
   <Link to="/teacher/shorts" className="crew-home-shorts-all">{t("practice.shortsAll")} <span aria-hidden="true">→</span></Link>
  </div>
  {status==="loading"&&<div className="crew-home-shorts-loading" role="status" aria-label={t("practice.shortsLoading")}>
   {[0,1,2,3,4].map(i=><div className="crew-home-short-placeholder" key={i} aria-hidden="true"><div/><span/><span/></div>)}
  </div>}
  {status==="error"&&<Link className="crew-home-shorts-unavailable" to="/teacher/shorts">{t("practice.shortsUnavailable")} →</Link>}
  {status==="ready"&&posts.length>0&&<>
   <div className="crew-home-shorts-grid" role="list">
    {posts.map(post=><article className="crew-home-short-card" key={post.id} role="listitem">
     <div className="crew-home-short-photo">
      <img src={post.image} alt={post.imageAlt} loading="lazy" decoding="async"
       onError={event=>{
        const image=event.currentTarget;
        if(image.dataset.fallback)return;
        image.dataset.fallback="1";
        image.src="/assets/friends/crew_friend_"+post.friendId+".webp";
       }}/>
     </div>
     <div className="crew-home-short-content">
      <strong>{post.friendName}</strong>
      <p lang={post.language}>{post.caption}</p>
      <Link className="crew-home-short-chat" onClick={()=>trackUsageEvent("shorts_chat_click","shorts_home")} to={"/friend/live?id="+encodeURIComponent(post.friendId)+"&post="+encodeURIComponent(post.id)}>
       {t("practice.shortsChat",{name:post.friendName})}<span aria-hidden="true">→</span>
      </Link>
     </div>
    </article>)}
   </div>
   <p className="crew-home-shorts-disclosure">{t("practice.shortsDisclosure")}{feed?.source==="demo"?" · "+t("practice.shortsDemo"):""}</p>
  </>}
 </section>;
}
