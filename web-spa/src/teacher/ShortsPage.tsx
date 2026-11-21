import {Arrow} from "../components/Arrow";
import {useEffect,useRef,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import "./shorts.css";
import {fetchShortsFeed,fetchShortsPage,fetchShortsPost,shuffleShortsPosts,type ShortFeed} from "./shortsFeed";
import {trackUsageEvent} from "../analytics/usage";
import {SHORTS_HOOKS,shortsPhotoQuestions,shortsChatUrl,shortsStoryEpisodes,shortsStoryFollowUps} from "./shortsSocial";

const LIKE_KEY="crew_shorts_demo_likes_v1";
const PAGE_SIZE=6;
function readLikes():string[]{
 try{return JSON.parse(localStorage.getItem(LIKE_KEY)||"[]") as string[]}catch{return []}
}
export function ShortsPage(){
 const {t,i18n}=useTranslation("home");
 const showZhTranslation=i18n.resolvedLanguage==="zh-TW";
 const [searchParams]=useSearchParams();
 const focusPostId=searchParams.get("post");
 // CSS scroll snap on the root can auto-jump to the first photo at hydration.
 // Arm it only after a real scroll gesture; direct feed visits keep the hero visible.
 const [scrollSnapReady,setScrollSnapReady]=useState(false);
 useEffect(()=>{
  if(focusPostId)return;
  const arm=()=>setScrollSnapReady(true);
  window.addEventListener("touchmove",arm,{passive:true,once:true});
  window.addEventListener("wheel",arm,{passive:true,once:true});
  return()=>{window.removeEventListener("touchmove",arm);window.removeEventListener("wheel",arm)};
 },[focusPostId]);
 // Respect the actual sticky-header height even if its layout changes across locales.
 useEffect(()=>{
  const update=()=>{
   const header=document.querySelector<HTMLElement>(".app-header");
   const height=Math.ceil(header?.getBoundingClientRect().height||0);
   document.documentElement.style.setProperty("--crew-shorts-header-offset",height+"px");
  };
  update();window.addEventListener("resize",update);
  return()=>{window.removeEventListener("resize",update);document.documentElement.style.removeProperty("--crew-shorts-header-offset")};
 },[]);

 const [feed,setFeed]=useState<ShortFeed|null>(null);
 const restoreRef=useRef<{y:number;count:number}|null>(null);
 function saveProfileReturn(){try{sessionStorage.setItem("crew_shorts_profile_return",JSON.stringify({y:window.scrollY,count,ids:feed?.posts.map(post=>post.id)||[]}))}catch{/* optional */}}

 const [busy,setBusy]=useState(true);
 const [error,setError]=useState(false);
 const [retry,setRetry]=useState(0);
 const [count,setCount]=useState(PAGE_SIZE);
 const loadMoreRef=useRef<HTMLDivElement|null>(null);
 const nextAbortRef=useRef<AbortController|null>(null);
 const loadingNextRef=useRef(false);
 const [loadingMore,setLoadingMore]=useState(false);
 const [moreError,setMoreError]=useState(false);
 useEffect(()=>()=>{nextAbortRef.current?.abort();},[]);
 const [translated,setTranslated]=useState<string|null>(null);
 const [likes,setLikes]=useState<string[]>([]);
 const [celebratingLike,setCelebratingLike]=useState<string|null>(null);
 useEffect(()=>{
  if(!celebratingLike)return;
  const timer=window.setTimeout(()=>setCelebratingLike(null),650);
  return()=>window.clearTimeout(timer);
 },[celebratingLike]);
 useEffect(()=>{setLikes(readLikes());},[]);
 useEffect(()=>{
  const abort=new AbortController();
  setBusy(true);setError(false);
  fetchShortsFeed(abort.signal)
   .then(async data=>{if(!abort.signal.aborted){const ordered=shuffleShortsPosts(data.posts);
    if(!focusPostId){try{const raw=sessionStorage.getItem("crew_shorts_profile_return");if(raw){const ids=JSON.parse(raw).ids;if(Array.isArray(ids)){const positions=new Map(ids.map((id:string,i:number)=>[id,i]));ordered.sort((a,b)=>(positions.get(a.id)??Infinity)-(positions.get(b.id)??Infinity));}}}catch{/* optional */}}
    // Deep links can refer to a later archive page, not just the first 50 entries.
    if(focusPostId&&!ordered.some(post=>post.id===focusPostId)){
     const friendId=focusPostId.split("-")[0];
     try{const focused=await fetchShortsPost(focusPostId,friendId,abort.signal);
      if(focused)ordered.unshift(focused);
     }catch{/* Keep the first-page feed usable when a deep link is unavailable. */}
    }
    if(abort.signal.aborted)return;
    // Home photo opens its full approved story. Never interpret URL data as a story.
    if(focusPostId){const at=ordered.findIndex(post=>post.id===focusPostId);
     if(at>0)ordered.unshift(...ordered.splice(at,1));}
    setFeed({...data,posts:ordered});
    let saved:null|{y:number;count:number}=null;
    if(!focusPostId){try{const raw=sessionStorage.getItem("crew_shorts_profile_return");if(raw){const value=JSON.parse(raw);if(Number.isFinite(value.y)&&Number.isSafeInteger(value.count)&&value.count>0){saved={y:Math.max(0,value.y),count:Math.min(value.count,ordered.length)};}sessionStorage.removeItem("crew_shorts_profile_return")}}catch{/* optional */}}
    restoreRef.current=saved;
    setCount(saved?.count||PAGE_SIZE);setMoreError(false);setBusy(false);if(data.posts.length)trackUsageEvent("shorts_view","shorts_feed")}})
   .catch(()=>{if(!abort.signal.aborted){setBusy(false);setError(true)}});
  return()=>abort.abort();
 },[retry,focusPostId]);
 useEffect(()=>{if(busy||!feed||!restoreRef.current)return;
  const saved=restoreRef.current;restoreRef.current=null;
  const frame=requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:saved.y,behavior:"instant"})));
  return()=>cancelAnimationFrame(frame);
 },[busy,feed]);
 // On returning from a call, restore the approved post instead of the shuffled top.
 useEffect(()=>{
  if(!focusPostId||!feed?.posts.some(post=>post.id===focusPostId)||busy)return;
  const frame=window.requestAnimationFrame(()=>{
   document.getElementById("crew-short-"+focusPostId)?.scrollIntoView({block:"start",behavior:"instant"});
  });
  return()=>window.cancelAnimationFrame(frame);
 },[feed,focusPostId,busy]);
 // Reveal the next batch before the reader reaches the bottom. Fallback stays accessible
 // when IntersectionObserver is unavailable; the same visit never reshuffles on scroll.
 useEffect(()=>{
  if(typeof IntersectionObserver==="undefined"||busy||error||!feed||count>=feed.posts.length)return;
  const sentinel=loadMoreRef.current;
  if(!sentinel)return;
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){
    setCount(current=>Math.min(current+PAGE_SIZE,feed.posts.length));
   }
  },{rootMargin:"600px 0px"});
  observer.observe(sentinel);
  return()=>observer.disconnect();
 },[feed,busy,error,count]);
 function loadNextPage(){
  if(!feed?.nextPage||loadingNextRef.current)return;
  const url=feed.nextPage;
  loadingNextRef.current=true;setLoadingMore(true);setMoreError(false);
  const abort=new AbortController();nextAbortRef.current=abort;
  fetchShortsPage(url,abort.signal).then(next=>{
   if(abort.signal.aborted)return;
   setFeed(current=>{
    if(!current||current.nextPage!==url)return current;
    const seen=new Set(current.posts.map(p=>p.id));
    return {...current,posts:[...current.posts,...shuffleShortsPosts(next.posts).filter(p=>!seen.has(p.id))],nextPage:next.nextPage};
   });
   setCount(current=>current+PAGE_SIZE);
  }).catch(()=>{if(!abort.signal.aborted)setMoreError(true)})
   .finally(()=>{
    loadingNextRef.current=false;
    if(!abort.signal.aborted)setLoadingMore(false);
   });
 }
 // V2 archive pages are fetched only after the user reaches the current 50-post page.
 useEffect(()=>{
  if(typeof IntersectionObserver==="undefined"||busy||error||!feed?.nextPage
   ||count<feed.posts.length||loadingMore||moreError)return;
  const sentinel=loadMoreRef.current;
  if(!sentinel)return;
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();loadNextPage();}
  },{rootMargin:"600px 0px"});
  observer.observe(sentinel);
  return()=>observer.disconnect();
 },[feed,busy,error,count,loadingMore,moreError]);
 function toggleLike(id:string){
  if(!likes.includes(id))setCelebratingLike(id);
  else setCelebratingLike(null);
  setLikes(previous=>{
   const next=previous.includes(id)?previous.filter(value=>value!==id):[...previous,id];
   try{localStorage.setItem(LIKE_KEY,JSON.stringify(next))}catch{/* private storage */}return next;
  });
 }
 const posts=feed?.posts||[];
 const followUps=shortsStoryFollowUps(posts);
 const chatClick=(detail:"shorts_feed")=>trackUsageEvent("shorts_chat_click",detail);
 return <div className="crew-shorts-page" data-scroll-snap={focusPostId||scrollSnapReady?"ready":"off"}>
  <header className="hero crew-shorts-hero"><span className="kicker">{feed?.source==="seed"||feed?.source==="daily"?"Koolo SHORTS":"Koolo SHORTS · DEMO"}</span>
   <h1>{t("shorts.heading")}</h1>
   <p>{t("shorts.intro")}</p>
  </header>
  {busy?<p className="spa-loading" role="status">{t("shorts.loading")}</p>:null}
  {error?<section className="section crew-shorts-error" role="alert"><p>{t("shorts.feedError")}</p>
   <button type="button" onClick={()=>setRetry(x=>x+1)}>{t("shorts.retry")}</button></section>:null}
  {posts.length>0?<section className="section" aria-label="Koolo Shorts">
   <div className="section-head"><h2>{t("shorts.moments")}</h2><small>{feed?.total??posts.length} {t("shorts.stories")} · {feed?.source==="demo"?t("shorts.demoLabel"):posts[0]?.language?.toUpperCase()}</small></div>
   <div className="crew-shorts-grid">{posts.slice(0,count).map((post,index)=>{
    const episodes=shortsStoryEpisodes(post,posts);
    const chapter=episodes.findIndex(item=>item.id===post.id);
    const previous=chapter>0?episodes[chapter-1]:null;
    const questions=shortsPhotoQuestions(post,(key,detail)=>t("shorts."+key,{detail}));
    return <article className="crew-short-card" id={"crew-short-"+post.id} key={post.id}>
     <div className="crew-short-media">
      <Link className="crew-short-image" to={shortsChatUrl(post,undefined,0)}
       aria-label={t("shorts.chatThis",{name:post.friendName})}
       onClick={()=>{trackUsageEvent("shorts_hook_click","shorts_feed");chatClick("shorts_feed")}}>
       <img src={post.image} alt={post.imageAlt} loading={index>1?"lazy":"eager"} decoding="async"
        onError={event=>{
         const node=event.currentTarget;
         if(node.dataset.fallback)return;
         node.dataset.fallback="1";
         node.src="/assets/friends/crew_friend_"+post.friendId+".webp";
        }}/>
       <span className="crew-short-photo-bottom">
        <span className="crew-short-friend"><img src={"/assets/friends/crew_friend_"+post.friendId+".webp"} alt="" loading="lazy"/><strong>{post.friendName}</strong></span>
        <span className="crew-short-primary-cta">{t("shorts.chatThis",{name:post.friendName})} <Arrow direction="up-right"/></span>
       </span>
      </Link>
      <Link className="crew-short-profile-link" to={"/teacher/shorts/"+post.friendId} aria-label={post.friendName+" profile"} onClick={saveProfileReturn}><img src={"/assets/friends/crew_friend_"+post.friendId+".webp"} alt="" loading="lazy"/><span>{post.friendName} <Arrow direction="up-right"/></span></Link>
      <div className="crew-short-actions">
       <button type="button" className={"crew-short-like"+(celebratingLike===post.id?" is-celebrating":"")}
        aria-label={t("shorts.like")} title={t("shorts.like")}
        aria-pressed={likes.includes(post.id)} onClick={()=>toggleLike(post.id)}>
        <span className="crew-short-like-heart" aria-hidden="true">{likes.includes(post.id)?"♥":"♡"}</span>
       </button>
      </div>
     </div>
     <div className="crew-short-body">
      <div className="crew-short-meta"><Link to={"/teacher/shorts/"+post.friendId} onClick={saveProfileReturn}>{post.friendName} <Arrow direction="up-right"/></Link><small>{post.publishedAt.slice(0,10)}</small></div>
      {episodes.length>1?<div className="crew-short-episode">{t("shorts.ongoing")} · {t("shorts.part",{part:chapter+1,total:episodes.length})}</div>:null}
      <p lang={post.language}>{post.caption}</p>
      {showZhTranslation&&post.translationZh&&post.language!=="zh"?<div className="crew-short-translation-wrap">
       <button type="button" className="crew-short-translation-toggle"
        onClick={()=>setTranslated(x=>x===post.id?null:post.id)}
        aria-expanded={translated===post.id} aria-controls={"crew-short-translation-"+post.id}>
        {t(translated===post.id?"shorts.hideTranslation":"shorts.showTranslation")}
       </button>
       <p id={"crew-short-translation-"+post.id} className="crew-short-translation" lang="zh-Hant" hidden={translated!==post.id}>{post.translationZh}</p>
      </div>:null}
      {previous?<details className="crew-short-recap"><summary>{t("shorts.previous")}</summary>
       <p lang={previous.language}>{previous.caption}</p>
      </details>:null}
      <div className="crew-short-chat-prompts" aria-label={t("shorts.startConversation")}>
       <small>{t("shorts.curious",{name:post.friendName})}</small>
       <div>{questions.length?questions.map(question=><Link key={question.index} to={shortsChatUrl(post,undefined,question.index)}
        onClick={()=>{trackUsageEvent("shorts_hook_click","shorts_feed");chatClick("shorts_feed")}}>
        {question.label} <Arrow direction="up-right"/>
       </Link>):SHORTS_HOOKS.map(hook=><Link key={hook} to={shortsChatUrl(post,hook)}
        onClick={()=>{trackUsageEvent("shorts_hook_click","shorts_feed");chatClick("shorts_feed")}}>
        {t("shorts.hooks"+({details:"Details",feelings:"Feelings",next:"Next"} as const)[hook])} <Arrow direction="up-right"/>
       </Link>)}</div>
      </div>
     </div>
    </article>})}</div>
   {followUps.length?<aside className="crew-shorts-followups" aria-label={t("shorts.updates")}>
    <div><strong>{t("shorts.updatesHeading")}</strong>
     <p>{t("shorts.updatesIntro")}</p></div>
    <div className="crew-shorts-followup-links">{followUps.map(({post})=>
     <Link key={post.id} to={shortsChatUrl(post,"next")} onClick={()=>{
      trackUsageEvent("shorts_story_followup","shorts_feed");chatClick("shorts_feed");
     }}>{t("shorts.followUp",{name:post.friendName})} <Arrow/></Link>)}</div>
   </aside>:null}
   {(count<posts.length||Boolean(feed?.nextPage))?<div ref={loadMoreRef} className="crew-shorts-more-wrap">
    {typeof IntersectionObserver==="undefined"
     ?<button type="button" className="crew-shorts-more" disabled={loadingMore}
        onClick={()=>count<posts.length?setCount(x=>Math.min(x+PAGE_SIZE,posts.length)):loadNextPage()}>
       {t(loadingMore?"shorts.loadingShort":"shorts.more")}
      </button>
     :<p className="crew-shorts-progress" role="status">
       {loadingMore?t("shorts.loadingMore"):t("shorts.progress",{count:Math.min(count,posts.length),total:feed?.total??posts.length})}
      </p>}
    {moreError?<button type="button" className="crew-shorts-more" onClick={()=>loadNextPage()}>
      {t("shorts.retryMore")}
     </button>:null}
   </div>:null}
  </section>:null}
  <section className="section"><div className="crew-shorts-note" role="note">
   {feed?.source==="seed"||feed?.source==="daily"
    ?t("shorts.noteDaily")
    :t("shorts.noteDemo")}
  </div></section>
 </div>;
}
