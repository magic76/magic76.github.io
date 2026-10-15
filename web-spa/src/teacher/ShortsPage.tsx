import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import "./shorts.css";
import {fetchShortsFeed,type ShortFeed} from "./shortsFeed";

const LIKE_KEY="crew_shorts_demo_likes_v1";
function readLikes():string[]{
 try{return JSON.parse(localStorage.getItem(LIKE_KEY)||"[]") as string[]}catch{return []}
}
function speak(value:string,language:string){
 if(typeof window==="undefined"||!("speechSynthesis" in window))return;
 window.speechSynthesis.cancel();
 const utterance=new SpeechSynthesisUtterance(value);
 utterance.lang=language==="en"?"en-US":language;
 utterance.rate=.9;
 window.speechSynthesis.speak(utterance);
}
export function ShortsPage(){
 const {i18n}=useTranslation();
 const en=i18n.language.startsWith("en");
 const [feed,setFeed]=useState<ShortFeed|null>(null);
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState(false);
 const [retry,setRetry]=useState(0);
 const [count,setCount]=useState(6);
 const [translated,setTranslated]=useState<string|null>(null);
 const [likes,setLikes]=useState<string[]>([]);
 useEffect(()=>{setLikes(readLikes());},[]);
 useEffect(()=>{
  const abort=new AbortController();
  setBusy(true);setError(false);
  fetchShortsFeed(abort.signal)
   .then(data=>{if(!abort.signal.aborted){setFeed(data);setBusy(false)}})
   .catch(()=>{if(!abort.signal.aborted){setBusy(false);setError(true)}});
  return()=>abort.abort();
 },[retry]);
 useEffect(()=>()=>{if("speechSynthesis" in window)window.speechSynthesis.cancel()},[]);
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
   <p>{en?"Little photo stories, real phrases, and easy ways to start talking.":"每天一張照片、一句自然外語。不想聊天，也可以只看看、聽聽。"}</p>
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
   <div className="section-head"><h2>{en?"Latest moments":"朋友最新動態"}</h2><small>{posts.length} {en?"stories":"則故事"} · English demo</small></div>
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
       <button type="button" onClick={()=>speak(post.caption,post.language)}>🔊 {en?"Listen":"聽發音"}</button>
       {post.translationZh?<button type="button" onClick={()=>setTranslated(x=>x===post.id?null:post.id)} aria-expanded={translated===post.id}>{en?"Translation":"翻譯"}</button>:null}
       <Link to={"/friend/live?id="+encodeURIComponent(post.friendId)+"&post="+encodeURIComponent(post.id)}>
        {en?"Chat with "+post.friendName:"和 "+post.friendName+" 聊天"} →
       </Link>
      </div>
     </div>
    </article>)}</div>
   {count<posts.length?<button type="button" className="crew-shorts-more" onClick={()=>setCount(x=>x+6)}>
    {en?"More stories":"載入更多動態"}
   </button>:null}
  </section>:null}
 </div>;
}
