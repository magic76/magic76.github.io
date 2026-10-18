import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import "./shorts.css";
import {fetchShortsFeed,fetchShortsPage,shuffleShortsPosts,type ShortFeed} from "./shortsFeed";
import {trackUsageEvent} from "../analytics/usage";
import {SHORTS_HOOKS,shortsChatUrl,shortsHookLabel,shortsStoryEpisodes,shortsStoryFollowUps} from "./shortsSocial";

const LIKE_KEY="crew_shorts_demo_likes_v1";
const PAGE_SIZE=6;
function readLikes():string[]{
 try{return JSON.parse(localStorage.getItem(LIKE_KEY)||"[]") as string[]}catch{return []}
}
export function ShortsPage(){
 const {i18n}=useTranslation();
 const en=i18n.language.startsWith("en");
 const [feed,setFeed]=useState<ShortFeed|null>(null);
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
 useEffect(()=>{setLikes(readLikes());},[]);
 useEffect(()=>{
  const abort=new AbortController();
  setBusy(true);setError(false);
  fetchShortsFeed(abort.signal)
   .then(data=>{if(!abort.signal.aborted){setFeed({...data,posts:shuffleShortsPosts(data.posts)});setCount(PAGE_SIZE);setMoreError(false);setBusy(false);if(data.posts.length)trackUsageEvent("shorts_view","shorts_feed")}})
   .catch(()=>{if(!abort.signal.aborted){setBusy(false);setError(true)}});
  return()=>abort.abort();
 },[retry]);
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
  setLikes(previous=>{
   const next=previous.includes(id)?previous.filter(value=>value!==id):[...previous,id];
   try{localStorage.setItem(LIKE_KEY,JSON.stringify(next))}catch{/* private storage */}return next;
  });
 }
 const posts=feed?.posts||[];
 const followUps=shortsStoryFollowUps(posts);
 const chatClick=(detail:"shorts_feed")=>trackUsageEvent("shorts_chat_click",detail);
 return <div className="crew-shorts-page">
  <header className="hero crew-shorts-hero"><span className="kicker">{feed?.source==="seed"||feed?.source==="daily"?"CREW SHORTS":"CREW SHORTS · DEMO"}</span>
   <h1>{en?"What's happening with your Crew?":"今天 Crew 朋友發生什麼事？"}</h1>
   <p>{en?"Little photo stories, real phrases, and easy ways to start talking.":"每天一張照片、一句自然外語。不想聊天，也可以只看看。"}</p>
  </header>
  <section className="section"><div className="crew-shorts-note" role="note">
   {feed?.source==="seed"||feed?.source==="daily"
    ?en?"Fictional AI friends share daily photo stories.":"虛構 AI 朋友的生活動態；照片與劇情由 Crew 創作。"
    :en?"Preview content: sample stories and third-party demo photos. AI-generated daily photos are not yet enabled.":"這是示範內容：目前使用範例故事與第三方示意照片，尚未啟用每天 AI 生圖。"}
  </div></section>
  {busy?<p className="spa-loading" role="status">{en?"Loading stories…":"正在載入朋友動態…"}</p>:null}
  {error?<section className="section crew-shorts-error" role="alert"><p>{en?"The feed is unavailable. Try again.":"動態暫時無法載入，請再試一次。"}</p>
   <button type="button" onClick={()=>setRetry(x=>x+1)}>{en?"Retry":"重試"}</button></section>:null}
  {posts.length>0?<section className="section" aria-label="Crew Shorts">
   <div className="section-head"><h2>{en?"Friends’ moments":"朋友生活動態"}</h2><small>{feed?.total??posts.length} {en?"stories":"則故事"} · {feed?.source==="demo"?"English demo":posts[0]?.language?.toUpperCase()}</small></div>
   {followUps.length?<aside className="crew-shorts-followups" aria-label={en?"Story updates":"故事續集"}>
    <div><strong>{en?"Your Crew has a new chapter":"你聊過的故事，有新進展"}</strong>
     <p>{en?"These are published follow-ups to stories you actually discussed.":"這些是你曾經聊過的公開故事，後來發布的新進展。"}</p></div>
    <div className="crew-shorts-followup-links">{followUps.map(({post})=>
     <Link key={post.id} to={shortsChatUrl(post,"next")} onClick={()=>{
      trackUsageEvent("shorts_story_followup","shorts_feed");chatClick("shorts_feed");
     }}>{en?post.friendName+"'s update":post.friendName+" 的後續"} <span aria-hidden="true">→</span></Link>)}</div>
   </aside>:null}
   <div className="crew-shorts-grid">{posts.slice(0,count).map((post,index)=>{
    const episodes=shortsStoryEpisodes(post,posts);
    const chapter=episodes.findIndex(item=>item.id===post.id);
    const previous=chapter>0?episodes[chapter-1]:null;
    return <article className="crew-short-card" key={post.id}>
     <Link className="crew-short-image" to={shortsChatUrl(post,"details")}
      aria-label={en?"Ask "+post.friendName+" what happened":"問 "+post.friendName+" 怎麼回事"}
      onClick={()=>{trackUsageEvent("shorts_hook_click","shorts_feed");chatClick("shorts_feed")}}>
      <img src={post.image} alt={post.imageAlt} loading={index>1?"lazy":"eager"} decoding="async"
       onError={event=>{
        const node=event.currentTarget;
        if(node.dataset.fallback)return;
        node.dataset.fallback="1";
        node.src="/assets/friends/crew_friend_"+post.friendId+".webp";
       }}/>
      <span className="crew-short-image-label">{post.friendName}</span>
     </Link>
     <div className="crew-short-body">
      <div className="crew-short-meta"><strong>{post.friendName}</strong><small>{post.publishedAt.slice(0,10)}</small></div>
      {episodes.length>1?<div className="crew-short-episode">{en?"Ongoing story":"連載故事"} · {en?"Part ":"第 "}{chapter+1}{en?" of ":"／"}{episodes.length}{en?"":" 集"}</div>:null}
      <p lang={post.language}>{post.caption}</p>
      {previous?<details className="crew-short-recap"><summary>{en?"Previously in this story":"前情提要"}</summary>
       <p lang={previous.language}>{previous.caption}</p>
      </details>:null}
      <div className="crew-short-chat-prompts" aria-label={en?"Start a conversation":"挑一句聊聊"}>
       <small>{en?"Curious? Ask "+post.friendName+":" : "想問 "+post.friendName+" 什麼？"}</small>
       <div>{SHORTS_HOOKS.map(hook=><Link key={hook} to={shortsChatUrl(post,hook)}
        onClick={()=>{trackUsageEvent("shorts_hook_click","shorts_feed");chatClick("shorts_feed")}}>
        {shortsHookLabel(hook,en)} <span aria-hidden="true">↗</span>
       </Link>)}</div>
      </div>
      {post.translationZh&&translated===post.id?<p className="crew-short-translation" lang="zh-Hant">{post.translationZh}</p>:null}
      <div className="crew-short-actions">
       <button type="button" aria-pressed={likes.includes(post.id)} onClick={()=>toggleLike(post.id)}>
        {likes.includes(post.id)?"♥":"♡"} {en?"Like":"喜歡"}
       </button>
       {post.translationZh?<button type="button" onClick={()=>setTranslated(x=>x===post.id?null:post.id)} aria-expanded={translated===post.id}>{en?"Translation":"翻譯"}</button>:null}
      </div>
     </div>
    </article>})}</div>
   {(count<posts.length||Boolean(feed?.nextPage))?<div ref={loadMoreRef} className="crew-shorts-more-wrap">
    {typeof IntersectionObserver==="undefined"
     ?<button type="button" className="crew-shorts-more" disabled={loadingMore}
        onClick={()=>count<posts.length?setCount(x=>Math.min(x+PAGE_SIZE,posts.length)):loadNextPage()}>
       {loadingMore?(en?"Loading…":"載入中…"):(en?"More stories":"載入更多動態")}
      </button>
     :<p className="crew-shorts-progress" role="status">
       {loadingMore?(en?"Loading more stories…":"正在載入更多動態…")
       :en?`Scroll for more · ${Math.min(count,posts.length)} / ${feed?.total??posts.length}`
       :`往下滑看更多 · ${Math.min(count,posts.length)} / ${feed?.total??posts.length}`}
      </p>}
    {moreError?<button type="button" className="crew-shorts-more" onClick={()=>loadNextPage()}>
      {en?"Retry loading stories":"重新載入動態"}
     </button>:null}
   </div>:null}
  </section>:null}
 </div>;
}
