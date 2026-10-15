import {useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import i18n from "../i18n";
import {fetchDay,fetchIndex,rankItems} from "../briefing/data";
import type {BriefingDay,BriefingItem} from "../briefing/types";
import {Icon} from "../components/Icon";
import {GuideHub} from "../guides/GuideHub";
import {PlayStoreLink} from "../components/PlayStoreLink";
import {HomeAtmosphere,type HomeProduct} from "./HomeAtmosphere";
import {geminiKey,geminiVerified,history,loadScript} from "../lib/runtime";
import {useClientReady} from "../lib/useClientReady";
import "./home.css";

type Kind="teacher"|"story"|"fortune";
type Recent={key:string;kind:Kind;title:string;description:string;to:string;timestamp:number;cover?:string};
type Book={id:string;title?:string;summary?:string;updatedAt?:string;createdAt?:string;readingMode?:string;coverIndex?:number;currentPage?:number;images?:Array<{preview?:string}>};

const time=(value:unknown)=>{const n=Date.parse(typeof value==="string"?value:"");return Number.isFinite(n)?n:0};
const description=(value:unknown,fallback:string)=>typeof value==="string"&&value.trim()?value.trim():fallback;
const latestDate=(date:string)=>new Date(date+"T12:00:00").toLocaleDateString(i18n.language==="en"?"en-US":"zh-TW",{month:"long",day:"numeric"});

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
    description:description(item.summary,"繼續查看命盤結果")});
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
 return items.sort((a,b)=>b.timestamp-a.timestamp)[0]?[items.sort((a,b)=>b.timestamp-a.timestamp)[0]]:[];
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
  <Link className="crew-home-briefing-card" to="/research">
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
 const [book,setBook]=useState<Book|null>(null);
 const [activeProduct,setActiveProduct]=useState<HomeProduct|null>(null);
 const recent=useMemo(()=>ready?(activities(book)[0]||null):null,[ready,book,locale.resolvedLanguage]);
 const configured=ready&&Boolean(geminiKey()),verified=ready&&geminiVerified();
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
  <header className="crew-home-intro">
   <HomeAtmosphere activeProduct={activeProduct}/>
   <div className="crew-home-intro-copy">
    <span className="crew-home-eyebrow">{t("eyebrow")}</span>
    <h1>{t("headline")}</h1>
    <p>{t("intro")}</p>
   </div>
  </header>
  <div className="crew-home-layout">
   <div className="crew-home-primary">
    {ready&&!configured?
     <Link to="/settings" className="crew-home-setup crew-home-setup-free">
      <span className="crew-home-setup-symbol" aria-hidden="true"><Icon name="sparkles"/></span>
      <span className="crew-home-setup-copy"><strong>{t("setup.title")}</strong><small>{t("setup.desc")}</small><em>{t("setup.pricing")}</em></span>
      <span className="crew-home-setup-action">{t("setup.cta")} <b aria-hidden="true">→</b></span>
     </Link>:
     ready&&!verified?<Link to="/settings" className="crew-home-setup"><span aria-hidden="true"><Icon name="settings"/></span><span><strong>{t("setup.verify")}</strong><small>{t("setup.verifyDesc")}</small></span><b aria-hidden="true">→</b></Link>:null}
    {recent?<section className="crew-home-continue" aria-label="繼續上次">
     <div className="crew-home-section-heading"><h2>{t("continue")}</h2><span>{t("localOnly")}</span></div>
     <Link to={recent.to} className={"crew-home-recent crew-home-recent-"+recent.kind}>
      <span className="crew-home-recent-art" aria-hidden="true">{recent.cover?<img src={recent.cover} alt=""/>:<Icon name={recent.kind}/>}</span>
      <span className="crew-home-recent-copy"><span className="crew-home-overline">{recent.kind==="teacher"?"CREW TEACHER":recent.kind==="story"?"CREW STORY":"CREW FORTUNE"}</span><strong>{recent.title}</strong><small>{recent.description}</small></span>
      <span className="crew-home-recent-arrow" aria-hidden="true">→</span>
     </Link>
    </section>:null}
    <section className="crew-home-products" aria-label="探索 Crew 產品">
     <div className="crew-home-section-heading"><h2>{t("explore")}</h2><span>{t("start")}</span></div>
     <div className="crew-home-product-grid">
      <Link className="crew-home-product crew-home-teacher" to="/teacher" onPointerEnter={()=>setActiveProduct("teacher")} onPointerLeave={()=>setActiveProduct(null)} onFocus={()=>setActiveProduct("teacher")} onBlur={()=>setActiveProduct(null)}>
       <span className="crew-home-product-art crew-home-product-teacher" aria-hidden="true"><span className="crew-home-teacher-emblem"><Icon name="teacher"/></span></span>
       <strong>Teacher</strong><small>{t("product.teacher")}</small><span className="crew-home-product-arrow" aria-hidden="true">↗</span>
      </Link>
      <Link className="crew-home-product crew-home-story" to="/story" onPointerEnter={()=>setActiveProduct("story")} onPointerLeave={()=>setActiveProduct(null)} onFocus={()=>setActiveProduct("story")} onBlur={()=>setActiveProduct(null)}>
       <span className="crew-home-product-art crew-home-product-story" aria-hidden="true"><span className="crew-home-book"><Icon name="story"/><i>✦</i></span></span>
       <strong>Story</strong><small>{t("product.story")}</small><span className="crew-home-product-arrow" aria-hidden="true">↗</span>
      </Link>
      <Link className="crew-home-product crew-home-fortune" to="/fortune" onPointerEnter={()=>setActiveProduct("fortune")} onPointerLeave={()=>setActiveProduct(null)} onFocus={()=>setActiveProduct("fortune")} onBlur={()=>setActiveProduct(null)}>
       <span className="crew-home-product-art crew-home-product-fortune" aria-hidden="true"><span className="crew-home-orbit"><Icon name="fortune"/></span></span>
       <strong>Fortune</strong><small>{t("product.fortune")}</small><span className="crew-home-product-arrow" aria-hidden="true">↗</span>
      </Link>
     </div>
    </section>

   </div>
   <BriefingPreview/>
  </div>
  <GuideHub/>
  <details className="crew-home-android" open>
   <summary>{t("android")} <span aria-hidden="true">＋</span></summary>
   <div className="play-store-grid"><PlayStoreLink product="teacher"/><PlayStoreLink product="story"/><PlayStoreLink product="fortune"/></div>
  </details>
 </div>;
}
