import {useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {trackUsageEvent} from "../analytics/usage";
import {useTranslation} from "react-i18next";
import i18n from "../i18n";
import {fetchDay,fetchIndex,rankItems} from "../briefing/data";
import type {BriefingDay,BriefingItem} from "../briefing/types";
import {Icon} from "../components/Icon";
import {GuideHub} from "../guides/GuideHub";
import {PlayStoreLink} from "../components/PlayStoreLink";
import {isCrewAndroidShell} from "../lib/platform";
import {probeNativeDeviceCapabilities} from "../lib/deviceCapabilities";
import {HomePortal} from "./HomePortal";
import {HomeShortsPreview} from "../teacher/HomeShortsPreview";
import {geminiKey,geminiVerified,history,loadScript} from "../lib/runtime";
import {useClientReady} from "../lib/useClientReady";
import {fetchGuestTrialConfig,guestTrialDiscoveryEnabled} from "../lib/guestTrial";
import "./home.css";
import "./homePortal.css";
import "./homeWorld.css";

type Kind="teacher"|"story"|"fortune"|"play"|"friend";
type Recent={key:string;kind:Kind;title:string;description:string;to:string;timestamp:number;cover?:string};
type Book={id:string;title?:string;summary?:string;updatedAt?:string;createdAt?:string;readingMode?:string;coverIndex?:number;currentPage?:number;images?:Array<{preview?:string}>};

const LAST_ACTIVITY_KEY="crew_home_last_activity_v1";
const GAME_IDS=new Set(["friend-gomoku","connect4","twenty-questions","reversi","mystery","1a2b","taboo"]);

const time=(value:unknown)=>{const n=Date.parse(typeof value==="string"?value:"");return Number.isFinite(n)?n:0};
const description=(value:unknown,fallback:string)=>typeof value==="string"&&value.trim()?value.trim():fallback;
const latestDate=(date:string)=>new Date(date+"T12:00:00").toLocaleDateString(i18n.language,{month:"long",day:"numeric"});

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

function BriefingPreview(){
 const {t}=useTranslation("home");
 const [edition,setEdition]=useState<{day:BriefingDay;item:BriefingItem|null}|null>(null);
 const [unavailable,setUnavailable]=useState(false);
 useEffect(()=>{
  let live=true;
  void fetchIndex().then(x=>x.days[0]?fetchDay(x.days[0]):null)
   .then(day=>{if(!live)return;if(!day){setUnavailable(true);return}
    setEdition({day,item:rankItems(day.items,"","all",()=>false,false)[0]||null})})
   .catch(()=>{if(live)setUnavailable(true)});
  return()=>{live=false};
 },[]);
 return <section className="crew-home-briefing" aria-label="每日研發情報">
  <div className="crew-home-section-heading"><span>CREW BRIEFING</span><span>{t("briefing.heading")}</span></div>
  <Link className="crew-home-briefing-card" to="/research" onClick={()=>trackUsageEvent("home_entry_click","briefing")}>
   <span className="crew-home-briefing-top"><span className="crew-home-briefing-emblem" aria-hidden="true"><Icon name="sparkles"/></span><span className="crew-home-briefing-date">{edition?latestDate(edition.day.date):unavailable?t("briefing.report"):t("briefing.loading")}</span></span>
   <strong>{edition?.item?.title||t("briefing.today")}</strong>
   <p>{edition?.item?.summary||t("briefing.summary")}</p>
   {edition?.item?.projects?.length?<span className="crew-home-briefing-tags">{edition.item.projects.slice(0,2).map(tag=><span key={tag}>{tag}</span>)}</span>:null}
   <span className="crew-home-card-cta">{t("briefing.read")} <span aria-hidden="true">↗</span></span>
  </Link>
  <Link className="crew-home-briefing-board" to="/research/board">{t("briefing.readingList")} <span aria-hidden="true">→</span></Link>
 </section>;
}

export function HomePage(){
 const {t,i18n:locale}=useTranslation("home");
 const ready=useClientReady();
 const [orbAvailable,setOrbAvailable]=useState(false);
 const [guestAvailable,setGuestAvailable]=useState(false);
 useEffect(()=>{
  if(!isCrewAndroidShell())return;
  let mounted=true;
  void probeNativeDeviceCapabilities().then(c=>{if(mounted)setOrbAvailable(Boolean(c?.cyberOrb))}).catch(()=>{});
  return()=>{mounted=false};
 },[]);
 const [book,setBook]=useState<Book|null>(null);
 const recent=useMemo(()=>ready?(activities(book)[0]||null):null,[ready,book,locale.resolvedLanguage]);
 const configured=ready&&Boolean(geminiKey()),verified=ready&&geminiVerified();
 useEffect(()=>{
  if(!ready||configured||!guestTrialDiscoveryEnabled()){setGuestAvailable(false);return}
  let live=true;
  void fetchGuestTrialConfig().then(x=>{if(live)setGuestAvailable(x.enabled)});
  return()=>{live=false};
 },[ready,configured]);

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
   <HomePortal/>
   <div className="crew-home-world-inner">
    {recent?<section className="crew-home-continue" aria-label={t("continue")}>
     <div className="crew-home-section-heading"><h2>{t("continue")}</h2><span>{t("localOnly")}</span></div>
     <Link to={recent.to} className={"crew-home-recent crew-home-recent-"+recent.kind}>
      <span className="crew-home-recent-art" aria-hidden="true">{recent.cover?<img src={recent.cover} alt=""/>:<Icon name={recent.kind==="friend"?"chat":recent.kind}/>}</span>
      <span className="crew-home-recent-copy"><span className="crew-home-overline">{recent.kind==="teacher"?"CREW TEACHER":recent.kind==="story"?"CREW STORY":recent.kind==="fortune"?"CREW FORTUNE":recent.kind==="play"?"CREW PLAY":"CREW FRIEND"}</span><strong>{recent.title}</strong><small>{recent.description}</small></span>
      <span className="crew-home-recent-arrow" aria-hidden="true">→</span>
     </Link>
    </section>:null}
   <div className="crew-home-world-bridge" aria-hidden="true"><i/>{t("world.bridge")}<i/></div>
   <HomeShortsPreview/>
   <section className="crew-home-game-pick" aria-labelledby="crew-home-game-pick-title">
    <span className="crew-home-game-pick-icon" aria-hidden="true"><Icon name="play"/></span>
    <div className="crew-home-game-pick-copy">
     <small>{t("gamePick.label")}</small>
     <strong id="crew-home-game-pick-title">{t("gamePick.title")}</strong>
     <p>{t("gamePick.desc")}</p>
    </div>
    <Link className="crew-home-game-pick-action" to="/games/1a2b" onClick={()=>trackUsageEvent("home_entry_click","play")}>{t("gamePick.cta")} <span aria-hidden="true">→</span></Link>
   </section>
   <section className="crew-home-world-explore" aria-labelledby="crew-home-world-explore-title">
    <div className="crew-home-world-explore-heading"><h2 id="crew-home-world-explore-title">{t("world.explore")}</h2><span aria-hidden="true">{t("world.possibilities")}</span></div>
    <div className="crew-home-world-explore-grid">
     <Link className="crew-home-world-explore-card" to="/fortune">
      <span className="crew-home-world-explore-icon" aria-hidden="true"><Icon name="fortune"/></span>
      <span><small>CREW FORTUNE</small><strong>{t("world.fortuneTitle")}</strong><span>{t("world.fortuneDescription")}</span></span>
      <span className="crew-home-world-explore-arrow" aria-hidden="true">↗</span>
     </Link>
     <Link className="crew-home-world-explore-card" to="/timeline">
      <span className="crew-home-world-explore-icon crew-home-world-timeline-icon" aria-hidden="true">⌁</span>
      <span><small>CREW TIMELINE</small><strong>{t("world.timelineTitle")}</strong><span>{t("world.timelineDescription")}</span></span>
      <span className="crew-home-world-explore-arrow" aria-hidden="true">↗</span>
     </Link>
    </div>
   </section>
   </div>
  </div>
  <div className="crew-home-content">
   <div className="crew-home-layout">
   <div className="crew-home-primary">
    {ready&&!configured&&guestAvailable?<Link to="/try" className="crew-home-setup crew-home-setup-free">
     <span className="crew-home-setup-symbol" aria-hidden="true"><Icon name="teacher"/></span>
     <span className="crew-home-setup-copy"><strong>{t("common:guestTrial.homeTitle")}</strong><small>{t("common:guestTrial.homeDesc")}</small></span>
     <span className="crew-home-setup-action">{t("common:guestTrial.homeStart")} <b aria-hidden="true">→</b></span>
    </Link>:null}
    {ready&&!configured?
     <Link to="/settings" className="crew-home-setup crew-home-setup-free">
      <span className="crew-home-setup-symbol" aria-hidden="true"><Icon name="sparkles"/></span>
      <span className="crew-home-setup-copy"><strong>{t("setup.title")}</strong><small>{t("setup.desc")}</small><em>{t("setup.pricing")}</em></span>
      <span className="crew-home-setup-action">{t("setup.cta")} <b aria-hidden="true">→</b></span>
     </Link>:
     ready&&!verified?<Link to="/settings" className="crew-home-setup"><span aria-hidden="true"><Icon name="settings"/></span><span><strong>{t("setup.verify")}</strong><small>{t("setup.verifyDesc")}</small></span><b aria-hidden="true">→</b></Link>:null}
    <details className="crew-home-products">
     <summary className="crew-home-section-heading"><h2>{t("explore")}</h2><span>{t("start")} ↓</span></summary>
     <div className="crew-home-product-grid">
      <Link className="crew-home-product crew-home-teacher" onClick={()=>trackUsageEvent("home_entry_click","learn")} to="/learn">
       <span className="crew-home-product-art crew-home-product-teacher" aria-hidden="true"><span className="crew-home-teacher-emblem"><Icon name="teacher"/></span></span>
       <strong>Teacher</strong><small>{t("product.teacher")}</small><span className="crew-home-product-arrow" aria-hidden="true">↗</span>
      </Link>
      <Link className="crew-home-product crew-home-story" onClick={()=>trackUsageEvent("home_entry_click","story")} to="/story">
       <span className="crew-home-product-art crew-home-product-story" aria-hidden="true"><span className="crew-home-book"><Icon name="story"/><i>✦</i></span></span>
       <strong>Story</strong><small>{t("product.story")}</small><span className="crew-home-product-arrow" aria-hidden="true">↗</span>
      </Link>
      <Link className="crew-home-product crew-home-fortune" onClick={()=>trackUsageEvent("home_entry_click","fortune")} to="/fortune">
       <span className="crew-home-product-art crew-home-product-fortune" aria-hidden="true"><span className="crew-home-orbit"><Icon name="fortune"/></span></span>
       <strong>Fortune</strong><small>{t("product.fortune")}</small><span className="crew-home-product-arrow" aria-hidden="true">↗</span>
      </Link>
      <Link className="crew-home-product crew-home-play" onClick={()=>trackUsageEvent("home_entry_click","play")} to="/games">
       <span className="crew-home-product-art crew-home-product-play" aria-hidden="true"><span className="crew-home-play-emblem"><Icon name="play"/></span></span>
       <strong>Play</strong><small>{t("product.play")}</small><span className="crew-home-product-arrow" aria-hidden="true">↗</span>
      </Link>
     </div>
    </details>

   </div>
   <BriefingPreview/>
  </div>
  <GuideHub/>
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
  {ready&&!isCrewAndroidShell()&&<details className="crew-home-android" open>
   <summary>{t("android")} <span aria-hidden="true">＋</span></summary>
   <div className="play-store-grid"><PlayStoreLink product="teacher"/><PlayStoreLink product="story"/><PlayStoreLink product="fortune"/></div>
  </details>}
  </div>
 </div>;
}

