import {useEffect,useRef,useState} from "react";
import {Link,useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {fetchShortsFeed,fetchShortsPage,type ShortPost} from "./shortsFeed";
import {shortsChatUrl} from "./shortsSocial";
import "./shortsProfile.css";

const PAGE_SIZE=24;
const VALID_FRIENDS=new Set("zoe noah iris max yuna felix luna theo isla hugo ada finn maya oscar bella ryan".split(" "));
export function ShortsProfilePage(){
 const {friendId=""}=useParams();
 const {t}=useTranslation("home");
 const [posts,setPosts]=useState<ShortPost[]>([]);
 const [nextPage,setNextPage]=useState<string|null>(null);
 const [visible,setVisible]=useState(PAGE_SIZE);
 const [busy,setBusy]=useState(true);
 const [loadingMore,setLoadingMore]=useState(false);
 const [error,setError]=useState(false);
 const [retry,setRetry]=useState(0);
 const loadingRef=useRef(false);
 const abortRef=useRef<AbortController|null>(null);
 const valid=VALID_FRIENDS.has(friendId);
 useEffect(()=>{
  if(!valid){setBusy(false);return}
  const abort=new AbortController();abortRef.current=abort;
  setBusy(true);setError(false);setPosts([]);setVisible(PAGE_SIZE);setNextPage(null);
  fetchShortsFeed(abort.signal).then(feed=>{
   if(abort.signal.aborted)return;
   setPosts(feed.posts.filter(post=>post.friendId===friendId));
   setNextPage(feed.nextPage||null);setBusy(false);
  }).catch(()=>{if(!abort.signal.aborted){setError(true);setBusy(false)}});
  return()=>abort.abort();
 },[friendId,retry,valid]);
 async function loadMore(){
  if(loadingRef.current)return;
  if(visible<posts.length){setVisible(n=>n+PAGE_SIZE);return}
  if(!nextPage)return;
  loadingRef.current=true;setLoadingMore(true);setError(false);
  const abort=abortRef.current;
  try{
   const page=await fetchShortsPage(nextPage,abort?.signal||new AbortController().signal);
   if(abort?.signal.aborted)return;
   setPosts(current=>{
    const ids=new Set(current.map(post=>post.id));
    return [...current,...page.posts.filter(post=>post.friendId===friendId&&!ids.has(post.id))];
   });
   setNextPage(page.nextPage||null);setVisible(n=>n+PAGE_SIZE);
  }catch{if(!abort?.signal.aborted)setError(true)}
  finally{loadingRef.current=false;if(!abort?.signal.aborted)setLoadingMore(false)}
 }
 const name=friendId.charAt(0).toUpperCase()+friendId.slice(1);
 return <main className="crew-shorts-profile">
  <Link className="crew-shorts-profile-back" to="/teacher/shorts">← {t("shorts.heading")}</Link>
  {!valid?<p role="alert">Character not found.</p>:<>
   <header className="crew-shorts-profile-header">
    <img src={"/assets/friends/crew_friend_"+friendId+".webp"} alt="" width="92" height="92"/>
    <div><h1>{name}</h1><p>{name} · Koolo Shorts</p><Link className="crew-shorts-profile-chat" to={"/friend/live?id="+encodeURIComponent(friendId)+"&chat=text"}>{t("shorts.chatThis",{name})} ↗</Link></div>
   </header>
   <h2>{name} Shorts</h2>
   {busy?<p role="status">{t("shorts.loading")}</p>:null}
   {!busy&&!posts.length&&!nextPage&&!error?<p>{t("shorts.moments")} · 0</p>:null}
   <div className="crew-shorts-profile-grid">{posts.slice(0,visible).map(post=>
    <Link key={post.id} className="crew-shorts-profile-tile" to={"/teacher/shorts?post="+encodeURIComponent(post.id)} aria-label={post.caption}>
     <img src={post.image} alt={post.imageAlt} loading="lazy" onError={event=>{const img=event.currentTarget;if(!img.dataset.fallback){img.dataset.fallback="1";img.src="/assets/friends/crew_friend_"+friendId+".webp"}}}/>
     <span>{post.caption}</span>
    </Link>)}</div>
   {error?<p role="alert">{t("shorts.feedError")}</p>:null}
   {error&&!posts.length?<button onClick={()=>setRetry(x=>x+1)}>{t("shorts.retry")}</button>:null}
   {(visible<posts.length||nextPage)&&<button className="crew-shorts-profile-more" disabled={loadingMore} onClick={loadMore}>{loadingMore?t("shorts.loadingMore"):t("shorts.more")}</button>}
   {posts.length>0&&<Link className="crew-shorts-profile-chat-bottom" to={shortsChatUrl(posts[0],undefined,0)}>{t("shorts.chatThis",{name})} ↗</Link>}
  </>}
 </main>;
}
