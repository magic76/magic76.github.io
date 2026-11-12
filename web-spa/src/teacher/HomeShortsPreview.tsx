import {useEffect,useRef,useState,type TouchEvent} from "react";
import {Link,useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {fetchShortsFeed,shuffleShortsPosts,type ShortFeed} from "./shortsFeed";
import {trackUsageEvent} from "../analytics/usage";
import {shortsChatUrl,shortsStoryEpisodes,shortsStoryFollowUps} from "./shortsSocial";
import "./homeShorts.css";

/** Lightweight homepage preview: photo content stays in the network feed, not the JS bundle. */
export function HomeShortsPreview({maxPosts=3,excludeFriendIds=[],sharedFeed,sharedStatus}:{maxPosts?:number;excludeFriendIds?:string[];sharedFeed?:ShortFeed|null;sharedStatus?:"loading"|"ready"|"error"}={}){
 const {t,i18n}=useTranslation("teacher");
 const en=i18n.language.startsWith("en");
 const navigate=useNavigate();
 const [pullDistance,setPullDistance]=useState(0);
 const [canPrev,setCanPrev]=useState(false);
 const [canNext,setCanNext]=useState(true);
 const sliderRef=useRef<HTMLDivElement|null>(null);
 const syncArrows=()=>{const el=sliderRef.current;if(!el)return;setCanPrev(el.scrollLeft>2);setCanNext(el.scrollLeft+el.clientWidth<el.scrollWidth-2)};
 const moveArrows=(direction:number)=>{const el=sliderRef.current;if(!el)return;const item=el.querySelector<HTMLElement>(".crew-home-short-card");el.scrollBy({left:(item?.getBoundingClientRect().width||190)*direction+14*direction,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"})};
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
 const [ownFeed,setFeed]=useState<ShortFeed|null>(null);
 const feed=sharedStatus===undefined?ownFeed:sharedFeed;
 const sectionRef=useRef<HTMLElement|null>(null);
 const impressionSent=useRef(false);
 const [ownStatus,setStatus]=useState<"loading"|"ready"|"error">("loading");
 const status=sharedStatus??ownStatus;
 useEffect(()=>{
  if(sharedStatus!==undefined)return; // HomePage owns the single network request.
  const controller=new AbortController();
  fetchShortsFeed(controller.signal)
   .then(value=>{if(!controller.signal.aborted){
    // Shuffle once per mount before choosing distinct friends; never reorder mid-scroll.
    setFeed({...value,posts:shuffleShortsPosts(value.posts)});setStatus("ready");
   }})
   .catch(()=>{if(!controller.signal.aborted)setStatus("error");});
  return()=>controller.abort();
 },[sharedStatus]);
 // Show up to ten distinct friends; the full Shorts page owns the complete feed.
 const seen=new Set<string>();
 const posts=feed?.posts.filter(post=>{
  if(seen.has(post.friendId)||excludeFriendIds.includes(post.friendId))return false;
  seen.add(post.friendId);return true;
 }).slice(0,maxPosts)||[];
 const followUps=shortsStoryFollowUps(feed?.posts||[]);
 const visiblePostIds=posts.map(post=>post.id).join("|");
 useEffect(()=>{
  const slider=sliderRef.current;
  if(status!=="ready"||!slider||typeof IntersectionObserver==="undefined"
   ||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const cards=Array.from(slider.querySelectorAll<HTMLElement>(".crew-home-short-card"));
  const observer=new IntersectionObserver(entries=>{
   for(const entry of entries){
    entry.target.toggleAttribute("data-visible",entry.isIntersecting);
   }
  },{root:slider,threshold:0.35});
  cards.forEach(card=>observer.observe(card));
  slider.dataset.motionReady="true";
  return()=>{observer.disconnect();delete slider.dataset.motionReady};
 },[status,visiblePostIds]);
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
   <div className="crew-home-shorts-controls">
    <button type="button" disabled={!canPrev||status!=="ready"} onClick={()=>moveArrows(-1)} aria-label={en?"Previous Shorts":"上一則動態"}>←</button>
    <button type="button" disabled={!canNext||status!=="ready"} onClick={()=>moveArrows(1)} aria-label={en?"Next Shorts":"下一則動態"}>→</button>
   </div>
   <Link to="/teacher/shorts" className="crew-home-shorts-all">{t("practice.shortsAll")} <span aria-hidden="true">→</span></Link>
  </div>
  {status==="loading"&&<div className="crew-home-shorts-loading" role="status" aria-label={t("practice.shortsLoading")}>
   {Array.from({length:maxPosts},(_,i)=>i).map(i=><div className="crew-home-short-placeholder" key={i} aria-hidden="true"><div/><span/><span/></div>)}
  </div>}
  {status==="error"&&<Link className="crew-home-shorts-unavailable" to="/teacher/shorts">{t("practice.shortsUnavailable")} →</Link>}
  {status==="ready"&&posts.length>0&&<>
   {followUps.length?<div className="crew-home-shorts-update">
    <span>{en?"New story chapter":"你聊過的故事更新了"}</span>
    <Link to={shortsChatUrl(followUps[0].post,"next")}
     onClick={()=>{trackUsageEvent("shorts_story_followup","shorts_home");trackUsageEvent("shorts_chat_click","shorts_home")}}>
     {en?"Ask "+followUps[0].post.friendName+" what happened next":"問 "+followUps[0].post.friendName+" 後來呢"} →
    </Link>
   </div>:null}
   <div ref={sliderRef} onScroll={syncArrows} className="crew-home-shorts-grid" role="group" aria-label={t("practice.shortsTitle")}
    onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}>
    {posts.map(post=><article className="crew-home-short-card" key={post.id}>
     <Link className="crew-home-short-photo" to={"/teacher/shorts?post="+encodeURIComponent(post.id)}
      aria-label={en?"Read "+post.friendName+"\u0027s full story":"查看 "+post.friendName+" 的完整動態"}
      >
      <img src={post.image} alt={post.imageAlt} loading="lazy" decoding="async"
       onError={event=>{
        const image=event.currentTarget;
        if(image.dataset.fallback)return;
        image.dataset.fallback="1";
        image.src="/assets/friends/crew_friend_"+post.friendId+".webp";
       }}/>
      <span className="crew-home-short-photo-overlay" aria-hidden="true">{post.friendName}</span>
     </Link>
     <div className="crew-home-short-content">
      <strong>{post.friendName}</strong>
      {shortsStoryEpisodes(post,feed?.posts||[]).length>1?<small className="crew-home-short-series">{en?"Ongoing story":"連載故事"}</small>:null}
      <p lang={post.language}>{post.caption}</p>
      {i18n.resolvedLanguage==="zh-TW"&&post.translationZh&&post.language!=="zh"?<small className="crew-home-short-translation" lang="zh-Hant" title={post.translationZh}>{post.translationZh}</small>:null}
      <Link className="crew-home-short-question" onClick={()=>{
       trackUsageEvent("shorts_hook_click","shorts_home");trackUsageEvent("shorts_chat_click","shorts_home");
      }} to={shortsChatUrl(post,undefined,0)}>
       {t("practice.shortsChatThis",{name:post.friendName})} <span aria-hidden="true">→</span>
      </Link>
     </div>
    </article>)}
    <div className="crew-home-short-end"
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
