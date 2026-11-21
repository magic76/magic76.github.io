import {Arrow} from "../components/Arrow";
import{useEffect,useState}from"react";import{useTranslation}from"react-i18next";import{Link}from"react-router-dom";import{ensureStoryServices}from"../lib/runtime";import{BUILT_IN_STORIES}from"./catalog";
import{ProductDiscoverability}from"../components/ProductDiscoverability";

export function StoryShelfPage(){
 const {t}=useTranslation("story");
 const[books,setBooks]=useState<any[]|null>(null),[last,setLast]=useState<any|null>(null),[error,setError]=useState("");
 async function load(){setError("");try{await ensureStoryServices();const list=await window.CrewStoryStore!.list();setBooks(list);setLast(await window.CrewStoryStore!.last())}catch(_){setError(t("shelf.loadError"))}}
 useEffect(()=>{void load()},[]);
 if(error)return <div className="spa-error" role="alert"><p>{error}</p><button className="btn secondary" onClick={()=>void load()}>{t("shelf.retry")}</button></div>;
 if(!books)return <>
 <section className="hero"><span className="kicker">Koolo Story</span><h1>{t("shelf.title")}</h1><p>{t("shelf.intro")}</p></section>
 <section className="section"><div className="story-action-grid">
  <Link className="story-action-tile create" to="/story/create"><strong>{t("shelf.create")}</strong><span>{t("shelf.createDesc")}</span></Link>
  <Link className="story-action-tile physical" to="/story/physical"><strong>{t("shelf.physicalAction")}</strong><span>{t("shelf.physicalDesc")}</span></Link>
 </div></section>
 <div className="spa-loading" role="status">{t("shelf.loading")}</div>
 <ProductDiscoverability product="story"/></>;
 const card=(book:any,builtin=false)=>{
  const cover=(book.images||[])[Number(book.coverIndex)||0],readTo="/story/read/"+encodeURIComponent(book.id);
  return <article className="story-book" key={book.id}>
   <Link className="story-book-open" to={readTo}>
    <div className="story-cover">{cover?<img src={cover.preview} alt={t("shelf.cover")}/>:<span>{book.coverEmoji||"S"}</span>}</div>
    <div className="story-book-body"><h3>{book.title||t("shelf.myStory")}</h3><p>{book.summary||""}</p><p>{builtin?t("shelf.builtin"):book.readingMode==="physical"?t("shelf.physical"):t("shelf.myStory")}{book.ageGroup?" · "+t("shelf.years",{count:book.ageGroup}):""}{book.estimatedMinutes?" · "+t("shelf.minutes",{count:book.estimatedMinutes}):""}</p>{book.tags?.length?<div className="story-tag-row">{book.tags.slice(0,3).map((x:string)=><span key={x}>#{x}</span>)}</div>:null}<strong className="story-book-open-label">{book.currentPage?t("shelf.resume"):t("shelf.open")} <Arrow/></strong></div>
   </Link>
   {!builtin&&<div className="story-book-secondary">{book.readingMode!=="physical"&&<Link className="story-book-edit" to={"/story/edit/"+encodeURIComponent(book.id)}>{t("shelf.edit")}</Link>}<details className="story-book-menu"><summary aria-label={t("shelf.more")}>•••</summary><button onClick={async()=>{if(confirm(t("shelf.confirmDelete"))){await window.CrewStoryStore!.remove(book.id);void load()}}}>{t("shelf.delete")}</button></details></div>}
  </article>
 };
 return <><section className="hero"><span className="kicker">Koolo Story</span><h1>{t("shelf.title")}</h1><p>{t("shelf.intro")}</p></section>
 {last&&<section className="section"><div className="story-continue-card"><div className="story-recent-cover">{(last.images||[])[Number(last.coverIndex)||0]?<img src={(last.images||[])[Number(last.coverIndex)||0].preview}/>:<span>{last.coverEmoji||"S"}</span>}</div><div><span className="kicker">{t("shelf.recent")}</span><h2>{last.title}</h2><p>{last.readingMode==="physical"?t("shelf.physical"):t("shelf.nearPage",{page:(Number(last.currentPage)||0)+1})}</p></div><Link className="btn" to={last.readingMode==="physical"?"/story/physical/"+encodeURIComponent(last.id):"/story/read/"+encodeURIComponent(last.id)}>{t("shelf.continue")} <Arrow/></Link></div></section>}
 <section className="section"><div className="story-action-grid"><Link className="story-action-tile create" to="/story/create"><strong>{t("shelf.create")}</strong><span>{t("shelf.createDesc")}</span></Link><Link className="story-action-tile physical" to="/story/physical"><strong>{t("shelf.physicalAction")}</strong><span>{t("shelf.physicalDesc")}</span></Link></div></section>
 <section className="section"><div className="section-head"><h2>{t("shelf.myStory")}</h2><small>{t("shelf.books",{count:books.length})}</small></div><div className="story-shelf-grid">{books.length?books.map(x=>card(x,false)):<div className="story-empty">{t("shelf.empty")}</div>}</div></section>
 <section className="section"><div className="section-head"><h2>{t("shelf.explore")}</h2><small>{t("shelf.builtInLabel")}</small></div><div className="story-explore-row">{BUILT_IN_STORIES.map(x=>card(x,true))}</div></section><ProductDiscoverability product="story"/></>
}
