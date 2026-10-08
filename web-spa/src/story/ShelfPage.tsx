import{useEffect,useState}from"react";import{Link}from"react-router-dom";import{ensureStoryServices}from"../lib/runtime";import{BUILT_IN_STORIES}from"./catalog";

export function StoryShelfPage(){
 const[books,setBooks]=useState<any[]|null>(null),[last,setLast]=useState<any|null>(null),[error,setError]=useState("");
 async function load(){setError("");try{await ensureStoryServices();const list=await window.CrewStoryStore!.list();setBooks(list);setLast(await window.CrewStoryStore!.last())}catch(_){setError("書架暫時無法讀取，請確認瀏覽器儲存空間後重試。")}}
 useEffect(()=>{void load()},[]);
 if(error)return <div className="spa-error" role="alert"><p>{error}</p><button className="btn secondary" onClick={()=>void load()}>重新讀取書架</button></div>;
 if(!books)return <div className="spa-loading" role="status">正在讀取書架…</div>;
 const card=(book:any,builtin=false)=>{
  const cover=(book.images||[])[Number(book.coverIndex)||0],readTo="/story/read/"+encodeURIComponent(book.id);
  return <article className="story-book" key={book.id}>
   <Link className="story-book-open" to={readTo}>
    <div className="story-cover">{cover?<img src={cover.preview} alt="故事封面"/>:<span>{book.coverEmoji||"S"}</span>}</div>
    <div className="story-book-body"><h3>{book.title||"我的故事"}</h3><p>{book.summary||""}</p><p>{builtin?"內建故事":book.readingMode==="physical"?"實體書陪讀":"我的故事"}{book.ageGroup?" · "+book.ageGroup+" 歲":""}{book.estimatedMinutes?" · 約 "+book.estimatedMinutes+" 分鐘":""}</p>{book.tags?.length?<div className="story-tag-row">{book.tags.slice(0,3).map((x:string)=><span key={x}>#{x}</span>)}</div>:null}<strong className="story-book-open-label">{book.currentPage?"繼續閱讀":"打開"} →</strong></div>
   </Link>
   {!builtin&&<div className="story-book-secondary">{book.readingMode!=="physical"&&<Link className="story-book-edit" to={"/story/edit/"+encodeURIComponent(book.id)}>編輯</Link>}<details className="story-book-menu"><summary aria-label="更多操作">•••</summary><button onClick={async()=>{if(confirm("刪除這本故事？")){await window.CrewStoryStore!.remove(book.id);void load()}}}>刪除故事</button></details></div>}
  </article>
 };
 return <><section className="hero"><span className="kicker">Crew Story</span><h1>今天想讀什麼故事？</h1><p>和阿奇一起創作、閱讀，或拿起手邊的故事書。</p></section>
 {last&&<section className="section"><div className="story-continue-card"><div className="story-recent-cover">{(last.images||[])[Number(last.coverIndex)||0]?<img src={(last.images||[])[Number(last.coverIndex)||0].preview}/>:<span>{last.coverEmoji||"S"}</span>}</div><div><span className="kicker">最近讀到這本</span><h2>{last.title}</h2><p>{last.readingMode==="physical"?"實體書陪讀":"第 "+((Number(last.currentPage)||0)+1)+" 頁附近"}</p></div><Link className="btn" to={last.readingMode==="physical"?"/story/physical/"+encodeURIComponent(last.id):"/story/read/"+encodeURIComponent(last.id)}>繼續 →</Link></div></section>}
 <section className="section"><div className="story-action-grid"><Link className="story-action-tile create" to="/story/create"><strong>＋ 創作故事</strong><span>文字靈感或照片，變成自己的故事</span></Link><Link className="story-action-tile physical" to="/story/physical"><strong>▤ 實體書陪讀</strong><span>拍下封面與書頁，阿奇一頁一頁陪你讀</span></Link></div></section>
 <section className="section"><div className="section-head"><h2>我的故事</h2><small>{books.length} 本</small></div><div className="story-shelf-grid">{books.length?books.map(x=>card(x,false)):<div className="story-empty">你的書架還是空的。先創作一本，或從手邊的實體書開始。</div>}</div></section>
 <section className="section"><div className="section-head"><h2>探索故事</h2><small>內建</small></div><div className="story-explore-row">{BUILT_IN_STORIES.map(x=>card(x,true))}</div></section></>
}
