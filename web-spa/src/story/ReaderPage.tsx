import{useEffect,useMemo,useState}from"react";import{Link,useNavigate,useParams}from"react-router-dom";import{ensureStoryServices}from"../lib/runtime";import{builtInStory,StoryBook,StoryPage}from"./catalog";

export function StoryReaderPage(){
 const{id=""}=useParams(),[book,setBook]=useState<StoryBook|null|undefined>(undefined),[index,setIndex]=useState(0),[playing,setPlaying]=useState(false),nav=useNavigate();
 useEffect(()=>{void ensureStoryServices().then(async()=>{const key=decodeURIComponent(id),stored=await window.CrewStoryStore!.get(key),b=(stored||builtInStory(key)) as StoryBook|null;setBook(b);if(b)setIndex(Math.max(0,Math.min(Number(b.currentPage)||0,(b.pages||[]).length-1)))})},[id]);
 useEffect(()=>{if(book&&book.sourceType!=="built-in"){book.currentPage=index;void window.CrewStoryStore?.save(book as any)}},[book,index]);
 useEffect(()=>()=>window.speechSynthesis?.cancel(),[]);
 const page:StoryPage=book?.pages?.[index]||{text:""},image=book?(book.images||[])[Number(page.imageIndex)]:null;
 const spoken=useMemo(()=>[page.text,page.dialogue].filter(Boolean).join(" "),[page.text,page.dialogue]);
 if(book===undefined)return <div className="spa-loading">正在打開故事…</div>;
 if(!book)return <div className="story-empty">找不到這本故事。</div>;
 function talk(){localStorage.setItem("crew_story_book_live_context",JSON.stringify({id:book!.id,title:book!.title,currentPage:index,pages:book!.pages.slice(Math.max(0,index-2),Math.min(book!.pages.length,index+3)).map(p=>p.text||p.context?.currentEvent||"")}));nav("/story/live?from=book")}
 function playPause(){
  if(playing){window.speechSynthesis?.cancel();setPlaying(false);return}
  if(!spoken)return;
  const u=new SpeechSynthesisUtterance(spoken);u.lang=book!.language||"zh-TW";u.rate=.92;u.onend=()=>setPlaying(false);u.onerror=()=>setPlaying(false);setPlaying(true);window.speechSynthesis?.cancel();window.speechSynthesis?.speak(u);
 }
 function go(next:number){window.speechSynthesis?.cancel();setPlaying(false);setIndex(Math.max(0,Math.min(next,book!.pages.length-1)))}
 return <><section className="story-player-head"><div><span className="kicker">{book.readingMode==="physical"?"實體書陪讀":"Story player"}</span><h1>{book.title}</h1><p>{book.summary||""}</p></div><div className="actions">{book.sourceType!=="built-in"&&book.readingMode!=="physical"&&<Link className="btn secondary small" to={"/story/edit/"+encodeURIComponent(book.id)}>✎ 編輯</Link>}{book.readingMode==="physical"&&<Link className="btn secondary small" to={"/story/physical/"+encodeURIComponent(book.id)}>拍下一頁</Link>}<Link className="btn secondary small" to="/story/shelf">回書架</Link></div></section>
 <div className="story-reader story-player">
  <div className="story-reader-media">{image?<img src={image.preview} alt="故事頁面"/>:<div className="story-player-placeholder"><span>{book.coverEmoji||"S"}</span></div>}</div>
  <section className="story-reader-copy"><div className="story-player-meta"><span className="kicker">PAGE {index+1} / {Math.max(1,book.pages.length)}</span>{page.emotion&&<span className="pill">{page.emotion}</span>}</div><p className="page-text">{page.text||page.context?.currentEvent||"這一頁還沒有文字。"}</p>{page.characterName&&<div className="story-dialogue"><strong>{page.characterName}</strong>{page.dialogue&&<span>「{page.dialogue}」</span>}</div>}
   <input className="story-page-slider" type="range" min="0" max={Math.max(0,book.pages.length-1)} value={index} onChange={e=>go(Number(e.target.value))}/>
   <div className="story-player-controls"><button className="btn secondary small" disabled={index===0} onClick={()=>go(index-1)}>上一頁</button><button className="btn" onClick={playPause}>{playing?"暫停":"▶ 播放"}</button><button className="btn secondary small" disabled={index>=book.pages.length-1} onClick={()=>go(index+1)}>下一頁</button></div>
   <div className="actions"><button className="btn secondary" onClick={talk}>🎤 跟阿奇聊這一頁</button>{book.sourceType==="built-in"&&<Link className="btn secondary" to={"/story/edit/"+encodeURIComponent(book.id)}>建立我的版本</Link>}{book.sourceType!=="built-in"&&<button className="btn danger small" onClick={async()=>{if(confirm("刪除這本故事？")){await window.CrewStoryStore!.remove(book.id);nav("/story/shelf")}}}>刪除故事</button>}</div>
  </section>
 </div></>
}