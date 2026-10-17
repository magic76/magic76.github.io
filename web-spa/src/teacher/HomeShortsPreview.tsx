import {useEffect,useRef,useState,type TouchEvent} from "react";
import {Link,useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {fetchShortsFeed,type ShortFeed} from "./shortsFeed";
import {trackUsageEvent} from "../analytics/usage";
import "./homeShorts.css";

/** Lightweight homepage preview: photo content stays in the network feed, not the JS bundle. */
export function HomeShortsPreview(){
 const {t}=useTranslation("teacher");
 const navigate=useNavigate();
 const [pullDistance,setPullDistance]=useState(0);
 const gesture=useRef<{x:number;y:number;atEnd:boolean}|null>(null);
 const pullRef=useRef(0);
 const handleTouchStart=(event:TouchEvent<HTMLDivElement>)=>{
  const touch=event.touches[0],element=event.currentTarget;
  if(!touch)return;
  // Only a fresh gesture that begins at the right edge can open the full feed.
  // Do not navigate when a normal swipe merely reaches the last preview.
  gesture.current={x:touch.clientX,y:touch.clientY,
   atEnd:element.scrollWidth-element.clientWidth-element.scrollLeft<=3};
  pullRef.current=0;setPullDistance(0);
 };
 const handleTouchMove=(event:TouchEvent<HTMLDivElement>)=>{
  const start=gesture.current,touch=event.touches[0];
  if(!start?.atEnd||!touch)return;
  const dx=start.x-touch.clientX,dy=start.y-touch.clientY;
  const distance=dx>Math.abs(dy)?Math.max(0,dx):0;
  pullRef.current=distance;
  setPullDistance(Math.min(distance,96));
 };
 const handleTouchEnd=()=>{
  const open=gesture.current?.atEnd&&pullRef.current>=72;
  gesture.current=null;pullRef.current=0;setPullDistance(0);
  if(open)navigate("/teacher/shorts");
 };
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
 // Show up to ten distinct friends; the full Shorts page owns the complete feed.
 const seen=new Set<string>();
 const posts=feed?.posts.filter(post=>{
  if(seen.has(post.friendId))return false;
  seen.add(post.friendId);return true;
 }).slice(0,10)||[];
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
   <div className="crew-home-shorts-grid" role="list" aria-label={t("practice.shortsTitle")}
    onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}>
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
    <div className="crew-home-short-end" role="listitem"
     style={{transform:`translateX(${-Math.min(28,pullDistance*.36)}px) scale(${1+pullDistance/600})`}}>
     <Link to="/teacher/shorts" className="crew-home-short-end-link">
      <span aria-hidden="true" className="crew-home-short-end-arrow">→</span>
      <strong>{t("practice.shortsAll")}</strong>
      <small>{t(pullDistance>=72?"practice.shortsReleaseHint":"practice.shortsPullHint")}</small>
     </Link>
    </div>
   </div>
   <p className="crew-home-shorts-disclosure">{t("practice.shortsDisclosure")}{feed?.source==="demo"?" · "+t("practice.shortsDemo"):""}</p>
  </>}
 </section>;
}
