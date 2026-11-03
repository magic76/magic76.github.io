import {useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {trackUsageEvent} from "../analytics/usage";
import {useTranslation} from "react-i18next";
import i18n from "../i18n";
import {Icon} from "../components/Icon";
import {GuideHub} from "../guides/GuideHub";
import {PlayStoreLink} from "../components/PlayStoreLink";
import {isCrewAndroidShell} from "../lib/platform";
import {probeNativeDeviceCapabilities} from "../lib/deviceCapabilities";
import {HomePortal} from "./HomePortal";
import {HomeShortsPreview} from "../teacher/HomeShortsPreview";
import {fetchShortsFeed,shuffleShortsPosts,type ShortFeed} from "../teacher/shortsFeed";
import {geminiKey,geminiVerified,history,loadScript} from "../lib/runtime";
import {useClientReady} from "../lib/useClientReady";
import {useGuestTrialQuota} from "../lib/useGuestTrialQuota";
import "./home.css";
import "./homePortal.css";
import "./homeWorld.css";

type Kind="teacher"|"story"|"fortune"|"play"|"friend";
type Recent={key:string;kind:Kind;title:string;description:string;to:string;timestamp:number;cover?:string};
type Book={id:string;title?:string;summary?:string;updatedAt?:string;createdAt?:string;readingMode?:string;coverIndex?:number;currentPage?:number;images?:Array<{preview?:string}>};

const LAST_ACTIVITY_KEY="crew_home_last_activity_v1";
// Stable Taiwan-local daily pick. The first render stays deterministic for SSG hydration.
const DAILY_GAMES=["1a2b","connect4","reversi"] as const;
const GAME_IDS=new Set(["friend-gomoku","connect4","twenty-questions","reversi","mystery","1a2b","taboo"]);

const time=(value:unknown)=>{const n=Date.parse(typeof value==="string"?value:"");return Number.isFinite(n)?n:0};
const description=(value:unknown,fallback:string)=>typeof value==="string"&&value.trim()?value.trim():fallback;

function activities(book:Book|null):Recent[]{
 const items:Recent[]=[];
 for(const kind of ["teacher","story","fortune"] as const){
  const records=history(kind);
  if(!Array.isArray(records))continue;
  for(const item of records.slice(0,10)){
   if(!item||typeof item!=="object")continue;
   const id=String(item.id||"");
   let to="";
   if(kind==="teacher"&&id)to="/teacher/live?history="+encodeURIComponent(id);
   if(kind==="story"){
    if(item.surface==="reader"&&item.bookId)to="/story/read/"+encodeURIComponent(String(item.bookId))+"?page="+encodeURIComponent(String(Number(item.currentPage)||0));
    else if(id)to="/story/live?history="+encodeURIComponent(id);
   }
   if(kind==="fortune"&&item.historyId)to="/fortune/reading?history="+encodeURIComponent(String(item.historyId));
   if(!to)continue;
   items.push({
    key:kind+":"+id,kind,to,timestamp:time(item.ts||item.updatedAt||item.createdAt),
    title:description(item.title,kind==="teacher"?i18n.t("home:recent.teacher"):kind==="story"?i18n.t("home:recent.story"):i18n.t("home:recent.fortune")),
    description:description(item.preview||item.summary,i18n.t("home:recent.fallback"))
   });
  }
 }
 // Fortune readings are kept independently of the Live conversation history.
 try{
  const records:unknown=JSON.parse(localStorage.getItem("crew_fortune_readings_v2")||"[]");
  if(Array.isArray(records))for(const item of records.slice(0,10)){
   if(!item||!item.id)continue;
   items.push({key:"fortune-reading:"+item.id,kind:"fortune",to:"/fortune/reading?history="+encodeURIComponent(String(item.id)),
    timestamp:time(item.createdAt||item.updatedAt),
    title:({bazi:i18n.t("home:recent.bazi"),tarot:i18n.t("home:recent.tarot"),vedic:i18n.t("home:recent.vedic")} as Record<string,string>)[String(item.mode)]||i18n.t("home:recent.fortune"),
    description:description(item.summary,i18n.t("home:recent.fortuneResume"))});
  }
 }catch{/* An invalid local snapshot should never block the homepage. */}
 if(book?.id){
  const cover=book.images?.[Number(book.coverIndex)||0]?.preview;
  items.push({key:"story-book:"+book.id,kind:"story",
   to:book.readingMode==="physical"?"/story/physical/"+encodeURIComponent(book.id):"/story/read/"+encodeURIComponent(book.id)+"?page="+encodeURIComponent(String(Number(book.currentPage)||0)),
   timestamp:time(book.updatedAt||book.createdAt),title:description(book.title,i18n.t("home:recent.book")),
   description:book.readingMode==="physical"?i18n.t("home:recent.physical"):i18n.t("home:recent.reader",{page:(Number(book.currentPage)||0)+1}),
   cover:typeof cover==="string"?cover:undefined});
 }
 // Route shortcuts only: games start a new round, not a restored unfinished game.
 try{
  const saved=JSON.parse(localStorage.getItem(LAST_ACTIVITY_KEY)||"null") as {path?:string;friendId?:string;at?:number}|null;
  if(saved&&typeof saved.at==="number"&&Number.isFinite(saved.at)&&saved.at>0){
   const gameId=typeof saved.path==="string"?saved.path.match(/^\/games\/([a-z0-9-]+)$/)?.[1]:undefined;
   if(gameId&&GAME_IDS.has(gameId)){
    const name=i18n.t("home:playHub.games."+gameId+".title");
    items.push({key:"game:"+gameId,kind:"play",to:"/games/"+gameId,timestamp:saved.at,
     title:name,description:i18n.t("home:recent.play")});
   }else if(saved.path==="/friend/live"&&typeof saved.friendId==="string"&&/^[a-z0-9-]{1,32}$/.test(saved.friendId)){
    items.push({key:"friend:"+saved.friendId,kind:"friend",
     to:"/friend/live?id="+encodeURIComponent(saved.friendId),timestamp:saved.at,
     title:i18n.t("home:recent.friend"),description:i18n.t("home:recent.friendDesc")});
   }
  }
 }catch{/* Local storage may be disabled or stale. */}
 items.sort((a,b)=>b.timestamp-a.timestamp);
 return items.slice(0,1);
}

export function HomePage(){
 const {t,i18n:locale}=useTranslation("home");
 const ready=useClientReady();
 const [orbAvailable,setOrbAvailable]=useState(false);
 const [shortsFeed,setShortsFeed]=useState<ShortFeed|null>(null);
 const [shortsStatus,setShortsStatus]=useState<"loading"|"ready"|"error">("loading");
 useEffect(()=>{
  const controller=new AbortController();
  fetchShortsFeed(controller.signal).then(value=>{
   if(!controller.signal.aborted){setShortsFeed({...value,posts:shuffleShortsPosts(value.posts)});setShortsStatus("ready")}
  }).catch(()=>{if(!controller.signal.aborted)setShortsStatus("error")});
  return()=>controller.abort();
 },[]);
 const configured=ready&&Boolean(geminiKey()),verified=ready&&geminiVerified();
 const trial=useGuestTrialQuota(!ready||configured);
 const [featuredGame,setFeaturedGame]=useState<(typeof DAILY_GAMES)[number]>("1a2b");
 useEffect(()=>{
  const taipeiDay=Math.floor((Date.now()+8*60*60*1000)/86400000);
  setFeaturedGame(DAILY_GAMES[taipeiDay%DAILY_GAMES.length]);
 },[]);
 useEffect(()=>{
  if(!isCrewAndroidShell())return;
  let mounted=true;
  void probeNativeDeviceCapabilities().then(c=>{if(mounted)setOrbAvailable(Boolean(c?.cyberOrb))}).catch(()=>{});
  return()=>{mounted=false};
 },[]);
 const [book,setBook]=useState<Book|null>(null);
 const recent=useMemo(()=>ready?(activities(book)[0]||null):null,[ready,book,locale.resolvedLanguage]);

 useEffect(()=>{
  if(!localStorage.getItem("crew_story_last_book_id"))return;
  let live=true;
  // Only the small IndexedDB and shelf modules are loaded; no Live AI runtime.
  void (async()=>{
   if(!window.CrewDB)await loadScript("/features/shared/db.js");
   if(!window.CrewStoryStore)await loadScript("/features/story/shelf/store.js");
   const last=await window.CrewStoryStore?.last();
   if(live&&last)setBook(last);
  })().catch(()=>{/* Book progress is optional when browser storage is unavailable. */});
  return()=>{live=false};
 },[]);
 return <div className="crew-home">
  {orbAvailable&&<div className="crew-home-content"><Link to="/orb" className="crew-home-orb-quick">
   <span className="crew-home-orb-icon" aria-hidden="true">◉</span>
   <span className="crew-home-orb-quick-copy"><strong>Cyber Orb</strong><small>{locale.language.startsWith("zh")?"選角色，開始背景語音聊天":"Choose a character for hands-free chat"}</small></span>
   <span aria-hidden="true" className="crew-home-orb-chevron">→</span>
  </Link></div>}
  <div className="crew-home-world">
   <HomePortal shortsFeed={shortsFeed}/>
   <div className="crew-home-world-inner">
    {ready&&!configured&&trial.resolved&&(!trial.enabled||trial.remaining===0)?<section className="crew-home-start" aria-label={t("start")}>
     <Link to="/account#settings-gemini" className="crew-home-start-option crew-home-start-byok" onClick={()=>trackUsageEvent("home_entry_click","settings")}>
      <span className="crew-home-start-symbol" aria-hidden="true"><Icon name="sparkles"/></span>
      <span className="crew-home-start-copy"><strong>{t("setup.title")}</strong><small>{t("setup.shortDesc")}</small></span>
      <b className="crew-home-start-action">{t("setup.cta")} →</b>
     </Link>
    </section>:ready&&configured&&!verified?<Link to="/account#settings-gemini" className="crew-home-start-verify">
     <Icon name="settings"/><span><strong>{t("setup.verify")}</strong><small>{t("setup.verifyDesc")}</small></span><b aria-hidden="true">→</b>
    </Link>:null}
    {recent?<section className="crew-home-continue" aria-label={t("continue")}>
     <div className="crew-home-section-heading"><h2>{t("continue")}</h2><span>{t("localOnly")}</span></div>
     <Link to={recent.to} className={"crew-home-recent crew-home-recent-"+recent.kind}>
      <span className="crew-home-recent-art" aria-hidden="true">{recent.cover?<img src={recent.cover} alt=""/>:<Icon name={recent.kind==="friend"?"chat":recent.kind}/>}</span>
      <span className="crew-home-recent-copy"><span className="crew-home-overline">{recent.kind==="teacher"?"CREW TEACHER":recent.kind==="story"?"CREW STORY":recent.kind==="fortune"?"CREW FORTUNE":recent.kind==="play"?"CREW PLAY":"CREW FRIEND"}</span><strong>{recent.title}</strong><small>{recent.description}</small></span>
      <span className="crew-home-recent-arrow" aria-hidden="true">→</span>
     </Link>
    </section>:null}
   <div className="crew-home-world-bridge" aria-hidden="true"><i/>{t("world.bridge")}<i/></div>
   <HomeShortsPreview sharedFeed={shortsFeed} sharedStatus={shortsStatus}/>
   <div className="crew-home-feature-row">
   <section className="crew-home-game-pick" aria-labelledby="crew-home-game-pick-title">
    <span className="crew-home-game-pick-icon" aria-hidden="true"><Icon name="play"/></span>
    <div className="crew-home-game-pick-copy">
     <small>{t("gamePick.label")}</small>
     <strong id="crew-home-game-pick-title">{t("playHub.games."+featuredGame+".title")}</strong>
     <p>{featuredGame==="1a2b"?t("gamePick.desc"):t("actions.playDesc")}</p>
    </div>
    <Link className="crew-home-game-pick-action" to={"/games/"+featuredGame} onClick={()=>trackUsageEvent("home_entry_click","play")}>{t("gamePick.cta")} <span aria-hidden="true">→</span></Link>
   </section>
   <section className="crew-home-world-explore" aria-labelledby="crew-home-world-explore-title">
    <div className="crew-home-world-explore-heading"><h2 id="crew-home-world-explore-title">{t("world.explore")}</h2><span aria-hidden="true">{t("world.possibilities")}</span></div>
    <div className="crew-home-world-explore-grid">
     <Link className="crew-home-world-explore-card" to="/teacher/course/travel" onClick={()=>trackUsageEvent("home_entry_click","learn")}>
      <span className="crew-home-world-explore-icon" aria-hidden="true"><Icon name="teacher"/></span>
      <span><small>CREW TEACHER</small><strong>{t("product.teacher")}</strong><span>{t("world.modes.learn.description")}</span></span>
      <span className="crew-home-world-explore-arrow" aria-hidden="true">↗</span>
     </Link>
     <Link className="crew-home-world-explore-card" to="/timeline" onClick={()=>trackUsageEvent("home_entry_click","timeline")}>
      <span className="crew-home-world-explore-icon crew-home-world-timeline-icon" aria-hidden="true">⌁</span>
      <span><small>CREW TIMELINE</small><strong>{t("world.timelineTitle")}</strong><span>{t("world.timelineDescription")}</span></span>
      <span className="crew-home-world-explore-arrow" aria-hidden="true">↗</span>
     </Link>
    </div>
   </section>
   </div>
   </div>
  </div>
  <div className="crew-home-content">
  <section className="crew-home-search-summary" aria-labelledby="crew-home-search-summary-title">
   <h2 id="crew-home-search-summary-title">{locale.language.startsWith("zh")?"Crew：AI 朋友聊天、語言學習、互動遊戲與故事創作":"Crew: AI Friends, Language Practice, Games and Stories"}</h2>
   <p>{locale.language.startsWith("zh")
    ?"在 Crew，你可以和不同個性的 AI 朋友自然聊天、透過 Crew Teacher 練習英文口說、在 Crew Play 玩棋盤和猜題遊戲，也能和 AI 一起創作、閱讀故事。"
    :"Talk with AI characters, practice spoken English with Crew Teacher, play board and guessing games in Crew Play, and create or read stories together with AI."}</p>
   <nav aria-label={t("explore")}>
    <Link to="/teacher">{t("product.teacher")}</Link>
    <Link to="/games">{t("product.play")}</Link>
    <Link to="/story">{t("product.story")}</Link>
    <Link to="/fortune">{t("product.fortune")}</Link>
   </nav>
  </section>
  <GuideHub/>
  {ready&&!isCrewAndroidShell()&&<details className="crew-home-android">
   <summary>{t("android")} <span aria-hidden="true">＋</span></summary>
   <div className="play-store-grid"><PlayStoreLink product="teacher"/><PlayStoreLink product="story"/><PlayStoreLink product="fortune"/></div>
  </details>}
  </div>
 </div>;
}
