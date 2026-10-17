import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import "./shorts.css";
import {fetchShortsFeed,shuffleShortsPosts,type ShortFeed} from "./shortsFeed";
import {trackUsageEvent} from "../analytics/usage";

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
 const [translated,setTranslated]=useState<string|null>(null);
 const [likes,setLikes]=useState<string[]>([]);
 useEffect(()=>{setLikes(readLikes());},[]);
 useEffect(()=>{
  const abort=new AbortController();
  setBusy(true);setError(false);
  fetchShortsFeed(abort.signal)
   .then(data=>{if(!abort.signal.aborted){setFeed({...data,posts:shuffleShortsPosts(data.posts)});setCount(PAGE_SIZE);setBusy(false);if(data.posts.length)trackUsageEvent("shorts_view","shorts_feed")}})
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
 function toggleLike(id:string){
  setLikes(previous=>{
   const next=previous.includes(id)?previous.filter(value=>value!==id):[...previous,id];
   try{localStorage.setItem(LIKE_KEY,JSON.stringify(next))}catch{/* private storage */}return next;
  });
 }
 const posts=feed?.posts||[];
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
   <div className="section-head"><h2>{en?"Latest moments":"朋友最新動態"}</h2><small>{posts.length} {en?"stories":"則故事"} · {feed?.source==="demo"?"English demo":posts[0]?.language?.toUpperCase()}</small></div>
   <div className="crew-shorts-grid">{posts.slice(0,count).map((post,index)=>
    <article className="crew-short-card" key={post.id}>
     <div className="crew-short-image">
      <img src={post.image} alt={post.imageAlt} loading={index>1?"lazy":"eager"} decoding="async"
       onError={event=>{
        const node=event.currentTarget;
        if(node.dataset.fallback)return;
        node.dataset.fallback="1";
        node.src="/assets/friends/crew_friend_"+post.friendId+".webp";
       }}/>
      <span className="crew-short-image-label">{post.friendName}</span>
     </div>
     <div className="crew-short-body">
      <div className="crew-short-meta"><strong>{post.friendName}</strong><small>{post.publishedAt.slice(0,10)}</small></div>
      <p lang={post.language}>{post.caption}</p>
      {post.translationZh&&translated===post.id?<p className="crew-short-translation" lang="zh-Hant">{post.translationZh}</p>:null}
      <div className="crew-short-actions">
       <button type="button" aria-pressed={likes.includes(post.id)} onClick={()=>toggleLike(post.id)}>
        {likes.includes(post.id)?"♥":"♡"} {en?"Like":"喜歡"}
       </button>
       {post.translationZh?<button type="button" onClick={()=>setTranslated(x=>x===post.id?null:post.id)} aria-expanded={translated===post.id}>{en?"Translation":"翻譯"}</button>:null}
       <Link onClick={()=>trackUsageEvent("shorts_chat_click","shorts_feed")} to={"/friend/live?id="+encodeURIComponent(post.friendId)+"&post="+encodeURIComponent(post.id)}>
        {en?"Chat with "+post.friendName:"和 "+post.friendName+" 聊天"} →
       </Link>
      </div>
     </div>
    </article>)}</div>
   {count<posts.length?<div ref={loadMoreRef} className="crew-shorts-more-wrap">
    {typeof IntersectionObserver==="undefined"
     ?<button type="button" className="crew-shorts-more" onClick={()=>setCount(x=>Math.min(x+PAGE_SIZE,posts.length))}>
       {en?"More stories":"載入更多動態"}
      </button>
     :<p className="crew-shorts-progress" role="status">
       {en?`Scroll for more · ${Math.min(count,posts.length)} / ${posts.length}`:`往下滑看更多 · ${Math.min(count,posts.length)} / ${posts.length}`}
      </p>}
   </div>:null}
  </section>:null}
 </div>;
}
